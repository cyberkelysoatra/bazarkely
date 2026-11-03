// Screen 8: receipt and follow-up (/recu/:questionnaire, VC-12 with the PDF receipt, VC-37 client part,
// VC-42 cards).
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useEspace } from '../EspaceContexte';
import { CARTE, Corps, PRIMAIRE, SECONDAIRE, useCouleurTheme } from '../composants/Mise';
import { Icone } from '../composants/Icones';
import { comptes, dateHeure, delaiRestant, fonctionEnLigne, nomCycle, sansCivilite } from '../utils/regles';
import { TEXTE_DISPONIBLE, etapeSuivi } from '../utils/suivi';
import { modeleRecu } from '../utils/recu';
import type { DocumentEspace } from '../utils/types';
import { Attente, EnTeteClient, documentDe, useProjet, useQuestionnaire } from './Cadre';
import { chargerQuestionnaire, etatFile } from '../appels/file';
import CartesTelephone from '../composants/CartesTelephone';
import { usePresence } from '../appels/presence';
import { BoutonDiscussion } from '../composants/VersDiscussion';

export default function Recu() {
  useCouleurTheme('#0369a1');
  const { questionnaire: qid = '' } = useParams();
  const navigate = useNavigate();
  const { statut, p, email, lent } = useProjet();
  const { recharger } = useEspace();
  const d = documentDe(p, qid);
  usePresence(p?.client_id, p ? { type: 'recu' } : null);
  const [, setTic] = useState(0);
  const [partage, setPartage] = useState<string | null>(null);
  const [preparation, setPreparation] = useState(false);
  // Answers kept on the device (refusals and reservations of the PDF).
  useQuestionnaire(qid);

  // Countdown refreshed every 30 s (days and hours, never seconds).
  useEffect(() => {
    const t = window.setInterval(() => setTic((n) => n + 1), 30000);
    return () => window.clearInterval(t);
  }, []);
  // Arriving right after the confirmation with an older copy: read the server once more.
  const aRelire = statut === 'pret' && d && !d.confirme_at;
  useEffect(() => {
    if (aRelire) void recharger();
  }, [aRelire, recharger]);

  if (statut === 'sortie') return <Navigate to="/" replace />;
  if (statut === 'attente' || !p) {
    return (
      <>
        <EnTeteClient p={p} email={email} />
        <Attente lent={lent} />
      </>
    );
  }
  if (!d) return <Navigate to="/" replace />;
  if (!d.confirme_at) return <Navigate to={`/confirmer/${qid}`} replace />;

  const par = [sansCivilite(d.confirme_par), d.confirme_par_fonction ? fonctionEnLigne(d.confirme_par_fonction) : ''].filter(Boolean).join(', ');
  async function partager() {
    if (!d || !p || preparation) return;
    setPartage(null);
    setPreparation(true);
    try {
      let q = etatFile().questionnaires[qid];
      if (!q) {
        await chargerQuestionnaire(qid);
        q = etatFile().questionnaires[qid];
      }
      if (!q) {
        setPartage("Le reçu n'est pas encore sur ce téléphone : réessayez avec le réseau.");
        return;
      }
      // jsPDF and the layout: own chunk, loaded on this first tap only.
      const { partagerRecu } = await import('../appels/recuPdf');
      const issue = await partagerRecu(modeleRecu(d, p, q));
      if (issue === 'telecharge') setPartage('Reçu enregistré sur ce téléphone, en PDF.');
    } catch {
      setPartage(navigator.onLine ? "Le reçu n'a pas pu être préparé. Réessayez." : 'Pas de réseau : le reçu en PDF se prépare au retour du réseau.');
    } finally {
      setPreparation(false);
    }
  }
  const ligne = (etiquette: string, valeur: string, cle: string) => (
    <div className="flex justify-between gap-2.5 py-2.5 text-[14px] border-b border-[#e2e8f0] last:border-b-0" data-ligne-recu={cle}>
      <span className="text-[13px] text-doux flex-none">{etiquette}</span>
      <span className="text-right min-w-0">{valeur}</span>
    </div>
  );

  return (
    <>
      <EnTeteClient p={p} email={email} />
      <Corps data-recu={d.numero_recu ?? ''}>
        <div className={`${CARTE} items-center text-center`}>
          <div className="w-[60px] h-[60px] rounded-full bg-[#dcfce7] text-[#166534] flex items-center justify-center">
            <Icone nom="coche" epaisseur={2.4} className="w-8 h-8" />
          </div>
          <h1 className="text-[22px] leading-tight font-bold m-0">Réponses enregistrées</h1>
          <p className="text-[14px] text-doux leading-[1.45] m-0" data-merci="">
            Merci {[p.civilite, p.nom].filter(Boolean).join(' ')}, Joël a reçu vos réponses. Gardez ce reçu.
          </p>
        </div>
        <div className={`${CARTE} !gap-0 !py-1`} data-lignes-recu="">
          <div className="flex justify-between gap-2.5 py-2.5 text-[14px] border-b border-[#e2e8f0]" data-ligne-recu="numero">
            <span className="text-[13px] text-doux">Reçu n°</span>
            <strong>{d.numero_recu}</strong>
          </div>
          {ligne('Confirmé par', par, 'par')}
          {ligne('Document', nomCycle(d.type, d.version).replace(', version ', ', v'), 'document')}
          {ligne('Date', dateHeure(d.confirme_at), 'date')}
          {ligne('Client', p.entreprise ?? '', 'client')}
          {ligne('Projet', p.nom_court ?? '', 'projet')}
          {ligne('Réponses', comptes(d), 'reponses')}
        </div>
        <Link to={`/confirmer/${qid}`} className="text-[14px] font-semibold text-ciel underline self-center min-h-11 flex items-center" data-voir-reponses="">
          Voir mes réponses (lecture seule)
        </Link>
        <SuiviDossier d={d} />
        <CartesTelephone />
        <button type="button" className={PRIMAIRE} onClick={() => void partager()} disabled={preparation} data-partager="">
          {preparation ? 'Préparation du reçu…' : 'Partager le reçu'}
        </button>
        {partage && (
          <p className="text-[13px] text-doux text-center m-0" role="status" data-partage-etat="">
            {partage}
          </p>
        )}
        <BoutonDiscussion nonLus={p.messages_non_lus ?? 0} />
        <button type="button" className={SECONDAIRE} onClick={() => navigate('/')} data-retour-accueil="">
          Retour à l'accueil
        </button>
      </Corps>
    </>
  );
}

