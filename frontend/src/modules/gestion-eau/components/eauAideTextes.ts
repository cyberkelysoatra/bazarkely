/**
 * Textes d'aide contextuelle du module Gestion Eau (français simple, ton rassurant).
 * Centralisés ici pour rester cohérents et faciles à relire. Chaque entrée = un écran/onglet,
 * avec un `id` stable (clé localStorage `eau_aide_<id>`) + « quoi » (à quoi ça sert) + « comment ».
 */
export interface AideTexte {
  id: string;
  quoi: string;
  comment: string;
}

export const AIDE: Record<string, AideTexte> = {
  dashboard: {
    id: 'dashboard',
    quoi: "Voir d'un coup d'œil l'état de l'eau : stock du bassin, débit des pompes, consommation, pertes (NRW), autonomie et alertes.",
    comment:
      'Tout se met à jour automatiquement avec vos saisies. Surveillez surtout les alertes.',
  },
  releves: {
    id: 'releves',
    quoi: 'Faire les saisies du terrain.',
    comment:
      'Choisissez l’onglet : Bassin (eau du réservoir), Compteur (villas/zones), Tournée (faire le tour) ou Scan (QR).',
  },
  bassinEntree: {
    id: 'bassin-entree',
    quoi: "Enregistrer un volume d'eau ajouté au bassin quand vous le connaissez directement (apport ponctuel ou manuel).",
    comment:
      "Saisissez le volume en m³ + une note, puis « Enregistrer l'entrée ». ℹ️ En fonctionnement normal, l'apport est plutôt calculé automatiquement par le débit des pompes (onglet Débit).",
  },
  bassinNiveau: {
    id: 'bassin-niveau',
    quoi: "Relever la hauteur d'eau du bassin (baguette graduée). L'app la convertit en m³, met à jour le stock et le % de remplissage, et calcule le bilan (consommation / pertes).",
    comment: 'Lisez la hauteur en cm, saisissez-la, validez. À faire plusieurs fois par jour.',
  },
  bassinDebit: {
    id: 'bassin-debit',
    quoi: 'Mesurer le débit des pompes (vitesse de remplissage).',
    comment:
      "Fermez la vanne de sortie, notez le niveau de départ (cm), attendez une durée (min), notez le niveau d'arrivée → l'app calcule le débit (m³/h). À faire quelques nuits par mois pour vérifier que le débit reste stable. Ce débit sert ensuite à estimer la consommation réseau quand la vanne est ouverte.",
  },
  saisieCompteur: {
    id: 'saisie-compteur',
    quoi: "Relever l'index d'un compteur. La consommation = index relevé − index précédent.",
    comment:
      "Cherchez ou scannez le compteur, saisissez l'index affiché. Un index plus bas que le précédent = compteur remplacé ou erreur (l'app vous demande confirmation).",
  },
  tournee: {
    id: 'tournee',
    quoi: 'Relever tous les compteurs dans l’ordre sans en oublier.',
    comment:
      'Suivez la liste ; la progression (X/N) avance à chaque relevé ; vous pouvez reprendre où vous vous êtes arrêté.',
  },
  scan: {
    id: 'scan',
    quoi: 'Aller droit au but avec un QR.',
    comment:
      'Scannez le QR collé sur un compteur → la saisie de ce compteur s’ouvre. Un client qui scanne son propre QR voit sa page.',
  },
  anomalies: {
    id: 'anomalies',
    quoi: 'Repérer les écarts (fuites, pertes).',
    comment:
      'Chaque relevé de niveau crée un bilan ; filtrez les anomalies et marquez-les « traitées ».',
  },
  tendances: {
    id: 'tendances',
    quoi: "Comprendre l'évolution : consommation, niveau, NRW, plus gros consommateurs.",
    comment: 'Lisez les graphiques ; ils se remplissent au fil des relevés.',
  },
  tendancesConsoEstimee: {
    id: 'tendances-conso-estimee',
    quoi: "Estimation de la consommation calculée à partir du débit des pompes et des niveaux relevés (apport = débit × durée − variation du bassin), en attendant l'installation des compteurs.",
    comment:
      "La courbe pleine est estimée à partir des relevés ; la partie en pointillés est une projection quand les relevés tardent (basée sur la tendance des 3 derniers jours), pour ne pas afficher 0 par erreur. Une absence de relevé n'est pas une consommation nulle. Les pertes réseau (~30 %) sont déduites. Dès l'installation des compteurs, l'affichage repasse sur la consommation mesurée.",
  },
  compteurs: {
    id: 'compteurs',
    quoi: 'Gérer la liste des compteurs, leurs QR et la carte.',
    comment:
      '« + Nouveau » pour créer ; bouton QR pour générer/imprimer ; onglet Carte pour les situer.',
  },
  facturation: {
    id: 'facturation',
    quoi: 'Facturer la consommation par période.',
    comment:
      'Choisissez la période → les factures se calculent (conso × tarif) ; marquez payé/impayé ; exportez en PDF/CSV.',
  },
  config: {
    id: 'config',
    quoi: 'Régler le bassin (hauteur flotteur = arrêt des pompes, trop-plein = sécurité), le tarif, les seuils d’alerte et la zone de la carte.',
    comment:
      'Saisissez les dimensions → les déductions (volume utile, m³ par cm…) s’affichent automatiquement.',
  },
  utilisateurs: {
    id: 'utilisateurs',
    quoi: 'Gérer les accès.',
    comment:
      'Cochez Administrateur/Releveur ; créez un compte client (avec compteurs + code d’enrôlement) ; les demandes d’accès se valident dans l’onglet Demandes.',
  },
  demandes: {
    id: 'demandes',
    quoi: 'Gérer les demandes d’accès des nouveaux utilisateurs.',
    comment: 'Validez ou refusez chaque demande ; un compte validé reçoit ses compteurs.',
  },
  invitations: {
    id: 'invitations',
    quoi: 'Inviter quelqu’un de deux façons : par email (vous connaissez son adresse Google) ou par lien WhatsApp (vous n’avez que son numéro). Dans les deux cas son accès s’ouvre tout seul à sa connexion. Vous gérez aussi ici les demandes d’accès reçues.',
    comment:
      'Choisissez l’onglet « Email » ou « WhatsApp ». • Email : renseignez l’adresse Google ; ⚠️ la personne DOIT se connecter avec EXACTEMENT cette adresse. • WhatsApp : renseignez juste le numéro et la durée de validité du lien ; l’app crée un lien d’invitation unique « gestion-eau.../i/... » — la personne l’ouvre, voit le niveau du bassin, puis se connecte avec LE COMPTE GOOGLE DE SON CHOIX (aucune adresse imposée). Dans les deux cas, choisissez le rôle (Administrateur / Releveur / Client — pour un client, ses compteurs) et appuyez sur « Envoyer sur WhatsApp » : un message tout prêt s’ouvre. Vous pouvez aussi « Copier le lien ». Plus bas, suivez les invitations envoyées (renvoyer / révoquer) et les demandes d’accès à valider.',
  },
  annonces: {
    id: 'annonces',
    quoi: 'Informer (promo Club House, événements, vie du village).',
    comment: 'Créez une annonce → elle défile dans le bandeau en haut.',
  },
  audit: {
    id: 'audit',
    quoi: 'Tracer qui a fait quoi et quand (+ journal des scans).',
    comment: 'Consultez la liste ; utile en cas de litige.',
  },
  client: {
    id: 'client',
    quoi: 'Suivre votre consommation et vos factures.',
    comment:
      'Consultez vos compteurs et téléchargez vos factures ; votre QR ouvre directement cette page.',
  },
  accueil: {
    id: 'accueil',
    quoi: 'Rejoindre l’application.',
    comment:
      '« J’ai un code » (donné par l’admin) ou « Demander un accès » ; vous pouvez aussi installer l’app sur l’écran d’accueil du téléphone.',
  },
  alertes: {
    id: 'alertes',
    quoi: 'Être prévenu des problèmes : bassin bas, compteur non relevé, fuite suspectée, débit instable.',
    comment:
      'Activez les notifications pour les recevoir sur le téléphone ; « Générer » met la liste à jour ; marquez chaque alerte « traitée ».',
  },
  carte: {
    id: 'carte',
    quoi: 'Situer les compteurs sur une carte, même sans connexion.',
    comment:
      '« Télécharger la carte de la zone » pour l’avoir hors-ligne ; la zone se règle en Configuration. Touchez un repère pour voir le compteur.',
  },
  rapports: {
    id: 'rapports',
    quoi: 'Faire la synthèse mensuelle (entrées, consommation, pertes, anomalies, factures) à partager.',
    comment: 'Choisissez le mois → exportez le rapport en PDF.',
  },
};
