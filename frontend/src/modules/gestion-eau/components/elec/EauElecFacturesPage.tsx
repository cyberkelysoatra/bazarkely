/**
 * Factures RTB Énergie /gestion-eau/elec/factures (ELEC-CC-03), sans document (PDF : phase 2b).
 *  - Gestion : préparer le cycle (hors ligne), émettre, re-dater, soumettre aux gérants,
 *    répondre aux remarques, clore la validation, marquer envoyée, effacer l'essai.
 *  - Valideur : avis Bon ou Remarque sur les factures à valider, rien d'autre.
 *  - Lecture et promoteur : tout voir, rien modifier.
 * Les actions serveur exigent le réseau ; les brouillons se préparent sans réseau.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Receipt, Calculator, Send, Stamp, CheckCircle2, MessageSquareWarning, Trash2, CalendarClock,
  FileSpreadsheet, ShieldCheck, Eraser, RotateCcw, ChevronDown, CloudUpload, AlertTriangle, ThumbsUp, Save,
} from 'lucide-react';
import EauPageShell from '../EauPageShell';
import { ElecBouton, ElecVide, LectureSeule, Pastille, Tiroir, champCls, useDonneesElec } from './ElecUi';
import { useGestionEau, EAU_FACTURES_EVENT } from '../../context/GestionEauContext';
import { useEauOnline } from '../../utils/online';
import { downloadCsv, toCsv } from '../../utils/csv';
import { showConfirm } from '../../../../utils/dialogUtils';
import { cycleParDefaut, deMois, fmtDateMg, fmtIndex, libelleMois, moisPrecedent, moisSuivant } from '../../utils/elecReleves';
import {
  COLONNES_CSV,
  STATUT_FACTURE_LIBELLE,
  ajouterJours,
  aujourdhuiMg,
  compteurActif,
  comparerFactures,
  dateFr,
  estVerrouillee,
  libelleAvis,
  lignesCsvCycle,
  preparerFacturesCycle,
  prochainsNumeros,
  resumeAvis,
} from '../../utils/elecFacture';
import {
  avecLignes,
  cloreValidation,
  donnerAvis,
  effacerEssai,
  emettreCycle,
  emettreFacture,
  lireFactures,
  marquerEnvoyee,
  modifierPeriode,
  preparerCycle,
  redaterFacture,
  repondreRemarque,
  soumettreCycle,
  supprimerBrouillon,
  type DonneesFactures,
} from '../../services/eauElecFactureService';
import { listRoles } from '../../services/eauRoleService';
import type {
  ElecClientLocal,
  ElecFactureLigneLocal,
  ElecFactureLocal,
  ElecFactureStatut,
  ElecValidationLocal,
} from '../../types/gestionEau';

const RESEAU = 'disponible avec le réseau';

const fmtAr = (v: number | null | undefined, dec = 0) =>
  v == null ? '-' : `${v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })} Ar`;
const fmtKwh = (v: number | null | undefined) =>
  v == null ? '-' : `${v.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} kWh`;

function notifierFactures() {
  window.dispatchEvent(new Event(EAU_FACTURES_EVENT));
}

export default function EauElecFacturesPage() {
  const donnees = useDonneesElec();
  const { chargement, clients, compteurs, releves, reglages, droits } = donnees;
  const { userId } = useGestionEau();
  const online = useEauOnline();
  const gestion = droits.gestion;
  const valideur = droits.validation && !gestion;
  const lectureSeule = !gestion && !droits.validation;

  const defaut = cycleParDefaut();
  const choix = useMemo(() => {
    const out: string[] = [moisSuivant(defaut)];
    let m = defaut;
    for (let i = 0; i < 12; i++) {
      out.push(m);
      m = moisPrecedent(m);
    }
    return out;
  }, [defaut]);
  const [cycle, setCycle] = useState(defaut);
  const [fact, setFact] = useState<DonneesFactures>({ factures: [], lignes: new Map(), avis: new Map() });
  const [nbValideurs, setNbValideurs] = useState(0);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dateLimite, setDateLimite] = useState(() => ajouterJours(aujourdhuiMg(), 3));
  const [soumettreOuvert, setSoumettreOuvert] = useState(false);

  const relire = useCallback(async () => {
    setFact(await lireFactures());
    const roles = await listRoles();
    setNbValideurs(roles.filter((r) => r.validation_elec).length);
  }, []);

  // Relecture après le tirage du domaine (useDonneesElec tire aussi les factures).
  useEffect(() => {
    void relire();
  }, [relire, reglages, compteurs, releves]);

  // Brouillons en attente d'envoi : relecture régulière jusqu'à leur départ.
  const enAttente = fact.factures.some((f) => f._dirty);
  useEffect(() => {
    if (!enAttente) return;
    const id = window.setInterval(() => void relire(), 4000);
    return () => window.clearInterval(id);
  }, [enAttente, relire]);

  const clientsParId = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const facturesCycle = useMemo(
    () =>
      fact.factures
        .filter((f) => f.cycle === cycle)
        .sort((a, b) => {
          const ca = clientsParId.get(a.client_id);
          const cb = clientsParId.get(b.client_id);
          if (a.essai !== b.essai) return a.essai ? 1 : -1;
          return comparerFactures({ client: { code: ca?.code ?? '' }, bien: a.bien }, { client: { code: cb?.code ?? '' }, bien: b.bien });
        }),
    [fact.factures, cycle, clientsParId]
  );
  const apercu = useMemo(
    () =>
      reglages ? preparerFacturesCycle(cycle, clients, compteurs, releves, avecLignes(fact), reglages) : null,
    [cycle, clients, compteurs, releves, fact, reglages]
  );
  const attentes = facturesCycle.filter((f) => f.statut === 'brouillon' && f.en_attente_releve);
  const pretes = facturesCycle.filter(
    (f) => f.statut === 'brouillon' && !f.en_attente_releve && (fact.lignes.get(f.id) ?? []).length > 0
  );
  const essai = reglages?.mode_essai ?? true;
  const compteur = reglages ? compteurActif(reglages) : null;
  const prochain = reglages ? prochainsNumeros(reglages, cycle, 1)[0] : '-';

  const totaux = facturesCycle.reduce(
    (t, f) => ({
      kwh: t.kwh + (f.total_kwh ?? 0),
      ht: t.ht + (f.montant_ht ?? 0),
      tva: t.tva + (f.montant_tva ?? 0),
      ttc: t.ttc + (f.montant_ttc ?? 0),
    }),
    { kwh: 0, ht: 0, tva: 0, ttc: 0 }
  );

  const action = async (cle: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(cle);
    try {
      await fn();
    } catch (e: any) {
      toast.error(e?.message ?? 'Opération impossible');
    } finally {
      // Réglages compris : le prochain numéro affiché suit le compteur avancé par l'émission.
      await donnees.relire();
      await relire();
      notifierFactures();
      setBusy(null);
    }
  };

  // ───────────────────────── Actions de cycle (gestion) ─────────────────────────
  const preparer = () =>
    action('preparer', async () => {
      if (!reglages) throw new Error('Réglages RTB introuvables');
      const r = await preparerCycle(cycle, clients, compteurs, releves, reglages);
      const enAtt = r.factures.filter((f) => f.attente.length > 0).length;
      toast.success(
        `${r.factures.length} facture${r.factures.length > 1 ? 's' : ''} préparée${r.factures.length > 1 ? 's' : ''}` +
          (enAtt > 0 ? `, dont ${enAtt} en attente de relevé` : '') +
          (online ? '' : ' (envoi au retour du réseau)')
      );
    });

  const emettreTout = async () => {
    if (!reglages || pretes.length === 0) return;
    const numeros = prochainsNumeros(reglages, cycle, pretes.length);
    const ordre = pretes.slice().sort((a, b) =>
      comparerFactures(
        { client: { code: clientsParId.get(a.client_id)?.code ?? '' }, bien: a.bien },
        { client: { code: clientsParId.get(b.client_id)?.code ?? '' }, bien: b.bien }
      )
    );
    const liste = ordre.map((f, i) => `${numeros[i]} : ${libelleClient(clientsParId.get(f.client_id))}${f.bien ? ` (${f.bien})` : ''}`).join('\n');
    const ok = await showConfirm(
      `${essai ? 'Mode essai : numéros d’essai, le compteur officiel n’avance pas.\n\n' : ''}Numéros qui seront attribués :\n${liste}`,
      `Émettre ${pretes.length} facture${pretes.length > 1 ? 's' : ''}`,
      { confirmText: 'Émettre', variant: 'warning' }
    );
    if (!ok) return;
    await action('emettre', async () => {
      const r = await emettreCycle(cycle);
      toast.success(r.length > 0 ? `Émises : ${r.map((x) => x.numero).join(', ')}` : 'Aucune facture émise');
    });
  };

  const soumettre = () =>
    action('soumettre', async () => {
      const n = await soumettreCycle(cycle, dateLimite);
      setSoumettreOuvert(false);
      toast.success(`${n} facture${n > 1 ? 's' : ''} soumise${n > 1 ? 's' : ''} aux gérants jusqu’au ${dateFr(dateLimite)}`);
    });

  const clore = () =>
    action('clore', async () => {
      const r = await cloreValidation(cycle);
      const rem = r.bloquees.filter((b) => b.raison === 'remarque').length;
      const att = r.bloquees.length - rem;
      toast.success(
        `${r.validees} validée${r.validees > 1 ? 's' : ''}` +
          (rem > 0 ? `, ${rem} bloquée${rem > 1 ? 's' : ''} par une remarque` : '') +
          (att > 0 ? `, ${att} en attente des avis ou de la date limite` : ''),
        { duration: 6000 }
      );
    });

  const effacer = async () => {
    const nb = facturesCycle.filter((f) => f.essai && !estVerrouillee(f)).length;
    const ok = await showConfirm(
      `Les ${nb} facture${nb > 1 ? 's' : ''} d’essai non envoyée${nb > 1 ? 's' : ''} ${deMois(cycle)} seront effacées. Les factures officielles ne sont jamais touchées.`,
      'Effacer les factures d’essai',
      { confirmText: 'Effacer', variant: 'danger' }
    );
    if (!ok) return;
    await action('effacer', async () => {
      const r = await effacerEssai(cycle);
      toast.success(
        `${r.effacees.length} effacée${r.effacees.length > 1 ? 's' : ''}. ` +
          (r.compteur_remis
            ? `Prochain numéro d’essai : ${r.prochain_essai}.`
            : `Compteur d’essai laissé à ${r.prochain_essai} (des numéros plus récents existent).`),
        { duration: 6000 }
      );
    });
  };

  const exporter = () => {
    const rows = lignesCsvCycle(facturesCycle, fact.lignes, clientsParId);
    downloadCsv(`factures-rtb-${cycle}`, toCsv(rows, COLONNES_CSV));
  };

  const nbEssaiEffacables = facturesCycle.filter((f) => f.essai && !estVerrouillee(f)).length;
  const nbEmises = facturesCycle.filter((f) => f.statut === 'emise').length;
  const nbAValider = facturesCycle.filter((f) => f.statut === 'a_valider').length;

  return (
    <EauPageShell
      title="Factures"
      subtitle={`Factures RTB Énergie ${deMois(cycle)}`}
      tone="elec"
      actions={lectureSeule ? <LectureSeule /> : undefined}
      aide={{
        id: 'elec-factures',
        quoi: (
          <>
            Les factures d’électricité d’un mois : une par client (ou par bien), calculées sur les relevés. Statuts :
            brouillon (préparée, sans numéro, modifiable), émise (numérotée, pas encore envoyée), à valider (soumise aux
            gérants), validée (prête à partir), envoyée (partie, plus rien ne change).
          </>
        ),
        comment: (
          <>
            « Préparer le cycle » calcule les brouillons, même sans réseau. Le numéro n’est donné qu’à l’émission, pour
            qu’il n’y ait jamais de trou ni de doublon dans la suite des numéros. En mode essai, les numéros viennent
            d’un compteur d’essai : le compteur officiel n’avance pas et les factures d’essai peuvent être effacées pour
            recommencer. Validation : les gérants répondent « Bon » ou « Remarque » avant la date limite ; sans
            remarque à la date limite, la facture est validée à la clôture. Une remarque se lève par une réponse ou une
            re-datation.
          </>
        ),
      }}
    >
      <div className="space-y-3" data-elec-factures>
        <label className="block text-sm">
          <span className="block text-gray-700 mb-1">Mois de consommation</span>
          <select value={cycle} onChange={(e) => setCycle(e.target.value)} className={champCls} data-elec-factures-cycle>
            {choix.map((m) => <option key={m} value={m}>{libelleMois(m)}</option>)}
          </select>
        </label>

        <div
          className={`rounded-xl px-3 py-2.5 text-sm ${essai ? 'bg-rtb-gold/20 border border-rtb-gold text-rtb-green' : 'bg-rtb-green text-white'}`}
          data-elec-factures-mode={essai ? 'essai' : 'officiel'}
        >
          <p className="font-semibold">
            {essai ? 'Mode essai : numéros d’essai, rien ne part, le compteur officiel n’avance pas' : 'Mode officiel'}
          </p>
          <p className="mt-0.5">
            Prochain numéro : <strong data-elec-factures-prochain>{prochain}</strong>
            {compteur && compteur.essai ? ' (essai)' : ''}
          </p>
        </div>

        {gestion && (
          <div className="rounded-2xl border border-rtb-gold/40 bg-white p-3 space-y-2" data-elec-actions-cycle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ElecBouton icon={Calculator} onClick={preparer} disabled={!!busy || chargement} data-elec-preparer>
                {busy === 'preparer' ? 'Préparation…' : 'Préparer le cycle'}
              </ElecBouton>
              <ElecBouton icon={Send} onClick={emettreTout} disabled={!online || !!busy || pretes.length === 0} data-elec-emettre-cycle>
                Émettre les brouillons prêts ({pretes.length})
              </ElecBouton>
              <ElecBouton icon={Stamp} variante="secondaire" onClick={() => setSoumettreOuvert((v) => !v)} disabled={!online || !!busy || nbEmises === 0} data-elec-soumettre-ouvrir>
                Soumettre aux gérants ({nbEmises})
              </ElecBouton>
              <ElecBouton icon={ShieldCheck} variante="secondaire" onClick={clore} disabled={!online || !!busy || nbAValider === 0} data-elec-clore>
                Clore la validation ({nbAValider})
              </ElecBouton>
              <ElecBouton icon={FileSpreadsheet} variante="secondaire" onClick={exporter} disabled={facturesCycle.length === 0} data-elec-export>
                Exporter le cycle (CSV)
              </ElecBouton>
              <ElecBouton icon={Eraser} variante="danger" onClick={effacer} disabled={!online || !!busy || nbEssaiEffacables === 0} data-elec-effacer-essai>
                Effacer les factures d’essai ({nbEssaiEffacables})
              </ElecBouton>
            </div>
            {soumettreOuvert && (
              <Tiroir>
                <div className="flex flex-col sm:flex-row sm:items-end gap-2 pt-1">
                  <label className="text-sm flex-1">
                    <span className="block text-gray-700 mb-1">Date limite de réponse des gérants</span>
                    <input type="date" value={dateLimite} min={aujourdhuiMg()} onChange={(e) => setDateLimite(e.target.value)} className={champCls} data-elec-date-limite />
                  </label>
                  <ElecBouton icon={Stamp} onClick={soumettre} disabled={!online || !!busy || !dateLimite} data-elec-soumettre>
                    Soumettre
                  </ElecBouton>
                </div>
              </Tiroir>
            )}
            {!online && <p className="text-xs text-gray-500" data-elec-reseau>Émettre, soumettre, clore, effacer : {RESEAU}.</p>}
          </div>
        )}
        {!gestion && facturesCycle.length > 0 && (
          <ElecBouton icon={FileSpreadsheet} variante="secondaire" onClick={exporter} className="w-full" data-elec-export>
            Exporter le cycle (CSV)
          </ElecBouton>
        )}

        {attentes.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" data-elec-attentes>
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              {attentes.length} facture{attentes.length > 1 ? 's' : ''} en attente de relevé
            </p>
            <ul className="mt-1 space-y-0.5">
              {attentes.map((f) => (
                <li key={f.id} data-elec-attente={f.cle_regroupement}>
                  {libelleClient(clientsParId.get(f.client_id))}{f.bien ? ` (${f.bien})` : ''} : {f.motif_attente}
                </li>
              ))}
            </ul>
            <Link to="/gestion-eau/elec/releves" className="inline-flex items-center min-h-[44px] font-semibold underline">
              Aller à la tournée
            </Link>
          </div>
        )}
        {gestion && apercu && apercu.factures.length > 0 && facturesCycle.length === 0 && (
          <p className="text-sm text-gray-600" data-elec-apercu>
            {apercu.factures.length} facture{apercu.factures.length > 1 ? 's' : ''} à préparer pour ce mois
            {apercu.factures.some((f) => f.attente.length > 0) ? `, dont ${apercu.factures.filter((f) => f.attente.length > 0).length} en attente de relevé` : ''}.
          </p>
        )}

        {facturesCycle.length > 0 && (
          <div className="rounded-xl bg-rtb-green text-white px-4 py-3" data-elec-totaux-cycle>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm">{facturesCycle.length} facture{facturesCycle.length > 1 ? 's' : ''} · {fmtKwh(totaux.kwh)}</span>
              <strong className="text-xl" data-elec-total-ttc>{fmtAr(totaux.ttc)}</strong>
            </div>
            <p className="text-xs text-white/80 mt-0.5">HT {fmtAr(totaux.ht, 2)} · TVA {fmtAr(totaux.tva, 2)} · TTC</p>
          </div>
        )}

        {chargement ? (
          <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
        ) : facturesCycle.length === 0 ? (
          <ElecVide
            icon={Receipt}
            titre="Aucune facture pour ce mois"
            texte={gestion ? '« Préparer le cycle » calcule les factures à partir des relevés.' : 'La gestion de RTB Énergie prépare les factures du mois.'}
          />
        ) : (
          <ul className="space-y-2" data-elec-liste-factures>
            {facturesCycle.map((f) => (
              <CarteFacture
                key={f.id}
                f={f}
                client={clientsParId.get(f.client_id)}
                lignes={fact.lignes.get(f.id) ?? []}
                avis={fact.avis.get(f.id) ?? []}
                nbValideurs={nbValideurs}
                ouvert={ouvert === f.id}
                basculer={() => setOuvert((o) => (o === f.id ? null : f.id))}
                gestion={gestion}
                valideur={droits.validation}
                userId={userId}
                online={online}
                busy={busy}
                action={action}
                recalculerLignes={() => lignesRecalculees(f)}
                devise={reglages?.devise ?? 'MGA'}
              />
            ))}
          </ul>
        )}
        {valideur && (
          <p className="text-xs text-gray-500">Vous donnez votre avis sur les factures à valider. Les autres actions sont réservées à la gestion.</p>
        )}
      </div>
    </EauPageShell>
  );

  /** Lignes recalculées d'une facture émise (relevé corrigé), sans toucher aux autres factures. */
  function lignesRecalculees(f: ElecFactureLocal) {
    if (!reglages) return null;
    const autres = avecLignes(fact).filter((e) => e.facture.id !== f.id);
    const prep = preparerFacturesCycle(f.cycle, clients, compteurs, releves, autres, { ...reglages, mode_essai: f.essai });
    const p = prep.factures.find((x) => x.cle === f.cle_regroupement);
    if (!p) return { erreur: 'Aucun compteur facturable pour cette facture.' } as const;
    if (p.attente.length > 0) return { erreur: p.attente.join(' ; ') } as const;
    return {
      kwh: p.totaux.totalKwh,
      ttc: p.totaux.montantTtc,
      lignes: p.lignes.map((l) => ({
        id: `${f.id}:${l.compteur.id}`,
        compteur_id: l.compteur.id,
        code_compteur: l.compteur.code,
        index_debut: l.indexDebut,
        date_index_debut: l.dateIndexDebut,
        index_fin: l.indexFin,
        date_index_fin: l.dateIndexFin,
        releve_fin_id: l.releveFinId,
        ordre: l.ordre,
      })),
    } as const;
  }
}

