// Hand a file to the person (H21): share sheet with the file when the phone supports it (WhatsApp,
// mail, Drive on Android), else a download. Same behaviour as the exports of /plan/.

export function telecharger(fichier: Blob, nom: string): void {
  const url = URL.createObjectURL(fichier)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export function partageFichierPossible(fichier: File): boolean {
  try {
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [fichier] })
  } catch {
    return false
  }
}

/** 'partage' (share sheet opened), 'telechargement' (downloaded instead). */
export async function partagerFichier(fichier: File, titre: string): Promise<'partage' | 'telechargement'> {
  if (partageFichierPossible(fichier)) {
    try {
      await navigator.share({ files: [fichier], title: titre })
      return 'partage'
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return 'partage'
    }
  }
  telecharger(fichier, fichier.name)
  return 'telechargement'
}

/** « Plates-formes 1 à 3 » -> « Plates-formes-1-a-3 » (letters, digits and hyphens only). */
export function nomFichier(nom: string): string {
  const n = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return n || 'releve'
}

/** `Releve_<nom>_<AAAA-MM-JJ>` (the date of the relevé). */
export function baseNomFichier(nom: string, date: string): string {
  return `Releve_${nomFichier(nom)}_${date}`
}

/** No em dash, no en dash, no middle dot in any exported text. */
export function propre(texte: string): string {
  return texte.replace(/[—–]/g, '-').replace(/·/g, ',').replace(/[  ]/g, ' ')
}
