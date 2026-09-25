/**
 * "Devenir partenaire" (phase 1A): choice between grocer and driver, in plain French,
 * with the documents to provide and what it brings. Shows the state of a request
 * already started (sent or kept on the phone).
 */
import { Link } from 'react-router-dom';
import { ChevronRight, FileText, HandCoins, Smartphone, Store, Truck, UserPlus } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import { useNavyProfile } from '../../services/navyProfileStore';
import type { PartnerKind } from '../../types/partner';
import { NavyCard, NavyHelp, NavyPage, NavyPageTitle, StatusBadge, btnPrimary } from '../ui/NavyUi';

const OFFERS: Record<PartnerKind, { icon: typeof Store; title: string; gain: string; docs: string[] }> = {
  epicier: {
    icon: Store,
    title: 'Devenir épicier',
    gain: 'Votre boutique devient un point relais : vous recevez et remettez des petits colis, et vous êtes payé à chaque dépôt et à chaque retrait, au tarif que vous fixez. Plus de passage, donc plus de clients.',
    docs: ['Pièce d’identité du gérant', 'Carte NIF', 'Carte statistique', 'Photo de la boutique'],
  },
  chauffeur: {
    icon: Truck,
    title: 'Devenir chauffeur',
    gain: 'Vous faites déjà le trajet : emportez des colis d’une épicerie à l’autre et gagnez de l’argent en plus, selon votre prix au kilomètre.',
    docs: ['Pièce d’identité', 'Permis de conduire', 'Carte NIF (à votre nom, au propriétaire ou à la coopérative)', 'Photo du véhicule avec la plaque'],
  },
};

export default function BecomePartnerPage() {
  const userId = useAppStore((s) => s.user?.id);
  const profile = useNavyProfile();
  const mine = profile.userId === userId;

  return (
    <NavyPage>
      <NavyPageTitle icon={UserPlus} title="Devenir partenaire" subtitle="Rejoignez le réseau NAVY ay à Nosy Be." />

      {(['epicier', 'chauffeur'] as const).map((kind) => {
        const o = OFFERS[kind];
        const Icon = o.icon;
        const row = mine ? profile.partners.find((p) => p.kind === kind) : undefined;
        const draft = mine ? profile.drafts.find((d) => d.kind === kind) : undefined;
        return (
          <NavyCard key={kind} className="overflow-hidden">
            <div className="h-1.5 bg-navyay-yellow" aria-hidden="true" />
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-navyay-charcoal text-navyay-yellow flex items-center justify-center">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3 className="flex-1 min-w-0 text-lg font-bold">{o.title}</h3>
                {row && <StatusBadge status={row.status} />}
              </div>

              <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-navyay-charcoal/85">
                <HandCoins className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span className="min-w-0">{o.gain}</span>
              </p>

              <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
                <FileText className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                Photos à fournir
              </p>
              <ul className="mt-1.5 space-y-1 pl-6 text-sm text-navyay-charcoal/80 list-disc marker:text-navyay-yellow">
                {o.docs.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>

              <div className="mt-4">
                {row ? (
                  <Link to={`/navy/demande/${kind}`} className={`${btnPrimary} w-full`}>
                    Voir ma demande
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                ) : draft ? (
                  <Link to={draft.state === 'queued' ? `/navy/demande/${kind}` : `/navy/devenir/${kind}`} className={`${btnPrimary} w-full`}>
                    <Smartphone className="w-4 h-4" aria-hidden="true" />
                    {draft.state === 'queued' ? 'Demande prête, en attente de réseau' : 'Reprendre mon brouillon'}
                  </Link>
                ) : (
                  <Link to={`/navy/devenir/${kind}`} className={`${btnPrimary} w-full`}>
                    {o.title}
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          </NavyCard>
        );
      })}

      <NavyHelp title="Comment se passe la validation ?">
        <p>Vous remplissez le formulaire et prenez les photos avec votre téléphone. Une opératrice de CyberKELY vérifie votre dossier.</p>
        <p>Vous voyez l’état de votre demande ici : en attente, validée ou refusée. En cas de refus, le motif est indiqué et vous pouvez corriger puis renvoyer.</p>
        <p>Vos pièces d’identité restent privées : elles ne sont visibles que par vous et par les opératrices.</p>
      </NavyHelp>
    </NavyPage>
  );
}
