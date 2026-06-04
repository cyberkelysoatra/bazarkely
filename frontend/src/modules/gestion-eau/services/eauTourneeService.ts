/**
 * Mode tournée (terrain) — offline-first, lecture locale uniquement.
 * Liste les compteurs actifs ORDONNÉS (zone puis `ordre` puis nom), avec pour chacun
 * son dernier index et un drapeau « relevé aujourd'hui » → progression X/N + reprise.
 */
import { listCompteursActifs } from './eauCompteurService';
import { getDernierReleveCompteur } from './eauReleveService';
import type { CompteurLocal } from '../types/gestionEau';

export interface TourneeItem {
  compteur: CompteurLocal;
  dernierIndex: number | null;
  dernierReleveDate: string | null;
  releveAujourdhui: boolean;
}

export interface TourneeData {
  items: TourneeItem[];
  total: number;
  faits: number;
}

/** Vrai si l'horodatage ISO tombe le même jour calendaire (local) que maintenant. */
function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Construit la tournée du jour (compteurs actifs ordonnés + progression). */
export async function getTourneeData(): Promise<TourneeData> {
  const compteurs = await listCompteursActifs(); // déjà triés zone/ordre/nom
  const items: TourneeItem[] = [];
  let faits = 0;
  for (const c of compteurs) {
    const dernier = await getDernierReleveCompteur(c.id);
    const fait = isToday(dernier?.timestamp ?? null);
    if (fait) faits++;
    items.push({
      compteur: c,
      dernierIndex: dernier?.index ?? null,
      dernierReleveDate: dernier?.timestamp ?? null,
      releveAujourdhui: fait,
    });
  }
  return { items, total: compteurs.length, faits };
}
