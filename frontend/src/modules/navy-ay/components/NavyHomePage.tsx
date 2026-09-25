/**
 * NAVY ay — home page (phase 0). Explains the service in plain French and announces
 * that sending parcels is coming soon. Static content: works fully offline.
 * Charter: ylang-ylang yellow + charcoal, text on yellow = charcoal, no navy blue.
 */
import { useId, useState } from 'react';
import { ChevronDown, Clock, Info, PackagePlus, Store, Truck, WifiOff } from 'lucide-react';
import useOnlineStatus from '../../../hooks/useOnlineStatus';

const STEPS = [
  {
    icon: PackagePlus,
    title: 'Vous déposez',
    text: 'Vous apportez votre petit colis dans une épicerie partenaire près de chez vous.',
  },
  {
    icon: Truck,
    title: 'On transporte',
    text: 'Un chauffeur l’emmène jusqu’à l’épicerie la plus proche du destinataire.',
  },
  {
    icon: Store,
    title: 'On retire',
    text: 'Le destinataire passe le récupérer à l’épicerie, quand ça l’arrange.',
  },
] as const;

export default function NavyHomePage() {
  const isOnline = useOnlineStatus();
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();

  return (
    <div className="max-w-2xl mx-auto px-4 pb-6 space-y-4 text-navyay-charcoal selection:bg-navyay-yellow selection:text-navyay-charcoal">
      {!isOnline && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-navyay-charcoal/15 bg-white px-4 py-3 text-sm"
          role="status"
        >
          <WifiOff className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="min-w-0">
            Vous êtes hors ligne. Cette page reste consultable ; les envois demanderont une connexion.
          </p>
        </div>
      )}

      {/* Accueil */}
      <section className="rounded-3xl bg-white shadow-soft border border-navyay-charcoal/10 overflow-hidden">
        <div className="h-1.5 bg-navyay-yellow" aria-hidden="true" />
        <div className="px-5 pt-6 pb-7 sm:px-8 sm:pt-8 sm:pb-9">
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-balance">
            Envoyer un petit colis à Nosy Be
          </h2>
          <p className="mt-2 text-base text-navyay-charcoal/80 leading-relaxed text-pretty">
            Déposé et retiré dans une épicerie près de chez vous.
          </p>
        </div>
      </section>

      {/* Comment ça marche : une frise reliée (l'ordre des étapes compte) */}
      <section aria-labelledby="navy-how" className="rounded-3xl bg-white border border-navyay-charcoal/10 px-5 pt-5 pb-2">
        <h3 id="navy-how" className="text-base font-semibold">
          Comment ça marche
        </h3>
        <ol className="mt-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative flex items-start gap-4 pb-5">
              {i < STEPS.length - 1 && (
                <span
                  className="absolute left-[21px] top-12 bottom-1 w-0.5 rounded-full bg-navyay-yellow/60"
                  aria-hidden="true"
                />
              )}
              <span className="relative flex-shrink-0 w-11 h-11 rounded-xl bg-navyay-charcoal text-navyay-yellow flex items-center justify-center">
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-navyay-yellow text-navyay-charcoal text-[11px] font-bold flex items-center justify-center ring-2 ring-white tabular-nums">
                  {i + 1}
                </span>
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-semibold">{title}</p>
                <p className="mt-0.5 text-sm text-navyay-charcoal/75 leading-relaxed text-pretty">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Annonce */}
      <section className="rounded-2xl bg-navyay-charcoal text-white px-5 py-5">
        <p className="flex items-center gap-2 font-semibold text-navyay-yellow">
          <Clock className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          Les envois arrivent bientôt
        </p>
        <p className="mt-1 text-sm text-white/85 leading-relaxed">
          Nous préparons le réseau d’épiceries et de chauffeurs. Vous pourrez bientôt envoyer
          et suivre vos colis directement ici.
        </p>
      </section>

      {/* Aide ⓘ (repliée par défaut) */}
      <section className="rounded-2xl bg-white border border-navyay-charcoal/10">
        <button
          type="button"
          onClick={() => setHelpOpen((o) => !o)}
          aria-expanded={helpOpen}
          aria-controls={helpId}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-2xl hover:bg-navyay-yellow/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow"
        >
          <Info className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0 font-medium">Qu’est-ce que NAVY ay ?</span>
          <ChevronDown
            className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${helpOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        {helpOpen && (
          <div id={helpId} className="px-4 pb-4 space-y-2 text-sm text-navyay-charcoal/80 leading-relaxed">
            <p>
              NAVY ay est un service de livraison de petits colis entre habitants de Nosy Be.
              Pas besoin d’être chez vous pour recevoir : le colis attend dans une épicerie
              du quartier.
            </p>
            <p>
              Pour l’instant, cet écran présente le service. L’envoi, le suivi et le retrait
              des colis seront ajoutés dans les prochaines mises à jour de l’application.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
