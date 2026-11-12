// Content of the PDF "Mon business plan", as plain data (no jsPDF here, unit tested): the one-page
// summary (resumePdf), then every section in workbook order, module 5 as tables, then what is left
// (resteAFaire). NEC-CC-19: an empty answer is omitted, never printed as "(non rempli)"; an empty table
// row, table, sub-title or section is dropped. Telephone and e-mail only on the cover (see pdf.ts).
import type { Plan } from '../types';
import { calculer, phraseSeuil } from '../utils/chiffres';
import { ariary, grouper, pluriel, pourcent } from '../utils/format';
import { BLOCS, jourFr } from '../ateliers/m2/blocs';
import { calculerMarche } from '../ateliers/m3/calculs';
import { textePhrase } from '../ateliers/m1/phrase';
import { CARTES, brouillon, chiffresCles } from '../ateliers/synthese/brouillons';
import { POINTS } from '../ateliers/relecture/points';
import { CALENDRIER_NEC, NB_ACTIONS } from '../ateliers/apres/calendrier';
import { RUBRIQUES, type IdRubrique } from '../rubriques/registre';
import { etapesDuPlan, NB_ETAPES_COMPTEES } from '../etat/journee';
import { impactDe, missionDe, pitchDe } from '../etat/vide';
import { MARGE, trame } from '../ateliers/pitch/trame';
import { questionsPieges } from '../ateliers/pitch/questions';
import { PREMIERE_ANNEE, totaux } from '../ateliers/impact/regles';
import { DECISIONS, entretienFait, nbEntretiens, nbPrix } from '../ateliers/mission/regles';

export const NON_REMPLI = '(non rempli)';

export type Bloc =
  | { type: 'sousTitre'; texte: string }
  | { type: 'champ'; label: string; valeur: string }
  | { type: 'texte'; texte: string }
  | { type: 'tableau'; entetes: string[]; lignes: string[][]; largeurs: number[]; total?: boolean };

export interface Section {
  titre: string;
  blocs: Bloc[];
}

const v = (s: string | null | undefined) => (s && s.trim() ? s.trim() : NON_REMPLI);
const montant = (n: number | null | undefined) => (n === null || n === undefined ? NON_REMPLI : ariary(n));
/** A computed sum: 0 means nothing was typed (NEC-CC-19: omitted). */
const somme = (n: number) => (n ? ariary(n) : NON_REMPLI);
const champ = (label: string, valeur: string | null | undefined): Bloc => ({ type: 'champ', label, valeur: v(valeur) });
const st = (texte: string): Bloc => ({ type: 'sousTitre', texte });
const titreDe = (id: IdRubrique) => RUBRIQUES.find((r) => r.id === id)?.titre ?? id;

const SECTEURS: Record<string, string> = {
  agriculture: 'Agriculture',
  'economie-bleue': 'Économie bleue',
  tourisme: 'Tourisme',
  energie: 'Énergie',
  numerique: 'Numérique',
  education: 'Éducation',
  environnement: 'Environnement et recyclage',
  autre: 'Autre'
};
const AVANCEMENT: Record<string, string> = { idee: "C'est une idée", essais: 'Premiers essais', clients: 'Déjà des clients', activite: 'Déjà une activité' };
const TEMPS: Record<string, string> = { plein: 'Temps plein', partiel: 'Temps partiel', benevole: 'Bénévole' };
const PERIODES: Record<string, string> = { t1: 'Mois 1 à 3', t2: 'Mois 4 à 6', t3: 'Mois 7 à 9', t4: 'Mois 10 à 12' };
const DEMARCHES: Record<string, string> = {
  statuts: 'Statuts',
  nif: 'NIF',
  stat: 'STAT',
  rcs: 'Registre du commerce',
  carteFiscale: 'Carte fiscale',
  compte: 'Compte bancaire ou mobile money professionnel',
  cnaps: 'CNaPS (si salariés)'
};

export function secteur(plan: Plan): string {
  const i = plan.identite;
  return i.secteur === 'autre' ? i.secteurAutre.trim() || 'Autre' : SECTEURS[i.secteur] ?? '';
}

