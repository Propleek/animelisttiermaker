import { useReducer } from 'react';
import { DEFAULT_TIERS } from '../types';
import type { Item, Tier } from '../types';

/** Identifiant du conteneur « réserve » (éléments non classés). */
export const POOL_ID = 'pool';

/** Couleurs proposées pour les nouveaux tiers, après celles des tiers par défaut. */
export const EXTRA_COLORS = ['#7fffff', '#7fbfff', '#7f7fff', '#ff7fff', '#bf7fbf', '#c0c0c0'];

export interface TierlistState {
  tiers: Tier[];
  pool: string[];
  items: Record<string, Item>;
}

export type TierlistAction =
  /**
   * Retire l'élément de son conteneur et l'insère dans `to` à `index`.
   * Dans la réserve, l'élément reprend toujours sa place d'origine (`index` ignoré).
   */
  | { type: 'move'; itemId: string; to: string; index: number }
  | { type: 'addTier' }
  | { type: 'removeTier'; tierId: string }
  | { type: 'updateTier'; tierId: string; label?: string; color?: string }
  | { type: 'moveTier'; tierId: string; delta: -1 | 1 }
  | { type: 'reset' }
  | { type: 'load'; state: TierlistState };

function newTier(label: string, color: string): Tier {
  return { id: `tier-${crypto.randomUUID()}`, label, color, itemIds: [] };
}

export function createInitialState(items: Item[]): TierlistState {
  return {
    tiers: DEFAULT_TIERS.map(({ label, color }) => newTier(label, color)),
    pool: items.map((item) => item.id),
    items: Object.fromEntries(items.map((item) => [item.id, item])),
  };
}

function reducer(state: TierlistState, action: TierlistAction): TierlistState {
  switch (action.type) {
    case 'move': {
      const without = (ids: string[]) => ids.filter((id) => id !== action.itemId);
      const insert = (ids: string[]) => {
        const next = without(ids);
        next.splice(Math.max(0, Math.min(action.index, next.length)), 0, action.itemId);
        return next;
      };
      const returnToPool = () => {
        const inPool = new Set([...state.pool, action.itemId]);
        return Object.keys(state.items).filter((id) => inPool.has(id));
      };
      return {
        ...state,
        pool: action.to === POOL_ID ? returnToPool() : without(state.pool),
        tiers: state.tiers.map((t) => {
          if (t.id === action.to) return { ...t, itemIds: insert(t.itemIds) };
          return t.itemIds.includes(action.itemId) ? { ...t, itemIds: without(t.itemIds) } : t;
        }),
      };
    }

    case 'addTier': {
      const used = new Set(state.tiers.map((t) => t.color));
      const color = [...DEFAULT_TIERS.map((t) => t.color), ...EXTRA_COLORS].find((c) => !used.has(c)) ?? '#c0c0c0';
      return { ...state, tiers: [...state.tiers, newTier('?', color)] };
    }

    case 'removeTier': {
      const removed = state.tiers.find((t) => t.id === action.tierId);
      if (!removed) return state;
      return {
        ...state,
        tiers: state.tiers.filter((t) => t.id !== action.tierId),
        pool: [...removed.itemIds, ...state.pool],
      };
    }

    case 'updateTier': {
      const { tierId, label, color } = action;
      return {
        ...state,
        tiers: state.tiers.map((t) =>
          t.id === tierId ? { ...t, label: label ?? t.label, color: color ?? t.color } : t,
        ),
      };
    }

    case 'moveTier': {
      const from = state.tiers.findIndex((t) => t.id === action.tierId);
      const to = from + action.delta;
      if (from < 0 || to < 0 || to >= state.tiers.length) return state;
      const tiers = [...state.tiers];
      [tiers[from], tiers[to]] = [tiers[to], tiers[from]];
      return { ...state, tiers };
    }

    case 'reset':
      return {
        ...state,
        tiers: state.tiers.map((t) => ({ ...t, itemIds: [] })),
        pool: Object.keys(state.items),
      };

    case 'load':
      return action.state;
  }
}

export function useTierlist(initial: TierlistState) {
  return useReducer(reducer, initial);
}
