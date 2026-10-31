/**
 * Tableau de bord du domaine Électricité (ELEC-CC-01, phase 0) : écran d'attente.
 *
 * Charte RTB Énergie (titres `rtb-green`, accent `rtb-gold`). Aucune donnée d'eau.
 * Les écrans électricité (relevés, factures, paiements) arrivent aux phases suivantes ;
 * l'admin voit un rappel du nombre de personnes ayant un rôle électricité.
 */
import { useEffect, useState } from 'react';
import { Gauge, Receipt, Wallet, Zap, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import EauPageShell from './EauPageShell';
import { useGestionEau } from '../context/GestionEauContext';
import { listRoles } from '../services/eauRoleService';

const A_VENIR = [
  { icon: Gauge, titre: 'Relevés', texte: 'Saisir les index des compteurs d’électricité, tournée par tournée.' },
  { icon: Receipt, titre: 'Factures', texte: 'Préparer, valider et envoyer les factures RTB Énergie.' },
  { icon: Wallet, titre: 'Paiements', texte: 'Enregistrer les encaissements et relancer les retards.' },
];

export default function EauElecHomePage() {
  const { roles, realRoles, isSimulating, domaines } = useGestionEau();
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

  return (
    <EauPageShell
      title="Électricité"
      subtitle="Tableau de bord RTB Énergie"
      tone="elec"
      aide={{
        id: 'elec-home',
        quoi: (
          <>
            C’est l’espace de l’électricité fournie par RTB Énergie (centrale solaire du
            domaine).
            {/* Rappel de la séparation seulement pour qui a aussi l'eau (ELEC-CC-01). */}
            {domaines.eau && (
              <> Il est séparé de l’eau : on n’y voit jamais les compteurs ni les factures d’eau.</>
            )}
          </>
        ),
        comment: (
          <>
            Les écrans arrivent bientôt : relevés des compteurs, factures et paiements.
            Pour l’instant, il n’y a rien à faire ici.
            {realRoles.admin && !isSimulating && (
              <> L’administrateur donne les rôles électricité dans « Utilisateurs &amp; rôles ».</>
            )}
          </>
        ),
      }}
    >
      <section
        className="rounded-2xl border border-rtb-gold/40 bg-white shadow-soft overflow-hidden"
        aria-labelledby="elec-attente-titre"
        data-elec-home
      >
        <div className="px-4 pt-5 pb-4 text-center bg-gradient-to-b from-rtb-gold/15 to-white">
          <span className="inline-flex w-14 h-14 rounded-2xl items-center justify-center bg-rtb-green text-rtb-gold shadow-md">
            <Zap className="w-7 h-7" aria-hidden="true" />
          </span>
          <h3 id="elec-attente-titre" className="mt-3 text-base font-semibold text-rtb-green font-ahuvi-body">
            Les écrans de l’électricité arrivent
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
                  <span className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                    Bientôt
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{texte}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

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
