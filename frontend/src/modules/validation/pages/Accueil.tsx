// Home (screen 3, VC-03, VC-08 home part, RM17) and its states (planche 15): loading, signed out,
// no document, revoked access, archived client. Confirmed card as in screen 8 bis.
import { useEffect, useRef } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEspace } from '../EspaceContexte';
import EnTete from '../composants/EnTete';
import BoutonsConnexion from '../composants/BoutonsConnexion';
import { BoutonWhatsApp, CARTE, CarteMessage, Corps, PRIMAIRE, SECONDAIRE, Squelette, useCouleurTheme } from '../composants/Mise';
import { Icone } from '../composants/Icones';
import { deconnexion } from '../appels/session';
import { usePresence } from '../appels/presence';
import { SuiviDossier } from './Recu';
import { TEXTE_DISPONIBLE, etapeSuivi } from '../utils/suivi';
import { ReponsesRefusees } from './Cadre';
import { BoutonDiscussion, DISCUSSION } from '../composants/VersDiscussion';
import {
  choisirProjet,
  comptes,
  dateHeure,
  delaiRestant,
  estNouvelleVersion,
  etatCarte,
  dateSeule,
  lignePour,
  nomCycle,
  personneValidant,
  ordonnerDocuments,
  questionAOuvrir
} from '../utils/regles';
import type { DocumentEspace, Espace } from '../utils/types';

export default function Accueil() {
  useCouleurTheme('#0369a1');
  const { session, etat, liste, lent, recharger } = useEspace();
  const { state } = useLocation();
  const navigate = useNavigate();
  const actif = etat === 'pret' ? choisirProjet(liste) : null;
  usePresence(actif?.type === 'projet' && actif.espace.inscrit ? actif.espace.client_id : null, { type: 'accueil' });
  // Back from the questions: re-read the cards once (gauge, ready, confirmed).
  const relu = useRef(false);
  useEffect(() => {
    if (etat !== 'pret' || relu.current) return;
    relu.current = true;
    void recharger();
  }, [etat, recharger]);

  if (etat === 'deconnecte') {
    return (
      <>
        <EnTete variante="neutre" />
        <Corps centre>
          <div className={`${CARTE} gap-3`} data-deconnecte="">
            <h1 className="text-[22px] leading-tight font-bold m-0 text-center">Connectez-vous pour retrouver votre projet.</h1>
            <BoutonsConnexion />
          </div>
        </Corps>
      </>
    );
  }

  if (etat === 'chargement' || (etat === 'pret' && !liste)) {
    return (
      <>
        <EnTete variante="neutre" />
        <Corps>
          <Squelette lent={lent} />
        </Corps>
      </>
    );
  }

  if (etat === 'erreur') {
    return (
      <>
        <EnTete variante="neutre" />
        <Corps centre>
          <CarteMessage texte="Le réseau ne répond pas. Vérifiez votre connexion, puis réessayez.">
            <button type="button" className={`${PRIMAIRE} self-stretch`} onClick={() => void recharger()}>
              Réessayer
            </button>
          </CarteMessage>
        </Corps>
      </>
    );
  }

  const choix = choisirProjet(liste);
  if (choix.type !== 'projet') {
    const texte = {
      revoque: 'Votre accès à ce projet a été retiré. Pour toute question, écrivez à Joël.',
      archive: 'Ce projet est en pause. Pour toute question, écrivez à Joël.',
      aucun: "Aucun projet n'est ouvert pour ce compte 1saKELY. Pour toute question, écrivez à Joël."
    }[choix.type];
    return (
      <>
        <EnTete variante="neutre" />
        <Corps centre>
          <CarteMessage texte={texte}>
            <span data-etat-accueil={choix.type} />
            <BoutonWhatsApp className="self-stretch" />
          </CarteMessage>
          <button
            type="button"
            className="text-[14px] text-ciel min-h-11"
            onClick={async () => {
              await deconnexion();
              navigate('/', { replace: true });
            }}
          >
            Me connecter avec un autre compte
          </button>
        </Corps>
      </>
    );
  }

  const p = choix.espace;
  if (!p.inscrit) return <Navigate to="/inscription" replace />;
  const docs = ordonnerDocuments(p.documents ?? []);
  return (
    <>
      <EnTete variante="client" titre={p.nom_court ?? ''} sousTitre={lignePour(p)} nom={p.nom ?? ''} email={session?.email ?? ''} />
      <Corps>
        {(state as { ajout?: boolean } | null)?.ajout && (
          <p className="bg-clair text-[#075985] rounded-xl px-3.5 py-3 text-[15px] font-semibold m-0" role="status" data-ajout="">
            Ce projet s'ajoute à votre compte 1saKELY.
          </p>
        )}
        <h2 className="text-[17px] font-bold m-0">Vos documents</h2>
        {docs.length === 0 ? (
          <div className={CARTE} data-etat-accueil="vide">
            <p className="text-[15px] m-0 leading-[1.45]">Joël prépare votre premier document. Nous vous préviendrons dès qu'il est prêt.</p>
          </div>
        ) : (
          docs.map((d) => <CarteDocument key={d.questionnaire_id} d={d} tous={docs} p={p} />)
        )}
        <p className="text-[14px] text-doux m-0 leading-[1.45]">
          {p.role === 'contributeur'
            ? 'Prenez votre temps : vos réponses sont gardées. Vous pouvez vous arrêter et reprendre plus tard.'
            : 'Prenez votre temps : vos réponses sont gardées, datées et conservées. Vous pouvez vous arrêter et reprendre plus tard.'}
        </p>
        <BoutonDiscussion nonLus={p.messages_non_lus ?? 0} />
        {p.role === 'validant' ? (
          <div className="grid grid-cols-2 gap-2.5">
            <Link to="/equipe" className={`${SECONDAIRE} !text-[15px] !px-2`} data-mon-equipe={p.equipe ?? 0}>
              Mon équipe ({p.equipe ?? 1})
            </Link>
            <Link to="/infos" className={`${SECONDAIRE} !text-[15px] !px-2`} data-mes-infos="">
              Mes infos
            </Link>
          </div>
        ) : (
          <Link to="/infos" className={`${SECONDAIRE} !text-[15px]`} data-mes-infos="">
            Mes infos
          </Link>
        )}
      </Corps>
    </>
  );
}

