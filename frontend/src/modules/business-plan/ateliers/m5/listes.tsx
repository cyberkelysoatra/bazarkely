// NEC-CC-38: the lists of module 5 (cahier CGA v0.3, R1 to R6): product cards with their recipe,
// investments (equipment brought shown greyed), one list of resources. Phone first (412 px): only the
// open product card renders its inputs (50 products x 20 components stay usable).
import { memo, useId, useState, type ReactNode } from 'react';
import type { Composant, Investissement, NiveauChiffres, Produit, Ressource } from '../../types';
import { ChampMontant, ChampNombre, ChampTexte, SaisieDecimale, SaisieMontant, ecrireDecimal } from '../../composants/Champs';
import { Resultat } from '../../composants/Carte';
import { Aide } from '../../composants/Aide';
import { Icone } from '../../composants/Icones';
import { composantVide } from '../../etat/vide';
import {
  coutComposant,
  libelleUnite,
  nomProduit,
  normaliserUnite,
  totalInvestissement,
  unitesUtilisables,
  uniteUtiliseeEffective,
  type ChiffresProduit
} from '../../utils/chiffres';
import { ariary, grouper, pluriel } from '../../utils/format';
import { Calcul, formuleComposant, formulesProduit } from './niveaux';

/** Inline confirmation of a deletion ("Supprimer ? Oui, supprimer / Non"). */
export function Confirmer({ texte, oui, non }: { texte: string; oui: () => void; non: () => void }) {
  return (
    <div role="alertdialog" aria-label={texte} className="bp-confirmer mt-2 rounded-xl border-2 border-violet bg-violetClair px-3 py-2.5">
      <p className="text-[15px] font-bold text-encre leading-snug">{texte}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={oui} className="bp-confirmer-oui min-h-[44px] px-4 rounded-xl bg-violet text-white font-bold">
          Oui, supprimer
        </button>
        <button type="button" onClick={non} className="min-h-[44px] px-4 rounded-xl border-2 border-violet text-violet font-bold">
          Non
        </button>
      </div>
    </div>
  );
}

function Poubelle({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center text-doux active:bg-violetClair" aria-label={label}>
      <Icone nom="poubelle" />
    </button>
  );
}

