/**
 * Page-thème « Suivi » (/gestion-eau/suivi) — releveur/admin.
 * Onglets internes : Anomalies / Bilans (livré) · Tendances (Phase 4).
 */
import { useState } from 'react';
import EauTabs from './EauTabs';
import EauAnomaliesPage from './EauAnomaliesPage';

export default function EauSuiviPage() {
  const [tab, setTab] = useState<'anomalies' | 'tendances'>('anomalies');

  return (
    <div>
      <EauTabs
        active={tab}
        onChange={(k) => setTab(k as 'anomalies' | 'tendances')}
        tabs={[
          { key: 'anomalies', label: 'Anomalies / Bilans' },
          { key: 'tendances', label: 'Tendances', disabled: true, badge: 'bientôt' },
        ]}
      />
      <EauAnomaliesPage />
    </div>
  );
}