function jour(iso: string): string {
  return jourFr(iso) || iso;
}

function synthese(plan: Plan): Section {
  const k = chiffresCles(plan);
  return {
    titre: 'Synthèse : le résumé de mon business plan',
    blocs: [
      ...CARTES.map((c) => champ(`${c.n}. ${c.titre}`, plan.synthese[c.cle])),
      st('Mes chiffres clés (calculés)'),
      {
        type: 'tableau',
        entetes: ['Chiffre', 'Montant'],
        largeurs: [0.6, 0.4],
        lignes: [
          ['Besoin total', montant(k.besoinTotal)],
          ['Financement demandé (subvention, prêt, autre)', montant(k.financementDemande)],
          ["Chiffre d'affaires année 1", montant(k.caAnnee1)],
          ['Seuil de rentabilité', k.seuilMois === null ? NON_REMPLI : `${grouper(k.seuilMois)} ${pluriel(plan.uniteVente, k.seuilMois)} par mois`]
        ]
      }
    ]
  };
}

function identite(plan: Plan): Section {
  const i = plan.identite;
  return {
    titre: titreDe('identite'),
    blocs: [
      champ('Nom et prénom', i.nomPrenom),
      champ('Nom du projet', i.nomProjet),
      champ('Secteur', secteur(plan)),
      champ('Lieu', i.lieu),
      champ('Mon projet en une phrase', i.unePhrase),
      champ('Où en est le projet ?', AVANCEMENT[i.avancement]),
      champ('Porteurs du projet et rôles', i.porteurs),
      champ("Ce que j'attends de ces deux jours", i.attentes)
    ]
  };
}

function m1(plan: Plan): Section {
  const m = plan.m1;
  const c = m.client;
  const pv = m.pv;
  const complete = [pv.pour, pv.qui, pv.propose, pv.quiBenefice, pv.contrairement].every((x) => x.trim());
  return {
    titre: titreDe('m1'),
    blocs: [
      st('1a. Mon arbre à problèmes'),
      champ('Conséquences (les branches)', m.consequences),
      champ('Problème central', m.probleme),
      champ('Causes (les racines)', m.causes),
      st('1b. Mon client cible'),
      champ('Qui est-il ?', c.qui),
      champ('Où se trouve-t-il ?', c.ou),
      champ('Combien sont-ils ?', c.combien),
      champ("Que fait-il ou qu'achète-t-il aujourd'hui pour régler ce problème ?", c.aujourdhui),
      champ("Combien paie-t-il aujourd'hui ?", c.prixAujourdhui),
      champ("Qui décide de l'achat ? Qui paie ?", c.decideur),
      st('1c. Ma proposition de valeur'),
      champ('Ma phrase', complete && plan.identite.nomProjet.trim() ? textePhrase(plan) : ''),
      champ('Pour (le client)', pv.pour),
      champ('qui (le problème ou le besoin)', pv.qui),
      champ('propose (la solution)', pv.propose),
      champ('qui (le bénéfice principal)', pv.quiBenefice),
      champ("contrairement à (ce qu'il utilise aujourd'hui)", pv.contrairement),
      st('1d. Pourquoi moi ?'),
      champ('Mes atouts pour réussir ce projet', m.pourquoiMoi)
    ]
  };
}

function m2(plan: Plan): Section {
  return {
    titre: titreDe('m2'),
    blocs: [champ('Version du', jour(plan.m2.versionDu)), ...BLOCS.map((b) => champ(`${b.n}. ${b.titre}`, plan.m2[b.cle]))]
  };
}

