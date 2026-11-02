// Screen 11: detail of a client (VC-27, VC-28, VC-29, VC-38). From vc_admin_client: the people
// with their actions, the follow-up promised to the client, and per questionnaire the dated history
// of every answer (never an edit or delete action). « ?question=<id> » scrolls to that question.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BarreRetour, CARTE, Corps, PRIMAIRE, SECONDAIRE, Squelette } from '../composants/Mise';
import { Icone } from '../composants/Icones';
import { NOM_CYCLE, dateHeure, delaiRestant, nomCycle } from '../utils/regles';
import { dateHeureSeconde } from '../utils/export';
import { verifierArbre } from '../utils/arbre';
import {
  archiverClient,
  clore,
  creerInvitation,
  ficheClient,
  nommerValidant,
  revoquerAcces,
  suivi,
  type ChoixClient,
  type FicheClient,
  type PersonneClient,
  type QuestionnaireClient,
  type ReponseClient
} from './api';
import { DANGER, EnTetePilotage, ErreurReseau, P_ATTENTE, P_INFO, P_NON, P_OK, Pilule } from './Commun';
import { adresseWhatsApp, lienInvitation, messageInvitation, messageRelance, messageSuite } from './regles';
import { RELECTURE_MS, useRelecture } from './Tableau';

const LIEN = 'text-[13px] font-semibold text-ciel underline underline-offset-2 min-h-11 inline-flex items-center cursor-pointer bg-transparent border-0 p-0';
const LIEN_DANGER = `${LIEN} !text-danger`;

const ETATS: Record<QuestionnaireClient['etat'], { texte: string; classe: string }> = {
  brouillon: { texte: 'Brouillon', classe: P_INFO },
  ouvert: { texte: 'Ouverte', classe: P_ATTENTE },
  confirme: { texte: 'Confirmée', classe: P_OK },
  remplace: { texte: 'Remplacée', classe: P_INFO },
  clos: { texte: 'Close', classe: P_INFO }
};

const ETAPES: Record<string, string> = {
  analyse: 'En analyse',
  preparation: 'Version suivante en préparation',
  disponible: 'Disponible'
};

const ERREURS: Record<string, string> = {
  NON_CONFIRME: 'Cette consultation n’est pas encore confirmée par le client : le suivi promis commence à sa confirmation.',
  ETAT_INCOMPATIBLE: 'Cette consultation est déjà close ou remplacée.',
  SANS_QUESTIONNAIRE_PUBLIE: 'Aucune consultation ouverte : publiez-en une avant de renvoyer une invitation.',
  SANS_VALIDANT: 'Désignez d’abord un validant.',
  DEJA_INSCRITE: 'Cette personne a déjà rejoint le projet : plus besoin d’invitation.',
  ACCES_REVOQUE: 'L’accès de cette personne a été retiré.'
};

type Action =
  | { type: 'revoquer'; p: PersonneClient }
  | { type: 'nommer'; p: PersonneClient; ancien: PersonneClient | undefined }
  | { type: 'clore'; q: QuestionnaireClient }
  | { type: 'archiver'; archiver: boolean };

const feminin = (p: Pick<PersonneClient, 'civilite'>) => p.civilite === 'Madame';

function libelleRole(p: Pick<PersonneClient, 'role' | 'civilite'>): string {
  if (p.role === 'validant') return feminin(p) ? 'validante' : 'validant';
  return feminin(p) ? 'contributrice' : 'contributeur';
}

