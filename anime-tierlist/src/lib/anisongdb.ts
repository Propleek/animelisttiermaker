import { cacheGet, cacheSet, DAY_MS } from './cache';
import { chunk, postJson, sleep } from './http';

const MAL_IDS_URL = 'https://anisongdb.com/api/mal_ids_request';
const SEARCH_URL = 'https://anisongdb.com/api/search_request';
const AUDIO_BASE_URL = 'https://naedist.animemusicquiz.com/';
const MAX_IDS_PER_REQUEST = 500;
// AnisongDB limite le débit (réponse 429 sans en-tête CORS, vue comme une erreur réseau).
const DELAY_BETWEEN_SEARCHES_MS = 500;
/** Version du cache : à incrémenter quand la logique de recherche change. */
const CACHE_PREFIX = 'anisongdb:v5:';
/** Un résultat vide est revérifié plus tôt : AnisongDB ajoute régulièrement des chansons. */
const EMPTY_TTL_MS = DAY_MS;

export type SongKind = 'opening' | 'ending' | 'insert';

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
 * Ne garde que les entrées dont un nom correspond exactement, puis vérifie l'année et le format
 * AniList ; abandonne s'il ne reste pas exactement un animé.
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

  // Année et format vérifiés même pour un candidat unique : une OVA ou une autre saison
  // porte souvent exactement le même nom que la série (ex. Violet Evergarden TV / OVA).
  let candidates = [...byAnime.values()];
  if (query.year !== null) {
    candidates = candidates.filter(([e]) => e.animeVintage?.endsWith(String(query.year)));
  }
  const type = query.format ? FORMAT_TO_TYPE[query.format] : undefined;
  if (type) {
    candidates = candidates.filter(([e]) => e.animeType?.toLowerCase() === type);
  }
  return candidates.length === 1 ? toSongs(candidates[0]) : [];
}

/** Chansons des types demandés pour une liste d'ID MAL, groupées par ID MAL. */
async function requestByMalIds(
  malIds: number[],
  songTypes: SongKind[],
  signal?: AbortSignal,
): Promise<Map<number, SongEntry[]>> {
  const entries = await postJson<SongEntry[]>(
    MAL_IDS_URL,
    { mal_ids: [...new Set(malIds)], filters: { song_types: songTypes, broadcasts: ['normal'] } },
    signal,
  );
  const byMal = new Map<number, SongEntry[]>();
  for (const entry of entries) {
    const malId = entry.linked_ids.myanimelist;
    if (malId !== null) byMal.set(malId, [...(byMal.get(malId) ?? []), entry]);
  }
  return byMal;
}

/**
 * Openings, endings ou insert songs des animés, par clé d'animé.
 * 1. une requête groupée par ID MAL ; 2. une requête pour savoir quels animés restés sans chanson
 * AnisongDB connaît ; 3. repli par nom pour les autres.
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

  // 1. Recherche groupée par ID MAL, pour le type de chanson demandé.
  const found = new Map<string, Song[]>();
  const withMal = toFetch.filter((q) => q.malId !== null);
  for (const batch of chunk(withMal, MAX_IDS_PER_REQUEST)) {
    const byMal = await requestByMalIds(batch.map((q) => q.malId!), [kind], signal);
    for (const query of batch) {
      const songs = toSongs(byMal.get(query.malId!) ?? []);
      if (songs.length) found.set(query.key, songs);
    }
  }
  for (const [key, songs] of found) store(key, songs);

  // 2. Parmi les animés restés sans chanson, ceux qu'AnisongDB connaît sous leur ID MAL (avec des
  //    chansons d'un autre type) n'en ont simplement pas de ce type : inutile de les chercher par nom.
  const known = new Set<number>();
  const missingMal = withMal.filter((q) => !found.has(q.key));
  for (const batch of chunk(missingMal, MAX_IDS_PER_REQUEST)) {
    const byMal = await requestByMalIds(batch.map((q) => q.malId!), ['opening', 'ending', 'insert'], signal);
    for (const malId of byMal.keys()) known.add(malId);
  }
  for (const query of missingMal.filter((q) => known.has(q.malId!))) store(query.key, []);
  onProgress(result.size, queries.length);

  // 3. Repli par nom, un animé à la fois : animés inconnus sous leur ID MAL ou sans ID MAL.
  for (const [i, query] of toFetch.filter((q) => !result.has(q.key)).entries()) {
    if (i > 0) await sleep(DELAY_BETWEEN_SEARCHES_MS, signal);
    store(query.key, await searchByName(query, kind, signal));
    onProgress(result.size, queries.length);
  }
  return result;
}