function m3(plan: Plan): Section {
  const m = plan.m3;
  const r = calculerMarche(m);
  const u = (n: number) => pluriel(plan.uniteVente, n);
  const nombre = (n: number | null, suffixe = '') => (n === null ? NON_REMPLI : `${grouper(n)}${suffixe}`);
  const concurrents = m.concurrents.filter((c) => c.nom.trim() || c.forts.trim() || c.faibles.trim());
  return {
    titre: titreDe('m3'),
    blocs: [
      st('3a. Taille de mon marché'),
      champ('Mon unité de vente', plan.uniteVente),
      {
        type: 'tableau',
        entetes: ['Élément', 'Mon estimation', "D'où vient ce chiffre ?"],
        largeurs: [0.34, 0.22, 0.44],
        lignes: [
          ['Nombre de clients possibles', nombre(m.nbClients), v(m.nbClientsSource)],
          ['Quantité achetée par client et par achat', nombre(m.qteParAchat), v(m.qteSource)],
          ["Nombre d'achats par mois", nombre(m.achatsParMois), v(m.achatsSource)]
        ]
      },
      {
        type: 'tableau',
        entetes: ['Résultat', 'Valeur'],
        largeurs: [0.6, 0.4],
        lignes: [
          ['Marché potentiel par mois (en quantité)', r.potentielMois === null ? NON_REMPLI : `${grouper(r.potentielMois)} ${u(r.potentielMois)}`],
          ['Prix de vente unitaire prévu', montant(m.prixPrevu)],
          ['Marché potentiel par mois (en ariary)', montant(r.potentielAr)],
          ['Part que je vise en année 1', m.partVisee === null ? NON_REMPLI : pourcent(m.partVisee)],
          ['Mes ventes visées par mois', r.ventesMois === null ? NON_REMPLI : `${grouper(r.ventesMois)} ${u(r.ventesMois)}`],
          ['Mes ventes visées par an', r.ventesAn === null ? NON_REMPLI : `${grouper(r.ventesAn)} ${u(r.ventesAn)}`],
          ['Mes ventes visées par an, en ariary', montant(r.ventesAnAr)]
        ]
      },
      st('3b. Mes concurrents'),
      ...(concurrents.length
        ? concurrents.flatMap((c, i): Bloc[] => [
            { type: 'texte', texte: `Concurrent ${i + 1}${c.nom.trim() ? ` : ${c.nom.trim()}` : ''}${c.type ? ` (${c.type === 'direct' ? 'direct' : 'indirect'})` : ''}` },
            champ('Prix', c.prix),
            champ('Ses points forts', c.forts),
            champ('Ses points faibles', c.faibles),
            champ('Ce que je fais mieux', c.mieux)
          ])
        : [champ('Concurrents', '')]),
      st('3c. Ma SWOT'),
      champ('Forces (internes, positives)', m.swot.forces),
      champ('Faiblesses (internes, négatives)', m.swot.faiblesses),
      champ('Opportunités (externes, positives)', m.swot.opportunites),
      champ('Menaces (externes, négatives)', m.swot.menaces)
    ]
  };
}

function m4(plan: Plan): Section {
  const m = plan.m4;
  const equipe = m.equipe.filter((e) => e.personne.trim() || e.role.trim());
  return {
    titre: titreDe('m4'),
    blocs: [
      st('4a. Mes 4 P'),
      champ('Produit', m.produit),
      champ('Prix', m.prix),
      champ('Place (distribution)', m.place),
      champ('Promotion (et budget)', m.promotion),
      st('4b. Mes moyens et mon équipe'),
      champ('Étapes de ma production ou de mon service', m.etapes),
      equipe.length
        ? { type: 'tableau', entetes: ['Personne', 'Rôle', 'Compétences', 'Temps'], largeurs: [0.24, 0.24, 0.34, 0.18], lignes: equipe.map((e) => [v(e.personne), v(e.role), v(e.competences), TEMPS[e.temps] ?? NON_REMPLI]) }
        : champ('Mon équipe', ''),
      champ('Mes fournisseurs et partenaires principaux', m.fournisseurs),
      st('4c. Mon calendrier des 12 premiers mois'),
      {
        type: 'tableau',
        entetes: ['Période', 'Étape ou objectif SMART', 'Responsable'],
        largeurs: [0.2, 0.52, 0.28],
        lignes: (['t1', 't2', 't3', 't4'] as const).map((p) => {
          const c = m.calendrier.find((x) => x.periode === p);
          return [PERIODES[p], v(c?.objectif), v(c?.responsable)];
        })
      },
      st('4d. Ma formalisation'),
      champ('Forme juridique choisie', m.forme),
      champ('Pourquoi ce choix ?', m.formePourquoi),
      {
        type: 'tableau',
        entetes: ['Démarche', 'Déjà fait ?', 'Date prévue'],
        largeurs: [0.5, 0.2, 0.3],
        lignes: Object.keys(DEMARCHES).map((id) => {
          const d = m.demarches.find((x) => x.id === id);
          // "Non" without a date is the untouched default of a participant's plan (NEC-CC-19: row omitted).
          return [DEMARCHES[id], d?.fait ? 'Oui' : d?.datePrevue || plan.exemple ? 'Non' : NON_REMPLI, d?.fait ? '' : d?.datePrevue ? jour(d.datePrevue) : NON_REMPLI];
        })
      }
    ]
  };
}

