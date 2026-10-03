import { useMemo, useState } from 'react';
import type { AnimeEntry, MalList, Mode } from '../types';
import { countByStatus } from '../lib/parseMalXml';
import styles from './SetupScreen.module.css';

export interface SetupResult {
  mode: Mode;
  entries: AnimeEntry[];
}

interface Props {
  list: MalList;
  /** Choix précédents, restaurés au retour sur cet écran. */
  initial: SetupResult | null;
  onBack: () => void;
  onNext: (result: SetupResult) => void;
}

const MODES: { value: Mode; label: string; description: string }[] = [
  { value: 'anime', label: 'Animés', description: 'Classer les animés de la liste' },
  { value: 'opening', label: 'Openings', description: 'Classer les openings de ces animés' },
  { value: 'ending', label: 'Endings', description: 'Classer les endings de ces animés' },
];

export default function SetupScreen({ list, initial, onBack, onNext }: Props) {
  const statusCounts = useMemo(() => countByStatus(list.entries), [list]);

  const [mode, setMode] = useState<Mode>(initial?.mode ?? 'anime');
  const [statuses, setStatuses] = useState<Set<string>>(
    () => new Set(initial ? initial.entries.map((e) => e.status) : statusCounts.map(([status]) => status)),
  );

  const selected = list.entries.filter((e) => statuses.has(e.status));

  function toggleStatus(status: string) {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (!next.delete(status)) next.add(status);
      return next;
    });
  }

  const allChecked = statuses.size === statusCounts.length;

  return (
    <section>
      <h2>Configuration</h2>

      <fieldset className={styles.group}>
        <legend>Type de tierlist</legend>
        <div className={styles.modes}>
          {MODES.map((m) => (
            <label key={m.value} className={`${styles.mode} ${mode === m.value ? styles.active : ''}`}>
              <input
                type="radio"
                name="mode"
                value={m.value}
                checked={mode === m.value}
                onChange={() => setMode(m.value)}
              />
              <strong>{m.label}</strong>
              <span>{m.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Animés à inclure (par statut)</legend>
        <div className={styles.statuses}>
          {statusCounts.map(([status, count]) => (
            <label key={status} className={styles.status}>
              <input
                type="checkbox"
                checked={statuses.has(status)}
                onChange={() => toggleStatus(status)}
              />
              {status} <span className={styles.muted}>({count})</span>
            </label>
          ))}
          <button
            type="button"
            className={styles.toggleAll}
            onClick={() => setStatuses(allChecked ? new Set() : new Set(statusCounts.map(([s]) => s)))}
          >
            {allChecked ? 'Tout décocher' : 'Tout cocher'}
          </button>
        </div>
      </fieldset>

      <p>
        <strong>{selected.length}</strong> animé{selected.length > 1 ? 's' : ''} sélectionné
        {selected.length > 1 ? 's' : ''}
      </p>

      <div className={styles.actions}>
        <button type="button" onClick={onBack}>
          Retour
        </button>
        <button
          type="button"
          className={styles.primary}
          disabled={!selected.length}
          onClick={() => onNext({ mode, entries: selected })}
        >
          Créer la tierlist
        </button>
      </div>
    </section>
  );
}
