/**
 * <EauConsoFlipCard> — carte KPI à DEUX FACES qui alternent automatiquement (« Conso du
 * réseau » ↔ « Conso au compteur ») toutes les 7 s, façon panneau d'affichage de gare.
 *
 * Réplique fidèlement la coque/charte de `EauStatCard` (même bordure, padding, ombre,
 * conteneur d'icône teinté), mais :
 *   - le TITRE est un `<button>` qui bascule INSTANTANÉMENT vers l'autre face et RELANCE le
 *     cycle de 7 s (clavier OK, `stopPropagation` → ne déclenche PAS la navigation) ;
 *   - le CORPS de la carte navigue (`onBody`, ex. Tendances) ;
 *   - l'ICÔNE navigue (`onIcon`, ex. saisie compteur) et se RETOURNE (rotateY) au changement
 *     de face, la tonalité (teal ↔ olive) glissant au même instant ;
 *   - titre, valeur (+ % éventuel) et sous-titre défilent en split-flap (<EauSplitFlap>).
 *
 * Hygiène : intervalle de 7 s en pause quand l'onglet est caché ; tous les timers nettoyés.
 * `prefers-reduced-motion` → bascule directe (l'alternance 7 s demeure, sans animation).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../../utils/cn';
import { TONE_CONTAINER, TONE_VALUE, type LucideIcon, type EauTone } from './EauUi';
import EauSplitFlap, { usePrefersReducedMotion } from './EauSplitFlap';

export type ConsoFace = {
  icon: LucideIcon;
  tone: EauTone;
  /** Libellé majuscule (ex. « Conso du réseau »). */
  title: string;
  /** Valeur principale déjà formatée (ex. « 1,2 m³/h » ou « — »). */
  valueMain: string;
  /** Pourcentage secondaire optionnel (ex. « 45 % »), aligné à droite. */
  valuePct?: string;
  /** Sous-titre (ex. cumul + fenêtre). */
  hint: string;
};

const PERIOD_MS = 7000; // cadence d'alternance
const FLIP_MS = 90; // demi-tour de l'icône (edge-on à mi-parcours)

export default function EauConsoFlipCard({
  faces,
  onBody,
  onIcon,
  iconAriaLabel,
}: {
  faces: [ConsoFace, ConsoFace];
  onBody?: () => void;
  onIcon?: () => void;
  iconAriaLabel?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [face, setFace] = useState(0);
  // Incrémenté à chaque bascule MANUELLE → relance l'intervalle de 7 s depuis ce moment.
  const [cycle, setCycle] = useState(0);

  // Alternance auto toutes les 7 s, en pause quand l'onglet est caché.
  useEffect(() => {
    let id: number | null = null;
    const start = () => {
      if (id == null) id = window.setInterval(() => setFace((f) => 1 - f), PERIOD_MS);
    };
    const stop = () => {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    };
    const onVis = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [cycle]);

  const toggle = () => {
    setFace((f) => 1 - f);
    setCycle((c) => c + 1);
  };

  const cur = faces[face];

  // Alphabets stables (union des deux faces) par zone → rouleaux courts et lisibles.
  // Le titre est mis en MAJUSCULES par CSS : on défile en minuscules (alphabet plus court,
  // sans capitale parasite au milieu du roulement), l'aria-label gardant la casse normale.
  const titleAlpha = useMemo(() => (faces[0].title + faces[1].title).toLowerCase(), [faces]);
  const valueAlpha = useMemo(() => faces[0].valueMain + faces[1].valueMain, [faces]);
  const pctAlpha = useMemo(() => (faces[0].valuePct ?? '') + (faces[1].valuePct ?? ''), [faces]);
  const hintAlpha = useMemo(() => faces[0].hint + faces[1].hint, [faces]);

  // Flip de l'icône : l'icône/tonalité affichées suivent `face` avec un demi-tour de retard
  // pour basculer pile quand le conteneur est de profil (invisible).
  const [iconFace, setIconFace] = useState(0);
  const [flipping, setFlipping] = useState(false);
  useEffect(() => {
    if (iconFace === face) return;
    if (reduced) {
      setIconFace(face);
      return;
    }
    setFlipping(true);
    const t = window.setTimeout(() => {
      setIconFace(face);
      setFlipping(false);
    }, FLIP_MS);
    return () => clearTimeout(t);
  }, [face, iconFace, reduced]);

  const IconCur = faces[iconFace].icon;
  const iconTone = faces[iconFace].tone;

  const interactive = !!onBody;
  const baseClass = cn(
    'w-full text-left rounded-xl border border-ahuvi-100 bg-white p-4 shadow-soft relative overflow-hidden',
    interactive && 'cursor-pointer hover:border-ahuvi-300 hover:shadow-md transition-colors',
    interactive && 'focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-300',
  );

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onBody}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onBody?.();
              }
            }
          : undefined
      }
      className={baseClass}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          {/* TITRE = bouton de bascule (instantanée + reset 7 s). stopPropagation → pas de nav. */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            aria-label="Basculer entre Conso du réseau et Conso au compteur"
            className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 rounded cursor-pointer hover:text-ahuvi-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-300"
          >
            <EauSplitFlap text={cur.title.toLowerCase()} alphabet={titleAlpha} ariaLabel={cur.title} />
          </button>

          {/* ICÔNE = saisie compteur ; retournement rotateY au changement de face. */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIcon?.();
            }}
            aria-label={iconAriaLabel}
            style={{ perspective: '400px' }}
            className="flex-shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-300"
          >
            <span
              className={cn(
                'w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center hover:brightness-95',
                TONE_CONTAINER[iconTone],
              )}
              style={{
                transform: flipping ? 'rotateY(90deg)' : 'rotateY(0deg)',
                // Easing directionnel : le volet se rabat (ease-in) puis la nouvelle face
                // arrive en douceur (ease-out, « no bounce ») ; la tonalité glisse en parallèle.
                transition: `transform 90ms ${flipping ? 'ease-in' : 'ease-out'}, background-color 220ms ease, color 220ms ease`,
                transformStyle: 'preserve-3d',
              }}
            >
              <IconCur className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
            </span>
          </button>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <EauSplitFlap
            text={cur.valueMain}
            alphabet={valueAlpha}
            ariaLabel={cur.valueMain}
            className={cn('text-2xl font-bold transition-colors', TONE_VALUE[cur.tone])}
          />
          <EauSplitFlap
            text={cur.valuePct ?? ''}
            alphabet={pctAlpha}
            ariaLabel={cur.valuePct ?? ''}
            className="text-sm font-medium text-gray-400"
          />
        </div>

        <div className="text-sm mt-0.5 text-gray-500">
          <EauSplitFlap text={cur.hint} alphabet={hintAlpha} ariaLabel={cur.hint} />
        </div>
      </div>
    </div>
  );
}
