import { useRef, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import type { MalList, TierlistSave } from '../types';
import { countByStatus, parseMalXml, XmlParseError } from '../lib/parseMalXml';
import { parseSave, SaveFormatError } from '../lib/saveFile';
import { AnilistUserError, fetchAnilistList } from '../lib/anilistUser';
import styles from './ImportScreen.module.css';

const ANILIST_USER_KEY = 'anime-tierlist:anilist-user';
/** Nombre maximal de titres listés pour les animés sans ID MAL. */
const MAX_LISTED_TITLES = 10;

function loadAnilistUser(): string {
  try {
    return localStorage.getItem(ANILIST_USER_KEY) ?? '';
  } catch {
    return '';
  }
}

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
  const [anilistUser, setAnilistUser] = useState(loadAnilistUser);
  const [fetching, setFetching] = useState(false);

  async function handleAnilist(e: FormEvent) {
    e.preventDefault();
    const userName = anilistUser.trim();
    if (!userName || fetching) return;
    setError(null);
    setFetching(true);
    try {
      onLoad(await fetchAnilistList(userName));
      try {
        localStorage.setItem(ANILIST_USER_KEY, userName);
      } catch {
        // Préférence facultative.
      }
    } catch (err) {
      setError(err instanceof AnilistUserError ? err.message : `Récupération impossible : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setFetching(false);
    }
  }

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

      <form className={styles.anilist} onSubmit={handleAnilist}>
        <label htmlFor="anilist-user">Depuis AniList</label>
        <div className={styles.anilistRow}>
          <input
            id="anilist-user"
            type="text"
            placeholder="Pseudo AniList"
            autoComplete="username"
            spellCheck={false}
            value={anilistUser}
            onChange={(e) => setAnilistUser(e.target.value)}
          />
          <button type="submit" className={styles.next} disabled={!anilistUser.trim() || fetching}>
            {fetching ? 'Chargement…' : 'Importer'}
          </button>
        </div>
        <p className={styles.muted}>La liste doit être publique.</p>
      </form>

      <p className={styles.separator}>ou</p>

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

      {list && !error && !fetching && (
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
              Dont {anilistOnly.length} sans identifiant MyAnimeList (musiques cherchées par nom) :{' '}
              {anilistOnly.slice(0, MAX_LISTED_TITLES).map((e) => e.title).join(', ')}
              {anilistOnly.length > MAX_LISTED_TITLES && '…'}
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
