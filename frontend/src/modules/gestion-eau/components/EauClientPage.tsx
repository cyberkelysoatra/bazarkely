/** Espace client /gestion-eau/client : conso + factures téléchargeables de SES
 *  seuls compteurs assignés (liste + montants en Ariary). Graphique → phase 4. */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, Tooltip, XAxis } from 'recharts';
import { Droplet, Receipt, QrCode, FileDown, Gauge, AlertTriangle, BadgeCheck, CircleAlert, Waves, Zap } from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauIconButton, EauEmptyState, EauListIcon, EAU_CHART } from './EauUi';
import { AIDE } from './eauAideTextes';
import EauTabs from './EauTabs';
import EauClientQrPage from './EauClientQrPage';
import EauProprietaireBassinPage from './EauProprietaireBassinPage';
import { useGestionEau } from '../context/GestionEauContext';
import { getCompteClientForUser } from '../services/eauCompteClientService';
import { getFacturesForCompteurs } from '../services/eauFactureService';
import { listCompteurs } from '../services/eauCompteurService';
import { filterByScope, filterCompteursByScope } from '../utils/eauSimScope';
import { getDernierReleveCompteur, historiqueConsoCompteur } from '../services/eauReleveService';
import { getDernierReleveElec, historiqueConsoElec } from '../services/eauElecReleveService';
import { getConfig } from '../services/eauConfigService';
import { downloadFactureCombineePdf } from '../utils/pdf';
import { fmtMontant, fmtDate, fmtM3, fmtKwh } from '../utils/format';
import type { FactureLocal, CompteurLocal, ConfigLocal } from '../types/gestionEau';

interface CompteurVue {
  compteur: CompteurLocal;
  dernierIndex: number | null;
  dernierReleveDate: string | null;
  consos: { i: number; value: number }[];
  // Électricité (lecture seule) : dernier index kWh + conso récente du même compteur.
  elecDernierIndex: number | null;
  elecDernierDate: string | null;
  elecConsos: { i: number; value: number }[];
}

