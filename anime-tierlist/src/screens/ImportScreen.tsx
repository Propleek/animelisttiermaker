import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { MalList, TierlistSave } from '../types';
import { countByStatus, parseMalXml, XmlParseError } from '../lib/parseMalXml';
import { parseSave, SaveFormatError } from '../lib/saveFile';
import styles from './ImportScreen.module.css';

interface Props {
  list: MalList | null;
  onLoad: (list: MalList) => void;
  /** Ouvre directement une tierlist sauvegardée (fichier .json). */
  onOpenSave: (save: TierlistSave) => void;
  onNext: () => void;
}

export default function ImportScreen({ list, onLoad, onOpenSave, onNext }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith('.xml')) onLoad(parseMalXml(await file.text()));
      else if (name.endsWith('.json')) onOpenSave(parseSave(await file.text()));
      else setError(`« ${file.name} » n'est ni un export .xml ni une sauvegarde .json.`);
    } catch (e) {
      const known = e instanceof XmlParseError || e instanceof SaveFormatError;
      setError(known ? e.message : `Lecture impossible : ${String(e)}`);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files[0]);
  }

  const anilistOnly = list?.entries.filter((e) => e.malId === null) ?? [];

  return (
    <section>
      <h2>Importer une liste</h2>

      <div
        className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <p>Glissez un export XML MyAnimeList ou une sauvegarde JSON de tierlist ici</p>
        <p className={styles.muted}>ou</p>
        <button type="button">Choisir un fichier</button>
        <input
          ref={inputRef}
          type="file"
          accept=".xml,.json,application/xml,text/xml,application/json"
          hidden
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {list && !error && (
        <div className={styles.summary}>
          <h3>{list.userName}</h3>
          <p>
            <strong>{list.entries.length}</strong> animés
          </p>
          <ul className={styles.statuses}>
            {countByStatus(list.entries).map(([status, count]) => (
              <li key={status}>
                {status} : {count}
              </li>
            ))}
          </ul>
          {anilistOnly.length > 0 && (
            <p className={styles.muted}>
              Dont {anilistOnly.length} sans identifiant MyAnimeList (récupéré via AniList) :{' '}
              {anilistOnly.map((e) => e.title).join(', ')}
            </p>
          )}
          <button type="button" className={styles.next} onClick={onNext}>
            Continuer
          </button>
        </div>
      )}
    </section>
  );
}
