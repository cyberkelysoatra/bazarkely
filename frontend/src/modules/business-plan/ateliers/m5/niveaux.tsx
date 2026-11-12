// NEC-CC-15: three learning levels of module 5 (Rapide, Ciblé, Bases). Texts from the fiche
// ETAPE-08-M5-chiffres-cles.md, section 12 (12.1 targeted explanations, 12.2 to 12.5 level Bases).
// The beignet seller is a fictitious worked example, shown as is. Display only: no computation here
// changes a figure, the formulas only repeat the numbers computed by utils/chiffres.
import { Fragment, useState, type ReactNode } from 'react';
import type { NiveauChiffres, Plan } from '../../types';
import type { Chiffres, CleAlerte } from '../../utils/chiffres';
import { ariary, grouper, pluriel } from '../../utils/format';

export const NIVEAUX: { v: NiveauChiffres; t: string; d: string }[] = [
  {
    v: 'rapide',
    t: 'Je sais déjà faire',
    d: 'Rapide : les résultats seuls, le calcul sur demande.'
  },
  {
    v: 'cible',
    t: "J'ai quelques notions",
    d: 'Ciblé : les pièges à éviter, partie par partie.'
  },
  {
    v: 'bases',
    t: 'Je découvre',
    d: 'Bases : un exemple pas à pas avant chaque partie, puis le calcul avec vos nombres.'
  }
];

export type Partie = '5a' | '5b' | '5c' | '5d';
export type CodePiege = 'MU' | 'FV' | 'SR' | 'FR' | 'CF' | 'CA';

/** 12.1: targeted explanations, one per error code of the pre-test (**x** = bold). */
export const PIEGES: Record<CodePiege, string> = {
  MU: "La marge sur une unité, c'est ce qui te reste quand tu as payé ce qu'elle t'a coûté : prix de vente **moins** coût de cette unité. Elle sert ensuite à payer le loyer et le reste.",
  FV: "Une charge **fixe** tombe chaque mois, même si tu ne vends rien (loyer, salaire, abonnement). Une charge **variable** n'existe que si tu produis (ingrédients, emballage, énergie de chaque unité).",
  SR: "Le seuil, c'est le nombre d'unités à vendre pour payer toutes tes charges fixes : charges fixes **divisées par** la marge d'une unité. Avant ce nombre tu perds, après tu gagnes.",
  CF: 'Tu as bien calculé ce que rapportent les ventes, mais tu as oublié les charges fixes. Résultat = ventes, moins coûts variables, **moins charges fixes**.',
  CA: "Ce que tu encaisses n'est pas ce que tu gagnes : il faut retirer tous les coûts, variables et fixes.",
  FR: "Les machines sont un investissement. Le fonds de roulement, c'est autre chose : l'argent pour payer les dépenses courantes (stock, loyer, salaires) en attendant que les ventes rentrent."
};

/** Codes shown at the top of each part in Ciblé (5a: MU; 5b: FV and SR; 5c: FR; 5d: CF and CA). */
export const PIEGES_PARTIE: Record<Partie, CodePiege[]> = {
  '5a': ['MU'],
  '5b': ['FV', 'SR'],
  '5c': ['FR'],
  '5d': ['CF', 'CA']
};

/** Existing module 5 alert -> matching targeted explanation (Rapide: "Voir l'explication"). */
export const PIEGE_ALERTE: Partial<Record<CleAlerte, CodePiege>> = {
  marge: 'MU',
  seuil: 'SR',
  fonds: 'FR'
};

/** "a **b** c" -> a <strong>b</strong> c */
export function Gras({ texte }: { texte: string }) {
  return <>{texte.split('**').map((morceau, i) => (i % 2 ? <strong key={i}>{morceau}</strong> : <Fragment key={i}>{morceau}</Fragment>))}</>;
}

