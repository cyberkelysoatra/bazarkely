// JUS'NOSY example, "Mes prix relevés" (workbook page 19), coherent with the cost lines of 5a.
import type { Plan } from '../../types';

export const prix: Partial<Pick<Plan, 'prix'>> = {
  prix: [
    { id: 'ex-p1', element: 'Mangues', unite: 'le kg', prix: 2000, ou: 'Marché de Hell-Ville, étal de Mme Razafy, 8 novembre' },
    { id: 'ex-p2', element: 'Ananas', unite: 'la pièce', prix: 1500, ou: "Producteur d'Ambanoro, M. Be" },
    { id: 'ex-p3', element: 'Sucre', unite: 'le kg', prix: 4000, ou: 'Épicerie du marché de Hell-Ville' },
    { id: 'ex-p4', element: 'Étiquettes', unite: 'les 100', prix: 5000, ou: 'Imprimerie de Hell-Ville' },
    { id: 'ex-p5', element: 'Bouchons', unite: 'les 100', prix: 5000, ou: 'Quincaillerie de Hell-Ville' },
    { id: 'ex-p6', element: 'Jus importé (concurrent)', unite: 'le litre', prix: 5500, ou: "Supermarché d'Ambatoloaka" }
  ]
};