/** « +261340000000 » → « +261 34 00 000 00 » (other numbers stay as typed). */
export function numeroLisible(n: string): string {
  const m = /^\+261(\d{2})(\d{2})(\d{3})(\d{2})$/.exec(n.replace(/\s/g, ''));
  return m ? `+261 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : n;
}

function natureClasse(c: ChoixClient | undefined): string {
  if (c?.nature === 'refus') return P_NON;
  if (c?.nature === 'reserve') return P_ATTENTE;
  return P_OK;
}

export default function Detail() {
  const { id = '' } = useParams();
  const [recherche] = useSearchParams();
  const questionVisee = recherche.get('question');
  const [fiche, setFiche] = useState<FicheClient | null>(null);
  const [erreur, setErreur] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string; lien?: string } | null>(null);
  const defile = useRef<string | null>(null);

  const lire = useCallback(() => {
    ficheClient(id)
      .then((f) => {
        setFiche(f);
        setErreur(false);
      })
      .catch(() => setErreur(true));
  }, [id]);
  useEffect(() => {
    setFiche(null);
    setRetour(null);
    setAction(null);
    lire();
  }, [lire]);
  useRelecture(lire, RELECTURE_MS);

  // « ?question=<id> » (refusal notification): jump to that question once the data is shown.
  useEffect(() => {
    if (!fiche || !questionVisee || defile.current === questionVisee) return;
    const el = document.getElementById(`question-${questionVisee}`);
    if (!el) return;
    defile.current = questionVisee;
    el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
  }, [fiche, questionVisee]);

  const questionnaires = useMemo(() => [...(fiche?.questionnaires ?? [])].sort((a, b) => Date.parse(b.cree_at) - Date.parse(a.cree_at)), [fiche]);
  const validant = fiche?.personnes.find((p) => p.role === 'validant' && !p.revoque_at);
  const ouvert = questionnaires.find((q) => q.etat === 'ouvert');
  const vitrine = questionnaires.find((q) => q.etat !== 'brouillon');

  async function faire(f: () => Promise<{ ok: boolean; code?: string }>, reussite: string) {
    setEnvoi(true);
    setRetour(null);
    try {
      const r = await f();
      setRetour(r.ok ? { ok: true, texte: reussite } : { ok: false, texte: ERREURS[r.code ?? ''] ?? 'Le serveur a refusé cette action.' });
      lire();
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setRetour({ ok: false, texte: m === 'timeout' ? 'Le réseau ne répond pas. Réessayez.' : `Le serveur a refusé cette action : ${m}` });
    } finally {
      setEnvoi(false);
      setAction(null);
    }
  }

  async function confirmerAction() {
    if (!action || !fiche) return;
    if (action.type === 'revoquer') await faire(() => revoquerAcces(action.p.id), `Accès de ${action.p.civilite} ${action.p.nom} retiré. Ses réponses restent.`);
    else if (action.type === 'nommer')
      await faire(() => nommerValidant(action.p.id), `${action.p.civilite} ${action.p.nom} est maintenant ${feminin(action.p) ? 'validante' : 'validant'}.`);
    else if (action.type === 'clore') await faire(() => clore(action.q.id), 'Consultation close. Les réponses sont conservées.');
    else
      await faire(
        () => archiverClient(fiche.client.id, action.archiver),
        action.archiver ? 'Client archivé. Vous pouvez le désarchiver à tout moment.' : 'Client désarchivé.'
      );
  }

  /** « Renvoyer l'invitation »: new link (the previous one is cancelled), then the WhatsApp message of phase 3. */
  async function renvoyer(p: PersonneClient) {
    if (!fiche) return;
    const numero = (p.whatsapp_fiche ?? p.whatsapp ?? '').replace(/\D/g, '');
    const fenetre = numero ? window.open('', '_blank') : null;
    setEnvoi(true);
    setRetour(null);
    try {
      const r = await creerInvitation(p.id);
      if (!r.ok || !r.jeton) {
        fenetre?.close();
        setRetour({ ok: false, texte: ERREURS[r.code ?? ''] ?? 'Le serveur a refusé l’invitation.' });
        return;
      }
      const lien = lienInvitation(r.jeton);
      if (numero && ouvert) {
        const n = verifierArbre((ouvert.questions ?? []).map((x) => ({ numero: x.numero, choix: x.choix ?? [] }))).cheminMax;
        const texte = messageInvitation({ nomCourt: fiche.client.nom_court, phraseReve: fiche.client.phrase_reve, civilite: p.civilite, nom: p.nom, questions: n, minutes: Math.max(n, 1), lien });
        const adresse = adresseWhatsApp(numero, texte);
        if (fenetre) fenetre.location.href = adresse;
        else window.location.href = adresse;
      }
      setRetour({
        ok: true,
        texte: numero
          ? `Nouvelle invitation : l’ancien lien ne marche plus. WhatsApp s’ouvre avec le message pour ${p.civilite} ${p.nom} : envoyez-le vous-même.`
          : 'Nouvelle invitation : l’ancien lien ne marche plus. Numéro WhatsApp manquant : envoyez ce lien par un autre moyen.',
        lien
      });
      lire();
    } catch {
      fenetre?.close();
      setRetour({ ok: false, texte: 'Le réseau ne répond pas : aucune invitation créée. Réessayez.' });
    } finally {
      setEnvoi(false);
    }
  }

  /** « Publier la suite »: follow-up « Disponible », then WhatsApp to the validant. */
  async function publierSuite(q: QuestionnaireClient) {
    if (!fiche) return;
    const numero = (validant?.whatsapp ?? validant?.whatsapp_fiche ?? '').replace(/\D/g, '');
    const fenetre = numero ? window.open('', '_blank') : null;
    setEnvoi(true);
    setRetour(null);
    try {
      const r = await suivi(q.id, 'disponible');
      if (!r.ok) {
        fenetre?.close();
        setRetour({ ok: false, texte: ERREURS[r.code ?? ''] ?? 'Le serveur a refusé cette action.' });
        return;
      }
      if (numero && validant) {
        const adresse = adresseWhatsApp(numero, messageSuite({ nomCourt: fiche.client.nom_court, civilite: validant.civilite, nom: validant.nom }));
        if (fenetre) fenetre.location.href = adresse;
        else window.location.href = adresse;
      }
      setRetour({
        ok: true,
        texte: numero ? 'Suivi « Disponible » : le client est prévenu. WhatsApp s’ouvre avec le message pour le validant : envoyez-le vous-même.' : 'Suivi « Disponible » : le client est prévenu.'
      });
      lire();
    } catch {
      fenetre?.close();
      setRetour({ ok: false, texte: 'Le réseau ne répond pas. Réessayez.' });
    } finally {
      setEnvoi(false);
    }
  }

  const titre = fiche ? `Pilotage : ${fiche.client.entreprise}` : 'Pilotage : détail du client';
  const sousTitre = vitrine ? nomCycle(vitrine.type, vitrine.version) : '';

  return (
    <>
      <EnTetePilotage titre={titre} sousTitre={sousTitre} />
      <Corps data-detail={id}>
        <BarreRetour vers="/pilotage" libelle="Tableau de bord" />
        {!fiche && !erreur && <Squelette lent={false} />}
        {!fiche && erreur && <ErreurReseau reessayer={lire} />}
        {fiche && (
          <>
            {fiche.client.statut !== 'actif' && (
              <p className="text-[14px] text-[#92400e] font-semibold m-0" data-archive="">
                Client archivé : ses consultations et ses réponses sont conservées.
              </p>
            )}
            {retour && (
              <div className={`${CARTE} !gap-1.5 ${retour.ok ? '!border-[#86efac] !bg-[#f0fdf4]' : '!border-[#fca5a5] !bg-[#fef2f2]'}`} role={retour.ok ? 'status' : 'alert'} data-retour={retour.ok ? 'ok' : 'erreur'}>
                <p className={`text-[14px] font-semibold m-0 ${retour.ok ? 'text-[#166534]' : 'text-danger'}`}>{retour.texte}</p>
                {retour.lien && (
                  <p className="text-[13px] m-0 break-all" data-nouveau-lien="">
                    Nouveau lien : {retour.lien}
                  </p>
                )}
              </div>
            )}
            {action && <Confirmation action={action} envoi={envoi} annuler={() => setAction(null)} confirmer={() => void confirmerAction()} />}

            <section className={CARTE} aria-labelledby="titre-personnes" data-personnes="">
              <h2 id="titre-personnes" className="text-[17px] leading-[1.3] font-bold m-0">
                Personnes
              </h2>
              {fiche.personnes.length === 0 && <p className="text-[14px] text-doux m-0">Aucune personne sur la fiche.</p>}
              {fiche.personnes.map((p) => (
                <Personne
                  key={p.id}
                  p={p}
                  validant={validant}
                  tous={fiche.personnes}
                  envoi={envoi}
                  renvoyer={() => void renvoyer(p)}
                  demander={setAction}
                />
              ))}
            </section>

            {questionnaires.map((q) => (
              <Consultation
                key={q.id}
                q={q}
                fiche={fiche}
                validant={validant}
                envoi={envoi}
                preparer={() => void faire(() => suivi(q.id, 'preparation'), 'Suivi « Version suivante en préparation » : le client le voit sur son accueil.')}
                publierSuite={() => void publierSuite(q)}
                demander={setAction}
              />
            ))}

            <div className="grid grid-cols-2 gap-2">
              <Link to={`/pilotage/import/${fiche.client.id}`} className={`${SECONDAIRE} !text-[14px] !px-2 text-center`} data-nouvelle-consultation="">
                Nouvelle consultation
              </Link>
              <Link to={`/pilotage/client/${fiche.client.id}/fiche`} className={`${SECONDAIRE} !text-[14px] !px-2 text-center`} data-modifier-fiche="">
                Modifier la fiche
              </Link>
            </div>
            <button
              type="button"
              className={`${DANGER} !min-h-11 !text-[15px]`}
              disabled={envoi}
              onClick={() => setAction({ type: 'archiver', archiver: fiche.client.statut === 'actif' })}
              data-archiver=""
            >
              {fiche.client.statut === 'actif' ? 'Archiver le client' : 'Désarchiver le client'}
            </button>
            <p className="text-[13px] text-doux m-0" data-pied="">
              Aucune réponse ne peut être modifiée ni effacée. Heures de Madagascar.
            </p>
          </>
        )}
      </Corps>
    </>
  );
}

function Confirmation({ action, envoi, annuler, confirmer }: { action: Action; envoi: boolean; annuler: () => void; confirmer: () => void }) {
  let texte = '';
  let bouton = '';
  if (action.type === 'revoquer') {
    texte = `Retirer l’accès de ${action.p.civilite} ${action.p.nom} ? Ses réponses restent ; son invitation non utilisée est annulée.`;
    bouton = 'Révoquer';
  } else if (action.type === 'nommer') {
    const nouveau = feminin(action.p) ? 'validante' : 'validant';
    texte = action.ancien
      ? `Nommer ${action.p.civilite} ${action.p.nom} ${nouveau} ? ${action.ancien.civilite} ${action.ancien.nom} devient ${feminin(action.ancien) ? 'contributrice' : 'contributeur'}.`
      : `Nommer ${action.p.civilite} ${action.p.nom} ${nouveau} ?`;
    bouton = 'Nommer';
  } else if (action.type === 'clore') {
    texte = `Clore la consultation ${NOM_CYCLE[action.q.type] ?? 'Document'} v${action.q.version} ? Le client ne pourra plus répondre ; ses réponses sont conservées.`;
    bouton = 'Clore';
  } else {
    texte = action.archiver
      ? 'Archiver ce client ? Il disparaît du tableau de bord ; rien n’est effacé et vous pouvez le désarchiver.'
      : 'Désarchiver ce client ? Il revient au tableau de bord.';
    bouton = action.archiver ? 'Archiver' : 'Désarchiver';
  }
  const danger = action.type !== 'nommer' && !(action.type === 'archiver' && !action.archiver);
  return (
    <div className={`${CARTE} !border-2 ${danger ? '!border-danger' : '!border-ciel'}`} role="alertdialog" aria-label="Confirmation" data-confirmation={action.type}>
      <p className="text-[15px] font-semibold m-0">{texte}</p>
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" className={`${SECONDAIRE} !text-[15px]`} onClick={annuler} disabled={envoi}>
          Annuler
        </button>
        <button type="button" className={danger ? `${DANGER} !text-[15px]` : `${PRIMAIRE} !text-[15px]`} onClick={confirmer} disabled={envoi} data-confirmer="">
          {bouton}
        </button>
      </div>
    </div>
  );
}

function Personne({
  p,
  validant,
  tous,
  envoi,
  renvoyer,
  demander
}: {
  p: PersonneClient;
  validant: PersonneClient | undefined;
  tous: PersonneClient[];
  envoi: boolean;
  renvoyer: () => void;
  demander: (a: Action) => void;
}) {
  const numero = p.whatsapp ?? p.whatsapp_fiche;
  const revoque = !!p.revoque_at;
  const rejoint = !!p.inscrit_at || p.invitation === 'utilisee';
  const invitant = p.invite_par ? tous.find((x) => x.nom === p.invite_par) : undefined;
  const actions: ReactNode[] = [];
  if (!revoque && !rejoint)
    actions.push(
      <button key="r" type="button" className={LIEN} disabled={envoi} onClick={renvoyer} data-renvoyer={p.id}>
        Renvoyer l'invitation
      </button>
    );
  if (!revoque && p.role === 'contributeur')
    actions.push(
      <button key="n" type="button" className={LIEN} disabled={envoi} onClick={() => demander({ type: 'nommer', p, ancien: validant })} data-nommer={p.id}>
        {validant ? `Nommer ${feminin(p) ? 'validante' : 'validant'} à la place de ${validant.nom}` : `Nommer ${feminin(p) ? 'validante' : 'validant'}`}
      </button>
    );
  if (!revoque)
    actions.push(
      <button key="v" type="button" className={LIEN_DANGER} disabled={envoi} onClick={() => demander({ type: 'revoquer', p })} data-revoquer={p.id}>
        Révoquer son accès
      </button>
    );
  const contact = [p.email ? `Google : ${p.email}` : 'Pas encore de compte Google'];
  return (
    <div className="flex flex-col gap-0.5 pb-2.5 border-b border-[#e2e8f0] last:border-b-0 last:pb-0" data-personne={p.id}>
      <p className="text-[14px] m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>
          <strong>
            {p.civilite} {p.nom}
          </strong>
          {p.fonction ? `, ${p.fonction}` : ''}, {libelleRole(p)}
        </span>
        {revoque && <Pilule classe={P_NON}>{`Accès retiré le ${dateHeure(p.revoque_at!)}`}</Pilule>}
      </p>
      <p className="text-[13px] text-doux m-0 break-words">
        {contact.join('')}
        {numero && (
          <>
            {', '}
            <a href={`tel:${numero}`} className="text-ciel" data-tel="">
              {numeroLisible(numero)}
            </a>
          </>
        )}
        {p.appareil ? ` ; ${p.appareil}` : ''}
      </p>
      {p.en_ligne ? (
        <p className="text-[13px] text-[#166534] font-semibold m-0 flex items-center gap-1.5" data-en-ligne="">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] flex-none" />
          En ligne{p.page ? ` : ${p.page}` : ''}
        </p>
      ) : (
        <p className="text-[13px] text-doux m-0 flex items-center gap-1.5" data-visite="">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-[#94a3b8] flex-none" />
          {p.derniere_visite ? `Dernière visite : ${dateHeure(p.derniere_visite)}` : 'Pas encore de visite'}
        </p>
      )}
      {p.invite_par && (
        <p className="text-[13px] text-doux m-0">
          {feminin(p) ? 'Invitée' : 'Invité'} par {p.invite_par}
          {p.cree_at ? ` le ${dateHeure(p.cree_at).split(' à ')[0]}` : ''}
        </p>
      )}
      {!rejoint && !revoque && p.invitation === 'envoyee' && <p className="text-[13px] text-doux m-0">Invitation envoyée, pas encore utilisée.</p>}
      {p.ecart_numero && (
        <p className="text-[13px] text-[#92400e] m-0" data-ecart-numero="">
          Numéro différent de celui saisi par {invitant?.nom ?? p.invite_par ?? 'Joël'}
        </p>
      )}
      {(p.tentatives_autre_compte ?? 0) > 0 && (
        <p className="text-[13px] text-[#92400e] m-0" data-tentatives="">
          {p.tentatives_autre_compte} tentative{p.tentatives_autre_compte! > 1 ? 's' : ''} avec un autre compte
        </p>
      )}
      {actions.length > 0 && <div className="flex flex-wrap items-center gap-x-4">{actions}</div>}
    </div>
  );
}

function Consultation({
  q,
  fiche,
  validant,
  envoi,
  preparer,
  publierSuite,
  demander
}: {
  q: QuestionnaireClient;
  fiche: FicheClient;
  validant: PersonneClient | undefined;
  envoi: boolean;
  preparer: () => void;
  publierSuite: () => void;
  demander: (a: Action) => void;
}) {
  const etat = ETATS[q.etat];
  const e = q.etat_validant;
  const chemin = q.chemin_validant ?? [];
  const numero = (validant?.whatsapp ?? validant?.whatsapp_fiche ?? '').replace(/\D/g, '');
  const relancer = q.etat === 'ouvert' && !q.confirme_at;
  const restantes = e ? e.total - e.repondues : 0;
  const adresseRelance =
    relancer && numero && validant
      ? adresseWhatsApp(numero, messageRelance({ nomCourt: fiche.client.nom_court, civilite: validant.civilite, nom: validant.nom, titreClient: q.titre_client, restantes }))
      : null;
  const brouillon = q.etat === 'brouillon';
  return (
    <section className="flex flex-col gap-3" aria-label={`${NOM_CYCLE[q.type] ?? 'Document'} v${q.version}`} data-consultation={q.id}>
      <div className={CARTE}>
        <div className="flex items-start justify-between gap-2.5">
          <h2 className="text-[17px] leading-[1.3] font-bold m-0 min-w-0 break-words">
            {nomCycle(q.type, q.version)}
            <span className="block text-[13px] font-normal text-doux">{q.titre_client}</span>
          </h2>
          <Pilule classe={etat.classe} data-etat={q.etat}>
            {etat.texte}
          </Pilule>
        </div>
        {e && !brouillon && (
          <p className="text-[13px] text-doux m-0" data-avancement="">
            Validant : {e.repondues} sur {e.total} répondues, jauge {e.jauge} %{q.numero_recu ? `, reçu ${q.numero_recu}` : ''}.
          </p>
        )}
        <div className="flex flex-wrap gap-x-4">
          <Link to={`/pilotage/questionnaire/${q.id}`} className={LIEN} data-voir-questionnaire="">
            Voir le questionnaire
          </Link>
          {!brouillon && (
            <Link to={`/pilotage/resultats/${q.id}`} className={LIEN} data-resultats="">
              Résultats (ordinateur)
            </Link>
          )}
        </div>
        {(relancer || q.etat === 'confirme') && (
          <div className="grid grid-cols-2 gap-2">
            {relancer &&
              (adresseRelance ? (
                <a className={`${SECONDAIRE} !text-[15px]`} href={adresseRelance} target="_blank" rel="noopener noreferrer" data-relancer="">
                  <Icone nom="whatsapp" />
                  Relancer
                </a>
              ) : (
                <button type="button" className={`${SECONDAIRE} !text-[15px]`} disabled title="Numéro WhatsApp du validant manquant" data-relancer="">
                  <Icone nom="whatsapp" />
                  Relancer
                </button>
              ))}
            <button type="button" className={`${DANGER} !text-[15px] ${relancer ? '' : 'col-span-2'}`} disabled={envoi} onClick={() => demander({ type: 'clore', q })} data-clore="">
              Clore la consultation
            </button>
          </div>
        )}
        {relancer && !numero && <p className="text-[13px] text-doux m-0">Numéro WhatsApp du validant manquant : la relance est impossible.</p>}
      </div>

      {(q.etat === 'ouvert' || q.confirme_at) && <Suivi q={q} envoi={envoi} preparer={preparer} publierSuite={publierSuite} />}

      {!brouillon &&
        (q.questions ?? []).map((x) => (
          <QuestionDetail key={x.id} x={x} horsChemin={!chemin.includes(x.numero)} validant={validant} />
        ))}
    </section>
  );
}

function Suivi({ q, envoi, preparer, publierSuite }: { q: QuestionnaireClient; envoi: boolean; preparer: () => void; publierSuite: () => void }) {
  const etape = q.etape_suivi ?? (q.confirme_at ? 'analyse' : null);
  const disponible = etape === 'disponible';
  const reste = q.echeance_at ? delaiRestant(q.echeance_at) : null;
  return (
    <div className={CARTE} data-suivi={etape ?? 'non-confirme'}>
      <div className="flex items-start justify-between gap-2.5">
        <h3 className="text-[17px] leading-[1.3] font-bold m-0">Suivi promis au client</h3>
        {etape && (
          <Pilule classe={disponible ? P_OK : P_ATTENTE} data-etape={etape}>
            {ETAPES[etape] ?? etape}
          </Pilule>
        )}
      </div>
      {q.confirme_at && q.echeance_at ? (
        <p className="text-[13px] text-doux m-0 leading-[1.45]" data-engagement="">
          Confirmée le {dateHeure(q.confirme_at)} : passée d'elle-même à <strong>En analyse</strong>.{' '}
          {disponible
            ? `Suite publiée : le client voit « Disponible ». L'engagement courait jusqu'au ${dateHeure(q.echeance_at)}.`
            : reste
              ? `À rendre au plus tard le ${dateHeure(q.echeance_at)}, ${reste}.`
              : `À rendre au plus tard le ${dateHeure(q.echeance_at)} : délai dépassé, le client lit « Votre dossier demande un peu plus de temps ».`}
        </p>
      ) : (
        <p className="text-[13px] text-doux m-0 leading-[1.45]" data-engagement="">
          Pas encore confirmée par le client : le suivi promis et le délai de 72 h commencent à sa confirmation.
        </p>
      )}
      {!disponible && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={`${SECONDAIRE} !text-[14px] !px-2`} disabled={envoi || etape === 'preparation'} onClick={preparer} data-preparation="">
            En préparation
          </button>
          <button type="button" className={`${PRIMAIRE} !text-[14px] !px-2`} disabled={envoi} onClick={publierSuite} data-publier-suite="">
            Publier la suite
          </button>
        </div>
      )}
    </div>
  );
}

function QuestionDetail({
  x,
  horsChemin,
  validant
}: {
  x: NonNullable<QuestionnaireClient['questions']>[number];
  horsChemin: boolean;
  validant: PersonneClient | undefined;
}) {
  const reponses = [...(x.reponses ?? [])].sort((a, b) => Date.parse(b.repondu_at) - Date.parse(a.repondu_at));
  const estValidant = (r: ReponseClient) => (validant ? r.personne === validant.nom : r.role === 'validant');
  const derniereValidant = reponses.find(estValidant);
  return (
    <div id={`question-${x.id}`} className={`${CARTE} !gap-0 scroll-mt-[110px]`} data-question={x.numero}>
      <div className="flex items-start justify-between gap-2.5 pb-1">
        <h3 className="text-[16px] leading-[1.3] font-bold m-0 min-w-0 break-words">
          Question {x.numero}
          {x.sujet_client ? ` : ${x.sujet_client}` : ''}
        </h3>
        {horsChemin && (
          <Pilule classe={P_INFO} data-hors-chemin="">
            hors chemin
          </Pilule>
        )}
      </div>
      {reponses.length === 0 && <p className="text-[13px] text-doux m-0 py-2">Aucune réponse.</p>}
      {reponses.map((r, i) => {
        const c = x.choix.find((y) => y.id === r.choix_id);
        const validantR = estValidant(r);
        const remplacee = validantR && r !== derniereValidant;
        const libelle = c ? `${c.lettre}, ${c.libelle}` : 'choix inconnu';
        return (
          <div key={i} className="flex flex-col gap-1 py-2.5 border-b border-[#e2e8f0] last:border-b-0" data-reponse={validantR ? 'validant' : 'avis'} data-remplacee={remplacee ? 'oui' : 'non'}>
            <div className="flex items-start justify-between gap-2.5">
              {validantR ? (
                <Pilule classe={natureClasse(c)}>{libelle}</Pilule>
              ) : (
                <Pilule classe={P_INFO}>{`Avis : ${libelle}`}</Pilule>
              )}
              <span className="text-[13px] text-doux whitespace-nowrap" data-date="">
                {dateHeureSeconde(r.repondu_at)}
              </span>
            </div>
            <p className="text-[13px] text-doux m-0">
              {r.personne}, {r.role === 'validant' ? 'validant' : 'contributeur'}, version {r.version}
              {r.appareil ? `, ${r.appareil}` : ''}
            </p>
            {r.commentaire && (
              <p className={`text-[14px] m-0 leading-[1.45] break-words ${validantR ? 'text-[#334155]' : 'bg-fond border border-[#bae6fd] rounded-[10px] p-3 text-nuit'}`} data-commentaire="">
                {c?.nature === 'refus' ? 'Motif' : c?.nature === 'reserve' ? 'Réserve' : 'Commentaire'} : « {r.commentaire} »
              </p>
            )}
            {remplacee && (
              <p className="text-[13px] text-doux m-0" data-remplacee-texte="">
                Remplacée par la réponse suivante, conservée.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
