export const APP_VERSION = '3.92.0';
export const APP_VERSION_NAME = "NAVY ay : l’appli Android se met à jour elle-même, sans jamais ressembler à une première installation.";
export const LAST_UPDATED = '2026-09-29';
export const APP_BUILD_DATE = '2026-09-29';
export const VERSION_HISTORY = [
  {
    version: '3.92.0',
    date: '2026-09-29',
    description:
      "NAVY ay phase 3C : l’appli Android se met à jour depuis l’appli elle-même, avec un message clair « Mise à jour disponible ».",
    changes: [
      "Appli Android 1.2.0 et suivantes : bandeau « Mise à jour disponible : X (vous avez Y) », téléchargement dans l’appli avec sa progression, fichier vérifié, puis l’écran de mise à jour d’Android s’ouvre directement.",
      "Appli 1.1.0 : même bandeau, et un écran qui explique le dernier passage par Chrome.",
      "Page 1sakely.org/navy/app : dans l’appli, uniquement la mise à jour ; dans Chrome, « Vous avez déjà NAVY ay ? » avant la première installation.",
      "Page Mise à jour depuis NAVY : « Site » et « Appli Android » sur deux lignes, plus de « Mode navigateur » dans l’appli, accents et caractères de l’historique réparés.",
      "Réglages de l’appli : bouton « Envoyer mon rapport » (batterie, écran, positions envoyées, jamais l’endroit), aussi envoyé seul à « Pas disponible ».",
      "Carte vivante : une position moins précise que 100 m ne fait plus bouger le véhicule et ne donne plus de vitesse."
    ]
  },
  {
    version: '3.91.1',
    date: '2026-09-29',
    description:
      "NAVY ay : l’arrêt après 1 heure d’immobilité marche aussi quand le GPS du téléphone est imprécis (à l’intérieur).",
    changes: [
      "Une position peu précise ne compte plus comme un déplacement : l’arrêt automatique du chauffeur immobile se déclenche bien après 1 heure."
    ]
  },
  {
    version: '3.91.0',
    date: '2026-09-28',
    description:
      "NAVY ay phase 3B : avec l’appli Android 1.1.0, la position du chauffeur part même écran éteint et les courses sonnent comme un appel.",
    changes: [
      "Appli Android : position envoyée toutes les 30 secondes même écran éteint, seulement quand le chauffeur est disponible ou en course, avec une notification permanente et un bouton Pas disponible.",
      "Appli Android : une course arrive comme un appel (écran allumé, sonnerie, Accepter / Refuser), 30 secondes au plus.",
      "Appli Android : écran guidé au premier lancement (notifications, position Toujours, alerte plein écran, batterie, test final).",
      "Un chauffeur disponible immobile depuis 1 heure (réglable par l’opératrice) passe Pas disponible et reçoit une notification.",
      "Site : bandeau Installez l’appli pour les chauffeurs ; barre du bas NAVY sur une ligne ; menu du haut NAVY simplifié ; page Version aux couleurs NAVY depuis NAVY."
    ]
  },
  {
    version: '3.90.0',
    date: '2026-09-28',
    description:
      "NAVY ay phase 3A : une petite appli Android qui affiche le même NAVY ay que le site, avec la connexion Google, et une page pour la télécharger.",
    changes: [
      "Nouvelle page publique 1sakely.org/navy/app : bouton de téléchargement, 3 étapes d’installation, QR code de la page.",
      "Dans l’appli, la connexion Google s’ouvre dans un onglet Chrome puis revient dans l’appli, sur la page de départ.",
      "Dans l’appli, un bandeau discret signale une nouvelle version de l’appli ; l’écran Version affiche la version de l’appli Android.",
      "Sur le site web, rien ne change."
    ]
  },
  {
    version: '3.89.0',
    date: '2026-09-27',
    description:
      "NAVY ay phase 2C3 : la carte devient vivante, les chauffeurs disponibles roulent en direct et la carte suit votre colis.",
    changes: [
      "Chauffeurs disponibles en direct sur la carte (position a 200 m pres, envoyee toutes les 30 secondes seulement quand ils sont disponibles et que NAVY ay est ouverte) ; entre deux positions, le vehicule avance le long de sa route.",
      "Fiche du vehicule : vitesse et distance de vous. Gris : position incertaine ; blanc a bord pointille : position non suivie.",
      "Suivi d une course : position exacte du chauffeur, la carte suit l approche puis le trajet, bouton Recentrer, et Sortez maintenant a moins de 300 m pour une remise dans la rue.",
      "Obstacles (travaux, route inondee, passage ferme) : l operatrice les trace dans Zones, onglet Obstacles ; les chauffeurs peuvent en signaler ; affiches sur toutes les cartes et evites par les itineraires.",
      "Ma direction : le chauffeur voit clairement quand sa position est partagee."
    ]
  },
  {
    version: '3.88.0',
    date: '2026-09-27',
    description:
      "NAVY ay phase 2C2 : l’accueil du client devient la carte de Nosy Be, et l’envoi d’un colis se fait par-dessus la carte.",
    changes: [
      "Accueil client : carte plein ecran centree sur votre position (lue une seule fois), epiceries ouvertes, chauffeurs disponibles la ou ils vont ; choix Un colis, Un taxi ou Mes courses (bientot) et gros bouton J envoie un colis a.",
      "Destinataire : choix dans les contacts du telephone (Chrome Android) ou saisie, destinataires recents ; s il est sur NAVY ay, son epicerie habituelle devient l arrivee.",
      "Route tracee sur la carte avec la distance ; toucher votre point ou l epicerie d arrivee pour les changer ; depart dans la rue ou chez un epicier.",
      "Chaque chauffeur affiche son prix pour votre colis ; sa fiche montre le vehicule, la plaque, le prenom et ou il va ; Lui proposer mon colis, 30 secondes pour accepter, avec un compte a rebours.",
      "Nouvel ecran Mon epicerie de retrait (menu en haut a droite).",
      "Suivi du colis affiche par-dessus la carte avec le trajet."
    ]
  },
  {
    version: '3.87.1',
    date: '2026-09-27',
    description:
      "NAVY ay : carte de l’île affichée dès la première ouverture en ligne sur 1sakely.org, vu en production.",
    changes: [
      "Le serveur de l application envoie le fichier de carte en entier au lieu de morceaux : le telephone le lit alors en un seul telechargement (1,5 Mo), le garde aussitot pour le hors ligne et ne le telecharge plus une seconde fois.",
      "Deux cartes ouvertes ensemble sur un meme ecran partagent ce telechargement."
    ]
  },
  {
    version: '3.87.0',
    date: '2026-09-27',
    description:
      "NAVY ay phase 2C1 : nouvelle carte vectorielle de Nosy Be aux couleurs NAVY, utilisable hors ligne, sur tous les écrans NAVY.",
    changes: [
      "Carte : fichier de l ile entiere (1,5 Mo) servi avec l application ; mer vert-de-gris, terre claire, routes blanches, petites rues et pistes en tirets, noms des villages en capitales, Hell-Ville en plus gros ; jaune et anthracite reserves aux zones, epingles et epiceries.",
      "Hors ligne : a la premiere ouverture en ligne, le telephone garde toute la carte de l ile ; elle s affiche ensuite sans reseau. Une nouvelle carte remplace l ancienne ; l ancien cache de morceaux de carte est supprime.",
      "Memes gestes qu avant : toucher pour poser, epingle et points de zone deplacables au doigt, Ma position lue une seule fois, carte toujours nord en haut.",
      "Vieux telephone sans carte vectorielle : bascule toute seule sur l ancienne carte."
    ]
  },
  {
    version: '3.86.1',
    date: '2026-09-27',
    description:
      "NAVY ay : colis retour sans téléphone de l’expéditeur affiché sans point vide, vu en production.",
    changes: [
      "Suivi du colis et ecran epicier : le destinataire s affiche sans le separateur quand son telephone est inconnu (colis retour)."
    ]
  },
  {
    version: '3.86.0',
    date: '2026-09-27',
    description:
      "NAVY ay phase 2B2 : remise directe au chauffeur et retour payé d’avance d’un colis non retiré.",
    changes: [
      "Envoyer : nouveau depart Je remets le colis au chauffeur (Orange Money uniquement) ; lieu de remise pose sur la carte, repere, telephone ; pas de tarif de depot, part NAVY repartie sur les deux autres lignes ; distance par la route calculee par le serveur.",
      "Remise : photo du contenu ouvert (privee, visible du client, du chauffeur de la course et de l operatrice, supprimee 30 jours apres la fin du colis sauf litige) ; le client voit nom, photo du vehicule et plaque du chauffeur et peut l appeler ; double confirmation client puis chauffeur (ou QR du chauffeur scanne).",
      "Chauffeur : lieu de remise, appel du client, photo du contenu, droit de refus motive ; le client choisit alors un autre chauffeur ou l annulation en avoir.",
      "Retour : cree tout seul a Retour a organiser, prix d un colis en sens inverse aux tarifs du jour, fige, paye d avance (avoir puis Orange Money), aucune offre avant paiement, rappel 24 h et alerte operatrice 3 jours, nouveau code de retrait pour l expediteur.",
      "Reglages : majoration de la distance estimee (30 % par defaut, 0 a 150 %). Telephone : liste des epiceries remplacee a chaque reponse du serveur, gestes des colis termines retires d office.",
      "Securite : suppression d un compte par l administrateur verifiee sur le compte de connexion et interdite aux visiteurs non connectes."
    ]
  },
  {
    version: '3.85.1',
    date: '2026-09-26',
    description:
      "NAVY ay : distances écrites à la française (10,1 km au lieu de 10.1 km), vu en production.",
    changes: [
      "Envoyer, suivi du colis, offres et courses du chauffeur, liste des epiceries : virgule decimale et une decimale au plus."
    ]
  },
  {
    version: '3.85.0',
    date: '2026-09-26',
    description:
      "NAVY ay phase 2B1 : distances par la route, prix proposé par le client, contre-proposition, couloir autour du trajet et avoir NAVY.",
    changes: [
      "Distances entre epiceries calculees par la route (OpenRouteService) en une seule demande, recalcul cible quand une epicerie est validee ou deplacee, gardees sur le telephone (hors ligne) ; repli a vol d oiseau + 30 % si le service ne repond pas.",
      "Envoyer : troisieme choix Je propose mon prix (minimum = tarifs des deux epiciers + part NAVY, multiple de 100 Ar) ; la course part a tous les chauffeurs en meme temps, le premier qui accepte l emporte.",
      "Contre-proposition : si aucun chauffeur n accepte au prix paye, jusqu a 3 chauffeurs plus proches a un autre prix ; supplement paye par l avoir, en especes au depot ou par Orange Money avant tout appel du chauffeur.",
      "Chauffeur : une seule lecture GPS quand il se declare disponible ou change de direction ; son trajet recoit aussi les colis dont l epicerie d arrivee est a moins de 500 m (reglable) ; position effacee a l expiration. Reglage Masquer les offres inferieures a mon tarif.",
      "Avoir NAVY : journal de mouvements, deduit automatiquement a la commande suivante et sur un supplement, visible dans Mes colis, jamais rembourse en especes.",
      "Operatrice (Reglages) : largeur du couloir, bouton Recalculer les distances, date du dernier calcul et nombre de demandes du mois."
    ]
  },
  {
    version: '3.84.2',
    date: '2026-09-26',
    description:
      "NAVY ay : finitions d’affichage vues en production pendant la validation des colis.",
    changes: [
      "Suivi d un colis : les zones de depart et d arrivee s affichent (la page ne chargeait pas la liste des zones et ecrivait hors zone).",
      "Cartes chauffeur et epicier : un ancien message (par exemple Garde sur ce telephone) disparait quand le colis passe a l etape suivante.",
      "Retrait : le message Code correct reste affiche quelques secondes avant que le colis quitte la liste."
    ]
  },
  {
    version: '3.84.1',
    date: '2026-09-26',
    description:
      "NAVY ay : deux correctifs vus en production pendant la validation des colis.",
    changes: [
      "Offre chauffeur : le compte a rebours suit l horloge du serveur (le telephone affichait 38 s alors qu il en restait bien moins, l acceptation etait alors refusee comme trop tardive).",
      "Ecran Colis de l epicier : le gain affiche ne compte que la ligne de sa boutique (un epicier qui envoie lui-meme un colis voyait le total de toutes les lignes)."
    ]
  },
  {
    version: '3.84.0',
    date: '2026-09-26',
    description:
      "NAVY ay phase 2A : un colis fait tout le trajet, de l’épicerie de départ jusqu’au retrait par le destinataire.",
    changes: [
      "Client : Envoyer (destinataire, epiceries de depart et d arrivee sur la carte ou en liste, contenu et valeur declaree plafonnee a 50 000 Ar, chauffeur automatique ou choisi, prix detaille, especes ou Orange Money), Mes colis, A recevoir, suivi Accepte / En route / Livre, code colis et code de retrait.",
      "Prix calcule et fige par le serveur : tarifs des deux epiciers + transport (distance estimee a vol d oiseau + 30 %) + part CyberKELY fixe, total arrondi aux 100 Ar ; chauffeur moins cher que le prix paye = avoir du au client.",
      "Epicier : onglet Colis (depot, remise au chauffeur avec double confirmation ou scan de son QR, reception, retrait par code verifie par le serveur et bloque apres 5 essais).",
      "Chauffeur : offres en plein ecran avec 30 secondes pour accepter, passage automatique au suivant, relance toutes les 5 minutes ; onglet Courses.",
      "Operatrice : Colis (alertes : sans chauffeur 30 min, non retire 3 et 7 jours, code bloque) et Paiements Orange Money ; part CyberKELY et numero Orange Money dans Reglages ; Zones accessible depuis Reglages.",
      "Delais tenus par le serveur (tache planifiee toutes les 10 s) et notification a chaque etape, sans montant ni code de retrait.",
      "Reports de la 1B corriges : fiches supprimees sur le serveur retirees du telephone ; formulaire Corriger ma demande prerempli meme ouvert directement."
    ]
  },
  {
    version: '3.83.2',
    date: '2026-09-26',
    description:
      "Web Push : notifications avec contenu réellement reçues, et abonnement plus patient au démarrage.",
    changes: [
      "Fonction serveur send-push : le contenu des notifications est chiffre avec WebCrypto (norme RFC 8291). Le chiffrement de la bibliotheque web-push ne fonctionne pas sous Deno : Google acceptait le message mais Chrome le jetait sans rien dire.",
      "Abonnement : jusqu a 15 s pour repondre au lieu de 5 s (au demarrage, la demande attend derriere une cinquantaine de synchronisations)."
    ]
  },
  {
    version: '3.83.1',
    date: '2026-09-26',
    description:
      "Web Push : un seul abonnement à la fois par navigateur, et journal de réception des notifications.",
    changes: [
      "Correctif : deux demandes d abonnement simultanees se remplacaient l une l autre et laissaient un abonnement mort en base (vu en production). Une seule demande a la fois desormais.",
      "Le service worker note les 10 dernieres notifications recues (titre et heure), pour pouvoir prouver la reception meme quand le centre de notifications du systeme n est pas lisible."
    ]
  },
  {
    version: '3.83.0',
    date: '2026-09-26',
    description:
      "Web Push phase 1 : socle des notifications envoyées par le serveur, reçues même application fermée.",
    changes: [
      "Activer les notifications abonne aussi ce navigateur aux notifications a distance (table push_subscriptions, un seul abonnement par navigateur, ecriture sans doublon). La permission n est jamais demandee au lancement.",
      "Un seul service worker : les gestionnaires push / clic / fermeture du fichier orphelin sw-notifications.js sont rapatries dans sw-custom.ts, le fichier est supprime. Message par defaut si la notification recue est vide ou abimee.",
      "Fonction serveur send-push : reservee a un administrateur (role verifie sur le serveur) ou a l application elle-meme (secret interne). Abonnement mort (404/410) supprime, echecs repetes supprimes au-dela de 5.",
      "notify_users() cote base : point d entree pour les evenements de l application (colis NAVY a venir), inaccessible aux comptes ordinaires. Cles et secret dans le coffre Supabase, jamais dans le code.",
      "useNotifications rebranche sur le vrai service (permission, preferences, notification immediate) ; alertes budget / objectifs laissees coupees (elles se repeteraient a chaque ouverture du tableau de bord)."
    ]
  },
  {
    version: '3.82.0',
    date: '2026-09-25',
    description:
      "NAVY ay phase 1B : carte, zones, position des épiceries, direction des chauffeurs, demandes de modification, conservation des pièces.",
    changes: [
      "Carte NAVY commune (Leaflet + OpenStreetMap) : doigt, pincement, bouton Ma position, epingle deplacable ; hors ligne, morceaux deja vus gardes (au plus ~800 tuiles, jamais de telechargement en masse).",
      "Operatrice > Zones : dessin point par point, nom, couleur douce, ordre (la premiere zone l emporte en cas de chevauchement). Zone des epiceries et des destinations calculee par le serveur.",
      "Position de la boutique dans Devenir epicier et Mon epicerie ; bouton Position verifiee sur place cote operatrice, position figee ensuite (ecran et serveur).",
      "Chauffeur > Direction : Disponible en touchant la destination, expiration seule apres 3 h avec rappel ; hors ligne gardee puis envoyee sans doublon. Operatrice > Chauffeurs disponibles.",
      "Demander une modification (vehicule, boutique, papiers) : repasse en validation, ancien profil actif jusque-la ; onglet Modifications avec ancien et nouveau cote a cote.",
      "Refus a corriger ou definitif (photos supprimees), motif de suspension distinct, Mettre fin au partenariat (pieces supprimees 12 mois apres). Bouton de purge des pieces arrivees a echeance.",
      "Securite : chaque chemin de document doit rester dans le dossier de son titulaire (correctif issu de la revue de securite)."
    ]
  },
  {
    version: '3.81.1',
    date: '2026-09-25',
    description:
      "Aperçu WhatsApp des liens NAVY ay : titre, description et grande image propres à NAVY ay sur /navy, /navy/* et /ouvrir/navy.",
    changes: [
      "Fonctions Cloudflare Pages functions/navy/_middleware.ts et functions/ouvrir/_middleware.ts (cette derniere n agit que sur /ouvrir/navy) : balises og:* / twitter:* NAVY ay injectees dans le HTML, textes fixes, aucun appel reseau.",
      "Logique partagee dans functions-lib/navyOg.ts (hors functions/, donc pas une route).",
      "Image d apercu 1200 x 630 : /navy-ay/og-navy.png.",
      "Aucun changement pour la racine, le budget, la Gestion Eau et les invitations /i/* ; l application elle-meme est inchangee."
    ]
  },
  {
    version: '3.81.0',
    date: '2026-09-25',
    description:
      "NAVY ay phase 1A : profils partenaires (épicier, chauffeur), circuit de validation par une opératrice, tarifs, QR code personnel et page publique.",
    changes: [
      "SQL (idempotent) : tables navy_partners, navy_operators, navy_settings, navy_referrals ; RLS activee et forcee, anon sans aucun droit, privileges par colonne (le titulaire ne touche jamais au statut) ; fonctions navy_is_operator, navy_decide_partner, navy_resubmit_partner, navy_public_partner, navy_designate_operator, navy_find_user_by_email, navy_list_operators, navy_record_referral.",
      "Espace de stockage PRIVE navy-documents (pieces d identite = donnees personnelles sensibles) : dossier par titulaire, lecture titulaire + operatrices, liens signes de courte duree.",
      "Roles cumulables Client / Epicier / Chauffeur / Operatrice, selecteur Je suis dans l en-tete (hauteur 89 px inchangee), choix memorise dans preferences.navyRole, barre du bas par role avec pastille des demandes en attente.",
      "Devenir partenaire : formulaires epicier et chauffeur, 4 photos compressees sur le telephone (1600 px, JPEG 0,7), brouillon garde sur l appareil (base NavyAyDB), id cree sur le telephone et reutilise a chaque essai (upsert, aucun doublon), envoi automatique au retour du reseau.",
      "Etat de la demande : en attente, validee, refusee avec motif (corriger et renvoyer), suspendue.",
      "Mon epicerie (Ouvert / Ferme, tarifs depot et retrait, tarif conseille), Mon vehicule (prix minimum et par tranche de 5 km, prerempli 1000 / 1000, exemple en direct).",
      "Mon QR : carte PNG a imprimer (logo, nom, immatriculation en gros pour un chauffeur) ; page publique /navy/p/:id sans connexion, parrainage enregistre une seule fois apres connexion.",
      "Espace operatrice (en ligne seulement) : Demandes, detail avec photos, Valider / Refuser avec motif ; Partenaires avec filtre et Suspendre / Reactiver ; Reglages des tarifs conseilles et ajout d une operatrice par e-mail.",
      "Correctifs : /app-version et /pwa-instructions gardent la barre du module precedent pour un compte sans budget ; selecteur a un seul module : message au lieu d une rangee vide.",
      "11 nouveaux tests Vitest (calcul du prix, roles, validation des demandes, preference navyRole)."
    ]
  },
  {
    version: '3.80.0',
    date: '2026-09-24',
    description:
      "NAVY ay phase 0 : socle d’accès aux modules, dernier module mémorisé sur le compte, coquille du module /navy et page d’entrée publique.",
    changes: [
      "Nouveau module navy-ay (/navy) : coquille (NavyRoute, NavyRoutes), page d accueil NavyHomePage (presentation, aide depliable, etat hors ligne), charte jaune ylang-ylang / anthracite (tokens Tailwind navyay).",
      "Regles d acces aux modules (users.preferences.modules) : NAVY ay pour tout compte, budget apres le lien /ouvrir/budget, Eau et Construction selon leur logique existante, admin voit tout. Selecteur filtre.",
      "Garde d interface du budget (BudgetAccessRoute) : un compte sans budget est renvoye sur /navy ; jamais de rejet sur un etat non confirme (demarrage a froid).",
      "Dernier module (preferences.lastModule) : ecrit en local et sur le compte a chaque vrai changement de module, repris a l ouverture sur / ou /dashboard (le plus recent des deux).",
      "Synchro des preferences idempotente (modulePrefsSync) : file locale, relecture du serveur puis fusion, sans jamais ecraser moduleOrder.",
      "Liens d ouverture /ouvrir/budget et /ouvrir/navy ; ecran de connexion aux couleurs NAVY ay sur /navy.",
      "SQL : les 16 comptes existants recoivent modules = [bazarkely].",
      "15 tests Vitest sur les regles pures (acces, module de depart, fusion des preferences)."
    ]
  },
  {
    version: '3.79.0',
    date: '2026-09-15',
    description:
      "Les formulaires Dépense et Transfert ramènent la vue sur leur message d’erreur : fini le clic sur Enregistrer qui semble ne rien faire.",
    changes: [
      "Nouveau hook partage hooks/useScrollToError.ts : remplace l etat d erreur d une page ; a chaque erreur, defilement doux jusqu au bandeau centre a l ecran, focus sur le bandeau, double halo rouge ~1,4 s et courte vibration (Android).",
      "Compteur de tentative : un second clic sur Enregistrer avec un message identique rejoue le defilement et le halo.",
      "prefers-reduced-motion : saut instantane (behavior instant, car html porte scroll-behavior smooth), sans halo ni vibration.",
      "tailwind.config.js : animation additive error-pulse (keyframes errorPulse).",
      "AddTransactionPage : la validation des champs obligatoires, jusqu ici muette, affiche desormais les champs manquants (montant, libelle, categorie, compte).",
      "AddTransactionPage et TransferPage : bandeau d erreur en role alert, aria-live assertive, focusable."
    ]
  },
  {
    version: '3.78.0',
    date: '2026-09-11',
    description:
      "Soldes par mouvements idempotents : un appareil n’envoie plus jamais un solde absolu, et comptes comme budgets se rafraîchissent en arrière-plan.",
    changes: [
      "Nouvelle table Supabase account_balance_movements (RLS activee et forcee, aucune policy d ecriture, anon sans aucun droit) : le journal des mouvements de solde.",
      "Nouvelle fonction serveur apply_balance_movement(id, compte, delta, genre, transaction) SECURITY DEFINER : verrou sur le compte, controle du proprietaire, et surtout idempotence par id — un meme mouvement rejoue n est applique qu une fois.",
      "accountService.applyBalanceMovement : SEUL point d entree pour modifier un solde. Applique le delta en local immediatement (affichage instantane, hors ligne compris), puis appelle le serveur ; en cas de timeout ou d absence de reseau, met en file le MEME identifiant.",
      "transactionService.updateAccountBalanceAfterTransaction, AccountDetailPage, TransactionDetailPage et receiptService passent tous par les mouvements : plus aucun calcul balance + montant suivi d un envoi de total.",
      "accountService.updateAccount ne transmet plus jamais balance, ni a Supabase ni a la file ; un appelant qui en passe un est journalise et ignore cote serveur.",
      "syncManager : rejeu des mouvements via la fonction serveur, echecs definitifs (compte d autrui, compte inexistant) non reessayes, et purge des operations HERITEES accounts/UPDATE portant encore un solde absolu.",
      "accountService.getAccounts et budgetService.getBudgets/getUserBudgets : retour local immediat puis rafraichissement de fond dedoublonne, qui reecrit le solde serveur augmente des mouvements encore en attente et active enfin la reconciliation v3.77.0 sur ces deux stores.",
      "Correction de donnee : le solde du compte CyberKELY, ecrase cote serveur par celui de BMOI, a ete retabli a 1 114 425,03.",
      "16 tests Vitest sur les mouvements (idempotence, timeout, rejeu, file heritee, rafraichissement, budgets proteges)."
    ]
  },
  {
    version: '3.77.0',
    date: '2026-09-10',
    description:
      "Synchro descendante : les lignes supprimées côté serveur sont enfin retirées du cache local, via une mise en quarantaine réversible.",
    changes: [
      "Nouvel utilitaire partage lib/syncReconcile.ts : un seul point de comparaison local/serveur pour les 8 stores concernes (transactions, comptes, budgets, objectifs, recurrentes, prets, remboursements, periodes d interet).",
      "Nouveau store Dexie syncQuarantine (base v18, migration additive) : une ligne retiree est archivee avec sa copie complete, jamais supprimee sechement. restoreFromQuarantine(id) la remet en place depuis la console.",
      "Cinq protections obligatoires : P1 ligne presente dans la file d envoi (tout statut), P2 creation de moins de 60 s, P3 reponse serveur incomplete, P4 reponse serveur vide, P5 cascade prets vers remboursements et periodes.",
      "Lectures paginees par .range(1000) : une reponse n est declaree complete que si toutes les pages ont repondu. Sans cela, Supabase s arretait silencieusement a 1000 lignes.",
      "recurringTransactionService.getAll : ajout du withTimeout manquant sur la requete recurring_transactions, qui pouvait pendre sans jamais aboutir ni lever d erreur.",
      "Aucune ecriture vers Supabase declenchee par la reconciliation : la quarantaine est strictement locale et n entre jamais dans la file de synchronisation.",
      "28 tests Vitest sur syncReconcile (une regle par protection, idempotence, restauration, pagination de 2500 lignes)."
    ]
  },
  {
    version: '3.76.0',
    date: '2026-09-09',
    description:
      "SMS Orange Money Phase 2 bis : une seule transaction par opération (frais inclus, détaillés dans transfer_fee) et garde anti-doublon avant toute écriture.",
    changes: [
      "Une operation avec frais ne cree plus qu UNE transaction : amount = montant + frais, transfer_fee = frais. Plus aucune ligne « Frais - ... ».",
      "Garde anti-doublon : avant d ecrire, recherche d une transaction du meme jour, au montant seul ou frais compris, non issue d un SMS. Si trouvee, rien n est ecrit et la ligne sms_inbox passe a doublon_probable.",
      "La premiere ligne de la chaine des soldes est desormais ecrite : sa concordance est indeterminee, pas fausse.",
      "TransactionDetailPage : ajout strictement additif d une ligne « Frais de transaction » avec l operateur d origine, hors edition.",
      "transfer_fee n entre dans aucun calcul de solde ni de budget (verifie) : les frais ne sont comptes qu une fois, dans amount.",
      "Script SQL idempotent de fusion des 23 lignes de frais deja ecrites par la v3.75.0 (supabase/migrations/2026-09-09-fusion-frais-sms.sql).",
      "66 tests du module sms-inbox au vert."
    ]
  },
  {
    version: '3.75.0',
    date: '2026-09-08',
    description:
      "SMS Orange Money Phase 2 : la transaction est écrite automatiquement dès qu’un SMS est reconnu ET que son solde concorde. Aucun écran existant modifié.",
    changes: [
      "Service ecritureAutomatiqueService : passe de fond declenchee au demarrage, a la connexion et au retour du reseau. Aucune interface, aucune navigation.",
      "Decision deciderEcriture() pure et rejouable : modele reconnu et different d ECHEC, ET solde precedent +/- (montant + frais) EXACTEMENT egal au solde annonce. Aucune tolerance, aucun arrondi.",
      "Frais > 0 : seconde transaction distincte, jamais fondue dans le montant principal.",
      "Rattachement au compte de l operateur (orange_money / mvola / airtel_money), cree au besoin — jamais un compte bancaire.",
      "Idempotence : identifiant de transaction derive de la reference du SMS (UUID v5), verifie contre le vecteur RFC 4122. Rejouer converge sur la meme ligne.",
      "Page brute /sms-inbox listant les SMS non ecrits et leur motif. Liee depuis NULLE PART : aucun bouton, aucune entree de menu.",
      "Corpus des 50 SMS : 48 operations ecrites (71 transactions dont 23 lignes de frais), 2 ecartes — 1 echec operateur, 1 ancre de chaine sans solde precedent.",
      "48 tests (dont 10 d integration bout en bout). Compteur TypeScript inchange : 1984 avant, 1984 apres."
    ]
  },
  {
    version: '3.74.0',
    date: '2026-09-08',
    description:
      "SMS Orange Money Phase 1 : parseur des 8 modèles, contrôle de chaîne des soldes, table sms_inbox + RLS, Edge Function d’ingestion idempotente. Aucune interface utilisateur.",
    changes: [
      "Parseur analyserSms() : 8 modeles reconnus sur les 50 SMS reels du corpus (PP_ENVOI 20, MP_MARCHAND 13, CI_BANQUE 10, CO_RETRAIT 3, CI_DEPOT 1, PP_NOMME 1, MP_OFFRE 1, ECHEC 1).",
      "Normalisation obligatoire avant comparaison : minuscules, accents retires, espaces multiples reduits.",
      "controlerChaine() : tri par l horodatage issu de la REFERENCE (jamais par ordre d arrivee) — 48 maillons verifies, 0 rupture. Test de mutation qui echoue si le tri revient a l ordre d arrivee.",
      "SQL Supabase execute et verifie via REST : sms_inbox (17 colonnes), index unique (user_id, reference), sms_expediteurs_autorises (4 operateurs), sms_appareils (cle hachee SHA-256).",
      "RLS active + force, revoke from anon, policies public avec auth.uid() = user_id. Isolation prouvee par test negatif en rollback.",
      "Edge Function ingest-sms deployee : upsert idempotent sur (user_id, reference), SMS non reconnu conserve en etat non_reconnu, limites 100 SMS / 256 Ko.",
      "Script scripts/rejeu-sms-corpus.ts : 50 SMS rejoues, 48 verifies, 0 rupture, 0 doublon cree au second envoi."
    ]
  },
  {
    version: '3.73.0',
    date: '2026-09-08',
    description:
      "Administration Phase 1 : bandeau d’activité (6 indicateurs), 2 courbes mensuelles, rétention par cohorte, liste utilisateurs enrichie et triée par dernière transaction, accès par users.role au lieu d’un e-mail en dur, et fin de la redirection muette quand la session est expirée.",
    changes: [
      "SQL (Supabase) : users.role passe a 'admin' pour joelsoatra@gmail.com — verifie via REST AVANT toute modification de code.",
      "SQL : nouvelle fonction admin_is_current_user_admin() (SECURITY DEFINER, lit users.role pour auth.uid()).",
      "SQL : nouvelle RPC get_admin_activite() — 6 indicateurs, series mensuelles depuis octobre 2025 et cohortes M+1/M+2/M+3, calcules cote serveur au fuseau Indian/Antananarivo (jamais en UTC : 3 h d ecart faussent les journees). Renvoie aussi un diagnostic de fiabilite de last_login_at.",
      "SQL : nouvelle RPC get_admin_utilisateurs() — utilisateurs + nombre de transactions + date de la derniere transaction + last_login_at + updated_at, triee par derniere transaction decroissante. Remplace get_all_users_admin cote client (fonction historique conservee intacte).",
      "SQL : revoke execute ... from anon sur les 3 fonctions (un revoke from public ne suffit pas, Supabase accorde EXECUTE explicitement a anon) + grant to authenticated. Test negatif verifie : un non-admin recoit 'Access denied: admin only', l anonyme recoit 42501.",
      "adminService.isAdmin() : lit users.role via withTimeout(5 s) ; si la lecture echoue ou est indisponible (hors ligne), filet de securite sur l adresse joelsoatra@gmail.com ; sinon refus. Plus aucune adresse en dur comme unique critere.",
      "adminService : suppression de TOUS les supabase.auth.getUser() (fetch HTTP qui plante hors ligne). Nouvel helper getCurrentUserSafe() — store Zustand, puis getSession() (lecture localStorage), puis null.",
      "adminService.getAccessState() : 'admin' / 'denied' / 'no-session', avec cache court de 15 s (la page l interrogeait 4 fois par chargement).",
      "adminService : detection des refus serveur faute de jeton valide (42501 / permission denied / JWT) remontee comme SESSION_EXPIREE — l application paraissait connectee grace a son cache local alors que la session etait morte.",
      "adminService : withTimeout() ajoute sur les requetes goals et transactions de l ecran admin (aucune requete DB sans delai maximal).",
      "AdminPage : bandeau d activite (6 cartes), 2 courbes Recharts (isAnimationActive={false} sur chaque serie ET sur les info-bulles, obligatoire avec React 19 + Recharts 3) avec etat vide soigne, tableau de retention par cohorte avec ligne de totaux.",
      "AdminPage : liste utilisateurs enrichie (nombre de transactions, derniere transaction, derniere connexion, date de modification) + pastille d etat Actif / Dormant / Jamais revenu / Fantome.",
      "AdminPage : ecran « Session expiree, reconnecte-toi pour acceder a l administration » avec bouton de reconnexion, au lieu de la redirection muette vers /dashboard. La redirection reste pour un utilisateur identifie mais non admin.",
      "AdminPage : mise en page revue pour 412 px (grilles 2 colonnes, min-w-0 + truncate, tableau de cohortes dans un conteneur a defilement horizontal propre) — aucun debordement horizontal du document.",
      "Fiabilite de last_login_at VERIFIEE : la colonne n est ecrite par aucun code client ni par aucun declencheur ; 14 comptes sur 16 portent la date de leur inscription. Les dates inexploitables s affichent « inconnue » et un bandeau d avertissement l explique.",
      "types/supabase.ts : declaration des 3 nouvelles fonctions RPC.",
      "Aucun fichier partage de navigation ou d en-tete modifie (Header.tsx, BottomNav.tsx, ModuleSwitcherContext.tsx intacts).",
      "constants/appVersion.ts + package.json : version 3.73.0 + note FR",
    ],
  },
  {
    version: '3.72.1',
    date: '2026-08-22',
    description:
      'Correctif header partage : la pastille doree « Simulation » debordait a droite et faisait deborder tout le document horizontalement sur telephone (defilement lateral parasite, sticky qui saute). Hygiene flexbox de la barre de titre + mode compact pendant une simulation. Aucun changement de logique.',
    changes: [
      'Header.tsx (PARTAGE, 3 modules) : min-w-0 sur le bloc gauche et sur le bloc titre — sans lui, un enfant flex ne peut pas retrecir sous la largeur de son contenu, ce qui rendait truncate et max-w INOPERANTS et poussait la largeur du document au-dela du viewport.',
      'Header.tsx : logo flex-shrink-0 (jamais ecrase) et conteneur de droite flex-shrink-0 (les actions ne sont jamais poussees hors ecran). Titre et sous-titre passent en truncate (coupe propre) au lieu de forcer la largeur (le sous-titre eau portait whitespace-nowrap, largeur incompressible ~250px).',
      'Header.tsx : AUCUN overflow-hidden ajoute sur le <header>, la rangee ou le conteneur px-4 — ce sont les ancetres des menus absolus (HeaderEauActions, dropdown de role Construction, menu utilisateur) qui seraient coupes. overflow-hidden uniquement sur le bloc titre, qui ne contient aucun element positionne.',
      'Header.tsx (eau, pendant une simulation, < sm uniquement) : sous-titre masque (hidden sm:block), titre en text-2xl sm:text-3xl, espacement space-x-2 sm:space-x-4 et pastille compacte (px-2, gap-1). A 412px : titre entier ET pastille entiere, zero debordement.',
      'Header.tsx : la pastille affiche le libelle COURT sous sm (simulationRoleLabel : Releveur / Promoteur / Proprietaire) et le libelle complet a partir de sm ; title et aria-label conservent TOUJOURS le libelle complet + « cliquez pour revenir a Admin (reel) ». Largeur max max-w-[40vw] sm:max-w-xs md:max-w-md.',
      'Header.tsx : hauteur du header verrouillee — le bloc titre prend min-h-[3.5rem] sm:min-h-0 pendant une simulation, sinon le masquage du sous-titre faisait perdre 2px au header (89 → 87) et le corps de page sautait. Mesure : 89px dans les deux etats.',
      'Header.tsx (charte AHUVI) : libelle de la pastille en text-ahuvi-900 sur bg-ahuvi-gold — contraste 4,8:1 (blanc sur or : 2,9:1, sous le seuil 4,5:1), 7,3:1 au survol sur gold-light. Ajout d un anneau de mise au point clavier (focus-visible).',
      'Header.tsx (module Construction, preventif) : etiquette d entreprise — min-w-0 sur la pastille et sur le libelle, max-w-[40vw] sm:max-w-32, pour qu un nom long tronque proprement au lieu de deborder. Aucun changement pour un nom court.',
      'constants/appVersion.ts + package.json : version 3.72.1 + note FR',
    ],
  },
  {
    version: '3.72.0',
    date: '2026-08-21',
    description:
      'Simulation de role Phase 3 : les reglages passent du menu deroulant (etroit) a une PAGE dediee au large. Application des choix au clic « Enregistrer » (brouillon local). Logique de simulation inchangee — seule l interface de reglage a bouge.',
    changes: [
      'EauSimulationPage.tsx (nouveau) : page dediee /gestion-eau/simulation — bouton « Retour » (haut gauche, navigate(-1)), aide FR depliable, choix du role (Admin reel / Releveur / Promoteur / Proprietaire, cartes EauCard aerees, source SIMULATION_ROLE_OPTIONS), liste des villas actives recherchable pour le Proprietaire (EauEmptyState si aucune), 2 boutons bas ANNULER (navigate(-1)) / ENREGISTRER (desactive si brouillon incomplet ou identique a l etat applique). ENREGISTRER applique via setSimulation/clearSimulation puis navigate(/gestion-eau). Aucune logique de simulation reimplementee.',
      'GestionEauRoutes.tsx : route « simulation » → EauSimulationPage (lazy), sans EauRoleProtectedRoute (garde interne sur realRoles.admin : celui-ci gate sur les roles EFFECTIFS, ce qui rendrait la page injoignable pendant une simulation). Placee avant les redirections de compatibilite.',
      'HeaderEauActions.tsx (partage, additif eau) : la section « Simulation de role » depliee (roles + recherche villa) est remplacee par UNE seule ligne « 🎭 Simulation de role » (sobre, sans etat, admin reel uniquement) qui ouvre la page. Retrait du code inline devenu inutile (etats sous-liste/recherche, imports orphelins) ; tsc --noEmit propre.',
      'EauSimulationPage garde interne : spinner tant que les roles ne sont pas confirmes (jamais de rebond a froid) ; redirection /gestion-eau seulement sur refus confirme (!realRoles.admin). Header chip inchange (clic = retour Admin direct).',
      'Historique : ce lot avait ete ecrit et numerote 3.70.0 le 2026-07-07 mais n a JAMAIS ete commite ni mis en ligne sous ce numero (la production est passee de 3.69.0 a 3.71.0). Il est publie ici sous la 3.72.0 ; l ancienne entree 3.70.0, qui annoncait une version introuvable en ligne, a ete re-etiquetee plutot que dupliquee.',
      'constants/appVersion.ts + package.json : version 3.72.0 + note FR',
    ],
  },
  {
    version: '3.71.0',
    date: '2026-08-20',
    description:
      'Scanner un ticket : ajout d une deuxieme porte d entree « Importer » (galerie / fichiers du systeme) vers le meme pipeline OCR. Le chemin camera existant est inchange.',
    changes: [
      'ReceiptScanButton.tsx : second <input type="file" accept="image/*"> SANS attribut capture (galleryInputRef), branche sur le meme handleFile que l input camera. L input camera (capture="environment") reste strictement inchange.',
      'ReceiptScanButton.tsx : bouton secondaire « Importer » (lucide ImagePlus) a gauche du bouton violet « Scanner », dans un conteneur flex-shrink-0 gap-2. Variante discrete de la carte violette (bg-white, border-purple-300, text-purple-700, rounded-lg). Libelle visible a partir de sm, icone seule 40x40 en dessous (aria-label + title « Importer une photo enregistree »). Desactive pendant isProcessing comme le bouton « Scanner ».',
      'ReceiptScanButton.tsx : handleFile reinitialise desormais l input REELLEMENT a l origine de l evenement (const input = e.currentTarget capture avant tout await) au lieu de fileInputRef en dur — la re-selection du meme fichier relance le traitement sur les deux portes.',
      'ReceiptScanButton.tsx : garde-fou de type — un fichier dont file.type ne commence pas par image/ est refuse avec un message clair (« Choisissez une image (photo ou capture d ecran). Les fichiers PDF ne sont pas encore pris en charge. ») sans declencher isProcessing ni ecran de revue. accept n est qu un filtre d affichage cote systeme.',
      'ReceiptScanButton.tsx : sous-titre de la carte « Photographiez un recu ou importez une image, les articles se remplissent tout seuls » + paragraphe d aide expliquant l import d une photo/capture deja enregistree (recu WhatsApp, capture Mvola/Orange Money).',
      '__tests__/ReceiptScanButton.test.tsx (nouveau) : test anti-regression — exactement 2 inputs fichier, un seul avec capture="environment", accept="image/*" sur les deux, bouton accessible « Importer une photo enregistree ». Verifie par mutation qu il echoue si capture revient sur le second input.',
      'constants/appVersion.ts + package.json : version 3.71.0',
    ],
  },
  {
    version: '3.69.0',
    date: '2026-07-07',
    description:
      'Simulation de role Phase 2 : activation du role « Proprietaire » (choix d une villa + re-filtrage des donnees a ses compteurs). 100 % frontend, aucune ecriture, aucune requete Supabase ajoutee.',
    changes: [
      'GestionEauContext : expose dataScope ({ compteurIds } de la villa simulee, sinon null) ; simulatedClient renseigne a la selection et restaure au montage depuis eau_sim_client (parse defensif) ; setSimulation exige une villa pour le role client ; purge a la deconnexion/non-admin inchangee. computeEffectiveRoles gerait deja client → nav/gardes propagent automatiquement.',
      'constants/simulationRoles.ts : option « Proprietaire » available:true ; SIMULATABLE_ROLES inclut « client ».',
      'utils/eauSimScope.ts (nouveau) : helper pur filterByScope(rows, getCompteurId, scope) + filterCompteursByScope — re-filtre les lignes aux compteurs de la villa (identite si scope null).',
      'HeaderEauActions (partage, additif eau) : sous-liste des comptes client ACTIFS depliable sous « Proprietaire », recherche (nom/contact/compteur), etat vide, aide FR ; selection → setSimulation(client, villa).',
      'EauClientPage : perimetre issu de dataScope en simulation (au lieu du compte de l admin) ; compteurs + factures re-filtres via filterByScope ; re-scope quand la villa change.',
      'Header.tsx (partage, additif eau) : marque enrichie « Simulation : Proprietaire — <villa> », toujours sur une ligne (hauteur header constante a 139px, corps de page inchange).',
      'constants/appVersion.ts + package.json : version 3.69.0 + note FR',
    ],
  },
  {
    version: '3.68.0',
    date: '2026-07-07',
    description:
      'Simulation de rôle dans le module Gestion Eau (Phase 1) : l’admin incarne Releveur/Promoteur pour étalonner visuellement le rendu de chaque rôle. 100 % frontend (aucune table, aucun SQL).',
    changes: [
      'GestionEauContext : rôles REELS (realRoles) vs EFFECTIFS (roles) — en simulation, roles ne contient QUE le rôle simulé ; gardes de route + filtrage de nav + isReadOnly s appuient sur les rôles effectifs sans changement côté consommateurs. setSimulation/clearSimulation, isSimulating, simulatedRole, simulatedClient (réservé Phase 2). Garde admin-only + persistance localStorage (eau_sim_role) restaurée après confirmation des rôles, purgée pour un non-admin et à la déconnexion. Offline-first préservé (getSession, jamais getUser).',
      'constants/simulationRoles.ts (nouveau) : table de config des rôles simulables (Releveur, Promoteur ; Propriétaire = Phase 2 désactivé) + helper simulationRoleLabel.',
      'HeaderEauActions : section « 🎭 Simulation de rôle » (admin réel uniquement) avec aide dépliable ; « Revenir à Admin (réel) » toujours accessible pour ne jamais rester bloqué.',
      'Header.tsx (partagé, additif eau) : marque de simulation (chip or AHUVI + icône masque) INTÉGRÉE à la barre de titre, à hauteur constante — le corps de page ne bouge pas ; cliquable → sortie.',
      'types/gestionEau.ts : type EauSimulatedClient (réservé Phase 2).',
      'constants/appVersion.ts + package.json : version 3.68.0 + note FR',
    ],
  },
  {
    version: '3.67.0',
    date: '2026-06-30',
    description:
      'Sélecteur de modules (BottomNav, shell partagé) : réorganisation des modules par glisser-déposer, par utilisateur et synchronisée via preferences.moduleOrder.',
    changes: [
      'utils/moduleOrder.ts (nouveau) : helper pur orderModules(modules, savedOrder) — respecte l ordre sauvegarde, ignore un id disparu, ajoute les nouveaux modules a la fin. Test unitaire Vitest (6 cas).',
      'BottomNav.tsx (partage) : mode switcher reordonne (ordre lu depuis user.preferences.moduleOrder), rangee defilante horizontale (flex-nowrap overflow-x-auto), appui long (~400 ms) pour entrer en reorganisation, glisser-deposer @dnd-kit (SortableContext horizontal), persistance optimiste local + synchro Supabase best-effort (fusion sans ecraser priorityAnswers), sortie par « Termine » ou clic exterieur. Aide contextuelle FR.',
      'types/index.ts : ajout additif preferences.moduleOrder?: string[].',
      'constants/appVersion.ts + package.json : version 3.67.0 + note FR',
    ],
  },
  {
    version: '3.66.20',
    date: '2026-06-26',
    description:
      'Module Eau, tableau de bord : fusion des cartes « Conso du reseau » et « Conso au compteur » en une carte alternee (7 s) avec transition split-flap (panneau de gare) sur tout le contenu + retournement d icone.',
    changes: [
      'EauSplitFlap.tsx (nouveau) : brique de defilement caractere par caractere facon panneau de gare — chaque volet roule vers l avant (boucle circulaire) du caractere courant jusqu a la cible ; alphabet ordonne borne aux caracteres des deux faces ; largeur figee par spacer (zero tremblement) ; prefers-reduced-motion = changement direct ; un seul setInterval actif pendant la transition, nettoye.',
      'EauConsoFlipCard.tsx (nouveau) : carte KPI a 2 faces qui alterne toutes les 7 s (en pause si onglet cache) ; titre = bouton de bascule instantanee + reset du cycle (stopPropagation, clavier, aria-label) ; corps = onClick (Tendances) ; icone = onIconClick (saisie compteur) avec retournement rotateY + glissement de tonalite teal <-> olive.',
      'EauUi.tsx (partage) : export additif des tokens TONE_CONTAINER et TONE_VALUE (aucune signature changee).',
      'EauDashboard.tsx : remplacement des 2 EauStatCard Conso du reseau / Conso au compteur par un seul EauConsoFlipCard (colonne droite = carte alternee, Eau non comptee, Autonomie) ; faces derivees des memes valeurs/format qu avant.',
      'constants/appVersion.ts + package.json : version 3.66.20 + note FR',
    ],
  },
  {
    version: '3.66.19',
    date: '2026-06-26',
    description:
      'Module Eau, tableau de bord, carte « Stock actuel » : pourcentage du niveau d eau non plafonne (peut afficher > 100 %) + masquage de la pastille « 100% » du flotteur quand le niveau depasse 84 % (trait pointille conserve).',
    changes: [
      'EauDashboard.tsx : tauxAffiche = stockActuelM3 / volumeMaxM3 (NON plafonne) pour waterLabel ; data.tauxRemplissage et l utilitaire tauxRemplissage inchanges. hideFlotteurLabel = niveau > 84 %.',
      'EauUi.tsx (partage) : prop additive hideFlotteurLabel sur EauStatCard, transmise a EauWaterFill.',
      'EauWaterFill.tsx (partage) : prop additive hideFlotteurLabel — la pastille texte « 100% » n est rendue que si showFlotteur && !hideFlotteurLabel ; le trait pointille du flotteur reste dans tous les cas.',
      'constants/appVersion.ts + package.json : version 3.66.19 + note FR',
    ],
  },
  {
    version: '3.66.18',
    date: '2026-06-26',
    description:
      'Module Eau, tableau de bord : auto-bascule de la base horaire vers « Sur la periode » si la fenetre « Depuis minuit » est vide, sauf choix manuel pendant la visite. Aucune ecriture localStorage pour l auto (non memorise d une visite a l autre).',
    changes: [
      'EauDashboard.tsx : drapeau en memoire userPickedBase (useRef) ; evaluation unique au chargement des donnees (apres setData) — fenetre jour vide (entreesM3/consoM3 === 0 ou consoReseauM3 null/0) → setBase(periode) via updater, sans changeBase ni localStorage.',
      'EauDashboard.tsx : onClick des options du menu base passe userPickedBase.current = true (priorite absolue, duree = cette visite) avant changeBase.',
      'constants/appVersion.ts + package.json : version 3.66.18 + note FR',
    ],
  },
  {
    version: '3.66.17',
    date: '2026-06-23',
    description:
      'Module Eau : separation des 2 clics de la carte « Pompes en marche » — corps = onglet Source simple, icone = section Tests de debit calee sous les onglets. Suppression du chemin focus=debit/debitFocus.',
    changes: [
      'EauDashboard.tsx : carte « Pompes en marche » onClick corps = goSource (?tab=source) ; icone garde goSaisieBassin(debit) ; suppression de goSourceDebit.',
      'EauRelevesPage.tsx : suppression du traitement ?focus=debit (intention debitFocus) ; onglet Source = consultation simple ; union ramenee a niveau|debit.',
      'EauBassinReleves.tsx : suppression de l intention debitFocus ; seule debit ouvre+cale la section Tests de debit (scrollElementUnderHeader(debitRef)).',
      'constants/appVersion.ts + package.json : version 3.66.17 + note FR',
    ],
  },
  {
    version: '3.66.16',
    date: '2026-06-23',
    description:
      'Module Eau : l icone « Pompes en marche » (intention debit, ?tab=bassin&bt=debit) cale le HAUT de la section « Tests de debit » sous les onglets, comme le clic corps. Fin du scrollIntoView centre.',
    changes: [
      'EauBassinReleves.tsx : fusion des intentions debit et debitFocus → meme calage scrollElementUnderHeader(debitRef) (titre de section visible) ; l intention debit ne fait plus de scrollIntoView({block:center}).',
      'constants/appVersion.ts + package.json : version 3.66.16 + note FR',
    ],
  },
  {
    version: '3.66.15',
    date: '2026-06-23',
    description:
      'Module Eau : clic carte « Pompes en marche » → calage sur le HAUT de la section « Tests de debit » (debitRef), titre visible, au lieu du bloc « Debit mesure » interne.',
    changes: [
      'EauBassinReleves.tsx : intention debitFocus cale scrollElementUnderHeader(debitRef) (section entiere) au lieu de [data-eau-debit-mesure] (bloc interne).',
      'bassin/TestsDebit.tsx : suppression de l ancre data-eau-debit-mesure devenue inutile.',
      'constants/appVersion.ts + package.json : version 3.66.15 + note FR',
    ],
  },
  {
    version: '3.66.14',
    date: '2026-06-23',
    description:
      'Fix crash carte « Pompes en marche » : EauFlowFill lisait EAU_CHART au niveau module → TDZ via import circulaire EauUi ↔ EauFlowFill. Lecture EAU_RGB deferree dans l effet (runtime).',
    changes: [
      'EauFlowFill.tsx : suppression du const EAU_RGB au niveau module ; calcul deplace dans useEffect (runtime) → plus de ReferenceError « Cannot access EAU_CHART before initialization ».',
      'constants/appVersion.ts + package.json : version 3.66.14 + note FR',
    ],
  },
  {
    version: '3.66.13',
    date: '2026-06-23',
    description:
      'Module Eau, tableau de bord : carte « Pompes en marche » = calque de chute d eau descendante (intensite ∝ debit) + clic → Releves onglet Source cale sur « Debit mesure ».',
    changes: [
      'EauFlowFill.tsx (NOUVEAU) : calque canvas de chute d eau descendante (filets + lame en bas), couleur EAU_CHART.eauFill, intensite pilotee par flowFraction [0..1], figee a 0, prefers-reduced-motion statique, rAF nettoye au demontage.',
      'EauUi.tsx (PARTAGE) : EauStatCard gagne la prop flowFraction (symetrique de waterFraction, waterFraction prioritaire si les deux fournis) ; encres renforcees aussi sur flux.',
      'EauDashboard.tsx (PARTAGE) : carte « Pompes en marche » → flowFraction = clamp01(debitCourantM3h / DEBIT_POMPES_NOMINAL_M3H=8) ; onClick corps = goSourceDebit (?tab=source&focus=debit), icone inchangee.',
      'EauRelevesPage.tsx (PARTAGE) : ?focus=debit → onglet Source + intention debitFocus (distincte de bt=debit).',
      'EauBassinReleves.tsx (PARTAGE) : intention debitFocus = setDebitOpen(true) + scrollElementUnderHeader([data-eau-debit-mesure] sinon debitRef), rAF + re-assertion 360 ms.',
      'bassin/TestsDebit.tsx (PARTAGE) : ancre data-eau-debit-mesure sur le bloc « Debit mesure (m³/h) ».',
      'constants/appVersion.ts + package.json : version 3.66.13 + note FR',
    ],
  },
  {
    version: '3.66.12',
    date: '2026-06-22',
    description:
      'Module Eau, tableau de bord : clic carte « Stock actuel » → page Releves onglet « Source ».',
    changes: [
      'EauDashboard.tsx : carte « Stock actuel » onClick = goSource (/gestion-eau/releves?tab=source) au lieu de goTendances ; l icone garde la saisie bassin.',
      'EauRelevesPage.tsx : nouveau deep-link ?tab=source → onglet Source en consultation simple (aucun tiroir ouvert) ; initialTab + useEffect mis a jour.',
      'constants/appVersion.ts + package.json : version 3.66.12 + note FR',
    ],
  },
  {
    version: '3.66.11',
    date: '2026-06-22',
    description:
      'Module Eau, carte Stock actuel : ondulation de l etiquette % ralentie ÷1,5 (vagues inchangees).',
    changes: [
      'EauWaterFill.tsx : LABEL_WAVE_SLOWDOWN = 1.5 → le phase*speed de l etiquette est divise par 1,5 (montee/descente plus douce) ; les vagues gardent leur vitesse (leger decalage assume).',
      'constants/appVersion.ts + package.json : version 3.66.11 + note FR',
    ],
  },
  {
    version: '3.66.10',
    date: '2026-06-22',
    description:
      'Module Eau, carte Stock actuel : l’étiquette % flottante ondule avec les vagues (vague dominante).',
    changes: [
      'EauWaterFill.tsx : paint() ajoute un decalage sinusoidal (LABEL_WAVE = vague dominante WAVES[1], meme formule amp*sin(k*X_LABEL + phase*speed)) au top de l etiquette % ; clamp anti-rognage [0,100] ; aucune ondulation en prefers-reduced-motion.',
      'constants/appVersion.ts + package.json : version 3.66.10 + note FR',
    ],
  },
  {
    version: '3.66.9',
    date: '2026-06-21',
    description:
      'Module Eau, carte Stock actuel : volume max sous la valeur (Remplissage Max) + pourcentage flottant sur la ligne d’eau.',
    changes: [
      'EauDashboard.tsx : hint = Remplissage Max + fmtM3(volumeMaxM3) (plus de % ni de /) ; waterLabel = fmtPct(tauxRemplissage) passe a la carte Stock actuel.',
      'EauUi.tsx : prop optionnelle waterLabel sur EauStatCard, transmise a EauWaterFill (retrocompatible).',
      'EauWaterFill.tsx : etiquette % en overlay HTML, top recale sur la surface vivante a chaque frame (paint), meme style que le repere 100%.',
      'constants/appVersion.ts + package.json : version 3.66.9 + note FR',
    ],
  },
  {
    version: '3.66.8',
    date: '2026-06-20',
    description:
      'Gestion Eau — Carte « Stock actuel » : les deux colonnes d’eau de la marge gauche sont désormais coupées à la ligne d’eau (impression d’eau qui se déverse dans le bassin, plus rien sous les vagues) et l’étiquette « 100% » est rapprochée du trait et un peu décalée à droite. Tout le reste est inchangé.',
    changes: [
      'EauWaterFill.tsx : colonnes coupées à la surface vivante (hauteur du conteneur = surfaceY %, mise à jour dans la boucle rAF paint() via streamBoxRefs, overflow-hidden) ; reflets accentués (pic ~0,9) + écoulement accéléré (2100/2500 ms) pour rendre la chute perceptible ; statiques mais coupées en prefers-reduced-motion.',
      'EauWaterFill.tsx : étiquette « 100% » top 4px→2px (juste sous le trait) et right 4.5rem→4.25rem (jeu de sécurité 4px vs icône md:w-12, vérifié navigateur).',
      'constants/appVersion.ts + package.json : version 3.66.8 + note FR',
    ],
  },
  {
    version: '3.66.7',
    date: '2026-06-20',
    description:
      'Gestion Eau — Carte « Stock actuel » : l’étiquette « 100% » est dégagée de l’icône (posée sous le trait flotteur, reculée à gauche) et deux fines colonnes d’eau s’écoulent dans la marge gauche. Tout le reste est inchangé.',
    changes: [
      'EauWaterFill.tsx : etiquette « 100% » repositionnee sous le trait flotteur et ancree a right:4.5rem (72px) pour rester entierement a gauche de l’icone a toute largeur (mobile inclus).',
      'EauWaterFill.tsx : deux colonnes d’eau (eauFill 0,58 + reflets clairs descendants) dans la gouttiere gauche (16px), animation WAAPI infinie auto-contenue, nettoyee au demontage, statique en prefers-reduced-motion ; aucun texte derriere → contraste inchange.',
      'constants/appVersion.ts + package.json : version 3.66.7 + note FR',
    ],
  },
  {
    version: '3.66.6',
    date: '2026-06-20',
    description:
      'Gestion Eau — Carte « Stock actuel » : les vagues du fond d’eau animé sont abaissées (clapotis plus subtil, surface plus calme). Tout le reste est inchangé.',
    changes: [
      'EauWaterFill.tsx : amplitude des deux vagues divisee par ~3 (4 -> 1,33 px et 5,5 -> 1,83 px), meme proportion conservee ; couleur, vitesse (×1,5), niveau calibre, traits flotteur/trop-plein, montee douce, prefers-reduced-motion et clics inchanges.',
      'constants/appVersion.ts + package.json : version 3.66.6 + note FR',
    ],
  },
  {
    version: '3.66.5',
    date: '2026-06-20',
    description:
      'Gestion Eau — Carte « Stock actuel » : le fond d’eau animé devient une COUPE VERTICALE calibrée du bassin (hauteurs réelles de config), avec traits de repère flotteur (« 100% ») et trop-plein, couleur vert d’eau dédiée, et encres renforcées pour la lisibilité sur l’eau.',
    changes: [
      'eauBilanService.ts (PARTAGE) : DashboardData expose 3 fractions calibrees sur la config reelle (additif) — bassinWaterFraction = stock / (S × hauteurTop) NON plafonnee (hauteurTop = max ?? trop-plein ?? flotteur ; S = L × l), bassinFlotteurFraction = Hf / hauteurTop, bassinTropPleinFraction = Htp / hauteurTop ; null si config incomplete ; tauxRemplissage inchange (texte).',
      'EauUi.tsx (PARTAGE) : EAU_CHART.eauFill (#149E8C, vert d’eau) ; EauStatCard remplace fillRatio par waterFraction/flotteurFraction/tropPleinFraction + encres renforcees (label/hint gray-700, valeur ahuvi-forest) quand l’eau est presente — contraste WCAG >= 4,5:1.',
      'EauWaterFill.tsx : niveau pilote par waterFraction (non plafonne, dessin borne a 1), traits pointilles flotteur (+ micro-etiquette « 100% ») et trop-plein en overlay HTML (non deformes), vagues ralenties ×1,5, opacites corps/vagues 0,16/0,22/0,30 calibrees pour le contraste.',
      'EauDashboard.tsx : carte « Stock actuel » cablee sur les 3 fractions ; span « / volumeMax » passe en gray-700 (lisible sur l’eau).',
      'constants/appVersion.ts + package.json : version 3.66.5 + note FR',
    ],
  },
  {
    version: '3.66.4',
    date: '2026-06-20',
    description:
      'Gestion Eau — Tableau de bord : fond d’eau animé (SVG pur, AHUVI teal) dans la carte « Stock actuel », au niveau du % de remplissage. Strictement additif, aucune autre carte modifiée.',
    changes: [
      'Nouveau composant components/EauWaterFill.tsx : calque SVG décoratif (aria-hidden, pointer-events-none) ; niveau piloté exclusivement par le ratio, montée ease-out ~1,2 s sans dépassement + 2 vagues ondulantes (requestAnimationFrame, annulé au démontage) ; prefers-reduced-motion = niveau posé, statique.',
      'EauUi.tsx (PARTAGE) : prop optionnelle fillRatio sur EauStatCard — si fournie, rend EauWaterFill derriere le contenu (z-10) ; null/undefined = rendu strictement inchange (zero regression sur les autres cartes).',
      'EauDashboard.tsx : carte « Stock actuel » cablee fillRatio={data.tauxRemplissage}.',
      'constants/appVersion.ts + package.json : version 3.66.4 + note FR',
    ],
  },
  {
    version: '3.66.3',
    date: '2026-06-17',
    description:
      'Sécurité : fermeture de la faille « auth_users_exposed ». Suppression complète de l’outil de nettoyage des comptes orphelins (vue + fonctions SECURITY DEFINER côté Supabase, service + panneau Admin côté front).',
    changes: [
      'Base Supabase : DROP de la vue orphaned_auth_users_monitor + des fonctions cleanup_orphaned_auth_users / test_cleanup_orphaned_auth_users / trigger_cleanup_orphaned_auth_users + trigger associé (exposition email/téléphone à authenticated supprimée).',
      'Front : suppression de services/adminCleanupService.ts, des 3 fichiers test-cleanup-*.ts et de database/cleanup-orphaned-auth-users.sql ; retrait du panneau « Nettoyage des Utilisateurs Orphelins » dans pages/AdminPage.tsx (par soustraction).',
      'constants/appVersion.ts + package.json : version 3.66.3 + note FR',
    ],
  },
  {
    version: '3.66.0',
    date: '2026-06-17',
    description:
      'Relevés (Source) : bouton ⓘ Aide ajouté dans la barre d’onglets collante (à droite de la nav, comme sur Compteurs) ; ouvre l’aide « Stock du bassin » sous la barre. Aide de tête retirée (plus de doublon).',
    changes: [
      'components/EauRelevesPage.tsx : ⓘ Aide Source câblé via rightSlot (useAideState(AIDE.bassinNiveau.id)) ; AidePanel rendu sous la barre au-dessus du contenu Source. Onglet Compteurs inchangé.',
      'components/EauBassinReleves.tsx : retrait de l’aide de tête EauAide (désormais portée par la barre) ; imports EauAide + AIDE supprimés (orphelins). Carte Stock = premier élément.',
      'constants/appVersion.ts + package.json : version 3.66.0 + note FR',
    ],
  },
  {
    version: '3.65.0',
    date: '2026-06-17',
    description:
      'Relevés (Compteurs) : bouton ⓘ Aide remonté dans la barre d’onglets collante (à droite de la nav, même ligne que les pilules) ; le panneau d’aide reste déplié sous la barre.',
    changes: [
      'components/EauTabs.tsx [PARTAGÉ module eau] : prop optionnelle rightSlot (emplacement à droite de la nav) ; conteneur interne en flex (nav flex-1 min-w-0 reste scrollable, rightSlot flex-shrink-0). Rendu identique pour les pages-thème sans rightSlot.',
      'components/EauRelevesPage.tsx : ⓘ Aide câblé via rightSlot (onglet Compteurs uniquement, useAideState/AideToggleButton) ; panneau AidePanel rendu seul sous la barre. Onglet Source inchangé.',
      'constants/appVersion.ts + package.json : version 3.65.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.64.0',
    date: '2026-06-17',
    description:
      "feat(eau) : onglets internes EauTabs en glassmorphisme (~50 % d'opacité + flou, le contenu défile visible/flouté derrière ; les pilules restent pleines/nettes). Calage des cartes corrigé : à l'ouverture d'un tiroir, la carte se cale désormais sous le BAS de la barre d'onglets collante (repère data-eau-sticky-tabs) au lieu du bas du Header — sinon elle restait masquée derrière les onglets (helper partagé getEauCalageOffset, appliqué à scrollUnderHeader + EauBassinReleves). Rebond élastique iOS prononcé en JavaScript (hook useEauRubberBand) : étirement amorti à résistance dégressive + retour ressort, sur appareil tactile, pages Eau uniquement ; translate le <main> (le Header, frère, reste épinglé ; transform retiré au repos → sticky des onglets restauré).",
    changes: [
      'components/EauTabs.tsx [PARTAGÉ module eau] : fond glassmorphisme bg-white/50 backdrop-blur-md + data-eau-sticky-tabs (repère de calage) ; pilules inchangées',
      'utils/scrollUnderHeader.ts [PARTAGÉ module eau] : nouveau getEauCalageOffset (bas de [data-eau-sticky-tabs] visible, sinon bas du Header) ; scrollElementUnderHeader vise ce bas',
      'components/EauBassinReleves.tsx : scrollReleveRowUnderHeader utilise getEauCalageOffset (calage sous les onglets)',
      'utils/useEauRubberBand.ts [NOUVEAU] : hook rubber-band tactile (touchstart/move/end, damp dégressif, retour ressort easeOutCubic, translate <main>, garde scrolls internes)',
      'components/Layout/AppLayout.tsx [PARTAGÉ] : monte useEauRubberBand(isEauModule && isAuthenticated)',
      'constants/appVersion.ts + package.json : version 3.64.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.63.0',
    date: '2026-06-17',
    description:
      "feat(eau) : retouches UI de la page Relevés. Onglets internes EauTabs rendus collants (sticky) sous le Header partagé (top = hauteur réelle du Header via ResizeObserver, z-40 < z-50, fond opaque + séparateur). Tiroir « Saisir » d'un relevé de compteur : nouveau champ Date/heure optionnel (modèle EauApportsReleves, vide = maintenant, refus du futur, timestamp transmis à addReleveCompteur/addReleveElec) avec index + date sur une même ligne. Édition admin (tiroir Historique) : date + index côte à côte. Raccourcis du bas : icônes alignées sur les cartes de saisie Source (GlassWater / ArrowDownToLine). Bonus : rebond élastique iOS relâché (overscroll-y-auto) uniquement sur le module Eau.",
    changes: [
      'components/EauTabs.tsx [PARTAGÉ] : conteneur sticky z-40, top = hauteur Header (ResizeObserver), fond opaque + border-b',
      'components/Layout/AppLayout.tsx [PARTAGÉ] : overscroll-y-auto sur /gestion-eau (élastique), overscroll-none ailleurs (CÅ“ur/Construction inchangés)',
      'components/EauTiroirSaisie.tsx : champ Date/heure optionnel + validation futur + timestamp au payload + index/date sur une ligne',
      'components/EauCompteursReleves.tsx : édition Historique admin = date + index sur une même ligne',
      'components/EauRelevesPage.tsx : raccourcis #2/#3 icônes GlassWater / ArrowDownToLine',
      'constants/appVersion.ts + package.json : version 3.63.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.62.0',
    date: '2026-06-16',
    description:
      "refactor(eau) : réorganisation interne des deux derniers écrans monolithiques du module Eau, SANS aucun changement d'usage ni d'apparence. `EauBassinReleves` (onglet Source/Bassin) est découpé en un hook de données/actions `useBassinReleves` + sous-composants `bassin/*` (carte Stock, saisie hauteur, tests de débit, arrêts de pompe, historique admin) ; `EauDemandesPage` (Invitations & demandes) est découpé en `demandes/*` (formulaire d'invitation, import du répertoire, liste des demandes). Les champs de saisie vivent désormais dans les sous-composants → la frappe ne re-render plus les listes. Helpers purs factorisés (`utils/dateInput`, `utils/duree`) et conteneur d'accordéon partagé (`components/EauDrawer`, mutualisé avec EauApportsReleves). Aucun calcul de bilan déplacé. tsc --noEmit OK, build OK, 169 tests verts.",
    changes: [
      'components/EauBassinReleves.tsx : 1256 → 235 lignes ; orchestration seule (refs, scroll sous Header, deep-link, agencement, explain)',
      'components/bassin/useBassinReleves.ts [NOUVEAU] : états données + tiroirs + handlers (submit/edit/remove/recompute)',
      'components/bassin/{BassinStockCard,BassinSaisie,TestsDebit,ArretsPompe,BassinHistoriqueAdmin}.tsx [NOUVEAUX]',
      'components/EauDemandesPage.tsx : 956 → 394 lignes ; listes invitations + liens + révocation conservés',
      'components/demandes/{InvitationForm,BatchImportPanel,DemandesList}.tsx [NOUVEAUX] : état de saisie isolé',
      'utils/dateInput.ts + utils/duree.ts [NOUVEAUX] : helpers purs factorisés (+ tests __tests__/eauDateDuree.test.ts)',
      'components/EauDrawer.tsx [NOUVEAU] : accordéon partagé ; EauApportsReleves.tsx mis à jour pour le réutiliser',
      'constants/appVersion.ts + package.json : version 3.62.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.60.2',
    date: '2026-06-15',
    description:
      "fix(eau) : déblocage du build de production. `utils/format.ts` (`fmtM3h`, `fmtKw`) et `services/eauElecReleveService.ts` (`ElecKpiData.consoRecenteKw` + calcul kW = kWh/durée) étaient écrits mais JAMAIS commités, alors que `EauDashboard.tsx` (commité) les importe/utilise → build Rollup en échec (`fmtM3h is not exported`) → AUCUN déploiement Cloudflare depuis plusieurs versions (prod figée sur une version antérieure, alors que le local tournait via le working tree). Commit de ces helpers + correctif du test `eauNavRoles.test.tsx` (ordre nav Compteurs avant Suivi, aligné sur constants/index.ts). Additif. tsc OK, build OK (70 tests verts).",
    changes: [
      'utils/format.ts : + fmtM3h, fmtKw (étaient non commités)',
      'services/eauElecReleveService.ts : + ElecKpiData.consoRecenteKw + calcul kW (était non commité)',
      '__tests__/eauNavRoles.test.tsx : ordre nav attendu Compteurs avant Suivi',
      'constants/appVersion.ts + package.json : version 3.60.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.60.1',
    date: '2026-06-15',
    description:
      "style : barre d'état système (status bar mobile) synchronisée avec le header du module. `Header.tsx` : useEffect qui met `meta[name=theme-color]` à `#364E30` (ahuvi-forest, teinte dominante du header eau `from-ahuvi-forest/95 to-ahuvi-olive/90 backdrop-blur-md`) quand `isEauModule`, sinon `#3b0764` (violet BazarKELY, défaut index.html). La meta theme-color étant SOLIDE côté OS, l'effet translucide/blur du header ne peut pas y être reproduit (documenté). Construction/BazarKELY inchangés (violet). tsc OK, build OK.",
    changes: [
      'components/Layout/Header.tsx (PARTAGÉ) : theme-color dynamique selon le module (eau = vert AHUVI, sinon violet)',
      'constants/appVersion.ts + package.json : version 3.60.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.60.0',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord — le sélecteur de période (`<select>` natif, non animable) est remplacé par un menu déroulant custom charté AHUVI + animation façon iOS. Bouton (CalendarRange + libellé courant) → panneau `role=listbox` absolu (rounded-xl, shadow-lg, option active bg-ahuvi-50 + Check). Toujours monté, ouverture/fermeture par classes : `opacity/scale-95/-translate-y-1` → `opacity-100/scale-100/translate-y-0`, `transition-[opacity,transform] duration-200`, timing `cubic-bezier(0.16,1,0.3,1)` (ease-out-expo, sans rebond), `origin-top-right`, `motion-reduce:transition-none`. Fermeture au pointerdown extérieur + Échap (useEffect, listeners conditionnels). `useRef`+`Check` ajoutés. Comportement (changeBase, persistance localStorage) inchangé. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : sélecteur de période = menu déroulant custom animé (ease-out-expo, fermeture clic extérieur/Échap, a11y listbox)',
      'constants/appVersion.ts + package.json : version 3.60.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.59.9',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord — icône de la carte « Stock actuel » : `Droplet` → `GlassWater` (contenant avec niveau d'eau, parlant pour le % de remplissage et lève le doublon de gouttes). « Conso au compteur » conserve `Droplet` (toujours utilisé, + graphes). Import lucide + GlassWater. Présentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : icône carte « Stock actuel » Droplet → GlassWater',
      'constants/appVersion.ts + package.json : version 3.59.9 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.8',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord — icône de la carte « Eau non comptée » : `Percent` (hérité du NRW, plus pertinent depuis le passage en m³/h) → `SearchX` (loupe barrée = eau qui échappe au comptage). Évite le doublon avec les gouttes (Droplet ×2) et n'est pas alarmiste. Import lucide Percent→SearchX. Présentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : icône carte « Eau non comptée » Percent → SearchX',
      'constants/appVersion.ts + package.json : version 3.59.8 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.7',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord — carte « Conso au compteur » : ajout à droite de la valeur de sa part de la conso du réseau (`consoCompteurPct = flux.consoM3 / flux.consoReseauM3 × 100`), en gris, même rendu que le % de « Eau non comptée » (value en flex justify-between). Les deux parts (comptée + non comptée) totalisent ~100 %. Présentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : + consoCompteurPct ; carte « Conso au compteur » affiche sa part de la conso du réseau à droite de la valeur',
      'constants/appVersion.ts + package.json : version 3.59.7 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.6',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord — carte « Autonomie estimée » : ajout, à droite du hint, de l'équivalent horaire de la conso moyenne (`fmtM3h(autonomie.consoMoyenneHeureM3)`) en gris ; hint rendu en `flex justify-between items-baseline` (m³/j à gauche, m³/h à droite). Présentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : carte Autonomie — hint m³/j + équivalent m³/h à droite',
      'constants/appVersion.ts + package.json : version 3.59.6 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.5',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord — carte « Conso au compteur » réduite à UNE ligne de hint (`cumulSub(flux.consoM3)`). Retrait de la 2áµ‰ ligne `consoJourHint` (origine du chiffre, « estimée/mesurée »), de la fonction `consoJourHint` devenue inutilisée et de l'import de type `ConsoJourSource` (noUnusedLocals). `TrendingUp` reste utilisé (liens Tendances). Présentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : hint « Conso au compteur » sur une seule ligne ; suppression de consoJourHint + import ConsoJourSource',
      'constants/appVersion.ts + package.json : version 3.59.5 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.4',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord — le % d'eau non comptée (`eauNonCompteePct`) repasse sur la carte « Eau non comptée », à droite de SA valeur (value en `flex justify-between items-baseline`, % en gris text-sm). La carte « Conso au compteur » retrouve sa valeur simple (`fmtM3h(rate(flux.consoM3))`, sans le %). Présentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : % déplacé sur la valeur de « Eau non comptée » (flex à droite) ; « Conso au compteur » remis en valeur simple',
      'constants/appVersion.ts + package.json : version 3.59.4 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.3',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord — le % d'eau non comptée (`eauNonCompteePct`) est déplacé de la carte « Eau non comptée » vers la carte « Conso au compteur » : affiché en gris (text-sm, text-gray-400) à droite de la valeur (value rendu en `flex justify-between items-baseline`, % avec title explicatif). La ligne grise « Y % de la conso du réseau » est retirée du hint de « Eau non comptée » (ne reste que « X m³ hors compteur »). Mêmes garde-fous (affiché seulement si eau non comptée ≥ 0 et pct défini). Présentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : % eau non comptée déplacé à droite de la valeur « Conso au compteur » ; retrait de la ligne % du hint « Eau non comptée »',
      'constants/appVersion.ts + package.json : version 3.59.3 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.2',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord — carte « Eau non comptée » homogénéisée avec les autres KPI. Valeur = DÉBIT m³/h (`fmtM3h(rate(eauNonCompteeM3))`) au lieu du %. `eauNonCompteeM3 = flux[base].consoReseauM3 − flux[base].consoM3` (mêmes fenêtres que Conso du réseau/au compteur → suit le sélecteur de période) ; `eauNonCompteePct = eauNonCompteeM3 / flux.consoReseauM3 × 100`. Hint = « X m³ hors compteur » + ligne grise « Y % de la conso du réseau ». Garde-fous conservés : débit inconnu (`flux.consoReseauM3 == null`) → « — » + « Débit des pompes requis » ; eau non comptée négative → « — » + « Sortie sous le compteur — vérifier le débit ». Plus de dépendance à `nrwReseauPeriode` pour cette carte. Présentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : carte « Eau non comptée » en m³/h (fenêtre courante) + % gris vs conso réseau + hint « hors compteur » + garde-fous',
      'constants/appVersion.ts + package.json : version 3.59.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.1',
    date: '2026-06-15',
    description:
      "style(eau) : Conso du réseau / NRW — Phase 3 (tableau de bord). Carte « NRW (période) » → « Eau non comptée » : value = `nrwReseauPeriode.nrwPct` en % (inchangé), hint = « X m³ non comptés sur la période » (au lieu de « Pertes : X »), tone `rose`→`amber` (à surveiller ≠ perte). Garde-fous : si `nrwReseauPeriode` null (débit inconnu) → « — » + « Débit des pompes requis » ; si `nrwPct < 0` (sortie sous le compteur) → « — » + « Sortie sous le compteur — vérifier le débit ». Suppression du repli sur l'ancien NRW entrées (`nrwPeriode`) pour cette carte. La carte « Conso du réseau » garde déjà son garde-fou « — ». Présentationnel uniquement (calcul Phase 2 inchangé). Anomalie « eau non comptée » déjà neutralisée en Phase 2. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : carte « NRW (période) » → « Eau non comptée » (libellé, hint « non comptés », tone amber, garde-fous null/négatif, retrait repli nrwPeriode)',
      'constants/appVersion.ts + package.json : version 3.59.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.0',
    date: '2026-06-15',
    description:
      "feat(eau) : Conso du réseau / NRW — Phase 2 (moteur « débit × temps de marche »). `utils/bilan.ts` : la sortie réseau est DÉCOUPLÉE du bilan de matière. Nouveau : `heuresArretSurIntervalle` (Î£ recouvrements des arrêts de pompe avec ]tPrev,t]) + input `arrets` + `ArretPompeLite`. `consoReseauM3 = apportReseau − Î”stock` où apportReseau = override > entrées > `débit × (Î”t − arrêts)` (PLUS de plafond flotteur, PLUS de FRACTION_POMPE) ; `null` si débit inconnu ou sortie ≤ 0. `pertesM3`/`nrwReseauPct` → nullable (= eau non comptée). `apportM3`/stockAttendu/écart/anomalie de STOCK inchangés (bilan de matière conservé). `eauBilanService` : charge `eau_arrets_pompe` + passe `arrets` ; l'anomalie stockée ne folde PLUS `anomalieReseau` (eau non comptée = normale). Dashboard inchangé d'aspect (carte NRW renommée en Phase 3). Recalcul requis : « Recalculer tous les bilans ». Tests : 70 OK (eauBassinDebit mis à jour au nouveau modèle + 3 nouveaux : arrêts déduits, arrêt total → null, sans débit → null). tsc OK, build OK.",
    changes: [
      'utils/bilan.ts : + heuresArretSurIntervalle/ArretPompeLite + input arrets ; consoReseau = débit × temps de marche − Î”stock (nullable) ; pertes/nrw nullable ; apport mass-balance + écart/anomalie inchangés',
      'services/eauBilanService.ts : charge eau_arrets_pompe + passe arrets ; anomalie = écart de stock seul (plus anomalieReseau)',
      '__tests__/eauBassinDebit.test.ts : assertions conso réseau alignées sur le nouveau modèle + 3 tests (arrêts, arrêt total, sans débit)',
      'constants/appVersion.ts + package.json : version 3.59.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.58.0',
    date: '2026-06-15',
    description:
      "feat(eau) : Arrêts de pompe — Phase 1 (saisie + stockage synchronisé, PAS encore branchée au calcul). Nouvelle entité `eau_arrets_pompe` (Dexie v7 + table Supabase + RLS calquée sur eau_debit_tests : SELECT admin/releveur + promoteur, INSERT/UPDATE admin/releveur, DELETE admin ; table créée et vérifiée via REST avant déploiement → pas de drift schéma). Modèle `ArretPompeRow/Local` (id, timestamp_debut, timestamp_fin, duree_min, agent_id, note, created_at) ; forme canonique (début, fin), `duree_min` recalculée. Service offline-first `addArretPompe/listArretsPompe/deleteArretPompe/refreshArretsPompe` (saveLocal + upsert idempotent id client, getCurrentUserIdSync). Sync : ajout à EAU_TABLES + PK_BY_TABLE. UI : section dépliable « Arrêts de pompe » sous l'onglet Source (EauBassinReleves), 2 modes de saisie (Début/fin OU Début+durée min), aperçu de durée, liste + suppression (admin/releveur), lecture seule pour promoteur. Aucun impact sur les bilans/tableau de bord (Phase 2 : temps de marche = temps écoulé − Î£ arrêts). tsc --noEmit OK, build OK.",
    changes: [
      'types/gestionEau.ts : + ArretPompeRow/ArretPompeLocal',
      'db/gestionEauDb.ts : + table eau_arrets_pompe (version 7) + EAU_TABLES',
      "services/eauSync.ts : + eau_arrets_pompe dans PK_BY_TABLE",
      'services/eauBassinService.ts : + addArretPompe/listArretsPompe/deleteArretPompe/refreshArretsPompe',
      'components/EauBassinReleves.tsx : + section « Arrêts de pompe » (2 modes de saisie, liste, suppression)',
      'Supabase : create table eau_arrets_pompe + index + RLS (exécuté via éditeur SQL, vérifié REST)',
      'constants/appVersion.ts + package.json : version 3.58.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.57.7',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord — carte « Pompes en marche » : le sous-texte « Apport des pompes » devient « Débit entrant ». Présentationnel uniquement (prop `hint`), valeur inchangée. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : hint « Apport des pompes » → « Débit entrant »",
      'constants/appVersion.ts + package.json : version 3.57.7 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.6',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord — carte de débit des pompes : titre raccourci de « Débit pompes en marche » à « Pompes en marche » (le mot « Débit » retiré pour éviter une ligne trop longue). Présentationnel uniquement, valeur inchangée. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : label « Débit pompes en marche » → « Pompes en marche »",
      'constants/appVersion.ts + package.json : version 3.57.6 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.5',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord — carte « Débit source » renommée « Débit pompes en marche » (présentationnel uniquement). Modification du seul prop `label` de la carte (valeur `debitCourantM3h` inchangée). Aucun changement de calcul/donnée/logique. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : label « Débit source » → « Débit pompes en marche »",
      'constants/appVersion.ts + package.json : version 3.57.5 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.4',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord — renommage de deux cartes KPI pour clarifier eau facturable vs eau sortie du bassin (présentationnel uniquement). `label={`Conso ${winSuffix}`}` → « Conso au compteur » (conso métrée aux compteurs = facturable) ; `label={`Conso réseau ${winSuffix}`}` → « Conso du réseau » (sortie brute du bassin = apport − Î”stock = conso + pertes). La carte NRW reste la différence (pertes). Suffixe de fenêtre retiré du titre (la période figure déjà dans le hint via winSub). Aucun changement de valeur/calcul/logique. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : labels « Conso au compteur » + « Conso du réseau » (suffixe fenêtre retiré de ces 2 titres)",
      'constants/appVersion.ts + package.json : version 3.57.4 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.3',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord — sous-titre d'en-tête raccourci en « Tableau de bord » (au lieu de « Tableau de bord du bassin et des compteurs ») pour éviter un retour à la ligne sur 2 lignes. Modification du seul prop `subtitle` passé à EauPageShell depuis EauDashboard (le shell partagé n'est pas touché). Le sous-titre reste cliquable (ouverture de l'aide). Aucun changement de calcul/donnée/navigation. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : prop subtitle « Tableau de bord du bassin et des compteurs » → « Tableau de bord »",
      'constants/appVersion.ts + package.json : version 3.57.3 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.2',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord — retouche du sélecteur de période (présentationnel uniquement). (1) Suppression de la bordure propre du `<select>` (border-0) — c'est la bordure que `@tailwindcss/forms` applique au select lui-même, visible à l'intérieur du cadre `<label>` ; seul le cadre du label subsiste. (2) Retrait de l'icône `ChevronDown` (le « V » à droite du libellé) ajoutée en v3.57.1, ainsi que son import lucide. Comportement (options, onChange, persistance localStorage, recalcul KPI) inchangé. tsc --noEmit OK, build OK.",
    changes: [
      'modules/gestion-eau/components/EauDashboard.tsx : select border-0 (bordure forms-plugin retirée) ; ChevronDown supprimé (élément + import lucide)',
      'constants/appVersion.ts + package.json : version 3.57.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.1',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord — finitions du sélecteur de période + ordre de deux cartes KPI (présentationnel uniquement). (A) baseSelector entièrement charté AHUVI : icône lucide CalendarRange (ahuvi-forest) « icône d'abord » + ChevronDown (ahuvi-olive, pointer-events-none) à droite ; select en appearance-none/focus:ring-0 (suppression de l'anneau bleu @tailwindcss/forms et de la flèche native) ; font-ahuvi-body, shadow-soft, hover:border-ahuvi-300, focus-within:ring-ahuvi-300 ; plus aucune teinte bleue/grise. Comportement (options, onChange, persistance localStorage) inchangé. (B) Colonne gauche réordonnée dans le JSX : STOCK ACTUEL → DÉBIT SOURCE → ENTRÉES (Débit source remonté au-dessus d'Entrées). (C) Colonne droite réordonnée dans le JSX : CONSO RÉSEAU → CONSO → NRW → AUTONOMIE ESTIMÉE (Conso réseau remontée en tête). Réordonnancement par déplacement de blocs JSX (aucun order-* CSS), aucune carte dupliquée/perdue, aucun changement de calcul/donnée/navigation/offline. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : sélecteur de période charté AHUVI (CalendarRange + ChevronDown, appearance-none, focus:ring-0) ; colonne gauche STOCK→DÉBIT→ENTRÉES ; colonne droite CONSO RÉSEAU→CONSO→NRW→AUTONOMIE ; import lucide Clock→CalendarRange+ChevronDown",
      'constants/appVersion.ts + package.json : version 3.57.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.0',
    date: '2026-06-15',
    description:
      "style(eau) : onglet « Source » — fusion de la carte « Bassin » dans la carte « Stock d'eau du bassin » (présentationnel uniquement). La carte « Bassin » est supprimée ; sa ligne de relevé brut (hauteur/volume/date) et son crayon de saisie sont rapatriés dans la carte de tête « Stock d'eau du bassin », sous la grille Attendu/Écart, dans une rangée `mt-3 pt-3 border-t` : à gauche une zone cliquable (icône Ruler teal + ligne brute, `flex-1`) → tiroir Historique, à droite le crayon (`disabled isReadOnly||!dim`) → tiroir Saisie ; `stopPropagation` sur les deux pour ne pas déclencher « Comprendre ». Les tiroirs `'saisir'` et `'histo'` cohabitent désormais avec `explainOpen` dans la même carte. `ref={bassinCardRef}` déplacé sur la carte Stock (scroll sous Header à l'ouverture d'un tiroir + deep-link `bt=niveau` conservés). Aucun changement de calcul/service/RLS/offline. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauBassinReleves.tsx : fusion carte Bassin → carte Stock (rangée relevé + crayon + tiroirs Saisir/Histo rapatriés, ref repositionnée, carte Bassin supprimée)",
      'constants/appVersion.ts + package.json : version 3.57.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.55.0',
    date: '2026-06-15',
    description:
      "feat(eau) : 6 retouches navigation + présentation du thème Compteurs (présentationnel + navigation uniquement). (1) GESTION_EAU_NAV_ITEMS : « Compteurs » réordonné AVANT « Suivi » (Tableau de bord · Relevés · Compteurs · Suivi · Facturation). (2) EauCompteursReleves : bouton icône seule « Nouveau compteur » (lucide Network, style secondaire AHUVI border-ahuvi-200 — JAMAIS teal) à droite de Scan → navigate('/gestion-eau/compteurs?new=1') via nouvelle prop additive onNewCompteur (callback depuis EauRelevesPage). (3) EauCompteursPage : ?new=1 ouvre le formulaire de création au montage puis nettoie le paramètre (setParams({},{replace:true})). (4) Ouverture du formulaire de création → la page glisse pour caler son bord haut sous le Header (scrollElementUnderHeader, rAF×2). (5) « Modifier » d'une carte ouvre désormais un tiroir d'édition en accordéon SOUS la carte (état unifié formMode {new|edit,id} ; un seul tiroir à la fois ; re-clic referme ; carte glissée sous le Header) ; « + Nouveau » garde son panneau en haut ; logique save() create/update offline-first inchangée ; JSX du formulaire factorisé en CompteurForm. (6) Boutons d'action des cartes (QR/Modifier/Supprimer) → icône seule + title + aria-label, cibles 36px. Factorisation : scrollElementUnderHeader extrait dans utils/scrollUnderHeader.ts (iso-comportement, behavior:'instant' conservé), importé par EauCompteursReleves + EauCompteursPage. Modif partagée additive : constants/index.ts (réordonnancement du jeu de nav eau). tsc --noEmit OK, build OK.",
    changes: [
      'constants/index.ts (PARTAGÉ) : GESTION_EAU_NAV_ITEMS — Compteurs avant Suivi',
      'modules/gestion-eau/utils/scrollUnderHeader.ts : NOUVEAU — scrollElementUnderHeader factorisé (iso-comportement)',
      'components/EauCompteursReleves.tsx : import util partagé (copie locale retirée) ; bouton icône « Nouveau compteur » à droite de Scan ; prop onNewCompteur',
      "components/EauRelevesPage.tsx : onNewCompteur → navigate('/gestion-eau/compteurs?new=1')",
      'components/EauCompteursPage.tsx : ?new=1 ouvre la création ; formMode unifié {new|edit} ; édition inline sous la carte ; glissement sous Header ; CompteurForm factorisé ; actions cartes en icône seule',
      'constants/appVersion.ts + package.json : version 3.55.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.54.0',
    date: '2026-06-15',
    description:
      "style(eau) : refonte visuelle Phase 2 — application du kit EauUi aux écrans secondaires + reports Phase 1 + audit final de charte. Reports Phase 1 : token ahuvi-gold-700 (#6f6d33, contraste ≈ 5,37:1 sur blanc) ajouté dans tailwind.config.js et appliqué au TEXTE or à faible contraste (TONE_VALUE.gold de EauStatCard → KPI « Conso électrique » du Dashboard ; accents élec text-[#8a8836] résiduels de EauCompteursReleves ; badge ● nouveau de EauAlertesPage ; badge rôle de EauDemandesPage) ; #9D9B4B (ahuvi-gold) conservé pour surfaces/icônes/séries de graphes ; pin Leaflet de EauCartePage → EAU_CHART.forest (plus d'hex #364E30 en dur). EauTendancesPage : ChartCard local supprimé → EauChartCard ; consts couleurs adossées à EAU_CHART (FOREST/OLIVE/GOLD/TEAL/ROSE) + grille #eee → EAU_CHART.grid ; icônes de titres. EauProprietaireBassinPage : carte niveau → EauChartCard + EAU_CHART.teal. Bordures border-gray-200 des cartes/listes → border-ahuvi-100 (Demandes, Annonces, Audit, Config, Rapports, Utilisateurs, Alertes, TiroirSaisie photo). Micro-interactions : animate-fade-in sur les listes/sections principales ; cibles tactiles agrandies (boutons Modifier/Supprimer/Fermer d'Annonces → 44px ; Traité/Lu d'Alertes → min-h 44px). Passe Impeccable bridée AHUVI (audit/critique/polish). Présentationnel pur : aucune logique, donnée, libellé métier ni navigation modifiés ; isAnimationActive={false} conservé ; offline-first inchangé. tsc --noEmit OK, build OK.",
    changes: [
      'tailwind.config.js : +token ahuvi-gold-700 (#6f6d33, encre or accessible ≥ 4,5:1)',
      'components/EauUi.tsx : TONE_VALUE.gold → text-ahuvi-gold-700 (valeur texte accessible ; surfaces/icônes restent #9D9B4B)',
      'components/EauTendancesPage.tsx : ChartCard local supprimé → EauChartCard ; couleurs → EAU_CHART ; grille → EAU_CHART.grid ; icônes de titres',
      'components/EauProprietaireBassinPage.tsx : carte niveau → EauChartCard + EAU_CHART.teal',
      'components/EauCartePage.tsx : pin Leaflet #364E30 → EAU_CHART.forest',
      'components/EauCompteursReleves.tsx : accents élec text-[#8a8836] → text-ahuvi-gold-700',
      'components/EauDemandesPage.tsx : badge rôle or → ahuvi-gold/15 + gold-700 ; cartes border-gray-200 → border-ahuvi-100',
      'Bordures cartes/listes border-gray-200 → border-ahuvi-100 (Annonces, Audit, Config, Rapports, Utilisateurs, Alertes, TiroirSaisie)',
      'Micro-interactions : animate-fade-in sur listes/sections principales',
      'Cibles tactiles : boutons Modifier/Supprimer/Fermer (Annonces) → 44px ; Traité/Lu (Alertes) → min-h 44px',
      'constants/appVersion.ts + package.json : version 3.54.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.53.0',
    date: '2026-06-14',
    description:
      "style(eau) : refonte visuelle Phase 1 — centralisation du kit d'UI + suppression du bleu/gris générique + palette de graphes unique. EauUi.tsx (partagé intra-module) : ajout EauCard, EauChartCard, EauSectionTitle, EauShortcut et EAU_CHART (tokens recharts source unique : forest/olive/gold/goldLight/teal/rose/elec/grid) ; tones gold/teal de EauStatCard adossés aux tokens AHUVI (bg-ahuvi-gold/15, cyan-50) au lieu d'hex arbitraires ; tous ré-exportés par components/index.ts. Suppression de TOUT le bleu (boutons « Modifier » EauCompteursReleves/EauCompteursPage/EauBassinReleves → style secondaire AHUVI border-ahuvi-200 text-ahuvi-forest). Bordures border-gray-200/300 des cartes/listes → border-ahuvi-100 (Anomalies, Compteurs, Carte, Facturation, Client, histo Compteurs/Bassin). Couleurs de séries recharts alignées sur EAU_CHART dans EauDashboard/EauCompteursReleves/EauBassinReleves/EauFacturationPage/EauClientPage (plus aucun hex de graphe en dur ; isAnimationActive={false} conservé). Composants locaux dupliqués supprimés : Card (EauDashboard → EauCard/EauChartCard + CardHeader extrait), RaccourciButton (EauRelevesPage → EauShortcut). Passe Impeccable bridée AHUVI (audit/critique/polish) : aria-label sur la recherche compteur, titres de cartes-graphe harmonisés. Présentationnel pur : aucune logique, donnée, libellé métier ni navigation modifiés ; offline-first inchangé. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauUi.tsx : +EauCard, EauChartCard, EauSectionTitle, EauShortcut, EAU_CHART ; tones gold/teal sur tokens AHUVI',
      'components/index.ts : ré-export du kit (EauCard/EauChartCard/EauSectionTitle/EauShortcut/EAU_CHART + bricks existantes)',
      'Suppression du bleu : boutons Modifier (EauCompteursReleves, EauCompteursPage, EauBassinReleves) → secondaire AHUVI',
      'Bordures cartes/listes border-gray-200/300 → border-ahuvi-100 (Anomalies, Compteurs, Carte, Facturation, Client, Compteurs/Bassin)',
      'Recharts : couleurs de séries → EAU_CHART (Dashboard, CompteursReleves, BassinReleves, Facturation, Client)',
      'EauDashboard : Card local → EauCard/EauChartCard (+CardHeader) ; EauRelevesPage : RaccourciButton → EauShortcut',
      'a11y : aria-label sur la recherche compteur',
      'constants/appVersion.ts + package.json : version 3.53.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.52.1',
    date: '2026-06-14',
    description:
      "style(eau) : onglet Source — la carte « Bassin » adopte le pattern des cartes Compteur. EauBassinReleves.tsx : le résumé (icône Ruler + « Bassin » + détail hauteur/volume/date) devient un role=button cliquable (clavier Enter/Espace) qui ouvre/ferme le tiroir Historique ; le bouton « Historique » plein-largeur est supprimé ; le bouton « Saisir hauteur » plein-largeur est remplacé par un crayon compact (w-9 h-9, icône Pencil seule, états actif bg-ahuvi-forest / inactif bg-ahuvi-50, disabled si isReadOnly||!dim) aligné à droite (mt-1.5 flex justify-end), sÅ“ur du résumé avec stopPropagation — strictement calqué sur le pencilButton de CompteurCard. Import lucide History retiré (inutilisé). Présentationnel pur : drawers Saisir/Historique, calculs, openIntent/deep-links et offline-first inchangés. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauBassinReleves.tsx : carte Bassin — résumé cliquable → tiroir Historique (bouton Historique supprimé)',
      'components/EauBassinReleves.tsx : bouton « Saisir hauteur » plein-largeur → crayon compact w-9 h-9 (parité cartes Compteur), stopPropagation',
      'components/EauBassinReleves.tsx : import lucide History retiré (inutilisé)',
      'constants/appVersion.ts + package.json : version 3.52.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.52.0',
    date: '2026-06-14',
    description:
      "feat(eau) : page Relevés réduite de 3 à 2 onglets — « Compteurs » (inchangé, les débits) et « Source » (nouveau, fusion des ex-onglets Bassin + Apports = crédit + solde). EauRelevesPage.tsx — TabKey 'compteurs'|'source' ; EauTabs à 2 entrées (Compteurs/Gauge, Source/Droplet) ; rendu 'source' = un seul EauBassinReleves avec creditsSlot=<EauApportsReleves/> ; deep-links re-routés (tab=bassin|apports → 'source', bt entree/debit/niveau → apportsAutoOpen/bassinIntent) sans changer le schéma d'URL ; raccourcis bas inchangés (goSaisirBassin/goAjouterApport → 'source'). EauBassinReleves.tsx — prop optionnelle additive creditsSlot rendue entre la carte Bassin et la section Tests de débit (ordre : Stock → Bassin → Apports → Tests de débit → admin Relevés récents). Réorganisation d'UI pure : aucun calcul de bilan, service, schéma Supabase ni RLS touché ; offline-first inchangé. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauRelevesPage.tsx : 2 onglets Compteurs/Source ; onglet Apports supprimé ; rendu source = EauBassinReleves + creditsSlot=EauApportsReleves',
      'components/EauRelevesPage.tsx : deep-links tab=bassin|apports re-routés vers source (schéma d\'URL inchangé) ; imports Sprout/Waves→Droplet ajouté',
      'components/EauBassinReleves.tsx : prop additive creditsSlot rendue entre la carte Bassin et la section Tests de débit',
      'FONCTIONNEMENT-MODULES.md : nouvelle structure page Relevés (Compteurs / Source)',
      'constants/appVersion.ts + package.json : version 3.52.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.51.6',
    date: '2026-06-14',
    description:
      "style(eau) : page Compteurs — le bouton « Modifier » d'une carte compteur adopte le pavé bleu (bg-blue-100 text-blue-700, px-3 py-1.5 rounded-lg text-xs, hover:bg-blue-200, icône NotebookPen w-3.5) identique au bouton « MODIFIER » du tiroir Historique des Relevés, au lieu du lien texte olive souligné. EauCompteursPage.tsx — className du bouton + icône Pencil→NotebookPen ; imports : Pencil retiré, NotebookPen ajouté. onClick openEdit(c), title et libellé « Modifier » inchangés. Présentationnel pur. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursPage.tsx : bouton « Modifier » carte compteur en pavé bleu (parité avec le tiroir Historique des Relevés), icône NotebookPen',
      'components/EauCompteursPage.tsx : import Pencil retiré, NotebookPen ajouté',
      'constants/appVersion.ts + package.json : version 3.51.6 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.51.5',
    date: '2026-06-13',
    description:
      "style(eau) : tiroir « Saisir » d'un relevé compteur — l'icône appareil photo passe en haut à droite (ligne du sélecteur Eau/Élec), serrée complètement à droite, et remplace le bouton plein-largeur « Prendre / choisir une photo ». EauTiroirSaisie.tsx — la ligne du sélecteur devient `flex items-center justify-between` ; ajout d'un `<label>` compact (w-10 h-10, icône Camera seule) qui enveloppe l'input fichier caché (mêmes onPhotoChange, accept image/*, capture=environment, disabled isReadOnly||photoBusy) ; l'ancien bouton en pointillés est supprimé ; le bloc d'aperçu (vignette + Retirer) ne s'affiche plus que lorsqu'une photo existe. Présentationnel pur : aucune logique photo/calcul touchée, hors-ligne inchangé. tsc --noEmit OK.",
    changes: [
      'components/EauTiroirSaisie.tsx : icône appareil photo déplacée en haut à droite (justify-between), label compact w-10 h-10 enveloppant l\'input fichier caché',
      'components/EauTiroirSaisie.tsx : suppression du bouton plein-largeur « Prendre / choisir une photo » ; aperçu photo conditionné à la présence d\'une photo',
      'constants/appVersion.ts + package.json : version 3.51.5 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.51.4',
    date: '2026-06-13',
    description:
      "feat(eau) : édition de la DATE des relevés dans le tiroir Historique des compteurs (admin). EauCompteursReleves.tsx (HistoriqueDrawer) — le mode MODIFIER ajoute, par relevé, un champ `<input type=\"datetime-local\">` (date+heure locale) à côté de l'index et de la note. EditDraft gagne `datetime` ; `enterEdit` le sème via `isoToLocalInput(r.date)` ; `dirty` compare aussi la date ; `handleSave` valide (non vide + refus du futur via `isFutureLocal`, comme la saisie bassin) et pousse `patch.timestamp = new Date(d.datetime).toISOString()` à `updateReleveCompteur`/`updateReleveElec` (déjà génériques sur le patch, aucun changement service). La conso d'intervalle se recalcule à la relecture (séries triées par date croissante côté eau ET élec). Helpers purs `isoToLocalInput`/`isFutureLocal` ajoutés localement (miroir EauBassinReleves). Offline-first inchangé. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : champ date/heure (datetime-local) par relevé en mode MODIFIER (eau + élec)',
      'components/EauCompteursReleves.tsx : EditDraft.datetime + validation (refus date future/vide) + patch timestamp',
      'constants/appVersion.ts + package.json : version 3.51.4 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.51.3',
    date: '2026-06-13',
    description:
      "feat/style(eau) : tiroir Historique des compteurs — action admin déplacée en bas + icônes carnet-crayon, et intégration du bouton Scan dans l'onglet Compteurs. EauCompteursReleves.tsx (HistoriqueDrawer) — le bloc d'action admin (avis post-enregistrement + bouton MODIFIER/ENREGISTRER) est déplacé du haut vers le BAS du tiroir, sous la liste des relevés (`flex justify-end`) ; le sélecteur Eau/Élec reste en haut (`{selecteur && …}`). Icônes : MODIFIER et ENREGISTRER utilisent désormais `NotebookPen` (w-3.5) au lieu de Pencil/Save ; `Save` retiré des imports. EauBassinReleves.tsx — le crayon de correction d'un relevé de niveau passe de `Pencil` à `NotebookPen` (couleur bleue et carré w-9 h-9 inchangés). Inclus aussi le déplacement du bouton « Scan » (QR compteur) de EauRelevesPage.tsx vers l'onglet Compteurs via la prop `onScan`. Comportement/handlers/calculs inchangés, hors-ligne inchangé. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : bouton MODIFIER/ENREGISTRER (+ avis) déplacé tout en bas du tiroir Historique ; sélecteur Eau/Élec reste en haut',
      'components/EauCompteursReleves.tsx : icônes NotebookPen (carnet+crayon) sur MODIFIER et ENREGISTRER (Save retiré des imports)',
      'components/EauBassinReleves.tsx : crayon de correction d\'un relevé de niveau → NotebookPen',
      'components/EauRelevesPage.tsx : bouton « Scan » intégré dans l\'onglet Compteurs via prop onScan (retiré du haut de page)',
      'constants/appVersion.ts + package.json : version 3.51.3 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.51.2',
    date: '2026-06-13',
    description:
      "style(eau) : alignement vertical de la ligne d'infos des cartes compteur (présentationnel pur, aucun handler/calcul/réseau/libellé touché, hors-ligne inchangé). EauCompteursReleves.tsx (cas `!never`) — le conteneur de la rangée infos+crayon passe de `flex items-start gap-2` à `flex items-end gap-2` : la ligne d'infos (Eau · date · conso) est désormais alignée par le bas, sa base au niveau du bas du bouton crayon (w-9 h-9), au lieu d'être collée en haut. Le cas `never` (crayon seul, justify-end) est inchangé. tsc --noEmit OK.",
    changes: [
      'components/EauCompteursReleves.tsx : rangée infos+crayon items-start → items-end (base alignée sur le bas du crayon)',
      'constants/appVersion.ts + package.json : version 3.51.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.51.1',
    date: '2026-06-13',
    description:
      "style(eau) : harmonisation présentationnelle des boutons « Modifier » du module Eau sur le pavé bleu de BazarKELY (Transactions/Prêts). Aucun handler/calcul/réseau/libellé touché, hors-ligne inchangé. EauCompteursReleves.tsx (HistoriqueDrawer, admin) — le bouton MODIFIER passe au style `bg-blue-100 text-blue-700 hover:bg-blue-200` (base `gap-1 text-xs`, icônes `w-3.5`) ; l'état modifié (ENREGISTRER) reste `bg-ahuvi-forest text-white` (vert) pour rester distinct ; le ternaire 3 états (blanc/gris-vert/vert) est réduit à `dirty ? vert : bleu`. EauBassinReleves.tsx — le crayon icône-seule par ligne (édition relevé de niveau) passe de `text-ahuvi-forest hover:bg-ahuvi-50` à `text-blue-700 hover:bg-blue-100` (reste un carré `w-9 h-9`). Libellés conservés en MAJUSCULES. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : bouton MODIFIER → pavé bleu (BazarKELY) ; ENREGISTRER reste vert',
      'components/EauBassinReleves.tsx : crayon de correction d\'un relevé de niveau → accent bleu',
      'constants/appVersion.ts + package.json : version 3.51.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.51.0',
    date: '2026-06-13',
    description:
      "feat(eau) : 2 finitions UI page Relevés v2 (présentationnel pur, aucun calcul/réseau touché). EauCompteursReleves.tsx (CompteurCard) — le bouton « Saisir » pleine largeur est remplacé par un bouton icône-crayon compact (w-9 h-9, lucide Pencil) : ligne d'infos sortie du résumé cliquable pour former une rangée `flex items-start gap-2` (infos `flex-1 min-w-0` à gauche, crayon `flex-shrink-0` à droite) ; cas `never` (aucun relevé) → crayon seul `justify-end` sous l'identité (saisie du 1áµ‰Ê³ relevé toujours possible). Le crayon reste SÅ’UR du résumé `role=button` (jamais imbriqué) : clic crayon `stopPropagation` → tiroir Saisir, clic carte → Historique ; actif `bg-ahuvi-forest text-white` sinon `bg-ahuvi-50 …`, `disabled={isReadOnly}`, `aria-label`. EauBassinReleves.tsx — la carte « Stock d'eau du bassin » devient cliquable (role/button, tabIndex, aria-expanded, Entrée/Espace, focus ring) ; affordance `Info + « Comprendre cette situation » + ChevronDown` qui pivote ; au clic, tiroir (composant Drawer existant) déplié SOUS les chiffres affichant UN seul cas (A→F) selon `bilan` null / `anomalie` / signe `ecart_m3` (EPS 0,05 m³) avec titre + texte FR validé + conseil, ton vert/ambre/rose/neutre. Import Info ajouté. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : crayon compact (icône seule) à droite de la ligne d\'infos, bouton « Saisir » pleine largeur supprimé ; cas sans relevé géré',
      'components/EauBassinReleves.tsx : carte « Stock d\'eau du bassin » cliquable → tiroir « Comprendre cette situation » (6 cas A→F, textes FR validés)',
      'constants/appVersion.ts + package.json : version 3.51.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.50.2',
    date: '2026-06-13',
    description:
      "fix(gestion-eau) : déclenchement du scroll « carte sous le Header » (Point 2) fiabilisé. La v3.50.1 forçait bien `behavior:'instant'` mais le scroll n'était JAMAIS appelé (validé en prod : scrollTop figé à 0 sur toute l'animation alors que le tiroir s'ouvrait) — le scroll était planifié DANS l'updater de `setOpenKey`, où `cardRefs.current.get(id)` renvoyait null (refs non garanties pendant la phase de rendu). Correctif : déplacer le scroll dans un `useEffect([openKey])` post-commit (refs attachées) + retirer le `scrollIntoView` redondant du chemin preselect (deep-link) au profit du même effet (alignement cohérent sous le Header). tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : scroll déplacé de l\'updater setOpenKey vers useEffect([openKey]) (refs fiables post-commit)',
      'components/EauCompteursReleves.tsx : preselect deep-link n\'appelle plus scrollIntoView (l\'effet [openKey] aligne sous le Header)',
      'constants/appVersion.ts + package.json : version 3.50.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.50.1',
    date: '2026-06-13',
    description:
      "fix(gestion-eau) : le scroll « carte sous le Header » (Point 2 de v3.50.0) ne se déclenchait pas sur les pages du module — le shell pose `scroll-behavior: smooth` sur <html>, donc le `window.scrollTo(0, y)` par image de scrollElementUnderHeader héritait du smooth natif et relançait une animation à chaque frame → mouvement net nul (validé en prod : scrollTop figé malgré le clic ; `window.scrollTo({behavior:'instant'})` bouge bien). Correctif : forcer `behavior: 'instant'` sur chaque scroll de l'animation maison (l'easing reste géré par notre rAF) — robuste aussi sur les pages sans smooth. Points 1/3/4 (clic carte = Historique, édition admin des relevés, libellé bassin) déjà validés en prod sur v3.50.0. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : scrollElementUnderHeader force window.scrollTo({behavior:\'instant\'}) (override du scroll-behavior:smooth du shell)',
      'constants/appVersion.ts + package.json : version 3.50.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.50.0',
    date: '2026-06-13',
    description:
      "feat(gestion-eau) : retouches cartes Compteurs (clic carte = Historique, scroll sous header, édition admin des relevés) + libellé bassin « Stock d'eau du bassin » (déjà v3.49.1, vérifié). EauCompteursReleves.tsx — Point 1 : le corps de la carte (résumé) devient cliquable (role/button, tabIndex, aria-expanded, Entrée/Espace) et bascule le tiroir Historique ; bouton « Historique » supprimé ; bouton « Saisir » conservé avec stopPropagation. Point 2 : à l'ouverture d'un tiroir (Saisir ou Historique), scrollElementUnderHeader fait glisser le bord haut de la carte juste sous le Header (réplique TransactionsPage.toggleTransactionDrawer : rAF + ease-in-out cubique, cible recalculée par image, respect prefers-reduced-motion). Point 3 : HistoriqueDrawer reçoit isAdmin + onReload ; admin → bouton MODIFIER (index + note des 6 relevés affichés, par nature eau/élec éditables), bascule en ENREGISTRER au 1áµ‰Ê³ changement → persistance offline-first idempotente (eau updateReleveCompteur, élec updateReleveElec), conso recalculée à la relecture, toast + encart « Recalculer tous les bilans » ; non-admin = pas de bouton. eauReleveService.ts : updateReleveCompteur(id, patch) AJOUTÉ (miroir updateReleveElec/Bassin : saveLocal upsert idempotent, _dirty, withTimeout). RLS : eau_releves_compteur / eau_elec_releves_compteur UPDATE admin déjà en place (4 policies sel/ins/upd/del). tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : carte cliquable → Historique (Point 1), bouton Historique supprimé, Saisir + stopPropagation',
      'components/EauCompteursReleves.tsx : scrollElementUnderHeader (Point 2, patron TransactionsPage) déclenché à l\'ouverture d\'un tiroir',
      'components/EauCompteursReleves.tsx : HistoriqueDrawer édition admin (Point 3) MODIFIER/ENREGISTRER + avis recalcul bilans',
      'services/eauReleveService.ts : updateReleveCompteur(id, patch) [NOUVEAU] (miroir updateReleveElec, offline-first idempotent)',
      'components/EauBassinReleves.tsx : libellé « Stock d\'eau du bassin » (Point 4, déjà v3.49.1 — vérifié)',
      'constants/appVersion.ts + package.json : version 3.50.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.49.1',
    date: '2026-06-13',
    description:
      "chore(gestion-eau) : libellé carte bassin « Stock d'eau du bassin » au lieu de « Solde du bassin » (affichage uniquement). EauBassinReleves.tsx : titre de carte + mention « Stock de référence — … » (cas bilan absent) + commentaires. EauRelevesPage.tsx : commentaire d'en-tête. Aucun changement de calcul/logique (computeBilan, stockMesure/stockAttendu/ecart, sous-libellés Mesuré/Attendu/Écart inchangés). tsc --noEmit OK, build OK.",
    changes: [
      'components/EauBassinReleves.tsx : titre « Stock d\'eau du bassin » + « Stock de référence — … » + commentaires',
      'components/EauRelevesPage.tsx : commentaire d\'en-tête (stock d\'eau)',
      'constants/appVersion.ts + package.json : version 3.49.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.49.0',
    date: '2026-06-13',
    description:
      "feat(gestion-eau) : modele d'apport « flotteur » (Phase 3, bande -10 cm) + saisie debit par hauteur/heure. utils/bilan.ts : nouveau helper pur estimerApportFlotteur (priorite override > entrees > mesure (bilan de matiere Î”stock + conso metree, plafonne a V_flotteur = surface x Hf) > repli debit x Î”t x FRACTION_POMPE plafonne, gate bande de regulation stockPrev >= V_bas) ; remplace l'ancien apport debit x Î”t x FRACTION_POMPE qui surestimait. BilanResult expose apportMode ; helper isApportDebitMode pour l'UI (derivation sans persistance). computeBilan recoit surfaceM2/hauteurFlotteurM/bandFlotteurM depuis eauBilanService (config). eau_config : colonne bassin_band_flotteur_cm (defaut 10) refletee dans ConfigRow/ConfigLocal + emptyConfig + helper bandFlotteurMFromConfig (repli 0,10 m) + champ EauConfigPage. EauBassinReleves : test de debit saisi par hauteur debut/fin (cm) + heure debut/fin (duree derivee, gestion passage minuit). EauApportsReleves : carte Apport estime (dernier bilan) avec libelle flotteur/debit. FRACTION_POMPE reste source unique (re-exportee par projection/consoEstimee), reduite au repli documente. Tests : eauApportFlotteur.test.ts (14) + maj eauBassinDebit.test.ts. tsc --noEmit OK, build OK.",
    changes: [
      'modules/gestion-eau/utils/bilan.ts : helper pur estimerApportFlotteur + ApportMode + EstimerApportInput/Result + isApportDebitMode ; computeBilan branche le modele flotteur (surface/flotteur/bande) ; BilanResult.apportMode',
      'modules/gestion-eau/services/eauBilanService.ts : injecte surfaceM2/hauteurFlotteurM/bandFlotteurM (config) dans computeBilan',
      'modules/gestion-eau/services/eauConfigService.ts : bandFlotteurMFromConfig (repli 0,10 m) + emptyConfig',
      'modules/gestion-eau/types/gestionEau.ts : ConfigRow.bassin_band_flotteur_cm',
      'modules/gestion-eau/components/EauConfigPage.tsx : champ Bande flotteur (cm)',
      'modules/gestion-eau/components/EauBassinReleves.tsx : test de debit par hauteur + heure debut/fin (duree derivee)',
      'modules/gestion-eau/components/EauApportsReleves.tsx : carte Apport estime (modele flotteur, libelle mesure/debit)',
      'modules/gestion-eau/__tests__/eauApportFlotteur.test.ts [NOUVEAU] + maj eauBassinDebit.test.ts',
      'SQL : ALTER TABLE eau_config ADD COLUMN bassin_band_flotteur_cm numeric (defaut 10) — idempotent',
      'constants/appVersion.ts + package.json : version 3.49.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.48.1',
    date: '2026-06-13',
    description:
      "fix(cache) : stopper l'index.html périmé servi après déploiement (cache edge Cloudflare + Service Worker). Couche A — public/_headers : `Cache-Control: no-cache` (revalidation systématique, PAS no-store) sur la racine `/` (start_url PWA) et `/index.html`, car les routes SPA sans extension `.html` (servies via _redirects /* /index.html 200) échappaient à la règle /*.html et pouvaient être mises en cache au bord. Couche B — src/sw-custom.ts : la navigation SPA passe de « cache d'abord » (createHandlerBoundToURL) à NetworkFirst (cacheName html-cache, networkTimeoutSeconds 3) avec repli offline sur l'index.html précaché (matchPrecache via handlerDidError). En ligne : document toujours frais (le no-cache de la Couche A contourne l'edge périmé). Hors-ligne : l'app charge depuis le précache. Inchangés : precacheAndRoute/__WB_MANIFEST, cleanupOutdatedCaches, skipWaiting+clientsClaim, api-cache NetworkFirst, précache Tesseract (/tesseract/* wasm/gz), denylist navigation (/api/*, /supabase/*, assets, /sw*.js, /workbox-*, /manifest*), repli SPA _redirects, Pages Functions (/i/*, /og-invite.png, /api/ocr-receipt). tsc --noEmit OK, build OK.",
    changes: [
      'public/_headers : règles no-cache pour `/` et `/index.html` (document d\'entrée SPA jamais servi périmé par l\'edge Cloudflare)',
      'src/sw-custom.ts : navigation SPA NetworkFirst (timeout 3 s) + repli précache offline (matchPrecache) au lieu de createHandlerBoundToURL « cache d\'abord »',
      'constants/appVersion.ts + package.json : version 3.48.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.48.0',
    date: '2026-06-13',
    description:
      'feat(gestion-eau) : refonte page Relevés « façon Transactions » — Phase 2 (onglets Bassin & Apports + finitions). Onglet Bassin (EauBassinReleves) : carte « Solde du bassin » (mesuré + % remplissage réf. flotteur via getDashboardData, attendu = stock_attendu du dernier bilan, écart m³/pct avec ton anomalie) ; carte « Bassin » à tiroirs Saisir hauteur (conversion cm→m³ live, addReleveBassin déclenche un bilan) et Historique (6 derniers niveaux + mini-courbe) ; section repliable « Tests de débit » (débit courant getDebitCourantM3h, liste + nouveau test addDebitTest) ; section admin/releveur « Relevés récents » (édition/suppression + recalcul) conservée. Onglet Apports (EauApportsReleves) : KPI apports cumulés période, tiroir Ajouter (volume+note+date, addEntreeBassin idempotent offline-first), liste des derniers apports. Deep-links préservés (schéma ?bt= inchangé, EauDashboard/eauInvitationService non touchés) : ?bt=niveau→Bassin/Saisir, ?bt=debit→Bassin/Tests, ?bt=entree→Apports/Ajouter, ?tab=elec→Compteurs + tiroir Saisir sur Élec (compteur au relevé élec le plus récent). Historique multi-nature (sélecteur eau/élec) sur compteur dual. Nettoyage : EauSaisieBassinPage/EauSaisieCompteurPage/EauSaisieElecPage/EauTourneePage supprimés (orphelins, zéro import). utils/bilan.ts NON modifié (Phase 3). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauRelevesPage.tsx (PARTAGÉ) : 3 onglets actifs + routage deep-links ?bt=niveau|debit|entree + ?tab=elec + raccourcis Saisir bassin/Ajouter apport',
      'modules/gestion-eau/components/EauBassinReleves.tsx : onglet Bassin façon Transactions [NOUVEAU]',
      'modules/gestion-eau/components/EauApportsReleves.tsx : onglet Apports façon Transactions [NOUVEAU]',
      'modules/gestion-eau/components/EauCompteursReleves.tsx : deep-link élec (préselection compteur + nature Élec) + historique multi-nature (sélecteur eau/élec)',
      'modules/gestion-eau/services/eauReleveService.ts : + listEntreesBassin()',
      'modules/gestion-eau/components/{EauSaisieBassinPage,EauSaisieCompteurPage,EauSaisieElecPage,EauTourneePage}.tsx : SUPPRIMÉS (orphelins, zéro import)',
      'constants/appVersion.ts + package.json : version 3.48.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.47.1',
    date: '2026-06-13',
    description:
      'fix(auth) : retour OAuth jamais consommé quand un drapeau isAuthenticated périmé subsistait (session Supabase expirée mais store encore « connecté »). main.tsx capture les jetons du hash dans sessionStorage, mais AppLayout, voyant isAuthenticated=true (périmé), routait /auth → Navigate /dashboard → AuthPage jamais montée → jetons jamais consommés → aucune session établie → espace eau « Reconnexion requise » en boucle. Correctif additif : route /auth ajoutée dans la branche AUTHENTIFIÉE d’AppLayout, qui rend AuthPage quand sessionStorage contient des jetons OAuth en attente (sinon redirige /dashboard comme avant). AuthPage consomme alors les jetons (setSession) et établit la vraie session. Aucun changement des règles setAuthenticated (toujours false sur SIGNED_OUT seulement) ni du flux normal (login, navigation, offline). tsc --noEmit OK, build OK. Validé en navigateur sur 1sakely.org (session admin rétablie).',
    changes: [
      'components/Layout/AppLayout.tsx : branche authentifiée — route /auth rend AuthPage si jetons OAuth en attente (sessionStorage), sinon Navigate /dashboard',
      'constants/appVersion.ts + package.json : version 3.47.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.47.0',
    date: '2026-06-13',
    description:
      'feat(gestion-eau) : refonte de la page Relevés « façon Transactions » — Phase 1 (socle + onglet Compteurs). Shell 3 onglets (Compteurs/Bassin/Apports) + bouton Scan intégré DANS la page (EauQrScanner conservé in-page) + aide dépliable + badge lecture seule. Onglet Compteurs (EauCompteursReleves) : 2 KPI (conso eau sur période 7j/30j/1an persistée localStorage `ahuvi_releves_periode` + progression du jour faits/total via getTourneeData) ; recherche nom/propriétaire/zone ; chips de période ; cartes-compteur eau+élec mélangées et dédupliquées (icône Droplet/Zap, dernier index + date + conso m³/kWh) triées « mode tournée » (jamais relevé → à relever aujourd’hui → fait, ordre zone/ordre/nom) ; tiroirs accordéon (un seul ouvert) Saisir (EauTiroirSaisie : réutilise evaluer/addReleveCompteur + evaluer/addReleveElec, sélecteur eau/élec, rupture + aberrant + photo + note, idempotent offline-first) et Historique (6 derniers relevés, 3 empilés + scroll, mini-graphe recharts isAnimationActive=false). Deep-link `?tab=compteur&c=<id>` (scan) préselectionne le compteur et ouvre sa saisie. Onglet Bassin CONSERVÉ fonctionnel (EauSaisieBassinPage) pour ne pas casser les deep-links `?tab=bassin&bt=…` (cartes bassin du tableau de bord + atterrissage invitation admin/releveur) ; onglet Apports = coquille « bientôt » (Phase 2). Services additifs : relevesByCompteur() / relevesElecByCompteur() (lecture Dexie groupée). Aucune nouvelle table. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauRelevesPage.tsx : refonte shell 3 onglets + Scan in-page + raccourcis (PARTAGÉ : deep-links scan/bassin préservés)',
      'modules/gestion-eau/components/EauCompteursReleves.tsx : onglet Compteurs (KPI, recherche, chips, cartes, tiroirs) [NOUVEAU]',
      'modules/gestion-eau/components/EauTiroirSaisie.tsx : tiroir Saisir mutualisé eau/élec [NOUVEAU]',
      'modules/gestion-eau/services/eauReleveService.ts : + relevesByCompteur()',
      'modules/gestion-eau/services/eauElecReleveService.ts : + relevesElecByCompteur()',
      'constants/appVersion.ts + package.json : version 3.47.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.46.12',
    date: '2026-06-12',
    description: 'fix(navigation) : reprise du dernier module — corrige le timing sur la racine \'/\'. La 3.46.11 figeait la garde one-shot dès le 1er rendu sur \'/\', mais la navigation de reprise y perdait la course contre la redirection \'/\' → \'/dashboard\' d\'AppLayout (<Navigate replace>) → la reprise n\'avait jamais lieu et l\'étiquette était écrasée en \'bazarkely\'. Correctif : \'/\' n\'est plus une adresse de DÉCISION mais une adresse de lancement transitoire — l\'effet ne consomme PAS la garde sur \'/\' et retente de façon déterministe sur \'/dashboard\' (adresse stable, sans redirection concurrente), où la reprise s\'effectue (chemin éprouvé depuis v3.31.4). La garde n\'est figée que sur une adresse stable (\'/dashboard\' ou une route de module). Comportement validé navigateur sur 1sakely.org (Gestion Eau / Construction / BazarKELY, liens directs, F5). tsc --noEmit OK, build OK.',
    changes: [
      'contexts/ModuleSwitcherContext.tsx : \'/\' = adresse transitoire (defer vers \'/dashboard\'), garde figée seulement sur adresse stable',
      'constants/appVersion.ts + package.json : version 3.46.12',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.11',
    date: '2026-06-12',
    description: 'feat(navigation) : reprise du dernier module à la réouverture étendue à la racine \'/\' (start_url de la PWA). ModuleSwitcherContext.tsx — (1) effet de reprise one-shot désormais éligible sur \'/\' OU \'/dashboard\' (avant : \'/dashboard\' seul) ; au lancement de l\'app installée (qui s\'ouvre sur \'/\'), la reprise s\'exécute au lieu d\'être grillée. Timing one-shot durci : la garde hasCheckedStorage n\'est figée qu\'après évaluation d\'une adresse éligible (\'/\' ou \'/dashboard\') OU d\'une adresse de module (respectée, jamais de reprise) ; un 1er rendu transitoire non éligible/non-module ré-évalue au rendu suivant. (2) Persistance du dernier module sur TOUT changement de module déterminé par la route (lien direct/URL, plus seulement le sélecteur), AVEC exception pathname === \'/\' pour ne pas écraser le vrai dernier module avant que la reprise l\'ait lu. Invariant du verrou de navigation préservé : liens/signets/F5 sur une adresse de module maintiennent l\'adresse exacte ; aucune reprise sur une route préfixée par un module. tsc --noEmit OK, build OK.',
    changes: [
      'contexts/ModuleSwitcherContext.tsx : reprise éligible sur \'/\' + \'/dashboard\', timing one-shot, persistance du dernier module par tout moyen (sauf \'/\')',
      'constants/appVersion.ts + package.json : version 3.46.11 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.10',
    date: '2026-06-10',
    description: 'feat(gestion-eau) : releveur peut éditer/supprimer un relevé de bassin sur la fenêtre 48 h glissantes. Le panneau dépliable « Relevés récents » (EauSaisieBassinPage, onglet Niveau) — jusqu\'ici `roles.admin` only — s\'ouvre au releveur (additif, conditionné par rôle). (1) Frontend : chargement de la liste pour admin OU releveur ; pour un releveur PUR (`roles.releveur && !roles.admin`), liste filtrée aux relevés ≤ 48 h (visibleReleves), libellé « Relevés récents — modifiables 48 h », aide expliquant la limite, garde-fou 48 h dans saveEdit (toast) + bornes min/max sur l\'input datetime-local, bouton « Recalculer tous les bilans » masqué (admin only). Admin inchangé (liste complète, sans limite). Services non modifiés (role-agnostiques). (2) RLS : 4 policies remplacées (idempotent) — eau_rb_upd/eau_rb_del (eau_releves_bassin) et eau_bil_upd/eau_bil_del (eau_bilans) autorisent admin (tout) OU releveur (using+with check timestamp >= now() - interval 48 heures), pour que le recalcul des bilans voisins déclenché par l\'édition ≤ 48 h n\'échoue pas en 401. Aucune donnée/colonne modifiée. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx : panneau relevés ouvert au releveur, fenêtre 48 h (UI + garde-fou)',
      'RLS Supabase : eau_rb_upd/eau_rb_del/eau_bil_upd/eau_bil_del — branche releveur ≤ 48 h',
      'constants/appVersion.ts + package.json : version 3.46.10 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.9',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : Phase 4 ÉLECTRICITÉ — finitions & pilotage. (1) Tableau de bord : carte KPI « Conso électrique » (icône Zap, tone gold) = somme par compteur de la dernière conso d\'intervalle exploitable (kWh), via getElecKpiData() (eauElecReleveService, lecture Dexie offline-first, état vide propre si 0 relevé / « 2áµ‰ relevé attendu » si pas encore de conso) ; carte cliquable → /gestion-eau/releves?tab=elec (navigate interne). (2) Cas limite blindé : evaluerReleveElec ne signale plus « aberrant bas » quand conso === 0 (index identique = absence d\'usage légitime). (3) Doc FONCTIONNEMENT-MODULES.md : sous-système électricité (relevés kWh, coûts A/B/C→D, facture combinée, PDF, matrice d\'accès). Aides élec (elecReleves/elecCouts/factureCombinee), logo PDF dégradant, skip villa sans relevé, exclusion rupture, état vide client : déjà en place (Phases 1-3), vérifiés. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauElecReleveService.ts : getElecKpiData() + garde conso 0 non aberrante',
      'modules/gestion-eau/components/EauDashboard.tsx : carte KPI « Conso électrique » (Zap) cliquable',
      'FONCTIONNEMENT-MODULES.md : sous-système électricité + matrice d\'accès',
      'constants/appVersion.ts + package.json : version 3.46.9 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.8',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : PDF facture combinée — alignement à droite. Les caractères absents de la police Helvetica (espace fine insécable U+202F des séparateurs de milliers fr-FR, et la flèche « → » de la période) faussaient le calcul de largeur de jsPDF → le texte aligné à droite (bandeau TOTAL « 575 055 MGA », ligne Période) débordait et était tronqué au bord droit. Fix : helper pdfSafe() normalise U+202F/U+00A0 en espace normale dans fmtNb/fmtAr et sur le total du bandeau ; « → » remplacé par « au » dans la période. Aucun chevauchement, aucune troncature. Validé navigateur (PDF lu). tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/utils/pdf.ts : pdfSafe() (normalise espaces fines) + période « au »',
      'constants/appVersion.ts + package.json : version 3.46.8 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.7',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : finition PDF facture combinée. (1) Logo AHUVI déployé — frontend/public/ahuvi-logo.png (800×268, gitignored) ajouté via git add -f ; sans cela /ahuvi-logo.png renvoyait le HTML de repli SPA → buildFactureCombineePdf basculait sur le titre texte. (2) Chevauchement P.U./Total des tableaux sur les gros montants corrigé : devise déplacée dans l\'en-tête des colonnes (« P.U. (MGA) » / « Total (MGA) »), cellules P.U./Total en nombre nu (fmtNb), largeurs rééquilibrées (40/24/24/26/28/32=174). (3) Encadré A/B/C/D réécrit en 4 lignes empilées pleine largeur (plus de télescopage avec la colonne C). Validé navigateur : Aperçu live V04 eau 145 500 + élec 429 555 = total 575 055, PDF lu (2 tableaux + encadré + « Soit Cinq cent soixante-quinze mille cinquante-cinq Ariary »). tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/utils/pdf.ts : colonnes devise en-tête + fmtNb cellules + encadré A/B/C/D 4 lignes',
      'frontend/public/ahuvi-logo.png : déployé (git add -f)',
      'constants/appVersion.ts + package.json : version 3.46.7 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.6',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : Phase 3 ÉLECTRICITÉ — facture COMBINÉE eau + électricité + PDF modernisé. utils/facture.ts : computeLigneElec (miroir computeLigneFacture en kWh × prixKwh, null si pas de relevé/rupture). eauFactureService : FacturePreview étendu (indexDebutElec/indexFinElec/consoKwh/montantElec/montantTotal) ; previewFactures(start,end,coutMois) et genererFactures(start,end,{coutMois,dateEcheanceIso}) calculent la ligne élec via prix_kwh du mois choisi (getCoutByMois) et persistent index_debut_elec/index_fin_elec/conso_kwh/prix_kwh/montant_elec/cout_mois/montant_total ; skip seulement si NI eau NI élec ; idempotence/numérotation inchangées. utils/montantLettres.ts (neuf, pur, 0→milliards, règles et/cents/mille) : montantEnLettres(575055)=« Cinq cent soixante-quinze mille cinquante-cinq Ariary ». utils/pdf.ts : buildFactureCombineePdf/downloadFactureCombineePdf — logo AHUVI (/ahuvi-logo.png fetch→dataURL, ratio respecté, repli texte si absent), en-tête propriétaire+villa (V04→VILLA N°4), tableau ÉLECTRICITÉ + tableau EAU, encadré A/B/C/D (transparence prix kWh), grand total sky-700 + « Soit … Ariary » ; dégradation eau-seule/élec-seule. EauFacturationPage : sélecteur « Mois de coûts élec » + garde-fou lien interne /gestion-eau/elec-couts, colonnes eau/élec/total (aperçu+liste), EauAide factureCombinee. EauClientPage : PDF combiné. tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/utils/facture.ts : computeLigneElec (kWh)',
      'modules/gestion-eau/services/eauFactureService.ts : preview/generer combinés (coutMois)',
      'modules/gestion-eau/utils/montantLettres.ts (neuf) : montant en toutes lettres',
      'modules/gestion-eau/utils/pdf.ts : buildFactureCombineePdf/downloadFactureCombineePdf',
      'modules/gestion-eau/components/EauFacturationPage.tsx : sélecteur mois coûts + colonnes eau/élec/total + PDF combiné',
      'modules/gestion-eau/components/EauClientPage.tsx : PDF combiné',
      'modules/gestion-eau/components/eauAideTextes.ts : aide factureCombinee',
      'constants/appVersion.ts + package.json : version 3.46.6 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.5',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : Phase 2 ÉLECTRICITÉ — saisie & suivi des relevés de compteur électrique (kWh). Service eauElecReleveService complété (miroir compteur eau sur eau_elec_releves_compteur) : evaluerReleveElec (rupture index< + conso=max(0,Î”) + detectAberrant via moyenne(historiqueConsoElec)+facteurAberrantFromConfig), historiqueConsoElec (deltas>0, saute rupture), addReleveElec (saveLocal upsert idempotent id client + agent_id getCurrentUserIdSync + created_at), updateReleveElec/deleteReleveElec (admin). Nouvel écran EauSaisieElecPage (copie adaptée de EauSaisieCompteurPage, kWh + icône Zap, ton or AHUVI) branché en sous-onglet « Électricité » (?tab=elec) de EauRelevesPage via EauTabs — mêmes compteurs que l\'eau (listCompteursActifs), dernier index, conso instantanée, confirmations rupture/aberrant (showConfirm), photo optionnelle, historique + BarChart 12 derniers (isAnimationActive=false). Écriture désactivée si isReadOnly (promoteur) ; accès admin+releveur via la garde de route existante de Relevés. Espace propriétaire EauClientPage (« Ma conso ») : section Électricité lecture seule par compteur (dernier index kWh + mini-BarChart conso, dégradation propre si aucun relevé). Helper fmtKwh + aide elecReleves. tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauElecReleveService.ts : evaluer/historique/add/update/delete + lectures',
      'modules/gestion-eau/components/EauSaisieElecPage.tsx (neuf) : saisie élec kWh (miroir compteur eau)',
      'modules/gestion-eau/components/EauRelevesPage.tsx : sous-onglet « Électricité » (?tab=elec)',
      'modules/gestion-eau/components/EauClientPage.tsx : section Électricité lecture seule (« Ma conso »)',
      'modules/gestion-eau/utils/format.ts : helper fmtKwh',
      'modules/gestion-eau/components/eauAideTextes.ts : aide elecReleves',
      'constants/appVersion.ts + package.json : version 3.46.5 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.4',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : socle ÉLECTRICITÉ (Phase 1 de la facture combinée eau+élec) + écran admin « Coûts électricité du mois ». SQL (idempotent, RLS to public + helpers eau_is_admin/eau_is_releveur) : 2 tables eau_elec_releves_compteur (kWh, miroir relevés eau) et eau_elec_couts (mois unique, total_jirama/gasoil/kwh → prix_kwh) ; 7 colonnes élec additives sur eau_factures (index_debut_elec/index_fin_elec/conso_kwh/prix_kwh/montant_elec/cout_mois/montant_total). Types ElecReleveRow/Local + ElecCoutRow/Local + extension FactureRow/Local. Dexie v6 (2 stores additifs) + EAU_TABLES + PK_BY_TABLE. Services eauElecCoutService (list/getByMois/getById/upsert idempotent par mois calculant prix_kwh/refresh/delete) + eauElecReleveService (lectures, squelette Phase 2). Écran EauElecCoutsPage (route /gestion-eau/elec-couts, garde admin/releveur/promoteur ; écriture admin only, isReadOnly → lecture seule) : liste mois + formulaire A/B/C → D=(A+B)/C en direct, garde-fou C>0, aide dépliable. Entrée menu HeaderEauActions « Coûts électricité » (icône Zap). tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/types/gestionEau.ts : ElecReleveRow/Local, ElecCoutRow/Local, +7 colonnes élec FactureRow/Local',
      'modules/gestion-eau/db/gestionEauDb.ts : tables élec + version(6) + EAU_TABLES',
      'modules/gestion-eau/services/eauSync.ts : PK_BY_TABLE (2 entrées élec)',
      'modules/gestion-eau/services/eauElecCoutService.ts (neuf) + eauElecReleveService.ts (neuf)',
      'modules/gestion-eau/components/EauElecCoutsPage.tsx (neuf) + route GestionEauRoutes.tsx',
      'components/Layout/header/HeaderEauActions.tsx : entrée « Coûts électricité » (Zap)',
      'modules/gestion-eau/components/eauAideTextes.ts : aide elecCouts',
      'SQL Supabase : 2 tables + RLS (4+4 policies) + 7 colonnes eau_factures',
      'constants/appVersion.ts + package.json : version 3.46.4 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.3',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : le lien « Aller à la configuration » du panneau « Configurer d\'abord » (EauFacturationPage) faisait une navigation navigateur brute via <a href="/gestion-eau/config"> → rechargement complet du document → démarrage à froid → rôle admin non encore résolu (DB timeout 5s) → la garde de route admin rebondit. Correctif aligné sur le patron déjà en place (EauSaisieBassinPage) : useNavigate de react-router-dom + <button onClick={() => navigate(\'/gestion-eau/config\')}> (navigation SPA interne, sans rechargement). Classes, icône Settings et libellé conservés à l\'identique. 1 seul fichier touché ; aucune logique de complétude, garde de route ou autre lien modifié. tsc OK, build OK. Cause profonde (rebond des accès directs/F5 sur écrans admin eau au boot) hors périmètre.',
    changes: [
      'modules/gestion-eau/components/EauFacturationPage.tsx : import useNavigate + const navigate ; <a href> → <button onClick navigate>',
      'constants/appVersion.ts + package.json : version 3.46.3 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.2',
    date: '2026-06-09',
    description: 'chore(gestion-eau) : renomme les LIBELLÉS AFFICHÉS « Client » → « Propriétaire » (UI uniquement, aucun SQL). Seules les chaînes visibles à l\'écran sont changées : case du rôle dans le formulaire d\'invitation + de validation de demande, badges, EauUtilisateursPage (sous-titre « comptes propriétaires », bouton/titre « Compte propriétaire », « Comptes propriétaires », « Aucun compte propriétaire. », « Transmettez ce code au propriétaire »), invitationRolesLabel (Propriétaire), messages scan (EauQrScanner « compte propriétaire », EauRelevesPage « QR d\'un propriétaire », EauScanResolverPage « QR propriétaire »), journal EauAuditPage (« Fiche propriétaire », « Espace propriétaire », « Propriétaire »), EauClientQrPage (« Aucun compte propriétaire associé », alt « Mon QR propriétaire »), EauClientPage (sous-titre « Espace propriétaire »), eauDemandeService (nom par défaut « Propriétaire »), textes d\'aide eauAideTextes. AUCUN identifiant technique touché (rôle interne `client`, `role_client`, routes `/gestion-eau/client`, table `eau_comptes_client`, types/services/variables, assertions de tests, clés localStorage = INTACTS). Aucune régression fonctionnelle : routes, rôles, RLS inchangés. tsc OK, build OK, suite eau verte (hors eauNavRoles + eauPhase4 = échecs pré-existants).',
    changes: [
      'modules/gestion-eau/components/eauAideTextes.ts : « client » → « propriétaire » (3 textes d\'aide)',
      'modules/gestion-eau/components/EauUtilisateursPage.tsx : 6 libellés (sous-titre, bouton, titres, vides, code)',
      'modules/gestion-eau/components/EauDemandesPage.tsx : badge + case rôle + toast + 2 « Compteurs visibles (propriétaire) »',
      'modules/gestion-eau/components/EauAuditPage.tsx : labels journal (Fiche/Espace/Propriétaire)',
      'modules/gestion-eau/components/EauClientQrPage.tsx + EauClientPage.tsx + EauQrScanner.tsx + EauRelevesPage.tsx + EauScanResolverPage.tsx : messages affichés',
      'modules/gestion-eau/services/eauInvitationService.ts (invitationRolesLabel) + eauDemandeService.ts (nom par défaut)',
      'constants/appVersion.ts + package.json : version 3.46.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.1',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : computeBilan plafonne l\'apport par débit à la pompe intermittente (FRACTION_POMPE). Suite/complément de v3.45.2 (qui corrigeait l\'AFFICHAGE estimé via consoEstimee.ts mais laissait computeBilan, donc les BILANS PERSISTÉS, « Conso réseau (période) », pertes/NRW et anomalies en débit×Δt → surestimés). Décision JOEL (questions fermées) : 1=corriger aussi le moteur ; facturation = compteurs uniquement (aucun impact montants). Changement : dans computeBilan, la branche apport par débit devient apport = débit × Î”t × FRACTION_POMPE (la pompe se coupe au flotteur, pas de marche continue). FRACTION_POMPE (0,5) déplacée comme constante CANONIQUE dans utils/bilan.ts, ré-exportée par utils/projection.ts (importateurs inchangés). N\'impacte PAS override/entrées manuelles. Effet : « Conso réseau (période) » et pertes baissent vers le réaliste, fausses anomalies (apport gonflé → stock attendu trop haut) en moins. Les bilans DÉJÀ enregistrés gardent leurs valeurs jusqu\'à « Recalculer tous les bilans » (admin) ; les nouveaux sont corrects d\'emblée. consoEstimee.ts (affichage estimé) NON concerné → pas de double comptage. Tests computeBilan/débit adaptés (Î”t 2h × 0,5 = valeurs inchangées) + 1 test FRACTION_POMPE. tsc OK, build OK, suite eau verte (hors eauNavRoles = échec pré-existant v3.46.0, et eauPhase4 environnemental).',
    changes: [
      'PARTAGÉ modules/gestion-eau/utils/bilan.ts : FRACTION_POMPE canonique + apport débit ×FRACTION_POMPE dans computeBilan',
      'modules/gestion-eau/utils/projection.ts : ré-export FRACTION_POMPE depuis bilan.ts',
      'modules/gestion-eau/__tests__/eauBassinDebit.test.ts : Î”t 2h (compense ×0,5) + test FRACTION_POMPE',
      'constants/appVersion.ts + package.json : version 3.46.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.0',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : vue « Situation du bassin » en LECTURE SEULE pour le propriétaire (rôle technique client) + ouverture RLS de la lecture bassin. SQL (exécuté + vérifié via éditeur Supabase, RÈGLE #0ter) : helper eau_is_client() (security definer, a un eau_comptes_client actif) + 5 policies SELECT additives _sel_client (to public using eau_is_client()) sur eau_releves_bassin/eau_entrees_bassin/eau_bilans/eau_debit_tests/eau_config — combinées en OR avec l\'existant, aucune policy d\'écriture pour le client. Vérif ROLLBACK (set role authenticated + impersonation) : propriétaire voit le bassin (33 relevés), config=1, bilans=9 ; AUCUNE policy d\'écriture ne référence eau_is_client (0) et une écriture authenticated non-admin/releveur est BLOCKED ; non-régression : un non-client → eau_is_client()=false. Frontend additif : nouvel onglet « Le bassin » dans l\'espace propriétaire (EauClientPage, route client/bassin) → EauProprietaireBassinPage réutilise getDashboardData() + getTendances() (niveau, % remplissage, autonomie, conso estimée + courbe niveau 30 j, isAnimationActive=false) ; nav GESTION_EAU_NAV_ITEMS += « Le bassin » (icône Waves) ; aide repliable proprietaireBassin. 100 % lecture seule. tsc OK, build OK.',
    changes: [
      'SQL : eau_is_client() + 5 policies _sel_client (lecture bassin propriétaire), vérif rollback OK',
      'PARTAGÉ constants/index.ts : GESTION_EAU_NAV_ITEMS += /client/bassin (icône Waves, rôle client)',
      'PARTAGÉ Navigation/BottomNav.tsx + Layout/Header.tsx : icône Waves ajoutée aux maps eau',
      'PARTAGÉ components/EauClientPage.tsx : onglet « Le bassin » (tab bassin) + titre/aide conditionnels',
      'Nouveau components/EauProprietaireBassinPage.tsx : KPI bassin + courbe niveau (réutilise getDashboardData/getTendances)',
      'components/eauAideTextes.ts : aide proprietaireBassin',
      'constants/appVersion.ts + package.json : version 3.46.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.45.2',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : conso estimée réaliste — ancrée sur le rythme observé au vidage (pompe intermittente). Validé chiffré en prod : la conso estimée (et la projection anti-zéro qui en hérite) surestimait massivement (tendance ~81,5 m³/j vs réel ~18,8 m³/j ; série 50–138 m³/j). Cause : apport = débit×Δt suppose la pompe en marche continue, or elle est intermittente → sur tout intervalle où le bassin NE MONTE PAS, débit×Δt surestime. (NB : la 1Ê³áµ‰ approche « plafonner seulement les intervalles finissant au flotteur » testée en données live laissait consoBase≈5 m³/h → tendance 70,85, insuffisant ; corrigée vers l\'ancrage sur le vidage.) Nouveau helper PUR utils/consoEstimee.ts (calculerConsoEstimee + consoBaseM3hOf, 9 tests) : conso DIRECTEMENT OBSERVABLE uniquement sur les intervalles de VIDAGE (niveau baisse, pompe à l\'arrêt → conso = −Δstock) ; intervalles MONTANTS/PLATS (conso masquée par le remplissage) estimés par consoBase×Δt ; entrée manuelle = bilan direct max(0, entrée−Δstock). consoBase (m³/h) = moyenne du rythme des vidages (anti-circularité, aucune hypothèse de pompe) ; replis estimerAutonomie.consoMoyenneHeureM3 → débit×FRACTION_POMPE(0,5) → 0. Net de pertes = ×(1−0,30). Résultat live : consoBase 1,66 m³/h, série ~11–40 m³/j, tendance 22,5 m³/j (interval B 186→245 = 35 m³ au lieu de 95). eauTendanceService + eauBilanService rebranchés (SOURCE UNIQUE) ; bucket jour LOCAL (bucketByLocalDay). computeBilan/bilans persistés/NRW/Conso réseau période INCHANGÉS. tsc OK, build OK, 107 tests eau verts.',
    changes: [
      'NOUVEAU modules/gestion-eau/utils/consoEstimee.ts : calculerConsoEstimee + consoBaseM3hOf (pur, ancrage vidage)',
      'modules/gestion-eau/services/eauTendanceService.ts : série estimée via calculerConsoEstimee + bucketByLocalDay (export)',
      'modules/gestion-eau/services/eauBilanService.ts : conso du jour via calculerConsoEstimee + jour local',
      'modules/gestion-eau/components/eauAideTextes.ts : aide tendancesConsoEstimee (coupures de pompe)',
      'NOUVEAU modules/gestion-eau/__tests__/eauConsoEstimee.test.ts : 9 tests',
      'constants/appVersion.ts + package.json : version 3.45.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.45.0',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : rôle PROMOTEUR dans le flux d\'invitation & de demande — Phase 3 (SQL + frontend). SQL (exécuté + vérifié via éditeur Supabase, RÈGLE #0ter) : colonne eau_invitations.role_promoteur (REST 200) ; les 2 RPC SECURITY DEFINER eau_claim_invitation() et eau_claim_invitation_by_token(p_token) octroient désormais promoteur dans eau_roles (insert + on-conflict), patchées via pg_get_functiondef + regexp_replace + garde anti-erreur (idempotent). Vérif ROLLBACK (impersonation JWT) : invitation role_promoteur=true → claim → eau_roles.promoteur=true, admin/releveur=false, invitation acceptee, 2e claim NULL (idempotent), aucun compte client créé. Frontend additif : InvitationRow += role_promoteur ; eauInvitationService (InvitationInput/WhatsappInvitationInput/createInvitation/createWhatsappInvitation/RoleFlags/invitationRoleLabel += Promoteur, invitationTargetPath promoteur→/gestion-eau) ; eauDemandeService.validerDemande octroie promoteur ; EauDemandesPage : case Promoteur (email + WhatsApp), badge Promoteur, validation d\'une demande avec Promoteur. Lecture seule (Phase 2) inchangée : un promoteur ne crée pas d\'invitation ni ne valide une demande. tsc OK, build OK.',
    changes: [
      'SQL : eau_invitations.role_promoteur + eau_claim_invitation()/eau_claim_invitation_by_token() octroient promoteur (vérif rollback OK)',
      'PARTAGÉ types/gestionEau.ts : InvitationRow += role_promoteur',
      'PARTAGÉ services/eauInvitationService.ts : payloads + RoleFlags + invitationRoleLabel + invitationTargetPath gèrent promoteur',
      'PARTAGÉ services/eauDemandeService.ts : ValidationInput + validerDemande octroient promoteur',
      'PARTAGÉ components/EauDemandesPage.tsx : case Promoteur (invitation email/WhatsApp + validation demande) + badge',
      'constants/appVersion.ts + package.json : version 3.45.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.44.2',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : la projection (pointillés) des Tendances se base sur le jour LOCAL et non UTC. Découvert en validation live (02:08 Madagascar = 23:08 UTC) : getTendances bornait « aujourd\'hui » via toISOString (UTC), donc dans les 3 premières heures locales le dernier jour estimé était encore « aujourd\'hui » en UTC → consoProjeteeParJour vide, aProjection=false, pas de segment pointillé (alors que le tableau de bord, qui borne le jour en local, projetait bien). Nouveau helper localDayLabel ; boucle de projection remontée depuis le jour local, comblant du dernier jour estimé (exclu) à aujourd\'hui (inclus). Cohérent avec EauDashboard. tsc OK, build OK, 7 tests projection verts.',
    changes: [
      'modules/gestion-eau/services/eauTendanceService.ts : localDayLabel + projection sur jour local',
      'constants/appVersion.ts + package.json : version 3.44.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.44.1',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : conso du jour jamais 0 par absence de relevé (projection tendance + pertes réseau). Bug : « Conso du jour » (dashboard) et la courbe « Consommation par jour » (Tendances) retombaient à 0 les jours sans relevé de niveau, car la conso estimée ne bouclait que sur les relevés du jour (n=0 → 0). Règle métier : une absence de relevé n\'est PAS une conso nulle. Nouveau utils/projection.ts (pur, 7 tests) : projeterConsoJour() en cascade tendance3 → moyenne → débit borné (× 24 × FRACTION_POMPE 0,5 × (1−pertes), JAMAIS débit×24). Constante PERTE_RESEAU_DEFAUT_PCT=0,30 (NRW) dans utils/bilan.ts. getDashboardData() : anti-zéro (projection proratisée sur la fraction du jour écoulée) + champ consoJourSource (mesuree/estimee_intervalle/projection_*/zero_compteurs) ; carve-out 0 légitime si compteurs réels à 0 (aucune projection par-dessus une mesure). getTendances() : conso estimée NETTE des pertes + série consoProjeteeParJour comblant le trou jusqu\'à aujourd\'hui (pointillés) + projectionSource/aProjection. EauTendancesPage : 2áµ‰ aire pointillée « projection (relevés en attente) » + légende. EauDashboard : mention selon la source (icône TrendingUp si projection). Bascule auto sur le métré dès 1 relevé compteur. Additif strict, isAnimationActive={false} conservé. tsc --noEmit OK, build OK, 98 tests eau verts.',
    changes: [
      'PARTAGÉ modules/gestion-eau/utils/bilan.ts : constante PERTE_RESEAU_DEFAUT_PCT (0,30)',
      'NOUVEAU modules/gestion-eau/utils/projection.ts : projeterConsoJour + FRACTION_POMPE (pur)',
      'modules/gestion-eau/services/eauBilanService.ts : anti-zéro (projeterConsoJour) + ConsoJourSource + carve-out 0 compteurs + pertes déduites',
      'modules/gestion-eau/services/eauTendanceService.ts : pertes déduites + consoProjeteeParJour + projectionSource + aProjection',
      'modules/gestion-eau/components/EauTendancesPage.tsx : aire projection pointillée + légende',
      'modules/gestion-eau/components/EauDashboard.tsx : mention conso du jour selon la source',
      'modules/gestion-eau/components/eauAideTextes.ts : aide tendancesConsoEstimee (projection + pertes)',
      'NOUVEAU modules/gestion-eau/__tests__/eauProjection.test.ts : 7 tests',
      'constants/appVersion.ts + package.json : version 3.44.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.44.0',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : rôle PROMOTEUR (lecture totale + seuils d\'alerte) — Phase 2 frontend. L\'admin attribue le rôle via un toggle « Promoteur » dans Utilisateurs & rôles (colonne eau_roles.promoteur, RLS Phase 1). Un promoteur « pur » (sans admin ni releveur) a accès EN LECTURE à tous les écrans métier (tableau de bord, relevés, suivi, compteurs, facturation incluant toutes les factures) ET aux écrans d\'administration (config, utilisateurs, demandes, alertes, annonces, audit) ; tous les contrôles d\'écriture y sont masqués/désactivés et chaque handler de mutation est gardé (if isReadOnly return). Seule écriture autorisée : les 6 seuils d\'alerte de la Configuration, via la RPC SECURITY DEFINER eau_set_alert_thresholds (les autres champs config restent en lecture seule). isReadOnly = roles.promoteur && !admin && !releveur (un admin/releveur cumulant promoteur garde l\'écriture). Additif strict : admin/releveur/client inchangés. tsc --noEmit OK, build OK, 23 tests verts.',
    changes: [
      'PARTAGÉ types/gestionEau.ts : EauRoles/EauRole/RoleRow += promoteur',
      'PARTAGÉ services/eauRoleService.ts : getRolesForUser + setRoles gèrent promoteur',
      'PARTAGÉ context/GestionEauContext.tsx : expose isReadOnly + hasEauAccess inclut promoteur',
      'PARTAGÉ constants/index.ts : GESTION_EAU_NAV_ITEMS ouverts au promoteur (dashboard/relevés/suivi/compteurs/facturation)',
      'PARTAGÉ Layout/header/HeaderEauActions.tsx : entrées admin visibles au promoteur',
      'GestionEauRoutes/EauRoleProtectedRoute : routes métier + admin autorisées au promoteur (home → tableau de bord)',
      'EauConfigPage : promoteur édite seulement les seuils d\'alerte (RPC eau_set_alert_thresholds) ; reste en lecture seule',
      'EauUtilisateursPage : toggle Promoteur + lecture seule',
      'Nouveau components/EauReadOnly.tsx : EauReadOnlyBadge / EauReadOnlyBanner',
      'Lecture seule appliquée : EauSaisieBassinPage, EauSaisieCompteurPage, EauRelevesPage, EauTourneePage, EauCompteursPage, EauFacturationPage, EauDemandesPage, EauAnnoncesPage, EauAlertesPage, EauAnomaliesPage, EauQrCompteurManager',
      'tests : eauNavRoles (cas promoteur) + eauScanQr (EauRoles += promoteur)',
      'constants/appVersion.ts + package.json : version 3.44.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.43.2',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : consommation ESTIMÉE par le débit des pompes (sans compteurs) + bascule auto vers le métré. Le graphique « Consommation par jour » (Tendances) et le chiffre « consommation du jour » (tableau de bord) étaient vides faute de relevés de compteurs (conso_m3). En attendant les compteurs, on expose une conso estimée déduite du débit, calculée À LA VOLÉE via computeBilan (formule unique, non modifiée) : consoReseauM3 = apport − Î”stock, avec apport = débit × Î”t quand aucune entrée manuelle, bornée ≥ 0. eauTendanceService.getTendances() ajoute consoEstimeeParJour + aDesCompteurs + debitDisponible (1 lecture supplémentaire : getDebitCourantM3h). eauBilanService.getDashboardData() ajoute consoJourEstimee et affiche l\'estimation du jour quand aucun compteur. Bascule auto : dès 1 relevé compteur, retour au métré (titre « métrée », sans mention « estimée »). UI : EauTendancesPage (3 états — métré / estimé avec badge + aide repliable / état vide « enregistrez un test de débit ») ; EauDashboard (mention « estimée (débit) » sous le chiffre). Additif strict, isAnimationActive={false} conservé. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauTendanceService.ts : série consoEstimeeParJour (computeBilan à la volée) + aDesCompteurs + debitDisponible',
      'modules/gestion-eau/services/eauBilanService.ts : conso du jour estimée (computeBilan) + champ consoJourEstimee',
      'modules/gestion-eau/components/EauTendancesPage.tsx : carte conso à 3 états (métré/estimé+badge+aide/vide) + helper ConsoArea + prop badge',
      'modules/gestion-eau/components/EauDashboard.tsx : mention « estimée (débit) » sur la carte Conso du jour',
      'modules/gestion-eau/components/eauAideTextes.ts : aide tendancesConsoEstimee',
      'constants/appVersion.ts + package.json : version 3.43.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.43.1',
    date: '2026-06-08',
    description: 'fix(gestion-eau) : désactivation de l\'animation des graphiques Recharts (boucle setState « Maximum update depth exceeded » sous Recharts 3 + React 19). L\'animation d\'apparition des séries (CurveWithAnimation) entrait en boucle infinie de setState au montage, notamment sur la courbe « Niveau du bassin » (Saisie bassin → onglet Niveau et page Tendances), faisant planter la page (ErrorBoundary). Correctif minimal et additif : ajout de isAnimationActive={false} sur les 13 séries <Line>/<Area>/<Bar> du module (EauSaisieBassinPage, EauTendancesPage, EauDashboard, EauClientPage, EauFacturationPage, EauSaisieCompteurPage). Les graphiques s\'affichent à l\'identique, sans l\'animation d\'apparition. Aucune autre modification de comportement ni de données. tsc --noEmit OK, build OK. À réévaluer plus tard : une montée de version de recharts corrigeant la boucle d\'animation en React 19 permettrait de réactiver les animations.',
    changes: [
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx : isAnimationActive={false} sur <Line> (Niveau) + <Bar> (Débit)',
      'modules/gestion-eau/components/EauTendancesPage.tsx : isAnimationActive={false} sur <Area>, <Line>, 3× <Bar>',
      'modules/gestion-eau/components/EauDashboard.tsx : isAnimationActive={false} sur 2× <Area>',
      'modules/gestion-eau/components/EauClientPage.tsx + EauFacturationPage.tsx + EauSaisieCompteurPage.tsx : isAnimationActive={false} sur les <Bar>',
      'constants/appVersion.ts + package.json : version 3.43.1',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.43.0',
    date: '2026-06-08',
    description: 'fix(pwa) : mise à jour 100% AUTOMATIQUE + rafraîchissement profond (anti-résidus d\'ancienne version). Cause : le registerSW.js généré (mode injectManifest) n\'enregistre que sw-custom.js SANS logique d\'auto-update, et sw-custom.ts ne faisait pas skipWaiting à l\'install → le nouveau SW restait « waiting » et l\'ancien continuait de servir des chunks périmés ; la seule voie était le bandeau manuel (standalone) qui ne purgeait pas les caches → résidus obligeant à se déconnecter/quitter. Correctifs : (1) sw-custom.ts : self.skipWaiting() à l\'install (auto-activation) + cleanupOutdatedCaches() + purge des caches OBSOLÈTES à activate (conserve precache/runtime courants + api-cache ; ne touche JAMAIS IndexedDB/Dexie → données + file de sync hors-ligne préservées) + clients.claim(). (2) useServiceWorkerUpdate : rechargement AUTOMATIQUE sur controllerchange (garde 1Ê³áµ‰ installation via controller null + anti-boucle sessionStorage 10 s) + toast « Application mise à jour ✅ » au remontage. (3) UpdatePrompt : plus de bandeau — monte seulement le pilote d\'auto-update (rend null). (4) safariServiceWorkerManager : enregistre /sw-custom.js au lieu de /sw.js inexistant (fin du 404, idempotent avec registerSW.js) + bandeau bleu manuel neutralisé. Transition : les appareils encore sur l\'ancienne version récupèrent ce système au prochain relancement/màj manuelle, puis tout devient automatique. tsc --noEmit OK, build OK (sw-custom 23.98 kB).',
    changes: [
      'sw-custom.ts : skipWaiting à l\'install + cleanupOutdatedCaches + purge caches obsolètes (hors precache/runtime/api-cache, jamais IndexedDB) + clients.claim',
      'hooks/useServiceWorkerUpdate.ts : reload auto sur controllerchange (garde 1Ê³áµ‰ install + anti-boucle 10 s) + toast post-update',
      'components/UpdatePrompt.tsx : suppression du bandeau, devient pilote d\'auto-update invisible (rend null)',
      'services/safariServiceWorkerManager.ts : enregistre /sw-custom.js (fin du 404 /sw.js) + bandeau bleu manuel neutralisé',
      'constants/appVersion.ts + package.json : version 3.43.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.42.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : ÉVO 2/3 — câblage des 3 vraies photos du domaine sur la vitrine « lien déjà utilisé ». Les 3 photos fournies par JOEL sont déposées dans public/gestion-eau/vitrine/ et branchées dans VitrinePhoto : (1) ahuvi-golf-practice.jpg « Le parcours de golf prend forme. » (icône Flag, inchangé) ; (2) ahuvi-residences.jpg « Les Résidences, pensées pour durer. » (icône Home, remplace l\'ancien emplacement solaire) ; (3) ahuvi-villa-piscine.jpg « Les villas du domaine prennent vie. » (icône Waves, remplace l\'ancien emplacement ponton). Légendes adaptées aux sujets réels (validées par JOEL) ; les noms ahuvi-solaire.jpg / ahuvi-ponton.jpg ne sont plus référencés. Dégradation déterministe conservée (icône en couche de base si une photo manque/charge). Aucun autre changement de comportement. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauVitrinePage.tsx (PARTAGÉ) : VitrinePhoto 2 & 3 → src ahuvi-residences.jpg / ahuvi-villa-piscine.jpg + légendes + icônes Home/Waves ; imports lucide Sun/Anchor → Home/Waves',
      'public/gestion-eau/vitrine/ahuvi-golf-practice.jpg / ahuvi-residences.jpg / ahuvi-villa-piscine.jpg (NOUVEAUX assets, 1000×563)',
      'constants/appVersion.ts + package.json : version 3.42.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.41.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : édition/suppression d\'un relevé de niveau de bassin (admin) + recalcul des bilans. Sous l\'onglet Niveau de EauSaisieBassinPage, nouvelle section dépliable « Relevés récents (admin) » (visible si roles.admin uniquement) : liste des 30 derniers relevés (date/hauteur/volume via EauListIcon/EauEmptyState), édition inline (input hauteur + datetime-local pré-rempli, validation hauteur≥0 + date non vide/non future) → updateReleveBassin ; suppression avec showConfirm danger → deleteReleveBassin ; bouton « Recalculer tous les bilans » → recomputeAllBilans (showConfirm). Boutons désactivés hors ligne (cohérence Dexie+Supabase) + ligne d\'aide. Service eauBilanService : deleteBilanAt(timestamp) (suppression Dexie+Supabase des bilans d\'un horodatage), rebuildBilanForReleve(r) (delete+computeAndSaveBilan), recomputeAllBilans() (clear local + DELETE serveur + reconstruction chronologique, idempotent). Service eauReleveService : nextReleveAfter (helper interne), listRecentRelevesBassin(limit=30), updateReleveBassin (recalcul « voisins » ≤3 bilans : ancien emplacement, nouvel emplacement, relevés suivants de part et d\'autre ; volume recalculé via dimensionsFromConfig+hauteurCmToVolumeM3), deleteReleveBassin (retire bilan orphelin + recalcule le suivant) ; addReleveBassin recalcule désormais aussi le bilan du relevé suivant en saisie rétro-datée (chemin « en avant » inchangé). Recalcul local et exact : seuls les bilans adjacents repassent « non traité », les autres (statut traitee/commentaire) sont conservés. Additif strict (aucune signature publique existante modifiée, computeAndSaveBilan réutilisé tel quel). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauBilanService.ts (PARTAGÉ) : deleteBilanAt / rebuildBilanForReleve / recomputeAllBilans (+ imports supabase/withTimeout/deleteLocal)',
      'modules/gestion-eau/services/eauReleveService.ts (PARTAGÉ) : nextReleveAfter (interne) + listRecentRelevesBassin / updateReleveBassin / deleteReleveBassin + recalcul voisin dans addReleveBassin (rétro-datage)',
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx (PARTAGÉ) : section admin « Relevés récents » (liste + édition inline + suppression + recalcul global), gating en ligne, visible admin only',
      'constants/appVersion.ts + package.json : version 3.41.0 + note FR',
      'FONCTIONNEMENT-MODULES.md : nouvelle fonction admin (édition/suppression relevé niveau) + recalcul des bilans',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.40.1',
    date: '2026-06-08',
    description: 'fix(gestion-eau) : ÉVO 2/3 — dégradation déterministe des photos vitrine. Le composant VitrinePhoto rend désormais l\'icône lucide comme COUCHE DE BASE permanente (toujours dans le fond dégradé AHUVI) avec la <img> superposée en object-cover par-dessus : quand la photo charge, elle couvre l\'icône ; quand le chemin est absent, l\'icône reste visible. Motif : en prod (Netlify), un chemin /gestion-eau/vitrine/<x>.jpg absent renvoie le fallback SPA (200/HTML) qui laisse la <img> en état « pending » SANS déclencher onError → l\'ancien rendu conditionnel (icône seulement sur onError) montrait un fond vide sans icône. Le nouveau rendu garantit « fond + icône » dans tous les cas (absent / pending / onError / hors-ligne). Vérifié en ligne sur l\'origine *.netlify.app (SW purgé) : vitrine marketing OK, icônes de repère visibles sur les 3 emplacements photo. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauVitrinePage.tsx (PARTAGÉ) : VitrinePhoto — icône en couche de base permanente + <img> superposée (dégradation déterministe quand la photo est absente/pending)',
      'constants/appVersion.ts + package.json : version 3.40.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.40.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : ÉVO 2/3 « vitrine lien déjà utilisé ». EauVitrinePage (/i/:token) devient une page à deux visages selon getInvitationTokenState (ÉVO 1) : valid → écran d\'inscription INCHANGÉ (chiffres + 3 bénéfices + Continuer avec Google) ; used|expired|revoked|unknown (+ hors-ligne/erreur) → page VITRINE MARKETING (bandeau « déjà utilisé », hero Itampolo Resort, 2 blocs texte figés ≤100 mots, 4 astuces, 3 photos avec dégradation propre sur onError → fond dégradé AHUVI + icône lucide) suivie d\'une fiche « Demander un accès » (nom/phone/fonction requis ; email/message optionnels ; select fonction releveur|proprietaire|investisseur|locataire|autre). Le bouton mémorise setPendingEnrollment(intent:demande enrichi), pose bazarkely_post_login_redirect=/gestion-eau/accueil, RETIRE PENDING_TOKEN_KEY (aucun claim sur lien mort) puis signInWithGoogle ; au retour processPendingEnrollment crée la demande. Écran de chargement tant que l\'état du jeton n\'est pas résolu. Zéro régression sur le chemin valid (code inchangé). Vérifs preview : jeton bidon → marketing ; 3 photos absentes au build → dégradation propre (img retirées du DOM, aucune erreur console) ; select 6 options exactes ; submit fiche → localStorage eau_pending_enrollment {intent:demande, nom/email/phone/fonction/message} + sessionStorage redirect OK + PENDING_TOKEN_KEY null ; validation champs vides → toast FR, aucun storage écrit ; innerWidth mesuré 375 px (preset mobile). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauVitrinePage.tsx (PARTAGÉ) : branche marketing conditionnelle (getInvitationTokenState) + composant VitrinePhoto (dégradation onError) + fiche demande d\'accès (setPendingEnrollment intent demande, removeItem PENDING_TOKEN_KEY avant OAuth) ; chemin valid inchangé',
      'public/gestion-eau/vitrine/*.jpg (assets, ABSENTS au build de cette version) : ahuvi-golf-practice.jpg / ahuvi-solaire.jpg / ahuvi-ponton.jpg — référencés en /gestion-eau/vitrine/<nom>.jpg, à déposer ultérieurement (la page dégrade proprement sans eux)',
      'constants/appVersion.ts + package.json : version 3.40.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.39.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : ÉVO 3/3 « import du répertoire → lot d\'invitations WhatsApp ». Sur EauDemandesPage (admin), bouton « Importer du répertoire » (Contact Picker API, Android Chrome) → sélection multi-contacts ; mapping pur (nom/tel/email, écart des sans-numéro avec compteur) ; panneau de revue (rôle commun Releveur|Administrateur xor, délai commun 7/30/90/illimité, lignes éditables + suppression) ; création séquentielle idempotente via createWhatsappInvitation (role_client:false, compteur_ids:[]) ; panneau « Liens prêts à envoyer » (Envoyer sur WhatsApp wa.me + Copier le lien par invitation). Dégradation propre hors Android (bouton désactivé + « Disponible sur Android (Chrome) »). Aide repliable FR. Additif strict : aucune signature de eauInvitationService modifiée (réutilisation seule). Helper pur utils/contactImport.ts (mapImportedContacts) + 5 tests. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/utils/contactImport.ts (NOUVEAU) : mapImportedContacts (mapping pur des contacts répertoire → lignes d\'invitation, écart+compte des sans-numéro)',
      'modules/gestion-eau/components/EauDemandesPage.tsx (PARTAGÉ) : bouton import + détection Contact Picker + panneau revue du lot (rôle/délai communs, lignes éditables) + panneau liens prêts + aide repliable',
      'modules/gestion-eau/__tests__/eauContactImport.test.ts (NOUVEAU) : 5 tests du mapping (retenue/écart, nom/email, null/vide, sans-nom)',
      'constants/appVersion.ts + package.json : version 3.39.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.38.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : ÉVO 1/3 « lien usage unique » — back (état du jeton, anonyme) + fiche d\'accès enrichie. Pose le socle serveur des écrans à venir (ÉVO 2/3), sans nouvel écran ici. SQL (idempotent, exécuté + vérifié par REST/SQL) : (1) RPC SECURITY DEFINER eau_invitation_token_state(p_token text) returns text, exécutable en anon+authenticated (revoke public) : renvoie valid / used (statut=acceptee) / revoked (statut=revoquee) / expired (expires_at dépassé) / unknown (jeton vide/null/inconnu) — AUCUNE donnée nominative renvoyée. (2) eau_demandes_acces gagne phone, fonction, message (text nullable) ; RLS activée. (3) eau_create_demande passe de 2 à 5 params (p_email, p_nom, p_phone, p_fonction, p_message) : la signature 2-args est DROP, la nouvelle est authenticated-only (revoke public+anon) ; idempotente (UPDATE de la demande en_attente existante du user, sinon INSERT) → pas de doublon. Vérifs prod : 7 cas d\'état OK (valid/used/revoked/expired + 3 unknown), anon ne peut PAS appeler eau_create_demande (42501), colonnes présentes. Front (additif, offline-first) : type DemandeAccesRow + phone/fonction/message ; Dexie GestionEauDB v5 (champs texte non indexés, données conservées) ; eauDemandeService.DemandeInput + createDemande (5 params RPC + record local) ; eauEnrollmentService.PendingEnrollment intent demande enrichi (email/phone/fonction/message) + processPendingEnrollment relaie les champs (email réel du compte Google prioritaire) ; eauInvitationService.getInvitationTokenState(token) (RPC anon, withTimeout 6 s, défaut unknown si erreur/hors-ligne → la vitrine montrera la page marketing, jamais une inscription trompeuse). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/types/gestionEau.ts (PARTAGÉ) : DemandeAccesRow + phone/fonction/message (string|null)',
      'modules/gestion-eau/db/gestionEauDb.ts (PARTAGÉ) : GestionEauDB version(5) (champs texte non indexés, migration additive)',
      'modules/gestion-eau/services/eauDemandeService.ts (PARTAGÉ) : DemandeInput + phone/fonction/message ; createDemande appelle eau_create_demande (5 params) + report local',
      'modules/gestion-eau/services/eauEnrollmentService.ts (PARTAGÉ) : PendingEnrollment intent demande enrichi + processPendingEnrollment relaie les champs',
      'modules/gestion-eau/services/eauInvitationService.ts (PARTAGÉ) : helper getInvitationTokenState(token) (RPC anon eau_invitation_token_state, défaut unknown)',
      'SQL Supabase (PARTAGÉ) : RPC eau_invitation_token_state ; colonnes phone/fonction/message + RLS sur eau_demandes_acces ; eau_create_demande 2→5 params (authenticated-only)',
      'constants/appVersion.ts + package.json : version 3.38.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.37.1',
    date: '2026-06-08',
    description: 'fix(gestion-eau) : aperçu WhatsApp recentré (anti-rognage) + cache-bust de l\'image OG. Correctif cosmétique borné aux 2 edge functions (Deno), aucun schéma/donnée/écran. (1) og-invite.tsx : toute la composition de l\'image PNG 1200×630 est désormais centrée horizontalement ET verticalement dans une zone de sécurité centrale, pour rester entièrement visible quand WhatsApp recadre l\'aperçu en carré centré (~630×630) dans le fil. Avant, le contenu était calé à gauche (root sans alignItems, lignes header/center/footer sans justifyContent) → WhatsApp rognait les bords et coupait le grand « X % ». Changements : conteneur racine + alignItems:center + textAlign:center ; les 3 lignes (h/c/f) + justifyContent:center ; header centré ; bloc central alignItems:center + textAlign:center ; pastille tendance alignSelf flex-start → center ; footer/bandeau justifyContent:center + textAlign:center + maxWidth 620px ; gros nombre fontSize 210→190px (marge pour « 100 % ») ; slogan générique maxWidth 960→620px. Inchangé : dimensions 1200×630, charte AHUVI, textes FR figés, repli anti-500, fetchStats, cache-control. (2) invite-og.ts : og:image et twitter:image pointent vers /og-invite.png?v=2 (cache-buster) pour forcer WhatsApp/Facebook à re-télécharger la version recentrée (le ?v= est ignoré côté edge, l\'endpoint répond toujours). Reste de l\'injecteur inchangé (purge anti-doublon, jeton non exposé hors og:url, description dynamique). Rappel : WhatsApp met l\'aperçu en cache PAR lien → tester avec un NOUVEAU lien /i/<jeton> (au besoin re-scrape via Facebook Sharing Debugger). tsc --noEmit OK, build OK.',
    changes: [
      'frontend/netlify/edge-functions/og-invite.tsx (PARTAGÉ) : recentrage horizontal+vertical (zone de sécurité centrale), pastille alignSelf center, fontSize 210→190, slogan maxWidth 620 — anti-rognage carré WhatsApp',
      'frontend/netlify/edge-functions/invite-og.ts (PARTAGÉ) : og:image/twitter:image → /og-invite.png?v=2 (cache-bust pour forcer le re-téléchargement)',
      'constants/appVersion.ts + package.json : version 3.37.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.37.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Phase 3 « aperçu WhatsApp » — Netlify Edge Functions (Open Graph + image PNG dynamique). Le robot d\'aperçu de WhatsApp/Facebook n\'exécute pas le JavaScript : la PWA seule renvoie un <head> sans contenu social. Deux edge functions (Deno) ajoutées sous frontend/netlify/edge-functions, déclarées dans netlify.toml. (1) invite-og sur /i/* : récupère le HTML de l\'app (context.next → fallback SPA index.html), lit les chiffres NON nominatifs via la RPC anon eau_public_vitrine_stats() (timeout 2,5 s, dégradation propre), PURGE les balises og/twitter par défaut de index.html puis INJECTE les balises dynamiques (og:title « Gestion Eau AHUVI — Vous êtes invité(e) », og:description avec « Bassin rempli à X % (en hausse/baisse/stable)… » ou texte générique, og:image absolue, og:image:width/height/type, og:url, og:type, og:site_name, og:locale=fr_FR, twitter:card=summary_large_image + titre/description/image) ; Cache-Control court ; le jeton n\'apparaît jamais hors og:url. (2) og-invite sur /og-invite.png : VRAI PNG 1200×630 (pas de SVG) généré via og_edge (Satori→Resvg, Noto Sans embarqué) en charte AHUVI (dégradé forest #364E30 → teal #10939F, accent or #C3C067, goutte dessinée) — avec chiffres : gros « X % » + « Niveau du bassin » + pastille tendance + bandeau bas ; sans chiffres : slogan générique. Anti-500 : tout échec de rendu retombe sur un PNG plein valide embarqué (base64). Image SANS jeton (chiffres globaux du bassin) → une seule image partagée, cache long. index.html gagne des balises OG de base pour le reste du site (remplacées par l\'edge sur /i/*). Limite connue (documentée) : WhatsApp met en cache l\'aperçu par URL plusieurs jours ; comme chaque invitation a un jeton unique, l\'aperçu est frais au 1er partage et ne se met pas à jour ensuite pour ce même lien (sans importance : 1 lien = 1 personne). Aucune modification du front du module (vitrine = Phase 2). Hors tsconfig (Deno/edge), non bundlé côté client. tsc --noEmit OK, build OK.',
    changes: [
      'netlify.toml (PARTAGÉ) : 2 blocs [[edge_functions]] (invite-og → /i/*, og-invite → /og-invite.png)',
      'frontend/netlify/edge-functions/invite-og.ts (NOUVEAU) : injection Open Graph dynamique sur /i/* (RPC anon eau_public_vitrine_stats, purge+injection balises, jeton jamais exposé)',
      'frontend/netlify/edge-functions/og-invite.tsx (NOUVEAU) : image PNG 1200×630 via og_edge (charte AHUVI, chiffres ou générique), repli PNG embarqué anti-500',
      'frontend/index.html (PARTAGÉ) : balises Open Graph de base (site), remplacées par l\'edge sur /i/*',
      'constants/appVersion.ts + package.json : version 3.37.0 + note FR',
      'FONCTIONNEMENT-MODULES.md : aperçu WhatsApp (edge OG + image PNG) + limite de cache WhatsApp',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.36.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Phase 4 « invitation vitrine WhatsApp par JETON » — UI admin (page /gestion-eau/demandes). EauDemandesPage gagne un sélecteur de canal (onglets Email / WhatsApp) dans le formulaire « Inviter ». Canal WhatsApp (par défaut) : numéro requis + nom optionnel + rôles cumulables (Admin/Releveur/Client, ≥1 compteur si client) + délai de validité (7/30/90 j ou illimité) → createWhatsappInvitation (Phase 1, offline-first, jeton + expires_at + invite_channel=whatsapp). À la création : bandeau de confirmation affichant le lien buildInviteUrl(token) (1sakely.org/i/<token>) + boutons « Envoyer sur WhatsApp » (buildWhatsappInviteUrl → wa.me, message FR centré sur le lien, AUCUNE adresse Google imposée), « Copier le lien », « Copier le message ». Deux helpers purs ajoutés au service : buildWhatsappInviteMessage + buildWhatsappInviteUrl. Nouvelle liste « Invitations par lien WhatsApp » (filtre invite_channel===whatsapp, tri en_attente<acceptée<expirée) : icône de rôle, nom/numéro, badges, statut (En attente / Acceptée le… / Expirée si expires_at<now), expiration affichée ; actions Renvoyer WhatsApp (même jeton), Copier le lien, Révoquer (confirmation). La liste email existante est conservée à part (filtre invite_channel!==whatsapp) ; les demandes reçues inchangées. Aide repliable mise à jour (deux canaux + différence email/jeton). Icônes lucide MessageCircle/Link/CalendarClock. Bloc réservé admin (route déjà sous garde). Additif borné à EauDemandesPage + 2 helpers service + texte d\'aide. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauDemandesPage.tsx (PARTAGÉ) : onglets canal Email/WhatsApp, formulaire WhatsApp (numéro + délai), confirmation lien + wa.me + copier lien/message, liste « Invitations par lien WhatsApp » (statut/expiration/renvoyer/copier/révoquer), liste email conservée à part',
      'modules/gestion-eau/services/eauInvitationService.ts (PARTAGÉ) : helpers buildWhatsappInviteMessage + buildWhatsappInviteUrl (message FR jeton, sans adresse Google imposée)',
      'modules/gestion-eau/components/eauAideTextes.ts (PARTAGÉ) : aide « invitations » maj (deux canaux + différence email/jeton)',
      'constants/appVersion.ts + package.json : version 3.36.0 + note FR',
      'FONCTIONNEMENT-MODULES.md : invitation WhatsApp par jeton (UI) + enrôlement compte Google au choix',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.35.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Phase 2 « invitation vitrine WhatsApp par JETON » — page vitrine publique /i/:token + capture jeton + atterrissage. Nouvelle route PUBLIQUE /i/:token (déclarée dans App.tsx au même niveau que /gestion-eau/accueil et /gestion-eau/scan, hors garde d\'auth) → composant lazy EauVitrinePage (charte AHUVI, mobile-first, une colonne) : en-tête léger ðŸ’§ « Gestion Eau AHUVI » + slogan + ligne d\'invitation ; bloc chiffres NON nominatifs via RPC publique eau_public_vitrine_stats() (anon, withTimeout 6000) → grand « {fill_pct} % » + libellé + tendance (TrendingUp/Down/Minus = en hausse/baisse/stable) + « Relevé du JJ/MM/AAAA » ; dégradation propre (slogan « Le suivi de l\'eau, clair et toujours à jour. » sans chiffre) si null/erreur/hors-ligne ; 3 bénéfices (Gauge/BadgeCheck/WifiOff) ; CTA unique « Continuer avec Google » (mémorise eau_pending_invitation_token = jeton de l\'URL + bazarkely_post_login_redirect = /gestion-eau/accueil, deep-link robuste au boot à froid sans garde de rôle pour éviter le rebond /gestion-eau→/dashboard, puis signInWithGoogle) ; aide repliable « Comment ça marche ? ». Le jeton est aussi capturé dès l\'arrivée (couvre le cas « déjà connecté »). Redirection post-claim ajoutée dans GestionEauContext.load : si claimPendingTokenInvitation renvoie un id (jeton fraîchement consommé), navigation vers invitationTargetPath(rôle) (releveur/admin → /gestion-eau/releves?tab=bassin&bt=niveau ; client → /gestion-eau/client) — une seule fois (jeton retiré au succès). Cas « déjà connecté en arrivant » : relance retryAccess() pour enchaîner le claim ; jeton invalide/expiré → message neutre « invitation invalide/expirée » sans éjection ni boucle. Additif (1 route + 1 page + redirection post-claim). tsc --noEmit OK, build OK.',
    changes: [
      'App.tsx (PARTAGÉ) : route publique /i/:token (lazy EauVitrinePage), hors garde d\'auth, au niveau de /gestion-eau/accueil et /gestion-eau/scan',
      'modules/gestion-eau/components/EauVitrinePage.tsx (NOUVEAU) : page vitrine publique (chiffres anon eau_public_vitrine_stats + bénéfices + CTA Google + aide repliable + message neutre jeton invalide)',
      'modules/gestion-eau/context/GestionEauContext.tsx (PARTAGÉ) : redirection post-claim — navigate(invitationTargetPath(rôle)) quand claimPendingTokenInvitation renvoie un id (import invitationTargetPath + useNavigate)',
      'constants/appVersion.ts + package.json : version 3.35.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.34.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Phase 1 « invitation vitrine WhatsApp par JETON » — socle back + service + claim au login. 2áµ‰ canal d\'invitation : l\'admin n\'a que le numéro WhatsApp (pas l\'email). On crée une invitation portant un jeton unique ; au 1er login Google (compte au choix de l\'invité), le JETON — et non l\'email — déclenche l\'octroi du rôle. SQL (idempotent, exécuté+vérifié via REST) : eau_invitations gagne token (index unique partiel WHERE token is not null), expires_at, invite_channel (\'email\'|\'whatsapp\', défaut email) ; email devient nullable. RPC SECURITY DEFINER eau_claim_invitation_by_token(p_token) (usage unique, idempotent même user, refuse jeton inconnu/expiré/déjà accepté ; upsert eau_roles, crée/active eau_comptes_client + compteurs si role_client) ; revoke execute from public,anon + grant authenticated (anon→401 42501). RPC PUBLIQUE eau_public_vitrine_stats() (grant anon) : agrégats NON nominatifs uniquement (% remplissage référencé flotteur + tendance + horodatage), dégrade en null si config/relevés manquants, jamais d\'erreur. Tests RPC (harnais transactionnel annulé, lecture REST) : jeton releveur→eau_roles.releveur=true + acceptee + idempotent + 2áµ‰ user null + expiré null + client→compte actif + compteurs ✅. Code (additif, scopé module) : InvitationRow gagne token/expires_at/invite_channel (email nullable) ; Dexie v4 (index token) ; service eauInvitationService (generateInviteToken base64url 16o, buildInviteUrl /i/<token>, createWhatsappInvitation offline-first, claimPendingTokenInvitation best-effort lisant sessionStorage[eau_pending_invitation_token]) ; appel claimPendingTokenInvitation dans GestionEauContext.load juste après le claim email (en ligne, best-effort, avant lecture des rôles). Aucune nouvelle UI/écran (Phases 2-4). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/types/gestionEau.ts (PARTAGÉ) : InvitationRow + token/expires_at/invite_channel, email nullable',
      'modules/gestion-eau/db/gestionEauDb.ts (PARTAGÉ) : Dexie v4 — index token sur eau_invitations',
      'modules/gestion-eau/services/eauInvitationService.ts (PARTAGÉ) : generateInviteToken/buildInviteUrl/createWhatsappInvitation/claimPendingTokenInvitation + createInvitation maj (champs canal email)',
      'modules/gestion-eau/context/GestionEauContext.tsx (PARTAGÉ) : appel claimPendingTokenInvitation(online) dans load(), juste après claimInvitationForCurrentUser',
      'SQL Supabase : eau_invitations (token/expires_at/invite_channel, email nullable) + RPC eau_claim_invitation_by_token + RPC publique eau_public_vitrine_stats',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.33.0',
    date: '2026-06-07',
    description: 'feat(gestion-eau) : Phase 2 « invitation par email » — UI admin (page « Invitations & demandes ») + envoi WhatsApp (wa.me). La page /gestion-eau/demandes (EauDemandesPage, sous garde admin) gagne : (1) un formulaire d\'invitation (nom optionnel, email Google requis et normalisé lower-case, numéro WhatsApp requis, rôles cumulables Admin/Releveur + option Client → multiselect compteurs) ; (2) à la création, un bouton « Envoyer sur WhatsApp » (+ « Copier le message » en secours) qui ouvre wa.me avec un message FR pré-rempli contenant le lien profond selon le rôle (Releveur/Admin → /gestion-eau/releves?tab=bassin&bt=niveau ; Client seul → /gestion-eau/client) et l\'email exact, en insistant sur l\'usage de CETTE adresse Google ; (3) une liste des invitations (en_attente puis acceptee, revoquee masquées) avec Renvoyer WhatsApp et Révoquer (en_attente uniquement, avec confirmation). La gestion des demandes reçues (valider/refuser) est conservée. Idempotence : createInvitation met à jour l\'invitation en_attente existante du même email (id + date conservés) au lieu d\'en créer une 2áµ‰. Helpers wa.me purs et testables dans eauInvitationService (normalizeWhatsappNumber : 0XXXXXXXXX → 261XXXXXXXXX ; invitationRoleLabel ; invitationTargetPath ; invitationDeepLink ; buildInvitationMessage ; buildWhatsappUrl). Aucune nouvelle table/SQL (tout posé en Phase 1). Pas de second header (shell partagé). Offline : création offline-first (saveLocal) ; si window.open échoue → repli « copier le message ». tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauDemandesPage.tsx (PARTAGÉ) : formulaire d\'invitation + liste invitations (renvoyer/révoquer) + bouton WhatsApp, titre « Invitations & demandes », gestion des demandes reçues conservée',
      'modules/gestion-eau/services/eauInvitationService.ts (PARTAGÉ) : createInvitation idempotent (maj de l\'invitation en_attente existante) + helpers wa.me (normalizeWhatsappNumber/invitationRoleLabel/invitationTargetPath/invitationDeepLink/buildInvitationMessage/buildWhatsappUrl)',
      'modules/gestion-eau/components/eauAideTextes.ts (PARTAGÉ) : entrée d\'aide « invitations »',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.32.0',
    date: '2026-06-07',
    description: 'feat(gestion-eau) : Phase 1 « invitation par email » — socle + octroi automatique du rôle au 1er login Google. Un admin pré-enregistre une invitation (email Google, rôles admin/releveur/client cumulables, compteurs visibles pour un client). À la connexion de la personne avec cette adresse Google, son rôle est attribué SANS validation, et — si client — son compte client + compteurs sont créés/activés. SQL (idempotent, exécuté+vérifié) : table eau_invitations (PK id text, statut en_attente/acceptee/revoquee, compteur_ids jsonb), RLS active policy admin-only (eau_is_admin()), index partiel lower(email) WHERE en_attente ; RPC SECURITY DEFINER eau_claim_invitation() (cherche une invitation en_attente pour lower(auth.jwt()->>email), upsert eau_roles ON CONFLICT (user_id), crée/active eau_comptes_client si role_client, marque acceptee) ; revoke execute from public+anon, grant to authenticated. Tests RLS (transaction annulée) : anon→401 42501, authenticated sans invitation→null, invitation releveur→eau_roles.releveur=true + acceptee + 2áµ‰ appel null (idempotent), invitation client→compte actif + compteurs, non-admin ne voit aucune invitation (0), admin voit (1). Code (additif, scopé module) : type InvitationLocal, store Dexie eau_invitations (v3, additif), eau_invitations dans PK_BY_TABLE + EAU_TABLES (sync), service eauInvitationService (claimInvitationForCurrentUser best-effort online + createInvitation/listInvitations/revokeInvitation pour la Phase 2), appel claimInvitationForCurrentUser dans GestionEauContext.load AVANT ensureRolesBootstrap (en ligne uniquement, best-effort, n\'écrit rien en local — le pull des rôles reflète l\'octroi). Aucune UI admin (Phase 2). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/types/gestionEau.ts (PARTAGÉ) : type InvitationRow/InvitationLocal + InvitationStatut',
      'modules/gestion-eau/db/gestionEauDb.ts (PARTAGÉ) : store eau_invitations (Dexie v3, additif) + entrée EAU_TABLES',
      'modules/gestion-eau/services/eauSync.ts (PARTAGÉ) : eau_invitations dans PK_BY_TABLE',
      'modules/gestion-eau/services/eauInvitationService.ts (NOUVEAU) : claimInvitationForCurrentUser + createInvitation/listInvitations/getInvitation/revokeInvitation/refreshInvitations',
      'modules/gestion-eau/context/GestionEauContext.tsx (PARTAGÉ) : appel claimInvitationForCurrentUser(online) dans load(), avant ensureRolesBootstrap, en ligne, best-effort',
      'SQL Supabase : table eau_invitations + RLS admin-only + RPC eau_claim_invitation() (SECURITY DEFINER, revoke anon/public, grant authenticated)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.31.4',
    date: '2026-06-07',
    description: 'fix(shell) : verrou de navigation inter-modules — un rechargement (F5/Shift+Ctrl+R) ou l\'ouverture directe d\'une adresse de module préserve l\'URL et MAINTIENT l\'utilisateur dans son module (eau /gestion-eau, construction /construction/*, budget /transactions…). Cause racine (chemin latent du shell, complémentaire à v3.29.1 garde de rôle et v3.31.3 reprise auto restreinte) : la branche non authentifiée de AppLayout faisait <Navigate to="/auth" replace/> sur le catch-all ; pendant la fenêtre de boot où isAuthenticated est false (restauration session Supabase / refresh token), ce Navigate écrasait l\'URL courante par /auth, puis au retour de session la branche authentifiée (qui n\'a pas de route /auth) retombait sur <Navigate to="/dashboard"/> → éjection vers le tableau de bord, tous modules confondus. Correctif principal (4.1) : remplacer ce Navigate par un rendu d\'AuthPage SUR PLACE (<Route path="*" element={<AuthPage/>}/>) — l\'URL n\'est jamais modifiée ; quand la session se restaure, AppLayout re-rend la branche authentifiée sur la MÊME adresse. AuthPage rendu hors /auth ne navigue pas sur un simple F5 (handleOAuthCallback ne navigue que s\'il y a des jetons OAuth en attente). Correctif secondaire (4.2, sans risque OAuth) : un login Google initié depuis un lien profond mémorise l\'adresse d\'origine (sessionStorage bazarkely_post_login_redirect, hors /auth et /) et y revient après le callback, sinon /dashboard par défaut. Aucun changement au flux OAuth (capture jetons, detectSessionInUrl:false, setSession, ordre onAuthStateChange). Non-régression vérifiée : ModuleSwitcherContext (reprise auto limitée à /dashboard) inchangé ; routes publiques /gestion-eau/accueil et /gestion-eau/scan intactes ; useRequireAuth (navigate /auth) est du code mort non utilisé. tsc --noEmit OK, build OK.',
    changes: [
      'components/Layout/AppLayout.tsx : branche non authentifiée — <Navigate to="/auth"/> remplacé par un rendu d\'AuthPage sur place (catch-all), l\'URL courante n\'est plus jamais écrasée',
      'pages/AuthPage.tsx : handleGoogleSignIn mémorise l\'adresse d\'origine (bazarkely_post_login_redirect) ; handleOAuthCallback navigue vers cette adresse si présente, sinon /dashboard (seule la cible de navigation post-login change)',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.31.3',
    date: '2026-06-07',
    description: 'fix(shell) : la reprise automatique du dernier module n\'a plus lieu QUE depuis la racine neutre /dashboard. Arriver directement (lien, signet, F5) sur une route explicite d\'un autre module — /gestion-eau, /construction/... — n\'y rebondit plus vers /dashboard. Cause prouvée (RAPPORT-DIAGNOSTIC-deeplink-rebond) : le useEffect de restauration de ModuleSwitcherContext incluait /gestion-eau et /construction/dashboard dans isDefaultRoute ; si le module sauvé (bazarkely → /dashboard) ≠ module de la route courante, navigate(savedModule.path) éjectait l\'utilisateur indépendamment du rôle (d\'où l\'échec du correctif rôle-à-froid v3.29.1). Correctif minimal : isDefaultRoute = (currentPath === \'/dashboard\'). Auto-reprise login → /dashboard → dernier module conservée ; switcher in-app inchangé. tsc --noEmit OK, build OK.',
    changes: [
      'contexts/ModuleSwitcherContext.tsx : useEffect de restauration — isDefaultRoute restreint à la seule racine neutre /dashboard (retrait de /construction/dashboard et /gestion-eau)',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.31.2',
    date: '2026-06-07',
    description: 'fix(gestion-eau) : les icônes des 3 cartes bassin du tableau de bord ouvrent désormais le BON sous-onglet de la saisie bassin via un paramètre de deep-link `bt` (bassin-tab). Stock actuel → bt=niveau, Entrées du jour → bt=entree, Débit courant → bt=debit (carte Dernier bilan → bt=niveau). EauSaisieBassinPage lit `bt` directement via useSearchParams (approche la moins invasive, le composant importait déjà react-router-dom) : helper pur parseBassinTab valide la valeur contre \'entree\'|\'niveau\'|\'debit\' (toute autre valeur ou absence → \'niveau\', zéro régression) ; état initialisé sur la valeur lue + useEffect([btParam]) pour basculer le sous-onglet sur un nouveau deep-link sans remontage. Un changement manuel d\'onglet (boutons) ne touche pas l\'URL → non écrasé par l\'effet. EauRelevesPage NON modifiée : elle préserve déjà `bt` (ne nettoie la query que sur changement d\'onglet de page). Cartes compteur (?tab=compteur), destinations « voir » et logique ?tab=/?c= inchangées. Navigation pure (aucun appel réseau). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauDashboard.tsx : goSaisieBassin(bt) paramétré → ?tab=bassin&bt=<niveau|entree|debit> ; onIconClick des cartes Stock/Entrées/Débit + Dernier bilan ciblent le bon sous-onglet ; cartes compteur inchangées',
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx : import useSearchParams ; helper parseBassinTab ; état tab initialisé via ?bt= ; useEffect([btParam]) pour basculer sur deep-link sans remontage',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.31.1',
    date: '2026-06-07',
    description: 'fix(gestion-eau) : marge basse (padding-bottom) scopée au module pour que la dernière carte d\'une page longue dégage entièrement la BottomNav sur mobile. La BottomNav du module Eau dépasse les 80px (pb-20) du <main> partagé (libellés sur 2 lignes « Tableau de bord » / « Facturation » + env(safe-area-inset-bottom) Android), recouvrant la bordure basse de la dernière carte. Les pages BazarKELY de base ne sont pas touchées car elles ajoutent déjà leur propre pb-20 (≈160px). Correctif STRICTEMENT additif et isolé : un seul <div className="pb-[calc(5rem+env(safe-area-inset-bottom))]"> enveloppe les <Routes> du module dans GestionEauRoutes.tsx — vit uniquement sous l\'arbre /gestion-eau/*, zéro impact sur AppLayout, BottomNav, les autres modules ou le desktop. 5rem réplique la marge des pages de base (pb-20 du <main> + 5rem = 160px). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/GestionEauRoutes.tsx : <div pb-[calc(5rem+env(safe-area-inset-bottom))]> autour de <Routes> — marge basse scopée au module, dernière carte dégagée au-dessus de la BottomNav sur mobile',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.31.0',
    date: '2026-06-07',
    description: 'feat(gestion-eau) : tableau de bord /gestion-eau — cartes cliquables (voir / saisir) + tri en 2 colonnes thématiques. Chaque carte KPI a désormais 2 zones cliquables imbriquées (patron DashboardPage BazarKELY) : le CORPS navigue vers la page « voir » (Tendances, ou Suivi pour NRW et Dernier bilan), l\'ICÔNE (avec stopPropagation) navigue vers la page « saisir » (/gestion-eau/releves?tab=bassin ou ?tab=compteur). Les 7 cartes sont rangées en 2 colonnes : gauche = saisie bassin (Stock, Entrées, Débit), droite = saisie compteur (Conso du jour, NRW, Conso réseau, Autonomie) — hauteurs inégales assumées. La carte « Dernier bilan » (corps→Suivi, icône→saisie bassin) et les 2 mini-graphiques (toute la zone→Tendances) sont aussi cliquables. Aucun chevron affiché (hideChevron), apparence des cartes strictement inchangée (teintes/tailles/icônes/valeurs). Accessibilité : corps = div role="button" tabIndex=0 + clavier Enter/Espace (jamais de <button> imbriqué), bouton-icône avec aria-label. EauStatCard (PARTAGÉ) reçoit 3 props OPTIONNELLES additives (onIconClick, iconAriaLabel, hideChevron) : usages sans ces props (EauRapportsPage, EauScanResolverPage) rendus à l\'identique. Navigation pure (aucun appel réseau nouveau). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauUi.tsx (PARTAGÉ) : EauStatCard — props additives onIconClick/iconAriaLabel/hideChevron ; quand onIconClick fourni, corps = div role="button" (clavier) et icône = <button> stopPropagation ; rendu inchangé sans ces props',
      'modules/gestion-eau/components/EauDashboard.tsx : useNavigate + helpers goTendances/goSuivi/goSaisieBassin/goSaisieCompteur ; grille en 2 colonnes flex (bassin / compteur) ; onClick/onIconClick sur les 7 cartes ; Card local rendu cliquable (corps + icône) pour Dernier bilan ; 2 mini-graphes en div role="button" → Tendances (Link interne en stopPropagation)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.30.1',
    date: '2026-06-07',
    description: 'feat(gestion-eau) : champ « Date et heure » OPTIONNEL sur la saisie du bassin (EauSaisieBassinPage), onglets Niveau et Entrée. Permet d\'horodater un relevé/une entrée à une date passée au lieu de l\'instant présent. Champ <input type="datetime-local"> placé après la Note, avant le bouton Enregistrer, précédé d\'une icône CalendarClock + ligne d\'aide « Laisser vide = date et heure d\'aujourd\'hui ». Vide → comportement inchangé (le service applique nowIso()). Rempli → timestamp ISO transmis à addReleveBassin/addEntreeBassin (qui acceptaient déjà timestamp?: string). Garde douce : une date dans le futur bloque l\'enregistrement (toast « Date dans le futur impossible »). Champ réinitialisé après succès. Strictement additif : aucun service, schéma ni signature modifiés ; onglet Débit, calcul du volume et déclenchement du bilan inchangés. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx : 2 états (niveauDateTime/entreeDateTime), helpers purs toIsoOrUndefined/isFuture, champ datetime-local + aide sur onglets Niveau et Entrée, garde futur + reset après succès, timestamp transmis aux services',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.30.0',
    date: '2026-06-07',
    description: 'PHASE 2 SÉCURITÉ du module gestion-eau : verrouillage RLS par rôle + ownership client (côté serveur). Remplace les policies permissives `public using(true)` (S85) par 63 policies `to public` CONDITIONNÉES par des prédicats `auth.uid()`/rôle sur les 16 tables eau_* (RLS forcée enable sur toutes). Choix d\'architecture (issu du diagnostic Phase 1) : rôle `public` + prédicat (et NON `to authenticated`) — une requête résiduelle anon (course au boot, sync de fond) est ainsi filtrée à 0 ligne au lieu d\'être rejetée en 401 (même isolation, plus robuste). Helpers SECURITY DEFINER `eau_is_admin()`/`eau_is_releveur()`/`eau_client_has_compteur(text)` (search_path figé, grant public, bypass RLS via owner postgres → pas de récursion). Matrice : admin=tout ; releveur=lit compteurs/QR/config/bassin + insère relevés/bassin, MAIS ne lit ni factures ni comptes_client ; client=lit UNIQUEMENT ses compteurs/relevés/factures (via compteur_ids jsonb de son compte actif), JAMAIS le bassin ni un voisin. Bassin (eau_releves_bassin/entrees_bassin/bilans/debit_tests) invisible au client (aucune branche client). Parcours sans rôle déplacés en RPC SECURITY DEFINER : `eau_claim_enrolement(p_code)` (enrôlement par code) et `eau_create_demande(p_email,p_nom)` ; durcissement : revoke execute FROM anon (pas seulement public — Supabase grant EXECUTE explicitement à anon par défaut) sur ces RPC + eau_bootstrap_admin → un anon reçoit 401 « permission denied ». Câblage app : eauCompteClientService.linkByEnrolementCode appelle eau_claim_enrolement puis pullTable ; eauDemandeService.createDemande appelle eau_create_demande (repli offline-first conservé : INSERT accepté par `with check user_id=auth.uid()`). Tests négatifs vérifiés REST : anon = 0 ligne en lecture sur les 16 tables + écriture refusée (401 RLS) ; 0 policy permissive résiduelle. tsc --noEmit OK, build OK. Hors périmètre : redirect deep-link /gestion-eau→/dashboard au hard-reload (bug shell pré-existant).',
    changes: [
      'SQL (Supabase, via éditeur, RÈGLE #0ter) : helpers eau_is_admin/eau_is_releveur/eau_client_has_compteur (SECURITY DEFINER, grant public) ; RPC eau_claim_enrolement + eau_create_demande (SECURITY DEFINER, grant authenticated, revoke anon) ; durcissement eau_bootstrap_admin (revoke anon) ; alter table enable RLS ×16 ; drop de toutes les policies eau_* (dont public using(true) de S85) ; 63 policies par rôle (to public + prédicats auth.uid()), bassin invisible au client',
      'modules/gestion-eau/services/eauCompteClientService.ts : linkByEnrolementCode passe par la RPC eau_claim_enrolement + pullTable (le client ne lit plus eau_comptes_client en clair) ; repli local synthétisé si pull réseau raté',
      'modules/gestion-eau/services/eauDemandeService.ts : createDemande passe par la RPC eau_create_demande ; repli offline-first conservé (INSERT user_id=auth.uid() accepté par RLS)',
      'eauSync inchangé (pullTable/pushTable tolèrent déjà retour filtré / refus RLS — best-effort, pas de crash)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.29.1',
    date: '2026-06-07',
    description: 'fix(gestion-eau): deep-link / hard-reload sur /gestion-eau ne rebondit plus vers /dashboard. DIAGNOSTIC (navigateur, RÈGLE #0ter) : l\'hypothèse « course à l\'hydratation du shell » est INFIRMÉE — isAuthenticated est persisté et zustand v5+localStorage le réhydrate de façon SYNCHRONE (true dès le 1er rendu) ; preuve : hard-reload sur /transactions et /family reste stable (un vrai bug shell les ferait aussi rebondir). La VRAIE cause est dans le module eau : au démarrage à froid (Dexie eau_roles vide), si pullTable(eau_roles) est lent/échoue/timeout, getRolesForUser renvoie tout à false et GestionEauRoute (valid + !isLoading + !hasEauAccess) faisait Navigate /dashboard alors que l\'utilisateur est admin (warm = rôle en cache → OK ; d\'où l\'intermittence). CORRECTIF (additif, scopé module) : pullTable expose désormais `ok` (serveur a répondu vs erreur/timeout) ; ensureRolesBootstrap réessaie le pull eau_roles (3 tentatives) et retourne { roles, confirmed } ; GestionEauContext expose rolesConfirmed + retryAccess ; GestionEauRoute ne redirige vers /dashboard QUE sur refus CONFIRMÉ (rolesConfirmed && !hasEauAccess), sinon affiche un écran d\'attente « Vérification de votre accès… » + bouton Réessayer (jamais de rebond silencieux). Non-régression : un vrai utilisateur sans rôle eau (pull OK, 0 rôle) est toujours redirigé ; logique de session Phase 1 (sessionStatus) inchangée. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauSync.ts : pullTable() retourne { pulled, ok } — `ok` distingue « serveur a répondu » de « erreur/timeout » (tous les appelants existants ignorent le retour : additif sans régression)',
      'modules/gestion-eau/services/eauRoleService.ts : ensureRolesBootstrap() retourne { roles, confirmed } + retry du pull eau_roles (ROLE_PULL_MAX_ATTEMPTS=3) ; hors-ligne, confirmed = présence d\'un cache local (rôle ou compte client)',
      'modules/gestion-eau/context/GestionEauContext.tsx : état rolesConfirmed + action retryAccess() ; câblage de la résolution { roles, confirmed }',
      'modules/gestion-eau/components/GestionEauRoute.tsx : redirect /dashboard UNIQUEMENT sur refus confirmé ; sinon écran EauAccessPendingScreen (attente + Réessayer) ; toast « Accès refusé » gardé sur rolesConfirmed',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.29.0',
    date: '2026-06-07',
    description: 'PHASE 1 SÉCURITÉ du module gestion-eau (fondation session & identité, GO/NO-GO → GO). Aucune RLS restrictive introduite : les policies eau restent `public` (verrouillage = Phase 2). Diagnostic « anon » élucidé : la session Supabase EST authentifiée (JWT role=authenticated, sub == users.id), le client partagé porte le JWT sur toutes les requêtes eau ; la cause réelle du « anon » historique est une COURSE AU BOOT sur réseau lent (au montage, Zustand persisté pas encore réhydraté + getSession() pas prêt → getCurrentUserIdSafe() null → rôles vides → redirect /dashboard, et une écriture précoce dans cette fenêtre partirait sans Authorization = anon → 401 sous une policy authenticated). Le passage en `public` (S85) avait masqué ce symptôme. (B) Garantie de session au montage : nouveau waitForEauSession (eauAuth, lecture localStorage en retries, jamais de réseau, jamais de getUser) absorbe la course au boot ; GestionEauContext expose sessionStatus (checking/valid/needs-reauth/mismatch) calculé à partir de getSession + identité (session.user.id === store.user.id) ; GestionEauRoute affiche un spinner en « checking » (plus de redirect prématuré), l\'écran EauReauthScreen (« Se reconnecter avec Google ») en « needs-reauth »/« mismatch », et ne redirige vers /dashboard que si la session est fiable mais sans rôle. Aucune 2áµ‰ identité créée ; persistSession + autoRefreshToken inchangés (connexion une seule fois, session conservée entre pages/fermetures) ; offline préservé (session déjà établie → lecture Dexie). (C) Bootstrap propriétaire CÔTÉ SERVEUR : nouvelle RPC idempotente eau_bootstrap_admin() (SECURITY DEFINER) qui pose admin=true sur auth.uid() uniquement si aucun admin n\'existe ; ensureRolesBootstrap appelle supabase.rpc + pullTable(eau_roles), suppression de l\'ancien setRoles()+push direct de la ligne admin (offline : lecture locale sans push). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauAuth.ts : getEauSession() + waitForEauSession() (retries getSession, absorbe la course au boot, pas de réseau)',
      'modules/gestion-eau/context/GestionEauContext.tsx : type EauSessionStatus + état sessionStatus + vérification session/identité au montage + action reauth() ; n\'utilise plus getCurrentUserIdSafe directement',
      'NEW modules/gestion-eau/components/EauReauthScreen.tsx : écran de reconnexion Google (cas needs-reauth/mismatch), charte AHUVI',
      'modules/gestion-eau/components/GestionEauRoute.tsx : gère sessionStatus (spinner en checking, EauReauthScreen sinon) → plus de redirect prématuré vers /dashboard',
      'modules/gestion-eau/components/index.ts : export EauReauthScreen',
      'modules/gestion-eau/services/eauRoleService.ts : ensureRolesBootstrap via RPC serveur eau_bootstrap_admin (idempotente) + pullTable, retrait du bootstrap admin local',
      'SQL : CREATE OR REPLACE FUNCTION eau_bootstrap_admin() SECURITY DEFINER (idempotente) + GRANT EXECUTE TO authenticated — exécuté et vérifié via REST (aucune policy restrictive ajoutée)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.28.0',
    date: '2026-06-06',
    description: 'AHUVI Eau module header logo switched to the official vector asset from root logo.svg (dark rounded square, cyan gauge arc, water drop) — WITHOUT the "A" letter and with an adjusted drop gradient (#2a9bc0 -> #0d6f8d, previously #1d8fad -> #0f6f8c, and the text glyph removed). Asset moved from repo root logo.svg to modules/gestion-eau/assets/ahuvi-eau-logo.svg (root logo.svg removed; logo.png kept for future PWA icons). EauLogo.tsx updated accordingly (still inline SVG, className prop, unique gradient id ahuviDropGrad, role/aria-label). Header.tsx wiring from v3.27.0 unchanged (already renders <EauLogo /> when isEauModule, "B" square otherwise). Strictly additive/cosmetic; no regression on BazarKELY/Construction logos; logo click still toggles the module switcher.',
    changes: [
      'modules/gestion-eau/assets/ahuvi-eau-logo.svg : content replaced with official logo.svg (no "A", gradient #2a9bc0 -> #0d6f8d)',
      'modules/gestion-eau/components/EauLogo.tsx : removed the "A" text glyph, updated gradient stops',
      'Removed root logo.svg (logo.png kept)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.27.1',
    date: '2026-06-06',
    description: 'fix: menu Eau « Mise à jour » reste dans le module (route /gestion-eau/version). Le bouton « Mise à jour » de HeaderEauActions pointait vers /app-version, route transversale globale non préfixée → moduleIdForPath() renvoyait \'bazarkely\' et le switcher rebasculait header + BottomNav sur la coquille BazarKELY (utilisateur éjecté du module). Correctif strictement additif : AppVersionPage (générique, sans paramètre de route) est désormais aussi montée sous /gestion-eau/version dans GestionEauRoutes (sans garde de rôle), et le bouton cible cette route. La route globale /app-version est conservée pour la coquille et les autres modules. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/GestionEauRoutes.tsx : route enfant `version` rendant AppVersionPage (partagée), avant le catch-all',
      'components/Layout/header/HeaderEauActions.tsx : bouton « Mise à jour » → /gestion-eau/version (au lieu de /app-version)',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.27.0',
    date: '2026-06-06',
    description: 'AHUVI Eau module header logo. The generic "B" square in the Gestion Eau header is replaced by the AHUVI Eau logo (dark rounded square, cyan gauge arc, water drop, white "A" reserved in the drop). Rendered inline as SVG (new component modules/gestion-eau/components/EauLogo.tsx) — no <img> request, crisp at any size, immune to Service Worker caching, unique stable gradient id. Asset of reference stored at modules/gestion-eau/assets/ahuvi-eau-logo.svg. Header.tsx (SHARED) change is strictly additive: the EauLogo only renders when isEauModule is true; BazarKELY and Construction keep the unchanged "B" square. The logo button still toggles the module switcher (onClick, logoRipple, aria-label, title preserved). Root-level stray "logo [GestionEAU].svg" removed.',
    changes: [
      'NEW modules/gestion-eau/assets/ahuvi-eau-logo.svg : reference SVG asset (with the white "A")',
      'NEW modules/gestion-eau/components/EauLogo.tsx : inline SVG React component (className prop, unique gradient id)',
      'modules/gestion-eau/components/index.ts : export EauLogo',
      'SHARED components/Layout/Header.tsx : render <EauLogo /> in the logo button when isEauModule, "B" square otherwise (additive)',
      'Removed stray root file "logo [GestionEAU].svg"',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.26.1',
    date: '2026-06-06',
    description: 'CORRECTIF « Scan de ticket » : suppression EN CASCADE du reçu (transaction_receipts, 1:1) et des lignes d\'article (transaction_items, 1:N) quand la transaction parente est supprimée — dette de la Phase 2 (orphelins en local Dexie ET côté Supabase). (A) Côté base : les contraintes FK transaction_id de transaction_items et transaction_receipts sont recréées en ON DELETE CASCADE (bloc DDL idempotent et robuste quel que soit le nom de contrainte d\'origine — vérifié confdeltype=\'c\' sur les deux), et les orphelins déjà présents ont été purgés (vérif REST/SQL : 0 orphelin items, 0 orphelin receipts). Quand la suppression de la transaction est rejouée (envoi direct online ou file DELETE), Postgres supprime automatiquement reçu + lignes → aucun DELETE séparé n\'est mis en file. (B) Côté app (Dexie ne gère pas les FK) : transactionService.deleteTransaction supprime explicitement, juste après db.transactions.delete(id), les transactionItems puis transactionReceipts rattachés (where transactionId = id). Idempotent (re-supprimer ne casse rien), non bloquant (try/catch warn). Couvre aussi la ligne jumelle d\'un transfert (appel récursif) et le bouton « Restituer » (restoreBalance), la cascade s\'exécutant indépendamment de la restitution du solde. Aucune régression sur la suppression de transactions sans reçu ni sur les transferts. tsc --noEmit OK, build OK.',
    changes: [
      'PARTAGÉ services/transactionService.ts : cascade locale Dexie (transactionItems + transactionReceipts) dans deleteTransaction, après la suppression de la transaction',
      'SQL : FK transaction_id de transaction_items + transaction_receipts recréées en ON DELETE CASCADE (DO block robuste/idempotent) + purge des orphelins existants (exécuté et vérifié : confdeltype=\'c\', 0 orphelin)',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.26.0',
    date: '2026-06-06',
    description: 'PHASE 2 du « Scan de ticket » : 2áµ‰ moteur OCR EN LIGNE haute précision (Google Cloud Vision) avec bascule automatique online/offline. La clé Google Vision reste CÔTÉ SERVEUR via une Netlify Function `/.netlify/functions/ocr-receipt` (POST image base64 → DOCUMENT_TEXT_DETECTION, languageHints fr → { text, confidence }) — jamais dans le bundle client (vérifié : GOOGLE_VISION_API_KEY et vision.googleapis.com absents de dist). ocrService.recognize() : en ligne → recognizeOnline (appel fonction, withTimeout 12 s) ; hors-ligne OU échec/timeout/texte vide/quota Vision → repli SILENCIEUX recognizeOffline (Tesseract, Phase 1) — aucun blocage utilisateur. Chaque résultat porte engine = google_vision | tesseract, tracé dans transaction_receipts.ocr_engine. Le parsing (receiptParser) reste COMMUN aux deux moteurs (texte Vision plus propre → meilleurs résultats sans dupliquer la logique). Seuil de confiance par moteur : Tesseract prudent (0,75, revue plus fréquente), Vision plus permissif (0,60) car texte propre — la cohérence Î£ lignes ≈ total reste le vrai garde-fou (confidenceThresholdFor). Dégradation propre : hors-ligne = aucun appel réseau ; en ligne mais Vision KO = repli Tesseract + log. Function : limite taille image (≤ 8 Mo base64 → 413), gestion clé absente (503), erreur/quota Vision (502), timeout (504, AbortController 10 s). Aucune dépendance npm ajoutée (fetch/Buffer/AbortController natifs Node 20). tsc (gate --noEmit) OK, build OK, 20 tests Phase 1 non régressés.',
    changes: [
      'Nouveau frontend/netlify/functions/ocr-receipt.ts : Netlify Function Google Vision (clé serveur process.env.GOOGLE_VISION_API_KEY, jamais exposée ; limites de taille + erreurs/timeout/quota gérés)',
      'services/ocrService.ts : type OcrEngine, recognizeOnline() (appel fonction + withTimeout), recognize() (bascule auto online→Vision / offline|échec→Tesseract), recognizeOffline() renvoie désormais engine',
      'constants/receipt.ts : RECEIPT_CONFIDENCE_THRESHOLD_VISION (0,60) + confidenceThresholdFor(engine) ; seuil Tesseract (0,75) conservé',
      'components/Receipt/ReceiptScanButton.tsx : utilise recognize(), applique le seuil selon le moteur, stocke l\'ocr_engine RÉEL (plus de \'tesseract\' en dur)',
      'Variable d\'environnement Netlify GOOGLE_VISION_API_KEY (clé serveur) — à renseigner côté Netlify si pas encore fait ; repli Tesseract tant qu\'absente',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.25.0',
    date: '2026-06-06',
    description: 'PHASE 1 du « Scan de ticket de caisse », intégrée au flux Transactions (pas un nouveau module). Depuis /add-transaction (dépenses ponctuelles), un bouton « Scanner un ticket » (icône ScanLine + aide ⓘ dépliable) ouvre la caméra arrière (input capture=environment, repli galerie). L\'image est pré-traitée en mémoire (downscale ~1500px + niveaux de gris, jamais stockée) puis lue HORS-LIGNE et gratuitement par Tesseract.js (langue fra, OEM LSTM, worker+cÅ“ur WASM simd-lstm+données servis depuis /public/tesseract — aucun CDN runtime ; assets PRÉCACHÉS par le service worker pour un OCR 100% hors-ligne). Parsing pur et testé (receiptParser) : fournisseur (1Ê³áµ‰ ligne textuelle), lignes d\'article (libellé/quantité via « 2 x 1500 »/prix), total (TOTAL/NET/À PAYER sinon Î£ lignes), exclusion TVA/rendu/dates/moyens de paiement, score de confiance (confiance OCR + cohérence Î£ vs total). « Correction si doute » : confiance ≥ seuil (0,75) ET cohérent → insertion directe ; sinon écran de relecture/correction (fournisseur, lignes éditables, compte, catégorie suggérée, date). Création : 1 transaction expense (montant = total) + N transaction_items + 1 transaction_receipts (avec receipt_md, seule trace conservée — aucune image). Détail transaction : carte « Articles du ticket » (fournisseur + lignes + total) avec édition inline (corriger/ajouter/supprimer → recalcul du total ET ajustement du solde du compte) + « Voir le ticket » (markdown). Catégorie suggérée (historique fournisseur puis mots-clés), jamais bloquante. Offline-first : Dexie v17 (transactionReceipts/transactionItems), sync Supabase idempotente (id client, upsert onConflict, rejeu ignoreDuplicates) ; tables transaction_receipts/transaction_items + RLS user_id=auth.uid(). Dépendance ajoutée : tesseract.js (assets locaux ~7,2 Mo précachés). tsc --noEmit OK, build OK, 20 tests (parser + recalcul total + rendu carte).',
    changes: [
      'Nouveaux : types/receipt.ts, services/receiptParser.ts (+ tests), services/ocrService.ts (Tesseract hors-ligne), services/receiptService.ts (offline-first), utils/receiptImage.ts (pré-traitement), constants/receipt.ts (seuil de confiance)',
      'Nouveaux composants : components/Receipt/ReceiptScanButton.tsx (flux capture→OCR→décision), ReviewReceipt.tsx (relecture/correction), ReceiptItemsCard.tsx (carte Articles éditable) + tests',
      'Assets OCR locaux : public/tesseract/ (worker.min.js, core/tesseract-core-simd-lstm.wasm(.js), lang/fra.traineddata.gz « fast ») — servis localement, précachés par le SW',
      'PARTAGÉ src/types/index.ts : SyncOperation.table_name étend transaction_receipts/transaction_items',
      'PARTAGÉ lib/database.ts : Dexie v17 (transactionReceipts/transactionItems, migration additive)',
      'PARTAGÉ services/apiService.ts : upsertReceipt/upsertReceiptItems/getReceiptByTransaction/getItemsByTransaction/deleteReceiptItem (upsert idempotent)',
      'PARTAGÉ services/syncManager.ts : cas de rejeu transaction_receipts/transaction_items (upsert ignoreDuplicates + DELETE)',
      'PARTAGÉ pages/AddTransactionPage.tsx : bouton « Scanner un ticket » (dépenses ponctuelles)',
      'PARTAGÉ pages/TransactionDetailPage.tsx : carte « Articles du ticket » (hors édition) + rafraîchissement après édition',
      'PARTAGÉ vite.config.ts : globPatterns injectManifest étendus (wasm,gz) pour précacher les assets OCR',
      'SQL : CREATE transaction_receipts + transaction_items (+ index + RLS user_id=auth.uid()), exécuté et vérifié via REST (négatif anon INSERT → 401)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.24.0',
    date: '2026-06-06',
    description: 'ÉVOLUTION « Iconographie + graphiques » du module gestion-eau. (A) Iconographie systématique façon BazarKELY mais en charte AHUVI (vert forêt #364E30 / olive #4C6D40 + accent or #9D9B4B ; plus aucun violet/bleu — teal conservé comme accent eau, ambre/rouge conservés pour le sens des alertes). Chaque bouton d\'action porte une icône en tête, chaque carte KPI une icône dans un conteneur teinté, chaque ligne de liste une icône de tête (+ ChevronRight vers un détail), chaque état vide une grande icône muette, chaque onglet une icône. Icônes décoratives en aria-hidden, lisibilité mobile préservée. (B) Briques d\'UI mutualisées (DRY) : EauStatCard, EauIconButton, EauEmptyState, EauListIcon (components/EauUi.tsx) + icône optionnelle sur EauTabs. (C) Graphiques pertinents (recharts, charte AHUVI) : tableau de bord (mini-conso 30 j + niveau du bassin), saisie bassin (courbe du niveau + histogramme du débit des pompes), détail compteur (histogramme de conso par période), facturation (barres conso et montant facturé par période), espace client (historique conso conservé), tendances (5 graphiques vérifiés). États vides illustrés partout. Évolution 100 % additive et cosmétique (aucune logique métier, aucun service, aucune signature modifiés ; aucun SQL). tsc --noEmit OK, build OK, 97 tests eau verts.',
    changes: [
      'Nouveau components/EauUi.tsx : EauStatCard (KPI icône+conteneur teinté AHUVI), EauIconButton (bouton à icône, variantes primary/secondary/danger/ghost/gold), EauEmptyState (état vide grande icône), EauListIcon (pastille de tête de ligne)',
      'EauTabs : prop optionnelle `icon` (lucide) sur chaque onglet',
      'Iconographie + recolorisation AHUVI appliquées à tous les écrans : Dashboard, Relevés, Saisie compteur/bassin, Tournée, Scan/QR, Suivi (Anomalies/Tendances), Compteurs, Carte, Facturation, Config, Utilisateurs, Demandes, Annonces, Audit, Alertes, Rapports, Client, Accueil',
      'Graphiques : niveau du bassin (Dashboard + Saisie bassin), historique du débit pompes (barres), histogramme conso/compteur (détail), barres conso+montant facturé/période (Facturation)',
      'Spinners route guards (GestionEauRoute, EauRoleProtectedRoute) recolorés sky→ahuvi',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.23.0',
    date: '2026-06-05',
    description: 'ÉVOLUTION « Aide contextuelle » du module gestion-eau : chaque écran et chaque action explique « à quoi ça sert » et « comment s\'en servir » via un panneau d\'aide dépliable, pour des utilisateurs non techniques. (A) Nouveau composant réutilisable EauAide : bouton ⓘ « Aide » discret près du titre + sous-titre cliquable, qui déplient/replient un panneau structuré (À quoi ça sert / Comment s\'en servir). Accessible (aria-expanded, aria-controls, focus), charte AHUVI (vert/or, fond clair), mobile-first. État mémorisé par écran en localStorage (eau_aide_<id>) : replié par défaut, sauf 1Ê³áµ‰ visite (déplié). (B) Aide branchée sur TOUS les écrans/onglets : Tableau de bord, Relevés (général), Saisie bassin (aide PAR onglet : Entrée / Niveau / Débit), Saisie compteur, Tournée, Scan, Suivi (Anomalies / Tendances), Compteurs, Carte, Facturation, Configuration, Utilisateurs, Demandes, Annonces, Audit, Centre d\'alertes, Rapports, Espace client, Page d\'accueil. (C) Intégration via prop `aide` de EauPageShell (bouton + sous-titre + panneau, état unique partagé) pour les écrans à shell, et composant EauAide autonome pour les emplacements hors shell (bandeau Relevés, onglet Scan, onglets bassin, Tournée, Carte, Accueil). Textes centralisés (eauAideTextes.ts). Évolution 100 % additive (aucune régression, aucun SQL). 5 tests ajoutés (rendu, 1Ê³áµ‰ visite dépliée, mémorisation repli, toggle + persistance, couverture du catalogue).',
    changes: [
      'Nouveau composant components/EauAide.tsx (hook useAideState + AideToggleButton + AidePanel + EauAide autonome)',
      'Nouveau catalogue components/eauAideTextes.ts (22 entrées d\'aide, français simple)',
      'EauPageShell : prop optionnelle `aide` (bouton ⓘ près du titre, sous-titre cliquable, panneau sous l\'en-tête, état unique)',
      'Aide branchée sur tous les écrans à shell (Dashboard, SaisieCompteur, Anomalies, Tendances, Compteurs, Facturation, Config, Utilisateurs, Demandes, Annonces, Audit, Client, Alertes, Rapports)',
      'Aide autonome sur les écrans/onglets hors shell : Relevés (général + Scan), Saisie bassin (Entrée/Niveau/Débit), Tournée, Carte, Accueil',
      '5 tests RTL (eauAide.test.tsx) : rendu, 1Ê³áµ‰ visite dépliée, mémorisation du repli, toggle + persistance localStorage, couverture du catalogue',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.22.0',
    date: '2026-06-05',
    description: 'ÉVOLUTION « bassin/débit » du module gestion-eau (modèle physique affiné + mesure de l\'apport). (A) Modèle bassin flotteur/trop-plein : la Configuration saisit désormais Longueur, Largeur, Hauteur flotteur (arrêt pompes — plafond opérationnel, référence du % de remplissage) et Hauteur trop-plein (sécurité) + écart débit max (%). Déductions centralisées et affichées en lecture seule : surface S = L×l, volume utile = S×Hf, volume sécurité = S×Htp, m³/cm = S×0,01 (ex. 14×7×2,50 → 98 m², 245 m³, 0,98 m³/cm ; trop-plein 2,90 → 284,2 m³). (B) Tests de débit des pompes « vanne fermée » (Relevés → onglet Bassin → mode Débit) : niveau début/fin (cm) + durée (min) → Q_in (m³/h) = S × (Î”niveau/100) ÷ (durée/60) ; historique des tests + débit courant (dernier) mis en évidence ; écart % vs précédent ; alerte « débit instable » si écart > seuil (déf. 15 %). Nouvelle table eau_debit_tests. (C) Conso réseau & pertes recalculées : apport = Q_in×Δt (ou volume manuel en override) ; conso réseau = apport − Î”stock ; pertes = conso réseau − Î£ compteurs ; NRW = pertes / conso réseau. Bilans enrichis (apport_m3, conso_reseau_m3, pertes_m3, debit_m3h_utilise). (D) Autonomie estimée = stock courant ÷ conso horaire moyenne (+ date de vidage prévue), conso moyenne/jour. (E) Tableau de bord : cartes Débit courant, Conso réseau, NRW (modèle réseau), Autonomie ; % remplissage référencé au flotteur. (F) Alertes ajoutées : « flotteur défaillant » (niveau mesuré > flotteur → risque débordement) et « débit instable » — via le centre d\'alertes + notificationService existants. Rétrocompatible : sans test de débit, repli automatique sur la saisie manuelle d\'entrées (aucune casse). Offline-first (Dexie v2) + sync idempotente (id client, upsert). 15 tests ajoutés (107 tests eau au total).',
    changes: [
      'Nouveaux utils purs : utils/debit.ts (computeDebit/ecartDebitPct/debitInstable) ; utils/bassin.ts étendu (BassinModel, bassinDeductions, tauxRemplissageFlotteur, estimerAutonomie)',
      'utils/bilan.ts : computeBilan calcule apport/conso réseau/pertes/NRW réseau (additif, rétrocompatible) ; utils/alertes.ts : candidat flotteur_defaillant',
      'Nouveau service central eauBassinService (source unique des déductions bassin + CRUD tests de débit + alerte débit instable)',
      'eauBilanService : bilan alimenté par le débit courant + champs réseau persistés ; DashboardData enrichi (débit, conso réseau, NRW réseau, autonomie)',
      'eauConfigService : dimensionsFromConfig référence le flotteur (repli hauteur max) ; debitEcartMaxPctFromConfig',
      'eauAlerteService : flotteur défaillant alimenté (hauteur dernière vs flotteur) + titres des 2 nouveaux types',
      'UI : EauConfigPage (flotteur/trop-plein/écart débit + déductions lecture seule), EauSaisieBassinPage (onglet Débit : saisie/aperçu Q_in + historique), EauDashboard (cartes débit/conso réseau/autonomie), EauAlertesPage (libellés)',
      'Types/Dexie : eau_debit_tests (table v2) + champs eau_config (flotteur/trop-plein/écart) + eau_bilans (apport/conso réseau/pertes/débit) + AlerteType (flotteur_defaillant, debit_instable)',
      'SQL : ALTER eau_config (3 colonnes), CREATE eau_debit_tests (+ RLS), ALTER eau_bilans (4 colonnes), élargissement du check des types eau_alertes',
      '15 tests ajoutés (déductions bassin, Q_in, conso réseau/pertes/NRW, autonomie, alerte flotteur) — 107 tests eau',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.21.0',
    date: '2026-06-04',
    description: 'PHASE 4 du module gestion-eau (pilotage & finitions + charte AHUVI). (A) Tendances /gestion-eau/tendances (admin+releveur) : graphiques recharts — conso métrée par jour (aire), niveau du bassin (ligne), NRW par semaine (barres), top consommateurs et conso par zone (barres horizontales) ; mini-graphe conso 30 j au tableau de bord (lien Tendances) ; onglet Tendances activé sous Suivi ; historique de consommation (12 derniers relevés) dans l\'espace client. (B) Centre d\'alertes /gestion-eau/alertes (admin) : génération IDEMPOTENTE (anomalie de bilan, compteur non relevé > jours_sans_releve_alerte, bassin critique < bassin_seuil_critique_pct, fuite suspectée si NRW ≥ 25 % + pertes > 0) ; dédup par type+ref non traité ; notifications sur l\'appareil via le notificationService partagé (type eau_alert) ; marquage lu/traité ; bouton « Activer » les notifications. (C) Rapport mensuel /gestion-eau/rapports (admin) : synthèse (entrées, conso, pertes/NRW, anomalies, factures + impayé) → PDF (jsPDF, charte verte) ; proposition automatique en fin de période (derniers/premiers jours du mois, mémorisée). (D) Annonces /gestion-eau/annonces (admin) : CRUD (titre, texte, type promo/évènement/communauté, fenêtre date, actif) ; les annonces actives défilent dans un bandeau fermable du header en mode eau. (E) Journal d\'audit /gestion-eau/audit (admin) : actions clés journalisées (config modifiée, factures générées, annonces CRUD) + journal des scans QR (Phase 3), filtre texte, 2 onglets. (F) Charte AHUVI : palette/typo déjà en place, étendue (tokens ahuvi.gold-light #C3C067, ahuvi.teal #10939F) ; écrans Phase 4 stylés (vert forêt/olive/or, Playfair/Poppins) ; aucun autre module affecté. Reprises Phase 3 : photo de relevé compteur (capture caméra + compression JPEG locale, stockée en data URL via la file _dirty), bouton « Purger le cache carte » (countTiles/clearTiles) en Configuration, badge « N en attente de sync » (countDirty) dans le menu header. Menu HeaderEauActions : Tendances/Alertes/Rapports/Annonces/Audit activées (role-filtrées) + badge alertes non lues. Aucun SQL (tables eau_alertes/eau_audit/eau_annonces + colonnes déjà présentes).',
    changes: [
      'Nouveaux services : eauAlerteService (génération idempotente + notifs), eauAnnonceService (CRUD + fenêtre active), eauAuditService (logAudit/listAudit), eauTendanceService (séries conso/niveau/NRW/top/zone), eauRapportService (synthèse mensuelle + proposition fin de période)',
      'Nouvel util pur testable : utils/alertes.ts (computeAlerteCandidates) ; utils/rapportPdf.ts (PDF mensuel) ; utils/photo.ts (compression image)',
      'Nouveaux écrans : EauTendancesPage, EauAlertesPage, EauRapportsPage, EauAnnoncesPage, EauAuditPage + routes role-gardées',
      'EauSuiviPage : onglet Tendances activé ; EauDashboard : mini-graphe conso 30 j ; EauClientPage : historique conso ; EauSaisieCompteurPage : capture photo ; EauConfigPage : purge cache carte',
      'PARTAGÉ Header.tsx : bandeau d\'annonces défilant (HeaderEauAnnonces) en mode eau',
      'PARTAGÉ header/HeaderEauActions.tsx : entrées Phase 4 activées + badges (alertes non lues, file _dirty)',
      'PARTAGÉ notificationService.ts : type eau_alert ajouté (additif)',
      'PARTAGÉ tailwind.config.js : tokens ahuvi.gold-light + ahuvi.teal',
      'eauSync.countDirty() ; hooks d\'audit additifs dans eauConfigService.saveConfig et eauFactureService.genererFactures',
      '20 tests Phase 4 (alertes, annonces, tendances, NRW, rapport) — 77 tests eau au total',
    ],
    type: 'minor' as const
  },
  {
    version: '3.20.0',
    date: '2026-06-04',
    description: 'PHASE 3 du module gestion-eau (QR & terrain). (A) QR compteur : un compteur peut porter PLUSIEURS QR (eau_qr_compteur), chacun avec un libellé d\'emplacement et un code unique ; QR encode …/gestion-eau/scan?t=c&k=<code> ; export JPEG par QR + page d\'étiquettes imprimable (HTML). QR client : un par compte (code_qr), encode t=cl, téléchargeable JPEG (onglet « Mon QR »). (B) Route de scan publique /gestion-eau/scan : résout selon connexion + rôle et JOURNALISE dans eau_scans (emplacement, utilisateur, rôle, résultat) — releveur/admin + QR compteur → saisie d\'index directe du bon compteur (préselection) ; releveur/admin + QR client → fiche conso du client ; client + son QR → son espace ; client + autre QR → « Ce QR ne vous est pas destiné » ; non connecté/sans rôle → page mission. Scanner caméra intégré (html5-qrcode) en onglet Scan + bouton sur la saisie compteur. Journal des scans par compteur visible dans le gestionnaire QR (admin). (C) Mode tournée (/releves onglet Tournée) : compteurs ordonnés zone/ordre, progression X/N des relevés du jour, reprise au 1er non relevé, sélection → saisie directe. (D) Carte hors-ligne (compteurs onglet Carte) : Leaflet + tuiles OSM, géoloc lat/lng éditable en fiche compteur, bouton « Télécharger la carte de la zone » qui pré-télécharge les tuiles de la zone configurée (eau_config.map_centre_lat/lng, map_rayon_km, map_zoom_min/max) dans un cache IndexedDB dédié (GestionEauTilesDB, hors sync, plafonné à 1500 tuiles — politique OSM) ; auto au 1er lancement en ligne ; repli sur la liste des compteurs si tuile manquante hors-ligne. Champs « Zone carte » ajoutés en Configuration. (E) Déclencheur de sync au retour online (écoute useAppStore.isOnline) : vide la file _dirty (relevés, compteurs, QR, scans créés hors-ligne) via upsert idempotent (id client) → aucun doublon. Nettoyage : EauNav.tsx + navConfig.ts supprimés (nav principale = GESTION_EAU_NAV_ITEMS), test eauNavRoles migré. Dépendances ajoutées : qrcode, html5-qrcode, leaflet (+ types). Tables eau_qr_compteur/eau_scans + colonnes lat/lng/map_* déjà présentes côté Supabase (aucun SQL).',
    changes: [
      'Nouveaux utils : scanUrl.ts (encode/décode liens QR), qrImage.ts (export JPEG + étiquettes imprimables)',
      'Nouveaux services : eauQrService (CRUD multi-QR compteur), eauScanService (résolution matrice rôle + journalisation, decideOutcome pur), eauTourneeService (progression du jour)',
      'Nouvelle base locale dédiée : db/eauTiles.ts (cache tuiles OSM, NON synchronisé)',
      'Nouvelle couche carte : components/map/offlineTiles.ts (OfflineTileLayer + downloadZoneTiles bornée à la zone)',
      'Nouveaux écrans : EauScanResolverPage (route publique /gestion-eau/scan), EauQrScanner (caméra), EauQrCompteurManager (QR + journal), EauTourneePage, EauCartePage, EauClientQrPage',
      'Onglets activés : Tournée + Scan (EauRelevesPage), Carte (EauCompteursPage), Mon QR (EauClientPage)',
      'PARTAGÉ App.tsx : route publique /gestion-eau/scan',
      'eauCompteurService/EauCompteursPage : géoloc lat/lng éditable + bouton QR par compteur',
      'EauConfigPage : section « Zone carte » (centre/rayon/zoom)',
      'GestionEauContext : déclencheur syncAll() au retour en ligne (vide _dirty)',
      'Suppression EauNav.tsx + navConfig.ts ; test eauNavRoles migré vers GESTION_EAU_NAV_ITEMS ; 16 tests Phase 3 ajoutés (scanUrl, decideOutcome, tiles)',
    ],
    type: 'minor' as const
  },
  {
    version: '3.19.0',
    date: '2026-06-04',
    description: 'CORRECTIF UI du module gestion-eau (constaté en prod v3.18.0). (a) La barre du bas (BottomNav) affichait encore les 6 items BazarKELY en module Eau et le module avait une nav interne en doublon (EauNav). (b) Le header partagé restait « BazarKELY » et un second header (titre/sous-titre) s\'affichait dans la page. Désormais : UN SEUL header, brandé AHUVI (palette vert forêt #364E30 / olive #4C6D40 + accent or #9D9B4B, titres Playfair Display, texte Poppins, « AHUVI Eau » + slogan « Distribution & suivi d\'eau — Nosy Be »), conditionné par le module (bazarkely violet et construction inchangés). La nav PRINCIPALE vit dans BottomNav (mobile) + nav desktop du header : boutons THÉMATIQUES (≤ 6) filtrés par rôle — Admin (5 : Tableau de bord · Relevés · Suivi · Compteurs · Facturation), Releveur (3 : Tableau de bord · Relevés · Suivi), Client (2 : Ma conso · Mes factures). Chaque thème regroupe ses sous-écrans via des onglets internes (Relevés = Bassin/Compteur ; Suivi = Anomalies/Bilans ; Compteurs = Liste/Carte ; Facturation = Factures/Rapports ; Client = Ma conso/Mes factures). Le secondaire (Configuration, Utilisateurs & rôles, Demandes d\'accès, + Alertes/Annonces/Audit Phase 3-4) passe dans un menu en haut à droite (HeaderEauActions), filtré par rôle. MATRICE D\'ACCÈS appliquée à 3 niveaux : gardes EauRoleProtectedRoute sur chaque route (redirection role-aware sans boucle : un client refusé atterrit sur son espace), filtrage de nav (footer + desktop + menu), scoping des données client (compteurs assignés, inchangé). EauPageShell ne rend plus de seconde barre ni de gros en-tête.',
    changes: [
      'PARTAGÉ tailwind.config.js : namespace couleurs `ahuvi` + fontFamily ahuvi-display/ahuvi-body (utilisés uniquement en mode eau)',
      'PARTAGÉ src/index.css : import Google Fonts Playfair Display + Poppins',
      'PARTAGÉ constants/index.ts : GESTION_EAU_NAV_ITEMS (boutons-thèmes + rôles)',
      'PARTAGÉ BottomNav.tsx : branche gestion-eau (items role-filtrés, ≤ 6, thème vert AHUVI actif)',
      'PARTAGÉ Header.tsx : branche isEauModule (fond AHUVI, titre/slogan, nav desktop role-filtrée, HeaderEauActions, bannière/quiz/level masqués)',
      'Nouveau header/HeaderEauActions.tsx : menu secondaire role-filtré (Config, Utilisateurs, Demandes ; Alertes/Annonces/Audit = bientôt ; déconnexion + version)',
      'Nouveaux écrans-thèmes : EauRelevesPage, EauSuiviPage + composant EauTabs (onglets internes)',
      'EauCompteursPage / EauFacturationPage / EauClientPage : onglets internes (Liste/Carte ; Factures/Rapports ; Ma conso/Mes factures)',
      'EauPageShell : suppression de EauNav + du gros en-tête (titre de section discret only)',
      'GestionEauRoutes : routes /releves /suivi /client/:tab + gardes de rôle sur toutes les routes + redirections anciennes routes',
      'EauRoleProtectedRoute : redirection role-aware (home calculé) sans boucle',
    ],
    type: 'minor' as const
  },
  {
    version: '3.18.2',
    date: '2026-06-04',
    description: 'Fix gestion-eau (découvert en validation connectée) : les confirmations utilisaient window.confirm(), NEUTRALISÉ globalement par dialogService (override qui logue un warning et renvoie undefined, sans dialogue cliquable). Conséquence : « Refuser » une demande d\'accès, « Supprimer » un compteur, retirer son propre rôle admin, et confirmer une rupture/relevé aberrant ne déclenchaient JAMAIS l\'action (le if(!confirm) return sortait toujours). Remplacement des 5 window.confirm du module par showConfirm() (modal asynchrone propre de l\'app, dialogUtils). Même piège que v3.16.2.',
    changes: [
      'EauDemandesPage (Refuser), EauCompteursPage (Supprimer), EauUtilisateursPage (retrait auto-admin), EauSaisieCompteurPage (rupture + aberrant) : window.confirm → await showConfirm',
    ],
    type: 'patch' as const
  },
  {
    version: '3.18.1',
    date: '2026-06-04',
    description: 'Fix gestion-eau (découvert en validation connectée) : le GestionEauProvider rechargeait avec un spinner BLOQUANT à chaque bascule online/offline (isOnline dans ses deps) → sur réseau instable (cas Madagascar), les écrans du module se démontaient/remontaient en boucle, faisant flasher l\'UI et PERDRE la saisie en cours (config, période de facturation, formulaires). Désormais le spinner ne s\'affiche qu\'au TOUT PREMIER chargement (initialLoadDoneRef) ; les rechargements suivants (changement de statut réseau ou de session) se font en arrière-plan sans démonter les écrans.',
    changes: [
      'GestionEauContext : load(showSpinner) + initialLoadDoneRef → plus de spinner bloquant sur les rechargements déclenchés par isOnline/login',
    ],
    type: 'patch' as const
  },
  {
    version: '3.18.0',
    date: '2026-06-04',
    description: 'PHASE 2 du module gestion-eau : FACTURATION & CLIENTS. Facturation (admin /gestion-eau/facturation) : choix d\'une période → une facture numérotée par compteur actif (indexDébut = dernier relevé ≤ début, indexFin = dernier relevé ≤ fin, conso = indexFin − indexDébut, montant = conso × tarifM3 en Ariary/MGA) ; numérotation séquentielle via eau_config.numero_facture_seq (F-000001…), statut payé/impayé modifiable, date d\'échéance, relances ; export PDF par facture (en-tête copro + logo, jspdf) + export CSV global (relevés + bilans + factures) ; génération idempotente (skip si déjà facturé sur la période exacte ou aucun relevé exploitable). CONFIG OBLIGATOIRE (décision JOEL) : suppression de TOUS les seuils par défaut — la facturation ET le calcul d\'anomalies sont bloqués (« Configurer d\'abord ») tant que la config n\'est pas complète (dimensions bassin, tarifM3, seuilPct, seuilM3, facteur aberrant, période). Comptes clients (admin /gestion-eau/utilisateurs) : désignation immédiate Administrateur/Releveur (eau_roles), création d\'un compte client (nom, contact, compteurs visibles) → code d\'enrôlement unique généré/affiché. Page mission PUBLIQUE /gestion-eau/accueil (hors garde d\'auth) : présentation, installation PWA (beforeinstallprompt Android/Chrome + instructions iOS), « J\'ai un code » (Google + code → liaison compte client, user_id + actif=true) et « Demander un accès » (Google → eau_demandes_acces en_attente) ; intention mémorisée avant la redirection Google puis traitée au retour par GestionEauProvider. Demandes d\'accès (admin /gestion-eau/demandes) : valider (rôles + compteurs visibles) ou refuser. Espace client (/gestion-eau/client) : conso + factures téléchargeables des SEULS compteurs assignés. Offline-first + sync idempotente inchangées. +19 tests (facturation/montants, numérotation, config complète, filtrage compteurs client, codes d\'enrôlement, CSV) → 40 tests module.',
    changes: [
      'Nouveaux services : eauFactureService, eauCompteClientService, eauDemandeService, eauEnrollmentService (+ fetchUserDirectory dans eauRoleService)',
      'Nouveaux écrans : EauFacturationPage, EauUtilisateursPage, EauDemandesPage, EauClientPage, EauAccueilPage (publique)',
      'Nouveaux utils : facture.ts (calcul ligne + numérotation + complétude config + filtrage), codes.ts, csv.ts, pdf.ts (jspdf), pwa.ts',
      'eauConfigService : suppression des seuils par défaut (anomalies bloquées tant que config incomplète) + isConfigComplete/configMissingFields',
      'PARTAGÉ App.tsx : route publique /gestion-eau/accueil (hors AppLayout/auth)',
      'navConfig + GestionEauRoutes : routes facturation/utilisateurs/demandes/client + GestionEauContext traite l\'enrôlement au retour Google',
    ],
    type: 'minor' as const
  },
  {
    version: '3.17.0',
    date: '2026-06-04',
    description: 'PHASE 1 du module gestion-eau (copropriété : distribution de l\'eau d\'un bassin ~280 m³ vers villas/golf/communs). Socle complet : intégration au Module Switcher (détection étendue /gestion-eau sans casser construction/bazarkely), rôles cumulables admin/releveur/client (bootstrap « premier admin = propriétaire » dans eau_roles) + gardes de route (GestionEauRoute / EauRoleProtectedRoute), navigation interne filtrée par rôle. Écrans : Tableau de bord (stock + % remplissage, entrées/conso du jour, dernier bilan, NRW), Configuration (admin : dimensions bassin, tarif, seuils), Saisie bassin (entrée m³ ; niveau cm → m³ = L×l×(h/100), bloqué si bassin non configuré, déclenche un bilan), Saisie compteur (recherche/liste par zone, conso = index − précédent, rupture si index<, détection aberrant confirmable), CRUD compteurs, Anomalies (liste des bilans + filtre + marquer traitée). Moteur de bilan « par relevé en continu » : stockAttendu = stockPrev + entrées − conso ; anomalie si |écart|>seuilM3 OU écart%>seuilPct ; NRW = (entrées−conso)/entrées. Offline-first : base Dexie DÉDIÉE GestionEauDB (15 stores eau_*, additif — zéro migration sur BazarKELYDB), sync Supabase idempotente (upsert id client, onConflict, jamais getUser()). 21 tests unitaires (conversion/bilan/conso/NRW/aberrant/filtrage rôles).',
    changes: [
      'Nouveau module frontend/src/modules/gestion-eau/ (types, db, services, context, components, utils, tests)',
      'PARTAGÉ App.tsx : montage global de GestionEauProvider',
      'PARTAGÉ components/Layout/AppLayout.tsx : route /gestion-eau/* (GestionEauRoute + GestionEauRoutes)',
      'PARTAGÉ contexts/ModuleSwitcherContext.tsx : module gestion-eau dans DEFAULT_MODULES + détection étendue (moduleIdForPath)',
      'Nouveau SUPABASE-SQL.md (DDL de référence des 15 tables eau_*) + FONCTIONNEMENT-MODULES.md mis à jour',
    ],
    type: 'minor' as const
  },
  {
    version: '3.16.26',
    date: '2026-05-31',
    description: 'POINT 1 : unification du tiroir de détail d\'un prêt entre la page Prêts (Famille) et la page Transactions. Nouveau composant partagé components/Loans/LoanDetailPanel.tsx qui affiche EXACTEMENT le même contenu des deux côtés : bloc Montant (Remboursé + barre de progression + trio "en direct" Capital · Intérêts courus · Total dû), ligne d\'échéance (jauge + compte à rebours + montant à percevoir/à payer), Notes (si présentes), Informations (Catégorie + Devise) et Historique des remboursements. Les boutons d\'action restent propres à chaque page. La page Transactions n\'affiche le panneau que pour un prêt origine (loan/loan_received) ; les remboursements gardent leur affichage spécifique. NB : la ligne "Partage famille" du détail prêt côté Transactions est retirée (non présente côté Famille) pour un rendu identique.',
    changes: [
      'Nouveau components/Loans/LoanDetailPanel.tsx (panneau de détail commun)',
      'LoansPage.tsx : corps du détail remplacé par <LoanDetailPanel> ; imports LoanLiveTrio/RepaymentHistorySection retirés',
      'TransactionsPage.tsx : <LoanDetailPanel> pour les prêts origine ; anciens blocs Montant/Notes/Informations masqués pour ces prêts',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.25',
    date: '2026-05-31',
    description: 'HOTFIX v3.16.24 : la page de modification d\'une transaction (TransactionDetailPage) plantait (ReferenceError: setDurationMonths is not defined) à cause d\'un appel orphelin setDurationMonths(\'\') resté dans un useEffect de réinitialisation après le retrait de l\'état durationMonths. Remplacé par setDueDateInput(\'\'). À noter : `npm run build` (vite/esbuild) ne fait PAS de contrôle de types strict — le garde-fou est `npx tsc --noEmit`, désormais lancé avant déploiement.',
    changes: [
      'TransactionDetailPage.tsx : setDurationMonths → setDueDateInput dans le useEffect de reset des champs prêt',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.24',
    date: '2026-05-31',
    description: 'Refonte de la saisie des termes d\'un prêt (création + modification). (POINT 2) L\'échéance se saisit désormais en DATE directe (sélecteur de date) au lieu d\'un nombre de mois — plus naturel entre proches ; la durée équivalente (an/mois/jour) s\'affiche sous le champ. (POINT 3) L\'intérêt se saisit au choix en MONTANT (Ar) ou en %, et "par jour" ou "sur toute la durée", via 2 toggles (défaut : Ar · sur la durée à la création) ; la valeur est convertie en taux JOURNALIER stocké (le moteur ne change pas), avec affichage en direct de l\'équivalent "% / jour". Briques partagées : services/loanTerms.ts (conversion, 10 tests) + components/Loans/LoanTermsFields.tsx (UI commune aux 2 pages). loanService : updateLoanInterestRate → updateLoanTerms (taux + date d\'échéance). En modification, le champ est pré-rempli avec le taux journalier effectif (toggles % · par jour) et la date d\'échéance du prêt.',
    changes: [
      'Nouveau services/loanTerms.ts (computeDailyRatePct/daysBetweenDates/formatDurationLabel) + 10 tests',
      'Nouveau components/Loans/LoanTermsFields.tsx (date d\'échéance + intérêt avec 2 toggles + équivalent %/jour)',
      'AddTransactionPage.tsx + TransactionDetailPage.tsx : remplacement des champs taux+durée par LoanTermsFields ; conversion au submit',
      'loanService.ts : updateLoanTerms(id, dailyRate, dueDate?) remplace updateLoanInterestRate',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.23',
    date: '2026-05-31',
    description: 'Épuration du tiroir de détail (page Transactions). (1) Suppression de l\'en-tête "Details transaction" + bouton X (le clic sur la carte ouvre/ferme déjà le tiroir). (2) Suppression de la marge supérieure du tiroir (retrait de space-y-2 du wrapper de carte) → le tiroir est collé à la carte. (3) Retrait des ":" après "Échéance" et "À percevoir/À payer". (4) Ligne d\'échéance alignée par le bas (items-center → items-end) : la jauge, la date et le montant partagent la même ligne de base inférieure.',
    changes: [
      'TransactionsPage.tsx : en-tête du tiroir supprimé ; wrapper de carte sans space-y-2 ; ligne échéance sans ":" et items-end',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.22',
    date: '2026-05-31',
    description: 'Correctif important + mise en page. (1) BUG : la page Transactions se rechargeait une 2e fois quelques secondes après l\'ouverture (l\'effet de chargement dépendait de l\'OBJET user ; après rafraîchissement de session, setUser renvoie un nouvel objet de même ID → relance + setIsLoading → la carte dépliée perdait sa position). Corrigé en dépendant de user?.id (ID stable), comme le Dashboard. La carte ouverte conserve désormais sa position. (2) Ligne d\'échéance du détail prêt : marge supérieure x1,5 (mt-2 → mt-3) ; "Échéance :" et la date empilés verticalement à gauche ; "À percevoir/À payer :" et le montant empilés à droite (justifiés à droite).',
    changes: [
      'TransactionsPage.tsx : dépendance de l\'effet de chargement passée de [user, pathname] à [user?.id, pathname] (anti rechargement intempestif)',
      'TransactionsPage.tsx : ligne échéance empilée (label au-dessus de la valeur, gauche/droite) + marge supérieure mt-3',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.21',
    date: '2026-05-31',
    description: 'Détail prêt (page Transactions) : insertion entre la date d\'échéance et le montant "à percevoir" d\'une jauge horizontale fine et moderne du temps restant, avec compte à rebours "en direct" au format "12J, 3h22mn12s" (rafraîchi chaque seconde). La barre se remplit à l\'approche de l\'échéance et change de couleur selon l\'urgence (vert → ambre → rouge ; rouge plein + "Échéance dépassée" si dépassée). Marge supérieure de la ligne d\'échéance doublée (mt-1 → mt-2).',
    changes: [
      'Nouveau components/Loans/LoanDueCountdown.tsx : jauge + compte à rebours seconde par seconde, couleur selon urgence',
      'TransactionsPage.tsx : jauge insérée dans la ligne d\'échéance + marge supérieure x2',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.20',
    date: '2026-05-31',
    description: 'Peaufinage mise en page du trio prêt. (1) Le taux journalier (ex: "0,017%/j") est désormais accolé au libellé "⏱️ Intérêts courus" du trio. (2) La ligne de légende séparée "Intérêts en temps réel · X% / jour" sous le trio est supprimée (info désormais dans le libellé). (3) Inter-ligne réduit (mt-1 → mt-0) entre le titre "Montant" et son contenu, sur les pages Prêts et Transactions.',
    changes: [
      'LoanLiveTrio.tsx : taux intégré au libellé "Intérêts courus", suppression de la légende sous le trio',
      'TransactionsPage.tsx + LoansPage.tsx : bloc "Montant" resserré (mt-1 → mt-0)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.19',
    date: '2026-05-31',
    description: '4 ajustements prêts. (1) Le champ "Taux d\'intérêt" de l\'écran de modification met désormais à jour le VRAI taux du prêt (nouvelle fonction loanService.updateLoanInterestRate qui écrit interest_rate + force interest_frequency="daily", offline-first) ; avant, il n\'allait que dans une note texte sans effet sur le calcul. Le champ est pré-rempli avec le taux journalier effectif du prêt et son libellé passe en "% / jour". (2) Le bloc "Notes" du détail Transactions est masqué quand il n\'y a aucune note (épure). (3) L\'icône ⏱️ est déplacée du bas de carte vers le libellé "Intérêts courus" du trio (composant partagé LoanLiveTrio). (4) Sous l\'échéance (page Transactions), ajout à droite du montant total à percevoir/à payer à la date d\'échéance (capital + intérêts capitalisés à cette date, calculé par le moteur).',
    changes: [
      'loanService.ts : nouvelle updateLoanInterestRate(id, dailyRate) — interest_rate + interest_frequency="daily", Dexie+Supabase+queue',
      'TransactionDetailPage.tsx : champ taux pré-rempli depuis la fiche prêt, libellé "% / jour", persistance du taux à l\'enregistrement',
      'TransactionsPage.tsx : bloc Notes masqué si vide + ligne échéance avec "À percevoir/À payer : montant à l\'échéance"',
      'LoanLiveTrio.tsx : icône ⏱️ déplacée sur le libellé "Intérêts courus"',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.18',
    date: '2026-05-31',
    description: 'Nettoyage notes prêt + échéance. (1) La note texte "Taux: X%" (mémo figé écrit à la création/édition, devenu trompeur face au vrai taux journalier du trio) n\'est plus générée à l\'édition (TransactionDetailPage) et est masquée à l\'affichage des prêts existants (segment "Taux:" filtré dans les notes du tiroir Transactions). On conserve "Durée: X mois". (2) La date d\'échéance est désormais affichée sous le trio dans le détail d\'un prêt sur la page Transactions (était absente alors qu\'elle figure sur la page Prêts).',
    changes: [
      'TransactionDetailPage.tsx : suppression de la génération de la note "Taux: …%" (conserve "Durée: … mois")',
      'TransactionsPage.tsx : filtre du segment "Taux:" à l\'affichage des notes + ligne "Échéance : JJ/MM/AAAA" sous le trio',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.17',
    date: '2026-05-31',
    description: 'Suite Étape B. (1) Nouveau composant partagé LoanLiveTrio qui recalcule le trio Capital · Intérêts courus · Total dû CHAQUE SECONDE (les intérêts montent visiblement) + légende "⏱️ Intérêts en temps réel · X% / jour". Avant, ces valeurs étaient calculées une seule fois au chargement (figées) sur la page Prêts → corrigé. (2) La page Transactions (détail dépliable d\'une transaction de prêt) affiche désormais EXACTEMENT le même trio que la page Prêts : elle charge le vrai prêt via getLoanById et utilise LoanLiveTrio, au lieu de l\'ancien affichage (taux brut tiré des notes, "Restant" = capital seul sans intérêts). Le taux affiché (% / jour effectif) est donc cohérent entre les deux pages. Montants en notation fr-FR (virgule = décimale) : intérêts/total affichés avec 3 décimales pour rendre la progression visible à la seconde.',
    changes: [
      'Nouveau components/Loans/LoanLiveTrio.tsx : trio recalculé chaque seconde (setInterval 1s) tant que le taux > 0',
      'LoansPage.tsx : trio statique remplacé par <LoanLiveTrio> (ticking)',
      'TransactionsPage.tsx : chargement du prêt complet (getLoanById) dans le tiroir + <LoanLiveTrio> identique à la page Prêts ; "Restant" capital-seul remplacé',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.16',
    date: '2026-05-31',
    description: 'Nouveau modèle d\'intérêts — ÉTAPE B : propagation du calcul "en direct" à toute l\'app. Le moteur loanInterest devient la source de vérité unique via computeLoanDetails (loanService) : remainingBalance = total dû (capital + intérêts courus), totalInterestPaid et la répartition intérêts/capital de chaque remboursement sont RECALCULÉS "intérêts d\'abord", et le statut "soldé" est piloté par le moteur (capital + intérêts ≈ 0). Conversion automatique des ANCIENS taux selon leur fréquence d\'origine : un taux "monthly" est divisé par 30 (→ taux journalier correct), "weekly" par 7, "daily" gardé tel quel — donc aucun besoin de migration SQL. Page Prêts : le bloc "Restant" affiche le trio Capital · Intérêts courus · Total dû côte à côte ; "Taux" affiché en % / jour effectif. Ancien système d\'"intérêts dus" par périodes mensuelles RETIRÉ (bannière de la page Prêts + bannière de la fenêtre de remboursement, désormais basée sur les intérêts courus). Le write-path des remboursements est inchangé (id/montant/date) : la répartition est recalculée à l\'affichage, donc toujours correcte y compris rétroactivement.',
    changes: [
      'loanInterest.ts : conversion du taux selon interestFrequency (÷30 mensuel, ÷7 hebdo) + sortie totalInterestPaid/totalCapitalPaid + allocations par remboursement (12 tests au total)',
      'loanService.computeLoanDetails : branché sur le moteur (remainingBalance = total dû, statut soldé piloté, liveCapital/liveAccruedInterest/liveTotalOwed/liveDailyRatePct/liveAllocations)',
      'types/loans.ts : LoanWithDetails enrichi des champs live*',
      'LoansPage.tsx : trio Capital·Intérêts·Total dû, taux en %/jour, suppression de l\'ancien indicateur "intérêts dus" (bannière + bloc)',
      'PaymentModal.tsx : bannière "Intérêts courus" basée sur le calcul en direct (prop accruedInterest) au lieu des périodes',
      'RepaymentHistorySection.tsx : part intérêts/capital recalculée par le moteur',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.15',
    date: '2026-05-31',
    description: 'Nouveau modèle d\'intérêts de prêt — ÉTAPE A (moteur + affichage Dashboard, sans toucher au reste de l\'app). Le taux saisi devient JOURNALIER (% / jour). Intérêt simple qui s\'accumule en continu (recalcul à la seconde) sur le capital restant, à partir de la date du prêt. Un remboursement paie d\'abord les intérêts dus, le reste réduit le capital. À la date d\'échéance, les intérêts accumulés sont capitalisés UNE FOIS (ajoutés au capital), puis l\'intérêt repart simple sur la nouvelle base ; sans échéance, pas de capitalisation. Tout est recalculé à la volée depuis le capital initial + les remboursements (aucune écriture en base, les anciennes répartitions sont ignorées). La carte "Prêts actifs" du Dashboard affiche en direct : GAINS (prêts accordés) et COÛTS (prêts reçus) séparés, avec intérêts courus + gain par minute/heure/jour/mois (mois = nb réel de jours du mois courant). ÉTAPE B à venir : propager ce calcul partout (détail du prêt, total dû, listes) + remboursements "intérêts d\'abord" persistés.',
    changes: [
      'Nouveau (services/loanInterest.ts) : moteur pur computeLoanLiveState() + sumLoanLiveStates() — couvert par 7 tests (services/__tests__/loanInterest.test.ts)',
      'DashboardPage.tsx : chargement des prêts reçus (borrowedLoans), tick 1s, carte "Prêts actifs" enrichie (gains verts / coûts rouges, lignes par minute/heure/jour/mois)',
      'AddTransactionPage.tsx : libellé "Taux d\'intérêt % / jour" + interest_frequency stocké en "daily" (prêt accordé et reçu)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.14',
    date: '2026-05-31',
    description: 'Suite de v3.16.13. La fenêtre de sélection de contacts est imposée par Chrome (Contact Picker API) : impossible de la remplacer par l\'appli Contacts native ni de la restyler (règle de confidentialité du navigateur). Elle affiche un compteur "1 sélectionné" plutôt que le nom, ce qui déroutait. Côté app, ajout d\'une confirmation visible APRÈS validation : ligne verte "✓ Contact retenu : Nom · Numéro" sous le champ + toast immédiat. L\'astuce indique désormais la marche à suivre dans la fenêtre Chrome (cocher un nom puis "Ajouter"). La confirmation se met à jour après le choix du numéro (contact multi-numéros), s\'efface si l\'utilisateur retape le nom à la main, et est réinitialisée après création.',
    changes: [
      'AddTransactionPage.tsx : état contactConfirm {name, phone} + ligne verte de confirmation (CheckCircle2) sous le champ bénéficiaire/prêteur',
      'AddTransactionPage.tsx : toast.success immédiat à la sélection + à la confirmation du numéro',
      'AddTransactionPage.tsx : astuce élargie expliquant la fenêtre Chrome (cocher + Ajouter)',
      'AddTransactionPage.tsx : contactConfirm effacé à la saisie clavier manuelle, mis à jour au choix du numéro, réinitialisé après succès',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.13',
    date: '2026-05-31',
    description: 'Création de prêt (AddTransactionPage, catégories "prêt accordé" et "prêt reçu") : une icône répertoire ðŸ“‡ apparaît à droite du champ Bénéficiaire/Prêteur sur les appareils qui supportent l\'API Contact Picker (Chrome/Edge Android, HTTPS). Le clic ouvre le sélecteur de contacts natif d\'Android et remplit automatiquement le nom + le téléphone. Si le contact a plusieurs numéros, une petite fenêtre "Quel numéro ?" laisse choisir. Sur iOS/desktop (API absente), aucune icône : saisie clavier classique préservée (l\'autocomplétion des bénéficiaires connus reste intacte). Le téléphone du prêt accordé est désormais aussi CONSERVÉ dans la fiche (auparavant perdu après le lien WhatsApp). Un champ téléphone est ajouté au prêt reçu (numéro du prêteur rangé dans borrower_phone, inutilisé pour ce type ; bouton WhatsApp prêteur à venir).',
    changes: [
      'AddTransactionPage.tsx : détection supportsContactPicker (navigator.contacts + ContactsManager) au niveau module',
      'AddTransactionPage.tsx : handlePickContact() → navigator.contacts.select([name, tel]) + applyContactName() (réplique l\'auto-libellé) + fenêtre de choix du numéro si plusieurs',
      'AddTransactionPage.tsx : bouton icône BookUser à droite du champ beneficiaryName (affiché si supportsContactPicker), champ toujours tapable au clavier',
      'AddTransactionPage.tsx : champ "Téléphone du prêteur" ajouté pour la catégorie loan_received',
      'AddTransactionPage.tsx : borrower_phone = borrowerPhone.trim() à l\'INSERT (prêt accordé ET prêt reçu) — le numéro est désormais persisté',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.12',
    date: '2026-05-31',
    description: 'Suite de v3.16.11. Les pages à structure "carte titre flottante" (Paramètres, Version de l\'app, Préférences notifications, Quiz, Résultats quiz, Instructions PWA, Profil) utilisaient py-8 (32px) en haut → ~40px d\'espace sous l\'en-tête une fois le pt-2 global ajouté, soit beaucoup plus que les 8px des autres pages. Marge haute retirée (py-8 → pb-8, ou root py-8 → pb-8), l\'écart de 8px venant désormais de <main>. Les pages à bandeau coloré pleine largeur (Recommandations, Révision budgets) gardaient un mince filet gris de 8px au-dessus de leur bandeau (à cause du pt-2 global) → recollées sous l\'en-tête via -mt-2',
    changes: [
      'pages (Settings, AppVersion, NotificationPreferences, Quiz, QuizResults, PWAInstructions) : conteneur max-w-4xl mx-auto px-4 py-8 → px-4 pb-8',
      'ProfileCompletionPage.tsx : conteneur racine min-h-screen bg-gray-50 py-8 → pb-8',
      'RecommendationsPage.tsx / BudgetReviewPage.tsx : bandeau d\'en-tête bg-gradient-to-r ... text-white → +(-mt-2) pour rester collé sous l\'en-tête malgré le pt-2 global',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.11',
    date: '2026-05-31',
    description: 'Généralisation à toutes les pages du comportement validé en v3.16.10 sur la page Détail/Modifier transaction. Deux réglages centraux (components/Layout) plutôt que ~18 retouches dispersées : (1) nouveau composant ScrollToTop qui remonte la fenêtre en haut à chaque ouverture de page (navigation PUSH), pour qu\'aucune page ne s\'ouvre "au milieu" en venant d\'une liste défilée ; (2) marge pt-2 (8px) posée une seule fois sur <main> dans AppLayout → écart identique sous l\'en-tête pour toutes les pages. Le pt-2 local de TransactionDetailPage est retiré (l\'écart vient désormais de <main>, sinon doublon à 16px)',
    changes: [
      'Nouveau (components/Layout/ScrollToTop.tsx) : window.scrollTo(0,0) sur changement de pathname, ignoré en navigation POP (retour/avance) et quand location.state.scrollToTransactionId est présent (préserve le défilement-vers-carte au retour sur /transactions)',
      'AppLayout.tsx : montage de <ScrollToTop /> + ajout de pt-2 sur <main> (flex-1 pb-20 pt-2 ...)',
      'TransactionDetailPage.tsx : conteneur racine pt-2 → (rien), l\'écart de 8px étant désormais fourni par <main>',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.10',
    date: '2026-05-31',
    description: 'Page Détail/Modifier d\'une transaction (pages/TransactionDetailPage.tsx) : le bandeau titre blanc ("Modifier la transaction") était séparé de l\'en-tête par un grand espace vide. Cause : marge haute pt-20 (80px) héritée d\'une époque où l\'en-tête était fixed (hors flux) ; or l\'en-tête est désormais sticky (dans le flux, occupe déjà sa place), donc cette marge faisait double emploi. Réduite à pt-2 (8px) pour caler le bandeau juste sous l\'en-tête, écart cohérent avec l\'alignement des cartes',
    changes: [
      'Fix (TransactionDetailPage.tsx) : conteneur racine pt-20 → pt-2',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.9',
    date: '2026-05-31',
    description: 'Au clic sur une carte de transaction (pages/TransactionsPage.tsx), le recalage du haut de la carte sous l\'en-tête se faisait en deux défilements natifs successifs (glissement + correction à 450ms) → mouvement saccadé. Remplacé par une seule animation maison (requestAnimationFrame + courbe ease-in-out cubic) qui accélère puis ralentit en douceur façon iOS. La cible est recalculée à chaque image → auto-correction continue si la hauteur du dessus de l\'écran change pendant l\'animation (message de l\'en-tête, barre d\'adresse mobile, détail qui se déplie), sans saut ni recalage visible. Respecte prefers-reduced-motion',
    changes: [
      'Refactor (TransactionsPage.tsx toggleTransactionDrawer) : double scrollBy natif (smooth + correction setTimeout 450ms) remplacé par une boucle requestAnimationFrame de 500ms (easeInOutCubic) recalculant getTargetY à chaque frame, avec fenêtre de grâce 250ms pour suivre une bascule tardive. Court-circuit si prefers-reduced-motion (scroll instantané) ou si déjà aligné (<2px)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.8',
    date: '2026-05-31',
    description: 'Au clic sur une carte de transaction (pages/TransactionsPage.tsx), le défilement qui amène le haut de la carte juste sous l\'en-tête partait parfois trop haut (la carte passait derrière l\'en-tête). Cause : la position cible était mesurée une seule fois 50ms après le clic, mais la hauteur du dessus de l\'écran pouvait encore changer pendant l\'animation (message de l\'en-tête mobile qui tourne, barre d\'adresse du navigateur mobile qui se replie, détail qui finit de se déplier) → cible figée invalidée. Correctif : mesure après stabilisation de la mise en page (double requestAnimationFrame) + correction finale après l\'animation pour rattraper tout décalage résiduel',
    changes: [
      'Fix (TransactionsPage.tsx toggleTransactionDrawer) : remplacement du setTimeout(50)+scrollBy unique par un double requestAnimationFrame puis alignCardTop, avec une passe de correction à 450ms (seuil 2px pour éviter tout micro-rebond). Effets de bord sortis du updater setSelectedTransactionId (willOpen calculé en amont)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.7',
    date: '2026-05-31',
    description: 'Détail de transaction déplié (pages/TransactionsPage.tsx) : pour une opération simple (non prêt), les blocs "Partage famille" et "Remboursement" étaient empilés verticalement. Ils sont désormais sur une même ligne (flex, deux colonnes égales). Quand l\'opération n\'est pas partagée, le bloc "Partage famille" occupe seul la pleine largeur',
    changes: [
      'UI (TransactionsPage.tsx grille détail) : "Partage famille" et "Remboursement" regroupés dans un conteneur flex gap-2, chaque bloc en flex-1. Condition Remboursement passée de (isShared && !isLoanCategory) à (isShared) imbriqué dans le bloc !isLoanCategory parent',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.6',
    date: '2026-05-31',
    description: 'Page Réglages › Version (pages/AppVersionPage.tsx) : deux entrées d\'historique portaient le même numéro 2.5.0 → warning React "two children with the same key" et les deux cartes s\'ouvraient/fermaient ensemble. Correctif : la clé React et l\'identité d\'expansion utilisent désormais l\'index dans la liste (Set<number>) au lieu du numéro de version. Aucune donnée d\'historique modifiée',
    changes: [
      'Fix (AppVersionPage.tsx) : expandedVersions Set<string> → Set<number> ; toggleVersionExpansion(index) ; key={`${version}-${index}`} ; isExpanded via index',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.5',
    date: '2026-05-31',
    description: 'Carte de transaction (pages/TransactionsPage.tsx) : le nom du compte est déplacé dans l\'en-tête, à côté de la catégorie (place libérée par le retrait de la date en v3.16.4). Le champ "Compte" du détail est retiré (redondant). Pour une opération simple, la grille de détail n\'est plus affichée du tout (montant + catégorie + compte sont sur la carte) ; elle reste pour les prêts/remboursements (barre de progression / lien dette)',
    changes: [
      'UI (TransactionsPage.tsx en-tête) : ajout du nom du compte (accountName via repaymentAccounts) après la catégorie, masqué si introuvable (jamais d\'UUID brut)',
      'UI (TransactionsPage.tsx grille détail) : grille entière conditionnée à isLoanCategory ; bloc Compte supprimé. Détail d\'une opération simple = Notes + Partage famille + Remboursement uniquement',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.4',
    date: '2026-05-31',
    description: 'Détail de transaction déplié (pages/TransactionsPage.tsx) : le champ "Montant" répétait le montant déjà affiché sur la carte pour les opérations simples. Il est désormais réservé aux prêts/remboursements (où il porte la barre de progression / le lien dette). Pour une opération simple, le détail n\'affiche plus que le "Compte" (passé en pleine largeur). Montant et Compte étant mutuellement exclusifs (isLoanCategory), la grille reste équilibrée',
    changes: [
      'UI (TransactionsPage.tsx grille détail) : bloc Montant conditionné à isLoanCategory ; bloc Compte passé en col-span-2 (seul champ pour les opérations simples)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.3',
    date: '2026-05-30',
    description: 'Suppression de transaction : la fenêtre de confirmation propose désormais 2 actions — "Supprimer" (retire l\'opération sans toucher au solde) et "Restituer" (retire l\'opération ET rend son montant au compte). Découverte au passage : updateAccountBalancePublic/updateAccountBalance était une coquille vide (no-op) → la page détail croyait restituer le solde mais ne le faisait pas. La restitution passe maintenant par la vraie mise à jour (updateAccountBalanceAfterTransaction)',
    changes: [
      'Nouveau composant (components/UI/DeleteRestoreDialog.tsx) + helper (utils/dialogUtils.ts showDeleteRestoreDialog) : fenêtre à 3 boutons Annuler / Supprimer / Restituer, avec texte explicatif des deux actions. "Restituer" mis en avant (vert)',
      'Refonte (services/transactionService.ts deleteTransaction) : nouveau paramètre options { restoreBalance } ; quand true, restitue le solde via updateAccountBalanceAfterTransaction(accountId, -amount). Gestion centralisée de la paire de transfert (suppression + restitution des 2 comptes via rappel récursif _skipPairHandling). Comportement par défaut (restoreBalance=false) inchangé',
      'pages/TransactionsPage.tsx : handleDeleteTransaction utilise showDeleteRestoreDialog ; rechargement de la liste après suppression d\'un transfert (la ligne jumelle disparaît aussi)',
      'pages/TransactionDetailPage.tsx : ancienne fenêtre inline 2 boutons remplacée par showDeleteRestoreDialog ; handleDelete(restoreBalance) délègue à deleteTransaction ; suppression du code mort (handleSingleTransactionDeletion, logique de paire dupliquée, appels no-op updateAccountBalancePublic, états showDeleteConfirm/isDeleting)',
      'UI (pages/TransactionsPage.tsx carte + détail déplié) : suppression des informations redondantes. La date n\'apparaît plus qu\'une fois (à droite) et affiche désormais la date de l\'OPÉRATION (transaction.date) au lieu de createdAt. Catégorie affichée une seule fois (en-tête). Champ "Compte" du détail : affiche le nom du compte (repaymentAccounts) au lieu de l\'UUID brut. Grille détail réduite à Montant + Compte',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.2',
    date: '2026-05-30',
    description: 'Fix suppression impossible sur la page Transactions : le bouton "Supprimer" appelait window.confirm(), neutralisé par dialogService (override qui logue un warning et ne montre pas de dialogue cliquable) → la confirmation ne s\'affichait pas → aucune suppression possible. Bloquait le nettoyage manuel des doublons existants (RAISSA, Taxi, prêts, etc.)',
    changes: [
      'Fix (pages/TransactionsPage.tsx handleDeleteTransaction) : remplacement de window.confirm() par showConfirm() async de utils/dialogUtils (variant danger, boutons Supprimer/Annuler), même pattern que GoalsPage. Ajout de l\'import showConfirm',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.1',
    date: '2026-05-30',
    description: 'Fix doublons en synchronisation : un enregistrement créé sous mauvais réseau apparaissait 2-3 fois (RAISSA ×3). Cause = l\'envoi direct (timeout 5s mais commit serveur réel) puis le rejeu de la file ré-inséraient avec des id serveur différents. Correctif : conserver l\'id client des deux côtés + upsert idempotent (onConflict id) sur tous les chemins offline-first/mis en file',
    changes: [
      'Fix (services/syncManager.ts) : les 14 branches CREATE de processXxxOperation ne retirent plus l\'id client et passent de .insert() à .upsert(data, { onConflict: \'id\', ignoreDuplicates: true }). Tables : transactions, accounts, budgets, goals, fee_configurations, personal_loans, loan_repayments, loan_interest_periods, reimbursement_requests, family_shared_transactions, family_sharing_rules, family_shared_recurring_transactions, family_members. L\'id était déjà présent dans data (queueSyncOperation merge { id, ...data }) mais était jeté au rejeu',
      'Fix (services/apiService.ts) : createTransaction/createAccount/createBudget/createGoal passent de .insert() à .upsert({...}, { onConflict: \'id\' }).select().single() — l\'envoi direct online devient idempotent',
      'Fix (services/transactionService.ts, accountService.ts, budgetService.ts, goalService.ts) : le payload de l\'envoi direct online inclut désormais l\'id local (id transaction/compte ; mappers budget/goal enrichis). Avant, l\'id n\'était pas transmis → le serveur en générait un aléatoire → impossible de dédupliquer un envoi déjà passé',
      'Fix (services/loanService.ts) : createLoan (personal_loans), recordPayment (loan_repayments), generateInterestPeriod (loan_interest_periods) passent en upsert onConflict id (les helpers loanToRow/repaymentToRow/interestPeriodToRow incluaient déjà l\'id)',
      'Fix (services/familySharingService.ts) : shareTransaction (family_shared_transactions), pushReimbursementInsert (reimbursement_requests), upsertSharingRule CREATE (family_sharing_rules), shareRecurringTransaction (family_shared_recurring_transactions) passent en upsert onConflict id',
      'Hors périmètre (chemins purement en ligne, sans file ni id client, non concernés par le double-envoi) : familyGroupService.createFamilyGroup + joinFamilyGroup (family_groups/family_members, id serveur), reimbursementService.createReimbursementRequest et reimbursement_payments/allocations/member_credit_balance (opérations synchrones online-only)',
      'À FAIRE en session séparée (validé avec JOEL) : nettoyage des doublons déjà présents en base + IndexedDB (RAISSA ×3, Taxi ×2, etc.) et recalcul des soldes faussés. Le présent correctif empêche seulement la création de NOUVEAUX doublons',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.0',
    date: '2026-05-18',
    description: 'S73 Bloc 3 — updateSharedTransaction offline-first complet (cascade reimbursement_requests + tous champs) + correction bug décoche en ligne + icône CloudOff TransactionDetailPage',
    changes: [
      'Refonte (services/familySharingService.ts updateSharedTransaction) : ~440 lignes online-only (6 round-trips Supabase, supabase.auth.getUser() bloquant offline) remplacées par ~100 lignes offline-first SWR. Lecture ownership depuis Dexie (familySharedTransactions.get), UPDATE local immédiat, cascade complète reimbursement_requests via Dexie, push Supabase si online sinon queue syncManager (4 nouveaux helpers : applyReimbursementUpsertCascade, applyReimbursementRemovalCascade, pushFstUpdate, pushReimbursementInsert/Update/Delete)',
      'Cascade reimbursement (Q5/Q6 OUI) : recalcul automatique du montant de la demande de remboursement à chaque changement de hasReimbursementRequest, customReimbursementRate, splitType ou splitDetails. Logique de calcul reproduite côté client : rate effectif (custom > localStorage groupe > 100%), montant selon splitType (paid_by_one = total × rate, autres = splitDetails[debtor].amount × rate)',
      'Lookup créancier/débiteur depuis cache Dexie familyMembers (v15, S71) : index composite [familyGroupId+userId] pour le payeur (créancier), filter sur isActive pour exclure les membres partis. Snapshots dénormalisés (fromMemberName, toMemberName, fromMemberUserId, toMemberUserId) écrits directement dans ReimbursementRequestLocal pour les vérifications offline',
      'Correction bug en ligne (Q2 NON) : décocher hasReimbursementRequest supprime maintenant la demande de remboursement partout (Dexie + Supabase). Avant, la demande restait orpheline en base avec seul l\'indicateur basculé. Q7 C : si la demande a déjà des paiements liés (reimbursement_payments), elle passe en status=cancelled au lieu de DELETE pour préserver l\'historique. Détection des paiements via SELECT online, dégradation safe = cancel en offline (pas de cache reimbursement_payments en S73)',
      'Périmètre étendu Q3 A : isPrivate, splitType, splitDetails passent aussi en offline-first dans la même refonte. RPC update_reimbursement_request conservée en ligne (bypass RLS pour la bascule du flag), UPDATE direct via syncManager au retour online',
      'Nettoyage (pages/TransactionDetailPage.tsx) : suppression de 2 workarounds setTimeout(500ms) + UPDATE direct supabase.reimbursement_requests.amount (lignes 530-557 après shareTransaction, lignes 576-610 après updateSharedTransaction). Le service S73 calcule et écrit le montant correct directement, plus besoin de patch',
      'Ajout (pages/TransactionDetailPage.tsx) : icône CloudOff orange à côté du label "Demander remboursement" tant qu\'une opération sync (family_shared_transactions ou reimbursement_requests) reste en queue pending/failed pour cette transaction. useEffect polling 5s comme LoansPage. Toast jaune "Remboursement sera créé à la prochaine connexion" quand on coche hors ligne (Q1 C, Q8 C : toast + icône persistante)',
      'Imports : ReimbursementRequestLocal depuis types/reimbursement.ts ajouté au service. CloudOff depuis lucide-react ajouté à la page',
      'Risques acceptés Q10 S72 : si un membre quitte le groupe entre l\'enregistrement local et la synchro, le serveur peut rejeter (retry syncManager puis échec). Si la RLS Supabase bloque l\'UPDATE direct rejoué par le syncManager (sans la RPC), il faudra ajouter une policy SQL côté serveur — à valider en prod',
    ],
    type: 'minor' as const
  },
  {
    version: '3.15.0',
    date: '2026-05-17',
    description: 'S72 — Module Family Sharing offline-first phase 1 (lectures SWR + mutations queue-able + leaveFamilyGroup) + BudgetsPage createBudget via budgetService',
    changes: [
      'Dexie v16 (lib/database.ts): 3 nouvelles tables locales — familySharedTransactions (avec snapshots dénormalisés transactionDescription/Amount/Category/Date/Type), familySharingRules, familySharedRecurring. Index composites pour les filtres usuels ([familyGroupId+sharedAt], [familyGroupId+userId+category], [familyGroupId+recurringTransactionId]). Migration upgrade vide',
      'Nouveau fichier (types/familyLocal.ts): FamilySharedTransactionLocal + FamilySharingRuleLocal + FamilySharedRecurringLocal — sources uniques des interfaces Dexie',
      'Refactor (services/familySharingService.ts): 5 lectures critiques passent en stale-while-revalidate (IndexedDB d\'abord, refresh Supabase fire-and-forget). getFamilySharedTransactions (filter par familyGroupId + options en mémoire), getUserSharingRules ([familyGroupId+userId]), getSharedTransactionByTransactionId (par transactionId), getSharedRecurringTransactions, shouldAutoShare ([familyGroupId+userId+category])',
      'Refactor (services/familySharingService.ts): 6 mutations offline-first — shareTransaction (UUID client + INSERT Dexie + snapshots de transaction lus depuis Dexie + queue ou Supabase), unshareTransaction (cascade DELETE des reimbursement_requests liés via queue + DELETE shared_transaction), upsertSharingRule (UPDATE local si règle existe sinon INSERT), deleteSharingRule, shareRecurringTransaction (vérif ownership Dexie + INSERT local), unshareRecurringTransaction',
      'Refactor (services/familyGroupService.ts): leaveFamilyGroup offline-first — vérification "dernier admin" depuis cache local familyMembers, soft delete local (is_active=false) + queue UPDATE family_members. createFamilyGroup et joinFamilyGroup conservent un message clair "nécessite connexion Internet" (génération de code d\'invitation + validation côté serveur)',
      'Extend (services/syncManager.ts): switch table_name étendu avec 4 nouveaux cases — family_shared_transactions, family_sharing_rules, family_shared_recurring_transactions, family_members (INSERT/UPDATE/DELETE classiques)',
      'Type extension (types/index.ts): SyncOperation.table_name accepte désormais les 4 nouvelles tables famille',
      'Fix (pages/BudgetsPage.tsx): les 3 emplacements qui créaient des budgets directement via apiService.createBudget (online-only) passent maintenant par budgetService.createBudget (offline-first avec queue). Concerne handleCreateIntelligentBudgets (suggestions auto), handleSaveCustomizedBudgets (suggestions personnalisées) et handleSaveNewBudget (création manuelle). En offline, le budget est créé en local et envoyé au serveur dès le retour de connexion sans saisie utilisateur',
      'Architecture: tous les services métier (loans, family sharing, family group, reimbursement, account, goal, transaction, budget, recurring) utilisent désormais le même pattern offline-first SWR + queue. Le module Famille est désormais utilisable hors connexion (consultation des dépenses partagées, règles automatiques, partages récurrents) sauf création/jointure de groupe (code d\'invitation serveur) et activation de demande de remboursement complexe (cascade reportée S73 Bloc 3)',
      'Reste à faire (S73 Bloc 3) : updateSharedTransaction cascade hasReimbursementRequest offline-first complète (logique RPC reproduite côté client) — reporté pour gérer la complexité dans une session dédiée',
    ],
    type: 'minor' as const
  },
  {
    version: '3.14.6',
    date: '2026-05-16',
    description: 'P1#2 — table Dexie family_members + helper verifyMembership + getFamilyGroupMembers SWR offline-first + 5 lectures familySharingService early-return offline + SW update skip-offline',
    changes: [
      'Dexie v15 (lib/database.ts): nouvelle table `familyMembers` avec index composite `[familyGroupId+userId]` et `[familyGroupId+isActive]`. Migration upgrade vide — peuplée au premier appel online de getFamilyGroupMembers',
      'Helper (services/familyGroupService.ts): `verifyMembership(familyGroupId, userId)` exporté — lecture Dexie d\'abord, assume true en offline si cache absent (faire confiance plutôt que bloquer), tente Supabase + peuple cache si online',
      'Refactor (services/familyGroupService.ts getFamilyGroupMembers): SWR offline-first complet — lecture Dexie d\'abord (filtre familyGroupId + isActive en mémoire), skip Supabase si offline (retour cache, ne throw plus), refresh + bulkPut Dexie après succès Supabase, fallback cache si erreur fetch online',
      'Fix (services/familySharingService.ts): early return offline-safe ajouté dans les 5 lectures AVANT le check membership et la requête principale (tous deux online-only). Retours : `getFamilySharedTransactions` → [], `getUserSharingRules` → [], `shouldAutoShare` → false (pas d\'auto-partage offline), `getSharedTransactionByTransactionId` → null, `getSharedRecurringTransactions` → []',
      'Régression v3.14.5 résolue : `getFamilySharedTransactions` ne throw plus `Vous n\'êtes pas membre de ce groupe` en offline (le check membership Supabase plantait avec `ERR_INTERNET_DISCONNECTED` même quand l\'utilisateur ETAIT membre)',
      'Fix (hooks/useServiceWorkerUpdate.ts): skip `registration.update()` si `!navigator.onLine` — élimine le bruit console `Failed to update a ServiceWorker for scope` qui apparaissait à chaque cycle de polling en mode hors-ligne',
      'Reste à faire (S71 P3 ou plus tard) : 7 mutations familySharingService (shareTransaction, unshareTransaction, updateSharedTransaction, upsertSharingRule, deleteSharingRule, shareRecurringTransaction, unshareRecurringTransaction) en offline-first queue-able. Mutations familyGroupService (createFamilyGroup, joinFamilyGroup, leaveFamilyGroup) idem',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.5',
    date: '2026-05-15',
    description: 'familySharingService lectures offline-safe (5 fonctions) + favicon dans le precache PWA',
    changes: [
      'Fix (services/familySharingService.ts): helper local `getCurrentUserSafe()` ajouté (pattern S68 répliqué cf. loanService, familyGroupService, reimbursementService). Import `useAppStore` ajouté',
      'Fix (services/familySharingService.ts): 5 fonctions de lecture migrées de `supabase.auth.getUser()` (fetch réseau, throw `AuthRetryableFetchError` en offline) vers `getCurrentUserSafe()` (Zustand → getSession localStorage). Fonctions concernées : `getFamilySharedTransactions` (ligne ~795), `getUserSharingRules` (~935), `shouldAutoShare` (~1153), `getSharedTransactionByTransactionId` (~1354), `getSharedRecurringTransactions` (~1436)',
      'Régression S64+ résolue : `getFamilySharedTransactions` (appelée par TransactionsPage line 251) ne throw plus "Utilisateur non authentifié" en offline. Visible dans les logs prod v3.14.3 : `familySharingService.ts:894 Erreur dans getFamilySharedTransactions` éliminé',
      'Fix (index.html): remplacement de `<link rel="icon" type="image/svg+xml" href="/vite.svg" />` (asset non précaché → `vite.svg net::ERR_INTERNET_DISCONNECTED` x2 au démarrage offline) par `<link rel="icon" type="image/png" href="/icon-192x192.png" />` (déjà dans le precache Workbox + déjà référencé comme apple-touch-icon)',
      '7 mutations de familySharingService conservées intactes (`shareTransaction`, `unshareTransaction`, `updateSharedTransaction`, `upsertSharingRule`, `deleteSharingRule`, `shareRecurringTransaction`, `unshareRecurringTransaction`) — migration prévue en P3 (offline-first mutations queue-able)',
      'Reste à faire (S71 P1#2) : familyGroupService.getFamilyGroupMembers offline-first via nouvelle table Dexie `family_group_members` (élimine erreur "Vous n\'êtes pas membre de ce groupe" en offline sur FamilyDashboardPage)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.4',
    date: '2026-05-15',
    description: 'Bruit console offline éliminé — useFamilyRealtime skip WebSocket, useBudgetIntelligence skip autoCreateBudgets + loadTransactions via transactionService, recurringTransactionService.getAll skip Supabase si offline',
    changes: [
      'Fix (hooks/useFamilyRealtime.ts): les 4 fonctions subscribeToXxx (familyGroup, familyMembers, sharedTransactions, reimbursements) retournent un no-op si `useAppStore.isOnline === false`. Plus de 6 `WebSocket connection failed` au démarrage offline. isOnline mis dans les deps de useCallback → les composants qui passent les callbacks en deps de useEffect recréent la subscription au retour online (re-render naturel sur changement isOnline)',
      'Fix (hooks/useBudgetIntelligence.ts loadTransactions): remplacement de `apiService.getTransactions()` (online-only, retournait `{success: false, error: "Failed to fetch"}` en offline) par `transactionService.getTransactions()` (offline-first SWR depuis v3.10.0, retour direct IndexedDB). Plus de mapping snake_case → camelCase manuel — le service le fait déjà',
      'Fix (hooks/useBudgetIntelligence.ts autoCreateBudgets): early return si `!navigator.onLine`. Auparavant en offline, la création automatique des budgets via `apiService.createBudget()` (online-only) tentait 11 POST Supabase qui échouaient tous avec `Failed to fetch`, polluant la console. hasAutoCreated reste à false → retentative au prochain mount online',
      'Fix (services/recurringTransactionService.ts getAll): skip Supabase si `!navigator.onLine`. Auparavant la lecture de recurring_transactions (utilisée par RecurringTransactionsWidget au dashboard) tentait toujours le `supabase.from().select()` même offline, loguant `ERR_INTERNET_DISCONNECTED` x3',
      'Impact attendu (offline) : console quasi-vide — disparition d\'environ 23 erreurs au démarrage (14 useBudgetIntelligence + 6 WebSocket + 3 recurring). Tous les services métier critiques affichent désormais leurs données IndexedDB en silence',
      'Reste à faire (S71 P1) : familySharingService 12x getUser → getCurrentUserSafe (erreur "Utilisateur non authentifié" dans getFamilySharedTransactions), familyGroupService.getFamilyGroupMembers offline-first via nouvelle table Dexie family_group_members',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.3',
    date: '2026-05-15',
    description: 'Pattern auth offline-safe unifié — accountService, goalService, transactionService alignés sur loanService',
    changes: [
      'Fix (services/accountService.ts): getCurrentUserId() utilise désormais le pattern offline-safe (Zustand store → getSession() → null) au lieu de tomber en fallback sur supabase.auth.getUser() qui fait un fetch réseau et throw `AuthRetryableFetchError` en offline. Import ajouté: useAppStore depuis ../stores/appStore',
      'Fix (services/goalService.ts): même refonte de getCurrentUserId() — élimination du fallback supabase.auth.getUser(). Cohérent avec loanService.getCurrentUserSafe()',
      'Fix (services/transactionService.ts): même refonte de getCurrentUserId() — élimination du fallback supabase.auth.getUser(). Cohérent avec loanService.getCurrentUserSafe()',
      'Architecture: les 6 services métier (loans, family, recurring, reimbursement, account, goal, transaction) utilisent désormais le même pattern offline-safe. Plus aucun service métier ne fait `supabase.auth.getUser()` dans ses lectures/écritures offline-first',
      'Régression S70+ silencieuse résolue: les méthodes du service (getAccounts, getGoals, getTransactions, etc.) qui tombaient sur le fallback réseau en cas de Zustand non hydraté retournent désormais directement l\'ID via getSession() (lecture localStorage Supabase, instantanée)',
      'Reste à faire (S71): familySharingService 12x getUser (lectures), familyGroupService.getFamilyGroupMembers (nouvelle table Dexie family_group_members pattern S69), useBudgetIntelligence.autoCreateBudgets (skip si offline), useFamilyRealtime (pas de WebSocket en offline), mutations BudgetsPage createBudget x3',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.2',
    date: '2026-05-11',
    description: 'Hotfix offline — page Budgets affiche désormais les budgets et les montants dépensés en offline (lecture IndexedDB au lieu d\'apiService)',
    changes: [
      'Fix (pages/BudgetsPage.tsx loadBudgets): remplacement de `apiService.getBudgets()` (online-only, échouait en offline avec "Failed to fetch") par `budgetService.getBudgets()` (SWR offline-first, retour direct depuis IndexedDB). Plus de mapping snake_case → camelCase manuel — le service le fait déjà',
      'Fix (pages/BudgetsPage.tsx calculateSpentAmounts): remplacement de `apiService.getTransactions()` par `transactionService.getTransactions()` (déjà offline-first SWR depuis v3.10.0). Permet le calcul des montants dépensés (`spent`) à partir des 308+ transactions présentes en IndexedDB',
      'Régression S70 visible résolue : la page Budgets affichait "0 budget" et "0 Ar dépensé" en offline alors que 33 budgets et 308 transactions étaient présents dans la mémoire locale. La page affiche désormais les budgets du mois sélectionné avec leurs montants dépensés calculés depuis les transactions locales',
      'Reste à faire (S71 — grand nettoyage offline) : ~22 autres endroits utilisent encore `supabase.auth.getUser()` ou des appels apiService directs en chemin critique (familySharingService 12x, getFamilyGroupMembers, accountService, goalService, useMultiYearBudgetData, useYearlyBudgetData, useBudgetIntelligence.autoCreateBudgets, mutations createBudget de BudgetsPage). Les WebSockets temps réel (useFamilyRealtime) génèrent aussi du bruit console en offline',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.1',
    date: '2026-05-11',
    description: 'Hotfix offline — getUserFamilyGroups offline-first via cache localStorage partagé entre Context et Service',
    changes: [
      'Nouveau fichier (lib/familyGroupsCache.ts): extraction des helpers `readFamilyGroupsCache` / `writeFamilyGroupsCache` / `clearFamilyGroupsCache` (auparavant définis dans FamilyContext.tsx). Source unique partagée entre FamilyContext et familyGroupService',
      'Refactor (contexts/FamilyContext.tsx): import des helpers depuis lib/familyGroupsCache au lieu des définitions locales (zéro régression comportementale)',
      'Fix (services/familyGroupService.ts): getUserFamilyGroups passe en SWR offline-first. Lecture immédiate du cache localStorage, retour direct si offline (`!navigator.onLine`), fallback sur cache en cas d\'échec Supabase, mise à jour du cache après chaque fetch online réussi. Ne throw plus en cas d\'échec — retourne le cache (potentiellement vide)',
      'Régression S69 v3.14.0 résolue : la page Transactions (et TransactionDetailPage, FamilyDashboardPage) qui appelle directement `familyGroupService.getUserFamilyGroups()` sans passer par FamilyContext peut désormais lire le groupe familial actif en offline. Les erreurs console `TypeError: Failed to fetch` sur `family_members` disparaissent quand offline + cache présent',
      'Limitation conservée : le premier accès aux groupes familiaux requiert une connexion (peuple le cache localStorage). Les lectures de membres détaillés (getFamilyGroupMembers) restent online-only — refonte offline-first via tables Dexie prévue ultérieurement',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.0',
    date: '2026-05-11',
    description: 'Expérience offline globale — démarrage instantané, Header SWR, recurringTransactionService aligné sur getCurrentUserSafe',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase court-circuite désormais immédiatement si `!navigator.onLine` au démarrage. Plus d\'attente de 5s sur `supabase.from(users).select()` qui ne répondra jamais en offline. Le profil utilisateur reste celui persisté par Zustand (useAppStore). Quand la connexion revient, onAuthStateChange (TOKEN_REFRESHED ou SIGNED_IN) rappelle la fonction avec réseau pour rafraîchir le profil',
      'Fix (components/Layout/Header.tsx): la détection `hasBudgets` (pour le bandeau "questionnaire priorités") utilise désormais `budgetService.getBudgets()` (SWR offline-first, retour IndexedDB) au lieu de `apiService.getBudgets()` (online-only, échouait en offline et masquait le bandeau questionnaire à tort en bloquant l\'effet). Limitation acceptée : au tout premier chargement offline avec IndexedDB vide, le bandeau peut s\'afficher à tort — dismissible par l\'utilisateur',
      'Fix (services/recurringTransactionService.ts): unification du pattern auth — la méthode privée `getCurrentUserId()` délègue maintenant à `getCurrentUserSafe()` importé depuis familyGroupService (Zustand store → session Supabase → null) au lieu de son ancienne implémentation `getSession() + localStorage("bazarkely-user")`. Cohérent avec loanService, familyGroupService, reimbursementService',
      'Architecture: les 3 services métier critiques (loans, family, recurring) + leurs Context React parents utilisent désormais le même helper offline-safe `getCurrentUserSafe()`. Le démarrage de l\'app en mode offline est désormais quasi-instantané (0ms d\'attente auth) au lieu de 5s',
      'Reste à faire (S70+) : P1#1 phase 2 reimbursementService (recordReimbursementPayment FIFO + credit balance + allocations offline-first, 2 nouvelles tables Dexie). P3 cleanup : loanStorageService dead code, unification syncManager + onlineStatusService',
    ],
    type: 'minor' as const
  },
  {
    version: '3.13.1',
    date: '2026-05-11',
    description: 'Hotfix offline — familyGroupService et FamilyContext débloqués (getCurrentUserSafe + cache localStorage des familyGroups)',
    changes: [
      'Fix (services/familyGroupService.ts): remplacement des 9 occurrences `supabase.auth.getUser()` (qui throw `AuthRetryableFetchError` en offline) par un helper local `getCurrentUserSafe()` exporté pour réutilisation. Pattern S68 répliqué sur familyGroupService',
      'Fix (contexts/FamilyContext.tsx): même substitution `supabase.auth.getUser()` → `getCurrentUserSafe()` dans `fetchFamilyGroups()`. Auparavant, le seul fait de visiter une page Famille en offline déclenchait `setError("Utilisateur non authentifié")` + clear de localStorage → activeFamilyGroup restait null → toute la chaîne offline famille (reimbursements S69) inutilisable',
      'Feature (contexts/FamilyContext.tsx): nouveau cache localStorage des familyGroups (`bazarkely_family_groups_cache`). Lu en premier au mount (retour SWR rapide), écrit après chaque fetch online réussi, conservé en cas d\'échec réseau au lieu de wiper l\'état. Permet la persistance des groupes entre reloads en offline',
      'Régression débloquée : la chaîne offline du module Famille (S69) fonctionne désormais comme prévu — premier chargement online peuple le cache groupes + reimbursements, les visites suivantes en offline restaurent activeFamilyGroup et chargent les reimbursements depuis Dexie',
      'Limitation conservée : les mutations sur familyGroups (createFamilyGroup, joinFamilyGroup, leaveFamilyGroup) restent online-only — refonte offline-first complète prévue en S70',
    ],
    type: 'patch' as const
  },
  {
    version: '3.13.0',
    date: '2026-05-11',
    description: 'Refonte offline-first des Remboursements Familiaux — phase 1 (lectures SWR + markAsReimbursed + getCurrentUserSafe sur 12 fonctions)',
    changes: [
      'Dexie v14 (lib/database.ts): 2 nouvelles tables locales — reimbursementRequests (avec snapshots dénormalisés familyGroupId, fromMemberName, toMemberName, fromMemberUserId, toMemberUserId, transactionId/Description/Amount/Date/Category, reimbursementRate, hasReimbursementRequest) et memberCreditBalances. Migration upgrade vide',
      'Nouveau fichier (types/reimbursement.ts): ReimbursementRequestLocal + MemberCreditBalanceLocal — sources uniques des interfaces Dexie',
      'Refactor (services/reimbursementService.ts): 4 lectures critiques passent en stale-while-revalidate (IndexedDB en premier, refresh Supabase fire-and-forget). getMemberBalances (dérivé localement depuis cache), getPendingReimbursements (filtre [familyGroupId+status] indexé), getReimbursementStatusByTransactionIds (calcul local depuis snapshots), getMemberCreditBalance (lecture locale par [familyGroupId+fromMemberId+toMemberId])',
      'Refactor (services/reimbursementService.ts): markAsReimbursed passe en offline-first — vérification toMemberUserId locale, update Dexie immédiat, push Supabase ou queue, transfert de propriété de la transaction (currentOwnerId, originalOwnerId, transferredAt) géré séparément avec sa propre queue sur table=transactions',
      'Refactor (services/reimbursementService.ts): TOUTES les fonctions du service (12 au total, y compris celles qui restent online-only comme createReimbursementRequest, recordReimbursementPayment, getPaymentHistory, getAllocationDetails) utilisent désormais getCurrentUserSafe() au lieu de supabase.auth.getUser() — élimine le bug "Utilisateur non authentifié" en mode offline ou pendant le warm-up de session OAuth',
      'Extend (services/syncManager.ts): nouveau case reimbursement_requests (INSERT/UPDATE/DELETE) — le syncManager traite automatiquement les mutations en attente au retour de connexion',
      'Type extension (types/index.ts): SyncOperation.table_name accepte désormais reimbursement_requests',
      'Architecture: la vue Supabase family_member_balances reste source de vérité online pour totalPaid/totalOwed/netBalance, dérivation locale (pendingToPay/pendingToReceive uniquement) en fallback offline. Les tables reimbursement_payments / reimbursement_payment_allocations restent online-only en S69 — refonte FIFO + credit balance + allocations prévue en S70',
      'Régression S64+ résolue : la page Espace Famille affiche ses soldes et reimbursements en attente depuis Dexie après un premier chargement online, sans flash "Chargement..." même hors ligne. Marquer comme réglé fonctionne offline (mise à jour locale + queue de sync). Premier chargement nécessite une connexion (peuple Dexie)',
      'Reste à faire (S70) : refonte recordReimbursementPayment (FIFO, allocations, credit balance), getPaymentHistory, getAllocationDetails, getReimbursementsByMember, propagation CloudOff sur FamilyReimbursementsPage, fix familyGroupService race "Utilisateur non authentifié"',
    ],
    type: 'minor' as const
  },
  {
    version: '3.12.1',
    date: '2026-05-11',
    description: 'Hotfix offline — getCurrentUser ne plante plus en mode hors-ligne sur la page Prêts',
    changes: [
      'Fix (services/loanService.ts): remplacement de tous les `getCurrentUser()` (qui appelle `supabase.auth.getUser()` → fetch réseau → `AuthRetryableFetchError` en offline) par un helper local `getCurrentUserSafe()` qui résout dans l\'ordre : 1) `useAppStore.user` (Zustand, sync, instantané) 2) `supabase.auth.getSession()` (lecture localStorage, pas de réseau) 3) null',
      'Régression S68 : au tout premier chargement offline, `getMyLoans()` plantait dans le catch global et retournait un tableau vide pendant 1-2 secondes avant que la session Supabase soit restaurée. La page affichait brièvement "Aucun prêt" alors que 11 prêts étaient présents dans Dexie',
      'Impact : la page Prêts retourne désormais ses données IndexedDB immédiatement même hors-ligne, sans flash de "Aucun prêt" et sans tracer d\'erreur dans la console',
    ],
    type: 'patch' as const
  },
  {
    version: '3.12.0',
    date: '2026-05-11',
    description: 'Refonte offline-first du module Prêts Familiaux — Dexie v13 + SWR + queue de sync + indicateur CloudOff',
    changes: [
      'Dexie v13 (lib/database.ts): 4 nouvelles tables locales — personalLoans, loanRepayments, loanInterestPeriods, pendingReceipts (blobs de justificatifs en attente d\'upload). Migration upgrade vide (premier chargement online peuple les tables)',
      'Refactor complet (services/loanService.ts): toutes les lectures passent en stale-while-revalidate (IndexedDB en premier, refresh Supabase fire-and-forget). getMyLoans, getLoanById, getUnpaidInterestPeriods, getRepaymentHistory, getActiveLoansForDropdown, getLastUsedInterestSettings, getDistinctBeneficiaryNames, getUnlinkedRevenueTransactions, getTotalUnpaidInterestByLoan, getLoanIdByTransactionId, getLoanByRepaymentTransactionId, getRepaymentIndexForTransaction — toutes locales si Dexie peuplée',
      'Refactor complet (services/loanService.ts): toutes les mutations en offline-first — createLoan, updateLoanStatus, deleteLoan, recordPayment (multi-step), generateInterestPeriod, capitalizeOverdueInterests, confirmLoanAsBorrower, confirmRepaymentAsLender, mergeBeneficiaryGroups écrivent Dexie d\'abord puis tentent Supabase via withTimeout(5000), fallback queue de sync si offline ou échec',
      'recordPayment (services/loanService.ts): nouvelle signature accepte File | string | null pour le reçu. Si online → upload direct vers Supabase Storage. Si offline → stocke le blob dans pendingReceipts + queue l\'upload différé (priorité LOW)',
      'Adapt (components/Loans/PaymentModal.tsx): passe le File directement à recordPayment au lieu de pré-uploader — évite la régression "reçu perdu en offline"',
      'Extend (services/syncManager.ts): switch table_name étendu avec 4 nouveaux cases — personal_loans, loan_repayments, loan_interest_periods (INSERT/UPDATE/DELETE classiques) + pending_receipts (cas spécial : récupère le blob depuis Dexie, upload vers Supabase Storage, génère URL signée 1 an, UPDATE loan_repayments.receipt_url, supprime le pendingReceipt local)',
      'Type extension (types/index.ts): SyncOperation.table_name accepte désormais personal_loans, loan_repayments, loan_interest_periods, pending_receipts',
      'Nouveau fichier (types/loans.ts): source unique de vérité des interfaces PersonalLoan, LoanRepayment, LoanInterestPeriod, LoanWithDetails, CreateLoanInput, UnpaidInterestSummary, PendingReceipt. Réexportés depuis loanService pour rétrocompatibilité des imports',
      'Feature (pages/LoansPage.tsx): icône CloudOff (amber-500) à côté du nom du bénéficiaire pour les groupes contenant au moins un prêt avec opération en attente de synchro. Re-fetch toutes les 5s pour rafraîchir l\'indicateur quand le syncManager vide la queue au retour online',
      'Architecture: la source de vérité online est désormais useAppStore.isOnline (cohérent S67), avec fallback navigator.onLine. Le syncManager existant traite automatiquement les nouvelles tables au retour de connexion',
      'Régression S64+ résolue : la page Prêts fonctionne complètement hors ligne (consultation + création + modification + remboursement + suppression + fusion bénéficiaires). Premier chargement nécessite une connexion (peuple Dexie)',
      'Reste à faire : reimbursementService (paiements remboursements familiaux, FIFO, credit balance) — prévu en session suivante. Indicateur sync sur la page Famille à propager en même temps',
    ],
    type: 'minor' as const
  },
  {
    version: '3.11.0',
    date: '2026-05-10',
    description: 'Détection online unifiée (events navigator + Page Visibility + ping 2min) + page Objectifs en SWR + timeout sur getServerStatus',
    changes: [
      'Refactor (goalService.ts): getGoals() passe en stale-while-revalidate — IndexedDB lu en premier (retour immédiat), Supabase rafraîchit IndexedDB en arrière-plan (fire-and-forget) pour la prochaine lecture. Cohérent avec transactionService S66',
      'Fix (goalService.ts): si IndexedDB est vide au premier usage, fetch Supabase synchrone avec timeout 5s — fallback gracieux vers tableau vide en cas d\'échec',
      'Fix (apiService.ts): getServerStatus() wrappé avec withTimeout(5000) — élimine le risque de hang du polling de statut online',
      'Refactor (services/onlineStatusService.ts): nouveau service centralisé — événements navigator online/offline (réaction instantanée), Page Visibility API (pause polling onglet caché), ping serveur backup toutes les 2 min (au lieu de 30s)',
      'Refactor (hooks/useOnlineStatus.ts): devient un simple lecteur de useAppStore.isOnline — plus de polling local',
      'Refactor (Header.tsx): suppression du state local isOnline + useEffect dupliqué → utilise useOnlineStatus() comme HeaderUserBanner',
      'Refactor (App.tsx): remplacement du useEffect basique online/offline par initOnlineStatusService() — un seul point d\'init pour toute l\'app',
      'Architecture: source unique de vérité = useAppStore.isOnline (alimenté par onlineStatusService) ; useSyncStore.isOnline mis à jour en parallèle pour rétrocompat',
      'Économie data : ping pause auto quand onglet caché + intervalle passé de 30s à 120s ; ~95% de la détection online est désormais event-based (instantanée) au lieu de polling',
    ],
    type: 'minor' as const
  },
  {
    version: '3.10.0',
    date: '2026-05-10',
    description: 'Offline-first robuste — transactions en stale-while-revalidate + timeouts 5s sur tous les services métier',
    changes: [
      'Refactor (transactionService.ts): getTransactions() passe en stale-while-revalidate — IndexedDB lu en premier (retour immédiat), Supabase rafraîchit IndexedDB en arrière-plan (fire-and-forget) pour la prochaine lecture. Fini les spinners infinis quand Supabase rame',
      'Fix (transactionService.ts): si IndexedDB est vide au premier usage, fetch Supabase synchrone avec timeout 5s — fallback gracieux vers tableau vide en cas d\'échec',
      'Hardening (transactionService.ts, accountService.ts, budgetService.ts, goalService.ts): tous les appels apiService.* sont désormais wrappés avec withTimeout(5000) — élimine le risque de hang quand Supabase rame mais Wi-Fi est OK',
      'Pattern: SUPABASE_TIMEOUT_MS = 5000 (cohérent avec authService et App.tsx) ajouté dans chaque service métier',
      'Architecture: les composants UI ne voient aucune différence de signature — la fiabilité offline est améliorée de manière transparente',
      'Documentation: ETAT-TECHNIQUE-COMPLET.md section "ðŸ”„ SYNCHRONISATION ET OFFLINE" entièrement réécrite avec audit daté du 2026-05-10 (5 services, 7 écrans, 8 problèmes priorisés, plan de remédiation)',
      'CLAUDE.md: ajout RÈGLE #0bis "Questions fermées par séries" comme skill projet — protocole de cadrage avant toute action',
      'Note: P1 #1 (loanService 100% Supabase-only) reste à faire dans une session ultérieure — voir audit',
    ],
    type: 'minor' as const
  },
  {
    version: '3.9.0',
    date: '2026-05-05',
    description: 'Modal QuickTopUp — ravitaillement de compte au solde insuffisant',
    changes: [
      'Feature (QuickTopUpModal.tsx): nouvelle modal proposée quand le solde est insuffisant lors d\'une dépense, prêt accordé ou remboursement de dette — l\'utilisateur peut transférer depuis un autre de ses comptes sans quitter le formulaire',
      'Feature (AddTransactionPage.tsx): bouton "Ravitailler le compte X" apparaît dans le bandeau d\'erreur "Solde insuffisant" — ouvre la modal avec destination verrouillée et montant pré-rempli au shortfall',
      'Feature (QuickTopUpModal.tsx): destination verrouillée, montant minimum = shortfall, calcul auto des frais, résumé débit/nouveau solde, garde-fou "solde source insuffisant"',
      'Architecture: réutilisation de transactionService.createTransfer + feeService.calculateFees — aucune duplication de logique métier, logique transfert canonique préservée dans /transfer',
      'UX: pas de navigation cross-page — le formulaire de dépense reste monté, ses champs (montant, catégorie, bénéficiaire, prêt lié) sont préservés automatiquement, accountService.getAccounts() rafraîchit les soldes après succès',
    ],
    type: 'minor' as const
  },
  {
    version: '3.8.1',
    date: '2026-05-04',
    description: 'Fix sortie immédiate du mode ancre au relâchement du doigt',
    changes: [
      'Fix (LoansPage.tsx): le mode ancre se désactivait dès `onPointerUp` parce que `isAnchor` venait juste de devenir `true` (long-press timer venait de tirer). Le relâchement était traité comme un tap-sur-ancre → exit immédiat',
      'Fix (LoansPage.tsx): ajout d\'un useRef `longPressFiredRef` qui marque quand le timer a tiré pendant la pression en cours — `onPointerUp` ne sort du mode que si c\'est un VRAI tap court (pas la fin du long-press lui-même)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.8.0',
    date: '2026-05-03',
    description: 'Fusion manuelle de bénéficiaires (anchor + cible) sur LoansPage + autocomplete HTML5 sur création de prêt',
    changes: [
      'Feature (LoansPage.tsx): mode "ancre" via appui long sur l\'avatar d\'un groupe — les autres avatars deviennent des cases à cocher (sélection unique, anti-erreur)',
      'Feature (LoansPage.tsx): bouton "Fusionner" apparaît à droite du groupe coché — ouvre un dialog de confirmation listant le nombre de prêts renommés et la transition de nom',
      'Feature (MergeBeneficiariesDialog.tsx): warnings explicites quand les téléphones diffèrent ou quand il s\'agit de deux utilisateurs distincts de l\'app',
      'Feature (loanService.ts): mergeBeneficiaryGroups — réécrit borrower_name + borrower_user_id + borrower_phone sur les prêts cibles (anchor wins) ; gère aussi le cas userIsBorrower (lender_name + lender_user_id)',
      'Feature (AddTransactionPage.tsx): datalist HTML5 sur le champ "Nom du bénéficiaire" — la liste se filtre au fil de la saisie pour éviter de recréer un nom légèrement différent',
      'Feature (loanService.ts): getDistinctBeneficiaryNames — alimente le datalist avec les noms uniques (borrower + lender) déjà utilisés par l\'utilisateur',
    ],
    type: 'minor' as const
  },
  {
    version: '3.7.0',
    date: '2026-05-03',
    description: 'Refonte page Prêts Familiaux — regroupement par bénéficiaire + panneau de détail aligné sur TransactionsPage',
    changes: [
      'Feature (LoansPage.tsx): les prêts à un même bénéficiaire sont désormais regroupés dans un seul conteneur avec montant total restant et statut consolidé (pire statut: late > pending > active > closed)',
      'Feature (LoansPage.tsx): panneau de détail aligné sur TransactionsPage — carte gradient violet, header "Details transaction" + X, carte Montant avec barre de progression Remboursé/Restant + %, carte Notes, carte Informations prêt + Intérêts dus',
      'Feature (LoansPage.tsx): bouton Modifier ajouté — navigue vers /transaction/:transactionId avec autoEdit (édite la transaction d\'origine du prêt)',
      'Feature (LoansPage.tsx): conversion devise dans le total agrégé — prêts EUR convertis en MGA via getExchangeRate (fallback 4950) puis affichés selon displayCurrency',
      'Refactor (loanService.ts): ajout du champ lenderName dans PersonalLoan + mapLoanRow lit row.lender_name (la colonne existe en DB mais n\'était pas mappée)',
    ],
    type: 'minor' as const
  },
  {
    version: '3.6.1',
    date: '2026-04-26',
    description: 'Fix saisie et édition du solde de compte en mode EUR — décimales autorisées et conversion EUR→MGA au stockage',
    changes: [
      'Fix (AddAccountPage.tsx): le champ "Solde initial" autorise désormais les décimales (step="0.01") quand la devise d\'affichage est EUR — auparavant step="1" rejetait toute valeur décimale ("018,50" invalide)',
      'Fix (AddAccountPage.tsx): conversion EUR→MGA via getExchangeRate (fallback 4950) avant appel à createAccount — les soldes restent stockés en MGA conformément à la convention de useFormatBalance',
      'Fix (AccountDetailPage.tsx): édition du solde — pré-remplit le champ avec la valeur convertie dans la devise d\'affichage et reconvertit en MGA à la sauvegarde, label dynamique (EUR/MGA), step="0.01" en EUR',
      'Robustesse: timeout 5s sur la récupération du taux via withTimeout, fallback DEFAULT_RATE 4950 cohérent avec useFormatBalance',
    ],
    type: 'patch' as const
  },
  {
    version: '3.6.0',
    date: '2026-04-13',
    description: 'Fix conversion devise globale — tous les montants MGA respectent la devise d\'affichage',
    changes: [
      'Nouveau hook useFormatBalance : convertit les montants MGA au taux du jour quand displayCurrency=EUR, réutilisable dans toute l\'app',
      'Fix (AccountDetailPage.tsx): solde du compte converti correctement en EUR',
      'Fix (AddTransactionPage.tsx): dropdown comptes et message "solde insuffisant" — montants convertis',
      'Fix (DashboardPage.tsx): total prêts actifs converti en EUR',
      'Fix (TransactionsPage.tsx): 7 montants de prêts/remboursements convertis en EUR',
      'Fix (ReimbursementPaymentModal.tsx): 6 montants allocations/acomptes convertis en EUR',
      'Refactoring (TransferPage.tsx): logique locale remplacée par le hook partagé useFormatBalance',
    ],
    type: 'minor' as const
  },
  {
    version: '3.5.15',
    date: '2026-04-13',
    description: 'Fix conversion devise dans page transfert entre comptes',
    changes: [
      'Fix (TransferPage.tsx): les soldes des comptes dans les dropdowns source/destination sont maintenant convertis au taux du jour quand la devise d\'affichage est EUR — auparavant seul le symbole € était affiché sans conversion',
      'Fix (TransferPage.tsx): le message d\'erreur "solde insuffisant" affiche aussi le montant converti correctement',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.14',
    date: '2026-04-13',
    description: 'Fix boucle infinie rechargement Service Worker',
    changes: [
      'Fix (useServiceWorkerUpdate.ts): le rechargement auto sur controllerchange ne se déclenche que si l\'utilisateur a cliqué "Mettre à jour" — évite la boucle infinie avec DevTools "Update on reload"',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.13',
    date: '2026-04-13',
    description: 'Bandeau mise à jour affiché uniquement en mode PWA standalone',
    changes: [
      'Fix (UpdatePrompt.tsx): le bandeau "Nouvelle version disponible" ne s\'affiche plus en navigateur desktop — uniquement quand l\'app est installée en PWA',
      'Fix (AppVersionPage.tsx): la section "Statut de mise à jour" affiche "Mode navigateur" avec instruction de recharger la page au lieu du bouton de mise à jour SW',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.12',
    date: '2026-04-13',
    description: 'Hardening auth — timeout 5s sur toutes les requêtes DB users',
    changes: [
      'Fix (authService.ts): toutes les requêtes supabase.from("users") utilisent maintenant withTimeout(5000) — login(), handleOAuthCallback(), waitForUserProfile(), getCurrentUser()',
      'Fix (authService.ts): waitForUserProfile() réduit à 5 tentatives (au lieu de 10) avec timeout par requête',
      'Pattern: les requêtes DB Supabase peuvent hanger silencieusement → toujours utiliser withTimeout() dans les chemins critiques',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.11',
    date: '2026-04-13',
    description: 'Fix connexion Google — timeout 5s sur requête DB users',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase() — la requête Supabase users table ne throwait pas, elle hangait indéfiniment. Ajout d\'un Promise.race() avec timeout 5s : après 5s sans réponse, setAuthenticated(true) est appelé via le catch, la session reste valide',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.10',
    date: '2026-04-13',
    description: 'Fix connexion Google — detectSessionInUrl false',
    changes: [
      'Fix (supabase.ts): detectSessionInUrl: true causait un conflit avec captureOAuthTokens() — le client Supabase traitait les tokens du hash en parallèle de setSession(), bloquant ce dernier indéfiniment',
      'Fix: désactivé detectSessionInUrl car main.tsx gère déjà la capture manuelle des tokens OAuth',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.9',
    date: '2026-04-13',
    description: 'Fix connexion Google — bypass waitForUserProfile bloquant',
    changes: [
      'Fix (AuthPage.tsx): authService.handleOAuthCallback() appelait waitForUserProfile() qui pollait la table users sans timeout — si la connexion DB traînait, le flux OAuth restait bloqué indéfiniment sur Chargement...',
      'Fix (AuthPage.tsx): remplacé par navigation directe après setSession() — profil complet chargé par App.tsx SIGNED_IN handler de manière asynchrone',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.8',
    date: '2026-04-13',
    description: 'Fix connexion Google — setAuthenticated après erreur réseau',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase() appelait setAuthenticated(true) uniquement dans le cas succès/profil absent, mais PAS dans le bloc catch — si la requête Supabase échouait, l\'utilisateur restait bloqué indéfiniment sur la page d\'authentification',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.7',
    date: '2026-04-13',
    description: 'Fix connexion Google — approche auth simplifiée',
    changes: [
      'Fix (App.tsx): Retour à getSession() dans initializeApp() SANS appel setAuthenticated(false) — préserve le flux OAuth Google existant tout en évitant la boucle de rechargement',
      'Fix (App.tsx): Suppression du handler INITIAL_SESSION qui bloquait le callback Google OAuth',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.6',
    date: '2026-04-13',
    description: 'Fix connexion Google bloquée',
    changes: [
      'Fix (supabase.ts): Suppression du timeout global fetch 8s — avortait setSession() OAuth sans rejeter la promesse → isLoading bloqué sur true indéfiniment',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.5',
    date: '2026-04-12',
    description: 'Fix boucle de chargement — INITIAL_SESSION auth',
    changes: [
      'Fix (App.tsx): onAuthStateChange INITIAL_SESSION comme source de vérité auth — élimine flash isAuthenticated false→true qui causait remontage du Dashboard en boucle',
      'Fix (App.tsx): Suppression setUser(null) dans initializeApp() — évite kick vers /auth pendant refresh token Supabase',
      'Fix (supabase.ts): Timeout global 8s sur toutes les requêtes Supabase — empêche blocage infini sur réseau lent',
      'Fix (authService.ts): Nettoyage localStorage avant signOut Supabase — déconnexion garantie même hors ligne',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.4',
    date: '2026-04-12',
    description: 'Fix cause racine du dashboard bloqué — dépendance useEffect sur userId au lieu de user',
    changes: [
      'Fix: useEffect([user]) remplacé par useEffect([userId]) dans DashboardPage — Supabase appelait setUser() 2x au démarrage (getSession + onAuthStateChange SIGNED_IN), chaque appel créait une nouvelle référence objet, re-déclenchant le fetch et annulant le précédent via cancelled=true',
      'Fix: Même correction appliquée aux 3 useEffects (notifications, données, prêts)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.3',
    date: '2026-04-12',
    description: 'Fix robuste du dashboard bloqué en chargement (intermittent)',
    changes: [
      'Fix: scheduleTransactionWatch retiré du chemin critique (était await dans une boucle — bloquait le finally si réseau lent)',
      'Fix: Flag cancelled ajouté pour ignorer les mises à jour d\'un fetch devenu obsolète (exécutions concurrentes)',
      'Fix: Timeout de sécurité 10s — isLoading forcé à false quoi qu\'il arrive',
      'Fix: Script bump-version.js converti en ESM (était cassé depuis passage type:module)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.2',
    date: '2026-04-12',
    description: 'Correction du dashboard bloqué sur "Chargement..." et du bouton Déconnexion inaccessible',
    changes: [
      'Fix: Dashboard - Race condition sur les setInterval de notifications empêchant le chargement des données (ajout clearInterval dans le cleanup)',
      'Fix: Dashboard - setIsLoading(false) manquant quand aucun utilisateur connecté → blocage infini résolu',
      'Fix: Dashboard - Cartes Solde/Revenus/Dépenses/Budget affichaient 0 pendant le chargement → skeleton animé ajouté',
      'Fix: Header - Bouton Déconnexion inaccessible car dropdown positionné hors zone cliquable → wrapper relative corrigé'
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.1',
    date: '2026-03-07',
    description: 'Loans Transaction View S54',
    changes: [
      'Feature: Loan acknowledgment system - WhatsApp confirmation link',
      'Feature: Public /loan-confirm/:token page',
      'Feature: borrowerPhone in AddTransactionPage',
      'Refactor: Remove CreateLoanModal'
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.0',
    date: '2026-03-09',
    description: 'Double validation prêts - badge ATTENTE CONFIRMATION, split LoansPage 1044L→407L, confirmation emprunteur/prêteur',
    changes: [
      'Double validation prêts - badge ATTENTE CONFIRMATION, split LoansPage 1044L→407L, confirmation emprunteur/prêteur'
    ],
    type: 'minor' as const
  },
  {
    version: '3.0.0',
    date: '2026-02-15',
    changes: [
      'Feature: Module Prets Familiaux Phase 1+2 - Système complet de gestion des prêts personnels',
      'Feature: Page LoansPage.tsx - Interface de gestion des prêts avec sections "J\'ai prêté" et "J\'ai emprunté"',
      'Feature: CreateLoanModal - Modal de création de prêt avec gestion taux d\'intérêt, fréquences, et échéances',
      'Feature: PaymentModal - Enregistrement de paiements (direct ou lié à transaction) avec calcul intérêts courus',
      'Feature: RepaymentHistorySection - Historique des remboursements avec accordéon collapsible',
      'Feature: LoanCard expansion - Cartes de prêt cliquables avec détails étendus (paiements, historique)',
      'Feature: Intégration loanService.ts - Service complet pour CRUD prêts, paiements, et calculs d\'intérêts',
      'Technical: Architecture modulaire - Composants modaux extraits au niveau top-level pour éviter re-mount',
      'Technical: Gestion état avancée - selectedLoanId, showPaymentModal pour contrôle expansion et modals',
      'UI Enhancement: Badges de statut (pending, active, late, closed) avec couleurs distinctes',
      'UI Enhancement: Barres de progression pour visualisation remboursement',
      'UI Enhancement: Affichage multi-devises (MGA/EUR) avec CurrencyDisplay',
      'Session: Module Prets Familiaux Phase 1+2 complète'
    ],
    type: 'major' as const
  },
  {
    version: '2.8.1',
    date: '2026-02-12',
    changes: [
      'Cleanup: Removed 17 debug console.log statements from ReimbursementPaymentModal.tsx and FamilyReimbursementsPage.tsx',
      'Session: S48 (2026-02-12) - Debug cleanup patch'
    ],
    type: 'patch' as const
  },
  {
    version: '2.8.0',
    date: '2026-02-12',
    changes: [
      'Feature: Collapsible Payment History - Payment history section now collapsible for better UI organization',
      'Feature: Progress Bars in Allocation Preview - Visual progress bars showing allocation distribution across requests',
      'Feature: Amount Parsing Fix - Improved amount parsing logic for better accuracy in payment processing',
      'Feature: Payment Status Indicators - Visual indicators showing payment status (pending, settled, partial)',
      'UI Enhancement: Better organization of payment information with collapsible sections',
      'UI Enhancement: Visual feedback for payment allocations with progress bars',
      'Technical: Enhanced amount parsing for multi-currency support',
      'Technical: Payment status tracking improvements',
      'Session: S44 (2026-02-12) - Payment allocation UI enhancements'
    ],
    type: 'minor' as const
  },
  {
    version: '2.7.0',
    date: '2026-01-27',
    changes: [
      'Feature: Budget Gauge AddTransaction - Affichage temps réel jauge budgétaire lors sélection catégorie dépense',
      'Feature: Budget Gauge AddTransaction - Affichage pourcentage utilisé et montant restant en temps réel',
      'Feature: useBudgetGauge hook - Création hook custom avec logique réactive (fetch budget, calcul spent, statut)',
      'Feature: useBudgetGauge hook - Réactivité automatique sur changements category/amount/date',
      'Feature: BudgetGauge component - Composant présentationnel avec layout inline (barre et texte même ligne)',
      'Feature: BudgetGauge component - Barre de progression bicolore (vert + rouge) si dépassement budgétaire',
      'Feature: BudgetGauge component - Couleurs dynamiques selon statut (vert bon, jaune attention, rouge dépassé)',
      'Feature: getBudgetByCategory service - Extension budgetService avec méthode récupération budget par catégorie/mois/année',
      'Feature: getBudgetByCategory service - Pattern offline-first via getBudgets() existant',
      'Feature: Layout optimisations - 4 itérations pour layout optimal (label gauche, gauge extensible, texte droite)',
      'Feature: Layout optimisations - Structure flex-1 pour extension complète barre entre label et texte',
      'Feature: Logique Épargne inversée - Statut inversé pour catégorie Épargne (0% = dépassé rouge, 100% = bon vert)',
      'Feature: Conversion multi-devises - Conversion EUR vers MGA utilisant exchangeRateUsed stocké dans transactions',
      'Feature: Masquage automatique - Jauge masquée si type Revenu ou catégorie vide',
      'Feature: Gestion états - Loading, error, no-budget states gérés avec messages informatifs',
      'Technical: Architecture modulaire - Service-hook-component-integration pattern réutilisable',
      'Technical: Matching case-insensitive - Comparaison catégories normalisée pour robustesse',
      'Technical: Mobile préservé 100% - Zéro régression mobile confirmé',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, PROJECT-STRUCTURE-TREE.md, FEATURE-MATRIX.md, CURSOR-2.0-CONFIG.md mis à jour',
      'Workflow: Multi-agent workflows utilisés (Agents 01, 02, 03, 04, 05, 06, 09, 10, 11, 12)',
      'Workflow: Documentation 5-agents parallèles (NOUVEAU pattern) - Gain temps 70%',
      'Session: S43 (2026-01-27) - Budget Gauge Feature complète'
    ],
    type: 'minor' as const
  },
  {
    version: '2.6.0',
    date: '2026-01-26',
    changes: [
      'Feature: Desktop Enhancement - Layout 2 colonnes desktop (main 70% + sidebar 30%)',
      'Feature: Desktop Enhancement - Header 2 lignes avec navigation intégrée (6 liens: Accueil, Comptes, Transactions, Budgets, Famille, Objectifs)',
      'Feature: Desktop Enhancement - Sidebar sticky avec clearance optimale (lg:sticky lg:top-40)',
      'Feature: Desktop Enhancement - BottomNav caché desktop, visible mobile (lg:hidden)',
      'Feature: Desktop Enhancement - 3 composants layout créés (DashboardContainer, ResponsiveGrid, ResponsiveStatCard)',
      'Feature: Desktop Enhancement - Grille statistiques responsive (2 colonnes mobile → 4 colonnes desktop)',
      'Feature: Desktop Enhancement - Padding responsive sur cartes statistiques (p-4 md:p-6 lg:p-8)',
      'Feature: Desktop Enhancement - Actions rapides layout flex horizontal desktop (lg:flex lg:justify-center)',
      'Fix: Import path case sensitivity - Correction layout → Layout pour compatibilité Linux/Netlify',
      'Technical: Architecture multi-agents - 3 approches testées (conservative, modulaire, intégrée)',
      'Technical: Approche intégrée retenue pour meilleure UX desktop',
      'Technical: Mobile préservé 100% - Zéro régression mobile',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md mis à jour',
      'Workflow: Multi-agent workflows utilisés (Agents 09, 10, 11)',
      'Session: S42 (2026-01-26) - Desktop Enhancement complète'
    ],
    type: 'minor' as const
  },
  {
    version: '2.5.0',
    date: '2026-01-25',
    changes: [
      'Feature: Infrastructure i18n Multi-Langues (Phase 1/3) - Système react-i18next opérationnel',
      'Feature: Configuration i18n.ts avec détection automatique langue depuis appStore',
      'Feature: Support 3 langues: Français, English, Malagasy',
      'Feature: Fichiers traduction fr.json, en.json, mg.json (85+ clés section auth)',
      'Feature: Provider I18nextProvider intégré dans App.tsx',
      'Feature: Protection Anti-Traduction - Sécurisation données financières',
      'Feature: Utility excludeFromTranslation.tsx (10 fonctions utilitaires)',
      'Feature: CurrencyDisplay protégé automatiquement (44+ fichiers)',
      'Feature: Protection multi-couches: translate="no", notranslate, lang, data attributes',
      'Fix: Dashboard EUR Display - Correction originalCurrency hardcodé "MGA" → transaction.originalCurrency',
      'Fix: Dashboard EUR Display - Utilisation transaction.originalAmount pour montants corrects',
      'Fix: Dashboard EUR Display - Résultat: 100,00 EUR affiché correctement (au lieu de 0,20 EUR)',
      'Fix: i18next Initialization Error - Correction pattern new LanguageDetector() → LanguageDetector direct',
      'Technical: Configuration détection langue via getAppStoreLanguage()',
      'Technical: Application charge sans erreur i18n',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md, FEATURE-MATRIX.md mis à jour',
      'Workflow: 13 agents multi-agents utilisés (7 workflows parallèles, 70% temps économisé)',
      'Session: S41 (2026-01-25) - Infrastructure i18n Phase 1 complète'
    ],
    type: 'minor' as const
  },
  {
    version: '2.4.10',
    date: '2026-01-24',
    changes: [
      'Fix: Version synchronization between package.json and appVersion.ts',
      'Deployment: Force Netlify deployment for documentation updates'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.9',
    date: '2026-01-23',
    changes: [
      'UI Optimization: Header spacing reduced in search container (mt-4 p-4 → mt-2 p-3) for more compact interface',
      'UI Optimization: Connection status layout changed from horizontal to vertical centered (icon above text)',
      'UI Optimization: Reduced vertical spacing between icon and text (space-y-2 → space-y-1) for compact display',
      'Technical: Modified Header.tsx line 918: mt-2 p-3 classes',
      'Technical: Modified Header.tsx line 963: flex flex-col items-center justify-center space-y-1',
      'Technical: Modified Header.tsx line 969: added text-center to span',
      'Design System: mt-2 p-3 pattern used 3x in project for consistency',
      'Layout Pattern: flex flex-col items-center used 7x in project',
      'Session: S41 (2026-01-23) - Header UI optimizations'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.8',
    date: '2026-01-21',
    changes: [
      'Bug Fix: CurrencyDisplay HTML Nesting - Fixed invalid HTML structure causing currency toggle malfunction',
      'Bug Fix: Changed wrapper element from <div> to <span> for HTML5 compliance',
      'Bug Fix: Resolved validation errors when CurrencyDisplay used inside <p> or <button> tags',
      'Bug Fix: AccountsPage Button Nesting - Fixed button-in-button HTML error blocking currency toggle',
      'Bug Fix: Replaced <button> parent with <div role="button"> for accessibility',
      'Enhancement: Currency Toggle for Especes Accounts - Enabled currency conversion for cash accounts',
      'Enhancement: Removed conditional rendering that excluded especes accounts from CurrencyDisplay',
      'Technical: HTML5 Compliance - All CurrencyDisplay usages now pass HTML validation',
      'Technical: Accessibility - Enhanced keyboard navigation for account cards',
      'Validation: 30 CurrencyDisplay instances validated (100% pass rate, 0 regressions)',
      'Documentation: Updated ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md, FEATURE-MATRIX.md',
      'Session: S40 (2026-01-21) - Multi-agent fix (AGENT 09, 10, 11, 12)',
      'Commit: dd55724 - 6 files modified (+408 / -43 lines)'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.7',
    date: '2026-01-20',
    changes: [
      'Fix: EUR double conversion bug in TransactionsPage',
      'Fix: EUR transactions now display correctly with global currency toggle',
      'Fix: 100 EUR correctly shows as 495,000 Ar (not 2,450,250,000 Ar)',
      'Technical: Pass originalAmount directly to CurrencyDisplay',
      'Technical: Eliminate double conversion in transaction display logic'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.6',
    date: '2026-01-18',
    changes: [
      'Major Feature: Complete multi-currency support - Accounts can now hold both EUR and MGA transactions',
      'PROMPT 1: Modified account schema to support multi-currency (currency field now optional/nullable)',
      'PROMPT 1: Accounts with currency=null accept transactions in any currency',
      'PROMPT 2: Transaction services now capture originalCurrency from form currency toggle',
      'PROMPT 2: Exchange rates retrieved at transaction date (not current date)',
      'PROMPT 2: Store originalAmount, originalCurrency, exchangeRateUsed for every transaction',
      'PROMPT 3: Created currencyConversion.ts utility with convertAmountWithStoredRate()',
      'PROMPT 3: Display logic uses stored exchangeRateUsed (never recalculates with current rate)',
      'PROMPT 3: Transaction amounts convert correctly based on /settings displayCurrency',
      'PROMPT 3: Created WalletBalanceDisplay component for dual currency display (X € + Y Ar)',
      'PROMPT 4: TransferPage and AddTransactionPage now pass originalCurrency from form toggle',
      'PROMPT 4: Form submission logs show currency source (form toggle, not /settings)',
      'PROMPT 5: Fixed currency toggle button - clicking Ar/€ symbol now switches currency correctly',
      'PROMPT 5: Added setDisplayCurrency call in onCurrencyChange handlers',
      'PROMPT 5: Comprehensive debug logs for currency toggle flow',
      'PROMPT 6: Fixed transfer display bug - debit transactions now show red arrow out, credit show green arrow in',
      'PROMPT 6: Display logic uses transaction.amount (original) instead of converted amount for icon determination',
      'Bug Fix: Replaced toast.warning() with toast() (react-hot-toast compatibility)',
      'Architecture: Currency in /settings is UI display preference only, not account constraint',
      'Architecture: Form currency toggle determines transaction originalCurrency, independent of /settings',
      'Architecture: Historical exchange rates preserved in exchangeRateUsed field',
      'Testing: Verified EUR→EUR transfers maintain 100€ without unwanted conversion',
      'Breaking Change: None - Fully backward compatible with existing accounts and transactions'
    ]
  },
  {
    version: '2.4.5',
    date: '2026-01-18',
    changes: [
      'Bug Fix: EUR transfer bug - amounts no longer incorrectly converted when transferring between EUR accounts',
      'STEP 1: Added multi-currency columns to Supabase transactions table (original_currency, original_amount, exchange_rate_used)',
      'STEP 1: Regenerated TypeScript types to match new Supabase schema',
      'STEP 1: Created migration SQL: supabase/migrations/20260118134130_add_multi_currency_columns_to_transactions.sql',
      'STEP 2: Fixed fallback MGA bug in transactionService.ts - removed || "MGA" fallback that caused incorrect conversions',
      'STEP 2: Added strict currency validation - transfers now require both accounts to have explicit currency defined',
      'STEP 2: Enhanced logging in createTransfer() - comprehensive debugging logs for currency validation and conversion',
      'STEP 3: Added frontend validation in TransferPage.tsx - early detection of currency issues before service call',
      'STEP 3: Added currency mismatch warnings - toast notifications inform user of display currency vs account currency differences',
      'STEP 3: Improved error messages - user-friendly error handling with actionable next steps',
      'Root Cause: Fallback to MGA when account.currency was undefined caused EUR amounts to be treated as MGA and incorrectly converted',
      'Impact: Transfers between EUR accounts now preserve original amounts without unwanted currency conversion',
      'Testing: Recommended to test EUR→EUR, MGA→MGA, and cross-currency EUR→MGA transfers'
    ]
  },
  {
    version: '2.5.0',
    date: '2026-01-07',
    changes: [
      'Phase B Complete: Automatic goal deadline synchronization based on requiredMonthlyContribution',
      'Phase B1: Added requiredMonthlyContribution field to Goal schema (TypeScript + IndexedDB v12 + Supabase)',
      'Phase B2: Created centralized recalculateDeadline() function in goalService',
      'Phase B3.1: Persist requiredMonthlyContribution when accepting suggestions',
      'Phase B3.2: Auto-recalculate deadline on goal creation',
      'Phase B3.3: Auto-recalculate deadline when contribution or target amount changes',
      'Phase B3.4: One-time migration to sync existing goals with outdated deadlines',
      'Formula: deadline = today + ceil((targetAmount - currentAmount) / requiredMonthlyContribution) months',
      'Edge cases handled: goal achieved, no contribution, duration limits (1-120 months)',
      'Backward compatible: manual deadlines preserved if no requiredMonthlyContribution'
    ]
  },
  {
    version: '2.4.3',
    date: '2026-01-02',
    changes: [
      'Fix: Projection graphique Goals recalculée selon contribution mensuelle',
      'Fix: Jours restants affiche durée réaliste (360j au lieu de 1825j)',
      'Fix: Suggestion mensualité conservative (15% au lieu de 30%)',
      'Amélioration: calculateRealisticContribution avec min 5% / max 25%'
    ]
  },
  { version: '2.4.2', date: '2025-01-02', changes: 'Flux épargne intelligent, bouton suggérer objectifs, fix PGRST116/PGRST204, conversion camelCase→snake_case' },
  { version: '2.4.1', date: '2025-01-02', changes: 'Graphique évolution épargne, système célébrations jalons' },
  { version: '2.4.0', date: '2025-01-01', changes: 'Widget Dashboard objectifs, suggestions automatiques' }
];
