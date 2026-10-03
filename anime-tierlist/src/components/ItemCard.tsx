import { memo } from 'react';
import type { Item } from '../types';
import SongCard from './SongCard';
import styles from './ItemCard.module.css';

interface Props {
  item: Item;
  /** Aperçu affiché sous le curseur pendant le déplacement. */
  overlay?: boolean;
}

/** Carte d'un élément : couverture de l'animé, ou carte de chanson (`SongCard`). */
export default memo(function ItemCard({ item, overlay = false }: Props) {
  if (item.kind !== 'anime') return <SongCard item={item} overlay={overlay} />;
  return (
    <div className={`${styles.card} ${overlay ? styles.overlay : ''}`} title={item.title}>
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.title} crossOrigin="anonymous" draggable={false} />
      ) : (
        <span className={styles.noImage}>{item.title}</span>
      )}
    </div>
  );
});
