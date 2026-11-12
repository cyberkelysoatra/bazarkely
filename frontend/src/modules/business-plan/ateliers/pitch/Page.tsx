// "Mon pitch de 2 minutes" (step 9c): the 5-part frame in keywords built from the summary, a timed
// rehearsal (signal at 1 min 45, one tap per part, survives a screen lock: the start time is stored),
// and the 3 trap questions of the jury. Works offline: nothing here calls the network.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AtelierProps, EssaiPitch, ModeEssai, Plan } from '../../types';
import { ChampTexte } from '../../composants/Champs';
import { Carte } from '../../composants/Carte';
import { Alerte } from '../../composants/Alerte';
import { Icone } from '../../composants/Icones';
import { nouvelId, pitchDe, pitchVide } from '../../etat/vide';
import { dateFr } from '../../utils/format';
import { cartesRemplies } from '../synthese/brouillons';
import { DUREE_TOTALE, MARGE, MAX_MOTS, MODES, SIGNAL, TEMPS, compterMots, duree, horloge, partieLaPlusLongue, trame } from './trame';
import { questionsPieges } from './questions';
import { exempleDuSecteur } from './exemples';

/** Attempts kept per plan (the newest first). */
const ESSAIS_GARDES = 10;

interface Course {
  debut: number;
  /** Time each finished part ended. */
  marques: number[];
  mode: ModeEssai;
}

const cleCourse = (planId: string) => `bp_pitch_course_${planId}`;

function lireCourse(planId: string): Course | null {
  try {
    const brut = localStorage.getItem(cleCourse(planId));
    if (!brut) return null;
    const c = JSON.parse(brut) as Course;
    return typeof c.debut === 'number' && Array.isArray(c.marques) && c.mode in MODES ? c : null;
  } catch {
    return null;
  }
}

function ecrireCourse(planId: string, c: Course | null) {
  try {
    if (c) localStorage.setItem(cleCourse(planId), JSON.stringify(c));
    else localStorage.removeItem(cleCourse(planId));
  } catch {
    /* private mode: the rehearsal still works while the page stays open */
  }
}

function vibrer() {
  try {
    navigator.vibrate?.(300);
  } catch {
    /* not supported */
  }
}

function libelleMode(mode: ModeEssai): string {
  return mode === 'complet' ? 'Pitch complet' : MODES[mode].titre;
}

function Resultat({ essai }: { essai: EssaiPitch }) {
  const m = MODES[essai.mode];
  const parties = m.parties.map((i) => TEMPS[i]);
  const trop = essai.totalMs > m.duree * 1000;
  const k = partieLaPlusLongue(essai.partiesMs);
  return (
    <div className="bp-pitch-resultat rounded-xl bg-turquoiseClair px-3.5 py-3 mt-3">
      <p className="text-[15px] font-bold text-encre">{libelleMode(essai.mode)}</p>
      <p className="text-[22px] font-bold text-violet tabular-nums mt-1">
        Temps total : <span className="bp-pitch-total">{duree(essai.totalMs)}</span>
      </p>
      <ul className="mt-2 space-y-1">
        {parties.map((t, i) => (
          <li key={t.cle} className="flex flex-wrap justify-between gap-x-3 text-[15px] text-encre">
            <span>
              {t.n}. {t.titre}
            </span>
            <span className={`tabular-nums font-bold ${(essai.partiesMs[i] ?? 0) > t.duree * 1000 ? 'text-alerte' : ''}`}>
              {duree(essai.partiesMs[i] ?? 0)} <span className="font-normal text-doux">(prévu {t.duree} s)</span>
            </span>
          </li>
        ))}
      </ul>
      {trop ? (
        <div className="mt-3">
          <Alerte
            texte={`${essai.mode === 'complet' && essai.totalMs > 135_000 ? 'Trop long : coupe un mot-clé. ' : ''}Coupe un mot-clé dans la partie la plus longue : ${parties[k]?.n}. ${parties[k]?.titre} (${duree(essai.partiesMs[k] ?? 0)}).`}
          />
        </div>
      ) : (
        <p className="mt-2 text-[15px] text-encre font-bold">
          {essai.mode === 'complet' ? 'Ton pitch tient en 2 minutes.' : `Ce morceau tient dans ses ${m.duree} secondes.`}
        </p>
      )}
    </div>
  );
}

