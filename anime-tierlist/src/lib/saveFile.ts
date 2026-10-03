import type { Item, Mode, Tier, TierlistSave } from '../types';
import type { TierlistState } from '../hooks/useTierlist';

export interface TierlistMeta {
  userName: string;
  mode: Mode;
  createdAt: string;
}

export class SaveFormatError extends Error {}

const MODES: readonly Mode[] = ['anime', 'opening', 'ending'];

export function toSave(state: TierlistState, meta: TierlistMeta): TierlistSave {
  return {
    version: 1,
    ...meta,
    updatedAt: new Date().toISOString(),
    tiers: state.tiers,
    pool: state.pool,
    items: state.items,
  };
}

export function saveFileName({ userName, mode }: TierlistMeta, extension: string): string {
  const safeName = userName.replace(/[^\w-]+/g, '_');
  const date = new Date().toISOString().slice(0, 10);
  return `tierlist-${safeName}-${mode}-${date}.${extension}`;
}

/** Déclenche le téléchargement d'un fichier généré dans le navigateur. */
export function downloadFile(content: Blob | string, fileName: string): void {
  const url = typeof content === 'string' ? content : URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  if (typeof content !== 'string') setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSave(state: TierlistState, meta: TierlistMeta): void {
  const json = JSON.stringify(toSave(state, meta), null, 2);
  downloadFile(new Blob([json], { type: 'application/json' }), saveFileName(meta, 'json'));
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function isItem(v: unknown): v is Item {
  return (
    isObject(v) &&
    isString(v.id) &&
    MODES.includes(v.kind as Mode) &&
    isString(v.title) &&
    isString(v.animeTitle) &&
    (v.imageUrl === null || isString(v.imageUrl)) &&
    (v.subtitle === undefined || isString(v.subtitle)) &&
    (v.audioUrl === undefined || isString(v.audioUrl))
  );
}

function isTier(v: unknown): v is Tier {
  return isObject(v) && isString(v.id) && isString(v.label) && isString(v.color) && Array.isArray(v.itemIds) && v.itemIds.every(isString);
}

/**
 * Lit et valide une sauvegarde JSON. Les incohérences mineures sont réparées :
 * références inconnues ou en double retirées, éléments orphelins remis dans la réserve.
 */
export function parseSave(text: string): TierlistSave {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new SaveFormatError("Le fichier n'est pas un JSON valide.");
  }

  if (!isObject(data) || data.version !== 1) {
    throw new SaveFormatError("Ce fichier n'est pas une sauvegarde de tierlist (version inconnue).");
  }
  if (!MODES.includes(data.mode as Mode) || !isString(data.userName)) {
    throw new SaveFormatError('Sauvegarde invalide : mode ou utilisateur manquant.');
  }
  if (!Array.isArray(data.tiers) || !data.tiers.every(isTier) || !Array.isArray(data.pool) || !data.pool.every(isString)) {
    throw new SaveFormatError('Sauvegarde invalide : tiers ou réserve mal formés.');
  }
  if (!isObject(data.items) || !Object.values(data.items).every(isItem)) {
    throw new SaveFormatError('Sauvegarde invalide : éléments mal formés.');
  }

  const items = data.items as Record<string, Item>;
  const placed = new Set<string>();
  const keep = (id: string) => {
    if (!(id in items) || placed.has(id)) return false;
    placed.add(id);
    return true;
  };
  const tiers = (data.tiers as Tier[]).map((t) => ({ ...t, itemIds: t.itemIds.filter(keep), collapsed: t.collapsed === true }));
  const pool = (data.pool as string[]).filter(keep);
  const orphans = Object.keys(items).filter((id) => !placed.has(id));

  const now = new Date().toISOString();
  return {
    version: 1,
    userName: data.userName,
    mode: data.mode as Mode,
    createdAt: isString(data.createdAt) ? data.createdAt : now,
    updatedAt: isString(data.updatedAt) ? data.updatedAt : now,
    tiers,
    pool: [...pool, ...orphans],
    items,
  };
}
