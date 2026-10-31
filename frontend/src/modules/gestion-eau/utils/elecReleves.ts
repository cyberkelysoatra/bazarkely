/**
 * Logique PURE des relevés d'électricité RTB Énergie (ELEC-CC-02) : saisie selon
 * l'échelle du compteur, consommation par jour, comparaison à l'historique, cycle
 * mensuel. Heure de Madagascar (UTC+3, sans heure d'été) partout : aucun jour n'est
 * calculé en UTC.
 */
import { detectAberrant, moyenne, type AberrantResult } from './bilan';
import type { EauRoles, ElecCompteurLocal, ElecReleveLocal, ElecReleveOrigine } from '../types/gestionEau';

/** Décalage de Madagascar (ms). */
export const MG_OFFSET_MS = 3 * 60 * 60 * 1000;
const JOUR_MS = 24 * 60 * 60 * 1000;
/** Un relevé fait le 1er avant midi compte pour le mois qui vient de se terminer. */
export const MATIN_DU_1ER_MS = 12 * 60 * 60 * 1000;
/** Facteur d'écart par défaut quand la configuration n'en donne pas (lisible du seul domaine eau). */
export const FACTEUR_ECART_DEFAUT = 3;
/** Fenêtre de correction d'un releveur sur ses propres relevés (même règle que l'eau). */
export const FENETRE_48H_MS = 48 * 60 * 60 * 1000;

// ───────────────────────────── Droits du domaine ─────────────────────────────
export interface ElecDroits {
  /** Admin ou gestion électricité : écrit partout, choisit date et origine. */
  gestion: boolean;
  /** Peut saisir un relevé (gestion ou releveur électricité). */
  saisie: boolean;
  /** Voit les clients, les réglages, la vue du cycle (lecture du domaine). */
  lecture: boolean;
  /** Releveur électricité sans autre rôle du domaine. */
  releveurSeul: boolean;
}

export function droitsElec(roles: EauRoles): ElecDroits {
  const gestion = roles.admin || roles.gestionElec;
  const lecture = gestion || roles.promoteur || roles.lectureElec;
  return {
    gestion,
    saisie: gestion || roles.releveurElec,
    lecture,
    releveurSeul: roles.releveurElec && !lecture,
  };
}

// ───────────────────────────── Saisie de l'index ─────────────────────────────
export type SaisieIndex = { ok: true; value: number } | { ok: false; message: string };

export const MSG_ENTIERS = 'ce compteur n’affiche que des nombres entiers';

/**
 * Lit un index tapé au clavier selon l'échelle du compteur. La virgule et le point sont
 * acceptés comme séparateur ; les espaces sont ignorés. 0 décimale : toute virgule est
 * refusée. N décimales : au plus N chiffres après la virgule (moins est accepté et
 * stocké tel quel).
 */
export function lireIndex(saisie: string, decimales: number): SaisieIndex {
  const brut = saisie.replace(/\s+/g, '');
  if (brut === '') return { ok: false, message: 'Saisissez l’index' };
  const sep = /[.,]/.exec(brut);
  if (sep && decimales === 0) return { ok: false, message: MSG_ENTIERS };
  if (!/^\d+([.,]\d*)?$/.test(brut)) return { ok: false, message: 'Index invalide : chiffres seulement' };
  const [, frac = ''] = brut.split(/[.,]/);
  if (frac.length > decimales) {
    return {
      ok: false,
      message: `ce compteur affiche au plus ${decimales} chiffre${decimales > 1 ? 's' : ''} après la virgule`,
    };
  }
  const value = Number(brut.replace(',', '.'));
  if (!Number.isFinite(value) || value < 0) return { ok: false, message: 'Index invalide' };
  return { ok: true, value };
}

/** Affiche un index avec l'échelle du compteur (virgule française). */
export function fmtIndex(v: number | null | undefined, decimales: number): string {
  if (v == null || !Number.isFinite(v)) return '-';
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: Math.max(0, decimales) });
}