function lignesMontants(lignes: { libelle: string; montant: number | null }[]): string[][] {
  const pleines = lignes.filter((l) => l.libelle.trim() || l.montant !== null);
  return pleines.length ? pleines.map((l) => [v(l.libelle), montant(l.montant)]) : [[NON_REMPLI, '']];
}

function m5(plan: Plan): Section {
  const m = plan.m5;
  const c = calculer(plan);
  const cf = m.chargesFixes;
  const r = m.ressources;
  const seuil = phraseSeuil(plan, c);
  const an = (i: number) => c.annees[i];
  const cel = (i: number, f: (a: NonNullable<(typeof c.annees)[number]>) => number | null) => {
    const a = an(i);
    if (!a) return NON_REMPLI;
    const x = f(a);
    return x === null ? NON_REMPLI : ariary(x);
  };
  const ventes = (i: number) => {
    const x = m.annees[i]?.ventesParMois;
    return x === null || x === undefined ? NON_REMPLI : grouper(x);
  };
  return {
    titre: titreDe('m5'),
    blocs: [
      st('5a. Mon unité de vente et ma marge'),
      champ('Mon unité de vente', plan.uniteVente),
      { type: 'tableau', entetes: ['Ce que coûte UNE unité', 'Montant'], largeurs: [0.65, 0.35], lignes: lignesMontants(m.couts) },
      {
        type: 'tableau',
        entetes: ['Résultat', 'Montant'],
        largeurs: [0.65, 0.35],
        total: true,
        lignes: [
          ['Coût variable unitaire (A)', somme(c.coutUnitaire)],
          ['Prix de vente (B)', montant(c.prix)],
          ['Marge unitaire (B moins A)', montant(c.marge)],
          ['Taux de marge', c.tauxMarge === null ? NON_REMPLI : pourcent(c.tauxMarge)]
        ]
      },
      st('5b. Mes charges fixes par mois'),
      {
        type: 'tableau',
        entetes: ['Charge', 'Par mois'],
        largeurs: [0.65, 0.35],
        total: true,
        lignes: [
          ['Loyer', montant(cf.loyer)],
          ['Salaires et charges', montant(cf.salaires)],
          ['Électricité et eau', montant(cf.energie)],
          ['Transport', montant(cf.transport)],
          ['Téléphone et internet', montant(cf.telephone)],
          ['Autres', montant(cf.autres)],
          ...cf.lignes.filter((l) => l.libelle.trim() || l.montant !== null).map((l) => [v(l.libelle), montant(l.montant)]),
          ['Total des charges fixes (C)', somme(c.chargesFixes)]
        ]
      },
      champ('Jours de travail par mois', c.chargesFixes > 0 ? String(m.joursParMois) : ''),
      champ('Mon seuil de rentabilité', seuil ?? ''),
      st('5c. Mon démarrage'),
      { type: 'tableau', entetes: ['Investissements', 'Montant'], largeurs: [0.65, 0.35], lignes: [...lignesMontants(m.investissements), ['Total des investissements', somme(c.investissements)]], total: true },
      {
        type: 'tableau',
        entetes: ['Besoins', 'Montant'],
        largeurs: [0.65, 0.35],
        total: true,
        lignes: [
          ['Investissements', somme(c.investissements)],
          ['Stock de départ (inclus dans le fonds de roulement)', montant(m.stockDepart)],
          ['Fonds de roulement', somme(c.fondsRetenu)],
          ['Total des besoins', somme(c.besoins)]
        ]
      },
      {
        type: 'tableau',
        entetes: ['Ressources', 'Montant'],
        largeurs: [0.65, 0.35],
        total: true,
        lignes: [
          ['Apport personnel', montant(r.apport)],
          ['Subvention visée', montant(r.subvention)],
          ['Prêt familial ou microfinance', montant(r.pret)],
          [r.autreLibelle.trim() || 'Autre ressource', montant(r.autre)],
          ['Total des ressources', somme(c.ressources)]
        ]
      },
      champ('Écart (ressources moins besoins)', !c.besoins && !c.ressources ? '' : c.ecart === 0 ? '0 Ar : équilibré' : ariary(c.ecart)),
      st('5d. Mes résultats sur 3 ans'),
      {
        type: 'tableau',
        entetes: ['', 'Année 1', 'Année 2', 'Année 3'],
        largeurs: [0.31, 0.23, 0.23, 0.23],
        lignes: [
          [`Ventes par mois${plan.uniteVente.trim() ? ` (${pluriel(plan.uniteVente, 2)})` : ''}`, ventes(0), ventes(1), ventes(2)],
          ['Quantités vendues dans l’année', ...[0, 1, 2].map((i) => (an(i) ? grouper(an(i)!.quantites) : NON_REMPLI))],
          ["Chiffre d'affaires", ...[0, 1, 2].map((i) => cel(i, (a) => a.ca))],
          ['Coûts variables', ...[0, 1, 2].map((i) => cel(i, (a) => a.cv))],
          ['Marge totale', ...[0, 1, 2].map((i) => cel(i, (a) => a.marge))],
          ["Charges fixes de l'année", ...[0, 1, 2].map((i) => cel(i, (a) => a.chargesAnnee))],
          ['Résultat avant amortissements et avant impôt', ...[0, 1, 2].map((i) => cel(i, (a) => a.resultat))],
          ...(m.tauxImpot !== null
            ? [
                [`Impôt (${grouper(m.tauxImpot)} %)`, ...[0, 1, 2].map((i) => cel(i, (a) => a.impot))],
                ['Résultat net', ...[0, 1, 2].map((i) => cel(i, (a) => a.net))]
              ]
            : [])
        ]
      },
      st('5e. Mes hypothèses'),
      champ('Mes hypothèses', m.hypotheses),
      st('5f. Mes risques'),
      {
        type: 'tableau',
        entetes: ['Risque', 'Ce que je ferai'],
        largeurs: [0.5, 0.5],
        lignes: m.risques.filter((x) => x.risque.trim() || x.reponse.trim()).length
          ? m.risques.filter((x) => x.risque.trim() || x.reponse.trim()).map((x) => [v(x.risque), v(x.reponse)])
          : [[NON_REMPLI, NON_REMPLI]]
      }
    ]
  };
}

