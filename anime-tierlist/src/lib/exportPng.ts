import { toBlob } from 'html-to-image';
import { downloadFile } from './saveFile';

/** Attribut à poser sur les éléments à exclure de l'image (boutons, contrôles). */
export const EXPORT_EXCLUDE = 'data-export-exclude';

/**
 * Capture `node` en PNG (résolution ×2) et le télécharge.
 * Les images doivent être chargées avec `crossOrigin="anonymous"` pour être incluses.
 */
export async function exportPng(node: HTMLElement, fileName: string): Promise<void> {
  const blob = await toBlob(node, {
    pixelRatio: 2,
    // Le fond du thème est défini sur :root (body est transparent).
    backgroundColor: getComputedStyle(document.documentElement).backgroundColor,
    skipFonts: true,
    filter: (n) => !(n instanceof Element && n.hasAttribute(EXPORT_EXCLUDE)),
  });
  if (!blob) throw new Error("La génération de l'image a échoué.");
  downloadFile(blob, fileName);
}
