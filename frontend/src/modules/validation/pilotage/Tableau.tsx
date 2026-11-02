// Screen 10: dashboard (VC-26, VC-32, VC-38). One card per client in the server order (nearest
// deadline first, then longest wait); re-read every 10 s while the screen is visible.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CARTE, Corps, PRIMAIRE, Squelette } from '../composants/Mise';
import { Icone } from '../composants/Icones';
import { NOM_CYCLE, dateHeure } from '../utils/regles';
import { tableau, type LigneTableau, type QuestionnaireTableau } from './api';
import { EnTetePilotage, ErreurReseau, P_ATTENTE, P_MESSAGE, P_NON, P_OK, Pilule } from './Commun';
import { aRendre, ilYa } from './regles';

export const RELECTURE_MS = 10000;

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

/** Re-reads `lire` every `ms` while the page is visible, at once when it becomes visible again. */
export function useRelecture(lire: () => void, ms: number): void {
  const ref = useRef(lire);
  ref.current = lire;
  useEffect(() => {
    let t: number | undefined;
    const armer = () => {
      window.clearInterval(t);
      if (document.visibilityState === 'visible') t = window.setInterval(() => ref.current(), ms);
    };
    const surVisibilite = () => {
      if (document.visibilityState === 'visible') ref.current();
      armer();
    };
    armer();
    document.addEventListener('visibilitychange', surVisibilite);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', surVisibilite);
    };
  }, [ms]);
}

