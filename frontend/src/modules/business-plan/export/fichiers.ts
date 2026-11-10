// Hand a file to the person: share sheet with the file when the phone supports it (WhatsApp on
// Android), else a download.

export function telecharger(fichier: Blob, nom: string): void {
  const url = URL.createObjectURL(fichier);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function partageFichierPossible(fichier: File): boolean {
  try {
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [fichier] });
  } catch {
    return false;
  }
}

/** 'partage' (share sheet opened), 'telechargement' (downloaded instead). */
export async function partagerFichier(fichier: File, titre: string): Promise<'partage' | 'telechargement'> {
  if (partageFichierPossible(fichier)) {
    try {
      await navigator.share({ files: [fichier], title: titre });
      return 'partage';
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return 'partage';
    }
  }
  telecharger(fichier, fichier.name);
  return 'telechargement';
}
