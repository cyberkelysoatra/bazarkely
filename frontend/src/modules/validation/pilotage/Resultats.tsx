// Screen 14: results of a consultation for the project assistant (VC-34). Computer page (2 columns
// from 1024 px), readable whole by the Claude extension of Chrome without any click: figures, table
// of the questions, « Points à reprendre » and the « Texte pour l'assistant » (utils/export.ts),
// always fully in the page (no collapsed or scrolled-away part).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BarreRetour, CARTE, Corps, PRIMAIRE, SECONDAIRE, Squelette } from '../composants/Mise';
import { NOM_CYCLE } from '../utils/regles';
import {
  dateHeureMinute,
  prochaineEtape,
  synthese,
  texteAssistant,
  texteEtat,
  type DonneesResultats,
  type LigneResultat,
  type ReponseLue
} from '../utils/export';
import { ficheClient, questionnaire, type FicheClient, type QuestionnaireComplet } from './api';
import { EnTetePilotage, ErreurReseau, P_ATTENTE, P_NON, P_OK, Pilule } from './Commun';

function donnees(q: QuestionnaireComplet, f: FicheClient | null): DonneesResultats {
  const v = f?.personnes.find((p) => p.role === 'validant' && !p.revoque_at);
  return {
    type: q.document.type,
    version: q.document.version,
    titre_client: q.document.titre_client,
    entreprise: f?.client.entreprise ?? '',
    validant: v ? { personne: `${v.civilite} ${v.nom}`, fonction: v.fonction } : null,
    confirme_at: q.questionnaire.confirme_at ?? null,
    chemin: q.chemin_validant ?? [],
    questions: q.questions.map((x) => ({ ...x, reponses: x.reponses ?? [] })),
    messages: (q.messages ?? []).map((m) => ({ auteur: m.auteur, texte: m.texte, retire: m.retire, cree_at: m.cree_at, question_id: m.question_id }))
  };
}

const court = (iso: string) => dateHeureMinute(iso).slice(0, 5) + dateHeureMinute(iso).slice(10);

function Reponse({ r }: { r: ReponseLue }) {
  const n = r.choix?.nature;
  const classe = n === 'refus' ? P_NON : n === 'reserve' ? P_ATTENTE : P_OK;
  return (
    <>
      <Pilule classe={`${classe} !whitespace-normal`}>{r.choix ? `${r.choix.lettre}, ${r.choix.libelle}` : 'choix inconnu'}</Pilule>
      {r.commentaire && <span className="block text-[13px] text-doux mt-1 break-words">« {r.commentaire} »</span>}
    </>
  );
}

function Ligne({ l }: { l: LigneResultat }) {
  const date = l.reponse?.repondu_at ?? l.equipe[l.equipe.length - 1]?.repondu_at;
  return (
    <tr data-ligne={l.q.numero}>
      <td className="p-2 border-b border-[#e2e8f0] align-top whitespace-nowrap font-semibold">{l.q.numero}</td>
      <td className="p-2 border-b border-[#e2e8f0] align-top min-w-[120px]">
        {l.q.sujet_client}
        {l.q.critere && <span className="block text-[12px] text-doux">Critère : {l.q.critere}</span>}
      </td>
      <td className="p-2 border-b border-[#e2e8f0] align-top min-w-[160px]">
        {!l.surChemin ? <span className="text-[13px] text-doux">Hors chemin</span> : l.reponse ? <Reponse r={l.reponse} /> : <span className="text-[13px] text-doux">Sans réponse</span>}
        {l.historique.map((h, i) => (
          <span key={i} className="block text-[12px] text-doux mt-1">
            Avant : {h.choix ? `${h.choix.lettre}, ${h.choix.libelle}` : 'choix inconnu'} le {court(h.repondu_at)}, remplacée
          </span>
        ))}
      </td>
      <td className="p-2 border-b border-[#e2e8f0] align-top min-w-[140px]">
        {l.equipe.length === 0 && <span className="text-[13px] text-doux">Aucun avis</span>}
        {l.equipe.map((e, i) => (
          <span key={i} className="block text-[13px]">
            {e.personne.replace(/^(Madame|Monsieur)\s+/, '')} : {e.choix ? e.choix.libelle : 'choix inconnu'}
            {e.commentaire ? ` (« ${e.commentaire} »)` : ''}
          </span>
        ))}
      </td>
      <td className="p-2 border-b border-[#e2e8f0] align-top whitespace-nowrap text-[13px]">{date ? court(date) : ''}</td>
    </tr>
  );
}

