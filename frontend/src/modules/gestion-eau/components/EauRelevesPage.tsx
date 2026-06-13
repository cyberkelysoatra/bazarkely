/**
 * Page-thème « Relevés » (/gestion-eau/releves) — refonte « façon Transactions » (Phase 1).
 *
 * Shell : 3 onglets thématiques (Compteurs · Bassin · Apports) + bouton Scan intégré DANS
 * la page (pas dans le header partagé). Aide dépliable + badge lecture seule conservés.
 *  - Compteurs : KPI + recherche + chips de période + cartes-compteur à tiroirs (cœur livré).
 *  - Bassin    : écran de saisie existant (EauSaisieBassinPage) — conservé fonctionnel pour ne
 *                PAS casser les deep-links `?tab=bassin&bt=…` (cartes bassin du tableau de bord
 *                + atterrissage d'invitation admin/releveur). Son habillage « façon Transactions »
 *                arrive en Phase 2.
 *  - Apports   : coquille « bientôt » (Phase 2 — réellement nouveau, aucun flux existant).
 * Query : `?tab=compteur&c=<id>` (deep-link d'un scan) préselectionne un compteur et ouvre
 * directement sa saisie. Le scanner caméra reste in-page (EauQrScanner + parseScanText).
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Gauge, Waves, Sprout, ScanLine, Plus } from 'lucide-react';
import EauTabs from './EauTabs';
import EauAide from './EauAide';
import { AIDE } from './eauAideTextes';
import EauCompteursReleves from './EauCompteursReleves';
import EauSaisieBassinPage from './EauSaisieBassinPage';
import EauQrScanner from './EauQrScanner';
import { EauEmptyState } from './EauUi';
import { EauReadOnlyBadge } from './EauReadOnly';
import { useGestionEau } from '../context';
import { parseScanText, buildInternalScanPath } from '../utils/scanUrl';
import toast from 'react-hot-toast';

type TabKey = 'compteurs' | 'bassin' | 'apports';

/** Normalise le paramètre `tab` (deep-links historiques compteur/elec → onglet Compteurs). */
function normalizeTab(raw: string | null): TabKey {
  if (raw === 'bassin') return 'bassin';
  if (raw === 'apports') return 'apports';
  // 'compteur', 'compteurs', 'elec', 'tournee', null → onglet Compteurs.
  return 'compteurs';
}

const WRAP = 'max-w-3xl mx-auto px-3';

export default function EauRelevesPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { isReadOnly } = useGestionEau();
  const [tab, setTab] = useState<TabKey>(() => normalizeTab(params.get('tab')));
  const [preselect, setPreselect] = useState<string | null>(params.get('c'));
  const [scannerOpen, setScannerOpen] = useState(false);

  // Réagit à un nouveau deep-link (?tab=&c=) sans remonter le composant.
  useEffect(() => {
    const t = params.get('tab');
    const c = params.get('c');
    if (c) {
      setTab('compteurs');
      setPreselect(c);
    } else if (t) {
      setTab(normalizeTab(t));
    }
  }, [params]);

  const changeTab = (k: TabKey) => {
    setTab(k);
    // Nettoie la query pour éviter de re-préselectionner / re-cibler au prochain rendu.
    if (params.get('tab') || params.get('c')) setParams({}, { replace: true });
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
          { key: 'bassin', label: 'Bassin', icon: Waves },
          { key: 'apports', label: 'Apports', icon: Sprout, disabled: true, badge: 'bientôt' },
        ]}
      />

      {/* Bouton Scan intégré à la page (hors header partagé), en haut à droite du contenu. */}
      <div className={`${WRAP} flex justify-end -mt-1 mb-1`}>
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ahuvi-teal text-white text-sm font-medium shadow-soft hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-300"
        >
          <ScanLine className="w-4 h-4" aria-hidden="true" /> Scan
        </button>
      </div>

      <EauAide id={AIDE.releves.id} quoi={AIDE.releves.quoi} comment={AIDE.releves.comment} className={WRAP} />

      {tab === 'compteurs' && (
        <div className={WRAP}>
          <EauCompteursReleves preselect={preselect} onConsumePreselect={() => setPreselect(null)} />
        </div>
      )}
      {/* EauSaisieBassinPage porte son propre EauPageShell (max-w + padding) → pas de wrapper ici. */}
      {tab === 'bassin' && <EauSaisieBassinPage />}
      {tab === 'apports' && (
        <div className={WRAP}>
          <EauEmptyState
            icon={Sprout}
            title="Apports — bientôt"
            hint="La saisie des apports d'eau (entrées du bassin) façon Transactions arrive en Phase 2."
          />
        </div>
      )}

      {/* Raccourcis (rangée de 3, façon cartes-raccourcis Transactions). */}
      <div className={`${WRAP} mt-5 grid grid-cols-3 gap-2`}>
        <RaccourciButton icon={ScanLine} label="Scanner" onClick={() => setScannerOpen(true)} />
        <RaccourciButton icon={Waves} label="Saisir bassin" onClick={() => changeTab('bassin')} />
        <RaccourciButton icon={Plus} label="Ajouter apport" onClick={() => changeTab('apports')} />
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
