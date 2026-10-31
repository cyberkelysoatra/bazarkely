/**
 * Relevés d'électricité RTB Énergie /gestion-eau/elec/releves (ELEC-CC-02).
 *  - Tournée : une carte par compteur actif ou en pause (ordre de tournée), saisie en
 *    tiroir (échelle du compteur, conso par jour, écart, photo facultative), historique.
 *  - Cycle (gestion et lecture) : contrôle du mois, sans aucun montant.
 * Le releveur ne voit ni nom ni coordonnée de client. Hors ligne : tout est lu et écrit
 * dans Dexie, l'envoi part au retour du réseau (marque « à envoyer » en attendant).
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Gauge, Camera, Save, Trash2, CloudUpload, CheckCircle2, CircleDot, PauseCircle, CalendarClock,
  AlertTriangle, X, NotebookPen, ListChecks, CalendarRange, ImageIcon, Zap,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import EauPageShell from '../EauPageShell';
import EauTabs from '../EauTabs';
import { ElecBouton, ElecVide, LectureSeule, Pastille, Tiroir, champCls, useDonneesElec } from './ElecUi';
import { useGestionEau } from '../../context/GestionEauContext';
import { addReleveElec, deleteReleveElec, facteurEcartElec, updateReleveElec } from '../../services/eauElecReleveService';
import { getCurrentUserIdSync } from '../../services/eauAuth';
import { compressImageFile, dataUrlSizeKo } from '../../utils/photo';
import {
  ORIGINE_LIBELLE,
  calculerCycle,
  compteursTournee,
  consoParJour,
  cycleParDefaut,
  deMois,
  evaluerIndex,
  fenetreCycle,
  fmtDateMg,
  fmtIndex,
  joursEntre,
  libelleMois,
  lireIndex,
  moisPrecedent,
  peutModifierReleve,
  pointDeDepart,
  saisieMgVersIso,
  trierCompteurs,
  type ElecDroits,
} from '../../utils/elecReleves';
import { showConfirm } from '../../../../utils/dialogUtils';
import type { ElecCompteurLocal, ElecReleveLocal, ElecReleveOrigine } from '../../types/gestionEau';

const RTB_GREEN = '#3F5838';
const RTB_GOLD = '#D3A246';
const MSG_INFERIEUR = 'index inférieur au dernier relevé : vérifiez, ou signalez un compteur remplacé à la gestion';

const fmtKwhJ = (v: number | null) =>
  v == null ? '-' : `${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kWh/j`;
const fmtKwh = (v: number | null) =>
  v == null ? '-' : `${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kWh`;

export default function EauElecRelevesPage() {
  const donnees = useDonneesElec();
  const { droits } = donnees;
  const [onglet, setOnglet] = useState<'tournee' | 'cycle'>('tournee');

  // Tant que des relevés attendent l'envoi, on relit Dexie régulièrement : la marque
  // « à envoyer » disparaît dès que la synchronisation du retour du réseau les a envoyés.
  const enAttente = useMemo(
    () => Array.from(donnees.releves.values()).some((l) => l.some((r) => r._dirty)),
    [donnees.releves]
  );
  const { relire } = donnees;
  useEffect(() => {
    if (!enAttente) return;
    const id = window.setInterval(() => void relire(), 4000);
    return () => window.clearInterval(id);
  }, [enAttente, relire]);

  return (
    <div>
      {droits.lecture && (
        <EauTabs
          tone="elec"
          active={onglet}
          onChange={(k) => setOnglet(k as 'tournee' | 'cycle')}
          tabs={[
            { key: 'tournee', label: 'Tournée', icon: ListChecks },
            { key: 'cycle', label: 'Cycle du mois', icon: CalendarRange },
          ]}
        />
      )}
      {onglet === 'cycle' && droits.lecture ? <VueCycle {...donnees} /> : <Tournee {...donnees} />}
    </div>
  );
}

type Donnees = ReturnType<typeof useDonneesElec>;

// ───────────────────────────── Tournée ─────────────────────────────
function Tournee({ chargement, compteurs, releves, droits, relire }: Donnees) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const liste = useMemo(() => compteursTournee(compteurs), [compteurs]);
  const mois = cycleParDefaut();
  const { debut, fin } = fenetreCycle(mois);
  const nbFaits = liste.filter((c) =>
    (releves.get(c.id) ?? []).some((r) => {
      const t = new Date(r.timestamp).getTime();
      return t >= debut && t < fin;
    })
  ).length;

  return (
    <EauPageShell
      title="Relevés"
      subtitle={`Tournée ${deMois(mois)} : ${nbFaits} sur ${liste.length}`}
      tone="elec"
      actions={!droits.saisie ? <LectureSeule /> : undefined}
      aide={{
        id: 'elec-releves',
        quoi: <>La tournée des compteurs d’électricité, une fois par mois, au plus près du 1er.</>,
        comment: (
          <>
            Touchez un compteur, prenez si possible une photo du cadran, puis tapez l’index tel qu’il est affiché
            (avec la virgule seulement si le compteur en a une). L’application calcule la consommation par jour
            et vous prévient si elle paraît anormale : vérifiez alors la virgule et le compteur. Sans réseau, le
            relevé reste « à envoyer » et part tout seul au retour du réseau.
          </>
        ),
      }}
    >
      {chargement ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : liste.length === 0 ? (
        <ElecVide icon={Gauge} titre="Aucun compteur à relever" texte="Les compteurs sont créés par la gestion de RTB Énergie." />
      ) : (
        <div className="space-y-2" data-elec-tournee>
          {liste.map((c) => {
            const tries = releves.get(c.id) ?? [];
            const depart = pointDeDepart(c, tries);
            const duCycle = tries.filter((r) => {
              const t = new Date(r.timestamp).getTime();
              return t >= debut && t < fin;
            });
            const dernierCycle = duCycle[duCycle.length - 1];
            const aEnvoyer = tries.some((r) => r._dirty);
            const estOuvert = ouvert === c.id;
            return (
              <Fragment key={c.id}>
                <button
                  type="button"
                  onClick={() => setOuvert(estOuvert ? null : c.id)}
                  aria-expanded={estOuvert}
                  data-elec-carte={c.code}
                  className={`w-full text-left bg-white border rounded-2xl px-3 py-3 flex items-center gap-3 min-h-[64px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rtb-gold ${
                    estOuvert ? 'border-rtb-green shadow-md' : 'border-rtb-gold/30 hover:border-rtb-gold'
                  }`}
                >
                  <span className="min-w-[3.5rem] px-2 h-14 rounded-xl bg-rtb-green text-white text-xl font-bold flex items-center justify-center flex-shrink-0">
                    {c.code}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm text-gray-700">Bien <strong>{c.bien}</strong></span>
                      {c.statut === 'pause' && (
                        <Pastille tone="neutral"><PauseCircle className="w-3 h-3" aria-hidden="true" />En pause</Pastille>
                      )}
                      {aEnvoyer && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800" data-elec-a-envoyer>
                          <CloudUpload className="w-3 h-3" aria-hidden="true" />à envoyer
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {depart
                        ? `${depart.source === 'reprise' ? 'Reprise' : 'Dernier'} : ${fmtIndex(depart.index, c.decimales)} kWh${depart.date ? ` · ${fmtDateMg(depart.date)}` : ''}`
                        : 'Aucun index connu'}
                    </span>
                    {dernierCycle ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />relevé le {fmtDateMg(dernierCycle.timestamp)}
                      </span>
                    ) : (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                        <CircleDot className="w-3.5 h-3.5" aria-hidden="true" />à relever
                      </span>
                    )}
                  </span>
                </button>
                {estOuvert && (
                  <Tiroir>
                    <div className="pt-2 pb-1 space-y-3">
                      {droits.saisie && <Saisie compteur={c} releves={tries} droits={droits} onSaved={relire} />}
                      <Historique compteur={c} releves={tries} droits={droits} onChange={relire} />
                    </div>
                  </Tiroir>
                )}
              </Fragment>
            );
          })}
        </div>
      )}
    </EauPageShell>
  );
}

// ───────────────────────────── Saisie ─────────────────────────────
function Saisie({
  compteur,
  releves,
  droits,
  onSaved,
}: {
  compteur: ElecCompteurLocal;
  releves: ElecReleveLocal[];
  droits: ElecDroits;
  onSaved: () => Promise<void>;
}) {
  const [indexStr, setIndexStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [origine, setOrigine] = useState<ElecReleveOrigine>('terrain');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [facteur, setFacteur] = useState(3);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void facteurEcartElec().then(setFacteur).catch(() => {});
  }, []);

  const lecture = indexStr.trim() === '' ? null : lireIndex(indexStr, compteur.decimales);
  const dateIso = droits.gestion && dateStr ? saisieMgVersIso(dateStr) : new Date().toISOString();
  const ev = lecture?.ok && dateIso ? evaluerIndex(compteur, releves, lecture.value, dateIso, facteur) : null;

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      setPhoto(await compressImageFile(file));
    } catch {
      toast.error('Photo illisible');
    } finally {
      setPhotoBusy(false);
      e.target.value = '';
    }
  };

  const enregistrer = async () => {
    if (busy) return;
    const l = lireIndex(indexStr, compteur.decimales);
    if (!l.ok) return void toast.error(l.message);
    const ts = droits.gestion && dateStr ? saisieMgVersIso(dateStr) : new Date().toISOString();
    if (!ts) return void toast.error('Date invalide');
    if (new Date(ts).getTime() > Date.now() + 60_000) return void toast.error('Date dans le futur impossible');
    const e = evaluerIndex(compteur, releves, l.value, ts, facteur);
    let rupture = false;
    if (e.inferieur) {
      if (!droits.gestion) return void toast.error(MSG_INFERIEUR, { duration: 6000 });
      const ok = await showConfirm(
        `L’index saisi (${fmtIndex(l.value, compteur.decimales)}) est inférieur au précédent (${fmtIndex(e.depart?.index, compteur.decimales)}). ` +
          'Le relevé sera marqué en rupture d’index (compteur remis à zéro ou changé) : la consommation de cet intervalle ne sera pas comptée. Confirmer ?',
        'Index inférieur',
        { variant: 'warning', confirmText: 'Confirmer la rupture' }
      );
      if (!ok) return;
      rupture = true;
    }
    let ecartConfirme = false;
    if (!rupture && e.ecart.aberrant) {
      const sens = e.ecart.type === 'haut' ? 'beaucoup plus élevée' : 'beaucoup plus basse';
      const ok = await showConfirm(
        `Consommation de ${fmtKwhJ(e.parJour)}, ${sens} que d’habitude (${fmtKwhJ(e.moyenneParJour)}). Vérifiez la virgule et le compteur. Enregistrer quand même ?`,
        'Consommation inhabituelle',
        { variant: 'warning', confirmText: 'Enregistrer quand même' }
      );
      if (!ok) return;
      ecartConfirme = true;
    }
    setBusy(true);
    try {
      await addReleveElec({
        compteur_id: compteur.id,
        index: l.value,
        rupture_index: rupture,
        aberrant_confirme: ecartConfirme,
        agent_id: getCurrentUserIdSync(),
        note: note.trim() || null,
        photo_url: photo,
        timestamp: ts,
        origine: droits.gestion ? origine : 'terrain',
      });
      toast.success(`Relevé ${compteur.code} enregistré`);
      setIndexStr('');
      setNote('');
      setPhoto(null);
      setDateStr('');
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-rtb-gold/50 bg-rtb-gold/5 p-3 space-y-3" data-elec-saisie={compteur.code}>
      {/* Photo facultative mais proposée en premier. */}
      {photo ? (
        <div className="flex items-center gap-3">
          <img src={photo} alt={`Cadran du compteur ${compteur.code}`} className="w-20 h-20 object-cover rounded-xl border border-rtb-gold/50" data-elec-miniature />
          <div className="text-xs text-gray-600 space-y-1">
            <div>Photo prête · environ {dataUrlSizeKo(photo)} Ko</div>
            <button type="button" onClick={() => setPhoto(null)} className="inline-flex items-center gap-1 min-h-[44px] text-rose-700 font-medium">
              <Trash2 className="w-4 h-4" aria-hidden="true" /> Retirer
            </button>
          </div>
        </div>
      ) : (
        <label className={`flex items-center justify-center gap-2 min-h-[52px] rounded-xl border-2 border-dashed border-rtb-gold bg-white text-rtb-green font-semibold cursor-pointer ${photoBusy ? 'animate-pulse' : ''}`}>
          <Camera className="w-5 h-5" aria-hidden="true" />
          Photographier le compteur
          <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" disabled={photoBusy} data-elec-photo />
        </label>
      )}

      <label className="block text-sm">
        <span className="block text-gray-700 mb-1">
          Nouvel index (kWh) · {compteur.decimales === 0 ? 'nombre entier' : `${compteur.decimales} chiffre${compteur.decimales > 1 ? 's' : ''} après la virgule au plus`}
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode={compteur.decimales === 0 ? 'numeric' : 'decimal'}
          autoComplete="off"
          value={indexStr}
          onChange={(e) => setIndexStr(e.target.value)}
          aria-invalid={!!lecture && !lecture.ok}
          placeholder={compteur.decimales === 0 ? '12345' : `12345,${'0'.repeat(compteur.decimales)}`}
          className={`${champCls} text-lg font-semibold tracking-wide ${lecture && !lecture.ok ? 'border-rose-400' : ''}`}
          data-elec-index
        />
        {lecture && !lecture.ok && (
          <span className="block text-sm text-rose-700 mt-1" role="alert" data-elec-erreur-index>
            {lecture.message}
          </span>
        )}
      </label>

      {droits.gestion && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm block min-w-0">
            <span className="flex items-center gap-1 text-gray-700 mb-1">
              <CalendarClock className="w-4 h-4" aria-hidden="true" /> Date et heure
            </span>
            <input type="datetime-local" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className={champCls} data-elec-date />
          </label>
          <label className="text-sm block min-w-0">
            <span className="block text-gray-700 mb-1">Origine</span>
            <select value={origine} onChange={(e) => setOrigine(e.target.value as ElecReleveOrigine)} className={champCls} data-elec-origine>
              <option value="terrain">{ORIGINE_LIBELLE.terrain}</option>
              <option value="carnet">{ORIGINE_LIBELLE.carnet}</option>
              <option value="photo_client">{ORIGINE_LIBELLE.photo_client}</option>
            </select>
          </label>
          <span className="col-span-2 text-xs text-gray-500 -mt-1">Vide = maintenant (heure de Madagascar).</span>
        </div>
      )}

      {ev && (
        <div className="space-y-1.5" data-elec-apercu>
          {ev.inferieur ? (
            <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{droits.gestion ? 'Index inférieur au précédent : il sera marqué en rupture d’index.' : MSG_INFERIEUR}</span>
            </div>
          ) : ev.conso == null ? (
            <div className="text-sm text-gray-600 bg-white rounded-lg px-3 py-2">Premier index de ce compteur : pas encore de consommation.</div>
          ) : (
            <div className="text-sm bg-white rounded-lg px-3 py-2 border border-rtb-gold/30">
              <div>
                Consommation : <strong data-elec-conso>{fmtKwh(ev.conso)}</strong>
                {ev.jours != null && <> en {ev.jours.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} j</>}
              </div>
              <div>
                Par jour : <strong data-elec-par-jour>{fmtKwhJ(ev.parJour)}</strong>
                {ev.moyenneParJour > 0 && <span className="text-gray-500"> · habituel {fmtKwhJ(ev.moyenneParJour)}</span>}
              </div>
            </div>
          )}
          {!ev.inferieur && ev.ecart.aberrant && (
            <div className="flex items-start gap-2 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" data-elec-ecart>
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>Écart fort avec l’habitude : vérifiez la virgule et le compteur. Une confirmation sera demandée.</span>
            </div>
          )}
        </div>
      )}

      <label className="text-sm block">
        <span className="block text-gray-700 mb-1">Note (facultatif)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} className={champCls} />
      </label>

      <ElecBouton icon={Save} onClick={enregistrer} disabled={busy || indexStr.trim() === ''} className="w-full py-3" data-elec-enregistrer-releve>
        Enregistrer le relevé
      </ElecBouton>
    </div>
  );
}

