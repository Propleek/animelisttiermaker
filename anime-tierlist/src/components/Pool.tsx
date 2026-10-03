import { memo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Item } from '../types';
import { POOL_ID } from '../hooks/useTierlist';
import { DraggableItem } from './SortableItem';
import styles from './Pool.module.css';

interface Props {
  itemIds: string[];
  items: Record<string, Item>;
}

/** Minuscules sans accents, pour une recherche tolérante. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function matches(item: Item, query: string): boolean {
  return normalize(`${item.title} ${item.subtitle ?? ''} ${item.animeTitle}`).includes(query);
}

export default memo(function Pool({ itemIds, items }: Props) {
  const [search, setSearch] = useState('');
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID });

  const query = normalize(search.trim());
  const visible = query ? itemIds.filter((id) => matches(items[id], query)) : itemIds;

  return (
    <div className={styles.pool}>
      <div className={styles.header}>
        <h3>
          Non classés <span className={styles.count}>({itemIds.length})</span>
        </h3>
        <input
          type="search"
          className={styles.search}
          placeholder="Rechercher un titre, un artiste…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div ref={setNodeRef} className={`${styles.items} ${isOver ? styles.over : ''}`}>
        {visible.map((id) => (
          <DraggableItem key={id} item={items[id]} />
        ))}
        {!itemIds.length && <p className={styles.empty}>Tout est classé !</p>}
        {itemIds.length > 0 && !visible.length && <p className={styles.empty}>Aucun résultat pour « {search} ».</p>}
      </div>
    </div>
  );
});
