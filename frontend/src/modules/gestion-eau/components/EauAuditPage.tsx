/**
 * Journal d'audit /gestion-eau/audit (admin) : actions clés (qui / quoi / quand) +
 * journal des scans QR (créé en Phase 3). Deux onglets internes, filtre texte.
 */
import { useEffect, useMemo, useState } from 'react';
import { ScrollText, QrCode, Gauge, User } from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauEmptyState, EauListIcon } from './EauUi';
import { AIDE } from './eauAideTextes';
import EauTabs from './EauTabs';
import { listAudit } from '../services/eauAuditService';
import { listScans } from '../services/eauScanService';
import { listCompteurs } from '../services/eauCompteurService';
import { fmtDate } from '../utils/format';
import type { AuditLocal, ScanLocal, CompteurLocal } from '../types/gestionEau';

const ACTION_LABEL: Record<string, string> = {
  config_modifiee: 'Configuration modifiée',
  factures_generees: 'Factures générées',
  annonce_creee: 'Annonce créée',
  annonce_modifiee: 'Annonce modifiée',
  annonce_supprimee: 'Annonce supprimée',
};

const SCAN_RESULT_LABEL: Record<string, string> = {
  saisie_compteur: 'Saisie compteur',
  fiche_client: 'Fiche client',
  mon_espace: 'Espace client',
  refus_non_destine: 'Refusé (non destiné)',
  code_introuvable: 'Code introuvable',
  redir_mission: 'Page mission',
};

export default function EauAuditPage() {
  const [tab, setTab] = useState<'actions' | 'scans'>('actions');
  const [audit, setAudit] = useState<AuditLocal[]>([]);
  const [scans, setScans] = useState<ScanLocal[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const [a, s, c] = await Promise.all([listAudit(), listScans(), listCompteurs()]);
      setAudit(a);
      setScans(s);
      setCompteurs(c);
      setLoading(false);
    })();
  }, []);

  const compteurNom = (id: string | null) =>
    (id && compteurs.find((c) => c.id === id)?.nom) || id || '—';

  const auditFiltered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return audit;
    return audit.filter(
      (a) =>
        (a.action ?? '').toLowerCase().includes(s) ||
        (a.entite ?? '').toLowerCase().includes(s) ||
        (a.user_id ?? '').toLowerCase().includes(s)
    );
  }, [audit, q]);

  const scansFiltered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return scans;
    return scans.filter(
      (sc) =>
        (sc.code ?? '').toLowerCase().includes(s) ||
        (sc.role ?? '').toLowerCase().includes(s) ||
        (sc.resultat ?? '').toLowerCase().includes(s) ||
        compteurNom(sc.compteur_id).toLowerCase().includes(s)
    );
  }, [scans, q, compteurs]);

  return (
    <div>
      <EauTabs
        active={tab}
        onChange={(k) => setTab(k as 'actions' | 'scans')}
        tabs={[
          { key: 'actions', label: `Actions (${audit.length})`, icon: ScrollText },
          { key: 'scans', label: `Scans QR (${scans.length})`, icon: QrCode },
        ]}
      />
      <EauPageShell title="Journal d'audit" subtitle="Traçabilité des actions et des scans (admin)" aide={AIDE.audit}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrer…"
          className="w-full mb-3 rounded-lg border-gray-300 focus:border-ahuvi-olive focus:ring-ahuvi-olive text-sm"
        />
        {loading ? (
          <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
        ) : tab === 'actions' ? (
          auditFiltered.length === 0 ? (
            <EauEmptyState icon={ScrollText} title="Aucune action journalisée." />
          ) : (
            <div className="space-y-1.5">
              {auditFiltered.map((a) => (
                <div key={a.id} className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-soft flex items-start gap-2.5">
                  <EauListIcon icon={ScrollText} tone="forest" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ahuvi-forest">
                        {ACTION_LABEL[a.action ?? ''] ?? a.action ?? '—'}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(a.timestamp)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {a.entite ?? '—'}
                      {a.user_id ? ` · par ${a.user_id.slice(0, 8)}…` : ''}
                      {a.details ? ` · ${formatDetails(a.details)}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : scansFiltered.length === 0 ? (
          <EauEmptyState icon={QrCode} title="Aucun scan journalisé." />
        ) : (
          <div className="space-y-1.5">
            {scansFiltered.map((s) => (
              <div key={s.id} className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-soft flex items-start gap-2.5">
                <EauListIcon icon={s.type === 'compteur' ? Gauge : User} tone={s.type === 'compteur' ? 'teal' : 'olive'} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ahuvi-forest">
                      {SCAN_RESULT_LABEL[s.resultat ?? ''] ?? s.resultat ?? '—'}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(s.timestamp)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {s.type === 'compteur' ? compteurNom(s.compteur_id) : 'Client'}
                    {s.emplacement ? ` · ${s.emplacement}` : ''}
                    {s.role ? ` · ${s.role}` : ''}
                    {s.code ? ` · ${s.code}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </EauPageShell>
    </div>
  );
}

function formatDetails(details: unknown): string {
  try {
    if (Array.isArray(details)) return details.join(', ');
    if (typeof details === 'object' && details) {
      return Object.entries(details as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    }
    return String(details);
  } catch {
    return '';
  }
}
