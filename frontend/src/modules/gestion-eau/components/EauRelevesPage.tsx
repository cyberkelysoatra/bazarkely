/**
 * Page-thème « Relevés » (/gestion-eau/releves) — refonte « façon Transactions ».
 *
 * Shell : 2 onglets thématiques (Compteurs · Source) + bouton Scan intégré DANS la page.
 * Aide dépliable + badge lecture seule conservés. Métaphore comptable filée :
 *   - Compteurs : index relevés = « débits » (eau qui sort : KPI, recherche, chips, cartes).
 *   - Source    : crédit + solde — l'eau qui entre (apports ponctuels + tests de débit/pompe)
 *                 et le « Stock d'eau du bassin » (solde). Fusionne les ex-onglets
 *                 Bassin + Apports : carte Stock → carte Bassin → Apports → Tests de débit →
 *                 section admin « Relevés récents ».
 *
 * Deep-links préservés (NE PAS migrer le schéma — `EauDashboard`/`eauInvitationService`
 * émettent toujours `?tab=…&bt=…` ; la page re-route vers les 2 onglets) :
 *   - `?tab=compteur&c=<id>` (scan)     → Compteurs, saisie du compteur ouverte.
 *   - `?tab=elec`                       → Compteurs, saisie ouverte sur la nature « Élec ».
 *   - `?tab=bassin&bt=niveau`           → Source, tiroir « Saisir hauteur » ouvert.
 *   - `?tab=bassin&bt=debit`            → Source, section « Tests de débit » ouverte.
 *   - `?tab=bassin&bt=entree`           → Source, tiroir « Ajouter un apport » ouvert.
 *   - `?tab=apports`                    → Source, tiroir « Ajouter un apport » ouvert.
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Gauge, Droplet, Waves, ScanLine, Plus } from 'lucide-react';
import EauTabs from './EauTabs';
import EauAide from './EauAide';
import { AIDE } from './eauAideTextes';
import EauCompteursReleves from './EauCompteursReleves';
import EauBassinReleves from './EauBassinReleves';
import EauApportsReleves from './EauApportsReleves';
import EauQrScanner from './EauQrScanner';
import { EauReadOnlyBadge } from './EauReadOnly';
import { useGestionEau } from '../context';
import { parseScanText, buildInternalScanPath } from '../utils/scanUrl';
import type { ReleveFacet } from './EauTiroirSaisie';
import toast from 'react-hot-toast';

type TabKey = 'compteurs' | 'source';

/** Onglet initial à partir de la query (deep-links historiques re-routés vers 2 onglets). */
function initialTab(params: URLSearchParams): TabKey {
  if (params.get('c')) return 'compteurs';
  const t = params.get('tab');
  // 'bassin' (niveau/debit/entree) et 'apports' → onglet Source (crédit + solde).
  if (t === 'apports' || t === 'bassin') return 'source';
  // 'compteur', 'compteurs', 'elec', 'tournee', null → onglet Compteurs.
  return 'compteurs';
}

const WRAP = 'max-w-3xl mx-auto px-3';

