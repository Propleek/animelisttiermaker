import { useEffect, useState } from 'react';
import { MODE_LABELS } from '../types';
import type { TierlistSave } from '../types';
import type { SetupResult } from './SetupScreen';
import { loadItems } from '../lib/loadItems';
import type { LoadProgress, LoadResult } from '../lib/loadItems';
import type { TierlistMeta } from '../lib/saveFile';
import { createInitialState } from '../hooks/useTierlist';
import type { TierlistState } from '../hooks/useTierlist';
import TierBoard from '../components/TierBoard';
import styles from './TierlistScreen.module.css';

/** Origine de la tierlist : nouveau chargement depuis le XML, ou sauvegarde JSON. */
export type TierlistSource =
  | { type: 'load'; userName: string; setup: SetupResult }
  | { type: 'save'; save: TierlistSave };

interface Props {
  source: TierlistSource;
  onBack: () => void;
}

interface Board {
  initial: TierlistState;
  meta: TierlistMeta;
  warnings?: Pick<LoadResult, 'missingCovers' | 'withoutSongs'>;
}

const STEP_LABELS = { covers: 'Couvertures', songs: 'Musiques' } as const;

type LoadState =
  | { status: 'loading'; progress: LoadProgress | null }
  | { status: 'error'; message: string }
  | { status: 'done'; board: Board };

function boardFromSave({ tiers, pool, items, userName, mode, createdAt }: TierlistSave): Board {
  return { initial: { tiers, pool, items }, meta: { userName, mode, createdAt } };
}

export default function TierlistScreen({ source, onBack }: Props) {
  const [state, setState] = useState<LoadState>(() =>
    source.type === 'save' ? { status: 'done', board: boardFromSave(source.save) } : { status: 'loading', progress: null },
  );
  const [attempt, setAttempt] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [confirmBack, setConfirmBack] = useState(false);

  useEffect(() => {
    if (source.type !== 'load') return;
    const { userName, setup } = source;
    const controller = new AbortController();
    loadItems(
      setup.mode,
      setup.entries,
      (progress) => !controller.signal.aborted && setState({ status: 'loading', progress }),
      controller.signal,
    ).then(
      ({ items, missingCovers, withoutSongs }) =>
        !controller.signal.aborted &&
        setState({
          status: 'done',
          board: {
            initial: createInitialState(items),
            meta: { userName, mode: setup.mode, createdAt: new Date().toISOString() },
            warnings: { missingCovers, withoutSongs },
          },
        }),
      (e: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      },
    );
    return () => controller.abort();
  }, [source, attempt]);

  const mode = source.type === 'save' ? source.save.mode : source.setup.mode;

  return (
    <section>
      <div className={styles.header}>
        <h2>Tierlist — {MODE_LABELS[mode]}</h2>
        {confirmBack ? (
          <div className={styles.confirm}>
            <span>Quitter sans sauvegarder ?</span>
            <button type="button" className={styles.danger} onClick={onBack}>
              Quitter
            </button>
            <button type="button" onClick={() => setConfirmBack(false)}>
              Annuler
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => (dirty ? setConfirmBack(true) : onBack())}>
            Retour
          </button>
        )}
      </div>

      {state.status === 'loading' && <Loading progress={state.progress} />}

      {state.status === 'error' && (
        <div className={styles.error}>
          <p>Le chargement a échoué : {state.message}</p>
          <button
            type="button"
            onClick={() => {
              setState({ status: 'loading', progress: null });
              setAttempt((n) => n + 1);
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {state.status === 'done' && (
        <>
          {state.board.warnings && <Warnings {...state.board.warnings} />}
          <TierBoard initial={state.board.initial} meta={state.board.meta} onDirtyChange={setDirty} />
        </>
      )}
    </section>
  );
}

function Loading({ progress }: { progress: LoadProgress | null }) {
  const ratio = progress && progress.total ? progress.done / progress.total : 0;
  return (
    <div className={styles.loading}>
      <p>
        {progress ? `${STEP_LABELS[progress.step]} : ${progress.done} / ${progress.total}` : 'Préparation…'}
      </p>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

/** Avertissements de chargement, non bloquants. */
function Warnings({ missingCovers, withoutSongs }: Pick<LoadResult, 'missingCovers' | 'withoutSongs'>) {
  return (
    <>
      {missingCovers.length > 0 && (
        <details className={styles.warning}>
          <summary>{missingCovers.length} animé(s) sans couverture</summary>
          <ul>
            {missingCovers.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </details>
      )}
      {withoutSongs.length > 0 && (
        <details className={styles.warning}>
          <summary>{withoutSongs.length} animé(s) sans musique trouvée</summary>
          <ul>
            {withoutSongs.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
