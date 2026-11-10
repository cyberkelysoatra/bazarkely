// Share a text (system share sheet, else WhatsApp, else copy) and copy to the clipboard.

export async function copierTexte(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    try {
      const zone = document.createElement('textarea');
      zone.value = texte;
      zone.setAttribute('readonly', '');
      zone.style.position = 'fixed';
      zone.style.opacity = '0';
      document.body.appendChild(zone);
      zone.select();
      const ok = document.execCommand('copy');
      zone.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function lienWhatsApp(texte: string): string {
  return 'https://wa.me/?text=' + encodeURIComponent(texte);
}

/** 'partage' (share sheet), 'whatsapp' (wa.me opened), 'copie' (copied), 'echec'. */
export async function partagerTexte(texte: string): Promise<'partage' | 'whatsapp' | 'copie' | 'echec'> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: texte });
      return 'partage';
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return 'partage';
    }
  }
  try {
    const fenetre = window.open(lienWhatsApp(texte), '_blank', 'noopener');
    if (fenetre !== null) return 'whatsapp';
  } catch {
    // Blocked: copy instead.
  }
  return (await copierTexte(texte)) ? 'copie' : 'echec';
}
