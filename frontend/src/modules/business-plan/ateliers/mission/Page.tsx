// "Ma mission de terrain" (fiche ETAPE-07, NEC-CC-12): prepare (hook, loop M1, mission sheet, "oser aller
// voir", with whom), the mission (40 min countdown stored as a start time, interviews, prices added to
// "Mes prix relevés"), then the return: 7a what I learned, 7b decision point, 7c updates. All on the phone.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AtelierProps, Mission, Plan } from '../../types';
import { ChampMontant, ChampTexte, Choix } from '../../composants/Champs';
import { Carte } from '../../composants/Carte';
import { Alerte } from '../../composants/Alerte';
import { Icone } from '../../composants/Icones';
import { BoucleComprehension } from '../../composants/BoucleComprehension';
import { copier, missionDe, missionVide, nouvelId } from '../../etat/vide';
import { grouper } from '../../utils/format';
import {
  BOUCLE_M1,
  DECISIONS,
  MESSAGE_NUMERO,
  MIN_ENTRETIENS,
  RAPPEL_MS,
  contientNumero,
  entretienFait,
  feuilleProposee,
  minutesSecondes,
  missionTerminee,
  nbEntretiens,
  nbPrix,
  nbPrixVises,
  paieMoyen,
  pagesARevoir,
  premierNombre,
  regles,
  reports,
  restant,
  suggestion
} from './regles';

type Entretien = Mission['entretiens'][number];
type Comparaison = '' | 'pareil' | 'different';

const PAREIL = [
  { v: 'pareil' as const, t: 'Pareil' },
  { v: 'different' as const, t: 'Différent' }
];
const OUI_NON = [
  { v: 'oui' as const, t: 'Oui' },
  { v: 'non' as const, t: 'Non' }
];

function CompteARebours({ debut, onDemarrer, onArreter, ls }: { debut: string | null; onDemarrer: () => void; onArreter: () => void; ls: boolean }) {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const avant = useRef<number | null>(null);
  useEffect(() => {
    if (!debut) return;
    const tic = () => setMaintenant(Date.now());
    const id = window.setInterval(tic, 1000);
    // Back from a locked phone or another app: the time is computed again at once.
    document.addEventListener('visibilitychange', tic);
    tic();
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tic);
    };
  }, [debut]);
  const reste = restant(debut, maintenant);
  useEffect(() => {
    if (reste === null) return;
    const a = avant.current;
    if (a !== null && ((a > RAPPEL_MS && reste <= RAPPEL_MS) || (a > 0 && reste === 0))) {
      try {
        navigator.vibrate?.([300, 150, 300]);
      } catch {
        // No vibration on this phone.
      }
    }
    avant.current = reste;
  }, [reste]);

  if (reste === null) {
    return ls ? null : (
      <button type="button" onClick={onDemarrer} className="bp-demarrer w-full min-h-[52px] rounded-xl bg-violet text-white text-[17px] font-bold mb-3 active:opacity-90">
        Démarrer la mission (40 min)
      </button>
    );
  }
  return (
    <div className="mb-3">
      <div className={`bp-compte rounded-2xl px-4 py-3 text-center ${reste === 0 ? 'bg-alerte text-white' : reste <= RAPPEL_MS ? 'bg-white border-2 border-alerte' : 'bg-violet text-white'}`}>
        <p className="text-[14px] font-bold opacity-90">{reste === 0 ? 'Mission terminée' : 'Temps restant'}</p>
        <p className="bp-temps text-[40px] font-bold tabular-nums leading-tight" aria-live="off">
          {minutesSecondes(reste)}
        </p>
      </div>
      {reste === 0 ? (
        <div className="mt-2">
          <Alerte texte="C'est l'heure du retour : reviens dans la salle avec ton camarade." />
        </div>
      ) : reste <= RAPPEL_MS ? (
        <div className="bp-rappel mt-2">
          <Alerte texte="Plus que 10 minutes : finis ton entretien, relève les derniers prix, puis reviens." />
        </div>
      ) : null}
      {!ls ? (
        <button type="button" onClick={onArreter} className="mt-1 min-h-[44px] w-full text-doux text-[14px] font-bold underline">
          Remettre le compte à rebours à zéro
        </button>
      ) : null}
    </div>
  );
}

