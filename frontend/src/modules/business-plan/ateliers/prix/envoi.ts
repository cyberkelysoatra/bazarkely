// "Envoyer vers mon prix de revient": a price seen in the field becomes a cost line of 5a.
import type { Plan } from '../../types';
import { nouvelId } from '../../etat/vide';

type PrixReleve = Plan['prix'][number];

export function libelleCout(l: PrixReleve): string {
  const element = l.element.trim();
  const unite = l.unite.trim();
  return unite ? `${element} (${unite})` : element;
}

/** Appends the line to plan.m5.couts (mutable recipe). The single blank line of a new plan is replaced. */
export function ajouterAuxCouts(p: Plan, l: PrixReleve): void {
  const ligne = { id: nouvelId(), libelle: libelleCout(l), montant: l.prix };
  const vide = p.m5.couts.length === 1 && !p.m5.couts[0].libelle.trim() && p.m5.couts[0].montant === null;
  p.m5.couts = vide ? [ligne] : [...p.m5.couts, ligne];
}
