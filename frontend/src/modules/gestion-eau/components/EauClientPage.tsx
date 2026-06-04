/** Espace client /gestion-eau/client : conso + factures téléchargeables de SES
 *  seuls compteurs assignés (liste + montants en Ariary). Graphique → phase 4. */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, Tooltip, XAxis } from 'recharts';
import EauPageShell from './EauPageShell';
import EauTabs from './EauTabs';
import EauClientQrPage from './EauClientQrPage';
import { useGestionEau } from '../context/GestionEauContext';
import { getCompteClientForUser } from '../services/eauCompteClientService';
import { getFacturesForCompteurs } from '../services/eauFactureService';
import { listCompteurs } from '../services/eauCompteurService';
import { getDernierReleveCompteur, historiqueConsoCompteur } from '../services/eauReleveService';
import { getConfig } from '../services/eauConfigService';
import { downloadFacturePdf } from '../utils/pdf';
import { fmtMontant, fmtDate, fmtM3 } from '../utils/format';
import type { FactureLocal, CompteurLocal, ConfigLocal } from '../types/gestionEau';

interface CompteurVue {
  compteur: CompteurLocal;
  dernierIndex: number | null;
  dernierReleveDate: string | null;
  consos: { i: number; value: number }[];
}

export default function EauClientPage() {
  const { userId } = useGestionEau();
  const navigate = useNavigate();
  // Onglet piloté par l'URL (cohérent avec les 2 boutons du footer : Ma conso / Mes factures).
  const { tab } = useParams<{ tab?: string }>();
  const active = tab === 'factures' ? 'factures' : tab === 'qr' ? 'qr' : 'conso';
  const [loading, setLoading] = useState(true);
  const [vues, setVues] = useState<CompteurVue[]>([]);
  const [factures, setFactures] = useState<FactureLocal[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [config, setConfig] = useState<ConfigLocal | null>(null);
  const [aucunCompteur, setAucunCompteur] = useState(false);

  useEffect(() => {
    (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      const compte = await getCompteClientForUser(userId);
      const ids = compte?.compteur_ids ?? [];
      setConfig(await getConfig());

      if (!compte || ids.length === 0) {
        setAucunCompteur(true);
        setLoading(false);
        return;
      }

      const allCompteurs = await listCompteurs();
      const mine = allCompteurs.filter((c) => ids.includes(c.id));
      setCompteurs(mine);

      const vuesData: CompteurVue[] = [];
      for (const c of mine) {
        const dernier = await getDernierReleveCompteur(c.id);
        const hist = await historiqueConsoCompteur(c.id);
        vuesData.push({
          compteur: c,
          dernierIndex: dernier?.index ?? null,
          dernierReleveDate: dernier?.timestamp ?? null,
          consos: hist.slice(-12).map((value, i) => ({ i: i + 1, value })),
        });
      }
      setVues(vuesData);
      setFactures(await getFacturesForCompteurs(ids));
      setLoading(false);
    })();
  }, [userId]);

  const compteurNom = (id: string | null) =>
    (id && compteurs.find((c) => c.id === id)?.nom) || id || '—';

  const exportPdf = async (f: FactureLocal) => {
    try {
      await downloadFacturePdf({
        facture: f,
        config,
        compteur: compteurs.find((c) => c.id === f.compteur_id) ?? null,
      });
    } catch {
      toast.error('Échec de la génération PDF');
    }
  };

  return (
    <div>
      {/* Onglets internes = 2 boutons du footer client (Ma conso / Mes factures) + QR (Phase 3). */}
      <EauTabs
        active={active}
        onChange={(k) =>
          navigate(
            k === 'factures'
              ? '/gestion-eau/client/factures'
              : k === 'qr'
              ? '/gestion-eau/client/qr'
              : '/gestion-eau/client'
          )
        }
        tabs={[
          { key: 'conso', label: 'Ma conso' },
          { key: 'factures', label: 'Mes factures' },
          { key: 'qr', label: 'Mon QR' },
        ]}
      />
      <EauPageShell
        title={active === 'factures' ? 'Mes factures' : active === 'qr' ? 'Mon QR' : 'Ma consommation'}
        subtitle="Espace client"
      >
      {active === 'qr' ? (
        <EauClientQrPage userId={userId} />
      ) : loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : aucunCompteur ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Aucun compteur associé à votre compte. Contactez l’administrateur.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Compteurs (onglet « Ma conso ») */}
          {active === 'conso' && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Mes compteurs</h2>
            <div className="grid grid-cols-1 gap-2">
              {vues.map((v) => (
                <div key={v.compteur.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-soft">
                  <div className="font-medium text-gray-900">{v.compteur.nom}</div>
                  <div className="text-sm text-gray-600">
                    Dernier index : <strong>{v.dernierIndex ?? '—'}</strong>
                    {v.dernierReleveDate && (
                      <span className="text-xs text-gray-400"> · relevé du {fmtDate(v.dernierReleveDate)}</span>
                    )}
                  </div>
                  {/* Historique de consommation (12 derniers relevés). */}
                  {v.consos.length > 0 ? (
                    <div className="mt-2">
                      <div className="text-xs text-gray-400 mb-1">Historique de consommation</div>
                      <ResponsiveContainer width="100%" height={80}>
                        <BarChart data={v.consos}>
                          <XAxis dataKey="i" hide />
                          <Tooltip formatter={(val: number) => fmtM3(val)} labelFormatter={() => ''} />
                          <Bar dataKey="value" fill="#4C6D40" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-400">Historique disponible après plusieurs relevés.</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Factures (onglet « Mes factures ») */}
          {active === 'factures' && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Mes factures ({factures.length})</h2>
            {factures.length === 0 ? (
              <div className="text-gray-400 text-sm py-6 text-center">Aucune facture pour l’instant.</div>
            ) : (
              <div className="space-y-2">
                {factures.map((f) => (
                  <div key={f.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-soft flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{f.numero}</div>
                      <div className="text-xs text-gray-500">
                        {compteurNom(f.compteur_id)} · {fmtDate(f.periode_start)} → {fmtDate(f.periode_end)}
                      </div>
                      <div className="text-sm mt-0.5">
                        <strong>{fmtMontant(f.montant, f.devise)}</strong>
                        <span className={`ml-2 text-xs font-semibold ${
                          f.statut === 'paye' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {f.statut === 'paye' ? 'Payée' : 'Impayée'}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => exportPdf(f)} className="text-sky-600 hover:underline text-sm flex-shrink-0">
                      📄 PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      )}
      </EauPageShell>
    </div>
  );
}
