import type { AnimeEntry, Item, Mode } from '../types';
import { animeKey, fetchAnimeInfo } from './anilist';
import { fetchSongs } from './anisongdb';
import type { SongQuery } from './anisongdb';

export interface LoadProgress {
  step: 'covers' | 'songs';
  done: number;
  total: number;
}

export interface LoadResult {
  items: Item[];
  /** Titres des animés sans couverture trouvée. */
  missingCovers: string[];
  /** Titres des animés sans opening / ending trouvé (modes musique). */
  withoutSongs: string[];
}

const SONG_PREFIX = { opening: 'OP', ending: 'ED' } as const;

/** Construit les éléments classables à partir des entrées du XML. */
export async function loadItems(
  mode: Mode,
  entries: AnimeEntry[],
  onProgress: (progress: LoadProgress) => void,
  signal?: AbortSignal,
): Promise<LoadResult> {
  const infos = await fetchAnimeInfo(entries, (done, total) => onProgress({ step: 'covers', done, total }), signal);
  const missingCovers = entries.filter((e) => !infos.get(animeKey(e))?.imageUrl).map((e) => e.title);

  if (mode === 'anime') {
    const items = entries.map<Item>((e) => ({
      id: `anime-${animeKey(e)}`,
      kind: 'anime',
      title: e.title,
      animeTitle: e.title,
      imageUrl: infos.get(animeKey(e))?.imageUrl ?? null,
    }));
    return { items, missingCovers, withoutSongs: [] };
  }

  const queries = entries.map<SongQuery>((e) => {
    const info = infos.get(animeKey(e));
    return { key: animeKey(e), malId: info?.malId ?? e.malId, title: e.title, year: info?.year ?? null, format: info?.format ?? null };
  });
  const songsByKey = await fetchSongs(queries, mode, (done, total) => onProgress({ step: 'songs', done, total }), signal);

  const items = new Map<string, Item>();
  const withoutSongs: string[] = [];
  for (const entry of entries) {
    const songs = songsByKey.get(animeKey(entry)) ?? [];
    if (!songs.length) withoutSongs.push(entry.title);

    for (const song of songs) {
      const id = `song-${song.annSongId}`;
      items.set(id, {
        id,
        kind: mode,
        title: song.name,
        subtitle: `${SONG_PREFIX[mode]}${song.number || ''} · ${song.artist}`,
        animeTitle: entry.title,
        imageUrl: infos.get(animeKey(entry))?.imageUrl ?? null,
        audioUrl: song.audioUrl,
      });
    }
  }
  return { items: [...items.values()], missingCovers, withoutSongs };
}
