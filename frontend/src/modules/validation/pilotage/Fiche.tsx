// Screen 10 bis: new client and invitation (VC-20, VC-24). Client form saved with
// vc_admin_client_enregistrer; state of the latest questionnaire; WhatsApp message preview;
// « Inviter sur WhatsApp » / « Copier le lien » per person; preview of the invitation page
// (screen 1) from vc_invitation_apercu, so that Joël never opens the link while signed in.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BarreRetour, CARTE, Corps, PRIMAIRE, SECONDAIRE, Squelette } from '../composants/Mise';
import { Icone } from '../composants/Icones';
import { PageInvitation } from '../pages/Invitation';
import { NOM_CYCLE } from '../utils/regles';
import { verifierArbre } from '../utils/arbre';
import type { Apercu } from '../utils/types';
import {
  apercu as lireApercu,
  creerInvitation,
  enregistrerClient,
  ficheClient,
  type FicheClient,
  type PersonneClient,
  type QuestionnaireClient
} from './api';
import { CHAMP, DANGER, ETIQUETTE, EnTetePilotage, ErreurReseau, P_ATTENTE, P_INFO, P_NON, P_OK, Pilule } from './Commun';
import { adresseWhatsApp, dateCourte, lienInvitation, lignesCorrections, messageInvitation, numeroWhatsApp } from './regles';

interface PersonneForm {
  id?: string;
  cle: string;
  civilite: 'Madame' | 'Monsieur';
  nom: string;
  fonction: string;
  whatsapp: string;
  role: 'validant' | 'contributeur';
  rejoint?: boolean;
  revoque?: boolean;
  invitation?: PersonneClient['invitation'];
}

const RAISONS: Record<string, string> = {
  SANS_QUESTIONNAIRE_PUBLIE: 'Aucun questionnaire publié : publiez-en un avant d’inviter.',
  SANS_VALIDANT: 'Désignez d’abord un validant.',
  DEJA_INSCRITE: 'Cette personne a déjà rejoint le projet : plus besoin d’invitation.',
  ACCES_REVOQUE: 'L’accès de cette personne a été retiré.',
  UN_SEUL_VALIDANT: 'Un seul validant par projet : passez l’autre personne en contributeur.'
};

const VIDE: Omit<PersonneForm, 'cle'> = { civilite: 'Madame', nom: '', fonction: '', whatsapp: '', role: 'contributeur' };

/** Person form: a new person, or (with « cle ») the correction of a saved one (VC-44). */
type FormPersonne = typeof VIDE & { cle?: string; legende?: string };

function versForm(p: PersonneClient): PersonneForm {
  return {
    id: p.id,
    cle: p.id,
    civilite: p.civilite,
    nom: p.nom,
    fonction: p.fonction ?? '',
    whatsapp: p.whatsapp_fiche ?? p.whatsapp ?? '',
    role: p.role,
    rejoint: !!p.inscrit_at || p.invitation === 'utilisee' || !!p.email,
    revoque: !!p.revoque_at,
    invitation: p.invitation
  };
}

function libelleRole(p: Pick<PersonneForm, 'role' | 'civilite'>): string {
  if (p.role === 'validant') return p.civilite === 'Madame' ? 'Validante' : 'Validant';
  return p.civilite === 'Madame' ? 'Contributrice' : 'Contributeur';
}

/** Latest published questionnaire (the one the invitation announces) and its longest path. */
function publie(qs: QuestionnaireClient[]): { q: QuestionnaireClient; n: number } | null {
  const q = qs.filter((x) => x.etat === 'ouvert').sort((a, b) => Date.parse(b.publie_at ?? '') - Date.parse(a.publie_at ?? ''))[0];
  if (!q) return null;
  const n = verifierArbre((q.questions ?? []).map((x) => ({ numero: x.numero, choix: x.choix ?? [] }))).cheminMax;
  return { q, n };
}

function etatQuestionnaire(q: QuestionnaireClient): string {
  const base = `${NOM_CYCLE[q.type] ?? 'Document'}, version ${q.version}`;
  if (q.etat === 'brouillon') return `${base} : brouillon, saisi le ${dateCourte(q.cree_at)}`;
  if (q.etat === 'ouvert') return `${base} : publié le ${dateCourte(q.publie_at ?? q.cree_at)}`;
  if (q.etat === 'confirme') return `${base} : confirmé le ${dateCourte(q.confirme_at ?? q.cree_at)}`;
  if (q.etat === 'remplace') return `${base} : remplacé par une version plus récente`;
  return `${base} : clos`;
}

