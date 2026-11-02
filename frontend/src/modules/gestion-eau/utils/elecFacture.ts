/**
 * Facture RTB Énergie (ELEC-CC-03) : logique PURE, testée. Regroupement, continuité des
 * index, période, totaux et numérotation, avec EXACTEMENT les règles de la base
 * (`supabase/migrations/20261102000100_elec_factures.sql`) :
 *   ligne    : kWh = index fin - index début ; montant = arrondi(kWh × tarif, 2)
 *   facture  : énergie = somme des lignes ; HT = énergie + forfait (une seule fois)
 *              TVA = arrondi(HT × TVA % / 100, 2) ; TTC = arrondi(HT + TVA) à l'Ariary
 * Arrondi « demi vers le haut » (0,50 monte), comme `round()` de PostgreSQL sur un nombre
 * positif. Les calculs se font en entiers (BigInt) : aucun écart de virgule flottante.
 */
import {
  calculerCycle,
  dateMgVersIso,
  fenetreCycle,
  MG_OFFSET_MS,
  moisMg,
  moisPrecedent,
  trierCompteurs,
  trierReleves,
} from './elecReleves';
import { numeroFacture } from './elecReglages';
import type {
  ElecClientLocal,
  ElecCompteurLocal,
  ElecFactureLigneLocal,
  ElecFactureLocal,
  ElecFactureStatut,
  ElecReglagesLocal,
  ElecReleveLocal,
  ElecValidationLocal,
} from '../types/gestionEau';

// ───────────────────────────── Arithmétique exacte ─────────────────────────────
/** Décimales gardées pour les entrées : index au millième, prix et TVA au dix-millième. */
const ECHELLE_INDEX = 1000n;
const ECHELLE_PRIX = 10000n;

function versEntier(v: number, echelle: bigint): bigint {
  return BigInt(Math.round(v * Number(echelle)));
}

/** Division arrondie demi vers le haut (loin de zéro, comme PostgreSQL). */
function diviserArrondi(a: bigint, b: bigint): bigint {
  if (a < 0n) return -diviserArrondi(-a, b);
  return (a * 2n + b) / (2n * b);
}

/** kWh d'une ligne, exact au millième (index fin - index début). */
export function kwhLigne(indexDebut: number, indexFin: number): number {
  return Number(versEntier(indexFin, ECHELLE_INDEX) - versEntier(indexDebut, ECHELLE_INDEX)) / 1000;
}

export interface TotauxFacture {
  totalKwh: number;
  /** Montant de chaque ligne, au centime, dans l'ordre reçu. */
  montantsLignes: number[];
  montantEnergie: number;
  montantHt: number;
  montantTva: number;
  /** Arrondi à l'Ariary. */
  montantTtc: number;
}

/** Totaux d'une facture à partir des kWh de ses lignes : mêmes chiffres que la base. */
export function totauxFacture(kwhs: number[], tarif: number, forfait: number, tvaPct: number): TotauxFacture {
  const t = versEntier(tarif, ECHELLE_PRIX);
  let kwhMilli = 0n;
  let energieCts = 0n;
  const montantsLignes: number[] = [];
  for (const k of kwhs) {
    const km = versEntier(k, ECHELLE_INDEX);
    kwhMilli += km;
    // km (1e-3) × t (1e-4) = 1e-7 Ar ; centimes = 1e-2 Ar.
    const cts = diviserArrondi(km * t, 100000n);
    montantsLignes.push(Number(cts) / 100);
    energieCts += cts;
  }
  const forfaitCts = diviserArrondi(versEntier(forfait, ECHELLE_PRIX), 100n);
  const htCts = energieCts + forfaitCts;
  const tvaCts = diviserArrondi(htCts * versEntier(tvaPct, ECHELLE_PRIX), 100n * ECHELLE_PRIX);
  const ttc = diviserArrondi(htCts + tvaCts, 100n);
  return {
    totalKwh: Number(kwhMilli) / 1000,
    montantsLignes,
    montantEnergie: Number(energieCts) / 100,
    montantHt: Number(htCts) / 100,
    montantTva: Number(tvaCts) / 100,
    montantTtc: Number(ttc),
  };
}

// ───────────────────────────── Numérotation ─────────────────────────────
/**
 * Règle de reprise annuelle (miroir de `eau_elec_sequence` en base, seule autorité) :
 * une année de consommation plus récente que celle du compteur repart à 1.
 */
