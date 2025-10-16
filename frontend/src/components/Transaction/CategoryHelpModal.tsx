import React from 'react';
import Modal from '../UI/Modal';
import { 
  ShoppingBag, 
  Car, 
  Home, 
  Heart, 
  GraduationCap, 
  Phone, 
  Shirt, 
  Gamepad2, 
  Users, 
  HandHeart, 
  MoreHorizontal 
} from 'lucide-react';

// Interface pour un guide de catégorie
interface CategoryGuide {
  category: string;
  name: string;
  icon: React.ReactNode;
  examples: string[];
}

// Interface pour les props du composant
interface CategoryHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Guides de catégories avec exemples détaillés
const categoryGuides: CategoryGuide[] = [
  {
    category: 'alimentation',
    name: 'Alimentation',
    icon: <ShoppingBag className="w-5 h-5 text-red-500" />,
    examples: [
      'Courses alimentaires (supermarché, épicerie)',
      'Restaurants et cafés',
      'Livraison de nourriture (Uber Eats, Jumia Food)',
      'Produits frais (fruits, légumes, viande)',
      'Boissons et jus',
      'Snacks et grignotage',
      'Cuisine et épices',
      'Petit-déjeuner et déjeuner'
    ]
  },
  {
    category: 'transport',
    name: 'Transport',
    icon: <Car className="w-5 h-5 text-green-500" />,
    examples: [
      'Essence et carburant',
      'Transport en commun (bus, taxi-brousse)',
      'Frais de parking',
      'Entretien automobile (réparation, révision)',
      'Assurance véhicule',
      'Permis de conduire',
      'Location de véhicule',
      'Péage et vignette'
    ]
  },
  {
    category: 'logement',
    name: 'Logement',
    icon: <Home className="w-5 h-5 text-blue-500" />,
    examples: [
      'Loyer mensuel',
      'Charges (électricité, eau, gaz)',
      'Frais de copropriété',
      'Assurance habitation',
      'Réparations et maintenance',
      'Décoration et ameublement',
      'Frais de déménagement',
      'Taxe d\'habitation'
    ]
  },
  {
    category: 'sante',
    name: 'Santé',
    icon: <Heart className="w-5 h-5 text-pink-500" />,
    examples: [
      'Consultations médicales',
      'Médicaments et pharmacie',
      'Abonnement salle de sport',
      'Soins dentaires',
      'Optique et lunettes',
      'Assurance santé',
      'Analyses médicales',
      'Urgences médicales'
    ]
  },
  {
    category: 'education',
    name: 'Éducation',
    icon: <GraduationCap className="w-5 h-5 text-purple-500" />,
    examples: [
      'Frais de scolarité',
      'Fournitures scolaires (cahiers, stylos)',
      'Livres et manuels',
      'Cours particuliers',
      'Formation professionnelle',
      'Inscription universitaire',
      'Matériel éducatif',
      'Transport scolaire'
    ]
  },
  {
    category: 'communication',
    name: 'Communication',
    icon: <Phone className="w-5 h-5 text-indigo-500" />,
    examples: [
      'Abonnement téléphone mobile',
      'Facture internet',
      'Abonnement téléphone fixe',
      'Forfaits data',
      'Services de messagerie',
      'Appels internationaux',
      'Équipements télécoms',
      'Services cloud'
    ]
  },
  {
    category: 'vetements',
    name: 'Vêtements',
    icon: <Shirt className="w-5 h-5 text-cyan-500" />,
    examples: [
      'Vêtements et chaussures',
      'Coiffeur et salon de beauté',
      'Maquillage et produits cosmétiques',
      'Accessoires (sacs, bijoux)',
      'Lingerie et sous-vêtements',
      'Nettoyage à sec',
      'Réparation de vêtements',
      'Parfums et eaux de toilette'
    ]
  },
  {
    category: 'loisirs',
    name: 'Loisirs',
    icon: <Gamepad2 className="w-5 h-5 text-orange-500" />,
    examples: [
      'Netflix, Spotify, Disney Plus',
      'Cinéma et spectacles',
      'Jeux vidéo et consoles',
      'Sorties et divertissements',
      'Livres et magazines',
      'Hobbies et passe-temps',
      'Voyages et vacances',
      'Sports et activités'
    ]
  },
  {
    category: 'famille',
    name: 'Famille',
    icon: <Users className="w-5 h-5 text-teal-500" />,
    examples: [
      'Garde d\'enfants',
      'Frais de crèche',
      'Activités enfants',
      'Vêtements enfants',
      'Nourriture bébé',
      'Jouets et jeux enfants',
      'Frais de naissance',
      'Éducation enfants'
    ]
  },
  {
    category: 'solidarite',
    name: 'Solidarité',
    icon: <HandHeart className="w-5 h-5 text-rose-500" />,
    examples: [
      'Dons et charité',
      'Cadeaux (famille, amis)',
      'Contributions religieuses',
      'Aide aux proches',
      'Organisations caritatives',
      'Fêtes et célébrations',
      'Mariages et cérémonies',
      'Aide d\'urgence'
    ]
  },
  {
    category: 'autres',
    name: 'Autres',
    icon: <MoreHorizontal className="w-5 h-5 text-slate-500" />,
    examples: [
      'Dépenses imprévues',
      'Frais bancaires',
      'Amendes et contraventions',
      'Dépenses professionnelles',
      'Frais administratifs',
      'Divers et imprévus',
      'Épargne de précaution',
      'Dépenses non catégorisées'
    ]
  }
];

const CategoryHelpModal: React.FC<CategoryHelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Aide - Catégorisation des dépenses"
      size="lg"
      closeOnBackdropClick={true}
      closeOnEsc={true}
      showCloseButton={true}
    >
      <div className="space-y-6">
        <div className="text-center mb-6">
          <p className="text-gray-600 text-sm">
            Choisissez la catégorie qui correspond le mieux à votre dépense. 
            Voici un guide détaillé pour vous aider :
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-6 pr-2">
          {categoryGuides.map((guide) => (
            <div key={guide.category} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center space-x-3 mb-3">
                {guide.icon}
                <h3 className="text-lg font-semibold text-gray-900">
                  {guide.name}
                </h3>
              </div>
              
              <div className="ml-8">
                <ul className="space-y-1">
                  {guide.examples.map((example, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Conseils</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Coiffeur et cosmétiques</strong> → Vêtements (apparence personnelle)</li>
            <li>• <strong>Salle de sport</strong> → Santé (bien-être physique)</li>
            <li>• <strong>Netflix, Spotify</strong> → Loisirs (divertissement)</li>
            <li>• <strong>Cadeaux</strong> → Solidarité (geste généreux)</li>
            <li>• <strong>Fournitures scolaires</strong> → Éducation (apprentissage)</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default CategoryHelpModal;



