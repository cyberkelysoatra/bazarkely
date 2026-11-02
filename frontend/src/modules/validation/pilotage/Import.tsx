// Screen 13: import of a consultation written by the project assistant (VC-22, VC-23). Computer
// page (2 columns from 1024 px), every field named and labelled so that the Claude extension of
// Chrome can fill and submit it alone. Live reading by lireImport(); the server checks again.
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BarreRetour, CARTE, Corps, PRIMAIRE, SECONDAIRE } from '../composants/Mise';
import { NOM_CYCLE } from '../utils/regles';
import { FORMAT_ATTENDU, lireImport } from '../utils/import';
import { enregistrerBrouillon, enregistrerModele, ficheClient, modeles as lireModeles, type Modele } from './api';
import { CHAMP, ETIQUETTE, EnTetePilotage } from './Commun';

type Resultat = { ok: true; id: string; questions: number; cheminMax: number } | { ok: false; erreurs: string[] };

export default function Import() {
  const { client = '' } = useParams();
  const [entreprise, setEntreprise] = useState('');
  const [texte, setTexte] = useState('');
  // « assistant » once the text was pasted or filled by a tool (no keyboard typing).
  const [colle, setColle] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [liste, setListe] = useState<Modele[]>([]);
  const [modeleChoisi, setModeleChoisi] = useState('');
  const [nomModele, setNomModele] = useState('');
  const [retourModele, setRetourModele] = useState<{ ok: boolean; texte: string } | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('vc-large');
    return () => document.documentElement.classList.remove('vc-large');
  }, []);

  useEffect(() => {
    ficheClient(client)
      .then((f) => setEntreprise(f.client.entreprise))
      .catch(() => setEntreprise(''));
    lireModeles()
      .then((l) => setListe(Array.isArray(l) ? l : []))
      .catch(() => setListe([]));
  }, [client]);

  const lecture = useMemo(() => lireImport(texte, client, colle ? 'assistant' : 'joel'), [texte, client, colle]);
  const doc = lecture.brouillon.document;
  const vide = !texte.trim();
  const sousTitre = [entreprise ? `pour ${entreprise}` : '', doc.type ? `${(NOM_CYCLE[doc.type] ?? doc.type).toLocaleLowerCase('fr')} v${doc.version}` : '', 'en brouillon']
    .filter(Boolean)
    .join(', ');

  async function creer() {
    if (vide || lecture.problemes.length) return;
    setEnvoi(true);
    setResultat(null);
    try {
      const r = await enregistrerBrouillon({ ...lecture.brouillon, client_id: client, source_texte: texte });
      if (r.ok && r.questionnaire_id) setResultat({ ok: true, id: r.questionnaire_id, questions: r.questions ?? lecture.nbQuestions, cheminMax: r.chemin_max ?? lecture.cheminMax });
      else setResultat({ ok: false, erreurs: r.erreurs?.length ? r.erreurs : ['Le serveur a refusé le brouillon.'] });
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setResultat({ ok: false, erreurs: [m === 'timeout' ? 'Le réseau ne répond pas : le brouillon n’est pas créé. Réessayez.' : `Le serveur a refusé le brouillon : ${m}`] });
    } finally {
      setEnvoi(false);
    }
  }

  async function sauverModele() {
    const nom = nomModele.trim();
    if (!nom || vide) {
      setRetourModele({ ok: false, texte: 'Écrivez un nom de modèle et un texte.' });
      return;
    }
    const type = doc.type || 'note_cadrage';
    const existant = liste.find((m) => m.nom === nom && m.type === type);
    try {
      const r = await enregistrerModele(existant?.id ?? null, type, nom, texte);
      if (!r.ok) throw new Error('refus');
      setRetourModele({ ok: true, texte: existant ? `Modèle « ${nom} » mis à jour.` : `Modèle « ${nom} » enregistré.` });
      setListe(await lireModeles());
    } catch {
      setRetourModele({ ok: false, texte: 'Le modèle n’est pas enregistré. Réessayez.' });
    }
  }

  const sansProbleme = !vide && lecture.problemes.length === 0;

  return (
    <>
      <EnTetePilotage titre="Pilotage : importer une consultation" sousTitre={sousTitre} />
      <Corps className="lg:px-8">
        <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-3">
          <BarreRetour vers={`/pilotage/client/${client}/fiche`} libelle="Fiche du client" />
          <form
            id="import-consultation"
            name="import-consultation"
            className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] gap-4 lg:gap-6 items-start"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void creer();
            }}
          >
            <div className={`${CARTE} min-w-0`}>
              <label htmlFor="texte-consultation" className={ETIQUETTE}>
                Texte de la consultation
              </label>
              <textarea
                id="texte-consultation"
                name="texte"
                className="w-full min-h-[360px] lg:min-h-[520px] border border-[#94a3b8] rounded-[10px] p-2.5 text-[13px] leading-normal font-mono resize-y"
                spellCheck={false}
                value={texte}
                placeholder="CONSULTATION : note_cadrage | 1.0 | Le résumé de votre projet"
                onPaste={() => setColle(true)}
                onChange={(e) => {
                  const t = (e.nativeEvent as InputEvent).inputType;
                  if (!t || t.startsWith('insertFromPaste') || t === 'insertFromDrop' || t === 'insertReplacementText') setColle(true);
                  setTexte(e.target.value);
                  setResultat(null);
                }}
                aria-describedby="lecture-du-texte format-attendu"
              />
              <div className="flex gap-3 flex-wrap">
                <button type="submit" id="creer-brouillon" name="creer-brouillon" className={PRIMAIRE} disabled={envoi || !sansProbleme} data-creer-brouillon="">
                  {envoi ? 'Création…' : 'Créer le brouillon'}
                </button>
                {resultat?.ok && (
                  <Link to={`/pilotage/questionnaire/${resultat.id}`} id="voir-arbre" className={SECONDAIRE} data-voir-arbre="">
                    Voir l'arbre
                  </Link>
                )}
              </div>
              {!vide && lecture.problemes.length > 0 && (
                <p className="text-[13px] text-doux m-0">Corrigez d'abord les lignes signalées dans « Lecture du texte ».</p>
              )}
              <p className="text-[13px] text-doux m-0" data-saisi-par={colle ? 'assistant' : 'joel'}>
                {colle ? 'Brouillon marqué « saisi par l’assistant ».' : 'Brouillon marqué « saisi par Joël ».'} Seul Joël publie, après l’aperçu.
              </p>
            </div>

            <div className="flex flex-col gap-4 min-w-0">
              <div
                id="lecture-du-texte"
                className={`${CARTE} ${(resultat ? resultat.ok : sansProbleme) ? '!border-[#86efac] !bg-[#f0fdf4]' : '!border-[#fcd34d] !bg-[#fffbeb]'}`}
                role="status"
                aria-live="polite"
                data-lecture=""
              >
                <h2 className="text-[17px] font-bold m-0">Lecture du texte</h2>
                {vide && <p className="text-[14px] text-doux m-0">Collez ou écrivez le texte de la consultation : la lecture se fait au fur et à mesure.</p>}
                {!vide && (
                  <p className="text-[14px] text-[#166534] font-semibold m-0" data-compris="">
                    {lecture.nbQuestions} question{lecture.nbQuestions > 1 ? 's' : ''} et {lecture.nbChoix} choix compris.
                  </p>
                )}
                {sansProbleme && (
                  <p className="text-[14px] text-[#166534] m-0" data-sans-probleme="">
                    Aucune question manquante, aucune boucle ; de {lecture.cheminMin} à {lecture.cheminMax} questions selon le chemin.
                  </p>
                )}
                {!vide && lecture.problemes.length > 0 && (
                  <ul className="m-0 pl-5 flex flex-col gap-1 text-[14px] text-danger" data-problemes="">
                    {lecture.problemes.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                )}
                {resultat && !resultat.ok && (
                  <>
                    <p className="text-[14px] font-semibold text-danger m-0">Le serveur a refusé le brouillon :</p>
                    <ul className="m-0 pl-5 flex flex-col gap-1 text-[14px] text-danger" data-problemes-serveur="">
                      {resultat.erreurs.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </>
                )}
                {resultat?.ok && (
                  <p className="text-[14px] text-[#166534] font-semibold m-0" data-brouillon-cree={resultat.id}>
                    Brouillon créé : {resultat.questions} questions, {resultat.cheminMax} au plus selon le chemin. Il remplace le brouillon précédent de cette version, s'il y en avait un.
                  </p>
                )}
              </div>

              <div id="format-attendu" className={CARTE}>
                <h2 className="text-[17px] font-bold m-0">Format attendu</h2>
                <ul className="m-0 pl-5 flex flex-col gap-1.5 text-[13px] text-doux leading-[1.45]">
                  {FORMAT_ATTENDU.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className={CARTE}>
                <h2 className="text-[17px] font-bold m-0">Modèles</h2>
                <label htmlFor="modele" className={ETIQUETTE}>
                  Partir d'un modèle
                </label>
                <select id="modele" name="modele" className={CHAMP} value={modeleChoisi} onChange={(e) => setModeleChoisi(e.target.value)}>
                  <option value="">{liste.length ? 'Choisir un modèle' : 'Aucun modèle enregistré'}</option>
                  {liste.map((m) => (
                    <option key={m.id} value={m.id}>
                      {NOM_CYCLE[m.type] ?? m.type} : {m.nom}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  id="remplir-modele"
                  className={`${SECONDAIRE} !text-[15px]`}
                  disabled={!modeleChoisi}
                  onClick={() => {
                    const m = liste.find((x) => x.id === modeleChoisi);
                    if (!m) return;
                    setTexte(m.contenu?.texte ?? '');
                    setColle(false);
                    setResultat(null);
                  }}
                >
                  Remplacer le texte par ce modèle
                </button>
                <label htmlFor="nom-modele" className={ETIQUETTE}>
                  Nom du modèle
                </label>
                <input id="nom-modele" name="nom_modele" className={CHAMP} value={nomModele} maxLength={80} onChange={(e) => setNomModele(e.target.value)} />
                <button type="button" id="enregistrer-modele" className={`${SECONDAIRE} !text-[15px]`} onClick={() => void sauverModele()}>
                  Enregistrer comme modèle
                </button>
                {retourModele && (
                  <p className={`text-[13px] font-semibold m-0 ${retourModele.ok ? 'text-[#166534]' : 'text-danger'}`} role="status">
                    {retourModele.texte}
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>
      </Corps>
    </>
  );
}