export default function Resultats() {
  const { questionnaire: id = '' } = useParams();
  const [q, setQ] = useState<QuestionnaireComplet | null>(null);
  const [fiche, setFiche] = useState<FicheClient | null>(null);
  const [erreur, setErreur] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('vc-large');
    return () => document.documentElement.classList.remove('vc-large');
  }, []);

  const lire = useCallback(async () => {
    setErreur(false);
    try {
      const r = await questionnaire(id);
      const f = await ficheClient(r.questionnaire.client_id);
      setFiche(f);
      setQ(r);
    } catch {
      setErreur(true);
    }
  }, [id]);
  useEffect(() => {
    setQ(null);
    void lire();
  }, [lire]);

  const d = useMemo(() => (q ? donnees(q, fiche) : null), [q, fiche]);
  const s = useMemo(() => (d ? synthese(d) : null), [d]);
  const texte = useMemo(() => (d ? texteAssistant(d) : ''), [d]);

  const cycle = d ? `${(NOM_CYCLE[d.type] ?? 'Document').toLocaleLowerCase('fr')} v${d.version}` : '';
  const etat = d ? texteEtat(d.confirme_at) : '';
  const sousTitre = d ? [d.entreprise, cycle, d.confirme_at ? etat.replace(/(\d{2}):(\d{2})$/, '$1 h $2') : etat].filter(Boolean).join(', ') : '';
  const nomFichier = d ? `resultats-${(fiche?.client.nom_court ?? 'client').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${d.type}-v${d.version}.md` : 'resultats.md';

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setRetour({ ok: true, texte: `Texte copié (${texte.length} caractères) : collez-le dans la conversation de l'assistant.` });
    } catch {
      setRetour({ ok: false, texte: 'Copie refusée par le navigateur : sélectionnez le texte ci-dessous puis copiez-le.' });
    }
  }

  function telecharger() {
    const url = URL.createObjectURL(new Blob([texte], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nomFichier;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const retourDetail = q ? `/pilotage/client/${q.questionnaire.client_id}` : '/pilotage';
  const nbMessages = q?.messages?.length ?? 0;
  const lies = (q?.messages ?? []).filter((m) => m.question_id).length;

  return (
    <>
      <EnTetePilotage titre="Pilotage : résultats de la consultation" sousTitre={sousTitre} />
      <Corps className="lg:px-8" data-resultats={id}>
        <BarreRetour vers={retourDetail} libelle="Détail du client" />
        {!q && !erreur && <Squelette lent={false} />}
        {!q && erreur && <ErreurReseau reessayer={() => void lire()} />}
        {q && d && s && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 lg:gap-6 items-start">
            <div className="flex flex-col gap-4 min-w-0">
              <p className={`text-[15px] font-semibold m-0 ${d.confirme_at ? 'text-[#166534]' : 'text-[#92400e]'}`} data-etat-resultats={d.confirme_at ? 'confirme' : 'provisoire'}>
                {NOM_CYCLE[d.type] ?? 'Document'} v{d.version} ({d.titre_client}) : {d.confirme_at ? `${etat} (heure de Madagascar).` : `${etat}.`}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-chiffres="">
                <div className={`${CARTE} !gap-0.5`}>
                  <span className="text-[13px] text-doux">Jauge</span>
                  <strong className="text-[22px]" data-jauge="">
                    {s.chiffres.jauge} %
                  </strong>
                </div>
                <div className={`${CARTE} !gap-0.5`}>
                  <span className="text-[13px] text-doux">Validées</span>
                  <strong className="text-[22px] text-[#166534]" data-validees="">
                    {s.chiffres.validees}
                  </strong>
                </div>
                <div className={`${CARTE} !gap-0.5`}>
                  <span className="text-[13px] text-doux">Réserves</span>
                  <strong className="text-[22px] text-[#92400e]" data-reserves="">
                    {s.chiffres.reserves}
                  </strong>
                </div>
                <div className={`${CARTE} !gap-0.5`}>
                  <span className="text-[13px] text-doux">Refus</span>
                  <strong className="text-[22px] text-[#991b1b]" data-refus="">
                    {s.chiffres.refus}
                  </strong>
                </div>
              </div>
              <div className={`${CARTE} !p-2 overflow-x-auto`}>
                <table className="w-full border-collapse text-[13px]" data-tableau-resultats="">
                  <caption className="text-left text-[13px] text-doux p-2">
                    {s.chiffres.total} questions sur le chemin du validant ({s.chiffres.repondues} répondues), {s.horsChemin} hors chemin.
                  </caption>
                  <thead>
                    <tr>
                      {['N°', 'Sujet', 'Réponse du validant', 'Équipe', 'Date'].map((t) => (
                        <th key={t} scope="col" className="text-left text-doux font-semibold p-2 border-b-2 border-filet whitespace-nowrap">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.tableau.map((l) => (
                      <Ligne key={l.q.id} l={l} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-[#fffbeb] border border-[#fcd34d] rounded-[10px] p-3 text-[14px] text-[#78350f] leading-[1.45]" data-points="">
                <strong>Points à reprendre</strong> :{' '}
                {s.points.length
                  ? `${s.points.map((p) => `question ${p.numero} (${p.nature === 'refus' ? 'refus' : 'réserve'})`).join(', ')}. ${prochaineEtape(d.type, d.version)}`
                  : 'aucun refus ni réserve sur le chemin du validant.'}
              </div>
            </div>

            <div className="flex flex-col gap-4 min-w-0">
              <div className={CARTE}>
                <h2 id="titre-texte" className="text-[17px] leading-[1.3] font-bold m-0">
                  Texte pour l'assistant du projet
                </h2>
                <p className="text-[13px] text-doux m-0">Toutes les réponses, avis, commentaires et historiques, dans le même format que l'import.</p>
                <div className="flex gap-3 flex-wrap">
                  <button type="button" className={PRIMAIRE} onClick={() => void copier()} data-copier-tout="">
                    Copier tout
                  </button>
                  <button type="button" className={SECONDAIRE} onClick={telecharger} data-telecharger="">
                    Télécharger (.md)
                  </button>
                </div>
                {retour && (
                  <p className={`text-[14px] font-semibold m-0 ${retour.ok ? 'text-[#166534]' : 'text-danger'}`} role="status" data-retour="">
                    {retour.texte}
                  </p>
                )}
                <pre
                  className="m-0 p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] text-[12px] leading-normal font-mono whitespace-pre-wrap break-words"
                  aria-labelledby="titre-texte"
                  data-texte-assistant=""
                >
                  {texte}
                </pre>
              </div>
              <div className={`${CARTE} !gap-1`}>
                <h2 className="text-[17px] leading-[1.3] font-bold m-0">Discussion du projet</h2>
                <p className="text-[13px] text-doux m-0">
                  {nbMessages
                    ? `${nbMessages} message${nbMessages > 1 ? 's' : ''}, dont ${lies} rattaché${lies > 1 ? 's' : ''} à une question : inclus à la fin du texte pour l'assistant.`
                    : "Aucun message dans la discussion du projet pour l'instant."}
                </p>
              </div>
              <p className="text-[13px] text-doux m-0">Page réservée à Joël. L'assistant la lit dans le Chrome de Joël, par l'extension Claude.</p>
              <Link to={retourDetail} className="text-[14px] font-semibold text-ciel min-h-11 flex items-center">
                Retour au détail du client
              </Link>
            </div>
          </div>
        )}
      </Corps>
    </>
  );
}