/** « La suite de votre dossier »: steps of the follow-up (receipt, contributor's confirmed card). */
export function SuiviDossier({ d }: { d: DocumentEspace }) {
  const courante = etapeSuivi(d.etape_suivi).rang;
  const reste = d.echeance_at ? delaiRestant(d.echeance_at) : null;
  if (!d.confirme_at) return null;
  return (
    <div className={`${CARTE} !gap-3.5`} data-suivi="">
      <h2 className="text-[17px] leading-[1.3] font-bold m-0">La suite de votre dossier</h2>
      <Etape fait titre="Réponses reçues" detail={dateHeure(d.confirme_at)} cle="recues" />
      <Etape
        fait={courante > 1}
        courante={courante === 1}
        titre="En analyse"
        cle="analyse"
        engagement={courante === 1 ? { echeance: d.echeance_at, reste } : undefined}
      />
      <Etape
        fait={courante > 2}
        courante={courante === 2}
        titre="Version suivante en préparation"
        cle="preparation"
        engagement={courante === 2 ? { echeance: d.echeance_at, reste } : undefined}
      />
      <Etape courante={courante === 3} titre="Disponible" detail={courante === 3 ? TEXTE_DISPONIBLE : 'Vous recevrez une notification'} cle="disponible" />
    </div>
  );
}

function Etape({
  fait = false,
  courante = false,
  titre,
  detail,
  cle,
  engagement
}: {
  fait?: boolean;
  courante?: boolean;
  titre: string;
  detail?: string;
  cle: string;
  engagement?: { echeance: string | null; reste: string | null };
}) {
  return (
    <div className="flex gap-3 items-start" data-etape={cle} data-etape-etat={fait ? 'fait' : courante ? 'courante' : 'a_venir'}>
      {fait ? (
        <span className="w-[26px] h-[26px] rounded-full bg-[#166534] text-white flex items-center justify-center flex-none">
          <Icone nom="coche" epaisseur={3} className="w-3.5 h-3.5" />
        </span>
      ) : (
        <span className={`w-[26px] h-[26px] rounded-full flex-none box-border ${courante ? 'border-[3px] border-ciel bg-clair' : 'border-2 border-[#cbd5e1] bg-white'}`} />
      )}
      <div className="flex flex-col gap-0.5 pt-[3px] min-w-0 flex-1">
        <span className={`text-[15px] ${fait ? 'font-semibold text-[#166534]' : courante ? 'font-bold text-ciel' : 'font-medium text-[#64748b]'}`}>{titre}</span>
        {detail && <span className="text-[13px] text-doux">{detail}</span>}
        {engagement?.echeance && (
          <div className="flex flex-col gap-1 mt-1 bg-fond border border-[#bae6fd] rounded-[10px] px-3 py-2.5" data-engagement="">
            {engagement.reste ? (
              <>
                <span className="text-[13px] text-doux">
                  Engagement CyberKELY : au plus tard le <span className="whitespace-nowrap">{dateHeure(engagement.echeance)}</span>
                </span>
                <strong className="text-[20px] text-nuit" data-compte-a-rebours="">
                  {engagement.reste}
                </strong>
              </>
            ) : (
              <span className="text-[13px] text-doux" data-delai-depasse="">
                Votre dossier demande un peu plus de temps, Joël vous écrit aujourd'hui.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