const PASTILLE = 'inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-full self-start flex-none';

function CarteDocument({ d, tous, p }: { d: DocumentEspace; tous: DocumentEspace[]; p: Espace }) {
  if (p.role === 'contributeur') return <CarteContributeur d={d} p={p} />;
  const etat = etatCarte(d);
  const e = d.etat_personne;
  const nouvelle = estNouvelleVersion(d, tous);
  // Ready: straight to « Avant de confirmer » for the person who decides (VC-41).
  const lien = etat === 'pret' && p.role === 'validant' ? `/confirmer/${d.questionnaire_id}` : `/q/${d.questionnaire_id}/${questionAOuvrir(d)}`;
  const ancien = etat === 'remplace';

  let pastille: { texte: string; classe: string };
  if (etat === 'confirme') pastille = { texte: 'Confirmé', classe: 'bg-[#dcfce7] text-[#166534]' };
  else if (ancien) pastille = { texte: 'Version précédente', classe: 'bg-[#e2e8f0] text-[#334155]' };
  else if (etat === 'clos') pastille = { texte: 'Close', classe: 'bg-[#e2e8f0] text-[#334155]' };
  else if (etat === 'pret') pastille = { texte: 'Prêt à confirmer', classe: 'bg-[#dcfce7] text-[#166534]' };
  else if (etat === 'en_cours') pastille = { texte: `${e?.repondues ?? 0} sur ${e?.total ?? 0}`, classe: 'bg-[#fef3c7] text-[#92400e]' };
  else pastille = { texte: nouvelle ? 'Nouvelle version' : 'À commencer', classe: 'bg-clair text-[#075985]' };

  return (
    <div className={`${CARTE} ${ancien ? '!bg-[#f8fafc]' : ''}`} data-carte={etat} data-questionnaire={d.questionnaire_id}>
      <div className="flex items-start justify-between gap-2.5">
        <h2 className={`text-[17px] leading-[1.3] font-bold m-0 min-w-0 ${ancien ? 'text-doux' : ''}`}>{d.titre_client}</h2>
        <span className={`${PASTILLE} ${pastille.classe}`} data-pastille="">
          {etat === 'confirme' && <Icone nom="coche" epaisseur={2.4} />}
          {pastille.texte}
        </span>
      </div>
      {etat === 'confirme' ? (
        <>
          <p className="text-[13px] text-doux m-0" data-cycle="">
            {nomCycle(d.type, d.version)} : {comptes(d)}.{' '}
            <Link to={`/document/${d.document_id}`} className="text-ciel underline" data-lire-document="">
              Lire le document
            </Link>
          </p>
          {d.confirme_at && <p className="text-[13px] text-doux m-0">Vos réponses sont figées depuis le {dateHeure(d.confirme_at)} : elles ne se modifient plus.</p>}
          {!ancien && (d.echeance_at || etapeSuivi(d.etape_suivi).cle === 'disponible') && <Engagement d={d} />}
          {d.confirme_at && (
            <>
              <Link to={`/recu/${d.questionnaire_id}`} className={`${SECONDAIRE} !text-[15px]`} data-voir-recu="">
                Voir le reçu et le suivi
              </Link>
              <Link to={`/confirmer/${d.questionnaire_id}`} className="text-[14px] font-semibold text-ciel underline self-center min-h-11 flex items-center" data-voir-reponses="">
                Voir mes réponses (lecture seule)
              </Link>
            </>
          )}
          {!ancien && (
            <p className="text-[13px] text-doux m-0 leading-[1.45]" data-changement-avis="">
              Un changement d'avis ?{' '}
              <Link to="/discussion" state={{ retour: '/' }} className="text-discussion font-semibold underline">
                Écrivez-le dans la discussion du projet
              </Link>{' '}
              : Joël pourra le prendre en compte dans la version suivante.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-[13px] text-doux m-0" data-cycle="">
            {nomCycle(d.type, d.version)}
          </p>
          {!ancien && (
            <div className="h-2 bg-[#dbeafe] rounded-full overflow-hidden" role="progressbar" aria-valuenow={e?.jauge ?? 0} aria-valuemin={0} aria-valuemax={100} data-jauge={e?.jauge ?? 0}>
              <div className="h-2 bg-[#0284c7] rounded-full" style={{ width: `${e?.jauge ?? 0}%` }} />
            </div>
          )}
          {etat === 'clos' && <Close qid={d.questionnaire_id} />}
          {(etat === 'a_commencer' || etat === 'en_cours' || etat === 'pret') && (
            <Link to={lien} className={PRIMAIRE} data-action="">
              {etat === 'pret' ? (p.role === 'validant' ? 'Relire et confirmer' : 'Relire mes réponses') : etat === 'en_cours' ? 'Reprendre' : 'Commencer'}
            </Link>
          )}
        </>
      )}
    </div>
  );
}

/** Card of a contributor (screen 9 bis, VC-14): no gauge, « Votre avis : n sur t ». */
function CarteContributeur({ d, p }: { d: DocumentEspace; p: Espace }) {
  const etat = etatCarte(d);
  const e = d.etat_personne;
  const ancien = etat === 'remplace';
  const v = personneValidant(p.validant);
  const lire = (
    <Link to={`/document/${d.document_id}`} className="text-ciel underline" data-lire-document="">
      Lire le document
    </Link>
  );
  let pastille: { texte: string; classe: string };
  if (etat === 'confirme') pastille = { texte: 'Confirmé', classe: 'bg-[#dcfce7] text-[#166534]' };
  else if (ancien) pastille = { texte: 'Version précédente', classe: 'bg-[#e2e8f0] text-[#334155]' };
  else if (etat === 'clos') pastille = { texte: 'Close', classe: 'bg-[#e2e8f0] text-[#334155]' };
  else pastille = { texte: `Votre avis : ${e?.repondues ?? 0} sur ${e?.total ?? 0}`, classe: 'bg-clair text-[#075985]' };
  return (
    <div className={`${CARTE} ${ancien ? '!bg-[#f8fafc]' : ''}`} data-carte={etat} data-carte-contributeur="" data-questionnaire={d.questionnaire_id}>
      <div className="flex items-start justify-between gap-2.5">
        <h2 className={`text-[17px] leading-[1.3] font-bold m-0 min-w-0 ${ancien ? 'text-doux' : ''}`}>{d.titre_client}</h2>
        <span className={`${PASTILLE} ${pastille.classe}`} data-pastille="">
          {etat === 'confirme' && <Icone nom="coche" epaisseur={2.4} />}
          {pastille.texte}
        </span>
      </div>
      <p className="text-[13px] text-doux m-0" data-cycle="">
        {nomCycle(d.type, d.version)}. {lire}
      </p>
      {etat === 'confirme' ? (
        <>
          <p className="text-[15px] font-semibold text-[#166534] m-0" data-confirme-par="">
            Confirmé par {d.confirme_par ? personneValidant(d.confirme_par).nom : v.nom}
            {d.confirme_at ? ` le ${dateSeule(d.confirme_at)}` : ''}
          </p>
          <p className="text-[13px] text-doux m-0">Vos avis sont conservés ; ils ne se modifient plus.</p>
          {!ancien && d.confirme_at && <SuiviDossier d={d} />}
          <Link to={`/confirmer/${d.questionnaire_id}`} className="text-[14px] font-semibold text-ciel underline self-center min-h-11 flex items-center" data-voir-reponses="">
            Voir mon avis (lecture seule)
          </Link>
        </>
      ) : etat === 'clos' ? (
        <Close qid={d.questionnaire_id} contributeur />
      ) : ancien ? (
        <p className="text-[13px] text-doux m-0">Vos avis sur cette version sont conservés.</p>
      ) : (
        <>
          <p className="text-[14px] text-doux m-0 leading-[1.45]" data-explication-avis="">
            {v.nom}, qui décide pour votre équipe, voit votre avis sur chaque question avant de trancher. Votre avis aide {v.prenom} à décider ; il ne valide rien à sa place.
          </p>
          <Link to={`/q/${d.questionnaire_id}/${questionAOuvrir(d)}`} className={PRIMAIRE} data-action="">
            {etat === 'a_commencer' ? 'Donner mon avis' : etat === 'pret' ? 'Revoir mon avis' : 'Reprendre'}
          </Link>
        </>
      )}
    </div>
  );
}

/** Follow-up block of the confirmed card: the same stage as the receipt (`etape_suivi`, item E). */
function Engagement({ d }: { d: DocumentEspace }) {
  const e = etapeSuivi(d.etape_suivi);
  const reste = e.compteARebours && d.echeance_at ? delaiRestant(d.echeance_at) : null;
  return (
    <div className="flex flex-col gap-1 bg-fond border border-[#bae6fd] rounded-[10px] px-3 py-2.5" data-engagement="" data-etape-accueil={e.cle}>
      <span className="text-[14px] font-bold text-ciel">{e.titreAccueil}</span>
      {!e.compteARebours ? (
        <span className="text-[13px] text-doux" data-disponible="">
          {TEXTE_DISPONIBLE}
        </span>
      ) : !d.echeance_at ? null : reste ? (
        <>
          <span className="text-[13px] text-doux">
            Engagement CyberKELY : au plus tard le <span className="whitespace-nowrap">{dateHeure(d.echeance_at)}</span>
          </span>
          <strong className="text-[18px] text-nuit" data-compte-a-rebours="">
            {reste}
          </strong>
        </>
      ) : (
        <span className="text-[13px] text-doux">Votre dossier demande un peu plus de temps, Joël vous écrit aujourd'hui.</span>
      )}
    </div>
  );
}
/** Closed card (RM4): the message, the answers in read only, the refused ones, the way to the thread. */
function Close({ qid, contributeur = false }: { qid: string; contributeur?: boolean }) {
  return (
    <>
      <p className="text-[14px] text-doux m-0 leading-[1.45]" data-close="">
        Cette consultation est close. Vos réponses sont conservées.
      </p>
      <ReponsesRefusees qid={qid} />
      <Link to={`/confirmer/${qid}`} className="text-[14px] font-semibold text-ciel underline self-center min-h-11 flex items-center" data-voir-reponses="">
        {contributeur ? 'Voir mon avis (lecture seule)' : 'Voir mes réponses (lecture seule)'}
      </Link>
      <Link to="/discussion" state={{ retour: '/' }} className={DISCUSSION} data-close-discussion="">
        <Icone nom="bulle" />
        Écrire à Joël
      </Link>
    </>
  );
}
