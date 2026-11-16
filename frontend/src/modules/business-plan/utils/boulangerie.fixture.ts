// NEC-CC-38: fictitious plan "Boulangerie test" of the cahier CGA v0.3, section 11, typed exactly
// (flour bought in kg with a recipe in g, cream in l with a recipe in ml). Test data only.
import type { Plan } from '../types';
import { planVide } from '../etat/vide';
import { inv, k, produit, res } from '../data/exemples/assembler';

export function planBoulangerie(): Plan {
  const p = planVide();
  p.identite.nomProjet = 'Boulangerie test';
  p.uniteVente = 'pain';
  p.m5.produits = [
    produit('b-p1', 'Pain', 'pain', 1800, 3000, [
      k('b-c1', 'Farine', 150000, 50, 'kg', 300, 'g'),
      k('b-c2', 'Levure', 20000, 500, 'g', 5, 'g'),
      k('b-c3', 'Sel', 2000, 1, 'kg', 5, 'g'),
      k('b-c4', 'Sachet', 10000, 100, 'piece', 1)
    ]),
    produit('b-p2', 'Croissant', 'croissant', 1500, 1500, [
      k('b-c5', 'Farine', 150000, 50, 'kg', 60, 'g'),
      k('b-c6', 'Beurre', 25000, 1, 'kg', 20, 'g'),
      k('b-c7', 'Sucre', 4000, 1, 'kg', 10, 'g'),
      k('b-c8', 'Œufs', 18000, 30, 'piece', 0.2)
    ]),
    produit('b-p3', "Gâteau d'anniversaire", 'gâteau', 45000, 40, [
      k('b-c9', 'Farine', 150000, 50, 'kg', 1, 'kg'),
      k('b-c10', 'Œufs', 18000, 30, 'piece', 10),
      k('b-c11', 'Sucre', 4000, 1, 'kg', 1, 'kg'),
      k('b-c12', 'Beurre', 25000, 1, 'kg', 250, 'g'),
      k('b-c13', 'Crème', 30000, 1, 'l', 250, 'ml')
    ])
  ];
  p.m5.chargesFixes = { loyer: 400000, salaires: 1200000, energie: 250000, transport: 100000, telephone: 50000, autres: 100000, lignes: [] };
  p.m5.joursParMois = 25;
  p.m5.investissements = [inv('b-i1', 'Four', 1, 6000000), inv('b-i2', 'Pétrin', 1, 2500000)];
  p.m5.stockDepart = 500000;
  p.m5.fondsRoulementSaisi = null;
  p.m5.ressources = [res('b-r1', 'argent', 'Économies', 3000000), res('b-r2', 'materiel', 'Vitrine réfrigérée', 1500000), res('b-r3', 'subvention', 'Concours GEW', 5000000)];
  p.m5.hausses = [null, null];
  return p;
}

