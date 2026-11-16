// "Envoyer vers mon prix de revient": a price seen in the field becomes a component of the recipe
// of the produit principal (NEC-CC-38: first product of the list, one global cost line, cahier R2).
import type { Plan } from '../../types';
import { nouvelId, produitVide } from '../../etat/vide';

type PrixReleve = Plan['prix'][number];

export function libelleCout(l: PrixReleve): string {
  const element = l.element.trim();
  const unite = l.unite.trim();
  return unite ? `${element} (${unite})` : element;
}

/** Appends the line to the recipe of the first product (mutable recipe). Its single blank line is replaced. */
export function ajouterAuxCouts(p: Plan, l: PrixReleve): void {
  if (!p.m5.produits.length) p.m5.produits.push(produitVide(p.uniteVente));
  const produit = p.m5.produits[0];
  const ligne = { id: nouvelId(), designation: libelleCout(l), prixLot: l.prix, quantiteLot: 1, uniteLot: 'piece', quantiteUtilisee: 1, uniteUtilisee: 'piece' };
  const c = produit.composants;
  const vide = c.length === 1 && !c[0].designation.trim() && c[0].prixLot === null;
  produit.composants = vide ? [ligne] : [...c, ligne];
}