export default function Page({ plan, modifier, lectureSeule: ls }: AtelierProps) {
  const m = missionDe(plan);
  const [refus, setRefus] = useState(false);
  const [prix, setPrix] = useState({ element: '', unite: '', prix: null as number | null, ou: '' });
  const [prixAjoute, setPrixAjoute] = useState(false);
  const set = (recette: (mi: Mission, p: Plan) => void) =>
    modifier((p) => {
      p.mission ??= missionVide();
      recette(p.mission, p);
    });

  // The mission sheet is built once from the plan, then stays editable.
  useEffect(() => {
    if (ls || m.prerempli) return;
    set((mi, p) => {
      const f = feuilleProposee(p);
      for (const k of Object.keys(f) as (keyof typeof f)[]) if (!mi[k].trim()) mi[k] = f[k];
      mi.prerempli = true;
    });
    // Once, at the first opening of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** V4: an entry with a phone number is refused. */
  const sansNumero = (v: string, appliquer: (v: string) => void) => {
    if (contientNumero(v)) return setRefus(true);
    setRefus(false);
    appliquer(v);
  };
  const changer = (id: string, patch: Partial<Entretien>) =>
    set((mi) => {
      const e = mi.entretiens.find((x) => x.id === id);
      if (e) Object.assign(e, patch);
    });
  const ajouterEntretien = () =>
    set((mi) => void mi.entretiens.unshift({ id: nouvelId(), date: new Date().toISOString(), typeClient: '', aujourdhui: '', paie: null, embete: '', probleme: '', phrase: '' }));
  const ajouterPrix = () => {
    if (!prix.element.trim() || prix.prix === null) return;
    modifier((p) => void p.prix.push({ id: nouvelId(), element: prix.element.trim(), unite: prix.unite.trim(), prix: prix.prix, ou: prix.ou.trim() }));
    setPrix({ element: '', unite: '', prix: null, ou: '' });
    setPrixAjoute(true);
  };

  const n = nbEntretiens(plan);
  const np = nbPrix(plan);
  const entretiens = ls ? m.entretiens.filter(entretienFait) : m.entretiens;
  const sugg = suggestion(plan);
  const aRevoir = pagesARevoir(m.decision);
  const props = reports(plan);
  const controles = regles(plan);
  const faits = m.entretiens.filter(entretienFait);
  const moyen = paieMoyen(plan);
  const suppose = premierNombre(plan.m1.client.prixAujourdhui);
  const reponses = (cle: 'aujourdhui' | 'embete') => faits.map((e) => e[cle].trim()).filter(Boolean);
  const heure = (iso: string) => {
    const d = new Date(iso);
    return Number.isFinite(d.getTime()) ? d.toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';
  };

  const ligneAppris = (titre: string, supposition: string, dits: string[], cle: 'aujourdhui' | 'paie' | 'embete', ecart?: string) => (
    <div className="bp-appris rounded-xl border border-filet p-3 mb-3">
      <p className="text-[16px] font-bold text-violet mb-2">{titre}</p>
      <p className="text-[14px] font-bold text-doux">Ce que je supposais</p>
      <p className={`text-[15px] leading-snug mb-2 whitespace-pre-wrap break-words ${supposition.trim() ? 'text-encre' : 'text-doux italic'}`}>{supposition.trim() || 'Non rempli'}</p>
      <p className="text-[14px] font-bold text-doux">Ce que les clients ont dit</p>
      {dits.length ? (
        <ul className="list-disc pl-5 text-[15px] text-encre leading-snug mb-2">
          {dits.map((d, i) => (
            <li key={i} className="break-words">
              {d}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] text-doux italic mb-2">Rien de noté</p>
      )}
      {ecart ? <p className="bp-ecart text-[15px] font-bold text-encre mb-2">{ecart}</p> : null}
      <Choix label="Pareil ou différent ?" options={PAREIL} valeur={m.appris[cle]} onChange={(v: Comparaison) => set((mi) => void (mi.appris[cle] = v))} lectureSeule={ls} />
    </div>
  );

  return (
    <>
      <Carte ton="violet">
        <p className="text-[19px] font-bold text-violet leading-tight mb-2">Avant de dépenser 1 ariary, va vérifier.</p>
        <p className="text-[15px] text-encre leading-relaxed">
          Tes clients et les vrais prix valent plus que tes suppositions. Le jury le voit tout de suite : un chiffre « je l'ai demandé » pèse plus qu'un chiffre « je l'estime ».
        </p>
      </Carte>

      <Carte id="s7-preparer" titre="Préparer ma mission" sousTitre="10 minutes, avant de partir.">
        <BoucleComprehension donnees={BOUCLE_M1} etat={m.boucle} onChange={(b) => set((mi) => void (mi.boucle = b))} lectureSeule={ls} />
        <p className="text-[17px] font-bold text-violet mb-2">Ma feuille de mission</p>
        <p className="text-[14px] text-doux leading-snug mb-3">Construite avec tes pages. Tu peux tout modifier.</p>
        <ChampTexte label="Les 4 questions à poser" valeur={m.questions} onChange={(v) => set((mi) => void (mi.questions = v))} lectureSeule={ls} />
        <ChampTexte
          label="Mes clients à interroger : 3 au moins, 5 si possible"
          aide={<p className="text-[14px] text-doux mt-1 leading-snug">Qui, et où les trouver ?</p>}
          valeur={m.clientsAInterroger}
          onChange={(v) => set((mi) => void (mi.clientsAInterroger = v))}
          lectureSeule={ls}
        />
        <ChampTexte
          label="Les prix de concurrents à relever"
          aide={<p className="text-[14px] text-doux mt-1 leading-snug">Les concurrents du module 3 sans prix. Un par ligne.</p>}
          valeur={m.prixARelever}
          onChange={(v) => set((mi) => void (mi.prixARelever = v))}
          lectureSeule={ls}
        />
        <ChampTexte
          label={`Ce qu'il faut pour faire UNE unité de vente${plan.uniteVente.trim() ? ` (${plan.uniteVente.trim()})` : ''}`}
          aide={<p className="text-[14px] text-doux mt-1 leading-snug">Écris maintenant chaque élément (matière, emballage, énergie, transport) et son unité. Un par ligne.</p>}
          valeur={m.elementsUnite}
          onChange={(v) => set((mi) => void (mi.elementsUnite = v))}
          lectureSeule={ls}
        />
        <ChampTexte
          label="Mes charges du mois à demander si l'occasion se présente"
          valeur={m.chargesADemander}
          onChange={(v) => set((mi) => void (mi.chargesADemander = v))}
          lectureSeule={ls}
        />
        <p className="rounded-xl bg-violetClair px-3.5 py-2.5 text-[15px] text-encre leading-relaxed">
          Ordre conseillé : les clients d'abord (20 min), puis les prix (15 min), puis le retour (5 min). Un prix de fournisseur peut se demander par un simple appel.
        </p>
      </Carte>

      <Carte id="s7-oser" titre="Oser aller voir">
        <p className="text-[15px] text-encre leading-relaxed mb-3">
          <b>Avoir peur d'aborder un inconnu, c'est normal. Tout le monde l'a, les entrepreneurs aussi.</b> Ce qui les distingue : ils y vont quand même, et ils savent quoi dire.
        </p>
        <ChampTexte label="Ma phrase pour me présenter" aide={<p className="text-[14px] text-doux mt-1 leading-snug">Corrige-la à ta façon.</p>} valeur={m.presentation} onChange={(v) => set((mi) => void (mi.presentation = v))} lectureSeule={ls} />
        <p className="text-[15px] font-bold text-encre mb-1">Trois réflexes</p>
        <ul className="bp-reflexes list-disc pl-5 text-[15px] text-encre leading-relaxed mb-3">
          <li>Je demande 3 minutes, pas plus.</li>
          <li>Si on me dit non, je remercie et je vais voir le suivant.</li>
          <li>Je remercie toujours à la fin.</li>
        </ul>
        <p className="rounded-xl bg-turquoiseClair px-3.5 py-2.5 text-[15px] text-encre leading-relaxed">
          <b>Mon défi : </b>le premier entretien est le plus dur. Fais-le dans les 5 premières minutes.
        </p>
      </Carte>

      <Carte id="s7-binome" titre="Avec qui et où">
        <p className="text-[15px] text-encre leading-relaxed mb-3">Choisis un camarade : vous partez à deux, chacun interroge pour son projet.</p>
        <ChampTexte label="Le prénom de mon camarade" ligne valeur={m.camarade} onChange={(v) => set((mi) => void (mi.camarade = v))} lectureSeule={ls} />
        <Alerte texte="Sécurité : de jour, dans un lieu public ou un commerce, à deux, jamais dans un véhicule inconnu." />
      </Carte>

      <Carte id="s7-mission" titre="La mission" sousTitre="40 minutes. Tout marche sans réseau.">
        <CompteARebours
          debut={m.debut}
          ls={ls}
          onDemarrer={() => set((mi) => void (mi.debut = new Date().toISOString()))}
          onArreter={() => set((mi) => void (mi.debut = null))}
        />
        <div className="bp-compteurs flex gap-2.5 mb-3">
          <p className={`flex-1 rounded-xl px-3 py-2 text-center text-[15px] font-bold ${n >= MIN_ENTRETIENS ? 'bg-turquoiseClair text-turquoiseTexte' : 'bg-violetClair text-violet'}`}>
            Clients {n} sur {MIN_ENTRETIENS}
          </p>
          <p className="flex-1 rounded-xl bg-violetClair px-3 py-2 text-center text-[15px] font-bold text-violet">
            Prix {np} sur {nbPrixVises(plan)}
          </p>
        </div>
        {n >= 1 ? (
          <p role="status" className="bp-premier mb-3 text-[15px] font-bold text-turquoiseTexte flex items-center gap-1.5">
            <Icone nom="coche" /> Premier entretien fait
          </p>
        ) : null}

        <p className="text-[17px] font-bold text-violet mb-1">Mes entretiens</p>
        <p className="text-[14px] text-doux leading-snug mb-3">Aucun nom ni numéro de la personne interrogée.</p>
        {refus ? <Alerte texte={MESSAGE_NUMERO} /> : null}
        {!ls ? (
          <button
            type="button"
            onClick={ajouterEntretien}
            className="bp-ajouter-entretien mb-3 min-h-[48px] w-full rounded-xl border-2 border-dashed border-turquoise text-turquoiseTexte font-bold flex items-center justify-center gap-2 active:bg-turquoiseClair"
          >
            <Icone nom="plus" /> Noter un entretien
          </button>
        ) : null}
        {ls && !entretiens.length ? <p className="text-doux italic mb-3">Aucun entretien</p> : null}
        <ul className="space-y-3 mb-4">
          {entretiens.map((e, i) => (
            <li key={e.id} className="bp-entretien rounded-xl border border-filet p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[15px] font-bold text-violet">
                  Entretien {entretiens.length - i}
                  <span className="block text-[13px] font-normal text-doux">{heure(e.date)}</span>
                </p>
                {!ls ? (
                  <button
                    type="button"
                    onClick={() => set((mi) => void (mi.entretiens = mi.entretiens.filter((x) => x.id !== e.id)))}
                    className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center text-doux active:bg-violetClair"
                    aria-label={`Supprimer l'entretien ${entretiens.length - i}`}
                  >
                    <Icone nom="poubelle" />
                  </button>
                ) : null}
              </div>
              <ChampTexte label="Type de client" placeholder="Ex. : restaurant de plage" ligne valeur={e.typeClient} onChange={(v) => sansNumero(v, (x) => changer(e.id, { typeClient: x }))} lectureSeule={ls} />
              <ChampTexte label="Ce qu'il utilise aujourd'hui" valeur={e.aujourdhui} onChange={(v) => sansNumero(v, (x) => changer(e.id, { aujourdhui: x }))} lectureSeule={ls} />
              <ChampMontant label="Ce qu'il paie aujourd'hui" valeur={e.paie} onChange={(v) => changer(e.id, { paie: v })} lectureSeule={ls} />
              <ChampTexte label="Ce qui l'embête le plus" valeur={e.embete} onChange={(v) => sansNumero(v, (x) => changer(e.id, { embete: x }))} lectureSeule={ls} />
              <Choix label="A-t-il le problème que tu supposais ?" options={OUI_NON} valeur={e.probleme} onChange={(v) => changer(e.id, { probleme: v })} lectureSeule={ls} />
              <ChampTexte label="Une phrase qu'il a dite, avec ses mots" valeur={e.phrase} onChange={(v) => sansNumero(v, (x) => changer(e.id, { phrase: x }))} lectureSeule={ls} />
            </li>
          ))}
        </ul>

        {!ls ? (
          <div className="bp-saisie-prix rounded-xl border border-filet p-3">
            <p className="text-[17px] font-bold text-violet mb-1">Noter un prix</p>
            <p className="text-[14px] text-doux leading-snug mb-3">Il va dans « Mes prix relevés ». Le commerce ou le marché, jamais le nom d'un particulier.</p>
            <ChampTexte label="Élément ou concurrent" placeholder="Ex. : mangues" ligne valeur={prix.element} onChange={(v) => sansNumero(v, (x) => setPrix((s) => ({ ...s, element: x })))} />
            <ChampTexte label="Unité" placeholder="Ex. : le kg" ligne valeur={prix.unite} onChange={(v) => setPrix((s) => ({ ...s, unite: v }))} />
            <ChampMontant label="Prix" valeur={prix.prix} onChange={(v) => setPrix((s) => ({ ...s, prix: v }))} />
            <ChampTexte label="Où ?" placeholder="Ex. : marché de Hell-Ville" ligne valeur={prix.ou} onChange={(v) => sansNumero(v, (x) => setPrix((s) => ({ ...s, ou: x })))} />
            <button
              type="button"
              disabled={!prix.element.trim() || prix.prix === null}
              onClick={ajouterPrix}
              className="bp-ajouter-prix min-h-[48px] w-full rounded-xl bg-violet text-white font-bold disabled:opacity-50 active:opacity-90"
            >
              Ajouter ce prix
            </button>
            {prixAjoute ? (
              <p role="status" className="mt-2 text-[15px] text-turquoiseTexte font-bold flex items-center gap-1.5">
                <Icone nom="coche" /> Ajouté à « Mes prix relevés »
              </p>
            ) : null}
            <Link to={`/p/${plan.id}/prix`} className="mt-3 min-h-[44px] rounded-xl border-2 border-violet text-violet font-bold flex items-center justify-center gap-2">
              Voir mes prix relevés ({np}) <Icone nom="chevron" />
            </Link>
          </div>
        ) : null}
      </Carte>

      <Carte id="s7a" titre="7a. Ce que j'ai appris" sousTitre="Tes suppositions à côté des réponses des clients.">
        {ligneAppris("Ce qu'il fait aujourd'hui", plan.m1.client.aujourdhui, reponses('aujourdhui'), 'aujourdhui')}
        {ligneAppris(
          'Combien il paie',
          plan.m1.client.prixAujourdhui,
          faits.filter((e) => e.paie !== null).map((e) => `${grouper(e.paie as number)} Ar`),
          'paie',
          moyen !== null && suppose !== null ? `Écart : ${moyen - suppose >= 0 ? '+' : '-'}${grouper(Math.abs(moyen - suppose))} Ar (moyenne payée ${grouper(moyen)} Ar)` : undefined
        )}
        {ligneAppris("Ce qui l'embête", plan.m1.probleme, reponses('embete'), 'embete')}
        <ChampTexte label="La phrase qui m'a le plus surpris" valeur={m.appris.surprise} onChange={(v) => sansNumero(v, (x) => set((mi) => void (mi.appris.surprise = x)))} lectureSeule={ls} />
      </Carte>

      <Carte id="s7b" titre="7b. Mon point de décision" sousTitre="Après ce que tu as entendu, tu :">
        {sugg && !ls ? (
          <p className="bp-suggestion rounded-xl bg-turquoiseClair px-3.5 py-2.5 text-[15px] text-encre leading-snug mb-3">
            <b>Suggestion d'après tes entretiens : </b>
            {DECISIONS.find((d) => d.v === sugg)?.t}. Tu choisis librement.
          </p>
        ) : null}
        {ls ? (
          <p className={`text-base mb-3 ${m.decision ? 'text-encre font-bold' : 'text-doux italic'}`}>{DECISIONS.find((d) => d.v === m.decision)?.t ?? 'Non rempli'}</p>
        ) : (
          <div className="space-y-2 mb-3" role="radiogroup" aria-label="Mon point de décision">
            {DECISIONS.map((d) => {
              const actif = m.decision === d.v;
              return (
                <button
                  key={d.v}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  onClick={() =>
                    set((mi, p) => {
                      mi.decision = actif ? '' : d.v;
                      if (d.v === 'changer' && !actif && !mi.version1) mi.version1 = { date: new Date().toISOString(), m1: copier(p.m1), m2: copier(p.m2), m3: copier(p.m3), m4: copier(p.m4) };
                    })
                  }
                  className={`bp-decision w-full text-left min-h-[52px] rounded-xl border-2 px-3.5 py-2.5 ${actif ? 'bg-violet border-violet text-white' : 'bg-white border-filet text-encre active:bg-violetClair'}`}
                >
                  <span className="block text-[16px] font-bold">{d.t}</span>
                  <span className={`block text-[14px] leading-snug ${actif ? 'opacity-90' : 'text-doux'}`}>{d.detail}</span>
                </button>
              );
            })}
          </div>
        )}
        {aRevoir.length && !ls ? (
          <div className="bp-a-revoir">
            <p className="text-[15px] font-bold text-encre mb-2">Les pages à revoir, en commençant par la première :</p>
            <ul className="space-y-2">
              {aRevoir.map((r, i) => (
                <li key={r.chemin}>
                  <Link
                    to={`/p/${plan.id}/${r.chemin}`}
                    className={`min-h-[48px] rounded-xl px-3.5 py-2 flex items-center gap-2 font-bold ${i === 0 ? 'bg-violet text-white' : 'border-2 border-violet text-violet'}`}
                  >
                    <span className="min-w-0 flex-1">
                      {r.titre}
                      <span className={`block text-[14px] font-normal leading-snug ${i === 0 ? 'opacity-90' : 'text-doux'}`}>{r.pourquoi}</span>
                    </span>
                    <Icone nom="chevron" />
                  </Link>
                </li>
              ))}
            </ul>
            {m.decision === 'changer' ? <p className="mt-2 text-[14px] text-doux leading-snug">Changer d'angle n'efface rien : tes pages précédentes sont gardées en « version 1 ».</p> : null}
          </div>
        ) : null}
      </Carte>

      {!ls ? (
        <Carte id="s7c" titre="7c. Mes mises à jour" sousTitre="Un bouton chacune : tu valides ou tu refuses.">
          {!props.length ? <p className="text-doux italic">Rien à reporter pour l'instant : note d'abord tes entretiens et tes prix.</p> : null}
          <ul className="space-y-3">
            {props.map((r) => {
              const etat = m.reports[r.cle] ?? '';
              return (
                <li key={r.cle} className="bp-report rounded-xl border border-filet p-3">
                  <p className="text-[15px] font-bold text-encre leading-snug">{r.titre}</p>
                  <p className="text-[15px] text-doux leading-snug mt-1 mb-2 break-words">{r.texte}</p>
                  {etat ? (
                    <div className="flex items-center gap-2">
                      <p role="status" className={`flex-1 text-[15px] font-bold ${etat === 'valide' ? 'text-turquoiseTexte' : 'text-doux'}`}>
                        {etat === 'valide' ? 'Reporté' : 'Refusé'}
                      </p>
                      {r.chemin ? (
                        <Link to={`/p/${plan.id}/${r.chemin}`} className="min-h-[44px] px-3 rounded-xl border-2 border-violet text-violet font-bold flex items-center">
                          Ouvrir
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          set((mi, p) => {
                            r.appliquer?.(p);
                            mi.reports[r.cle] = 'valide';
                          })
                        }
                        className="flex-1 min-h-[44px] rounded-xl bg-violet text-white font-bold active:opacity-90"
                      >
                        {r.appliquer ? 'Reporter' : "C'est noté"}
                      </button>
                      <button type="button" onClick={() => set((mi) => void (mi.reports[r.cle] = 'refuse'))} className="flex-1 min-h-[44px] rounded-xl border-2 border-filet text-encre font-bold">
                        Non merci
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Carte>
      ) : null}

      {controles.length && !ls ? (
        <Carte titre="Mes vérifications" sousTitre="Des conseils, rien ne t'empêche d'avancer.">
          {controles.map((c) => (
            <Alerte key={c.cle} texte={c.texte} />
          ))}
        </Carte>
      ) : null}

      {missionTerminee(plan) ? (
        <Carte ton="turquoise">
          <p className="bp-fin-etape text-[17px] font-bold text-encre leading-snug mb-3">
            Étape 7 terminée. Tu as interrogé {n} clients et relevé {np} prix : tes chiffres sont maintenant de vrais chiffres.
          </p>
          <Link to={`/p/${plan.id}/m5`} className="min-h-[48px] rounded-xl bg-violet text-white font-bold flex items-center justify-center gap-2">
            Étape suivante : les chiffres clés <Icone nom="chevron" />
          </Link>
        </Carte>
      ) : null}
    </>
  );
}
