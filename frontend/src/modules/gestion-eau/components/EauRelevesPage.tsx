/**
 * Page-thème « Relevés » (/gestion-eau/releves) — releveur/admin.
 * Onglets internes : Compteur · Bassin · Tournée · Scan.
 *  - Tournée : liste ordonnée + progression du jour ; sélectionner ouvre la saisie.
 *  - Scan : scanner caméra → résolution via /gestion-eau/scan.
 * Query : `?tab=compteur&c=<id>` préselectionne un compteur (deep-link depuis un scan).
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Gauge, Waves, Route, ScanLine, Camera } from 'lucide-react';
import EauTabs from './EauTabs';
import { EauIconButton } from './EauUi';
import EauAide from './EauAide';
import { AIDE } from './eauAideTextes';
import EauSaisieBassinPage from './EauSaisieBassinPage';
import EauSaisieCompteurPage from './EauSaisieCompteurPage';
import EauTourneePage from './EauTourneePage';
import EauQrScanner from './EauQrScanner';
import { EauReadOnlyBadge } from './EauReadOnly';
import { useGestionEau } from '../context';
import { parseScanText, buildInternalScanPath } from '../utils/scanUrl';
import toast from 'react-hot-toast';

type TabKey = 'compteur' | 'bassin' | 'tournee' | 'scan';

export default function EauRelevesPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { isReadOnly } = useGestionEau();
  const initialTab = (params.get('tab') as TabKey) || 'compteur';
  const [tab, setTab] = useState<TabKey>(['compteur', 'bassin', 'tournee', 'scan'].includes(initialTab) ? initialTab : 'compteur');
  const [preselect, setPreselect] = useState<string | null>(params.get('c'));
  const [scannerOpen, setScannerOpen] = useState(false);

  // Réagit à un nouveau deep-link (?tab=&c=) sans remonter le composant.
  useEffect(() => {
    const t = params.get('tab') as TabKey | null;
    const c = params.get('c');
    if (t && ['compteur', 'bassin', 'tournee', 'scan'].includes(t)) setTab(t);
    if (c) setPreselect(c);
  }, [params]);

  const changeTab = (k: TabKey) => {
    setTab(k);
    // Nettoie la query pour éviter de re-préselectionner au prochain rendu.
    if (params.get('tab') || params.get('c')) setParams({}, { replace: true });
  };

  const pickCompteur = (compteurId: string) => {
    setPreselect(compteurId);
    setTab('compteur');
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
        <div className="max-w-3xl mx-auto px-3 pt-2">
          <EauReadOnlyBadge />
        </div>
      )}

      <EauTabs
        active={tab}
        onChange={(k) => changeTab(k as TabKey)}
        tabs={[
          { key: 'compteur', label: 'Compteur', icon: Gauge },
          { key: 'bassin', label: 'Bassin', icon: Waves },
          { key: 'tournee', label: 'Tournée', icon: Route },
          { key: 'scan', label: 'Scan', icon: ScanLine },
        ]}
      />

      <EauAide
        id={AIDE.releves.id}
        quoi={AIDE.releves.quoi}
        comment={AIDE.releves.comment}
        className="max-w-3xl mx-auto px-3"
      />

      {tab === 'compteur' && (
        <EauSaisieCompteurPage preselectCompteurId={preselect} onScanRequest={() => setScannerOpen(true)} />
      )}
      {tab === 'bassin' && <EauSaisieBassinPage />}
      {tab === 'tournee' && <EauTourneePage onPick={pickCompteur} />}
      {tab === 'scan' && (
        <div className="max-w-3xl mx-auto px-3">
          <EauAide id={AIDE.scan.id} quoi={AIDE.scan.quoi} comment={AIDE.scan.comment} />
          <div className="rounded-xl border border-ahuvi-200 bg-white p-6 text-center space-y-3 shadow-soft">
            <div className="flex justify-center">
              <span className="w-14 h-14 rounded-2xl bg-cyan-50 text-ahuvi-teal flex items-center justify-center">
                <ScanLine className="w-7 h-7" aria-hidden="true" />
              </span>
            </div>
            <h2 className="font-semibold text-ahuvi-forest">Scanner un QR</h2>
            <p className="text-sm text-gray-500">
              Scannez le QR d’un compteur pour saisir son index directement, ou le QR d’un client pour voir sa fiche.
            </p>
            {!isReadOnly && (
              <EauIconButton icon={Camera} variant="primary" onClick={() => setScannerOpen(true)} className="mx-auto">
                Ouvrir la caméra
              </EauIconButton>
            )}
          </div>
        </div>
      )}

      {scannerOpen && <EauQrScanner onResult={onScanResult} onClose={() => setScannerOpen(false)} />}
    </div>
  );
}
