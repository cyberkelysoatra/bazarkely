/**
 * Clients et compteurs RTB Énergie /gestion-eau/elec/clients (ELEC-CC-02), sur le modèle
 * de EauCompteursPage (création en haut, édition en tiroir sous la carte). Écriture :
 * admin et gestion électricité ; lecture seule réelle (aucun bouton) pour promoteur et
 * lecture électricité. Rien n'est pré-rempli : RTB saisit ses clients et compteurs.
 */
import { Fragment, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, Gauge, Plus, Save, X, NotebookPen, Trash2, Search, Replace, Layers, Building } from 'lucide-react';
import EauPageShell from '../EauPageShell';
import EauTabs from '../EauTabs';
import { ElecBouton, ElecVide, LectureSeule, Pastille, StatutPastille, Tiroir, champCls, useDonneesElec, STATUT_LIBELLE } from './ElecUi';
import {
  CLIENT_VIDE,
  COMPTEUR_VIDE,
  codeDejaPris,
  deleteClient,
  deleteCompteurElec,
  remplacerCompteur,
  saveClient,
  saveCompteurElec,
  type ClientInput,
  type CompteurElecInput,
} from '../../services/eauElecService';
import { fmtIndex, lireIndex, trierCompteurs } from '../../utils/elecReleves';
import { showConfirm } from '../../../../utils/dialogUtils';
import type { ElecClientLocal, ElecCompteurLocal, ElecStatut } from '../../types/gestionEau';

const STATUTS: ElecStatut[] = ['actif', 'pause', 'arrete'];
type Mode = { kind: 'new' } | { kind: 'edit'; id: string } | { kind: 'remplacer'; id: string };