export default function EauRelevesPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { isReadOnly } = useGestionEau();
  const [tab, setTab] = useState<TabKey>(() => initialTab(params));
  const [preselect, setPreselect] = useState<string | null>(params.get('c'));
  const [preselectFacet, setPreselectFacet] = useState<ReleveFacet | null>(null);
  const [bassinIntent, setBassinIntent] = useState<'niveau' | 'debit' | null>(null);
  const [apportsAutoOpen, setApportsAutoOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Réagit à un nouveau deep-link (sans remonter le composant) : route vers le bon
  // onglet + intention d'ouverture (tiroir/section). Le schéma d'URL reste inchangé.
  useEffect(() => {
    const t = params.get('tab');
    const c = params.get('c');
    const bt = params.get('bt');
    if (c) {
      setTab('compteurs');
      setPreselect(c);
      setPreselectFacet(null);
    } else if (t === 'elec') {
      setTab('compteurs');
      setPreselect(null);
      setPreselectFacet('elec');
    } else if (t === 'bassin') {
      setTab('source');
      if (bt === 'entree') {
        setApportsAutoOpen(true);
      } else if (bt === 'debit') {
        setBassinIntent('debit');
      } else {
        setBassinIntent('niveau');
      }
    } else if (t === 'apports') {
      setTab('source');
      setApportsAutoOpen(true);
    } else if (t) {
      setTab('compteurs');
    }
  }, [params]);

  const changeTab = (k: TabKey) => {
    setTab(k);
    setPreselect(null);
    setPreselectFacet(null);
    setBassinIntent(null);
    setApportsAutoOpen(false);
    // Nettoie la query pour éviter de re-cibler au prochain rendu.
    if (params.get('tab') || params.get('c') || params.get('bt')) setParams({}, { replace: true });
  };

  // Raccourcis bas : basculent d'onglet ET déclenchent l'intention d'ouverture (set après
  // changeTab → dernière écriture gagnante dans le même cycle React).
  const goSaisirBassin = () => {
    changeTab('source');
    setBassinIntent('niveau');
  };
  const goAjouterApport = () => {
    changeTab('source');
    setApportsAutoOpen(true);
  };

  const onScanResult = (text: string) => {
    setScannerOpen(false);
    const parsed = parseScanText(text);
    if (!parsed) {
      toast.error('QR non reconnu.');
      return;
    }
    navigate(buildInternalScanPath(parsed.type, parsed.code));
  };

  return (
    <div>
      {isReadOnly && (
        <div className={`${WRAP} pt-2`}>
          <EauReadOnlyBadge />
        </div>
      )}

      <EauTabs
        active={tab}
        onChange={(k) => changeTab(k as TabKey)}
        tabs={[
          { key: 'compteurs', label: 'Compteurs', icon: Gauge },
          { key: 'source', label: 'Source', icon: Droplet },
        ]}
      />

      {/* L'aide générale « Relevés » couvre l'onglet Compteurs ; Bassin/Apports portent la leur. */}
      {tab === 'compteurs' && (
        <EauAide id={AIDE.releves.id} quoi={AIDE.releves.quoi} comment={AIDE.releves.comment} className={WRAP} />
      )}

      {tab === 'compteurs' && (
        <div className={WRAP}>
          <EauCompteursReleves
            preselect={preselect}
            preselectFacet={preselectFacet}
            onScan={() => setScannerOpen(true)}
            onConsumePreselect={() => {
              setPreselect(null);
              setPreselectFacet(null);
            }}
          />
        </div>
      )}
      {tab === 'source' && (
        <div className={WRAP}>
          <EauBassinReleves
            openIntent={bassinIntent}
            onConsumeIntent={() => setBassinIntent(null)}
            creditsSlot={
              <EauApportsReleves
                autoOpenAdd={apportsAutoOpen}
                onConsumeAutoOpen={() => setApportsAutoOpen(false)}
              />
            }
          />
        </div>
      )}

      {/* Raccourcis (rangée de 3, façon cartes-raccourcis Transactions). */}
      <div className={`${WRAP} mt-5 grid grid-cols-3 gap-2`}>
        <RaccourciButton icon={ScanLine} label="Scanner" onClick={() => setScannerOpen(true)} />
        <RaccourciButton icon={Waves} label="Saisir bassin" onClick={goSaisirBassin} />
        <RaccourciButton icon={Plus} label="Ajouter apport" onClick={goAjouterApport} />
      </div>

      {scannerOpen && <EauQrScanner onResult={onScanResult} onClose={() => setScannerOpen(false)} />}
    </div>
  );
}

/** Bouton-raccourci (icône en pastille + libellé court). */
function RaccourciButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Waves;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-ahuvi-200 bg-white px-2 py-3 text-center hover:bg-ahuvi-50 transition-colors"
    >
      <span className="w-9 h-9 rounded-xl bg-ahuvi-100 text-ahuvi-forest flex items-center justify-center">
        <Icon className="w-4 h-4" aria-hidden="true" />
      </span>
      <span className="text-xs font-medium text-ahuvi-forest leading-tight">{label}</span>
    </button>
  );
}
