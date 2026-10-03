import { memo } from 'react';
import type { Dispatch } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import type { Item, Tier } from '../types';
import type { TierlistAction } from '../hooks/useTierlist';
import { EXPORT_EXCLUDE } from '../lib/exportPng';
import { SortableItem } from './SortableItem';
import styles from './TierRow.module.css';

interface Props {
  tier: Tier;
  items: Record<string, Item>;
  isFirst: boolean;
  isLast: boolean;
  /** Props stables pour que `memo` évite de redessiner les lignes inchangées. */
  dispatch: Dispatch<TierlistAction>;
  onOpenSettings: (tierId: string) => void;
}

export default memo(function TierRow({ tier, items, isFirst, isLast, dispatch, onOpenSettings }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id });

  return (
    <div className={styles.row}>
      <div className={styles.label} style={{ background: tier.color }}>
        <span>{tier.label}</span>
      </div>

      <SortableContext id={tier.id} items={tier.itemIds} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className={`${styles.items} ${isOver ? styles.over : ''}`}>
          {tier.itemIds.map((id) => (
            <SortableItem key={id} item={items[id]} />
          ))}
          {!tier.itemIds.length && (
            <span className={styles.placeholder} {...{ [EXPORT_EXCLUDE]: '' }}>
              Déposez des éléments ici
            </span>
          )}
        </div>
      </SortableContext>

      <div className={styles.controls} {...{ [EXPORT_EXCLUDE]: '' }}>
        <button type="button" title="Monter" disabled={isFirst} onClick={() => dispatch({ type: 'moveTier', tierId: tier.id, delta: -1 })}>
          ▲
        </button>
        <button type="button" title="Paramètres du tier" onClick={() => onOpenSettings(tier.id)}>
          ⚙
        </button>
        <button type="button" title="Descendre" disabled={isLast} onClick={() => dispatch({ type: 'moveTier', tierId: tier.id, delta: 1 })}>
          ▼
        </button>
      </div>
    </div>
  );
});
