import { memo } from 'react';
import type { SyntheticEvent } from 'react';
import type { Item } from '../types';
import { player, useSongStatus } from '../hooks/useAudioPlayer';
import { EXPORT_EXCLUDE } from '../lib/exportPng';
import styles from './ItemCard.module.css';

interface Props {
  item: Item;
  overlay?: boolean;
}

const BUTTON_LABELS = {
  idle: 'Écouter',
  paused: 'Reprendre',
  playing: 'Pause',
  error: 'Fichier audio indisponible, réessayer',
} as const;

/** Empêche le bouton de déclencher un glisser-déposer de la carte. */
const stop = (e: SyntheticEvent) => e.stopPropagation();

/** Carte d'une chanson : couverture, badge OP/ED, titre, artiste et bouton de lecture. */
export default memo(function SongCard({ item, overlay = false }: Props) {
  const status = useSongStatus(item.id);
  const [badge, artist] = (item.subtitle ?? '').split(' · ');

  return (
    <div
      className={`${styles.card} ${overlay ? styles.overlay : ''} ${status === 'playing' || status === 'paused' ? styles.current : ''}`}
      title={`${item.title}\n${item.subtitle ?? ''}\n${item.animeTitle}`}
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.animeTitle} crossOrigin="anonymous" draggable={false} />
      ) : (
        <span className={styles.noImage} />
      )}
      {badge && <span className={styles.badge}>{badge}</span>}

      <button
        type="button"
        className={`${styles.play} ${status === 'error' ? styles.playError : ''}`}
        {...{ [EXPORT_EXCLUDE]: '' }}
        aria-label={`${BUTTON_LABELS[status]} : ${item.title}`}
        title={BUTTON_LABELS[status]}
        onPointerDown={stop}
        onMouseDown={stop}
        onTouchStart={stop}
        onKeyDown={stop}
        onClick={(e) => {
          e.stopPropagation();
          player.toggle(item);
        }}
      >
        {status === 'error' ? '⚠' : status === 'playing' ? '❚❚' : '▶'}
      </button>

      <span className={styles.caption}>
        <span className={styles.songTitle}>{item.title}</span>
        {artist && <span className={styles.artist}>{artist}</span>}
      </span>
    </div>
  );
});
