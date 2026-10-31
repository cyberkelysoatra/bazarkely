/**
 * Tableau de bord du domaine Électricité (ELEC-CC-02). Charte RTB Énergie, aucune donnée
 * d'eau, aucun montant. Pour la gestion et la lecture : avancement des relevés du cycle,
 * total du dernier cycle complet et écart, clients et compteurs par statut, raccourcis.
 * Un client RTB seul garde l'écran d'attente (il ne voit aucune donnée d'un autre client).
 */
import { useEffect, useMemo, useState } from 'react';
import { Gauge, Receipt, Wallet, Zap, Users, Settings, ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import EauPageShell from './EauPageShell';
import { useGestionEau } from '../context/GestionEauContext';
import { listRoles } from '../services/eauRoleService';
import { useDonneesElec, LectureSeule } from './elec/ElecUi';
import { calculerCycle, cycleParDefaut, deMois, libelleMois, moisPrecedent } from '../utils/elecReleves';

const A_VENIR = [
  { icon: Gauge, titre: 'Relevés', texte: 'Saisir les index des compteurs d’électricité, tournée par tournée.' },
  { icon: Receipt, titre: 'Factures', texte: 'Préparer, valider et envoyer les factures RTB Énergie.' },
  { icon: Wallet, titre: 'Paiements', texte: 'Enregistrer les encaissements et relancer les retards.' },
];

const fmtKwh = (v: number) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kWh`;

export default function EauElecHomePage() {
  const { roles, realRoles, isSimulating, domaines } = useGestionEau();
  const { chargement, clients, compteurs, releves, droits } = useDonneesElec();
  const isAdmin = roles.admin;
  const [nbElec, setNbElec] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    (async () => {
      try {
        const rows = await listRoles();
        const n = rows.filter((r) => r.releveur_elec || r.gestion_elec || r.lecture_elec).length;
        if (alive) setNbElec(n);
      } catch {
        /* lecture locale best-effort */
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  const mois = cycleParDefaut();
  const stats = useMemo(() => {
    const enCours = calculerCycle(mois, compteurs, releves);
    // Dernier cycle complet : tous les compteurs actifs relevés (12 mois en arrière au plus).
    let complet = null as ReturnType<typeof calculerCycle> | null;
    let m = mois;
    for (let i = 0; i < 12 && !complet; i++) {
      const c = calculerCycle(m, compteurs, releves);
      if (c.nbActifs > 0 && c.nbActifsReleves === c.nbActifs && c.lignes.length > 0) complet = c;
      m = moisPrecedent(m);
    }
    const avant = complet ? calculerCycle(moisPrecedent(complet.mois), compteurs, releves) : null;
    const ecartPct =
      complet && avant && avant.totalKwh > 0 ? ((complet.totalKwh - avant.totalKwh) / avant.totalKwh) * 100 : null;
    const parStatut = { actif: 0, pause: 0, arrete: 0 };
    for (const c of compteurs) parStatut[c.statut]++;
    return {
      enCours,
      complet,
      avant: avant && avant.lignes.length > 0 ? avant : null,
      ecartPct,
      parStatut,
      clientsActifs: clients.filter((c) => c.statut === 'actif').length,
    };
  }, [mois, compteurs, releves, clients]);

  const aide = {
    id: 'elec-home',
    quoi: (
      <>
        C’est l’espace de l’électricité fournie par RTB Énergie (centrale solaire du domaine).
        {/* Rappel de la séparation seulement pour qui a aussi l'eau (ELEC-CC-01). */}
        {domaines.eau && <> Il est séparé de l’eau : on n’y voit jamais les compteurs ni les factures d’eau.</>}
      </>
    ),
    comment: droits.lecture ? (
      <>
        L’anneau montre où en est la tournée du mois. Les raccourcis mènent aux relevés, aux clients et aux
        réglages de RTB. Les factures arrivent dans une prochaine mise à jour.
        {realRoles.admin && !isSimulating && <> L’administrateur donne les rôles électricité dans « Utilisateurs &amp; rôles ».</>}
      </>
    ) : (
      <>Votre espace client arrive bientôt. Pour l’instant, il n’y a rien à faire ici.</>
    ),
  };

  // Client RTB seul (ou rôle sans lecture du domaine) : écran d'attente, aucune donnée.
  if (!droits.lecture) {
    return (
      <EauPageShell title="Électricité" subtitle="RTB Énergie" tone="elec" aide={aide}>
        <EcranAttente />
      </EauPageShell>
    );
  }

  const { enCours } = stats;
  const pct = enCours.nbActifs > 0 ? enCours.nbActifsReleves / enCours.nbActifs : 0;

  return (
    <EauPageShell
      title="Électricité"
      subtitle="Tableau de bord RTB Énergie"
      tone="elec"
      actions={!droits.gestion ? <LectureSeule /> : undefined}
      aide={aide}
    >
      {chargement ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : compteurs.length === 0 ? (
        <section className="rounded-2xl border border-rtb-gold/40 bg-white shadow-soft px-4 py-8 text-center" data-elec-home-vide>
          <span className="inline-flex w-14 h-14 rounded-2xl items-center justify-center bg-rtb-green text-rtb-gold shadow-md">
            <Zap className="w-7 h-7" aria-hidden="true" />
          </span>
          <h3 className="mt-3 text-base font-semibold text-rtb-green">Aucun compteur pour l’instant</h3>
          <p className="mt-1 text-sm text-gray-600 max-w-sm mx-auto">
            Commencez par créer les clients et leurs compteurs : la tournée et ce tableau de bord se rempliront ensuite.
          </p>
          <Link
            to="/gestion-eau/elec/clients"
            className="mt-4 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-rtb-green text-white text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-rtb-gold"
          >
            {droits.gestion ? <Plus className="w-4 h-4" aria-hidden="true" /> : <Users className="w-4 h-4" aria-hidden="true" />}
            {droits.gestion ? 'Créer les clients et compteurs' : 'Voir les clients'}
          </Link>
        </section>
      ) : (
        <div className="space-y-3" data-elec-home>
          {/* Avancement de la tournée du cycle en cours. */}
          <section className="rounded-2xl border border-rtb-gold/40 bg-white shadow-soft p-4 flex items-center gap-4" data-elec-anneau>
            <Anneau ratio={pct} />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Relevés {deMois(mois)}</p>
              <p className="text-lg font-bold text-rtb-green" data-elec-avancement>
                {enCours.nbActifsReleves} sur {enCours.nbActifs} compteur{enCours.nbActifs > 1 ? 's' : ''} actif{enCours.nbActifs > 1 ? 's' : ''}
              </p>
              {enCours.manquants.length > 0 ? (
                <p className="text-xs text-rose-700 mt-0.5">{enCours.manquants.length} à relever</p>
              ) : (
                <p className="text-xs text-emerald-700 mt-0.5">Tournée complète</p>
              )}
            </div>
          </section>

          {/* Dernier cycle complet et écart avec le cycle d'avant. */}
          <section className="rounded-2xl border border-rtb-gold/40 bg-white shadow-soft p-4" data-elec-dernier-cycle>
            <p className="text-xs text-gray-500">Dernier cycle complet</p>
            {stats.complet ? (
              <div className="flex items-end justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-sm text-gray-700 first-letter:uppercase">{libelleMois(stats.complet.mois)}</p>
                  <p className="text-2xl font-bold text-rtb-green" data-elec-total-complet>{fmtKwh(stats.complet.totalKwh)}</p>
                </div>
                <Ecart pct={stats.ecartPct} avant={stats.avant ? libelleMois(stats.avant.mois) : null} />
              </div>
            ) : (
              <p className="text-sm text-gray-600 mt-1">Pas encore de cycle complet : tous les compteurs actifs doivent être relevés.</p>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <section className="rounded-2xl border border-rtb-gold/40 bg-white shadow-soft p-4" data-elec-clients-actifs>
              <p className="text-xs text-gray-500">Clients actifs</p>
              <p className="text-2xl font-bold text-rtb-green">{stats.clientsActifs}</p>
            </section>
            <section className="rounded-2xl border border-rtb-gold/40 bg-white shadow-soft p-4" data-elec-par-statut>
              <p className="text-xs text-gray-500">Compteurs</p>
              <ul className="text-sm text-gray-700 mt-0.5 space-y-0.5">
                <li><strong className="text-rtb-green">{stats.parStatut.actif}</strong> actifs</li>
                <li><strong className="text-amber-700">{stats.parStatut.pause}</strong> en pause</li>
                <li><strong className="text-gray-600">{stats.parStatut.arrete}</strong> arrêtés</li>
              </ul>
            </section>
          </div>

          <nav className="rounded-2xl border border-gray-200 bg-white shadow-soft divide-y divide-gray-100" aria-label="Raccourcis">
            <Raccourci to="/gestion-eau/elec/releves" icon={Gauge} titre="Relevés" texte="Tournée et contrôle du cycle" />
            <Raccourci to="/gestion-eau/elec/clients" icon={Users} titre="Clients" texte="Clients et compteurs" />
            <Raccourci to="/gestion-eau/elec/reglages" icon={Settings} titre="Réglages RTB" texte="Identité, règlement, tarif" />
          </nav>

          <section className="rounded-2xl border border-dashed border-rtb-gold/60 bg-rtb-gold/5 p-4 flex items-start gap-3" data-elec-factures-bientot>
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-rtb-gold/20 text-rtb-green">
              <Receipt className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-rtb-green">Factures : bientôt</p>
              <p className="text-sm text-gray-600">Les factures RTB Énergie se prépareront à partir de ces relevés.</p>
            </div>
          </section>
        </div>
      )}

      {isAdmin && (
        <Link
          to="/gestion-eau/utilisateurs"
          className="mt-3 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 min-h-[44px] shadow-soft hover:border-rtb-gold/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rtb-gold"
          data-elec-roles-count
        >
          <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-rtb-green text-white">
            <Users className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-rtb-green">
              {nbElec === null
                ? 'Rôles électricité'
                : nbElec === 0
                ? 'Personne n’a encore de rôle électricité'
                : `${nbElec} personne${nbElec > 1 ? 's ont' : ' a'} un rôle électricité`}
            </span>
            <span className="block text-xs text-gray-500">Gérer dans « Utilisateurs &amp; rôles »</span>
          </span>
        </Link>
      )}
    </EauPageShell>
  );
}

function Anneau({ ratio }: { ratio: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, ratio));
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="flex-shrink-0" role="img" aria-label={`${Math.round(v * 100)} % des compteurs relevés`}>
      <circle cx="38" cy="38" r={r} fill="none" stroke="#D3A24633" strokeWidth="8" />
      <circle
        cx="38"
        cy="38"
        r={r}
        fill="none"
        stroke="#3F5838"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${c * v} ${c}`}
        transform="rotate(-90 38 38)"
      />
      <text x="38" y="43" textAnchor="middle" fontSize="15" fontWeight="700" fill="#3F5838">
        {Math.round(v * 100)} %
      </text>
    </svg>
  );
}

