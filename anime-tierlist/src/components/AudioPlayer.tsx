import { player, usePlayerState, usePlayerTime } from '../hooks/useAudioPlayer';
import styles from './AudioPlayer.module.css';

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Barre de lecture fixe en bas de l'écran, visible dès qu'une chanson est lancée. */
export default function AudioPlayer() {
  const { current, playing, errors } = usePlayerState();
  if (!current) return null;
  const failed = errors.has(current.id);

  return (
    <>
      <div className={styles.spacer} />
      <div className={styles.bar} role="region" aria-label="Lecteur audio">
        {/* crossOrigin comme sur les cartes : sinon le cache du navigateur garde une version
            sans en-tête CORS, et la même image échoue ensuite sur les cartes et à l'export PNG. */}
        {current.imageUrl && <img src={current.imageUrl} alt="" crossOrigin="anonymous" className={styles.thumb} />}

        <button
          type="button"
          className={styles.toggle}
          aria-label={playing ? 'Pause' : 'Lecture'}
          disabled={failed}
          onClick={() => player.togglePause()}
        >
          {playing ? '❚❚' : '▶'}
        </button>

        <div className={styles.info}>
          <span className={styles.title}>
            {current.title} <span className={styles.muted}>— {current.subtitle}</span>
          </span>
          {failed ? (
            <span className={styles.error}>Fichier audio indisponible.</span>
          ) : (
            <Progress />
          )}
        </div>

        <Volume />

        <button type="button" className={styles.close} aria-label="Arrêter la lecture" onClick={() => player.stop()}>
          ✕
        </button>
      </div>
    </>
  );
}

/** Composants séparés : seuls eux se redessinent à chaque `timeupdate`. */
function Progress() {
  const { currentTime, duration } = usePlayerTime();
  return (
    <div className={styles.progress}>
      <span>{formatTime(currentTime)}</span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        aria-label="Position"
        onChange={(e) => player.seek(Number(e.target.value))}
      />
      <span>{formatTime(duration)}</span>
    </div>
  );
}

function Volume() {
  const { volume } = usePlayerTime();
  return (
    <label className={styles.volume} title="Volume">
      🔊
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        aria-label="Volume"
        onChange={(e) => player.setVolume(Number(e.target.value))}
      />
    </label>
  );
}