export function sequencePourAnnee(anneeCycle: number, anneeCompteur: number, prochain: number): { annee: number; seq: number } {
  return anneeCycle > anneeCompteur ? { annee: anneeCycle, seq: 1 } : { annee: anneeCompteur, seq: prochain };
}

/** Compteur utilisé par le mode courant (officiel ou essai). */
export function compteurActif(r: ElecReglagesLocal): { annee: number; prochain: number; essai: boolean } {
  return r.mode_essai
    ? { annee: r.numero_essai_annee ?? 2026, prochain: r.numero_essai_prochain ?? 50, essai: true }
    : { annee: r.numero_annee, prochain: r.numero_prochain, essai: false };
}

/** Les `n` prochains numéros qui seront attribués pour le cycle (aperçu avant émission). */
export function prochainsNumeros(r: ElecReglagesLocal, cycle: string, n: number): string[] {
  const [y, m] = cycle.split('-').map(Number);
  const c = compteurActif(r);
  const { seq } = sequencePourAnnee(y, c.annee, c.prochain);
  return Array.from({ length: Math.max(0, n) }, (_, i) => numeroFacture(y, m, seq + i));
}

// ───────────────────────────── Statuts et avis ─────────────────────────────
export const STATUT_FACTURE_LIBELLE: Record<ElecFactureStatut, string> = {
  brouillon: 'Brouillon',
  emise: 'Émise, non envoyée',
  a_valider: 'À valider',
  validee: 'Validée',
  envoyee: 'Envoyée',
  payee: 'Payée',
  abandonnee: 'Abandonnée',
};

export const STATUTS_VERROUILLES: ElecFactureStatut[] = ['envoyee', 'payee', 'abandonnee'];

export function estVerrouillee(f: Pick<ElecFactureLocal, 'statut'>): boolean {
  return STATUTS_VERROUILLES.includes(f.statut);
}

export interface ResumeAvis {
  bons: number;
  remarquesOuvertes: number;
  remarques: number;
  total: number;
}

export function resumeAvis(avis: ElecValidationLocal[]): ResumeAvis {
  return {
    bons: avis.filter((a) => a.avis === 'bon').length,
    remarques: avis.filter((a) => a.avis === 'remarque').length,
    remarquesOuvertes: avis.filter((a) => a.avis === 'remarque' && !a.levee).length,
    total: avis.length,
  };
}

/** « 1 sur 2 bons », « 1 remarque » (vide sans avis ni valideur). */
export function libelleAvis(r: ResumeAvis, nbValideurs: number): string {
  const parts: string[] = [];
  if (r.bons > 0 || nbValideurs > 0) parts.push(`${r.bons} sur ${Math.max(nbValideurs, r.total)} bon${r.bons > 1 ? 's' : ''}`);
  if (r.remarquesOuvertes > 0) parts.push(`${r.remarquesOuvertes} remarque${r.remarquesOuvertes > 1 ? 's' : ''}`);
  return parts.join(', ');
}

/** Pastille du valideur : factures à valider sur lesquelles il n'a pas encore donné d'avis. */
export function nbAValiderSansAvis(factures: ElecFactureLocal[], avis: ElecValidationLocal[], userId: string | null): number {
  if (!userId) return 0;
  const donnes = new Set(avis.filter((a) => a.user_id === userId).map((a) => a.facture_id));
  return factures.filter((f) => f.statut === 'a_valider' && !donnes.has(f.id)).length;
}

// ───────────────────────────── Dates (heure de Madagascar) ─────────────────────────────
/** Jour `AAAA-MM-JJ` de Madagascar d'un instant ISO. */
export function jourMg(iso: string): string {
  const d = new Date(new Date(iso).getTime() + MG_OFFSET_MS);
  return d.toISOString().slice(0, 10);
}

/** Aujourd'hui à Madagascar (`AAAA-MM-JJ`). */
export function aujourdhuiMg(maintenant: number = Date.now()): string {
  return new Date(maintenant + MG_OFFSET_MS).toISOString().slice(0, 10);
}