/** Ciblé: box "Attention au piège" at the top of a part. */
export function Piege({ partie }: { partie: Partie }) {
  return (
    <div className="bp-piege rounded-xl border-2 border-violet bg-violetClair px-3.5 py-3 mb-4">
      <p className="text-[15px] font-bold text-violet mb-1">Attention au piège</p>
      {PIEGES_PARTIE[partie].map((code) => (
        <p key={code} className="text-[15px] leading-snug text-encre mt-1.5">
          <Gras texte={PIEGES[code]} />
        </p>
      ))}
    </div>
  );
}

/** Choice "Mon niveau pour les chiffres": three large buttons, or a small chip with "Changer". */
export function ChoixNiveau({ niveau, choisi, choisir }: { niveau: NiveauChiffres; choisi: boolean; choisir: (v: NiveauChiffres) => void }) {
  const [ouvert, setOuvert] = useState(!choisi);
  const actuel = NIVEAUX.find((n) => n.v === niveau) ?? NIVEAUX[1];
  if (!ouvert) {
    return (
      <div className="bp-niveau-puce mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-violetClair px-3 py-1.5 text-[14px] font-bold text-violet">Mon niveau : {actuel.t}</span>
        <button type="button" onClick={() => setOuvert(true)} className="min-h-[44px] px-3 text-[15px] font-bold text-turquoiseTexte underline">
          Changer
        </button>
      </div>
    );
  }
  return (
    <section className="bp-niveau rounded-2xl border border-filet bg-white p-4 mb-4" aria-label="Mon niveau pour les chiffres">
      <h2 className="text-[19px] font-bold text-violet leading-tight">Mon niveau pour les chiffres</h2>
      <p className="text-[14px] text-doux mt-1 mb-3">Choisissez le niveau indiqué par votre formateur. Vous pouvez le changer à tout moment.</p>
      <div className="flex flex-col gap-2.5">
        {NIVEAUX.map((n) => (
          <button
            key={n.v}
            type="button"
            aria-pressed={n.v === niveau}
            onClick={() => {
              choisir(n.v);
              setOuvert(false);
            }}
            className={`bp-niveau-${n.v} w-full min-h-[60px] rounded-xl border-2 px-4 py-2.5 text-left ${n.v === niveau ? 'border-violet bg-violet text-white' : 'border-violet bg-white text-violet'}`}
          >
            <span className="block text-[17px] font-bold leading-tight">{n.t}</span>
            <span className={`block text-[13px] leading-snug mt-0.5 ${n.v === niveau ? 'text-white' : 'text-doux'}`}>{n.d}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Formula of a computed result: Bases = written under it; Rapide = "Voir le calcul"; Ciblé = as before (nothing). */
export function Calcul({ niveau, texte }: { niveau: NiveauChiffres; texte: string | null }) {
  const [ouvert, setOuvert] = useState(false);
  if (!texte || niveau === 'cible') return null;
  if (niveau === 'bases') return <p className="bp-calcul text-[14px] text-encre leading-snug -mt-1 pb-1.5">{texte}</p>;
  return ouvert ? (
    <p className="bp-calcul text-[14px] text-encre leading-snug -mt-1 pb-1.5">{texte}</p>
  ) : (
    <button type="button" onClick={() => setOuvert(true)} className="bp-voir-calcul -mt-1 mb-1 min-h-[36px] text-[14px] font-bold text-turquoiseTexte underline">
      Voir le calcul
    </button>
  );
}

/** Numbers of the formulas: integers grouped, a 12-month average (example MIANATRA PLUS) with a comma. */
function nb(n: number): string {
  return Number.isInteger(n) ? grouper(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
}
const plus = (valeurs: number[]) => (valeurs.length ? valeurs.map(nb).join(' + ') : '0');
const remplis = (valeurs: (number | null | undefined)[]) => valeurs.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

/** Every formula of module 5, written with the participant's own numbers. */
export function formules(plan: Plan, c: Chiffres, annee: number) {
  const m5 = plan.m5;
  const B = c.prix;
  const lignesCouts = remplis(m5.couts.map((l) => l.montant));
  const cf = m5.chargesFixes;
  const lignesCharges = remplis([cf.loyer, cf.salaires, cf.energie, cf.transport, cf.telephone, cf.autres, ...cf.lignes.map((l) => l.montant)]);
  const lignesInvest = remplis(m5.investissements.map((l) => l.montant));
  const r = m5.ressources;
  const lignesRes = remplis([r.apport, r.subvention, r.pret, r.autre]);
  const a = c.annees[annee];
  const v = m5.annees[annee]?.ventesParMois;
  const u = (n: number) => pluriel(plan.uniteVente, n);
  return {
    cout: lignesCouts.length ? `Coût d'une unité (A) = ${plus(lignesCouts)} = ${ariary(c.coutUnitaire)}` : null,
    marge: B !== null && c.marge !== null ? `Marge = ${nb(B)} moins ${nb(c.coutUnitaire)} = ${ariary(c.marge)}` : null,
    taux: B !== null && c.marge !== null && c.tauxMarge !== null ? `Taux de marge = ${nb(c.marge)} ÷ ${nb(B)} × 100 = ${c.tauxMarge} %` : null,
    charges: lignesCharges.length ? `Charges fixes (C) = ${plus(lignesCharges)} = ${ariary(c.chargesFixes)}` : null,
    seuil:
      c.seuilMois !== null && c.marge !== null && c.chargesFixes > 0
        ? `Seuil = charges fixes ÷ marge d'une unité = ${nb(c.chargesFixes)} ÷ ${nb(c.marge)} = ${nb(Math.round((c.chargesFixes / c.marge) * 100) / 100)}, arrondi au-dessus : ${grouper(c.seuilMois)} ${u(c.seuilMois)} par mois${
            c.seuilJour !== null ? ` ; ${grouper(c.seuilMois)} ÷ ${m5.joursParMois} jours = ${grouper(c.seuilJour)} par jour (arrondi au-dessus)` : ''
          }`
        : null,
    investissements: lignesInvest.length ? `Investissements = ${plus(lignesInvest)} = ${ariary(c.investissements)}` : null,
    fonds: `Fonds de roulement proposé = 3 × ${nb(c.chargesFixes)} + ${nb(c.stock)} = ${ariary(c.fondsPropose)}${c.fondsRetenu !== c.fondsPropose ? ` ; vous avez retenu ${ariary(c.fondsRetenu)}` : ''}`,
    besoins: `Besoins = investissements + fonds de roulement = ${nb(c.investissements)} + ${nb(c.fondsRetenu)} = ${ariary(c.besoins)}`,
    ressources: lignesRes.length ? `Ressources = ${plus(lignesRes)} = ${ariary(c.ressources)}` : null,
    ecart: `Écart = ${nb(c.ressources)} moins ${nb(c.besoins)} = ${ariary(c.ecart)}`,
    quantites: a && typeof v === 'number' ? `Quantités = ${nb(v)} par mois × 12 mois = ${grouper(a.quantites)}` : null,
    ca: a && B !== null ? `Chiffre d'affaires = ${grouper(a.quantites)} × ${nb(B)} = ${ariary(a.ca)}` : null,
    cv: a ? `Coûts variables = ${grouper(a.quantites)} × ${nb(c.coutUnitaire)} = ${ariary(a.cv)}` : null,
    margeTotale: a ? `Marge totale = ${nb(a.ca)} moins ${nb(a.cv)} = ${ariary(a.marge)}` : null,
    chargesAnnee: a ? `Charges fixes de l'année = ${nb(a.chargesFixesMois)} × 12 mois = ${ariary(a.chargesAnnee)}` : null,
    resultat: a ? `Résultat = ${nb(a.marge)} moins ${nb(a.chargesAnnee)} = ${ariary(a.resultat)}` : null
  };
}

/** One explanation screen of level Bases: a title, and pieces shown one per tap. */
interface Ecran {
  titre: string;
  morceaux: ReactNode[];
}

function Barre({ sur, de }: { sur: number; de: number }) {
  return (
    <div className="bp-barre mt-2 h-4 rounded-full bg-white border border-violet overflow-hidden" aria-hidden="true">
      <div className="h-full bg-turquoise transition-[width] duration-500" style={{ width: `${Math.min(100, (sur / de) * 100)}%` }} />
    </div>
  );
}

function Piece() {
  // A 200 Ar coin cut in two parts: 120 Ar back to the ingredients, 80 Ar left (the margin).
  return (
    <svg viewBox="0 0 120 120" width="96" height="96" className="bp-piece my-2" role="img" aria-label="Une pièce de 200 Ar coupée en deux parts : 120 Ar et 80 Ar">
      <path d="M60 60 L60 6 A54 54 0 1 1 28.3 103.7 Z" fill="#e5e7eb" stroke="#6b7280" strokeWidth="2" />
      <path d="M60 60 L28.3 103.7 A54 54 0 0 1 60 6 Z" fill="#2dd4bf" stroke="#0f766e" strokeWidth="2" transform="translate(-4 0)" />
      <text x="84" y="66" fontSize="15" fontWeight="bold" fill="#374151" textAnchor="middle">
        120
      </text>
      <text x="30" y="58" fontSize="15" fontWeight="bold" fill="#134e4a" textAnchor="middle">
        80
      </text>
    </svg>
  );
}

/** Screens of level Bases for a part (12.2 to 12.5); 5d ends with the participant's own staircase. */
export function ecransBases(partie: Partie, plan: Plan, c: Chiffres): Ecran[] {
  if (partie === '5a') {
    return [
      {
        titre: 'Un seul beignet',
        morceaux: ["Pour faire un beignet, la vendeuse dépense : farine 50 Ar, sucre et coco 30 Ar, huile 30 Ar, charbon 10 Ar. Total : 120 Ar. C'est son **prix de revient**."]
      },
      {
        titre: 'La pièce coupée en deux',
        morceaux: [<Piece key="p" />, 'Elle vend 200 Ar.', '120 Ar repartent payer les ingrédients,', "80 Ar lui restent : c'est sa **marge**."]
      },
      {
        titre: 'À toi',
        morceaux: ["Une ligne par ingrédient ou fourniture : l'app additionne. Puis ton prix de vente : la marge s'affiche avec la formule et tes nombres."]
      }
    ];
  }
  if (partie === '5b') {
    return [
      {
        titre: 'Ce qui tombe même sans vendre',
        morceaux: [
          "Le loyer de son petit local, 40 000 Ar par mois, elle le paie même un jour de pluie sans client : c'est une charge **fixe**. La farine, elle n'en achète que si elle fait des beignets : c'est **variable**."
        ]
      },
      {
        titre: 'Combien de beignets pour payer le loyer ?',
        morceaux: [
          'Chaque beignet laisse 80 Ar.',
          '40 000 ÷ 80 = 500 beignets par mois.',
          "Jusqu'au 500e, elle paie son loyer ; à partir du 501e, elle gagne. C'est son **seuil de rentabilité**."
        ]
      },
      {
        titre: 'À toi',
        morceaux: [
          'Pour chaque charge du mois, pose-toi la question : « Tu la paies même si tu ne vends rien ? » Oui : elle va ici, dans les charges fixes. Non : elle va dans ce que coûte une unité (5a).'
        ]
      }
    ];
  }
  if (partie === '5c') {
    return [
      {
        titre: 'Avant le premier client',
        morceaux: [
          "Le jour de l'ouverture, elle a déjà acheté une marmite et un étal : ce sont des **investissements**, achetés une fois. Elle a aussi acheté la farine et payé le loyer avant d'avoir vendu un seul beignet : cet argent qui attend les ventes, c'est le **fonds de roulement**."
        ]
      },
      {
        titre: 'Pourquoi 3 mois',
        morceaux: [
          "Les premiers mois, les clients arrivent doucement, mais le loyer tombe dès le premier mois. Trois mois de charges fixes plus le stock de départ, c'est le carburant pour tenir."
        ]
      },
      {
        titre: "D'où vient l'argent",
        morceaux: ['Épargne, famille, subvention : le total des sources doit égaler le total des besoins.']
      }
    ];
  }
  // 5d: the staircase of the seller's month, one step per tap, then the participant's own month.
  const v = plan.m5.annees[0]?.ventesParMois;
  const B = c.prix;
  const A = c.coutUnitaire;
  const C = c.chargesFixes;
  const u = (n: number) => pluriel(plan.uniteVente || 'unité', n);
  const sien: Ecran =
    typeof v === 'number' && B !== null
      ? {
          titre: 'Ton escalier du mois (année 1)',
          morceaux: [
            `Ventes : ${nb(v)} ${u(v)} × ${nb(B)} Ar = ${ariary(v * B)}`,
            `Moins coûts variables : ${nb(v)} × ${nb(A)} Ar = ${ariary(v * A)}`,
            `Il reste ${ariary(v * B - v * A)}`,
            `Moins charges fixes : ${ariary(C)}`,
            `**Résultat avant amortissements : ${ariary(v * B - v * A - C)}**`
          ]
        }
      : {
          titre: 'Ton escalier du mois (année 1)',
          morceaux: ["Indique tes ventes par mois de l'année 1 ci-dessous (et ton prix en 5a) : l'app remplit ton escalier avec tes pages 5a à 5c."]
        };
  return [
    {
      titre: "L'escalier du mois de la vendeuse",
      morceaux: [
        'Ventes : 600 beignets × 200 Ar = 120 000 Ar',
        'Moins coûts variables : 600 × 120 Ar = 72 000 Ar',
        'Il reste 48 000 Ar',
        'Moins charges fixes : 40 000 Ar',
        '**Résultat avant amortissements : 8 000 Ar**',
        "« 600 beignets, c'est à peine plus que le seuil de 500 : c'est pour ça que le résultat est petit. »"
      ]
    },
    sien
  ];
}

/** Position in the explanation screens of a part: screen index, pieces shown on that screen. */
export interface Position {
  ecran: number;
  morceaux: number;
}
export const DEBUT: Position = { ecran: 0, morceaux: 1 };

/** Next position (null = screens finished, the part itself is shown). */
export function suivante(ecrans: Ecran[], p: Position): Position | null {
  const e = ecrans[p.ecran];
  if (e && p.morceaux < e.morceaux.length) return { ecran: p.ecran, morceaux: p.morceaux + 1 };
  if (p.ecran + 1 < ecrans.length) return { ecran: p.ecran + 1, morceaux: 1 };
  return null;
}

/** Level Bases: the current explanation screen of a part, with "Continuer" and "J'ai compris, voir ma page". */
export function EcranBases({ ecrans, position, continuer, passer }: { ecrans: Ecran[]; position: Position; continuer: () => void; passer: () => void }) {
  const e = ecrans[position.ecran];
  if (!e) return null;
  const escalier = e.titre.startsWith("L'escalier") || e.titre.startsWith('Ton escalier');
  const seuil500 = e.titre.startsWith('Combien de beignets');
  return (
    <div className="bp-bases rounded-xl bg-violetClair px-3.5 py-3 mb-2">
      <p className="text-[13px] text-doux">
        Explication {position.ecran + 1} sur {ecrans.length}
      </p>
      <p className="text-[17px] font-bold text-violet leading-tight mt-0.5 mb-1.5">{e.titre}</p>
      <div className={escalier ? 'space-y-1' : 'space-y-1.5'}>
        {e.morceaux.slice(0, position.morceaux).map((m, i) => (
          <div key={i} className="text-[16px] leading-snug text-encre" style={escalier ? { paddingLeft: `${Math.min(i, 4) * 10}px` } : undefined}>
            {typeof m === 'string' ? <Gras texte={m} /> : m}
          </div>
        ))}
      </div>
      {seuil500 ? <Barre sur={position.morceaux >= 2 ? 500 : 0} de={500} /> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={continuer} className="bp-continuer min-h-[48px] px-5 rounded-xl bg-violet text-white text-[16px] font-bold active:opacity-90">
          Continuer
        </button>
        <button type="button" onClick={passer} className="bp-passer min-h-[48px] px-3 rounded-xl text-[15px] font-bold text-turquoiseTexte underline">
          J'ai compris, voir ma page
        </button>
      </div>
    </div>
  );
}