function relecture(plan: Plan): Section {
  const rep = (x: string | undefined) => (x === 'oui' ? 'Oui' : x === 'revoir' ? 'À revoir' : NON_REMPLI);
  return {
    titre: titreDe('relecture'),
    blocs: [
      { type: 'tableau', entetes: ['Point vérifié', 'Réponse'], largeurs: [0.75, 0.25], lignes: POINTS.map((p) => [p.texte, rep(plan.relecture.points[p.id])]) },
      champ('La question de mon binôme', plan.relecture.questionBinome)
    ]
  };
}

function apres(plan: Plan): Section {
  return {
    titre: titreDe('apres'),
    blocs: [
      { type: 'tableau', entetes: ['Date', 'Étape'], largeurs: [0.3, 0.7], lignes: CALENDRIER_NEC.map((c) => [c.date, c.etape]) },
      st('Mes trois prochaines actions'),
      {
        type: 'tableau',
        entetes: ['', 'Action', 'Pour quand ?'],
        largeurs: [0.06, 0.64, 0.3],
        lignes: Array.from({ length: NB_ACTIONS }, (_, i) => [`${i + 1}.`, v(plan.actions[i]?.action), v(plan.actions[i]?.quand)])
      }
    ]
  };
}

function prix(plan: Plan): Section {
  const lignes = plan.prix.filter((l) => l.element.trim() || l.prix !== null);
  return {
    titre: titreDe('prix'),
    blocs: [
      {
        type: 'tableau',
        entetes: ['Élément', 'Unité', 'Prix', 'Où, qui ?'],
        largeurs: [0.28, 0.16, 0.2, 0.36],
        lignes: lignes.length ? lignes.map((l) => [v(l.element), v(l.unite), montant(l.prix), v(l.ou)]) : [[NON_REMPLI, '', '', '']]
      }
    ]
  };
}