export function BoutonAjouter({ texte, onClick, className = '' }: { texte: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mt-2.5 min-h-[44px] w-full rounded-xl border-2 border-dashed border-turquoise text-turquoiseTexte font-bold flex items-center justify-center gap-2 active:bg-turquoiseClair ${className}`}
    >
      <Icone nom="plus" /> {texte}
    </button>
  );
}

const UNITES: { v: string; t: string }[] = [
  { v: 'piece', t: 'pièce' },
  { v: 'kg', t: 'kg' },
  { v: 'g', t: 'g' },
  { v: 'l', t: 'litre (l)' },
  { v: 'ml', t: 'ml' }
];

function ChoixUnite({ valeur, options, onChange, label }: { valeur: string; options: string[]; onChange: (u: string) => void; label: string }) {
  const v = normaliserUnite(valeur);
  const liste = UNITES.filter((u) => options.includes(u.v));
  // A unit typed by an older plan or another version stays selectable.
  if (!liste.some((u) => u.v === v)) liste.push({ v, t: v });
  return (
    <select aria-label={label} value={v} onChange={(e) => onChange(e.target.value)} className="bp-champ mt-1.5 !w-auto min-w-[88px] shrink-0 bg-white">
      {liste.map((u) => (
        <option key={u.v} value={u.v}>
          {u.t}
        </option>
      ))}
    </select>
  );
}

const TOUTES = UNITES.map((u) => u.v);

type ChangerProduit = (id: string, recette: (p: Produit) => void) => void;

/** One line of the recipe of ONE unit sold (R2). Memoised on its values: the plan is deep-copied on
 * every keystroke, so only the line being typed re-renders (50 products x 20 components). */
const LigneComposant = memo(
  function LigneComposant({
    k,
    rang,
    niveau,
    produitId,
    changerProduit
  }: {
    k: Composant;
    rang: number;
    niveau: NiveauChiffres;
    produitId: string;
    changerProduit: ChangerProduit;
  }) {
    const changer = (patch: Partial<Composant>) =>
      changerProduit(produitId, (p) => {
        const x = p.composants.find((y) => y.id === k.id);
        if (x) Object.assign(x, patch);
      });
    const supprimer = () =>
      changerProduit(produitId, (p) => {
        p.composants = p.composants.filter((y) => y.id !== k.id);
        // The last line deleted leaves one empty line.
        if (!p.composants.length) p.composants = [composantVide()];
      });
    const [confirmer, setConfirmer] = useState(false);
    const r = coutComposant(k);
    const lot = normaliserUnite(k.uniteLot);
    const utilisables = unitesUtilisables(lot);
    const n = rang + 1;
    return (
      <li className="bp-composant rounded-xl border border-filet bg-white p-2.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="bp-champ min-w-0 flex-1"
            value={k.designation}
            placeholder="Ex. : farine, sachet"
            aria-label={`Composant ${n}, désignation`}
            onChange={(e) => changer({ designation: e.target.value })}
          />
          <Poubelle label={`Supprimer le composant ${n}`} onClick={() => setConfirmer(true)} />
        </div>
        {confirmer ? (
          <Confirmer
            texte={`Supprimer « ${k.designation.trim() || `composant ${n}`} » ?`}
            oui={() => {
              setConfirmer(false);
              supprimer();
            }}
            non={() => setConfirmer(false)}
          />
        ) : null}
        <p className="mt-2 text-[14px] font-bold text-encre">Prix du lot acheté</p>
        <SaisieMontant valeur={k.prixLot} onChange={(v) => changer({ prixLot: v })} label={`Composant ${n}, prix du lot`} />
        <p className="mt-2 text-[14px] font-bold text-encre">Quantité du lot</p>
        <div className="flex items-start gap-2">
          <SaisieDecimale
            className="min-w-0 flex-1"
            valeur={k.quantiteLot}
            onChange={(v) => changer({ quantiteLot: v })}
            label={`Composant ${n}, quantité du lot`}
            placeholder="1"
          />
          <ChoixUnite
            valeur={k.uniteLot}
            options={TOUTES}
            label={`Composant ${n}, unité du lot`}
            onChange={(u) =>
              changer({
                uniteLot: u,
                uniteUtilisee: unitesUtilisables(u).includes(normaliserUnite(k.uniteUtilisee)) ? k.uniteUtilisee : u
              })
            }
          />
        </div>
        <p className="mt-2 text-[14px] font-bold text-encre">Quantité utilisée pour UNE unité vendue</p>
        <div className="flex items-start gap-2">
          <SaisieDecimale
            className="min-w-0 flex-1"
            valeur={k.quantiteUtilisee}
            onChange={(v) => changer({ quantiteUtilisee: v })}
            label={`Composant ${n}, quantité utilisée`}
            placeholder="1"
          />
          {utilisables.length > 1 ? (
            <ChoixUnite valeur={uniteUtiliseeEffective(k)} options={utilisables} label={`Composant ${n}, unité utilisée`} onChange={(u) => changer({ uniteUtilisee: u })} />
          ) : (
            <span className="mt-1.5 min-h-[48px] min-w-[88px] px-2 flex items-center justify-center text-[15px] font-bold text-doux">
              {libelleUnite(lot, k.quantiteUtilisee ?? 1)}
            </span>
          )}
        </div>
        <div className="mt-2 rounded-lg bg-turquoiseClair px-2.5 py-1">
          {r.ignore ? (
            <p className="bp-composant-ignore py-1 text-[14px] font-bold text-violet leading-snug">Quantité manquante : cette ligne n'est pas comptée.</p>
          ) : (
            <Resultat label="Coût pour une unité" valeur={<span className="bp-cout-composant">{r.cout === null ? 'à compléter' : ariary(r.cout)}</span>} />
          )}
          <Calcul niveau={niveau} texte={formuleComposant(k)} />
        </div>
      </li>
    );
  },
  (a, b) =>
    a.rang === b.rang &&
    a.niveau === b.niveau &&
    a.produitId === b.produitId &&
    a.changerProduit === b.changerProduit &&
    (Object.keys(a.k) as (keyof Composant)[]).length === Object.keys(b.k).length &&
    (Object.keys(a.k) as (keyof Composant)[]).every((c) => a.k[c] === b.k[c])
);

/** Read-only recipe (example, trainer screen). */
function RecetteLecture({ composants, cp }: { composants: Composant[]; cp: ChiffresProduit }) {
  const pleins = composants.filter((k) => k.designation.trim() || k.prixLot !== null);
  if (!pleins.length) return <p className="text-doux italic mb-3">Aucun composant</p>;
  return (
    <ul className="mb-3 divide-y divide-filet rounded-xl border border-filet bg-white" aria-label="La recette d'une unité">
      {pleins.map((k) => {
        const r = cp.composants[composants.indexOf(k)];
        const q = (x: number | null) => (x === null ? '?' : ecrireDecimal(x));
        return (
          <li key={k.id} className="px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-encre break-words min-w-0">{k.designation || 'Sans désignation'}</span>
              <span className="font-bold tabular-nums whitespace-nowrap">{r?.cout === null || r?.cout === undefined ? '' : ariary(r.cout)}</span>
            </div>
            <p className="text-[13px] text-doux">
              Lot : {k.prixLot === null ? '?' : ariary(k.prixLot)} pour {q(k.quantiteLot)} {libelleUnite(k.uniteLot, k.quantiteLot ?? 1)} ; utilisé : {q(k.quantiteUtilisee)}{' '}
              {libelleUnite(uniteUtiliseeEffective(k), k.quantiteUtilisee ?? 1)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function AideRecette() {
  return (
    <Aide titre="Comment remplir la recette ?">
      <p>
        Le prix du lot, c'est ce que vous payez au marché. La quantité utilisée, c'est ce qui part dans UNE unité vendue. Vous pouvez acheter en kg et compter en g (ou en litres et
        compter en ml) : l'app fait la conversion.
      </p>
      <p className="mt-2">Exemple : un sac de farine de 50 kg à 150 000 Ar, 300 g par pain : 150 000 ÷ 50 × 0,3 = 900 Ar par pain.</p>
      <p className="mt-2">
        Vous ne connaissez qu'un coût global pour une unité ? Une seule ligne suffit : prix du lot = ce coût, quantité du lot 1 pièce, quantité utilisée 1 pièce.
      </p>
    </Aide>
  );
}

interface PropsCarte {
  produit: Produit;
  cp: ChiffresProduit;
  rang: number;
  ouvert: boolean;
  lectureSeule: boolean;
  niveau: NiveauChiffres;
  /** Unit shown for the produit principal when its own is empty (plan.uniteVente). */
  uniteDefaut: string;
  basculer: (id: string) => void;
  changer: (id: string, recette: (p: Produit) => void) => void;
  monter: (id: string) => void;
  supprimer: (id: string) => void;
}

/** Folded header of a product card: name, cost per unit, margin (Ar and %). */
const EnTeteProduit = memo(function EnTeteProduit({
  id,
  nom,
  rang,
  cout,
  marge,
  taux,
  unite,
  ouvert,
  ignores,
  basculer
}: {
  id: string;
  nom: string;
  rang: number;
  cout: number;
  marge: number | null;
  taux: number | null;
  unite: string;
  ouvert: boolean;
  ignores: number;
  basculer: (id: string) => void;
}) {
  const panneau = useId();
  return (
    <button
      type="button"
      aria-expanded={ouvert}
      aria-controls={panneau}
      onClick={() => basculer(id)}
      className="bp-produit-tete w-full text-left flex items-start gap-2 min-h-[56px] p-3"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-bold text-violet leading-tight break-words">{nom}</span>
        {rang === 0 && nom !== 'Produit principal' ? <span className="mt-1 inline-block rounded-full bg-violet px-2 py-0.5 text-[12px] font-bold text-white">Produit principal</span> : null}
        <span className="bp-produit-resume block mt-1 text-[14px] text-encre leading-snug">
          Coût de revient : <span className="font-bold tabular-nums">{ariary(cout)}</span>
          {unite ? ` par ${pluriel(unite, 1)}` : ''}
          {marge !== null ? (
            <>
              , marge : <span className="font-bold tabular-nums">{ariary(marge)}</span>
              {taux !== null ? ` (${grouper(taux)} %)` : ''}
            </>
          ) : null}
        </span>
        {ignores ? (
          <span className="block mt-0.5 text-[13px] font-bold text-violet">
            {ignores} composant{ignores > 1 ? 's' : ''} non compté
            {ignores > 1 ? 's' : ''}
          </span>
        ) : null}
      </span>
      <Icone nom="chevron" className={`w-5 h-5 shrink-0 mt-1 text-violet transition-transform ${ouvert ? 'rotate-90' : ''}`} />
    </button>
  );
});

/** One product card (R1, R3, R8). Folded: header only; open: every input of the product and its recipe. */
export const CarteProduit = memo(function CarteProduit({ produit, cp, rang, ouvert, lectureSeule: ls, niveau, uniteDefaut, basculer, changer, monter, supprimer }: PropsCarte) {
  const [confirmer, setConfirmer] = useState(false);
  const unite = produit.unite.trim() || (rang === 0 ? uniteDefaut.trim() : '');
  const set = (recette: (p: Produit) => void) => changer(produit.id, recette);
  const f = ouvert ? formulesProduit(cp) : null;
  return (
    <li className={`bp-produit rounded-2xl border ${ouvert ? 'border-violet' : 'border-filet'} bg-white`}>
      <EnTeteProduit
        id={produit.id}
        nom={nomProduit(produit, rang)}
        rang={rang}
        cout={cp.cout}
        marge={cp.marge}
        taux={cp.tauxMarge}
        unite={unite}
        ouvert={ouvert}
        ignores={cp.ignores}
        basculer={basculer}
      />
      {ouvert ? (
        <div className="bp-produit-corps border-t border-filet px-3 pt-3 pb-3">
          <ChampTexte
            label="Nom du produit ou du service"
            ligne
            placeholder="Ex. : pain, nuitée, réparation"
            valeur={produit.nom}
            onChange={(v) => set((p) => void (p.nom = v))}
            lectureSeule={ls}
          />
          <ChampTexte
            label="Unité de vente"
            ligne
            placeholder="un pain, une nuitée, un kg"
            valeur={produit.unite || (rang === 0 ? uniteDefaut : '')}
            onChange={(v) => set((p) => void (p.unite = v))}
            lectureSeule={ls}
          />
          <ChampMontant label="Prix de vente d'une unité" valeur={produit.prix} onChange={(v) => set((p) => void (p.prix = v))} lectureSeule={ls} />
          <ChampNombre
            label={`Ventes par mois, année 1${unite ? ` (${pluriel(unite, 2)})` : ''}`}
            valeur={produit.ventesParMois}
            onChange={(v) => set((p) => void (p.ventesParMois = v))}
            lectureSeule={ls}
          />
          <p className="text-[16px] font-bold text-violet mb-1">La recette d'une unité</p>
          <AideRecette />
          {ls ? (
            <RecetteLecture composants={produit.composants} cp={cp} />
          ) : (
            <>
              <ul className="space-y-2.5" aria-label={`Recette de ${nomProduit(produit, rang)}`}>
                {produit.composants.map((k, i) => (
                  <LigneComposant key={k.id} k={k} rang={i} niveau={niveau} produitId={produit.id} changerProduit={changer} />
                ))}
              </ul>
              <BoutonAjouter texte="Ajouter un composant" onClick={() => set((p) => void p.composants.push(composantVide()))} />
            </>
          )}
          <div className="mt-3 rounded-xl bg-turquoiseClair px-3 py-1">
            <Resultat label="Coût de revient d'une unité" valeur={<span className="bp-cout-produit">{ariary(cp.cout)}</span>} fort />
            <Calcul niveau={niveau} texte={f?.cout ?? null} />
            {cp.marge !== null ? (
              <>
                <Resultat label="Marge par unité" valeur={<span className="bp-marge-produit">{ariary(cp.marge)}</span>} fort />
                <Calcul niveau={niveau} texte={f?.marge ?? null} />
                {cp.tauxMarge !== null ? <Resultat label="Taux de marge" valeur={`${grouper(cp.tauxMarge)} %`} /> : null}
                <Calcul niveau={niveau} texte={f?.taux ?? null} />
              </>
            ) : null}
          </div>
          {!ls ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {rang > 0 ? (
                <button type="button" onClick={() => monter(produit.id)} className="bp-mettre-en-tete min-h-[44px] px-4 rounded-xl border-2 border-violet text-violet font-bold">
                  Mettre en tête
                </button>
              ) : null}
              <button type="button" onClick={() => setConfirmer(true)} className="bp-supprimer-produit min-h-[44px] px-3 rounded-xl text-doux font-bold flex items-center gap-1.5">
                <Icone nom="poubelle" /> Supprimer ce produit
              </button>
            </div>
          ) : null}
          {confirmer ? (
            <Confirmer
              texte={`Supprimer le produit « ${nomProduit(produit, rang)} » et sa recette ?`}
              oui={() => {
                setConfirmer(false);
                supprimer(produit.id);
              }}
              non={() => setConfirmer(false)}
            />
          ) : null}
        </div>
      ) : null}
    </li>
  );
});

/** Investments (R5) and, greyed, the equipment brought (R6, typed once in the resources). */
export function ListeInvestissements({
  lignes,
  apportes,
  lectureSeule: ls,
  changer,
  supprimer,
  ajouter
}: {
  lignes: Investissement[];
  apportes: Ressource[];
  lectureSeule: boolean;
  changer: (id: string, patch: Partial<Investissement>) => void;
  supprimer: (id: string) => void;
  ajouter: () => void;
}) {
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const grises = apportes.filter((r) => r.valeur !== null || r.designation.trim());
  const pleines = ls ? lignes.filter((i) => i.designation.trim() || i.prixUnitaire !== null) : lignes;
  return (
    <div className="mb-3" role="group" aria-label="Investissements">
      <ul className="space-y-2.5">
        {pleines.map((l, i) =>
          ls ? (
            <li key={l.id} className="rounded-xl border border-filet bg-white px-3 py-2.5 flex items-start justify-between gap-3">
              <span className="min-w-0 break-words text-encre">
                {l.designation || 'Sans désignation'}
                <span className="block text-[13px] text-doux">
                  {ecrireDecimal(l.quantite ?? 1)} × {l.prixUnitaire === null ? '?' : ariary(l.prixUnitaire)}
                </span>
              </span>
              <span className="font-bold tabular-nums whitespace-nowrap">{ariary(totalInvestissement(l))}</span>
            </li>
          ) : (
            <li key={l.id} className="bp-investissement rounded-xl border border-filet bg-white p-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="bp-champ min-w-0 flex-1"
                  value={l.designation}
                  placeholder="Ex. : four, réfrigérateur"
                  aria-label={`Investissement ${i + 1}, désignation`}
                  onChange={(e) => changer(l.id, { designation: e.target.value })}
                />
                <Poubelle label={`Supprimer l'investissement ${i + 1}`} onClick={() => setASupprimer(l.id)} />
              </div>
              {aSupprimer === l.id ? (
                <Confirmer
                  texte={`Supprimer « ${l.designation.trim() || `investissement ${i + 1}`} » ?`}
                  oui={() => {
                    setASupprimer(null);
                    supprimer(l.id);
                  }}
                  non={() => setASupprimer(null)}
                />
              ) : null}
              <div className="mt-1 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
                <div className="min-w-0">
                  <p className="mt-1 text-[14px] font-bold text-encre">Quantité</p>
                  <SaisieDecimale valeur={l.quantite} onChange={(v) => changer(l.id, { quantite: v })} label={`Investissement ${i + 1}, quantité`} placeholder="1" />
                </div>
                <div className="min-w-0">
                  <p className="mt-1 text-[14px] font-bold text-encre">Prix unitaire</p>
                  <SaisieMontant valeur={l.prixUnitaire} onChange={(v) => changer(l.id, { prixUnitaire: v })} label={`Investissement ${i + 1}, prix unitaire`} />
                </div>
              </div>
              <Resultat label="Total" valeur={<span className="bp-total-investissement">{ariary(totalInvestissement(l))}</span>} />
            </li>
          )
        )}
        {grises.map((r) => (
          <li key={r.id} className="bp-apporte rounded-xl border border-dashed border-filet bg-[#f4f4f4] px-3 py-2.5 flex items-start justify-between gap-3 text-doux">
            <span className="min-w-0 break-words">
              {r.designation.trim() || 'Matériel apporté'}
              <span className="ml-2 inline-block rounded-full border border-doux px-2 py-0.5 text-[12px] font-bold">apporté</span>
            </span>
            <span className="font-bold tabular-nums whitespace-nowrap">{ariary(r.valeur ?? 0)}</span>
          </li>
        ))}
      </ul>
      {grises.length ? <p className="mt-1.5 text-[13px] text-doux">Le matériel apporté se saisit dans les ressources : il est compté une seule fois.</p> : null}
      {!ls ? <BoutonAjouter texte="Ajouter un investissement" onClick={ajouter} /> : null}
    </div>
  );
}