function libelleClient(c: ElecClientLocal | undefined): string {
  return c ? `${c.code} ${c.nom}` : 'Client inconnu';
}

// ───────────────────────────── Pastilles ─────────────────────────────
function PastilleStatut({ statut, remarque }: { statut: ElecFactureStatut; remarque: boolean }) {
  const cls = remarque
    ? 'bg-rose-100 text-rose-800'
    : statut === 'validee' || statut === 'envoyee' || statut === 'payee'
    ? 'bg-emerald-100 text-emerald-800'
    : statut === 'a_valider'
    ? 'bg-amber-100 text-amber-800'
    : statut === 'emise'
    ? 'bg-rtb-gold/20 text-rtb-green'
    : 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`} data-elec-statut={statut}>
      {remarque ? 'Remarque ouverte' : STATUT_FACTURE_LIBELLE[statut]}
    </span>
  );
}

// ───────────────────────────── Carte et tiroir de détail ─────────────────────────────
type Recalcul =
  | null
  | { readonly erreur: string }
  | { readonly kwh: number; readonly ttc: number; readonly lignes: ReadonlyArray<Pick<ElecFactureLigneLocal, 'id' | 'compteur_id' | 'code_compteur' | 'index_debut' | 'date_index_debut' | 'index_fin' | 'date_index_fin' | 'releve_fin_id' | 'ordre'>> };

function CarteFacture({
  f, client, lignes, avis, nbValideurs, ouvert, basculer, gestion, valideur, userId, online, busy, action, recalculerLignes, devise,
}: {
  f: ElecFactureLocal;
  client: ElecClientLocal | undefined;
  lignes: ElecFactureLigneLocal[];
  avis: ElecValidationLocal[];
  nbValideurs: number;
  ouvert: boolean;
  basculer: () => void;
  gestion: boolean;
  valideur: boolean;
  userId: string | null;
  online: boolean;
  busy: string | null;
  action: (cle: string, fn: () => Promise<void>) => Promise<void>;
  recalculerLignes: () => Recalcul;
  devise: string;
}) {
  const r = resumeAvis(avis);
  const avisTexte = f.statut === 'a_valider' || avis.length > 0 ? libelleAvis(r, nbValideurs) : '';
  const tri = lignes.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  return (
    <li className="rounded-xl border border-rtb-gold/30 bg-white" data-elec-facture={f.numero ?? f.cle_regroupement}>
      <button
        type="button"
        onClick={basculer}
        aria-expanded={ouvert}
        className="w-full text-left px-3 py-2.5 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-rtb-gold rounded-xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-rtb-green break-words" data-elec-numero>{f.numero ?? 'Brouillon'}</p>
            <p className="text-sm text-gray-700 break-words">
              {libelleClient(client)}{f.bien ? ` · ${f.bien}` : ''}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-semibold" data-elec-ttc>{f.en_attente_releve ? '-' : `${(f.montant_ttc ?? 0).toLocaleString('fr-FR')} Ar`}</p>
            <ChevronDown className={`w-4 h-4 ml-auto text-rtb-green transition-transform ${ouvert ? 'rotate-180' : ''}`} aria-hidden="true" />
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
          <PastilleStatut statut={f.statut} remarque={r.remarquesOuvertes > 0} />
          {f.essai && <Pastille>Essai</Pastille>}
          {f.en_attente_releve && <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">En attente de relevé</span>}
          {f._dirty && <Pastille tone="neutral"><CloudUpload className="w-3 h-3" aria-hidden="true" />à envoyer</Pastille>}
          <span>{tri.length} compteur{tri.length > 1 ? 's' : ''} · {fmtKwh(f.total_kwh)}</span>
          {f.date_echeance && <span>· échéance {dateFr(f.date_echeance)}</span>}
          {avisTexte && <span data-elec-avis-resume>· {avisTexte}</span>}
        </div>
      </button>
      {ouvert && (
        <Tiroir>
          <Detail
            f={f}
            lignes={tri}
            avis={avis}
            gestion={gestion}
            valideur={valideur}
            userId={userId}
            online={online}
            busy={busy}
            action={action}
            recalculerLignes={recalculerLignes}
            devise={devise}
          />
        </Tiroir>
      )}
    </li>
  );
}

function Detail({
  f, lignes, avis, gestion, valideur, userId, online, busy, action, recalculerLignes, devise,
}: {
  f: ElecFactureLocal;
  lignes: ElecFactureLigneLocal[];
  avis: ElecValidationLocal[];
  gestion: boolean;
  valideur: boolean;
  userId: string | null;
  online: boolean;
  busy: string | null;
  action: (cle: string, fn: () => Promise<void>) => Promise<void>;
  recalculerLignes: () => Recalcul;
  devise: string;
}) {
  const [debut, setDebut] = useState(f.periode_debut ?? '');
  const [fin, setFin] = useState(f.periode_fin ?? '');
  const [dateEnvoi, setDateEnvoi] = useState(aujourdhuiMg());
  const [remarque, setRemarque] = useState('');
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const verrou = estVerrouillee(f);
  const brouillon = f.statut === 'brouillon';
  const monAvis = avis.find((a) => a.user_id === userId) ?? null;
  const recalc = gestion && ['emise', 'a_valider', 'validee'].includes(f.statut) ? recalculerLignes() : null;
  const change = recalc && 'lignes' in recalc && (recalc.kwh !== (f.total_kwh ?? 0) || recalc.ttc !== (f.montant_ttc ?? 0));

  const emettre = () => action('emettre-' + f.id, async () => {
    const n = await emettreFacture(f.id);
    toast.success(`Facture émise : ${n}`);
  });
  const redater = async () => {
    if (!recalc || !('lignes' in recalc)) {
      toast.error(recalc && 'erreur' in recalc ? recalc.erreur : 'Recalcul impossible');
      return;
    }
    const ok = await showConfirm(
      `La facture garde son numéro ${f.numero}, prend la date d’aujourd’hui ; l’échéance suit et les avis des gérants repartent à zéro.` +
        (change ? `\n\nAprès correction : ${fmtKwh(recalc.kwh)}, ${recalc.ttc.toLocaleString('fr-FR')} Ar TTC (au lieu de ${fmtKwh(f.total_kwh)}, ${(f.montant_ttc ?? 0).toLocaleString('fr-FR')} Ar).` : ''),
      'Re-dater la facture',
      { confirmText: 'Re-dater', variant: 'warning' }
    );
    if (!ok) return;
    await action('redater-' + f.id, async () => {
      await redaterFacture(f.id, recalc.lignes.map((l) => ({ ...l })));
      toast.success(`Facture ${f.numero} re-datée`);
    });
  };
  const envoyer = async () => {
    const sansValidation = f.statut === 'emise';
    if (sansValidation) {
      const ok = await showConfirm(
        'Cette facture n’a pas été validée par les gérants. La marquer quand même comme envoyée ?',
        'Envoi sans validation',
        { confirmText: 'Marquer envoyée', variant: 'warning' }
      );
      if (!ok) return;
    }
    await action('envoyer-' + f.id, async () => {
      await marquerEnvoyee(f.id, dateEnvoi, sansValidation);
      toast.success(`Facture ${f.numero} marquée envoyée le ${dateFr(dateEnvoi)}`);
    });
  };
  const supprimer = async () => {
    if (!(await showConfirm('Supprimer ce brouillon ?', 'Brouillon', { confirmText: 'Supprimer', variant: 'danger' }))) return;
    await action('suppr-' + f.id, async () => {
      await supprimerBrouillon(f.id);
      toast.success('Brouillon supprimé');
    });
  };
  const enregistrerPeriode = () => action('periode-' + f.id, async () => {
    if (!debut || !fin || debut > fin) throw new Error('Période invalide');
    await modifierPeriode(f.id, debut, fin);
    toast.success('Période enregistrée');
  });
  const avisBon = () => action('avis-' + f.id, async () => {
    await donnerAvis(f.id, 'bon', null);
    toast.success('Avis « Bon » enregistré');
  });
  const avisRemarque = () => action('avis-' + f.id, async () => {
    if (!remarque.trim()) throw new Error('Écrivez votre remarque');
    await donnerAvis(f.id, 'remarque', remarque.trim());
    setRemarque('');
    toast.success('Remarque enregistrée');
  });

  return (
    <div className="px-3 pb-3 space-y-3 text-sm border-t border-rtb-gold/20 pt-2" data-elec-detail={f.id}>
      {f.en_attente_releve && f.motif_attente && (
        <p className="rounded-lg bg-rose-50 text-rose-800 px-2 py-1.5" data-elec-motif>{f.motif_attente}</p>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Période</p>
        {brouillon && gestion ? (
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <label className="block"><span className="block text-xs text-gray-600">Du</span>
              <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className={champCls} data-elec-periode-debut />
            </label>
            <label className="block"><span className="block text-xs text-gray-600">Au</span>
              <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className={champCls} data-elec-periode-fin />
            </label>
            <ElecBouton icon={Save} variante="secondaire" onClick={enregistrerPeriode} disabled={!!busy}>Enregistrer</ElecBouton>
          </div>
        ) : (
          <p className="mt-0.5">du {dateFr(f.periode_debut)} au {dateFr(f.periode_fin)}</p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Compteurs</p>
        {lignes.length === 0 ? (
          <p className="text-gray-500 mt-0.5">Aucune ligne calculable.</p>
        ) : (
          <ul className="mt-1 space-y-1.5">
            {lignes.map((l) => (
              <li key={l.id} className="rounded-lg bg-rtb-gold/5 border border-rtb-gold/20 px-2 py-1.5" data-elec-ligne={l.code_compteur ?? ''}>
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-rtb-green">{l.code_compteur}</strong>
                  <span className="font-semibold" data-elec-ligne-montant>{fmtAr(l.montant, 2)}</span>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs text-gray-600 mt-0.5">
                  <dt>Début</dt>
                  <dd className="text-right" data-elec-ligne-debut>{fmtIndex(l.index_debut, 3)} · {fmtDateMg(l.date_index_debut)}</dd>
                  <dt>Fin</dt>
                  <dd className="text-right" data-elec-ligne-fin>{fmtIndex(l.index_fin, 3)} · {fmtDateMg(l.date_index_fin)}</dd>
                  <dt>Conso</dt>
                  <dd className="text-right" data-elec-ligne-kwh>{fmtKwh(l.kwh)} × {(f.tarif_kwh ?? 0).toLocaleString('fr-FR')} Ar</dd>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>

      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5" data-elec-detail-totaux>
        <dt>Énergie</dt><dd className="text-right">{fmtAr(f.montant_energie, 2)}</dd>
        <dt>Forfait d’amortissement</dt><dd className="text-right">{fmtAr(f.forfait_ht, 2)}</dd>
        <dt>Total HT</dt><dd className="text-right" data-elec-ht>{fmtAr(f.montant_ht, 2)}</dd>
        <dt>TVA {f.tva_pct ?? '-'} %</dt><dd className="text-right" data-elec-tva>{fmtAr(f.montant_tva, 2)}</dd>
        <dt className="font-bold text-rtb-green">Total TTC</dt><dd className="text-right font-bold text-rtb-green" data-elec-detail-ttc>{fmtAr(f.montant_ttc)}</dd>
        <dt>Échéance</dt><dd className="text-right" data-elec-echeance>{dateFr(f.date_echeance) || '-'}</dd>
      </dl>
      <p className="text-[11px] text-gray-400">Montants en {devise}. Le document de facture arrive avec la phase suivante.</p>

      <Historique f={f} />

      {avis.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avis des gérants</p>
          <ul className="mt-1 space-y-1.5">
            {avis.map((a) => (
              <li key={a.id} className={`rounded-lg px-2 py-1.5 ${a.avis === 'remarque' && !a.levee ? 'bg-rose-50 text-rose-900' : 'bg-emerald-50 text-emerald-900'}`} data-elec-avis={a.avis}>
                <p className="font-semibold flex items-center gap-1">
                  {a.avis === 'bon' ? <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" /> : <MessageSquareWarning className="w-3.5 h-3.5" aria-hidden="true" />}
                  {a.avis === 'bon' ? 'Bon' : a.levee ? 'Remarque levée' : 'Remarque'}
                  {a.user_id === userId && <span className="font-normal">(vous)</span>}
                </p>
                {a.texte && <p className="mt-0.5">{a.texte}</p>}
                {a.reponse && <p className="mt-0.5 text-gray-700">Réponse : {a.reponse}</p>}
                {gestion && a.avis === 'remarque' && !a.levee && !verrou && (
                  <div className="mt-1 flex flex-col sm:flex-row gap-2">
                    <input
                      value={reponses[a.id] ?? ''}
                      onChange={(e) => setReponses((p) => ({ ...p, [a.id]: e.target.value }))}
                      placeholder="Réponse de la gestion"
                      className={champCls}
                      data-elec-reponse-texte
                    />
                    <ElecBouton
                      variante="secondaire"
                      disabled={!online || !!busy || !(reponses[a.id] ?? '').trim()}
                      onClick={() => action('rep-' + a.id, async () => {
                        await repondreRemarque(a.id, (reponses[a.id] ?? '').trim());
                        toast.success('Remarque levée');
                      })}
                      data-elec-repondre
                    >
                      Répondre
                    </ElecBouton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {valideur && f.statut === 'a_valider' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 space-y-2" data-elec-zone-avis>
          <p className="font-semibold text-amber-900">
            Votre avis{monAvis ? ` : ${monAvis.avis === 'bon' ? 'Bon' : 'Remarque'}` : ''}
            {f.validation_date_limite ? ` (avant le ${dateFr(f.validation_date_limite)})` : ''}
          </p>
          <ElecBouton icon={ThumbsUp} onClick={avisBon} disabled={!online || !!busy} className="w-full" data-elec-avis-bon>Bon</ElecBouton>
          <textarea
            value={remarque}
            onChange={(e) => setRemarque(e.target.value)}
            placeholder="Votre remarque (obligatoire pour « Remarque »)"
            rows={2}
            className={`${champCls} min-h-[64px]`}
            data-elec-remarque-texte
          />
          <ElecBouton icon={MessageSquareWarning} variante="secondaire" onClick={avisRemarque} disabled={!online || !!busy || !remarque.trim()} className="w-full" data-elec-avis-remarque>
            Remarque
          </ElecBouton>
          {!online && <p className="text-xs text-gray-500">Avis : {RESEAU}.</p>}
        </div>
      )}

      {gestion && !verrou && (
        <div className="space-y-2" data-elec-actions-facture>
          {brouillon && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ElecBouton icon={Send} onClick={emettre} disabled={!online || !!busy || f.en_attente_releve || lignes.length === 0} data-elec-emettre>
                Émettre
              </ElecBouton>
              <ElecBouton icon={Trash2} variante="danger" onClick={supprimer} disabled={!!busy} data-elec-supprimer>
                Supprimer le brouillon
              </ElecBouton>
            </div>
          )}
          {['emise', 'a_valider', 'validee'].includes(f.statut) && (
            <>
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-2">
                <p className="text-xs text-gray-600" data-elec-redater-info>
                  {recalc && 'erreur' in recalc
                    ? `Recalcul impossible : ${recalc.erreur}`
                    : change
                    ? `Un relevé a changé : ${fmtKwh(recalc && 'kwh' in recalc ? recalc.kwh : null)} au lieu de ${fmtKwh(f.total_kwh)}. Re-dater garde le numéro, met la date du jour et efface les avis.`
                    : 'Après correction d’un relevé : re-dater garde le numéro, met la date du jour (l’échéance suit) et efface les avis.'}
                </p>
                <ElecBouton icon={RotateCcw} variante="secondaire" onClick={redater} disabled={!online || !!busy} className="w-full mt-2" data-elec-redater>
                  Re-dater
                </ElecBouton>
              </div>
              {(f.statut === 'validee' || f.statut === 'emise') && (
                <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                  <label className="block flex-1"><span className="block text-xs text-gray-600">Date d’envoi (hors application)</span>
                    <input type="date" value={dateEnvoi} max={aujourdhuiMg()} onChange={(e) => setDateEnvoi(e.target.value)} className={champCls} data-elec-date-envoi />
                  </label>
                  <ElecBouton icon={CheckCircle2} onClick={envoyer} disabled={!online || !!busy || !dateEnvoi} data-elec-marquer-envoyee>
                    Marquer envoyée
                  </ElecBouton>
                </div>
              )}
            </>
          )}
          {!online && !brouillon && <p className="text-xs text-gray-500">Actions sur une facture émise : {RESEAU}.</p>}
          {!online && brouillon && <p className="text-xs text-gray-500">Émettre : {RESEAU}.</p>}
        </div>
      )}
      {gestion && verrou && (
        <p className="text-xs text-emerald-800 bg-emerald-50 rounded-lg px-2 py-1.5" data-elec-verrou>
          Facture envoyée le {dateFr(f.date_envoi)} : elle ne se recalcule plus, ne se re-date plus et ne s’efface plus.
        </p>
      )}
    </div>
  );
}

function Historique({ f }: { f: ElecFactureLocal }) {
  const etapes: Array<{ libelle: string; date: string | null; icon: typeof CalendarClock }> = [
    { libelle: 'Préparée', date: f.created_at ? f.created_at.slice(0, 10) : null, icon: Calculator },
    { libelle: 'Émise', date: f.date_emission, icon: Send },
    { libelle: 'Soumise, réponse avant le', date: f.validation_date_limite, icon: Stamp },
    { libelle: 'Envoyée', date: f.date_envoi, icon: CheckCircle2 },
  ];
  const faites = etapes.filter((e) => e.date);
  if (faites.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historique</p>
      <ol className="mt-1 space-y-0.5" data-elec-historique>
        {faites.map((e) => (
          <li key={e.libelle} className="flex items-center gap-1.5 text-xs text-gray-700">
            <e.icon className="w-3.5 h-3.5 text-rtb-green" aria-hidden="true" />
            {e.libelle} {dateFr(e.date)}
          </li>
        ))}
        {f.statut === 'validee' && <li className="text-xs text-emerald-800">Validée par la clôture</li>}
      </ol>
    </div>
  );
}