function notes(plan: Plan): Section {
  return { titre: titreDe('notes'), blocs: [champ('Mes notes', plan.notes)] };
}

const TEMPS_EMPLOI: Record<string, string> = { plein: 'Temps plein', partiel: 'Temps partiel' };

function environnement(trace: string | undefined, reduction: string | undefined): Bloc[] {
  const lignes: Bloc[] = [];
  if (trace?.trim()) lignes.push(champ("Ce qu'il abîme", trace));
  if (reduction?.trim()) lignes.push(champ('Ce que je fais pour la réduire', reduction));
  return lignes.length ? [st("Mon projet et l'environnement"), ...lignes] : [];
}

function impact(plan: Plan): Section {
  const im = impactDe(plan);
  const t = totaux(im);
  const payes = im.emplois.filter((e) => e.statut !== 'benevole' && e.role.trim());
  const benevoles = im.emplois.filter((e) => e.statut === 'benevole' && e.role.trim());
  const nombre = (n: number | null) => (n === null ? NON_REMPLI : grouper(n));
  const partenaires = im.partenaires.filter((p) => p.nom.trim()).map((p) => `${p.nom.trim()}${p.local ? ' (local)' : ''}`);
  return {
    titre: titreDe('impact'),
    blocs: [
      st('Mes emplois en chiffres'),
      ...(t.some((n) => n > 0) ? t : []).map((n, k): Bloc => ({ type: 'texte', texte: `Année ${k + 1} (${PREMIERE_ANNEE + k}) : ${'•'.repeat(Math.min(n, 30))}${n ? ' ' : ''}${n} personne${n > 1 ? 's' : ''} payée${n > 1 ? 's' : ''}` })),
      champ("Ma phrase d'impact", im.phrase),
      st('6a. Mes emplois'),
      {
        type: 'tableau',
        entetes: ['Personne payée', 'Année 1', 'Année 2', 'Année 3'],
        largeurs: [0.4, 0.2, 0.2, 0.2],
        lignes: [
          ...payes.map((e) => [`${e.role.trim()}${e.statut === 'moi' ? " (j'en vis)" : e.statut === 'salarie' ? ' (salarié)' : ''}`, ...e.annees.map((a) => TEMPS_EMPLOI[a] ?? '')]),
          ['Total des personnes payées', ...t.map(String)]
        ],
        total: true
      },
      champ('Bénévoles (non comptés)', benevoles.map((e) => e.role.trim()).join(', ')),
      champ('Dont femmes, en année 1', nombre(im.femmes)),
      champ('Dont jeunes de moins de 35 ans, en année 1', nombre(im.jeunes)),
      st('6b. Qui en profite'),
      champ('Clients servis par mois en année 1', nombre(im.clientsMois)),
      champ('Fournisseurs et partenaires locaux payés', partenaires.join(', ')),
      champ('Autre effet positif', im.autreEffet),
      // NEC-CC-17: omitted when both lines are empty, each empty line omitted.
      ...environnement(im.envTrace, im.envReduction)
    ]
  };
}