export default function EauClientPage() {
  const { userId, dataScope } = useGestionEau();
  const navigate = useNavigate();
  // Onglet piloté par l'URL (cohérent avec les 2 boutons du footer : Ma conso / Mes factures).
  const { tab } = useParams<{ tab?: string }>();
  const active =
    tab === 'factures' ? 'factures' : tab === 'qr' ? 'qr' : tab === 'bassin' ? 'bassin' : 'conso';
  const [loading, setLoading] = useState(true);
  const [vues, setVues] = useState<CompteurVue[]>([]);
  const [factures, setFactures] = useState<FactureLocal[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [config, setConfig] = useState<ConfigLocal | null>(null);
  const [aucunCompteur, setAucunCompteur] = useState(false);

  useEffect(() => {
    (async () => {
      // En simulation « Propriétaire » (dataScope non-null), le périmètre vient de la
      // villa choisie par l'admin — PAS du compte client de l'admin (qui n'en a pas).
      // Sinon, périmètre = compteurs du compte client de l'utilisateur réel.
      if (!userId && !dataScope) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setAucunCompteur(false);
      try {
        setConfig(await getConfig());

        let ids: string[];
        if (dataScope) {
          ids = dataScope.compteurIds;
        } else {
          const compte = userId ? await getCompteClientForUser(userId) : null;
          ids = compte?.compteur_ids ?? [];
          if (!compte) {
            setAucunCompteur(true);
            return;
          }
        }

        if (ids.length === 0) {
          setAucunCompteur(true);
          return;
        }

        const scope = { compteurIds: ids };
        const allCompteurs = await listCompteurs();
        // Re-filtrage à la villa (défense en profondeur : jamais un compteur hors périmètre).
        const mine = filterCompteursByScope(allCompteurs, scope);
        setCompteurs(mine);

        // Lectures Dexie parallélisées : par compteur (4 lectures en // ) ET sur tous
        // les compteurs (// ) — au lieu d'une cascade séquentielle (D-3).
        const vuesData: CompteurVue[] = await Promise.all(
          mine.map(async (c) => {
            const [dernier, hist, elecDernier, elecHist] = await Promise.all([
              getDernierReleveCompteur(c.id),
              historiqueConsoCompteur(c.id),
              getDernierReleveElec(c.id),
              historiqueConsoElec(c.id),
            ]);
            return {
              compteur: c,
              dernierIndex: dernier?.index ?? null,
              dernierReleveDate: dernier?.timestamp ?? null,
              consos: hist.slice(-12).map((value, i) => ({ i: i + 1, value })),
              elecDernierIndex: elecDernier?.index ?? null,
              elecDernierDate: elecDernier?.timestamp ?? null,
              elecConsos: elecHist.slice(-12).map((value, i) => ({ i: i + 1, value })),
            };
          })
        );
        setVues(vuesData);
        // Factures scopées par compteur (le service filtre déjà sur `ids` ; le helper
        // garantit qu'aucune facture hors périmètre ne subsiste).
        const facturesAll = await getFacturesForCompteurs(ids);
        setFactures(filterByScope(facturesAll, (f) => f.compteur_id, scope));
      } catch (e) {
        console.warn('⚠️ [EauClient] chargement échoué:', (e as any)?.message);
      } finally {
        setLoading(false);
      }
    })();
    // Re-scoper quand la villa simulée change (dataScope) ou l'utilisateur réel.
  }, [userId, dataScope?.compteurIds.join(',')]);

  const compteurNom = (id: string | null) =>
    (id && compteurs.find((c) => c.id === id)?.nom) || id || '—';

  const exportPdf = async (f: FactureLocal) => {
    try {
      await downloadFactureCombineePdf({
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
              : k === 'bassin'
              ? '/gestion-eau/client/bassin'
              : '/gestion-eau/client'
          )
        }
        tabs={[
          { key: 'conso', label: 'Ma conso', icon: Droplet },
          { key: 'bassin', label: 'Le bassin', icon: Waves },
          { key: 'factures', label: 'Mes factures', icon: Receipt },
          { key: 'qr', label: 'Mon QR', icon: QrCode },
        ]}
      />
      <EauPageShell
        title={
          active === 'factures'
            ? 'Mes factures'
            : active === 'qr'
            ? 'Mon QR'
            : active === 'bassin'
            ? 'Situation du bassin'
            : 'Ma consommation'
        }
        subtitle={active === 'bassin' ? 'Espace propriétaire' : 'Espace propriétaire'}
        aide={active === 'bassin' ? AIDE.proprietaireBassin : AIDE.client}
      >
      {active === 'bassin' ? (
        <EauProprietaireBassinPage />
      ) : active === 'qr' ? (
        <EauClientQrPage userId={userId} />
      ) : loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : aucunCompteur ? (
        <EauEmptyState
          icon={AlertTriangle}
          title="Aucun compteur associé à votre compte"
          hint="Contactez l’administrateur pour rattacher un compteur."
        />
      ) : (
        <div className="space-y-4">
          {/* Compteurs (onglet « Ma conso ») */}
          {active === 'conso' && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Mes compteurs</h2>
            <div className="grid grid-cols-1 gap-2">
              {vues.map((v) => (
                <div key={v.compteur.id} className="bg-white border border-ahuvi-100 rounded-lg p-3 shadow-soft">
                  <div className="flex items-center gap-2">
                    <EauListIcon icon={Gauge} tone="teal" />
                    <div className="font-medium text-gray-900">{v.compteur.nom}</div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
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
                          <Bar dataKey="value" fill={EAU_CHART.olive} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-400">Historique disponible après plusieurs relevés.</div>
                  )}

                  {/* Électricité (lecture seule) : dernier index kWh + conso récente. */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-ahuvi-olive mb-1">
                      <Zap className="w-4 h-4" aria-hidden="true" /> Électricité
                    </div>
                    {v.elecDernierIndex == null ? (
                      <div className="text-xs text-gray-400">Aucun relevé électrique pour l’instant.</div>
                    ) : (
                      <>
                        <div className="text-sm text-gray-600">
                          Dernier index : <strong>{v.elecDernierIndex}</strong> kWh
                          {v.elecDernierDate && (
                            <span className="text-xs text-gray-400"> · relevé du {fmtDate(v.elecDernierDate)}</span>
                          )}
                        </div>
                        {v.elecConsos.length > 0 ? (
                          <div className="mt-2">
                            <div className="text-xs text-gray-400 mb-1">Historique de consommation (kWh)</div>
                            <ResponsiveContainer width="100%" height={80}>
                              <BarChart data={v.elecConsos}>
                                <XAxis dataKey="i" hide />
                                <Tooltip formatter={(val: number) => fmtKwh(val)} labelFormatter={() => ''} />
                                <Bar dataKey="value" fill={EAU_CHART.elec} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-gray-400">Historique disponible après plusieurs relevés.</div>
                        )}
                      </>
                    )}
                  </div>
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
              <EauEmptyState icon={Receipt} title="Aucune facture pour l’instant" />
            ) : (
              <div className="space-y-2">
                {factures.map((f) => (
                  <div key={f.id} className="bg-white border border-ahuvi-100 rounded-lg p-3 shadow-soft flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <EauListIcon icon={Receipt} tone="olive" />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">{f.numero}</div>
                        <div className="text-xs text-gray-500">
                          {compteurNom(f.compteur_id)} · {fmtDate(f.periode_start)} → {fmtDate(f.periode_end)}
                        </div>
                        <div className="text-sm mt-0.5">
                          <strong>{fmtMontant(f.montant, f.devise)}</strong>
                          <span className={`ml-2 inline-flex items-center gap-1 text-xs font-semibold ${
                            f.statut === 'paye' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {f.statut === 'paye'
                              ? <><BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> Payée</>
                              : <><CircleAlert className="w-3.5 h-3.5" aria-hidden="true" /> Impayée</>}
                          </span>
                        </div>
                      </div>
                    </div>
                    <EauIconButton icon={FileDown} variant="ghost" onClick={() => exportPdf(f)} className="flex-shrink-0">
                      PDF
                    </EauIconButton>
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