/** Date du jour à Madagascar (`YYYY-MM-DD`). */
function aujourdhuiMg(): string {
  return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export default function EauElecClientsPage() {
  const { chargement, clients, compteurs, releves, droits, relire } = useDonneesElec();
  const ecriture = droits.gestion;
  const [onglet, setOnglet] = useState<'clients' | 'compteurs'>('clients');

  return (
    <div>
      <EauTabs
        tone="elec"
        active={onglet}
        onChange={(k) => setOnglet(k as 'clients' | 'compteurs')}
        tabs={[
          { key: 'clients', label: 'Clients', icon: Users },
          { key: 'compteurs', label: 'Compteurs', icon: Gauge },
        ]}
      />
      {onglet === 'clients' ? (
        <OngletClients chargement={chargement} clients={clients} compteurs={compteurs} ecriture={ecriture} relire={relire} />
      ) : (
        <OngletCompteurs
          chargement={chargement}
          clients={clients}
          compteurs={compteurs}
          nbReleves={(id) => releves.get(id)?.length ?? 0}
          ecriture={ecriture}
          relire={relire}
          allerClients={() => setOnglet('clients')}
        />
      )}
    </div>
  );
}

// ───────────────────────────── Clients ─────────────────────────────
function OngletClients({
  chargement,
  clients,
  compteurs,
  ecriture,
  relire,
}: {
  chargement: boolean;
  clients: ElecClientLocal[];
  compteurs: ElecCompteurLocal[];
  ecriture: boolean;
  relire: () => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [form, setForm] = useState<ClientInput>(CLIENT_VIDE);
  const [recherche, setRecherche] = useState('');
  const [busy, setBusy] = useState(false);

  const actifsParClient = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of compteurs) if (c.statut === 'actif') m.set(c.client_id, (m.get(c.client_id) ?? 0) + 1);
    return m;
  }, [compteurs]);
  const totalParClient = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of compteurs) m.set(c.client_id, (m.get(c.client_id) ?? 0) + 1);
    return m;
  }, [compteurs]);

  const q = recherche.trim().toLowerCase();
  const liste = q
    ? clients.filter((c) => [c.code, c.nom, c.raison_sociale ?? ''].some((x) => x.toLowerCase().includes(q)))
    : clients;

  const ouvrirNouveau = () => {
    setForm(CLIENT_VIDE);
    setMode({ kind: 'new' });
  };
  const ouvrirEdition = (c: ElecClientLocal) => {
    if (mode?.kind === 'edit' && mode.id === c.id) return setMode(null);
    const { id: _id, created_at: _c, updated_at: _u, _dirty, ...rest } = c;
    setForm(rest);
    setMode({ kind: 'edit', id: c.id });
  };

  const enregistrer = async () => {
    if (!ecriture || busy) return;
    const code = form.code.trim();
    if (!code || !form.nom.trim()) {
      toast.error('Le code et le nom sont requis');
      return;
    }
    const id = mode?.kind === 'edit' ? mode.id : undefined;
    if (codeDejaPris(code, clients, id)) {
      toast.error(`Le code « ${code} » est déjà pris par un autre client`);
      return;
    }
    setBusy(true);
    try {
      const vide = (v: string | null) => (v && v.trim() ? v.trim() : null);
      await saveClient(
        {
          ...form,
          code,
          nom: form.nom.trim(),
          raison_sociale: vide(form.raison_sociale),
          adresse: vide(form.adresse),
          nif: vide(form.nif),
          stat: vide(form.stat),
          email: vide(form.email),
          telephone: vide(form.telephone),
          notes_internes: vide(form.notes_internes),
        },
        id
      );
      toast.success(id ? 'Client mis à jour' : 'Client créé');
      setMode(null);
      await relire();
    } finally {
      setBusy(false);
    }
  };

  const supprimer = async (c: ElecClientLocal) => {
    if (!ecriture) return;
    if (!(await showConfirm(`Supprimer le client « ${c.code} · ${c.nom} » ?`, 'Suppression', { variant: 'danger', confirmText: 'Supprimer' }))) return;
    if (!(await deleteClient(c.id))) {
      toast.error('Ce client a des compteurs : passez-le plutôt « arrêté »');
      return;
    }
    toast.success('Client supprimé');
    await relire();
  };

  const formulaire = (edition: boolean) => (
    <FormClient form={form} setForm={setForm} edition={edition} busy={busy} onSave={enregistrer} onCancel={() => setMode(null)} />
  );

  return (
    <EauPageShell
      title="Clients"
      subtitle="Clients de RTB Énergie et leurs compteurs"
      tone="elec"
      actions={ecriture ? <ElecBouton icon={Plus} onClick={ouvrirNouveau}>Nouveau</ElecBouton> : <LectureSeule />}
      aide={{
        id: 'elec-clients',
        quoi: <>La liste des clients qui achètent l’électricité de RTB Énergie, dans le domaine ou en dehors (un hôtel par exemple).</>,
        comment: (
          <>
            Touchez « Nouveau » pour créer un client : un code court (par exemple « A »), son nom et ses coordonnées.
            « Facture groupée » réunit tous ses compteurs sur une seule facture. Un client qui a des compteurs ne se
            supprime pas : passez-le « arrêté ».
          </>
        ),
      }}
    >
      {mode?.kind === 'new' && formulaire(false)}
      <label className="relative block mb-3">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un client (code ou nom)"
          aria-label="Rechercher un client"
          className={`${champCls} pl-9`}
        />
      </label>
      {chargement ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : clients.length === 0 ? (
        <ElecVide
          icon={Users}
          titre="Aucun client"
          texte={ecriture ? 'Commencez par créer les clients, puis leurs compteurs.' : 'Aucun client enregistré pour l’instant.'}
          action={ecriture ? <ElecBouton icon={Plus} onClick={ouvrirNouveau}>Nouveau client</ElecBouton> : undefined}
        />
      ) : liste.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">Aucun client ne correspond à « {recherche} ».</p>
      ) : (
        <div className="space-y-2" data-elec-liste-clients>
          {liste.map((c) => (
            <Fragment key={c.id}>
              <div className="bg-white border border-rtb-gold/30 rounded-xl px-3 py-2.5 flex items-center gap-3" data-elec-client={c.code}>
                <span className="w-11 h-11 rounded-xl bg-rtb-green text-rtb-gold font-bold flex items-center justify-center flex-shrink-0 text-sm">
                  {c.code.slice(0, 4)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 truncate">{c.nom}</div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-500">
                      {actifsParClient.get(c.id) ?? 0} compteur{(actifsParClient.get(c.id) ?? 0) > 1 ? 's' : ''} actif{(actifsParClient.get(c.id) ?? 0) > 1 ? 's' : ''}
                    </span>
                    {c.facture_groupee && <Pastille><Layers className="w-3 h-3" aria-hidden="true" />Facture groupée</Pastille>}
                    {c.hors_domaine && <Pastille tone="neutral"><Building className="w-3 h-3" aria-hidden="true" />Hors domaine</Pastille>}
                    <StatutPastille statut={c.statut} />
                  </div>
                </div>
                {ecriture && (
                  <div className="flex gap-1 flex-shrink-0">
                    <IconeAction label="Modifier" actif={mode?.kind === 'edit' && mode.id === c.id} onClick={() => ouvrirEdition(c)} icon={NotebookPen} />
                    {(totalParClient.get(c.id) ?? 0) === 0 && (
                      <IconeAction label="Supprimer" danger onClick={() => supprimer(c)} icon={Trash2} />
                    )}
                  </div>
                )}
              </div>
              {mode?.kind === 'edit' && mode.id === c.id && (
                <Tiroir>
                  <div className="pt-2">{formulaire(true)}</div>
                </Tiroir>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </EauPageShell>
  );
}

function FormClient({
  form,
  setForm,
  edition,
  busy,
  onSave,
  onCancel,
}: {
  form: ClientInput;
  setForm: (f: ClientInput) => void;
  edition: boolean;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const t = (k: keyof ClientInput, libelle: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="text-sm block">
      <span className="block text-gray-700 mb-1">{libelle}</span>
      <input
        value={(form[k] as string | null) ?? ''}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        className={champCls}
        data-champ={k}
        {...props}
      />
    </label>
  );
  return (
    <div className="rounded-2xl border border-rtb-gold/50 bg-rtb-gold/5 p-4 space-y-3 mb-3" data-elec-form-client>
      <h3 className="font-semibold text-rtb-green">{edition ? 'Modifier le client' : 'Nouveau client'}</h3>
      <div className="grid grid-cols-2 gap-3">
        {t('code', 'Code *', { placeholder: 'A' })}
        <label className="text-sm block">
          <span className="block text-gray-700 mb-1">Statut</span>
          <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value as ElecStatut })} className={champCls} data-champ="statut">
            {STATUTS.map((s) => <option key={s} value={s}>{STATUT_LIBELLE[s]}</option>)}
          </select>
        </label>
        <div className="col-span-2">{t('nom', 'Nom *')}</div>
        <div className="col-span-2">{t('raison_sociale', 'Raison sociale (seconde ligne, facultative)')}</div>
        <div className="col-span-2">{t('adresse', 'Adresse')}</div>
        {t('nif', 'NIF', { inputMode: 'numeric' })}
        {t('stat', 'STAT', { inputMode: 'numeric' })}
        {t('email', 'E-mail', { type: 'email', inputMode: 'email' })}
        {t('telephone', 'Téléphone', { type: 'tel', inputMode: 'tel' })}
      </div>
      <div className="flex flex-col gap-1">
        <Case checked={form.facture_groupee} onChange={(v) => setForm({ ...form, facture_groupee: v })} libelle="Facture groupée (tous ses compteurs sur une seule facture)" champ="facture_groupee" />
        <Case checked={form.hors_domaine} onChange={(v) => setForm({ ...form, hors_domaine: v })} libelle="Hors du domaine" champ="hors_domaine" />
      </div>
      <label className="text-sm block">
        <span className="block text-gray-700 mb-1">Notes internes</span>
        <textarea
          value={form.notes_internes ?? ''}
          onChange={(e) => setForm({ ...form, notes_internes: e.target.value })}
          rows={2}
          className={champCls}
        />
      </label>
      <div className="flex gap-2">
        <ElecBouton icon={edition ? Save : Plus} onClick={onSave} disabled={busy} className="flex-1" data-elec-enregistrer-client>
          {edition ? 'Enregistrer' : 'Créer'}
        </ElecBouton>
        <ElecBouton icon={X} variante="secondaire" onClick={onCancel}>Annuler</ElecBouton>
      </div>
    </div>
  );
}

// ───────────────────────────── Compteurs ─────────────────────────────
function OngletCompteurs({
  chargement,
  clients,
  compteurs,
  nbReleves,
  ecriture,
  relire,
  allerClients,
}: {
  chargement: boolean;
  clients: ElecClientLocal[];
  compteurs: ElecCompteurLocal[];
  nbReleves: (id: string) => number;
  ecriture: boolean;
  relire: () => Promise<void>;
  allerClients: () => void;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [form, setForm] = useState<CompteurElecInput>(COMPTEUR_VIDE);
  const [repriseStr, setRepriseStr] = useState('');
  const [busy, setBusy] = useState(false);

  const parCode = useMemo(() => new Map(compteurs.map((c) => [c.id, c])), [compteurs]);
  const groupes = useMemo(() => {
    const tries = trierCompteurs(compteurs);
    return clients
      .map((cl) => ({ client: cl, compteurs: tries.filter((c) => c.client_id === cl.id) }))
      .filter((g) => g.compteurs.length > 0);
  }, [clients, compteurs]);

  const ouvrirNouveau = () => {
    setForm({ ...COMPTEUR_VIDE, client_id: clients[0]?.id ?? '' });
    setRepriseStr('');
    setMode({ kind: 'new' });
  };
  const ouvrirEdition = (c: ElecCompteurLocal) => {
    if (mode?.kind === 'edit' && mode.id === c.id) return setMode(null);
    const { id: _id, created_at: _c, updated_at: _u, _dirty, ...rest } = c;
    setForm(rest);
    setRepriseStr(c.index_reprise == null ? '' : String(c.index_reprise).replace('.', ','));
    setMode({ kind: 'edit', id: c.id });
  };

  const enregistrer = async () => {
    if (!ecriture || busy) return;
    const code = form.code.trim();
    if (!code || !form.bien.trim() || !form.client_id) {
      toast.error('Le code, le bien et le client sont requis');
      return;
    }
    const id = mode?.kind === 'edit' ? mode.id : undefined;
    if (codeDejaPris(code, compteurs, id)) {
      toast.error(`Le code « ${code} » existe déjà : chaque compteur a un code unique`);
      return;
    }
    let reprise: number | null = null;
    if (repriseStr.trim() !== '') {
      const r = lireIndex(repriseStr, form.decimales);
      if (!r.ok) {
        toast.error(`Index de reprise : ${r.message}`);
        return;
      }
      reprise = r.value;
    }
    setBusy(true);
    try {
      await saveCompteurElec(
        {
          ...form,
          code,
          bien: form.bien.trim(),
          index_reprise: reprise,
          date_index_reprise: reprise == null ? null : form.date_index_reprise || null,
          date_mise_en_service: form.date_mise_en_service || null,
          date_arret: form.statut === 'arrete' ? form.date_arret || aujourdhuiMg() : null,
          note: form.note && form.note.trim() ? form.note.trim() : null,
        },
        id
      );
      toast.success(id ? 'Compteur mis à jour' : 'Compteur créé');
      setMode(null);
      await relire();
    } finally {
      setBusy(false);
    }
  };

  const supprimer = async (c: ElecCompteurLocal) => {
    if (!ecriture) return;
    if (!(await showConfirm(`Supprimer le compteur « ${c.code} » ?`, 'Suppression', { variant: 'danger', confirmText: 'Supprimer' }))) return;
    if (!(await deleteCompteurElec(c.id))) {
      toast.error('Ce compteur a des relevés : passez-le « arrêté » pour garder son historique');
      return;
    }
    toast.success('Compteur supprimé');
    await relire();
  };

  return (
    <EauPageShell
      title="Compteurs"
      subtitle="Compteurs d’électricité, groupés par client"
      tone="elec"
      actions={ecriture ? (clients.length > 0 ? <ElecBouton icon={Plus} onClick={ouvrirNouveau}>Nouveau</ElecBouton> : undefined) : <LectureSeule />}
      aide={{
        id: 'elec-compteurs',
        quoi: <>Chaque compteur porte le code du carnet du releveur (L1, V8S, L2V10, H1…), le bien où il est posé et le client qui paie.</>,
        comment: (
          <>
            L’échelle est le nombre de chiffres après la virgule affichés par le compteur (les tambours rouges
            après la virgule). L’index de reprise est l’index de clôture de la dernière facture du tableur : il sert
            de point de départ au premier cycle facturé dans l’application. Un compteur changé se « remplace » :
            l’ancien est arrêté, son historique reste.
          </>
        ),
      }}
    >
      {mode?.kind === 'new' && (
        <FormCompteur form={form} setForm={setForm} clients={clients} repriseStr={repriseStr} setRepriseStr={setRepriseStr} edition={false} busy={busy} onSave={enregistrer} onCancel={() => setMode(null)} />
      )}
      {chargement ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : clients.length === 0 ? (
        <ElecVide
          icon={Users}
          titre="Aucun client"
          texte="Un compteur appartient toujours à un client : créez d’abord le client."
          action={ecriture ? <ElecBouton icon={Users} onClick={allerClients}>Aller aux clients</ElecBouton> : undefined}
        />
      ) : groupes.length === 0 ? (
        <ElecVide
          icon={Gauge}
          titre="Aucun compteur"
          texte={ecriture ? 'Créez les compteurs de chaque client.' : 'Aucun compteur enregistré pour l’instant.'}
          action={ecriture ? <ElecBouton icon={Plus} onClick={ouvrirNouveau}>Nouveau compteur</ElecBouton> : undefined}
        />
      ) : (
        <div className="space-y-4" data-elec-liste-compteurs>
          {groupes.map(({ client, compteurs: liste }) => (
            <section key={client.id}>
              <h3 className="text-sm font-semibold text-rtb-green mb-1.5 flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-rtb-green text-rtb-gold text-xs">{client.code}</span>
                {client.nom}
              </h3>
              <div className="space-y-2">
                {liste.map((c) => (
                  <Fragment key={c.id}>
                    <div className={`bg-white border rounded-xl px-3 py-2.5 flex items-center gap-3 ${c.statut === 'arrete' ? 'border-gray-200 opacity-75' : 'border-rtb-gold/30'}`} data-elec-compteur={c.code}>
                      <span className="min-w-[3rem] px-2 h-11 rounded-xl bg-rtb-gold/15 text-rtb-green font-bold flex items-center justify-center text-sm flex-shrink-0">
                        {c.code}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-900">
                          Bien <strong>{c.bien}</strong> · {c.decimales} décimale{c.decimales > 1 ? 's' : ''}
                          {c.ordre != null && <> · tournée n° {c.ordre}</>}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                          <StatutPastille statut={c.statut} />
                          {c.index_reprise != null && <span>reprise {fmtIndex(c.index_reprise, c.decimales)} kWh</span>}
                          {c.remplace_compteur_id && <span>remplace {parCode.get(c.remplace_compteur_id)?.code ?? 'un ancien compteur'}</span>}
                          {c.statut === 'arrete' && c.date_arret && <span>arrêté le {c.date_arret.split('-').reverse().join('/')}</span>}
                          <span>{nbReleves(c.id)} relevé{nbReleves(c.id) > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      {ecriture && (
                        <div className="flex gap-1 flex-shrink-0">
                          <IconeAction label="Modifier" actif={mode?.kind === 'edit' && mode.id === c.id} onClick={() => ouvrirEdition(c)} icon={NotebookPen} />
                          {c.statut !== 'arrete' && (
                            <IconeAction
                              label="Remplacer le compteur"
                              actif={mode?.kind === 'remplacer' && mode.id === c.id}
                              onClick={() => setMode(mode?.kind === 'remplacer' && mode.id === c.id ? null : { kind: 'remplacer', id: c.id })}
                              icon={Replace}
                            />
                          )}
                          {nbReleves(c.id) === 0 && <IconeAction label="Supprimer" danger onClick={() => supprimer(c)} icon={Trash2} />}
                        </div>
                      )}
                    </div>
                    {mode?.kind === 'edit' && mode.id === c.id && (
                      <Tiroir>
                        <div className="pt-2">
                          <FormCompteur form={form} setForm={setForm} clients={clients} repriseStr={repriseStr} setRepriseStr={setRepriseStr} edition busy={busy} onSave={enregistrer} onCancel={() => setMode(null)} />
                        </div>
                      </Tiroir>
                    )}
                    {mode?.kind === 'remplacer' && mode.id === c.id && (
                      <Tiroir>
                        <div className="pt-2">
                          <FormRemplacement
                            ancien={c}
                            compteurs={compteurs}
                            onDone={async () => {
                              setMode(null);
                              await relire();
                            }}
                            onCancel={() => setMode(null)}
                          />
                        </div>
                      </Tiroir>
                    )}
                  </Fragment>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </EauPageShell>
  );
}

function FormCompteur({
  form,
  setForm,
  clients,
  repriseStr,
  setRepriseStr,
  edition,
  busy,
  onSave,
  onCancel,
}: {
  form: CompteurElecInput;
  setForm: (f: CompteurElecInput) => void;
  clients: ElecClientLocal[];
  repriseStr: string;
  setRepriseStr: (v: string) => void;
  edition: boolean;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rtb-gold/50 bg-rtb-gold/5 p-4 space-y-3 mb-3" data-elec-form-compteur>
      <h3 className="font-semibold text-rtb-green">{edition ? 'Modifier le compteur' : 'Nouveau compteur'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm block">
          <span className="block text-gray-700 mb-1">Code *</span>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="L1" className={champCls} data-champ="code" />
        </label>
        <label className="text-sm block">
          <span className="block text-gray-700 mb-1">Bien *</span>
          <input value={form.bien} onChange={(e) => setForm({ ...form, bien: e.target.value })} placeholder="V4" className={champCls} data-champ="bien" />
        </label>
        <label className="text-sm block col-span-2">
          <span className="block text-gray-700 mb-1">Client *</span>
          <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className={champCls} data-champ="client_id">
            {clients.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.nom}</option>)}
          </select>
        </label>
        <label className="text-sm block">
          <span className="block text-gray-700 mb-1">Échelle</span>
          <select value={form.decimales} onChange={(e) => setForm({ ...form, decimales: Number(e.target.value) })} className={champCls} data-champ="decimales">
            {[0, 1, 2, 3].map((d) => <option key={d} value={d}>{d} décimale{d > 1 ? 's' : ''}</option>)}
          </select>
        </label>
        <label className="text-sm block">
          <span className="block text-gray-700 mb-1">Statut</span>
          <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value as ElecStatut })} className={champCls} data-champ="statut">
            {STATUTS.map((s) => <option key={s} value={s}>{STATUT_LIBELLE[s]}</option>)}
          </select>
        </label>
        <p className="col-span-2 text-xs text-gray-500 -mt-1">
          Échelle : comptez les tambours après la virgule sur le cadran (souvent 2 ; 0 si le compteur n’affiche que des entiers).
        </p>
        <label className="text-sm block">
          <span className="block text-gray-700 mb-1">Ordre de tournée</span>
          <input
            type="text"
            inputMode="numeric"
            value={form.ordre ?? ''}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              setForm({ ...form, ordre: v === '' ? null : Number(v) });
            }}
            className={champCls}
            data-champ="ordre"
          />
        </label>
        <label className="text-sm block">
          <span className="block text-gray-700 mb-1">Mise en service</span>
          <input type="date" value={form.date_mise_en_service ?? ''} onChange={(e) => setForm({ ...form, date_mise_en_service: e.target.value || null })} className={champCls} />
        </label>
        <label className="text-sm block">
          <span className="block text-gray-700 mb-1">Index de reprise (kWh)</span>
          <input
            type="text"
            inputMode={form.decimales === 0 ? 'numeric' : 'decimal'}
            value={repriseStr}
            onChange={(e) => setRepriseStr(e.target.value)}
            className={champCls}
            data-champ="index_reprise"
          />
        </label>
        <label className="text-sm block">
          <span className="block text-gray-700 mb-1">Date de l’index de reprise</span>
          <input type="date" value={form.date_index_reprise ?? ''} onChange={(e) => setForm({ ...form, date_index_reprise: e.target.value || null })} className={champCls} data-champ="date_index_reprise" />
        </label>
        <p className="col-span-2 text-xs text-gray-500 -mt-1">
          Index de clôture de la dernière facture du tableur ; sert de point de départ au premier cycle facturé dans l’app.
        </p>
        {form.statut === 'arrete' && (
          <label className="text-sm block col-span-2">
            <span className="block text-gray-700 mb-1">Date d’arrêt</span>
            <input type="date" value={form.date_arret ?? ''} onChange={(e) => setForm({ ...form, date_arret: e.target.value || null })} className={champCls} />
          </label>
        )}
        <label className="text-sm block col-span-2">
          <span className="block text-gray-700 mb-1">Note</span>
          <input value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} className={champCls} />
        </label>
      </div>
      <div className="flex gap-2">
        <ElecBouton icon={edition ? Save : Plus} onClick={onSave} disabled={busy} className="flex-1" data-elec-enregistrer-compteur>
          {edition ? 'Enregistrer' : 'Créer'}
        </ElecBouton>
        <ElecBouton icon={X} variante="secondaire" onClick={onCancel}>Annuler</ElecBouton>
      </div>
    </div>
  );
}

function FormRemplacement({
  ancien,
  compteurs,
  onDone,
  onCancel,
}: {
  ancien: ElecCompteurLocal;
  compteurs: ElecCompteurLocal[];
  onDone: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState('');
  const [date, setDate] = useState(aujourdhuiMg());
  const [depart, setDepart] = useState('0');
  const [decimales, setDecimales] = useState(ancien.decimales);
  const [busy, setBusy] = useState(false);

  const valider = async () => {
    const c = code.trim();
    if (!c) return void toast.error('Code du nouveau compteur requis');
    if (codeDejaPris(c, compteurs)) return void toast.error(`Le code « ${c} » existe déjà`);
    const r = lireIndex(depart, decimales);
    if (!r.ok) return void toast.error(`Index de départ : ${r.message}`);
    if (!(await showConfirm(
      `Le compteur ${ancien.code} passe « arrêté » au ${date.split('-').reverse().join('/')} ; le compteur ${c} le remplace sur le bien ${ancien.bien}.`,
      'Remplacer le compteur',
      { variant: 'warning', confirmText: 'Remplacer' }
    ))) return;
    setBusy(true);
    try {
      await remplacerCompteur({ ancienId: ancien.id, dateArret: date, nouveauCode: c, indexDepart: r.value, decimales });
      toast.success(`${c} remplace ${ancien.code}`);
      await onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4 space-y-3 mb-1" data-elec-form-remplacement>
      <h3 className="font-semibold text-rtb-green flex items-center gap-2">
        <Replace className="w-4 h-4" aria-hidden="true" /> Remplacer {ancien.code}
      </h3>
      <p className="text-xs text-gray-600">
        L’ancien compteur est arrêté (plus de relevé ni de facture) et garde son historique. Le nouveau reprend le
        bien {ancien.bien} et le même client, à partir de l’index de départ (souvent 0).
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm block">
          <span className="block text-gray-700 mb-1">Code du nouveau *</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} className={champCls} data-champ="nouveau_code" />
        </label>
        <label className="text-sm block">
          <span className="block text-gray-700 mb-1">Date du changement</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={champCls} />
        </label>
        <label className="text-sm block">
          <span className="block text-gray-700 mb-1">Index de départ</span>
          <input type="text" inputMode="decimal" value={depart} onChange={(e) => setDepart(e.target.value)} className={champCls} data-champ="index_depart" />
        </label>
        <label className="text-sm block">
          <span className="block text-gray-700 mb-1">Échelle</span>
          <select value={decimales} onChange={(e) => setDecimales(Number(e.target.value))} className={champCls}>
            {[0, 1, 2, 3].map((d) => <option key={d} value={d}>{d} décimale{d > 1 ? 's' : ''}</option>)}
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <ElecBouton icon={Replace} onClick={valider} disabled={busy} className="flex-1" data-elec-valider-remplacement>Remplacer</ElecBouton>
        <ElecBouton icon={X} variante="secondaire" onClick={onCancel}>Annuler</ElecBouton>
      </div>
    </div>
  );
}

function Case({ checked, onChange, libelle, champ }: { checked: boolean; onChange: (v: boolean) => void; libelle: string; champ: string }) {
  return (
    <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-champ={champ}
        className="w-5 h-5 rounded border-gray-300 text-rtb-green focus:ring-rtb-gold"
      />
      {libelle}
    </label>
  );
}

function IconeAction({
  label,
  icon: Icon,
  onClick,
  actif = false,
  danger = false,
}: {
  label: string;
  icon: typeof Plus;
  onClick: () => void;
  actif?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-expanded={danger ? undefined : actif}
      className={`inline-flex items-center justify-center w-11 h-11 rounded-xl border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rtb-gold ${
        danger
          ? 'border-transparent text-rose-600 hover:bg-rose-50'
          : actif
          ? 'bg-rtb-green border-rtb-green text-white'
          : 'bg-white border-rtb-gold/50 text-rtb-green hover:bg-rtb-gold/10'
      }`}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}