export default function Fiche() {
  const { id = 'nouveau' } = useParams();
  const nouveau = id === 'nouveau';
  const navigate = useNavigate();
  const [fiche, setFiche] = useState<FicheClient | null>(null);
  const [chargement, setChargement] = useState(!nouveau);
  const [erreurLecture, setErreurLecture] = useState(false);
  const [entreprise, setEntreprise] = useState('');
  const [nomCourt, setNomCourt] = useState('');
  const [reve, setReve] = useState('');
  const [personnes, setPersonnes] = useState<PersonneForm[]>([]);
  const [modifie, setModifie] = useState(false);
  const [ajout, setAjout] = useState<FormPersonne | null>(null);
  const [erreurAjout, setErreurAjout] = useState<Partial<Record<'nom' | 'fonction' | 'whatsapp' | 'role', string>>>({});
  const [erreursFiche, setErreursFiche] = useState<Partial<Record<'entreprise' | 'nomCourt' | 'reve' | 'personnes', string>>>({});
  const [envoiFiche, setEnvoiFiche] = useState(false);
  const [messageFiche, setMessageFiche] = useState<{ ok: boolean; texte: string } | null>(null);
  const [cible, setCible] = useState<string>('');
  const [jetons, setJetons] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [retourInvitation, setRetourInvitation] = useState<{ ok: boolean; texte: string } | null>(null);
  const [apercu, setApercu] = useState<Apercu | null>(null);
  // Saved people corrected since the last save (pill « À enregistrer »), and the leave dialog.
  const [corrigees, setCorrigees] = useState<string[]>([]);
  const [quitter, setQuitter] = useState<(() => void) | null>(null);

  // Unsaved changes: the browser warns before a reload or a closed tab as well.
  useEffect(() => {
    if (!modifie) return;
    const avertir = (ev: BeforeUnloadEvent) => {
      ev.preventDefault();
      ev.returnValue = '';
    };
    window.addEventListener('beforeunload', avertir);
    return () => window.removeEventListener('beforeunload', avertir);
  }, [modifie]);

  const charger = useCallback(async () => {
    if (nouveau) return;
    setChargement(true);
    setErreurLecture(false);
    try {
      const f = await ficheClient(id);
      setFiche(f);
      setEntreprise(f.client.entreprise);
      setNomCourt(f.client.nom_court);
      setReve(f.client.phrase_reve ?? '');
      const ps = f.personnes.map(versForm);
      setPersonnes(ps);
      setModifie(false);
      setCorrigees([]);
      setCible((c) => (ps.some((p) => p.id === c) ? c : (ps.find((p) => p.role === 'validant' && !p.revoque)?.id ?? ps.find((p) => !p.revoque)?.id ?? '')));
    } catch {
      setErreurLecture(true);
    } finally {
      setChargement(false);
    }
  }, [id, nouveau]);

  useEffect(() => {
    setFiche(null);
    setJetons({});
    setRetourInvitation(null);
    if (nouveau) {
      setEntreprise('');
      setNomCourt('');
      setReve('');
      setPersonnes([]);
      setChargement(false);
    } else void charger();
  }, [nouveau, charger]);

  const pub = useMemo(() => (fiche ? publie(fiche.questionnaires) : null), [fiche]);
  const dernier = fiche?.questionnaires[0] ?? null;
  const validant = personnes.find((p) => p.role === 'validant' && !p.revoque);
  const choisie = personnes.find((p) => p.id && p.id === cible) ?? null;
  // The number of a person who has joined is hers: read only in the correction form (VC-44).
  const numeroFige = !!ajout?.cle && !!personnes.find((p) => p.cle === ajout.cle)?.rejoint;
  const n = pub?.n ?? 0;
  const minutes = Math.max(n, 1);
  const jeton = choisie?.id ? jetons[choisie.id] : undefined;
  const message = messageInvitation({
    nomCourt: nomCourt || '…',
    phraseReve: reve,
    civilite: choisie?.civilite ?? validant?.civilite ?? 'Madame',
    nom: choisie?.nom ?? validant?.nom ?? '…',
    questions: n,
    minutes,
    lien: jeton ? lienInvitation(jeton) : 'https://1sakely.org/validation/i/…',
    type: pub?.q.type
  });

  // Reason why « Inviter » and « Copier le lien » are greyed (null = allowed).
  let raison: string | null = null;
  if (nouveau || !fiche) raison = 'Enregistrez d’abord la fiche.';
  else if (modifie) raison = 'Enregistrez d’abord vos changements.';
  else if (!validant) raison = RAISONS.SANS_VALIDANT;
  else if (!pub) raison = RAISONS.SANS_QUESTIONNAIRE_PUBLIE;
  else if (!choisie) raison = 'Choisissez la personne à inviter.';
  else if (choisie.revoque) raison = RAISONS.ACCES_REVOQUE;
  else if (choisie.rejoint) raison = `${choisie.civilite} ${choisie.nom} a déjà rejoint le projet : plus besoin d’invitation.`;
  const numero = choisie ? numeroWhatsApp(choisie.whatsapp) : null;
  const raisonWhatsApp = raison ?? (numero ? null : 'Numéro WhatsApp manquant : utilisez « Copier le lien ».');

  const changer = (f: () => void) => {
    f();
    setModifie(true);
    setMessageFiche(null);
  };

  function validerAjout(a: FormPersonne): boolean {
    const e: typeof erreurAjout = {};
    const corrigee = a.cle ? personnes.find((p) => p.cle === a.cle) : undefined;
    if (!a.nom.trim()) e.nom = 'Le nom est obligatoire.';
    else if (a.nom.trim().length > 80) e.nom = '80 caractères au plus.';
    if (a.fonction.trim().length > 60) e.fonction = '60 caractères au plus.';
    if (!corrigee?.rejoint && a.whatsapp.trim() && !numeroWhatsApp(a.whatsapp)) e.whatsapp = 'Écrivez le numéro au format international, par exemple +261 34 00 000 00.';
    if (!corrigee && a.role === 'validant' && personnes.some((p) => p.role === 'validant' && !p.revoque))
      e.role = `Un seul validant par projet : ${personnes.find((p) => p.role === 'validant')?.nom} l’est déjà. Choisissez « Contributeur ».`;
    setErreurAjout(e);
    return Object.keys(e).length === 0;
  }

  async function enregistrer() {
    const e: typeof erreursFiche = {};
    if (!entreprise.trim()) e.entreprise = 'Le nom de l’entreprise est obligatoire.';
    else if (entreprise.trim().length > 80) e.entreprise = '80 caractères au plus.';
    if (!nomCourt.trim()) e.nomCourt = 'Le nom court du projet est obligatoire.';
    else if (nomCourt.trim().length > 25) e.nomCourt = '25 caractères au plus.';
    if (reve.trim().length > 160) e.reve = '160 caractères au plus.';
    if (personnes.filter((p) => p.role === 'validant' && !p.revoque).length > 1) e.personnes = RAISONS.UN_SEUL_VALIDANT;
    setErreursFiche(e);
    if (Object.keys(e).length) return;
    setEnvoiFiche(true);
    setMessageFiche(null);
    try {
      const r = await enregistrerClient({
        ...(fiche ? { id: fiche.client.id } : {}),
        entreprise: entreprise.trim(),
        nom_court: nomCourt.trim(),
        phrase_reve: reve.trim(),
        personnes: personnes
          .filter((p) => !p.revoque)
          .map((p) => ({
            ...(p.id ? { id: p.id } : {}),
            civilite: p.civilite,
            nom: p.nom.trim(),
            fonction: p.fonction.trim(),
            whatsapp: numeroWhatsApp(p.whatsapp) ?? '',
            role: p.role
          }))
      });
      if (!r.ok) {
        setMessageFiche({ ok: false, texte: RAISONS[r.code ?? ''] ?? 'Le serveur a refusé la fiche.' });
        if (r.code === 'UN_SEUL_VALIDANT') setErreursFiche({ personnes: RAISONS.UN_SEUL_VALIDANT });
        return;
      }
      setModifie(false);
      if (nouveau && r.client_id) {
        navigate(`/pilotage/client/${r.client_id}/fiche`, { replace: true });
        return;
      }
      await charger();
      setMessageFiche({ ok: true, texte: 'Fiche enregistrée.' });
    } catch {
      setMessageFiche({ ok: false, texte: 'Le réseau ne répond pas : la fiche n’est pas enregistrée. Réessayez.' });
    } finally {
      setEnvoiFiche(false);
    }
  }

  /** Creates the invitation (cancels the previous unused one) and returns its token. */
  async function nouveauJeton(): Promise<string | null> {
    if (!choisie?.id) return null;
    const r = await creerInvitation(choisie.id);
    if (!r.ok || !r.jeton) {
      setRetourInvitation({ ok: false, texte: RAISONS[r.code ?? ''] ?? 'Le serveur a refusé l’invitation.' });
      return null;
    }
    setJetons((j) => ({ ...j, [choisie.id!]: r.jeton! }));
    return r.jeton;
  }

  async function inviter() {
    if (raisonWhatsApp || !choisie || !numero) return;
    // Window opened during the gesture (popup blockers), filled once the token is known.
    const fenetre = window.open('', '_blank');
    setEnvoi(true);
    setRetourInvitation(null);
    try {
      const j = await nouveauJeton();
      if (!j) {
        fenetre?.close();
        return;
      }
      const texte = messageInvitation({ nomCourt, phraseReve: reve, civilite: choisie.civilite, nom: choisie.nom, questions: n, minutes, lien: lienInvitation(j), type: pub?.q.type });
      const adresse = adresseWhatsApp(numero, texte);
      if (fenetre) fenetre.location.href = adresse;
      else window.location.href = adresse;
      setRetourInvitation({ ok: true, texte: `Invitation créée : WhatsApp s’ouvre avec le message pour ${choisie.civilite} ${choisie.nom}. Envoyez-le vous-même.` });
      void charger();
    } catch {
      fenetre?.close();
      setRetourInvitation({ ok: false, texte: 'Le réseau ne répond pas : aucune invitation créée. Réessayez.' });
    } finally {
      setEnvoi(false);
    }
  }

  async function copier() {
    if (raison || !choisie) return;
    setEnvoi(true);
    setRetourInvitation(null);
    try {
      const j = jeton ?? (await nouveauJeton());
      if (!j) return;
      const lien = lienInvitation(j);
      try {
        await navigator.clipboard.writeText(lien);
        setRetourInvitation({ ok: true, texte: `Lien copié : ${lien}` });
      } catch {
        setRetourInvitation({ ok: true, texte: `Copiez ce lien : ${lien}` });
      }
      void charger();
    } catch {
      setRetourInvitation({ ok: false, texte: 'Le réseau ne répond pas : aucune invitation créée. Réessayez.' });
    } finally {
      setEnvoi(false);
    }
  }

  async function voirPage() {
    if (!jeton) return;
    try {
      setApercu(await lireApercu(jeton));
      window.scrollTo(0, 0);
    } catch {
      setRetourInvitation({ ok: false, texte: 'Le réseau ne répond pas : aperçu indisponible. Réessayez.' });
    }
  }

  if (apercu) {
    return (
      <div data-apercu-invitation="">
        {apercu.valide ? (
          <PageInvitation a={apercu} inactif />
        ) : (
          <Corps>
            <div className={CARTE}>
              <p className="text-[15px] m-0">Cette invitation n’est plus valable (elle a servi ou a été remplacée).</p>
            </div>
          </Corps>
        )}
        <div className="sticky bottom-0 z-40 bg-nuit text-white px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-[13px]">Aperçu : les boutons sont inactifs.</span>
          <button type="button" className={`${SECONDAIRE} !min-h-11 !text-[15px]`} onClick={() => setApercu(null)} data-fermer-apercu="">
            Fermer l’aperçu
          </button>
        </div>
      </div>
    );
  }

  const titre = nouveau ? 'Pilotage : nouveau client' : 'Pilotage : fiche client';
  const sousTitre = nouveau ? '1. fiche, 2. questionnaire, 3. invitation' : fiche ? `pour ${fiche.client.entreprise}` : '';

  return (
    <>
      <EnTetePilotage titre={titre} sousTitre={sousTitre} />
      <Corps>
        <BarreRetour
          vers={nouveau ? '/pilotage' : `/pilotage/client/${id}`}
          libelle={nouveau ? 'Tableau de bord' : 'Détail du client'}
          surRetour={(aller) => (modifie ? setQuitter(() => aller) : aller())}
        />
        {quitter && (
          <div className="fixed inset-0 z-50 bg-[rgba(15,23,42,0.45)] flex items-center justify-center px-4" data-quitter="">
            <div className={`${CARTE} !border-2 !border-danger w-full max-w-[420px]`} role="alertdialog" aria-modal="true" aria-labelledby="quitter-texte">
              <p id="quitter-texte" className="text-[15px] font-semibold m-0">
                Quitter sans enregistrer ? Vos modifications seront perdues.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" className={`${SECONDAIRE} !text-[15px]`} onClick={() => setQuitter(null)} autoFocus data-rester="">
                  Rester
                </button>
                <button
                  type="button"
                  className={`${DANGER} !text-[15px]`}
                  onClick={() => {
                    const aller = quitter;
                    setQuitter(null);
                    setModifie(false);
                    aller();
                  }}
                  data-quitter-confirmer=""
                >
                  Quitter
                </button>
              </div>
            </div>
          </div>
        )}
        {chargement && <Squelette lent={false} />}
        {!chargement && erreurLecture && <ErreurReseau reessayer={() => void charger()} />}
        {!chargement && !erreurLecture && (
          <form
            className="flex flex-col gap-3"
            name="fiche-client"
            noValidate
            onSubmit={(ev) => {
              ev.preventDefault();
              void enregistrer();
            }}
          >
            <div className={CARTE}>
              <h2 className="text-[17px] font-bold m-0">Le client</h2>
              <div className="flex flex-col gap-1">
                <label htmlFor="entreprise" className={ETIQUETTE}>
                  Entreprise
                </label>
                <input
                  id="entreprise"
                  name="entreprise"
                  className={CHAMP}
                  value={entreprise}
                  maxLength={80}
                  autoComplete="organization"
                  onChange={(e) => changer(() => setEntreprise(e.target.value))}
                  aria-invalid={!!erreursFiche.entreprise}
                />
                {erreursFiche.entreprise && <ErreurChamp texte={erreursFiche.entreprise} />}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="nom-court" className={ETIQUETTE}>
                  Nom court du projet (repris dans le bandeau et le message)
                </label>
                <input
                  id="nom-court"
                  name="nom_court"
                  className={CHAMP}
                  value={nomCourt}
                  maxLength={25}
                  onChange={(e) => changer(() => setNomCourt(e.target.value))}
                  aria-describedby="nom-court-compte"
                  aria-invalid={!!erreursFiche.nomCourt}
                />
                <span id="nom-court-compte" className="text-[13px] text-doux self-end" data-compteur="">
                  {nomCourt.length} / 25
                </span>
                {erreursFiche.nomCourt && <ErreurChamp texte={erreursFiche.nomCourt} />}
              </div>
            </div>

            <div className={CARTE}>
              <label htmlFor="reve" className="text-[17px] font-bold m-0">
                Son rêve en une phrase
              </label>
              <p className="text-[13px] text-doux m-0">Affichée en grand sur sa page d'invitation et en tête du message WhatsApp.</p>
              <textarea
                id="reve"
                name="phrase_reve"
                className="w-full min-h-[96px] border border-[#94a3b8] rounded-[10px] p-2.5 text-[15px] font-[inherit] resize-y"
                value={reve}
                maxLength={160}
                onChange={(e) => changer(() => setReve(e.target.value))}
                aria-describedby="reve-compte"
              />
              <span id="reve-compte" className="text-[13px] text-doux self-end">
                {reve.length} / 160
              </span>
              {erreursFiche.reve && <ErreurChamp texte={erreursFiche.reve} />}
              <p className="text-[13px] text-doux m-0">
                Laissée vide, la phrase générale s'affiche : « Et si votre idée devenait l'application dont vous rêvez ? »
              </p>
            </div>

            <div className={CARTE} data-personnes="">
              <div className="flex items-center justify-between gap-2.5">
                <h2 className="text-[17px] font-bold m-0">Personnes</h2>
                {!ajout && (
                  <button
                    type="button"
                    className="text-[14px] font-semibold text-ciel min-h-11 flex items-center"
                    onClick={() => {
                      setErreurAjout({});
                      setAjout({ ...VIDE, role: validant ? 'contributeur' : 'validant' });
                    }}
                    data-ajouter=""
                  >
                    + Ajouter
                  </button>
                )}
              </div>
              {personnes.length === 0 && !ajout && <p className="text-[14px] text-doux m-0">Aucune personne pour l'instant. Un validant est nécessaire pour publier et inviter.</p>}
              {personnes.map((p) => (
                <div key={p.cle} className="flex items-center justify-between gap-2.5 py-2.5 border-b border-[#e2e8f0] last:border-b-0" data-personne={p.id ?? 'nouvelle'}>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <strong className="text-[15px] break-words">
                      {p.civilite} {p.nom}
                    </strong>
                    <span className="text-[13px] text-doux break-words">
                      {[p.fonction, p.whatsapp].filter(Boolean).join(', ') || 'Sans fonction ni numéro'}
                    </span>
                    {!p.id && (
                      <button
                        type="button"
                        className="text-[13px] text-danger self-start min-h-8"
                        onClick={() => changer(() => setPersonnes((l) => l.filter((x) => x.cle !== p.cle)))}
                      >
                        Retirer
                      </button>
                    )}
                    {p.id &&
                      lignesCorrections(fiche?.journal, p.id).map((l, i) => (
                        <span key={i} className="text-[13px] text-doux break-words" data-correction="">
                          {l}
                        </span>
                      ))}
                    {p.id && !p.revoque && !ajout && (
                      <button
                        type="button"
                        className="text-[13px] text-[#0369a1] self-start min-h-11 -my-1.5 flex items-center"
                        onClick={() => {
                          setErreurAjout({});
                          setAjout({ civilite: p.civilite, nom: p.nom, fonction: p.fonction, whatsapp: p.whatsapp, role: p.role, cle: p.cle, legende: `Modifier ${p.civilite} ${p.nom}` });
                        }}
                        data-modifier={p.id}
                      >
                        Modifier
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Pilule classe={p.role === 'validant' ? P_OK : P_INFO}>{libelleRole(p)}</Pilule>
                    {p.id && corrigees.includes(p.cle) && (
                      <Pilule classe={P_ATTENTE} data-a-enregistrer="">
                        À enregistrer
                      </Pilule>
                    )}
                    {p.revoque ? (
                      <Pilule classe={P_NON}>Accès retiré</Pilule>
                    ) : p.rejoint ? (
                      <Pilule classe={P_OK}>A rejoint</Pilule>
                    ) : !p.id ? (
                      <Pilule classe={P_ATTENTE}>À enregistrer</Pilule>
                    ) : p.invitation === 'envoyee' ? (
                      <Pilule classe={P_ATTENTE}>Invitation créée</Pilule>
                    ) : null}
                  </div>
                </div>
              ))}
              {erreursFiche.personnes && <ErreurChamp texte={erreursFiche.personnes} />}
              {ajout && (
                <fieldset className="flex flex-col gap-2.5 border border-filet rounded-xl p-3 m-0" data-formulaire-personne="">
                  <legend className="text-[15px] font-bold px-1 break-words">{ajout.legende ?? 'Nouvelle personne'}</legend>
                  <div className="flex flex-col gap-1">
                    <span className={ETIQUETTE} id="civilite-titre">
                      Civilité
                    </span>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="civilite-titre">
                      {(['Madame', 'Monsieur'] as const).map((c) => (
                        <label key={c} className={`flex items-center gap-2 min-h-11 px-3 rounded-[10px] border ${ajout.civilite === c ? 'border-2 border-ciel bg-fond' : 'border-[#cbd5e1]'}`}>
                          <input type="radio" name="civilite" id={`civilite-${c}`} value={c} checked={ajout.civilite === c} onChange={() => setAjout({ ...ajout, civilite: c })} />
                          {c}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="personne-nom" className={ETIQUETTE}>
                      Nom
                    </label>
                    <input id="personne-nom" name="personne_nom" className={CHAMP} value={ajout.nom} maxLength={80} onChange={(e) => setAjout({ ...ajout, nom: e.target.value })} />
                    {erreurAjout.nom && <ErreurChamp texte={erreurAjout.nom} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="personne-fonction" className={ETIQUETTE}>
                      Fonction
                    </label>
                    <input id="personne-fonction" name="personne_fonction" className={CHAMP} value={ajout.fonction} maxLength={60} onChange={(e) => setAjout({ ...ajout, fonction: e.target.value })} />
                    {erreurAjout.fonction && <ErreurChamp texte={erreurAjout.fonction} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="personne-whatsapp" className={ETIQUETTE}>
                      Numéro WhatsApp
                    </label>
                    <input
                      id="personne-whatsapp"
                      name="personne_whatsapp"
                      className={numeroFige ? `${CHAMP} !bg-[#f1f5f9] text-doux` : CHAMP}
                      type="tel"
                      inputMode="tel"
                      placeholder="+261 34 00 000 00"
                      value={ajout.whatsapp}
                      readOnly={numeroFige}
                      aria-describedby={numeroFige ? 'personne-whatsapp-fige' : undefined}
                      onChange={(e) => setAjout({ ...ajout, whatsapp: e.target.value })}
                    />
                    {numeroFige && (
                      <p id="personne-whatsapp-fige" className="text-[13px] text-doux m-0" data-numero-fige="">
                        Numéro donné par la personne elle-même : il ne se modifie pas ici.
                      </p>
                    )}
                    {erreurAjout.whatsapp && <ErreurChamp texte={erreurAjout.whatsapp} />}
                  </div>
                  {!ajout.cle && <div className="flex flex-col gap-1">
                    <span className={ETIQUETTE} id="role-titre">
                      Rôle
                    </span>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="role-titre">
                      {(['validant', 'contributeur'] as const).map((r) => (
                        <label key={r} className={`flex items-center gap-2 min-h-11 px-3 rounded-[10px] border ${ajout.role === r ? 'border-2 border-ciel bg-fond' : 'border-[#cbd5e1]'}`}>
                          <input type="radio" name="role" id={`role-${r}`} value={r} checked={ajout.role === r} onChange={() => setAjout({ ...ajout, role: r })} />
                          {r === 'validant' ? 'Validant' : 'Contributeur'}
                        </label>
                      ))}
                    </div>
                    <p className="text-[13px] text-doux m-0">Un seul validant par projet : c'est lui qui confirme.</p>
                    {erreurAjout.role && <ErreurChamp texte={erreurAjout.role} />}
                  </div>}
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className={`${SECONDAIRE} !text-[15px]`} onClick={() => setAjout(null)} data-annuler-personne="">
                      Annuler
                    </button>
                    <button
                      type="button"
                      className={`${PRIMAIRE} !text-[15px]`}
                      data-ajouter-liste=""
                      onClick={() => {
                        if (!validerAjout(ajout)) return;
                        const cle = ajout.cle;
                        const p = { civilite: ajout.civilite, nom: ajout.nom, fonction: ajout.fonction, whatsapp: ajout.whatsapp, role: ajout.role };
                        if (cle) setCorrigees((c) => (c.includes(cle) ? c : [...c, cle]));
                        if (cle)
                          changer(() =>
                            setPersonnes((l) =>
                              l.map((x) =>
                                x.cle === cle ? { ...x, civilite: p.civilite, nom: p.nom.trim(), fonction: p.fonction.trim(), whatsapp: x.rejoint ? x.whatsapp : p.whatsapp.trim() } : x
                              )
                            )
                          );
                        else changer(() => setPersonnes((l) => [...l, { ...p, nom: p.nom.trim(), fonction: p.fonction.trim(), cle: `n${Date.now()}` }]));
                        setAjout(null);
                      }}
                    >
                      {ajout.cle ? 'Valider' : 'Ajouter à la liste'}
                    </button>
                  </div>
                </fieldset>
              )}
            </div>

            {modifie && (
              <p className="text-[14px] font-semibold text-[#b45309] bg-[#fffbeb] border border-[#fcd34d] rounded-[10px] px-3 py-2.5 m-0 leading-[1.45]" role="status" data-non-enregistre="">
                {'Modifications non enregistrées : touchez «\u00a0Enregistrer la fiche\u00a0» pour les garder.'}
              </p>
            )}
            <button type="submit" className={PRIMAIRE} disabled={envoiFiche || !!ajout} data-enregistrer-fiche="">
              {envoiFiche ? 'Enregistrement…' : 'Enregistrer la fiche'}
            </button>
            {ajout && <p className="text-[13px] text-doux m-0 -mt-1">{ajout.cle ? "Terminez d'abord la modification de la personne." : "Terminez d'abord l'ajout de la personne."}</p>}
            {messageFiche && (
              <p className={`text-[14px] font-semibold m-0 ${messageFiche.ok ? 'text-[#166534]' : 'text-danger'}`} role={messageFiche.ok ? 'status' : 'alert'} data-message-fiche="">
                {messageFiche.texte}
              </p>
            )}
          </form>
        )}

        {!chargement && !erreurLecture && (
          <>
            <div className={`${CARTE} gap-2`} data-bloc-questionnaire="">
              <h2 className="text-[17px] font-bold m-0">Questionnaire</h2>
              {dernier ? (
                <p className="text-[14px] m-0" data-etat-questionnaire={dernier.etat}>
                  {etatQuestionnaire(dernier)}
                </p>
              ) : (
                <p className="text-[14px] text-doux m-0">Aucun questionnaire pour l'instant.</p>
              )}
              {pub && (
                <p className="text-[13px] text-doux m-0">
                  {pub.q.id !== dernier?.id ? `Publié : ${etatQuestionnaire(pub.q)}. ` : ''}
                  {n} questions au plus, environ {minutes} minutes.
                </p>
              )}
              {!pub && <p className="text-[13px] text-doux m-0">Sans questionnaire publié, « Inviter sur WhatsApp » reste grisé.</p>}
              {fiche ? (
                <div className="flex flex-wrap gap-x-4">
                  <Link to={`/pilotage/import/${fiche.client.id}`} className="text-[14px] font-semibold text-ciel min-h-11 flex items-center" data-importer="">
                    Importer un questionnaire
                  </Link>
                  {dernier && (
                    <Link to={`/pilotage/questionnaire/${dernier.id}`} className="text-[14px] font-semibold text-ciel min-h-11 flex items-center" data-voir-questionnaire="">
                      Voir le questionnaire
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-doux m-0">Enregistrez d'abord la fiche pour importer un questionnaire.</p>
              )}
            </div>

            <div className={CARTE} data-apercu-message="">
              <h2 className="text-[17px] font-bold m-0">Aperçu du message WhatsApp</h2>
              {personnes.filter((p) => p.id && !p.revoque).length > 1 && (
                <fieldset className="flex flex-col gap-1.5 border-0 p-0 m-0">
                  <legend className={`${ETIQUETTE} mb-1`}>Message pour</legend>
                  {personnes
                    .filter((p) => p.id && !p.revoque)
                    .map((p) => (
                      <label key={p.cle} className={`flex items-center gap-2 min-h-11 px-3 rounded-[10px] border ${cible === p.id ? 'border-2 border-ciel bg-fond' : 'border-[#cbd5e1]'}`}>
                        <input type="radio" name="destinataire" value={p.id} checked={cible === p.id} onChange={() => setCible(p.id!)} />
                        {p.civilite} {p.nom} ({libelleRole(p).toLowerCase()})
                      </label>
                    ))}
                </fieldset>
              )}
              <div className="bg-[#dcf8c6] rounded-[12px_12px_4px_12px] p-3 text-[14px] leading-normal text-encre self-end max-w-[95%] break-words" data-message="">
                <MessageWhatsApp texte={message} />
              </div>
              <p className="text-[13px] text-doux m-0">Le nombre de questions et la durée sont calculés à partir du questionnaire publié.</p>
              <button
                type="button"
                className="text-[14px] font-semibold text-ciel min-h-11 flex items-center gap-1.5 self-start disabled:opacity-60 disabled:text-doux"
                disabled={!jeton}
                onClick={() => void voirPage()}
                data-voir-page=""
              >
                <Icone nom="oeil" />
                Voir sa page d'invitation
              </button>
              {!jeton && <p className="text-[13px] text-doux m-0 -mt-2">La page existe une fois le lien créé (« Inviter sur WhatsApp » ou « Copier le lien »).</p>}
            </div>

            <div
              className="sticky bottom-0 z-[5] self-stretch flex flex-col gap-2 -mx-4 -mb-4 mt-1 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] bg-white border-t border-filet shadow-[0_-6px_16px_rgba(3,105,161,0.08)]"
              data-barre-action=""
            >
              {retourInvitation && (
                <p className={`text-[13px] font-semibold m-0 break-all ${retourInvitation.ok ? 'text-[#166534]' : 'text-danger'}`} role={retourInvitation.ok ? 'status' : 'alert'} data-retour-invitation="">
                  {retourInvitation.texte}
                </p>
              )}
              <button type="button" className={PRIMAIRE} disabled={!!raisonWhatsApp || envoi} onClick={() => void inviter()} data-inviter="">
                <Icone nom="whatsapp" />
                Inviter sur WhatsApp
              </button>
              <button type="button" className={`${SECONDAIRE} !min-h-11 !text-[15px]`} disabled={!!raison || envoi} onClick={() => void copier()} data-copier="">
                <Icone nom="copier" />
                Copier le lien
              </button>
              {raisonWhatsApp && (
                <p className="text-[13px] text-doux m-0 text-center" data-raison="">
                  {raisonWhatsApp}
                </p>
              )}
            </div>
          </>
        )}
      </Corps>
    </>
  );
}

function ErreurChamp({ texte }: { texte: string }) {
  return (
    <p className="text-[13px] text-danger m-0" role="alert">
      {texte}
    </p>
  );
}

/** WhatsApp formatting of the preview: *bold* lines and _italic_ lines, links in blue. */
function MessageWhatsApp({ texte }: { texte: string }) {
  return (
    <>
      {texte.split('\n').map((l, i) => {
        let contenu: ReactNode = l;
        if (/^\*.*\*$/.test(l)) contenu = <strong>{l.slice(1, -1)}</strong>;
        else if (/^_.*_$/.test(l)) contenu = <em>{l.slice(1, -1)}</em>;
        else if (l.startsWith('https://')) contenu = <span className="text-ciel">{l}</span>;
        return (
          <span key={i} className="block min-h-[1.5em]">
            {contenu}
          </span>
        );
      })}
    </>
  );
}
