import type { ReactNode } from 'react';
import styles from './CrashPanel.module.css';

interface Props {
  error: Error;
  /** Boutons propres au contexte (sauvegarder, reprendre…) ; « Recharger la page » est toujours proposé. */
  children?: ReactNode;
}

/** Message affiché par une barrière d'erreur. */
export default function CrashPanel({ error, children }: Props) {
  return (
    <div className={styles.panel} role="alert">
      <h3>Une erreur inattendue est survenue</h3>
      {children ? (
        <p>Ta tierlist n'est pas perdue : sauvegarde-la, puis reprends là où tu en étais.</p>
      ) : (
        <p>Recharge la page pour continuer.</p>
      )}
      <div className={styles.actions}>
        {children}
        <button type="button" onClick={() => window.location.reload()}>
          Recharger la page
        </button>
      </div>
      <details className={styles.details}>
        <summary>Détails techniques</summary>
        <pre>{error.message}</pre>
      </details>
    </div>
  );
}
