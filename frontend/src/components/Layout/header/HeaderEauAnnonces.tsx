/**
 * Bandeau d'annonces du domaine (mode eau / AHUVI) — affiché dans le header.
 *
 * Lit les annonces ACTIVES (eau_annonces, fenêtre date + actif) et les fait défiler
 * (rotation douce toutes les 6 s), fermable par l'utilisateur (mémorisé en session).
 * Tous les rôles eau le voient ; vide → rien n'est rendu (pas de réservation d'espace).
 */
import { useEffect, useState } from 'react';
import { Megaphone, X, ChevronRight } from 'lucide-react';
import { listActiveAnnonces } from '../../../modules/gestion-eau/services/eauAnnonceService';
import type { AnnonceLocal } from '../../../modules/gestion-eau/types/gestionEau';

const TYPE_EMOJI: Record<string, string> = {
  promo: '🏷️',
  evenement: '🎉',
  communaute: '🤝',
};

const DISMISS_KEY = 'eau_annonces_banner_dismissed';

export default function HeaderEauAnnonces() {
  const [annonces, setAnnonces] = useState<AnnonceLocal[]>([]);
  const [idx, setIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) setDismissed(true);
    } catch {
      /* ignore */
    }
    let alive = true;
    (async () => {
      const list = await listActiveAnnonces();
      if (alive) setAnnonces(list);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Rotation douce entre les annonces actives.
  useEffect(() => {
    if (annonces.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % annonces.length), 6000);
    return () => clearInterval(t);
  }, [annonces.length]);

  if (dismissed || annonces.length === 0) return null;
  const a = annonces[idx % annonces.length];

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mt-3 rounded-xl bg-white/15 backdrop-blur-sm border border-ahuvi-gold/40 px-3 py-2 flex items-center gap-2 shadow-sm">
      <Megaphone className="w-4 h-4 text-ahuvi-gold flex-shrink-0" />
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 text-white animate-fade-in" key={a.id}>
          <span className="text-sm flex-shrink-0">{TYPE_EMOJI[a.type ?? ''] ?? '📣'}</span>
          <span className="text-sm font-semibold font-ahuvi-body truncate">{a.titre}</span>
          {a.texte && (
            <>
              <ChevronRight className="w-3 h-3 text-white/60 flex-shrink-0" />
              <span className="text-sm text-ahuvi-100 font-ahuvi-body truncate hidden sm:inline">{a.texte}</span>
            </>
          )}
        </div>
      </div>
      {annonces.length > 1 && (
        <span className="text-[10px] text-white/60 flex-shrink-0">
          {(idx % annonces.length) + 1}/{annonces.length}
        </span>
      )}
      <button onClick={dismiss} aria-label="Fermer le bandeau" className="text-white/70 hover:text-white flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
