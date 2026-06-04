/**
 * Page-thème « Relevés » (/gestion-eau/releves) — releveur/admin.
 * Regroupe les saisies via des onglets internes : Bassin · Compteur (+ Tournée / Scan = Phase 3).
 * La nav principale (footer + nav desktop) ne porte qu'un bouton « Relevés ».
 */
import { useState } from 'react';
import EauTabs from './EauTabs';
import EauSaisieBassinPage from './EauSaisieBassinPage';
import EauSaisieCompteurPage from './EauSaisieCompteurPage';

export default function EauRelevesPage() {
  const [tab, setTab] = useState<'bassin' | 'compteur'>('compteur');

  return (
    <div>
      <EauTabs
        active={tab}
        onChange={(k) => setTab(k as 'bassin' | 'compteur')}
        tabs={[
          { key: 'compteur', label: 'Compteur' },
          { key: 'bassin', label: 'Bassin' },
          { key: 'tournee', label: 'Tournée', disabled: true, badge: 'bientôt' },
          { key: 'scan', label: 'Scan', disabled: true, badge: 'bientôt' },
        ]}
      />
      {tab === 'compteur' ? <EauSaisieCompteurPage /> : <EauSaisieBassinPage />}
    </div>
  );
}
