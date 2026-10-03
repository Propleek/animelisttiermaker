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
  /** Force l'affichage des cartes même si le tier est replié (export PNG). */
  forceExpanded?: boolean;
}

export default memo(function TierRow({ tier, items, isFirst, isLast, dispatch, onOpenSettings, forceExpanded = false }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id });
  const collapsed = !!tier.collapsed && !forceExpanded;
  const count = tier.itemIds.length;
  const toggle = () => dispatch({ type: 'toggleCollapse', tierId: tier.id });

  return (
    <div className={`${styles.row} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.label} style={{ background: tier.color }}>
        <span>{tier.label}</span>
      </div>

      {/* Replié, le tier reste une zone de dépôt : les cartes déposées s'ajoutent à la fin. */}
      <SortableContext id={tier.id} items={collapsed ? [] : tier.itemIds} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className={`${styles.items} ${isOver ? styles.over : ''}`}>
          {collapsed ? (
            <span className={styles.summary}>
              {count ? `${count} élément${count > 1 ? 's' : ''} masqué${count > 1 ? 's' : ''}` : 'Tier replié'}
              <span className={styles.hint}> · déposez des cartes ici pour les ajouter</span>
            </span>
          ) : (
            tier.itemIds.map((id) => <SortableItem key={id} item={items[id]} />)
          )}
          {!collapsed && !count && (
            <span className={styles.placeholder} {...{ [EXPORT_EXCLUDE]: '' }}>
              Déposez des éléments ici
            </span>
          )}
        </div>
      </SortableContext>

      <div className={styles.controls} {...{ [EXPORT_EXCLUDE]: '' }}>
        {/* Grille 2×2 (▲▼ | −⚙) : même largeur que le tier soit replié ou non. */}
        <button type="button" title="Monter" disabled={isFirst} onClick={() => dispatch({ type: 'moveTier', tierId: tier.id, delta: -1 })}>
          ▲
        </button>
        <button type="button" title="Descendre" disabled={isLast} onClick={() => dispatch({ type: 'moveTier', tierId: tier.id, delta: 1 })}>
          ▼
        </button>
        <button type="button" className={styles.toggle} title={collapsed ? 'Déplier' : 'Replier'} aria-expanded={!collapsed} onClick={toggle}>
          {collapsed ? '+' : '−'}
        </button>
        <button type="button" title="Paramètres du tier" onClick={() => onOpenSettings(tier.id)}>
          ⚙
        </button>
      </div>
    </div>
  );
});
