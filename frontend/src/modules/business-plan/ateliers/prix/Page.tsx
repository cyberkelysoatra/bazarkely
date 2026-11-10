// "Mes prix relevés" (workbook page 19): prices seen in the field, each one can be sent to the cost lines of 5a.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AtelierProps, Plan } from '../../types';
import { ChampMontant, ChampTexte } from '../../composants/Champs';
import { Carte } from '../../composants/Carte';
import { Icone } from '../../composants/Icones';
import { nouvelId } from '../../etat/vide';
import { ariary } from '../../utils/format';
import { ajouterAuxCouts } from './envoi';

type PrixReleve = Plan['prix'][number];

export default function Page({ plan, modifier, lectureSeule: ls }: AtelierProps) {
  const [envoyes, setEnvoyes] = useState<Record<string, true>>({});
  const set = (recette: (p: Plan) => void) => modifier(recette);
  const changer = (id: string, patch: Partial<PrixReleve>) =>
    set((p) => {
      const l = p.prix.find((x) => x.id === id);
      if (l) Object.assign(l, patch);
    });
  const lignes = ls ? plan.prix.filter((l) => l.element.trim() || l.prix !== null) : plan.prix;
  const saisies = ls ? [] : lignes;

  return (
    <>
      <p className="text-[15px] text-encre leading-relaxed mb-4">
        Notez les prix vus vous-même : au marché, en magasin, chez un fournisseur ou un concurrent. Un prix relevé vaut mieux qu'un prix supposé.
      </p>

      {ls && !lignes.length ? <p className="text-doux italic mb-3">Aucun prix relevé</p> : null}
      {ls && lignes.length ? (
        <ul className="mb-4 divide-y divide-filet rounded-2xl border border-filet bg-white" aria-label="Mes prix relevés">
          {lignes.map((l) => (
            <li key={l.id} className="bp-prix px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 break-words">
                  <span className="font-bold text-encre">{l.element || 'Sans nom'}</span>
                  {l.unite.trim() ? <span className="text-doux">, {l.unite}</span> : null}
                </span>
                <span className="shrink-0 font-bold text-violet tabular-nums">{l.prix === null ? '' : ariary(l.prix)}</span>
              </div>
              {l.ou.trim() ? <p className="text-[14px] text-doux mt-0.5 break-words">{l.ou}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="space-y-3">
        {saisies.map((l, i) => {
          const pret = l.element.trim() !== '' && l.prix !== null;
          return (
            <li key={l.id} className="bp-prix">
              <Carte>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <ChampTexte label={`Élément ${i + 1}`} placeholder="Ex. : mangues" ligne valeur={l.element} onChange={(v) => changer(l.id, { element: v })} lectureSeule={ls} />
                  </div>
                  {!ls ? (
                    <button
                      type="button"
                      onClick={() => set((p) => void (p.prix = p.prix.filter((x) => x.id !== l.id)))}
                      className="shrink-0 mt-6 w-11 h-11 rounded-lg flex items-center justify-center text-doux active:bg-violetClair"
                      aria-label={`Supprimer l'élément ${i + 1}`}
                    >
                      <Icone nom="poubelle" />
                    </button>
                  ) : null}
                </div>
                <ChampTexte label="Unité" placeholder="Ex. : le kg, la pièce, les 100" ligne valeur={l.unite} onChange={(v) => changer(l.id, { unite: v })} lectureSeule={ls} />
                <ChampMontant label="Prix" valeur={l.prix} onChange={(v) => changer(l.id, { prix: v })} lectureSeule={ls} />
                <ChampTexte label="Où et qui ?" placeholder="Ex. : marché de Hell-Ville, Mme Razafy" ligne valeur={l.ou} onChange={(v) => changer(l.id, { ou: v })} lectureSeule={ls} />
                {!ls ? (
                  <>
                    <button
                      type="button"
                      disabled={!pret}
                      onClick={() => {
                        modifier((p) => ajouterAuxCouts(p, l));
                        setEnvoyes((e) => ({ ...e, [l.id]: true }));
                      }}
                      className="bp-envoyer min-h-[44px] w-full px-4 rounded-xl border-2 border-turquoise text-turquoiseTexte font-bold disabled:opacity-50 active:bg-turquoiseClair"
                    >
                      Envoyer vers mon prix de revient
                    </button>
                    {!pret ? <p className="text-[13px] text-doux mt-1">Indiquez l'élément et le prix pour l'envoyer.</p> : null}
                    {envoyes[l.id] ? (
                      <p role="status" className="mt-2 text-[15px] text-turquoiseTexte font-bold flex items-center gap-1.5">
                        <Icone nom="coche" /> Ajouté au module 5
                      </p>
                    ) : null}
                  </>
                ) : null}
              </Carte>
            </li>
          );
        })}
      </ul>

      {!ls ? (
        <button
          type="button"
          onClick={() => set((p) => void p.prix.push({ id: nouvelId(), element: '', unite: '', prix: null, ou: '' }))}
          className="mb-4 min-h-[48px] w-full rounded-xl border-2 border-dashed border-turquoise text-turquoiseTexte font-bold flex items-center justify-center gap-2 active:bg-turquoiseClair"
        >
          <Icone nom="plus" /> Ajouter un prix
        </button>
      ) : null}

      <Link to={`/p/${plan.id}/m5`} className="min-h-[44px] rounded-xl border-2 border-violet text-violet font-bold flex items-center justify-center gap-2">
        Voir mon prix de revient (module 5) <Icone nom="chevron" />
      </Link>
    </>
  );
}
