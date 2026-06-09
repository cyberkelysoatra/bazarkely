/**
 * Résolveur de scan — route /gestion-eau/scan?t=<c|cl>&k=<code> (PUBLIQUE).
 * Lit le code, applique la matrice d'accès selon le rôle (cf. eauScanService.resolveScan),
 * JOURNALISE le scan, puis redirige / affiche :
 *   - releveur/admin + QR compteur → saisie d'index directe (onglet Compteur préselectionné)
 *   - releveur/admin + QR client   → fiche conso du client (rendue ici)
 *   - client + son QR              → son espace ; un autre → « Ce QR ne vous est pas destiné »
 *   - non connecté / sans rôle     → page mission
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SearchX, Ban, User, FileText, Gauge, ChevronLeft } from 'lucide-react';
import { EauEmptyState, EauIconButton, EauStatCard, EauListIcon } from './EauUi';
import { useGestionEau } from '../context/GestionEauContext';
import { resolveAndLog, type ScanOutcome } from '../services/eauScanService';
import { parseScanQuery } from '../utils/scanUrl';
import { getCompteClient } from '../services/eauCompteClientService';
import { listCompteurs } from '../services/eauCompteurService';
import { getDernierReleveCompteur } from '../services/eauReleveService';
import { getFacturesForCompteurs } from '../services/eauFactureService';
import { fmtDate } from '../utils/format';
import type { CompteurLocal } from '../types/gestionEau';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ahuvi-forest" />
  </div>
);

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center p-6">
    <div className="max-w-md w-full text-center space-y-4">{children}</div>
  </div>
);

export default function EauScanResolverPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { roles, userId, isLoading } = useGestionEau();
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const ranRef = useRef(false);

  const scan = parseScanQuery(params.get('t'), params.get('k'));

  useEffect(() => {
    if (isLoading || ranRef.current) return;
    ranRef.current = true;
    (async () => {
      if (!scan) {
        setOutcome(null);
        return;
      }
      const res = await resolveAndLog({ type: scan.type, code: scan.code, roles, userId });
      setOutcome(res);
      // Redirections (navigation) pour les issues qui ouvrent un autre écran.
      if (res.kind === 'saisie-compteur') {
        navigate(`/gestion-eau/releves?tab=compteur&c=${encodeURIComponent(res.compteurId)}`, { replace: true });
      } else if (res.kind === 'mon-espace') {
        navigate('/gestion-eau/client', { replace: true });
      } else if (res.kind === 'mission') {
        navigate('/gestion-eau/accueil', { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (isLoading) return <Spinner />;

  if (!scan) {
    return (
      <Centered>
        <EauEmptyState
          icon={SearchX}
          title="QR non reconnu"
          hint="Ce lien de scan est invalide ou incomplet."
          action={
            <EauIconButton icon={ChevronLeft} variant="ghost" onClick={() => navigate('/gestion-eau')}>
              Retour au module
            </EauIconButton>
          }
        />
      </Centered>
    );
  }

  if (!outcome) return <Spinner />;

  switch (outcome.kind) {
    case 'refus':
      return (
        <Centered>
          <EauEmptyState
            icon={Ban}
            title="Ce QR ne vous est pas destiné"
            hint="Vous n’êtes pas autorisé à accéder à ce contenu."
            action={
              <EauIconButton icon={User} variant="secondary" onClick={() => navigate('/gestion-eau/client')}>
                Aller à mon espace
              </EauIconButton>
            }
          />
        </Centered>
      );
    case 'introuvable':
      return (
        <Centered>
          <EauEmptyState
            icon={SearchX}
            title="QR inconnu"
            hint={`Ce ${outcome.type === 'client' ? 'QR propriétaire' : 'QR compteur'} n’existe pas (ou pas encore synchronisé).`}
            action={
              <EauIconButton icon={ChevronLeft} variant="ghost" onClick={() => navigate('/gestion-eau')}>
                Retour au module
              </EauIconButton>
            }
          />
        </Centered>
      );
    case 'fiche-client':
      return <FicheClient clientId={outcome.clientId} nom={outcome.clientNom} />;
    // saisie-compteur / mon-espace / mission → redirigés dans l'effet ci-dessus.
    default:
      return <Spinner />;
  }
}

/** Fiche conso lecture seule d'un client (vue releveur/admin après scan du QR client). */
function FicheClient({ clientId, nom }: { clientId: string; nom: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Array<{ compteur: CompteurLocal; index: number | null; date: string | null }>>([]);
  const [facturesCount, setFacturesCount] = useState(0);
  const [impayes, setImpayes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const compte = await getCompteClient(clientId);
      const ids = compte?.compteur_ids ?? [];
      const all = await listCompteurs();
      const mine = all.filter((c) => ids.includes(c.id));
      const data = [];
      for (const c of mine) {
        const d = await getDernierReleveCompteur(c.id);
        data.push({ compteur: c, index: d?.index ?? null, date: d?.timestamp ?? null });
      }
      setRows(data);
      const factures = await getFacturesForCompteurs(ids);
      setFacturesCount(factures.length);
      setImpayes(factures.filter((f) => f.statut === 'impaye').length);
      setLoading(false);
    })();
  }, [clientId]);

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <div className="flex flex-col items-center text-center">
        <EauListIcon icon={User} tone="forest" />
        <h1 className="text-lg font-semibold text-gray-900 mt-2">{nom}</h1>
        <p className="text-sm text-gray-500">Fiche consommation (vue agent)</p>
      </div>
      {loading ? (
        <div className="text-gray-400 text-sm py-6 text-center">Chargement…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <EauStatCard icon={FileText} label="Factures" value={facturesCount} tone="forest" />
            <EauStatCard icon={FileText} label="Impayées" value={impayes} tone={impayes > 0 ? 'rose' : 'emerald'} />
          </div>
          <div className="space-y-1">
            {rows.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-4">Aucun compteur associé.</div>
            ) : (
              rows.map((r) => (
                <div key={r.compteur.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3">
                  <EauListIcon icon={Gauge} tone="teal" />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">{r.compteur.nom}</div>
                    <div className="text-sm text-gray-600">
                      Dernier index : <strong>{r.index ?? '—'}</strong>
                      {r.date && <span className="text-xs text-gray-400"> · {fmtDate(r.date)}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
      <EauIconButton icon={ChevronLeft} variant="ghost" onClick={() => navigate('/gestion-eau')} className="w-full">
        Retour au module
      </EauIconButton>
    </div>
  );
}
