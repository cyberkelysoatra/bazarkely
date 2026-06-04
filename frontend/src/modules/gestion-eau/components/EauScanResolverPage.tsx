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
        <div className="text-4xl">❓</div>
        <h1 className="text-lg font-semibold text-gray-800">QR non reconnu</h1>
        <p className="text-sm text-gray-500">Ce lien de scan est invalide ou incomplet.</p>
        <button onClick={() => navigate('/gestion-eau')} className="text-ahuvi-forest hover:underline text-sm">
          Retour au module
        </button>
      </Centered>
    );
  }

  if (!outcome) return <Spinner />;

  switch (outcome.kind) {
    case 'refus':
      return (
        <Centered>
          <div className="text-4xl">🚫</div>
          <h1 className="text-lg font-semibold text-gray-800">Ce QR ne vous est pas destiné</h1>
          <p className="text-sm text-gray-500">Vous n’êtes pas autorisé à accéder à ce contenu.</p>
          <button onClick={() => navigate('/gestion-eau/client')} className="text-ahuvi-forest hover:underline text-sm">
            Aller à mon espace
          </button>
        </Centered>
      );
    case 'introuvable':
      return (
        <Centered>
          <div className="text-4xl">🔍</div>
          <h1 className="text-lg font-semibold text-gray-800">QR inconnu</h1>
          <p className="text-sm text-gray-500">
            Ce {outcome.type === 'client' ? 'QR client' : 'QR compteur'} n’existe pas (ou pas encore synchronisé).
          </p>
          <button onClick={() => navigate('/gestion-eau')} className="text-ahuvi-forest hover:underline text-sm">
            Retour au module
          </button>
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
      <div className="text-center">
        <div className="text-3xl">👤</div>
        <h1 className="text-lg font-semibold text-gray-900">{nom}</h1>
        <p className="text-sm text-gray-500">Fiche consommation (vue agent)</p>
      </div>
      {loading ? (
        <div className="text-gray-400 text-sm py-6 text-center">Chargement…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-xl font-bold text-ahuvi-forest">{facturesCount}</div>
              <div className="text-xs text-gray-500">Factures</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className={`text-xl font-bold ${impayes > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{impayes}</div>
              <div className="text-xs text-gray-500">Impayées</div>
            </div>
          </div>
          <div className="space-y-1">
            {rows.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-4">Aucun compteur associé.</div>
            ) : (
              rows.map((r) => (
                <div key={r.compteur.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="font-medium text-gray-900">{r.compteur.nom}</div>
                  <div className="text-sm text-gray-600">
                    Dernier index : <strong>{r.index ?? '—'}</strong>
                    {r.date && <span className="text-xs text-gray-400"> · {fmtDate(r.date)}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
      <button onClick={() => navigate('/gestion-eau')} className="w-full text-ahuvi-forest hover:underline text-sm">
        Retour au module
      </button>
    </div>
  );
}