function Ecart({ pct, avant }: { pct: number | null; avant: string | null }) {
  if (pct == null || avant == null) return <span className="text-xs text-gray-500">Pas de cycle précédent à comparer</span>;
  const Icon = pct > 0.5 ? ArrowUpRight : pct < -0.5 ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-rtb-green" data-elec-ecart-cycle>
      <Icon className="w-4 h-4" aria-hidden="true" />
      {pct > 0 ? '+' : ''}
      {pct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % par rapport à {avant}
    </span>
  );
}

function Raccourci({ to, icon: Icon, titre, texte }: { to: string; icon: typeof Gauge; titre: string; texte: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3 min-h-[56px] hover:bg-rtb-gold/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rtb-gold">
      <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-rtb-green text-rtb-gold flex-shrink-0">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-rtb-green">{titre}</span>
        <span className="block text-xs text-gray-500">{texte}</span>
      </span>
      <ChevronRight className="w-4 h-4 text-rtb-gold" aria-hidden="true" />
    </Link>
  );
}

function EcranAttente() {
  return (
    <section className="rounded-2xl border border-rtb-gold/40 bg-white shadow-soft overflow-hidden" aria-labelledby="elec-attente-titre" data-elec-attente>
      <div className="px-4 pt-5 pb-4 text-center bg-gradient-to-b from-rtb-gold/15 to-white">
        <span className="inline-flex w-14 h-14 rounded-2xl items-center justify-center bg-rtb-green text-rtb-gold shadow-md">
          <Zap className="w-7 h-7" aria-hidden="true" />
        </span>
        <h3 id="elec-attente-titre" className="mt-3 text-base font-semibold text-rtb-green font-ahuvi-body">
          Votre espace électricité arrive
        </h3>
        <p className="mt-1 text-sm text-gray-600 font-ahuvi-body max-w-sm mx-auto">
          Cet espace se remplira au fil des prochaines mises à jour de l’application.
        </p>
      </div>
      <ul className="divide-y divide-gray-100">
        {A_VENIR.map(({ icon: Icon, titre, texte }) => (
          <li key={titre} className="flex items-start gap-3 px-4 py-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-rtb-gold/15 text-rtb-green">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-rtb-green font-ahuvi-body">{titre}</span>
                <span className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">Bientôt</span>
              </div>
              <p className="text-sm text-gray-600 mt-0.5">{texte}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