function mission(plan: Plan): Section {
  const m = missionDe(plan);
  const faits = m.entretiens.filter(entretienFait);
  const premier = faits.map((e) => e.date).sort()[0] ?? m.debut ?? '';
  const date = premier ? jour(premier.slice(0, 10)) : '';
  const decision = DECISIONS.find((d) => d.v === m.decision);
  const comparaison = (c: string) => (c === 'pareil' ? 'Pareil' : c === 'different' ? 'Différent' : NON_REMPLI);
  return {
    titre: titreDe('mission'),
    blocs: [
      st('Vérifié sur le terrain'),
      {
        type: 'tableau',
        entetes: ['Preuve', 'Valeur'],
        largeurs: [0.6, 0.4],
        lignes: [
          ['Clients interrogés', nbEntretiens(plan) || plan.exemple ? String(nbEntretiens(plan)) : NON_REMPLI],
          ['Prix relevés', nbPrix(plan) || plan.exemple ? String(nbPrix(plan)) : NON_REMPLI],
          ['Date', v(date)]
        ]
      },
      champ("La phrase qui m'a le plus surpris", m.appris.surprise),
      st('Mes entretiens (aucun nom, aucun numéro)'),
      faits.length
        ? {
            type: 'tableau',
            entetes: ['Type de client', "Ce qu'il utilise aujourd'hui", 'Il paie', "Ce qu'il a dit"],
            largeurs: [0.22, 0.3, 0.16, 0.32],
            lignes: faits.map((e) => [v(e.typeClient), v(e.aujourdhui), montant(e.paie), v(e.phrase)])
          }
        : champ('Entretiens', ''),
      st("7a. Ce que j'ai appris"),
      {
        type: 'tableau',
        entetes: ['Point comparé', 'Pareil ou différent ?'],
        largeurs: [0.6, 0.4],
        lignes: [
          ["Ce qu'il fait aujourd'hui", comparaison(m.appris.aujourdhui)],
          ['Combien il paie', comparaison(m.appris.paie)],
          ["Ce qui l'embête", comparaison(m.appris.embete)]
        ]
      },
      st('7b. Mon point de décision'),
      champ('Ma décision', decision ? `${decision.t} : ${decision.detail}` : '')
    ]
  };
}

/** NEC-CC-14: the pitch frame (keywords) and the answers to the 3 trap questions. */
function pitch(plan: Plan): Section {
  const r = pitchDe(plan).reponses;
  return {
    titre: titreDe('pitch'),
    blocs: [
      st('Ma trame (mots-clés, pas de texte à lire)'),
      {
        type: 'tableau',
        entetes: ['Temps', 'Durée', 'Mots-clés'],
        largeurs: [0.36, 0.12, 0.52],
        lignes: [...trame(plan).map((t) => [`${t.n}. ${t.titre}`, t.mots.trim() ? `${t.duree} s` : '', v(t.mots)]), ['Marge', trame(plan).some((t) => t.mots.trim()) ? `${MARGE} s` : '', '']]
      },
      st('Les 3 questions pièges du jury'),
      ...questionsPieges(plan).map((q, i) => champ(`${i + 1}. ${q.texte}`, r[q.id]))
    ]
  };
}

/** Kept for the code importing it; never printed since NEC-CC-19. */
export function sectionSynthese(plan: Plan): Section {
  return synthese(plan);
}

const vide = (t: string | undefined) => !t || !t.trim() || t.trim() === NON_REMPLI;

/** NEC-CC-19: drops empty fields, empty rows (label alone), empty tables and sub-titles followed by nothing. */
export function nettoyerBlocs(blocs: Bloc[]): Bloc[] {
  const gardes: Bloc[] = [];
  for (const b of blocs) {
    if (b.type === 'champ') {
      if (!vide(b.valeur)) gardes.push(b);
    } else if (b.type === 'texte') {
      if (!vide(b.texte)) gardes.push(b);
    } else if (b.type === 'tableau') {
      const plein = (l: string[]) => (l.length > 1 ? l.slice(1) : l).some((c) => !vide(c));
      const lignes = b.lignes.filter(plein).map((l) => l.map((c) => (vide(c) ? '' : c)));
      const derniere = b.lignes[b.lignes.length - 1];
      const total = !!b.total && !!derniere && plein(derniere);
      // A total row alone (every line above it empty) says nothing.
      if (lignes.length === 0 || (total && lignes.length === 1)) continue;
      gardes.push({ ...b, lignes, total });
    } else gardes.push(b);
  }
  return gardes.filter((b, i) => b.type !== 'sousTitre' || (i + 1 < gardes.length && gardes[i + 1].type !== 'sousTitre'));
}