// ───────────────────────────── Consommation ─────────────────────────────
/** Point de référence d'un compteur : dernier relevé, sinon index de reprise. */
export interface PointIndex {
  index: number;
  /** ISO, ou null si l'index de reprise n'a pas de date. */
  date: string | null;
  source: 'releve' | 'reprise';
}

/** Date `YYYY-MM-DD` (index de reprise) → ISO à minuit heure de Madagascar. */
export function dateMgVersIso(d: string | null | undefined): string | null {
  if (!d) return null;
  const [y, m, j] = d.split('-').map(Number);
  if (!y || !m || !j) return null;
  return new Date(Date.UTC(y, m - 1, j) - MG_OFFSET_MS).toISOString();
}

/** Relevés triés du plus ancien au plus récent. */
export function trierReleves(releves: ElecReleveLocal[]): ElecReleveLocal[] {
  return releves.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function pointDeDepart(compteur: ElecCompteurLocal, relevesTries: ElecReleveLocal[]): PointIndex | null {
  const dernier = relevesTries[relevesTries.length - 1];
  if (dernier) return { index: dernier.index, date: dernier.timestamp, source: 'releve' };
  if (compteur.index_reprise != null) {
    return { index: compteur.index_reprise, date: dateMgVersIso(compteur.date_index_reprise), source: 'reprise' };
  }
  return null;
}

/** Nombre de jours (décimal) entre deux instants ; null si durée nulle ou inconnue. */
export function joursEntre(debutIso: string | null, finIso: string | null): number | null {
  if (!debutIso || !finIso) return null;
  const d = (new Date(finIso).getTime() - new Date(debutIso).getTime()) / JOUR_MS;
  return Number.isFinite(d) && d > 0 ? d : null;
}

export function consoParJour(conso: number, jours: number | null): number | null {
  if (jours == null || jours <= 0) return null;
  return conso / jours;
}

/**
 * Moyenne de la consommation par jour sur les intervalles précédents (un intervalle en
 * rupture d'index est ignoré, comme les intervalles de durée nulle).
 */
export function moyenneParJour(relevesTries: ElecReleveLocal[]): number {
  const valeurs: number[] = [];
  for (let i = 1; i < relevesTries.length; i++) {
    const b = relevesTries[i];
    const a = relevesTries[i - 1];
    if (b.rupture_index) continue;
    const j = joursEntre(a.timestamp, b.timestamp);
    if (j == null || j < 0.25) continue; // moins de 6 h : trop court pour une moyenne
    const c = b.index - a.index;
    if (c >= 0) valeurs.push(c / j);
  }
  return moyenne(valeurs);
}

export interface EvaluationElec {
  depart: PointIndex | null;
  /** Nouvel index plus petit que le point de départ. */
  inferieur: boolean;
  conso: number | null;
  jours: number | null;
  parJour: number | null;
  moyenneParJour: number;
  ecart: AberrantResult;
}

/**
 * Évalue un nouvel index (sans rien écrire). Une consommation nulle n'est jamais un
 * écart (logement vide). L'écart se mesure sur la consommation PAR JOUR, comparée à
 * la moyenne par jour des relevés précédents.
 */
export function evaluerIndex(
  compteur: ElecCompteurLocal,
  relevesTries: ElecReleveLocal[],
  nouvelIndex: number,
  dateIso: string,
  facteur: number
): EvaluationElec {
  const depart = pointDeDepart(compteur, relevesTries);
  const moy = moyenneParJour(relevesTries);
  if (!depart) {
    return { depart, inferieur: false, conso: null, jours: null, parJour: null, moyenneParJour: moy, ecart: { aberrant: false, type: null } };
  }
  const inferieur = nouvelIndex < depart.index;
  const conso = inferieur ? null : nouvelIndex - depart.index;
  const jours = joursEntre(depart.date, dateIso);
  const parJour = conso == null ? null : consoParJour(conso, jours);
  const ecart =
    parJour == null || conso == null || conso <= 0
      ? { aberrant: false, type: null }
      : detectAberrant(parJour, moy, facteur > 1 ? facteur : FACTEUR_ECART_DEFAUT);
  return { depart, inferieur, conso, jours, parJour, moyenneParJour: moy, ecart };
}

/** Un releveur ne corrige que SES relevés de moins de 48 h ; la gestion corrige tout. */
export function peutModifierReleve(
  releve: Pick<ElecReleveLocal, 'agent_id' | 'timestamp'>,
  userId: string | null,
  droits: ElecDroits,
  maintenant: number = Date.now()
): boolean {
  if (droits.gestion) return true;
  if (!droits.saisie || !userId) return false;
  return releve.agent_id === userId && maintenant - new Date(releve.timestamp).getTime() <= FENETRE_48H_MS;
}

// ───────────────────────────── Cycle mensuel ─────────────────────────────
/** Mois `YYYY-MM` de Madagascar contenant l'instant donné. */
export function moisMg(instant: number): string {
  const d = new Date(instant + MG_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function moisPrecedent(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function moisSuivant(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/** Début du mois `YYYY-MM` à minuit heure de Madagascar (ms). */
export function debutMoisMg(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return Date.UTC(y, m - 1, 1) - MG_OFFSET_MS;
}

/**
 * Fenêtre d'un cycle : du 1er à midi (heure de Madagascar) au 1er à midi du mois
 * suivant. Un relevé du 1er au matin clôt donc le mois qui vient de se terminer.
 */
export function fenetreCycle(ym: string): { debut: number; fin: number } {
  return { debut: debutMoisMg(ym) + MATIN_DU_1ER_MS, fin: debutMoisMg(moisSuivant(ym)) + MATIN_DU_1ER_MS };
}

/** Jours avant la fin du mois à partir desquels la tournée relève déjà le mois en cours. */
export const AVANCE_TOURNEE_JOURS = 7;

/**
 * Cycle à relever et à contrôler par défaut : le mois qui vient de se terminer. La tournée
 * se fait au plus près du 1er (le dernier jour du mois ou le 1er) : dans les 7 derniers
 * jours d'un mois, c'est déjà ce mois-là qu'on relève.
 */
export function cycleParDefaut(maintenant: number = Date.now()): string {
  return moisPrecedent(moisMg(maintenant + AVANCE_TOURNEE_JOURS * JOUR_MS));
}

export interface LigneCycle {
  compteur: ElecCompteurLocal;
  debut: PointIndex | null;
  fin: ElecReleveLocal | null;
  conso: number | null;
  jours: number | null;
  parJour: number | null;
  /** Une rupture d'index dans le cycle : conso calculée sans l'intervalle rompu. */
  rupture: boolean;
  photo: boolean;
  origine: ElecReleveOrigine | null;
}

export interface Cycle {
  mois: string;
  lignes: LigneCycle[];
  /** Compteurs actifs ou en pause sans relevé dans le cycle. */
  manquants: ElecCompteurLocal[];
  totalKwh: number;
  /** Compteurs actifs (à relever) / relevés parmi eux. */
  nbActifs: number;
  nbActifsReleves: number;
}

/**
 * Calcule le cycle `mois` : pour chaque compteur, index de début (dernier relevé avant
 * la fenêtre, sinon index de reprise), index de fin (dernier relevé de la fenêtre),
 * consommation, nombre de jours, consommation par jour. Un compteur arrêté n'apparaît
 * que s'il a un relevé dans la fenêtre.
 */
export function calculerCycle(
  mois: string,
  compteurs: ElecCompteurLocal[],
  relevesParCompteur: Map<string, ElecReleveLocal[]>
): Cycle {
  const { debut, fin } = fenetreCycle(mois);
  const lignes: LigneCycle[] = [];
  const manquants: ElecCompteurLocal[] = [];
  let nbActifs = 0;
  let nbActifsReleves = 0;

  for (const c of trierCompteurs(compteurs)) {
    const tries = trierReleves(relevesParCompteur.get(c.id) ?? []);
    const avant = tries.filter((r) => new Date(r.timestamp).getTime() < debut);
    const dedans = tries.filter((r) => {
      const t = new Date(r.timestamp).getTime();
      return t >= debut && t < fin;
    });
    if (c.statut === 'actif') {
      nbActifs++;
      if (dedans.length > 0) nbActifsReleves++;
    }
    if (dedans.length === 0) {
      if (c.statut !== 'arrete') manquants.push(c);
      continue;
    }
    let depart = avant.length > 0 ? pointDeDepart(c, avant) : pointDeDepart(c, []);
    let suivants = dedans;
    // Compteur neuf sans index de reprise : son premier relevé du mois sert de départ.
    if (!depart && dedans.length >= 2) {
      depart = { index: dedans[0].index, date: dedans[0].timestamp, source: 'releve' };
      suivants = dedans.slice(1);
    }
    const dernier = dedans[dedans.length - 1];
    let conso: number | null = null;
    let rupture = false;
    if (depart) {
      // Somme des intervalles : départ → relevés du cycle, sans l'intervalle rompu.
      let prev = depart.index;
      conso = 0;
      for (const r of suivants) {
        if (r.rupture_index || r.index < prev) rupture = true;
        else conso += r.index - prev;
        prev = r.index;
      }
    }
    const jours = depart ? joursEntre(depart.date, dernier.timestamp) : null;
    lignes.push({
      compteur: c,
      debut: depart,
      fin: dernier,
      conso,
      jours,
      parJour: conso == null ? null : consoParJour(conso, jours),
      rupture,
      photo: !!dernier.photo_url,
      origine: dernier.origine ?? 'terrain',
    });
  }

  const totalKwh = lignes.reduce((s, l) => s + (l.conso ?? 0), 0);
  return { mois, lignes, manquants, totalKwh, nbActifs, nbActifsReleves };
}

/** Ordre de tournée puis code (comparaison simple, sans normalisation). */
export function trierCompteurs<T extends Pick<ElecCompteurLocal, 'ordre' | 'code'>>(list: T[]): T[] {
  return list.slice().sort((a, b) => {
    const oa = a.ordre ?? Number.MAX_SAFE_INTEGER;
    const ob = b.ordre ?? Number.MAX_SAFE_INTEGER;
    if (oa !== ob) return oa - ob;
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
  });
}

/** Compteurs de la tournée : actifs et en pause (les arrêtés sont masqués). */
export function compteursTournee<T extends ElecCompteurLocal>(list: T[]): T[] {
  return trierCompteurs(list.filter((c) => c.statut !== 'arrete'));
}

/** Libellé lisible d'un mois `YYYY-MM`. */
export function libelleMois(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** « d’octobre 2026 », « de novembre 2026 » (élision devant une voyelle). */
export function deMois(ym: string): string {
  const l = libelleMois(ym);
  return /^[aeiouyéèh]/i.test(l) ? `d’${l}` : `de ${l}`;
}

/** Date et heure à Madagascar (affichage). */
export function fmtDateMg(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Indian/Antananarivo' });
}

/** Valeur d'un champ `datetime-local` → ISO, en lisant la saisie comme une heure de Madagascar. */
export function saisieMgVersIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local.trim());
  if (!m) return null;
  const [, y, mo, j, h, mi] = m.map(Number);
  return new Date(Date.UTC(y, mo - 1, j, h, mi) - MG_OFFSET_MS).toISOString();
}

/** ISO → valeur d'un champ `datetime-local` en heure de Madagascar. */
export function isoVersSaisieMg(iso: string): string {
  const d = new Date(new Date(iso).getTime() + MG_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Libellé d'une origine de relevé. */
export const ORIGINE_LIBELLE: Record<ElecReleveOrigine, string> = {
  terrain: 'Tournée',
  carnet: 'Carnet',
  photo_client: 'Photo du client',
};