// ───────────────────────────── Historique ─────────────────────────────
function Historique({
  compteur,
  releves,
  droits,
  onChange,
}: {
  compteur: ElecCompteurLocal;
  releves: ElecReleveLocal[];
  droits: ElecDroits;
  onChange: () => Promise<void>;
}) {
  const { userId } = useGestionEau();
  const [plein, setPlein] = useState<string | null>(null);
  const [edition, setEdition] = useState<{ id: string; valeur: string } | null>(null);

  const recents = releves.slice().reverse();
  const points = useMemo(() => {
    const out: Array<{ date: string; parJour: number }> = [];
    for (let i = 1; i < releves.length; i++) {
      const a = releves[i - 1];
      const b = releves[i];
      if (b.rupture_index || b.index < a.index) continue;
      const pj = consoParJour(b.index - a.index, joursEntre(a.timestamp, b.timestamp));
      if (pj != null) out.push({ date: fmtDateMg(b.timestamp).split(' ')[0], parJour: Math.round(pj * 100) / 100 });
    }
    return out;
  }, [releves]);

  const enregistrerEdition = async () => {
    if (!edition) return;
    const l = lireIndex(edition.valeur, compteur.decimales);
    if (!l.ok) return void toast.error(l.message);
    await updateReleveElec(edition.id, { index: l.value });
    setEdition(null);
    toast.success('Relevé modifié');
    await onChange();
  };

  const supprimer = async (r: ElecReleveLocal) => {
    if (!(await showConfirm(`Supprimer le relevé ${fmtIndex(r.index, compteur.decimales)} kWh du ${fmtDateMg(r.timestamp)} ?`, 'Suppression', { variant: 'danger', confirmText: 'Supprimer' }))) return;
    await deleteReleveElec(r.id);
    toast.success('Relevé supprimé');
    await onChange();
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3" data-elec-historique={compteur.code}>
      <h4 className="text-sm font-semibold text-rtb-green mb-2">Historique de {compteur.code}</h4>
      {points.length >= 2 && (
        <div className="h-36 -mx-1 mb-2" aria-label="Consommation par jour">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v} kWh/j`, 'Par jour']} />
              <Bar dataKey="parJour" fill={RTB_GREEN} stroke={RTB_GOLD} isAnimationActive={false} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {recents.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucun relevé.
          {compteur.index_reprise != null && <> Point de départ : reprise {fmtIndex(compteur.index_reprise, compteur.decimales)} kWh.</>}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {recents.map((r) => {
            const modifiable = peutModifierReleve(r, userId, droits);
            const mien = !!userId && r.agent_id === userId;
            return (
              <li key={r.id} className="py-2 flex items-start gap-3" data-elec-ligne-releve={r.id}>
                {r.photo_url ? (
                  <button type="button" onClick={() => setPlein(r.photo_url)} className="flex-shrink-0" aria-label="Voir la photo en plein écran">
                    <img src={r.photo_url} alt="" className="w-11 h-11 rounded-lg object-cover border border-rtb-gold/40" data-elec-photo-historique />
                  </button>
                ) : (
                  <span className="w-11 h-11 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-4 h-4" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {edition?.id === r.id ? (
                    <div className="flex gap-2">
                      <input
                        value={edition.valeur}
                        onChange={(e) => setEdition({ id: r.id, valeur: e.target.value })}
                        inputMode={compteur.decimales === 0 ? 'numeric' : 'decimal'}
                        className={champCls}
                        aria-label="Nouvel index"
                        data-elec-edition-index
                      />
                      <ElecBouton icon={Save} onClick={enregistrerEdition} aria-label="Enregistrer" data-elec-edition-ok>OK</ElecBouton>
                      <button type="button" onClick={() => setEdition(null)} aria-label="Annuler" className="w-11 h-11 inline-flex items-center justify-center text-gray-500">
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-gray-900">
                        {fmtIndex(r.index, compteur.decimales)} kWh
                        {r.rupture_index && <span className="ml-1.5 text-[11px] font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5">rupture</span>}
                        {r._dirty && <span className="ml-1.5 text-[11px] font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5">à envoyer</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        {fmtDateMg(r.timestamp)} · {ORIGINE_LIBELLE[r.origine ?? 'terrain']} · {mien ? 'vous' : 'un autre compte'}
                      </div>
                      {r.note && <div className="text-xs text-gray-600 mt-0.5">{r.note}</div>}
                    </>
                  )}
                </div>
                {modifiable && edition?.id !== r.id && (
                  <div className="flex flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setEdition({ id: r.id, valeur: String(r.index).replace('.', ',') })}
                      aria-label="Modifier le relevé"
                      className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-rtb-green hover:bg-rtb-gold/10"
                      data-elec-modifier
                    >
                      <NotebookPen className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => supprimer(r)}
                      aria-label="Supprimer le relevé"
                      className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"
                      data-elec-supprimer
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {droits.saisie && !droits.gestion && (
        <p className="text-xs text-gray-500 mt-2">Vous pouvez corriger vos propres relevés pendant 48 heures.</p>
      )}
      {plein && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo du compteur"
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPlein(null)}
          data-elec-photo-plein-ecran
        >
          <img src={plein} alt={`Cadran du compteur ${compteur.code}`} className="max-w-full max-h-full object-contain rounded-lg" />
          <button type="button" onClick={() => setPlein(null)} aria-label="Fermer" className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/20 text-white inline-flex items-center justify-center">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────── Vue du cycle ─────────────────────────────
function VueCycle({ chargement, compteurs, releves }: Donnees) {
  const defaut = cycleParDefaut();
  const choix = useMemo(() => {
    const out: string[] = [];
    let m = defaut;
    for (let i = 0; i < 12; i++) {
      out.push(m);
      m = moisPrecedent(m);
    }
    return out;
  }, [defaut]);
  const [mois, setMois] = useState(defaut);
  const cycle = useMemo(() => calculerCycle(mois, compteurs, releves), [mois, compteurs, releves]);

  return (
    <EauPageShell
      title="Cycle du mois"
      subtitle="Contrôle des relevés, sans montant"
      tone="elec"
      aide={{
        id: 'elec-cycle',
        quoi: <>Le contrôle d’un mois : pour chaque compteur, l’index de début, l’index de fin, la consommation et la consommation par jour.</>,
        comment: (
          <>
            Choisissez le mois. L’index de début est le dernier relevé du mois d’avant (ou l’index de reprise pour le
            premier mois tenu dans l’application) ; l’index de fin est le dernier relevé du mois, ou celui du 1er au
            matin du mois suivant. Les compteurs encore sans relevé sont listés en tête.
          </>
        ),
      }}
    >
      <label className="block text-sm mb-3">
        <span className="block text-gray-700 mb-1">Mois</span>
        <select value={mois} onChange={(e) => setMois(e.target.value)} className={champCls} data-elec-mois>
          {choix.map((m) => <option key={m} value={m}>{libelleMois(m)}</option>)}
        </select>
      </label>
      {chargement ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : compteurs.length === 0 ? (
        <ElecVide icon={Zap} titre="Aucun compteur" texte="Créez d’abord les clients et leurs compteurs." />
      ) : (
        <div className="space-y-3" data-elec-cycle>
          {cycle.manquants.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" data-elec-manquants>
              <strong>{cycle.manquants.length} compteur{cycle.manquants.length > 1 ? 's' : ''} à relever</strong> :{' '}
              {trierCompteurs(cycle.manquants).map((c) => c.code).join(', ')}
            </div>
          )}
          <div className="rounded-xl bg-rtb-green text-white px-4 py-3 flex items-center justify-between">
            <span className="text-sm">Total {deMois(mois)}</span>
            <strong className="text-xl" data-elec-total>{fmtKwh(cycle.totalKwh)}</strong>
          </div>
          {cycle.lignes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Aucun relevé pour ce mois.</p>
          ) : (
            <ul className="space-y-2">
              {cycle.lignes.map((l) => (
                <li key={l.compteur.id} className="rounded-xl border border-rtb-gold/30 bg-white px-3 py-2.5" data-elec-ligne-cycle={l.compteur.code}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-rtb-green">{l.compteur.code}</span>
                    <span className="text-sm font-semibold" data-elec-cycle-conso>{fmtKwh(l.conso)}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-600">
                    <dt>Début</dt>
                    <dd className="text-right" data-elec-cycle-debut>
                      {l.debut ? `${fmtIndex(l.debut.index, l.compteur.decimales)}${l.debut.source === 'reprise' ? ' (reprise)' : ''}` : '-'}
                    </dd>
                    <dt>Fin</dt>
                    <dd className="text-right" data-elec-cycle-fin>{l.fin ? fmtIndex(l.fin.index, l.compteur.decimales) : '-'}</dd>
                    <dt>Jours</dt>
                    <dd className="text-right">{l.jours == null ? '-' : l.jours.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</dd>
                    <dt>Par jour</dt>
                    <dd className="text-right" data-elec-cycle-par-jour>{fmtKwhJ(l.parJour)}</dd>
                    <dt>Photo · origine</dt>
                    <dd className="text-right">
                      {l.photo ? 'oui' : 'non'} · {l.origine ? ORIGINE_LIBELLE[l.origine] : '-'}
                    </dd>
                  </dl>
                  {l.rupture && <p className="mt-1 text-xs text-amber-800">Rupture d’index dans le mois : intervalle rompu non compté.</p>}
                  {l.fin && <p className="mt-0.5 text-[11px] text-gray-400">Relevé de fin : {fmtDateMg(l.fin.timestamp)}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </EauPageShell>
  );
}