export const NATURES: { v: Ressource['nature']; t: string }[] = [
  { v: 'argent', t: 'Argent du porteur ou des associés' },
  { v: 'materiel', t: 'Matériel apporté' },
  { v: 'subvention', t: 'Subvention' },
  { v: 'pret', t: 'Prêt' },
  { v: 'autre', t: 'Autre' }
];
export const libelleNature = (n: string) => NATURES.find((x) => x.v === n)?.t ?? 'Autre';

/** Resources in one list (R6): nature, designation, value. */
export function ListeRessources({
  lignes,
  lectureSeule: ls,
  changer,
  supprimer,
  ajouter
}: {
  lignes: Ressource[];
  lectureSeule: boolean;
  changer: (id: string, patch: Partial<Ressource>) => void;
  supprimer: (id: string) => void;
  ajouter: () => void;
}) {
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  if (ls) {
    const pleines = lignes.filter((r) => r.designation.trim() || r.valeur !== null);
    if (!pleines.length) return <p className="text-doux italic mb-3">Aucune ressource</p>;
    return (
      <ul className="mb-3 divide-y divide-filet rounded-xl border border-filet bg-white" aria-label="Ressources">
        {pleines.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <span className="min-w-0 break-words text-encre">
              {r.designation || libelleNature(r.nature)}
              <span className="block text-[13px] text-doux">{libelleNature(r.nature)}</span>
            </span>
            <span className="font-bold tabular-nums whitespace-nowrap">{ariary(r.valeur ?? 0)}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="mb-3" role="group" aria-label="Ressources">
      <ul className="space-y-2.5">
        {lignes.map((r, i) => (
          <li key={r.id} className="bp-ressource rounded-xl border border-filet bg-white p-2.5">
            <div className="flex items-center gap-2">
              <select
                aria-label={`Ressource ${i + 1}, nature`}
                value={r.nature}
                onChange={(e) =>
                  changer(r.id, {
                    nature: e.target.value as Ressource['nature']
                  })
                }
                className="bp-champ min-w-0 flex-1 bg-white"
              >
                {NATURES.map((n) => (
                  <option key={n.v} value={n.v}>
                    {n.t}
                  </option>
                ))}
              </select>
              <Poubelle label={`Supprimer la ressource ${i + 1}`} onClick={() => setASupprimer(r.id)} />
            </div>
            {aSupprimer === r.id ? (
              <Confirmer
                texte={`Supprimer « ${r.designation.trim() || `ressource ${i + 1}`} » ?`}
                oui={() => {
                  setASupprimer(null);
                  supprimer(r.id);
                }}
                non={() => setASupprimer(null)}
              />
            ) : null}
            <input
              type="text"
              className="bp-champ mt-2"
              value={r.designation}
              placeholder={r.nature === 'materiel' ? 'Ex. : vitrine réfrigérée' : r.nature === 'argent' ? 'Ex. : mes économies' : 'Ex. : concours GEW'}
              aria-label={`Ressource ${i + 1}, désignation`}
              onChange={(e) => changer(r.id, { designation: e.target.value })}
            />
            <SaisieMontant valeur={r.valeur} onChange={(v) => changer(r.id, { valeur: v })} label={`Ressource ${i + 1}, valeur`} />
          </li>
        ))}
      </ul>
      <BoutonAjouter texte="Ajouter une ressource" onClick={ajouter} />
    </div>
  );
}

export function Bloc({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-turquoiseClair px-3 py-1 ${className}`}>{children}</div>;
}