/** Detailed sections in workbook order (the synthesis is the one-page summary), empty blocks dropped. */
export function sectionsPdf(plan: Plan): Section[] {
  const toutes: [IdRubrique, Section][] = [
    ['identite', identite(plan)],
    ['m1', m1(plan)],
    ['m2', m2(plan)],
    ['m3', m3(plan)],
    ['m4', m4(plan)],
    ['impact', impact(plan)],
    ['mission', mission(plan)],
    ['m5', m5(plan)],
    ['pitch', pitch(plan)],
    ['relecture', relecture(plan)],
    ['apres', apres(plan)],
    ['prix', prix(plan)],
    ['notes', notes(plan)]
  ];
  return toutes
    .map(([, s]) => ({ ...s, blocs: nettoyerBlocs(s.blocs) }))
    .filter((s) => s.blocs.length > 0);
}

export interface CarteResume {
  titre: string;
  texte: string;
  /** True when the text is the draft built from the answers (the card itself is empty). */
  tire: boolean;
}

export interface Resume {
  cartes: CarteResume[];
  chiffres: { label: string; valeur: string }[];
}

/** NEC-CC-19, page 2 "Mon projet en une page": the 6 cards (own text, else the draft) and the key figures. */
export function resumePdf(plan: Plan): Resume {
  const cartes = CARTES.map((c): CarteResume | null => {
    const propre = plan.synthese[c.cle].trim();
    if (propre) return { titre: c.titre, texte: propre, tire: false };
    const b = brouillon(plan, c.cle).trim();
    return b ? { titre: c.titre, texte: b, tire: true } : null;
  }).filter((c): c is CarteResume => !!c);
  const k = chiffresCles(plan);
  const chiffres = [
    k.besoinTotal !== null ? { label: 'Besoin total', valeur: ariary(k.besoinTotal) } : null,
    k.caAnnee1 !== null ? { label: "Chiffre d'affaires année 1", valeur: ariary(k.caAnnee1) } : null,
    k.seuilMois !== null ? { label: 'Seuil de rentabilité', valeur: `${grouper(k.seuilMois)} ${pluriel(plan.uniteVente, k.seuilMois)} par mois` } : null
  ].filter((x): x is { label: string; valeur: string } => !!x);
  return { cartes, chiffres };
}

/** Value proposition of the cover: the 1c sentence when complete, else "Mon projet en une phrase", else ''. */
export function phraseCouverture(plan: Plan): string {
  const pv = plan.m1.pv;
  const complete = [pv.pour, pv.qui, pv.propose, pv.quiBenefice, pv.contrairement].every((x) => x.trim()) && plan.identite.nomProjet.trim();
  return complete ? textePhrase(plan) : plan.identite.unePhrase.trim();
}

/** Steps 1 to 11 with their state (cover dots and the last page). */
export function etapesComptees(plan: Plan) {
  return etapesDuPlan(plan).slice(0, NB_ETAPES_COMPTEES);
}

/** NEC-CC-19, last page "Mon plan continue": steps 1 to 11 not done; null for an example plan. */
export function resteAFaire(plan: Plan): { n: number; label: string; pct: number }[] | null {
  if (plan.exemple) return null;
  return etapesComptees(plan)
    .filter((e) => !e.fait)
    .map((e) => ({ n: e.n, label: e.label, pct: e.pct }));
}

/** Text safe for the PDF standard font: no em dash, en dash, middle dot; spaces instead of thin spaces. */
export function textePdf(t: string): string {
  return t
    .replace(/[—–]/g, ',')
    .replace(/·/g, ',')
    .replace(/[   ]/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/✓/g, '')
    .replace(/[^\n -~¡-ÿŒœ€•«»]/g, '');
}
