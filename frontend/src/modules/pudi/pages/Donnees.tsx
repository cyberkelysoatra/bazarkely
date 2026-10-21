// Public page « Données personnelles »: the full information notice of the consultation.
// Static text only (works offline once loaded, no server call).
import { Page } from '../composants/Mise';
import { Icone, type NomIcone } from '../composants/Icones';

export const EMAIL_GIHTNB = 'info.gihtnb@gmail.com';

const SECTIONS: { icone: NomIcone; titre: string; textes: string[]; contact?: boolean }[] = [
  {
    icone: 'personnes',
    titre: 'Qui est responsable ?',
    textes: [
      "Le GIHTNB (Groupement Interprofessionnel de l'Hôtellerie et du Tourisme de Nosy Bé), facilitateur de la consultation, est responsable de ces données. La consultation est conduite sous la coordination de la Préfecture de police de Nosy Be."
    ]
  },
  {
    icone: 'info',
    titre: 'Pourquoi ces données ?',
    textes: [
      'Recueillir l’avis des parties prenantes du PIC3 sur les programmes du PUDi de Nosy Be les plus urgents.',
      'Garantir un vote par compte Google et éviter qu’un même numéro serve à plusieurs comptes.',
      'Mesurer la portée des réseaux des partenaires de la démarche.'
    ]
  },
  {
    icone: 'liste',
    titre: 'Quelles données ?',
    textes: [
      'Votre adresse e-mail Google, votre fokontany, votre profil, votre choix (3 priorités, urgents, projet manquant) et votre numéro de téléphone.',
      'Le numéro et l’adresse internet sont transformés aussitôt en empreintes codées : ils ne sont jamais enregistrés en clair.'
    ]
  },
  {
    icone: 'diffusion',
    titre: 'Comparaison avec les listes des partenaires',
    textes: [
      'Votre numéro est comparé, sous forme codée, aux listes de contacts fournies par les partenaires de la démarche (PIC, Préfecture, ORT, Délégation du tourisme, GIHTNB). Ces listes sont elles aussi transformées en empreintes dès leur arrivée.',
      'Cette comparaison sert seulement à compter les votes venus de nos réseaux : elle ne révèle ni votre nom ni votre numéro.'
    ]
  },
  {
    icone: 'oeilBarre',
    titre: 'Ce qui n’est jamais publié',
    textes: [
      'Votre adresse e-mail, votre numéro et votre vote individuel ne sont jamais publiés. Les résultats montrent seulement des totaux.',
      'Les fichiers remis aux organisateurs ne contiennent ni adresse e-mail ni numéro de téléphone.'
    ]
  },
  {
    icone: 'poubelle',
    titre: 'Suppression',
    textes: ['Toutes les données personnelles de la consultation sont supprimées le 28 janvier 2027. Seuls les résultats agrégés sont conservés.']
  },
  {
    icone: 'bouclier',
    titre: 'Cadre légal',
    textes: ['Loi n° 2014-038 sur la protection des données à caractère personnel.']
  },
  {
    icone: 'alerte',
    titre: 'Limites',
    textes: [
      'Un compte Google par personne n’est pas garanti. La résidence à Nosy Be est déclarée, sans vérification.',
      'La consultation est indicative : elle éclaire la priorisation du PUDi sans la remplacer.'
    ]
  },
  {
    icone: 'aide',
    titre: 'Poser une question au GIHTNB',
    textes: [
      'Pour accéder à vos données, les corriger ou demander leur suppression avant la date prévue, écrivez au GIHTNB.',
      'Indiquez l’adresse e-mail du compte Google utilisé pour voter. Ne publiez jamais votre numéro dans un groupe.'
    ],
    contact: true
  }
];

export default function Donnees() {
  return (
    <Page titre="Données personnelles">
      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <section key={s.titre} className="bg-white border border-filet rounded-xl p-4">
            <h2 className="flex items-center gap-2 font-bold text-[16px] text-marine">
              <Icone nom={s.icone} className="w-5 h-5" />
              {s.titre}
            </h2>
            {s.textes.map((t) => (
              <p key={t} className="mt-2 text-[15px] leading-relaxed">
                {t}
              </p>
            ))}
            {s.contact && (
              <p className="mt-2 text-[15px] leading-relaxed">
                Pour toute question sur vos données ou sur la consultation :{' '}
                <a href={`mailto:${EMAIL_GIHTNB}`} className="font-bold text-marine underline underline-offset-2 break-all">
                  {EMAIL_GIHTNB}
                </a>
              </p>
            )}
          </section>
        ))}
      </div>
    </Page>
  );
}
