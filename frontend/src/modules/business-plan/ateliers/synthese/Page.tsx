// Synthèse "Le résumé de mon business plan" (workbook page 16): 6 cards, each one filled by hand or with
// "Reprendre mes réponses" (a short draft built from the modules, then editable). Card 5 also shows the
// key figures computed live from module 5.
import { useState } from 'react';
import type { AtelierProps } from '../../types';
import { ChampTexte } from '../../composants/Champs';
import { Carte, Resultat } from '../../composants/Carte';
import { Icone } from '../../composants/Icones';
import { ariary, grouper, pluriel } from '../../utils/format';
import { CARTES, brouillon, chiffresCles, type CleCarte } from './brouillons';

function Reprendre({ cle, actuel, plan, remplir }: { cle: CleCarte; actuel: string; plan: AtelierProps['plan']; remplir: (v: string) => void }) {
  const [confirmer, setConfirmer] = useState(false);
  const [vide, setVide] = useState(false);
  const lancer = () => {
    const texte = brouillon(plan, cle);
    if (!texte) {
      setVide(true);
      return;
    }
    setVide(false);
    if (actuel.trim() && actuel.trim() !== texte) setConfirmer(true);
    else remplir(texte);
  };
  if (confirmer) {
    return (
      <div className="mb-4 rounded-xl bg-violetClair px-3.5 py-3">
        <p className="text-[15px] font-bold text-encre leading-snug">Remplacer votre texte par vos réponses des modules ?</p>
        <div className="mt-2.5 flex gap-2.5">
          <button
            type="button"
            onClick={() => {
              remplir(brouillon(plan, cle));
              setConfirmer(false);
            }}
            className="flex-1 min-h-[44px] rounded-xl bg-violet text-white font-bold"
          >
            Remplacer
          </button>
          <button type="button" onClick={() => setConfirmer(false)} className="flex-1 min-h-[44px] rounded-xl border-2 border-filet text-encre font-bold">
            Annuler
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={lancer}
        className="bp-reprendre min-h-[44px] w-full px-4 rounded-xl border-2 border-turquoise text-turquoiseTexte font-bold flex items-center justify-center gap-2 active:bg-turquoiseClair"
      >
        <Icone nom="copier" /> Reprendre mes réponses
      </button>
      {vide ? <p className="mt-1.5 text-[14px] text-doux leading-snug">Rien à reprendre pour le moment : remplissez d'abord le module correspondant.</p> : null}
    </div>
  );
}

export default function Page({ plan, modifier, lectureSeule: ls }: AtelierProps) {
  const k = chiffresCles(plan);
  return (
    <>
      <Carte ton="violet" titre="Le résumé de mon business plan">
        <p className="text-[16px] leading-relaxed text-encre">
          Le résumé est la page la plus lue : beaucoup de jurys ne lisent qu'elle. On l'écrit en dernier, en une page maximum, en reprenant vos meilleures réponses des modules 1
          à 5.
        </p>
      </Carte>

      {CARTES.map((c) => (
        <Carte key={c.cle} id={`syn-${c.cle}`} titre={`${c.n}. ${c.titre}`} sousTitre={c.source} className="bp-carte-synthese">
          {c.cle === 'chiffres' ? (
            <div className="bp-chiffres-cles rounded-xl bg-turquoiseClair px-3 py-1 mb-4">
              <Resultat label="Besoin total" valeur={<span className="bp-cle-besoin">{k.besoinTotal === null ? 'Non calculé' : ariary(k.besoinTotal)}</span>} fort />
              <Resultat label="Financement demandé" valeur={<span className="bp-cle-financement">{k.financementDemande === null ? 'Non rempli' : ariary(k.financementDemande)}</span>} />
              <Resultat label="Chiffre d'affaires année 1" valeur={<span className="bp-cle-ca">{k.caAnnee1 === null ? 'Non calculé' : ariary(k.caAnnee1)}</span>} />
              <Resultat
                label="Seuil de rentabilité"
                valeur={<span className="bp-cle-seuil">{k.seuilMois === null ? 'Non calculé' : `${grouper(k.seuilMois)} ${pluriel(plan.uniteVente, k.seuilMois)} par mois`}</span>}
              />
              <p className="text-[13px] text-doux pb-1.5">Calculés à partir du module 5. Financement demandé : subvention, prêt et autre ressource.</p>
            </div>
          ) : null}
          {!ls ? (
            <Reprendre
              cle={c.cle}
              actuel={plan.synthese[c.cle]}
              plan={plan}
              remplir={(v) =>
                modifier((p) => {
                  p.synthese[c.cle] = v;
                })
              }
            />
          ) : null}
          <ChampTexte
            label="Mon texte"
            valeur={plan.synthese[c.cle]}
            onChange={(v) =>
              modifier((p) => {
                p.synthese[c.cle] = v;
              })
            }
            lectureSeule={ls}
          />
        </Carte>
      ))}
    </>
  );
}
