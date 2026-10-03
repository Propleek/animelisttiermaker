import { cacheGet, cacheSet, DAY_MS } from './cache';
import { chunk, postJson, sleep } from './http';

const MAL_IDS_URL = 'https://anisongdb.com/api/mal_ids_request';
const SEARCH_URL = 'https://anisongdb.com/api/search_request';
const AUDIO_BASE_URL = 'https://naedist.animemusicquiz.com/';
const MAX_IDS_PER_REQUEST = 500;
const DELAY_BETWEEN_SEARCHES_MS = 300;
/** Version du cache : à incrémenter quand la logique de recherche change. */
const CACHE_PREFIX = 'anisongdb:v3:';
/** Un résultat vide est revérifié plus tôt : AnisongDB ajoute régulièrement des chansons. */
const EMPTY_TTL_MS = DAY_MS;

export type SongKind = 'opening' | 'ending';

/** Champs utilisés d'une `SongEntry` AnisongDB. */
interface SongEntry {
  annId: number;
  annSongId: number;
  animeJPName: string;
  animeENName: string;
  animeAltName: string[] | null;
  animeVintage: string | null;
  animeType: string | null;
  linked_ids: { myanimelist: number | null };
  songType: string;
  songName: string;
  songArtist: string;
  audio: string | null;
  MQ: string | null;
  HQ: string | null;
}

export interface Song {
  annSongId: number;
  /** Numéro de l'opening / ending (0 si absent). */
  number: number;
  name: string;
  artist: string;
  audioUrl: string;
}

/** Animé dont on cherche les chansons. */
export interface SongQuery {
  /** Clé de l'animé (`animeKey`), utilisée pour le cache et le résultat. */
  key: string;
  malId: number | null;
  title: string;
  /** Année et format AniList, pour départager les homonymes de la recherche par nom. */
  year: number | null;
  format: string | null;
}

/** Formats AniList → types AnisongDB. */
const FORMAT_TO_TYPE: Record<string, string> = {
  TV: 'tv',
  TV_SHORT: 'tv',
  MOVIE: 'movie',
  SPECIAL: 'special',
  OVA: 'ova',
  ONA: 'ona',
};

function toSong(entry: SongEntry): Song | null {
  // Les animés récents n'ont parfois que la vidéo : <audio> sait en lire la piste son (streaming).
  const file = entry.audio ?? entry.MQ ?? entry.HQ;
  if (!file) return null;
  return {
    annSongId: entry.annSongId,
    number: Number(/\d+/.exec(entry.songType)?.[0] ?? 0),
    name: entry.songName,
    artist: entry.songArtist,
    audioUrl: AUDIO_BASE_URL + file,
  };
}

/** Chansons dédoublonnées et triées par numéro. */
function toSongs(entries: SongEntry[]): Song[] {
  const songs = new Map<number, Song>();
  for (const entry of entries) {
    const song = toSong(entry);
    if (song) songs.set(song.annSongId, song);
  }
  return [...songs.values()].sort((a, b) => a.number - b.number);
}

/** Nom comparable : minuscules, sans accents ni ponctuation, « wo » romanisé en « o ». */
function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\bwo\b/g, 'o')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

/**
 * Repli : recherche par nom, pour les animés mal reliés à leur ID MAL dans AnisongDB.
 * Ne garde que les entrées dont un nom correspond exactement ; s'il reste plusieurs animés
 * (saisons, spéciaux…), départage par année puis par format, et abandonne en cas de doute.
 */
async function searchByName(query: SongQuery, kind: SongKind, signal?: AbortSignal): Promise<Song[]> {
  const entries = await postJson<SongEntry[]>(
    SEARCH_URL,
    {
      anime_search_filter: { search: query.title, partial_match: false },
      filters: { song_types: [kind], broadcasts: ['normal'] },
    },
    signal,
  );

  const target = normalizeName(query.title);
  const byAnime = new Map<number, SongEntry[]>();
  for (const entry of entries) {
    const names = [entry.animeJPName, entry.animeENName, ...(entry.animeAltName ?? [])];
    if (!names.some((n) => normalizeName(n) === target)) continue;
    byAnime.set(entry.annId, [...(byAnime.get(entry.annId) ?? []), entry]);
  }

  let candidates = [...byAnime.values()];
  if (candidates.length > 1 && query.year !== null) {
    candidates = candidates.filter(([e]) => e.animeVintage?.endsWith(String(query.year)));
  }
  const type = query.format ? FORMAT_TO_TYPE[query.format] : undefined;
  if (candidates.length > 1 && type) {
    candidates = candidates.filter(([e]) => e.animeType?.toLowerCase() === type);
  }
  return candidates.length === 1 ? toSongs(candidates[0]) : [];
}

/**
 * Openings ou endings des animés, par clé d'animé.
 * 1. une requête groupée par ID MAL ; 2. repli par nom pour les animés restés sans chanson.
 * Cache : 7 jours si des chansons sont trouvées, 1 jour sinon.
 */
export async function fetchSongs(
  queries: SongQuery[],
  kind: SongKind,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Map<string, Song[]>> {
  const result = new Map<string, Song[]>();
  const toFetch: SongQuery[] = [];
  for (const query of queries) {
    const cached = cacheGet<Song[]>(`${CACHE_PREFIX}${kind}:${query.key}`);
    if (cached) result.set(query.key, cached);
    else toFetch.push(query);
  }
  onProgress(result.size, queries.length);

  const store = (key: string, songs: Song[]) => {
    result.set(key, songs);
    cacheSet(`${CACHE_PREFIX}${kind}:${key}`, songs, songs.length ? undefined : EMPTY_TTL_MS);
  };

  // 1. Recherche groupée par ID MAL.
  const found = new Map<string, Song[]>();
  const withMal = toFetch.filter((q) => q.malId !== null);
  for (const batch of chunk(withMal, MAX_IDS_PER_REQUEST)) {
    const entries = await postJson<SongEntry[]>(
      MAL_IDS_URL,
      { mal_ids: [...new Set(batch.map((q) => q.malId!))], filters: { song_types: [kind], broadcasts: ['normal'] } },
      signal,
    );
    const byMal = new Map<number, SongEntry[]>();
    for (const entry of entries) {
      const malId = entry.linked_ids.myanimelist;
      if (malId !== null) byMal.set(malId, [...(byMal.get(malId) ?? []), entry]);
    }
    for (const query of batch) {
      const songs = toSongs(byMal.get(query.malId!) ?? []);
      if (songs.length) found.set(query.key, songs);
    }
  }
  for (const [key, songs] of found) store(key, songs);
  onProgress(result.size, queries.length);

  // 2. Repli par nom, un animé à la fois.
  for (const [i, query] of toFetch.filter((q) => !found.has(q.key)).entries()) {
    if (i > 0) await sleep(DELAY_BETWEEN_SEARCHES_MS, signal);
    store(query.key, await searchByName(query, kind, signal));
    onProgress(result.size, queries.length);
  }
  return result;
}
