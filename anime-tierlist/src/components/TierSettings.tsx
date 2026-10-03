import { useEffect, useRef, useState } from 'react';
import { DEFAULT_TIERS } from '../types';
import type { Tier } from '../types';
import { EXTRA_COLORS } from '../hooks/useTierlist';
import styles from './TierSettings.module.css';

const SWATCHES = [...DEFAULT_TIERS.map((t) => t.color), ...EXTRA_COLORS];

interface Props {
  tier: Tier;
  onChange: (changes: { label?: string; color?: string }) => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Fenêtre modale : renommer, changer la couleur ou supprimer un tier. */
export default function TierSettings({ tier, onChange, onDelete, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
    >
      <h3>Paramètres du tier</h3>

      <label className={styles.field}>
        Libellé
        <input
          type="text"
          value={tier.label}
          maxLength={40}
          onChange={(e) => onChange({ label: e.target.value })}
          autoFocus
        />
      </label>

      <div className={styles.field}>
        Couleur
        <div className={styles.swatches}>
          {SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              className={`${styles.swatch} ${tier.color === color ? styles.selected : ''}`}
              style={{ background: color }}
              title={color}
              onClick={() => onChange({ color })}
            />
          ))}
          <input
            type="color"
            className={styles.picker}
            value={tier.color}
            title="Couleur personnalisée"
            onChange={(e) => onChange({ color: e.target.value })}
          />
        </div>
      </div>

      <div className={styles.actions}>
        {confirmDelete ? (
          <>
            <span>Supprimer ce tier ? Ses éléments retournent dans la réserve.</span>
            <button type="button" className={styles.danger} onClick={onDelete}>
              Supprimer
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)}>
              Annuler
            </button>
          </>
        ) : (
          <>
            <button type="button" className={styles.dangerOutline} onClick={() => setConfirmDelete(true)}>
              Supprimer le tier
            </button>
            <button type="button" onClick={() => dialogRef.current?.close()}>
              Fermer
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