function Repetition({ plan, essais, enregistrer }: { plan: Plan; essais: EssaiPitch[]; enregistrer: (e: EssaiPitch) => void }) {
  const parts = trame(plan);
  const [course, setCourse] = useState<Course | null>(() => lireCourse(plan.id));
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [dernier, setDernier] = useState<EssaiPitch | null>(null);
  const [morceaux, setMorceaux] = useState(false);
  const signale = useRef(false);

  useEffect(() => {
    if (!course) return;
    signale.current = Date.now() - course.debut >= SIGNAL * 1000;
    const tic = () => setMaintenant(Date.now());
    const id = window.setInterval(tic, 250);
    document.addEventListener('visibilitychange', tic);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tic);
    };
  }, [course]);

  const ecoule = course ? maintenant - course.debut : 0;
  const auSignal = !!course && course.mode === 'complet' && ecoule >= SIGNAL * 1000;
  useEffect(() => {
    if (auSignal && !signale.current) {
      signale.current = true;
      vibrer();
    }
  }, [auSignal]);

  const commencer = (mode: ModeEssai) => {
    const c: Course = { debut: Date.now(), marques: [], mode };
    signale.current = false;
    setDernier(null);
    setMaintenant(c.debut);
    setCourse(c);
    ecrireCourse(plan.id, c);
  };

  const finir = (c: Course, fin: number) => {
    const n = MODES[c.mode].parties.length;
    const marques = [...c.marques, fin].slice(0, n);
    const partiesMs = marques.map((t, i) => t - (i === 0 ? c.debut : marques[i - 1]));
    while (partiesMs.length < n) partiesMs.push(0);
    const essai: EssaiPitch = { id: nouvelId(), date: new Date(c.debut).toISOString(), mode: c.mode, totalMs: fin - c.debut, partiesMs };
    setCourse(null);
    ecrireCourse(plan.id, null);
    setDernier(essai);
    enregistrer(essai);
  };

  const toucher = () => {
    if (!course) return;
    const t = Date.now();
    const n = MODES[course.mode].parties.length;
    if (course.marques.length + 1 >= n) return finir(course, t);
    const c = { ...course, marques: [...course.marques, t] };
    setCourse(c);
    ecrireCourse(plan.id, c);
  };

  if (course) {
    const m = MODES[course.mode];
    const i = Math.min(course.marques.length, m.parties.length - 1);
    const partie = parts[m.parties[i]];
    const depasse = ecoule > m.duree * 1000;
    return (
      <div className="bp-pitch-course">
        <button
          type="button"
          onClick={toucher}
          aria-label={i + 1 < m.parties.length ? 'Passer au temps suivant' : 'Terminer le pitch'}
          className={`w-full text-left rounded-2xl px-4 py-4 border-2 transition-colors ${
            depasse ? 'bg-white border-alerte' : auSignal ? 'bp-pitch-signal bg-[#FFF1D6] border-[#E8A317]' : 'bg-violetClair border-violet'
          }`}
        >
          <span className="flex items-baseline justify-between gap-3">
            <span className="bp-pitch-horloge text-[44px] font-bold tabular-nums text-violet leading-none">{horloge(ecoule)}</span>
            <span className="text-[14px] text-doux text-right">
              {libelleMode(course.mode)}
              <br />
              sur {duree(m.duree * 1000)}
            </span>
          </span>
          {auSignal && !depasse ? <span className="block mt-2 text-[16px] font-bold text-encre">1 min 45 : il te reste 15 secondes.</span> : null}
          {depasse ? <span className="block mt-2 text-[16px] font-bold text-alerte">Temps dépassé : termine ta phrase.</span> : null}
          <span className="block mt-3 text-[14px] font-bold text-doux">
            Temps {i + 1} sur {m.parties.length} ({partie.duree} s)
          </span>
          <span className="block text-[19px] font-bold text-violet leading-tight mt-0.5">{partie.titre}</span>
          <span className="bp-pitch-mots block mt-2 text-[22px] font-bold text-encre leading-snug">{partie.mots || '(pas encore de mots-clés)'}</span>
          <span className="block mt-3 text-[14px] text-doux">{i + 1 < m.parties.length ? 'Touche pour passer au temps suivant.' : 'Touche pour terminer.'}</span>
        </button>
        <div className="mt-3 flex gap-2.5">
          <button type="button" onClick={() => finir(course, Date.now())} className="flex-1 min-h-[48px] rounded-xl bg-violet text-white font-bold">
            Terminer
          </button>
          <button
            type="button"
            onClick={() => {
              setCourse(null);
              ecrireCourse(plan.id, null);
            }}
            className="flex-1 min-h-[48px] rounded-xl border-2 border-filet text-encre font-bold"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="text-[16px] leading-relaxed text-encre">« Dis ton pitch à voix basse, en regardant tes mots-clés. »</p>
      <p className="text-[14px] text-doux mt-1 leading-snug">Chronomètre de 2 minutes, un signal à 1 min 45. Touche l'écran pour passer au temps suivant. 2 essais conseillés.</p>
      {dernier ? <Resultat essai={dernier} /> : null}
      <button type="button" onClick={() => commencer('complet')} className="bp-pitch-commencer mt-3 w-full min-h-[52px] rounded-xl bg-violet text-white text-[17px] font-bold">
        {essais.some((e) => e.mode === 'complet') ? 'Recommencer (2 minutes)' : 'Commencer (2 minutes)'}
      </button>
      <button
        type="button"
        aria-expanded={morceaux}
        onClick={() => setMorceaux((o) => !o)}
        className="bp-pitch-morceaux mt-2.5 w-full min-h-[48px] rounded-xl border-2 border-turquoise text-turquoiseTexte font-bold active:bg-turquoiseClair"
      >
        Répéter par morceaux
      </button>
      {morceaux ? (
        <div className="mt-2.5 rounded-xl bg-turquoiseClair px-3.5 py-3">
          <p className="text-[15px] text-encre leading-snug">D'abord le problème seul, puis problème et solution, puis le tout. Chaque morceau se répète jusqu'à tenir dans son temps.</p>
          <div className="mt-2.5 flex flex-col gap-2">
            <button type="button" onClick={() => commencer('morceau1')} className="min-h-[44px] px-3 rounded-xl bg-white border-2 border-filet text-encre font-bold text-left">
              1. Le problème seul (20 secondes)
            </button>
            <button type="button" onClick={() => commencer('morceau2')} className="min-h-[44px] px-3 rounded-xl bg-white border-2 border-filet text-encre font-bold text-left">
              2. Le problème et la solution (50 secondes)
            </button>
            <button type="button" onClick={() => commencer('complet')} className="min-h-[44px] px-3 rounded-xl bg-white border-2 border-filet text-encre font-bold text-left">
              3. Le tout (2 minutes)
            </button>
          </div>
        </div>
      ) : null}
      {essais.length ? (
        <div className="bp-pitch-essais mt-4">
          <h3 className="text-[16px] font-bold text-encre">Mes essais</h3>
          <ul className="mt-1.5 divide-y divide-filet">
            {essais.map((e, k) => (
              <li key={e.id} className="bp-pitch-essai py-2 flex flex-wrap justify-between gap-x-3 text-[15px]">
                <span className="text-encre">
                  Essai {essais.length - k} : {libelleMode(e.mode)}
                  <span className="block text-[13px] text-doux">{dateFr(e.date)}</span>
                </span>
                <span className={`tabular-nums font-bold ${e.totalMs > MODES[e.mode].duree * 1000 ? 'text-alerte' : 'text-violet'}`}>{duree(e.totalMs)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

export default function Page({ plan, modifier, lectureSeule: ls }: AtelierProps) {
  const pitch = pitchDe(plan);
  const parts = trame(plan);
  const exemple = useMemo(() => exempleDuSecteur(plan), [plan]);
  const questions = questionsPieges(plan);
  // The read-only example keeps its rehearsals on screen only.
  const [essaisLocaux, setEssaisLocaux] = useState<EssaiPitch[]>([]);
  const essais = ls ? essaisLocaux : pitch.essais;
  const changer = (recette: (p: NonNullable<Plan['pitch']>) => void) =>
    modifier((p) => {
      if (!p.pitch) p.pitch = pitchVide();
      recette(p.pitch);
    });
  const enregistrer = (e: EssaiPitch) => {
    if (ls) setEssaisLocaux((l) => [e, ...l].slice(0, ESSAIS_GARDES));
    else changer((pi) => void (pi.essais = [e, ...pi.essais].slice(0, ESSAIS_GARDES)));
  };
  const fini = cartesRemplies(plan) === 6 && essais.some((e) => e.mode === 'complet');

  return (
    <>
      <Carte ton="violet" titre="Mon pitch de 2 minutes">
        <p className="text-[16px] leading-relaxed text-encre">
          L'app construit les 5 temps de ton pitch à partir de ton résumé, en <strong>mots-clés</strong> (au plus 12 mots par temps), avec la durée de chaque temps. Tu peux changer
          les mots-clés, pas en faire des phrases à lire.
        </p>
      </Carte>

      <Carte titre="Ma trame" sousTitre={`5 temps, ${DUREE_TOTALE - MARGE} secondes, plus ${MARGE} secondes de marge`} className="bp-pitch-trame">
        {parts.map((t) => {
          const n = compterMots(t.mots);
          const exempleMots = exemple?.mots[t.n - 1];
          return (
            <div key={t.cle} className="bp-pitch-temps mb-4 border-b border-filet pb-3 last:border-b-0 last:pb-0 last:mb-0" data-temps={t.cle}>
              <ChampTexte
                label={`${t.n}. ${t.titre} (${t.duree} s)`}
                valeur={t.mots}
                onChange={(v) => changer((pi) => void (pi.motsCles[t.cle] = v))}
                lectureSeule={ls}
                placeholder="Des mots-clés séparés par des points-virgules"
              />
              <div className="-mt-3 mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className={`bp-pitch-compteur text-[14px] font-bold tabular-nums ${n > MAX_MOTS ? 'text-alerte' : 'text-doux'}`}>
                  {n} / {MAX_MOTS} mots
                </span>
                {!ls && t.modifie ? (
                  <button type="button" onClick={() => changer((pi) => void delete pi.motsCles[t.cle])} className="min-h-[44px] px-2 text-turquoiseTexte font-bold text-[14px] flex items-center gap-1.5">
                    <Icone nom="copier" /> Reprendre mon résumé
                  </button>
                ) : null}
              </div>
              {n > MAX_MOTS ? <Alerte texte="Des mots-clés, pas des phrases." /> : null}
              {!t.mots.trim() ? <p className="text-[14px] text-doux leading-snug mb-2">Rien à reprendre : remplis d'abord la carte de ton résumé.</p> : null}
              {exemple && exempleMots ? (
                <p className="bp-pitch-exemple text-[14px] text-doux leading-snug">
                  <span className="font-bold">Exemple {exemple.nom} :</span> {exempleMots}
                </p>
              ) : null}
            </div>
          );
        })}
        <p className="mt-3 text-[14px] text-doux">Marge : {MARGE} secondes.</p>
      </Carte>

      <Carte titre="Ma répétition chronométrée" className="bp-pitch-repetition">
        <Repetition plan={plan} essais={essais} enregistrer={enregistrer} />
      </Carte>

      <Carte titre="Les 3 questions pièges du jury" sousTitre="Choisies d'abord parmi les points faibles de ton plan" className="bp-pitch-questions">
        {questions.map((q, i) => (
          <div key={q.id} className="bp-pitch-question mb-4 last:mb-0" data-question={q.id}>
            <p className="text-[17px] font-bold text-violet leading-snug">
              {i + 1}. {q.texte}
            </p>
            {q.raison ? <p className="text-[14px] text-doux mt-0.5 mb-1 leading-snug">{q.raison}</p> : null}
            <ChampTexte
              label="Ma réponse, en une phrase ou en mots-clés"
              valeur={pitch.reponses[q.id] ?? ''}
              onChange={(v) => changer((pi) => void (pi.reponses[q.id] = v))}
              lectureSeule={ls}
            />
            {!ls && !(pitch.reponses[q.id] ?? '').trim() ? <p className="-mt-3 text-[14px] text-doux leading-snug">Le jury te la posera : prépare une phrase.</p> : null}
          </div>
        ))}
      </Carte>

      {fini ? (
        <Carte ton="turquoise" className="bp-pitch-fin">
          <p className="text-[17px] font-bold text-encre leading-snug">Étape terminée. Ton projet tient sur une page et en 2 minutes.</p>
          <Link to={`/p/${plan.id}/relecture`} onClick={() => window.scrollTo(0, 0)} className="mt-3 min-h-[48px] w-full rounded-xl bg-turquoise text-white font-bold flex items-center justify-center px-3 text-center">
            Étape suivante : la relecture en binôme
          </Link>
        </Carte>
      ) : null}
    </>
  );
}