/** `AAAA-MM-JJ` + n jours. */
export function ajouterJours(jour: string, n: number): string {
  const [y, m, d] = jour.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function premierJour(cycle: string): string {
  return `${cycle}-01`;
}

export function dernierJour(cycle: string): string {
  const [y, m] = cycle.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Cycle d'un jour (date d'arrêt, mise en service) : fenêtre qui contient son minuit (le 1er au matin = mois écoulé). */
export function cycleDuJour(jour: string): string {
  const iso = dateMgVersIso(jour);
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const m = moisMg(t);
  // La fenêtre d'un mois commence le 1er à midi : avant midi, c'est encore le mois d'avant.
  return t < fenetreCycle(m).debut ? moisPrecedent(m) : m;
}

// ───────────────────────────── Préparation d'un cycle ─────────────────────────────
export interface LignePreparee {
  compteur: ElecCompteurLocal;
  indexDebut: number;
  dateIndexDebut: string | null;
  indexFin: number;
  dateIndexFin: string;
  releveFinId: string;
  kwh: number;
  montant: number;
  ordre: number;
}

export interface FacturePreparee {
  cle: string;
  client: ElecClientLocal;
  bien: string | null;
  lignes: LignePreparee[];
  /** Motifs d'attente (vide = prête à émettre). */
  attente: string[];
  periodeDebut: string;
  periodeFin: string;
  totaux: TotauxFacture;
  /** Brouillon déjà enregistré pour cette clé (recalculé, même identifiant). */
  brouillon: ElecFactureLocal | null;
}

export interface FactureAvecLignes {
  facture: ElecFactureLocal;
  lignes: ElecFactureLigneLocal[];
}

export interface PreparationCycle {
  cycle: string;
  factures: FacturePreparee[];
  /** Clés déjà émises dans ce cycle : jamais touchées. */
  dejaEmises: ElecFactureLocal[];
  /** Brouillons du cycle dont la clé n'a plus lieu d'être (compteur ou client en pause...). */
  brouillonsObsoletes: ElecFactureLocal[];
}

export function cleRegroupement(client: Pick<ElecClientLocal, 'id' | 'facture_groupee'>, bien: string): string {
  return client.facture_groupee ? client.id : `${client.id}|${bien}`;
}

/** Une facture émise (numérotée) compte-t-elle pour le mode courant ? Les essais sont ignorés en mode officiel. */
function compteDansMode(f: ElecFactureLocal, modeEssai: boolean): boolean {
  return f.statut !== 'brouillon' && (!f.essai || modeEssai);
}

/**
 * Dernière ligne facturée (facture numérotée, essai compris, quel que soit son statut) d'un
 * compteur AVANT le cycle : son index de fin devient l'index de début.
 */
export function derniereLigneFacturee(
  compteurId: string,
  cycle: string,
  existantes: FactureAvecLignes[]
): ElecFactureLigneLocal | null {
  let best: { l: ElecFactureLigneLocal; cycle: string; essai: boolean } | null = null;
  for (const { facture, lignes } of existantes) {
    if (!facture.numero || facture.cycle >= cycle) continue;
    for (const l of lignes) {
      if (l.compteur_id !== compteurId || l.index_fin == null) continue;
      const mieux =
        !best || facture.cycle > best.cycle || (facture.cycle === best.cycle && best.essai && !facture.essai);
      if (mieux) best = { l, cycle: facture.cycle, essai: facture.essai };
    }
  }
  return best?.l ?? null;
}

type ResultatLigne = { ligne: LignePreparee } | { attente: string } | null;

function preparerLigne(
  c: ElecCompteurLocal,
  cycle: string,
  releves: ElecReleveLocal[],
  existantes: FactureAvecLignes[],
  tarif: number,
  ordre: number
): ResultatLigne {
  if (c.statut === 'pause') return null;
  if (c.statut === 'arrete') {
    if (!c.date_arret || cycleDuJour(c.date_arret) !== cycle) return null;
  }
  const { debut, fin } = fenetreCycle(cycle);
  if (c.date_mise_en_service) {
    const iso = dateMgVersIso(c.date_mise_en_service);
    if (iso && new Date(iso).getTime() >= fin) return null;
  }
  const tries = trierReleves(releves);
  const t = (r: ElecReleveLocal) => new Date(r.timestamp).getTime();

  // Index de fin : relevé de clôture du cycle (calculerCycle) ; compteur arrêté : son dernier relevé.
  let releveFin: ElecReleveLocal | null = null;
  if (c.statut === 'arrete') {
    const avantFin = tries.filter((r) => t(r) < fin);
    releveFin = avantFin[avantFin.length - 1] ?? null;
  } else {
    const ligneCycle = calculerCycle(cycle, [c], new Map([[c.id, tries]])).lignes[0];
    releveFin = ligneCycle?.fin ?? null;
  }

  // Index de début : continuité, sinon index de reprise, sinon dernier relevé avant le cycle,
  // sinon premier relevé du cycle (compteur neuf sans reprise).
  let indexDebut: number | null = null;
  let dateDebut: string | null = null;
  const precedente = derniereLigneFacturee(c.id, cycle, existantes);
  if (precedente && precedente.index_fin != null) {
    indexDebut = precedente.index_fin;
    dateDebut = precedente.date_index_fin;
  } else if (c.index_reprise != null) {
    indexDebut = c.index_reprise;
    dateDebut = dateMgVersIso(c.date_index_reprise);
  } else {
    const avant = tries.filter((r) => t(r) < debut);
    const premier = avant[avant.length - 1] ?? tries.find((r) => t(r) >= debut && t(r) < fin) ?? null;
    if (premier && premier !== releveFin) {
      indexDebut = premier.index;
      dateDebut = premier.timestamp;
    }
  }

  const manque = `relevé de clôture manquant pour ${c.code}`;
  if (!releveFin) return { attente: manque };
  if (indexDebut == null) return { attente: `index de départ inconnu pour ${c.code}` };
  if (dateDebut && t(releveFin) <= new Date(dateDebut).getTime()) return { attente: manque };
  if (releveFin.index < indexDebut) {
    return { attente: `index de fin inférieur au début pour ${c.code} (compteur remplacé ?)` };
  }
  const kwh = kwhLigne(indexDebut, releveFin.index);
  return {
    ligne: {
      compteur: c,
      indexDebut,
      dateIndexDebut: dateDebut,
      indexFin: releveFin.index,
      dateIndexFin: releveFin.timestamp,
      releveFinId: releveFin.id,
      kwh,
      montant: totauxFacture([kwh], tarif, 0, 0).montantsLignes[0],
      ordre,
    },
  };
}

/**
 * Prépare les factures d'un cycle : une par client groupé, sinon une par bien ; compteurs
 * successifs d'un même bien sur la même facture ; pause = pas de facture ; arrêté = facturé
 * le seul cycle de son arrêt. Ne touche jamais une facture déjà émise.
 */
export function preparerFacturesCycle(
  cycle: string,
  clients: ElecClientLocal[],
  compteurs: ElecCompteurLocal[],
  releves: Map<string, ElecReleveLocal[]>,
  existantes: FactureAvecLignes[],
  reglages: Pick<ElecReglagesLocal, 'tarif_kwh' | 'forfait_ht' | 'tva_pct' | 'mode_essai'>
): PreparationCycle {
  const duCycle = existantes.filter((e) => e.facture.cycle === cycle).map((e) => e.facture);
  const emisesParCle = new Map<string, ElecFactureLocal>();
  const brouillonsParCle = new Map<string, ElecFactureLocal>();
  for (const f of duCycle) {
    if (compteDansMode(f, reglages.mode_essai)) emisesParCle.set(f.cle_regroupement, f);
    else if (f.statut === 'brouillon') brouillonsParCle.set(f.cle_regroupement, f);
  }

  const groupes = new Map<string, { client: ElecClientLocal; bien: string | null; compteurs: ElecCompteurLocal[] }>();
  const clientsParId = new Map(clients.map((c) => [c.id, c]));
  for (const c of trierCompteurs(compteurs)) {
    const client = clientsParId.get(c.client_id);
    if (!client || client.statut === 'pause') continue;
    const cle = cleRegroupement(client, c.bien);
    const g = groupes.get(cle) ?? { client, bien: client.facture_groupee ? null : c.bien, compteurs: [] };
    g.compteurs.push(c);
    groupes.set(cle, g);
  }

  const factures: FacturePreparee[] = [];
  const dejaEmises: ElecFactureLocal[] = [];
  for (const [cle, g] of groupes) {
    const emise = emisesParCle.get(cle);
    if (emise) {
      dejaEmises.push(emise);
      continue;
    }
    const lignes: LignePreparee[] = [];
    const attente: string[] = [];
    ordreDesRemplacements(g.compteurs).forEach((c) => {
      const r = preparerLigne(c, cycle, releves.get(c.id) ?? [], existantes, reglages.tarif_kwh, lignes.length + attente.length);
      if (!r) return;
      if ('ligne' in r) lignes.push(r.ligne);
      else attente.push(r.attente);
    });
    if (lignes.length === 0 && attente.length === 0) continue;
    const premier = premierJour(cycle);
    const debuts = lignes.map((l) => (l.dateIndexDebut ? jourMg(l.dateIndexDebut) : premier));
    const plusTot = debuts.length > 0 ? debuts.reduce((a, b) => (a < b ? a : b)) : premier;
    factures.push({
      cle,
      client: g.client,
      bien: g.bien,
      lignes,
      attente,
      periodeDebut: plusTot > premier ? plusTot : premier,
      periodeFin: dernierJour(cycle),
      totaux: totauxFacture(lignes.map((l) => l.kwh), reglages.tarif_kwh, reglages.forfait_ht, reglages.tva_pct),
      brouillon: brouillonsParCle.get(cle) ?? null,
    });
  }

  factures.sort(comparerFactures);
  const cles = new Set(factures.map((f) => f.cle));
  const brouillonsObsoletes = Array.from(brouillonsParCle.values()).filter((b) => !cles.has(b.cle_regroupement));
  return { cycle, factures, dejaEmises, brouillonsObsoletes };
}

/** Ordre de tournée, mais un compteur remplacé passe avant celui qui le remplace. */
function ordreDesRemplacements(list: ElecCompteurLocal[]): ElecCompteurLocal[] {
  const ids = new Set(list.map((c) => c.id));
  const places = new Set<string>();
  const out: ElecCompteurLocal[] = [];
  const placer = (c: ElecCompteurLocal) => {
    if (places.has(c.id)) return;
    places.add(c.id);
    if (c.remplace_compteur_id && ids.has(c.remplace_compteur_id)) {
      const ancien = list.find((x) => x.id === c.remplace_compteur_id);
      if (ancien) placer(ancien);
    }
    out.push(c);
  };
  // Marque avant de placer l'ancien : une chaîne circulaire ne boucle jamais.
  list.forEach(placer);
  return out;
}

/** Ordre documenté (identique à l'émission en base) : code client, puis bien (groupée d'abord). */
export function comparerFactures(
  a: { client: Pick<ElecClientLocal, 'code'>; bien: string | null },
  b: { client: Pick<ElecClientLocal, 'code'>; bien: string | null }
): number {
  if (a.client.code !== b.client.code) return a.client.code < b.client.code ? -1 : 1;
  if (a.bien === b.bien) return 0;
  if (a.bien == null) return -1;
  if (b.bien == null) return 1;
  return a.bien < b.bien ? -1 : 1;
}

// ───────────────────────────── Export CSV ─────────────────────────────
/** Nombre à la française pour Excel : virgule décimale, sans séparateur de milliers. */
export function nombreFr(v: number | null | undefined, decimales = 2): string {
  if (v == null || !Number.isFinite(v)) return '';
  const s = (Math.round(v * 10 ** decimales) / 10 ** decimales).toString();
  return s.replace('.', ',');
}

/** Date `AAAA-MM-JJ` → `JJ/MM/AAAA`. */
export function dateFr(jour: string | null | undefined): string {
  if (!jour) return '';
  const [y, m, d] = jour.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export const COLONNES_CSV = [
  'Numéro', 'Client', 'Bien', 'Période', 'kWh par compteur', 'kWh total', 'HT', 'TVA', 'TTC', 'Échéance', 'Statut', 'Essai',
];

export function lignesCsvCycle(
  factures: ElecFactureLocal[],
  lignesParFacture: Map<string, ElecFactureLigneLocal[]>,
  clients: Map<string, Pick<ElecClientLocal, 'code' | 'nom'>>
): Record<string, string>[] {
  return factures.map((f) => {
    const cl = clients.get(f.client_id);
    const ls = (lignesParFacture.get(f.id) ?? []).slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
    return {
      'Numéro': f.numero ?? 'brouillon',
      'Client': cl ? `${cl.code} ${cl.nom}` : '',
      'Bien': f.bien ?? 'tous',
      'Période': `${dateFr(f.periode_debut)} au ${dateFr(f.periode_fin)}`,
      'kWh par compteur': ls.map((l) => `${l.code_compteur ?? ''} ${nombreFr(l.kwh, 3)}`).join(' / '),
      'kWh total': nombreFr(f.total_kwh, 3),
      'HT': nombreFr(f.montant_ht),
      'TVA': nombreFr(f.montant_tva),
      'TTC': nombreFr(f.montant_ttc, 0),
      'Échéance': dateFr(f.date_echeance),
      'Statut': STATUT_FACTURE_LIBELLE[f.statut],
      'Essai': f.essai ? 'oui' : 'non',
    };
  });
}
