import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent, UniqueIdentifier } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { POOL_ID, useTierlist } from '../hooks/useTierlist';
import type { TierlistState } from '../hooks/useTierlist';
import { player } from '../hooks/useAudioPlayer';
import { MODE_LABELS } from '../types';
import { exportPng } from '../lib/exportPng';
import { downloadSave, saveFileName } from '../lib/saveFile';
import type { TierlistMeta } from '../lib/saveFile';
import AudioPlayer from './AudioPlayer';
import ItemCard from './ItemCard';
import Pool from './Pool';
import TierRow from './TierRow';
import TierSettings from './TierSettings';
import styles from './TierBoard.module.css';

interface Props {
  initial: TierlistState;
  meta: TierlistMeta;
  /** Prévient l'écran parent quand des modifications ne sont pas sauvegardées. */
  onDirtyChange: (dirty: boolean) => void;
}

export default function TierBoard({ initial, meta, onDirtyChange }: Props) {
  const [state, dispatch] = useTierlist(initial);
  /** Dernier état exporté : la tierlist est « modifiée » dès que l'état en diffère. */
  const [savedState, setSavedState] = useState(initial);
  const dirty = state !== savedState;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settingsTierId, setSettingsTierId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  /** État avant le déplacement, restauré si celui-ci est annulé (Échap). */
  const snapshot = useRef<TierlistState | null>(null);
  /** Zone capturée par l'export PNG : en-tête + tiers (sans la réserve ni les contrôles). */
  const captureRef = useRef<HTMLDivElement>(null);
  /** Date affichée dans l'en-tête de l'image ; non nulle pendant l'export. */
  const [exportDate, setExportDate] = useState<string | null>(null);
  const exporting = exportDate !== null;
  const [exportError, setExportError] = useState<string | null>(null);

  // Arrête la musique en quittant l'écran de tierlist.
  useEffect(() => () => player.stop(), []);

  useEffect(() => {
    onDirtyChange(dirty);
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, onDirtyChange]);

  function exportJson() {
    downloadSave(state, meta);
    setSavedState(state);
  }

  async function exportImage() {
    if (!captureRef.current) return;
    setExportError(null);
    // Affiche l'en-tête de l'image avant la capture.
    flushSync(() => setExportDate(new Date().toLocaleDateString('fr-FR')));
    try {
      await exportPng(captureRef.current, saveFileName(meta, 'png'));
    } catch (e) {
      setExportError(`Export PNG impossible : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExportDate(null);
    }
  }

  const sensors = useSensors(
    // MouseSensor plutôt que PointerSensor : sur écran tactile, ce dernier capterait le geste
    // avant TouchSensor, et le défilement du navigateur l'annulerait (pointercancel).
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const containerIds = new Set([POOL_ID, ...state.tiers.map((t) => t.id)]);

  /** Conteneur (tier ou réserve) d'un élément, ou le conteneur lui-même. */
  function findContainer(id: UniqueIdentifier): string | undefined {
    const key = String(id);
    if (containerIds.has(key)) return key;
    if (state.pool.includes(key)) return POOL_ID;
    return state.tiers.find((t) => t.itemIds.includes(key))?.id;
  }

  function idsOf(containerId: string): string[] {
    return containerId === POOL_ID ? state.pool : (state.tiers.find((t) => t.id === containerId)?.itemIds ?? []);
  }

  /** Priorité aux cartes survolées ; sinon le conteneur sous le curseur. */
  const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    const cardHits = hits.filter((h) => !containerIds.has(String(h.id)));
    if (cardHits.length) return cardHits;
    return hits.length ? hits : rectIntersection(args);
  };

  function handleDragStart({ active }: DragStartEvent) {
    snapshot.current = state;
    setActiveId(String(active.id));
  }

  /** Passage d'un conteneur à un autre pendant le déplacement. */
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = findContainer(active.id);
    const to = findContainer(over.id);
    if (!from || !to || from === to) return;
    const target = idsOf(to);
    const overIndex = target.indexOf(String(over.id));
    dispatch({ type: 'move', itemId: String(active.id), to, index: overIndex >= 0 ? overIndex : target.length });
  }

  /** Réordonnancement final dans le conteneur d'arrivée. */
  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    snapshot.current = null;
    if (!over || active.id === over.id) return;
    const to = findContainer(over.id);
    if (!to || to !== findContainer(active.id) || containerIds.has(String(over.id))) return;
    dispatch({ type: 'move', itemId: String(active.id), to, index: idsOf(to).indexOf(String(over.id)) });
  }

  function handleDragCancel() {
    setActiveId(null);
    if (snapshot.current) dispatch({ type: 'load', state: snapshot.current });
    snapshot.current = null;
  }

  const settingsTier = state.tiers.find((t) => t.id === settingsTierId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={styles.toolbar}>
        <span className={dirty ? styles.unsaved : styles.saved}>
          {dirty ? '● Modifications non sauvegardées' : '✓ Aucune modification non sauvegardée'}
        </span>
        <button type="button" className={styles.primary} onClick={exportJson}>
          Sauvegarder (JSON)
        </button>
        <button type="button" onClick={exportImage} disabled={exporting}>
          {exporting ? 'Export en cours…' : 'Exporter (PNG)'}
        </button>
        {confirmReset ? (
          <>
            <span>Renvoyer tous les éléments dans la réserve ?</span>
            <button
              type="button"
              className={styles.danger}
              onClick={() => {
                dispatch({ type: 'reset' });
                setConfirmReset(false);
              }}
            >
              Réinitialiser
            </button>
            <button type="button" onClick={() => setConfirmReset(false)}>
              Annuler
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)}>
            Réinitialiser
          </button>
        )}
      </div>
      {exportError && <p className={styles.error}>{exportError}</p>}

      <div ref={captureRef} className={exporting ? styles.capturing : undefined} data-exporting={exporting || undefined}>
        {exporting && (
          <div className={styles.exportHeader}>
            <strong>{meta.userName}</strong> — Tierlist {MODE_LABELS[meta.mode]}
            <span>{exportDate}</span>
          </div>
        )}
        <div className={styles.tiers}>
          {state.tiers.map((tier, i) => (
            <TierRow
              key={tier.id}
              tier={tier}
              items={state.items}
              isFirst={i === 0}
              isLast={i === state.tiers.length - 1}
              dispatch={dispatch}
              onOpenSettings={setSettingsTierId}
              forceExpanded={exporting}
            />
          ))}
        </div>
      </div>
      <button type="button" className={styles.addTier} onClick={() => dispatch({ type: 'addTier' })}>
        + Ajouter un tier
      </button>

      <Pool itemIds={state.pool} items={state.items} />
      <AudioPlayer />

      <DragOverlay>{activeId && <ItemCard item={state.items[activeId]} overlay />}</DragOverlay>

      {settingsTier && (
        <TierSettings
          key={settingsTier.id}
          tier={settingsTier}
          onChange={(changes) => dispatch({ type: 'updateTier', tierId: settingsTier.id, ...changes })}
          onDelete={() => {
            dispatch({ type: 'removeTier', tierId: settingsTier.id });
            setSettingsTierId(null);
          }}
          onClose={() => setSettingsTierId(null)}
        />
      )}
    </DndContext>
  );
}