export default function Tableau() {
  const [lignes, setLignes] = useState<LigneTableau[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [, setHorloge] = useState(0);

  const lire = useCallback(() => {
    tableau()
      .then((l) => {
        setLignes(Array.isArray(l) ? l : []);
        setErreur(false);
        setHorloge((n) => n + 1);
      })
      .catch(() => setErreur(true));
  }, []);
  useEffect(lire, [lire]);
  useRelecture(lire, RELECTURE_MS);

  const enLigne = (lignes ?? []).reduce((t, l) => t + l.personnes.filter((p) => p.en_ligne).length, 0);
  const delais = (lignes ?? []).reduce((t, l) => t + l.questionnaires.filter((q) => echeanceOuverte(q)).length, 0);
  const sousTitre = lignes
    ? `${pluriel(lignes.length, 'client', 'clients')}, ${enLigne} en ligne, ${pluriel(delais, 'délai', 'délais')} à tenir`
    : '';
  const recent = (lignes ?? [])
    .filter((l) => l.derniere_activite)
    .sort((a, b) => Date.parse(b.derniere_activite!) - Date.parse(a.derniere_activite!))[0];

  return (
    <>
      <EnTetePilotage titre="Pilotage : consultations clients" sousTitre={sousTitre} />
      <Corps>
        <Link to="/pilotage/client/nouveau/fiche" className={PRIMAIRE} data-nouveau-client="">
          + Nouveau client
        </Link>
        {lignes === null && !erreur && <Squelette lent={false} />}
        {lignes === null && erreur && <ErreurReseau reessayer={lire} />}
        {lignes && erreur && (
          <p className="text-[13px] text-[#92400e] m-0" role="status">
            Le réseau ne répond pas : affichage de la dernière lecture.
          </p>
        )}
        {lignes && recent && (
          <div className={`${CARTE} !flex-row items-start !bg-[#fef3c7] !border-[#fcd34d] text-[#78350f]`} role="status" data-alerte="">
            <Icone nom="cloche" />
            <p className="text-[14px] m-0 leading-[1.45]">
              <strong>{recent.entreprise}</strong> : dernière réponse {ilYa(recent.derniere_activite!)}, le {dateHeure(recent.derniere_activite!)}.
            </p>
          </div>
        )}
        {lignes && lignes.length === 0 && (
          <div className={CARTE} data-tableau-vide="">
            <p className="text-[15px] m-0">Aucun client pour l'instant.</p>
          </div>
        )}
        {lignes && lignes.length > 0 && (
          <p className="text-[13px] text-doux m-0">Classés par échéance la plus proche, puis par attente la plus longue.</p>
        )}
        {lignes?.map((l) => <CarteClient key={l.client_id} l={l} />)}
      </Corps>
    </>
  );
}

function echeanceOuverte(q: QuestionnaireTableau): boolean {
  return q.etat === 'confirme' && !!q.echeance_at && (q.etape_suivi ?? '') !== 'disponible';
}

function CarteClient({ l }: { l: LigneTableau }) {
  const echeances = l.questionnaires.filter(echeanceOuverte).map((q) => q.echeance_at!);
  const proche = echeances.sort()[0];
  const rendre = proche ? aRendre(proche) : null;
  const refus = l.questionnaires.reduce((t, q) => t + (q.etat_validant?.refus ?? 0), 0);
  const reserves = l.questionnaires.reduce((t, q) => t + (q.etat_validant?.reserves ?? 0), 0);
  const attente = !proche && l.derniere_activite ? Math.floor((Date.now() - Date.parse(l.derniere_activite)) / 86400000) : 0;
  return (
    <Link to={`/pilotage/client/${l.client_id}`} className={`${CARTE} no-underline text-encre`} data-client={l.client_id}>
      <div className="flex items-start justify-between gap-2.5">
        <h2 className="text-[17px] leading-[1.3] font-bold m-0 min-w-0 break-words">{l.entreprise}</h2>
        {proche && (
          <Pilule classe={rendre ? P_ATTENTE : P_NON} data-echeance="">
            {rendre ?? 'Délai dépassé'}
          </Pilule>
        )}
        {!proche && attente > 0 && <Pilule classe={P_ATTENTE}>{`attend ${attente} j`}</Pilule>}
      </div>
      {(refus > 0 || reserves > 0 || l.messages_non_lus > 0) && (
        <div className="flex gap-1.5 flex-wrap" data-pastilles="">
          {refus > 0 && <Pilule classe={P_NON}>{pluriel(refus, 'refus', 'refus')}</Pilule>}
          {reserves > 0 && <Pilule classe={P_ATTENTE}>{pluriel(reserves, 'réserve', 'réserves')}</Pilule>}
          {l.messages_non_lus > 0 && <Pilule classe={P_MESSAGE}>{pluriel(l.messages_non_lus, 'message non lu', 'messages non lus')}</Pilule>}
        </div>
      )}
      {l.personnes.map((p, i) =>
        p.en_ligne ? (
          <p key={i} className="text-[13px] text-[#166534] font-semibold m-0 flex items-center gap-1.5" data-en-ligne="">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] flex-none" />
            {p.nom} en ligne{p.page ? ` : ${p.page}` : ''}
          </p>
        ) : (
          <p key={i} className="text-[13px] text-doux m-0 flex items-center gap-1.5" data-visite="">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#94a3b8] flex-none" />
            {p.derniere_visite ? `Dernière visite de ${p.nom} : ${dateHeure(p.derniere_visite)}` : `${p.nom} : pas encore de visite`}
          </p>
        )
      )}
      {l.questionnaires.length === 0 && <p className="text-[13px] text-doux m-0">Aucun questionnaire publié.</p>}
      {l.questionnaires.map((q) => {
        const e = q.etat_validant;
        const nt = e ? `${e.repondues} sur ${e.total}` : '0 sur 0';
        return (
          <div key={q.id} className="flex flex-col gap-1" data-questionnaire={q.id}>
            <div className="flex items-center justify-between gap-2.5">
              <span className="text-[13px] text-doux min-w-0">
                {NOM_CYCLE[q.type] ?? 'Document'} v{q.version}
              </span>
              <Pilule classe={q.etat === 'confirme' ? P_OK : P_ATTENTE} data-etat={q.etat}>
                {q.etat === 'confirme' ? `confirmée, ${nt}` : nt}
              </Pilule>
            </div>
            <div className="h-2 bg-[#dbeafe] rounded-full overflow-hidden" role="progressbar" aria-valuenow={e?.jauge ?? 0} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-2 bg-[#0284c7] rounded-full" style={{ width: `${e?.jauge ?? 0}%` }} />
            </div>
          </div>
        );
      })}
    </Link>
  );
}
