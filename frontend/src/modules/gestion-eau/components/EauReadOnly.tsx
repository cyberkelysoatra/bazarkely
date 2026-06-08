/**
 * Indicateurs « Lecture seule (promoteur) » — Phase 2.
 *
 * Le rôle Promoteur voit tous les écrans mais ne peut RIEN écrire (sauf les seuils
 * d'alerte dans la Configuration). Chaque écran porteur d'écritures consomme
 * `useGestionEau().isReadOnly` puis :
 *   - masque/désactive ses contrôles d'écriture (boutons, formulaires, toggles) ;
 *   - garde chaque handler de mutation (`if (isReadOnly) return;`) — défense en profondeur ;
 *   - affiche discrètement l'un de ces indicateurs.
 *
 * La RLS (Phase 1) reste le filet de sécurité serveur : même si un contrôle était
 * oublié, l'écriture échouerait côté serveur sans casser l'app.
 */
import { Eye } from 'lucide-react';
import { cn } from '../../../utils/cn';

/** Petite pastille discrète à poser près d'un titre d'écran/section. */
export function EauReadOnlyBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-ahuvi-50 border border-ahuvi-200 px-2 py-0.5 text-[11px] font-medium text-ahuvi-olive',
        className,
      )}
      title="Vous consultez en tant que promoteur : lecture seule (aucune modification possible, hors seuils d'alerte)."
    >
      <Eye className="w-3 h-3" aria-hidden="true" />
      Lecture seule (promoteur)
    </span>
  );
}

/** Bandeau pleine largeur (en tête de liste/page) pour les écrans très orientés écriture. */
export function EauReadOnlyBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl bg-ahuvi-50 border border-ahuvi-200 px-3 py-2 text-xs text-ahuvi-olive',
        className,
      )}
    >
      <Eye className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      Mode promoteur : consultation seule. Les actions de modification sont désactivées.
    </div>
  );
}
