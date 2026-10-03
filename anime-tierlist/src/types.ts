export type Mode = 'anime' | 'opening' | 'ending';

export const MODE_LABELS: Record<Mode, string> = { anime: 'Animés', opening: 'Openings', ending: 'Endings' };

/** Entrée issue du fichier XML MyAnimeList. */
export interface AnimeEntry {
  malId: number | null;
  /** Renseigné pour les entrées « MAL entry not found ». */
  anilistId: number | null;
  title: string;
  status: string;
  score: number;
}

/** Contenu utile d'un export XML MyAnimeList. */
export interface MalList {
  userName: string;
  entries: AnimeEntry[];
}

/** Élément classable dans la tierlist. */
export interface Item {
  /** "anime-mal-<malId>", "anime-al-<anilistId>" ou "song-<annSongId>" */
  id: string;
  kind: Mode;
  /** Titre de l'animé, ou titre de la chanson. */
  title: string;
  /** "OP1 · Artiste" pour les chansons. */
  subtitle?: string;
  animeTitle: string;
  imageUrl: string | null;
  /** Chansons uniquement. */
  audioUrl?: string;
}

export interface Tier {
  id: string;
  label: string;
  /** Couleur hexadécimale. */
  color: string;
  /** Ordre d'affichage. */
  itemIds: string[];
  /** Tier replié : ses cartes sont masquées, mais il accepte toujours les dépôts. */
  collapsed?: boolean;
}

/** Contenu du fichier de sauvegarde JSON. */
export interface TierlistSave {
  version: 1;
  userName: string;
  mode: Mode;
  /** Date ISO. */
  createdAt: string;
  updatedAt: string;
  tiers: Tier[];
  /** Éléments non classés. */
  pool: string[];
  /** Données complètes : rechargement sans appel API. */
  items: Record<string, Item>;
}

export const DEFAULT_TIERS: ReadonlyArray<Pick<Tier, 'label' | 'color'>> = [
  { label: 'S', color: '#ff7f7f' },
  { label: 'A', color: '#ffbf7f' },
  { label: 'B', color: '#ffdf7f' },
  { label: 'C', color: '#ffff7f' },
  { label: 'D', color: '#bfff7f' },
];

export type Screen = 'import' | 'setup' | 'tierlist';
