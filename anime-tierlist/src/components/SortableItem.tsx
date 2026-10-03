import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Item } from '../types';
import ItemCard from './ItemCard';

const TRANSITION = { duration: 120, easing: 'ease-out' };

/** Carte réordonnable, dans un tier. */
export const SortableItem = memo(function SortableItem({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    transition: TRANSITION,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        cursor: 'grab',
        touchAction: 'manipulation',
      }}
      {...attributes}
      {...listeners}
    >
      <ItemCard item={item} />
    </div>
  );
});

/**
 * Carte simplement déplaçable, dans la réserve. Pas de réordonnancement :
 * évite de recalculer la position de centaines de cartes à chaque survol.
 */
export const DraggableItem = memo(function DraggableItem({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.3 : 1, cursor: 'grab', touchAction: 'manipulation' }}
      {...attributes}
      {...listeners}
    >
      <ItemCard item={item} />
    </div>
  );
});
