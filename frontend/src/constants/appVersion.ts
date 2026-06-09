export const APP_VERSION = '3.46.9';
export const APP_VERSION_NAME = 'Tableau de bord Gestion Eau : nouvelle carte « Conso électrique » (finitions électricité). Le tableau de bord affiche désormais, à côté des indicateurs de l\'eau, la consommation électrique récente (somme des dernières consommations relevées par compteur, en kWh) ; tant qu\'aucun relevé électrique n\'a été saisi, la carte montre un état vide clair (« Aucun relevé électrique — appuyez pour saisir ») et la toucher ouvre directement la saisie des relevés électriques. Petite fiabilisation au passage : relever un compteur électrique avec exactement le même index que la fois précédente (consommation nulle, par exemple un logement inoccupé) ne déclenche plus de fausse alerte « consommation anormalement basse ». Le reste du module (eau et électricité) est inchangé. (Détail précédent v3.46.8 : Mise au point de la facture combinée eau + électricité (Gestion Eau) : le PDF affiche désormais le logo AHUVI en en-tête, les colonnes « Prix unitaire » et « Total » des tableaux ne se chevauchent plus pour les gros montants (la devise est rappelée dans l\'en-tête de ces colonnes), et l\'encadré du calcul du prix du kWh (A : JIRAMA, B : gasoil, C : kWh, D = (A+B)/C) est présenté sur quatre lignes bien lisibles ; les montants et la période sont désormais alignés proprement, sans débordement ni troncature au bord droit. Le calcul et les montants sont inchangés. (Détail précédent v3.46.6 : Nouveau : facture combinée eau + électricité (Gestion Eau, étape finale). Dans l\'écran « Facturation », après avoir choisi la période, on choisit aussi le « mois de coûts électricité » (qui fixe le prix du kWh) : chaque facture additionne désormais une ligne EAU (consommation × tarif au m³) et une ligne ÉLECTRICITÉ (consommation × prix du kWh du mois choisi), avec un total général. Une villa sans relevé d\'un côté n\'est facturée que pour l\'autre. L\'aperçu et la liste affichent le détail eau / électricité / total. Le PDF de facture est entièrement remodelé (charte AHUVI) : logo, en-tête propriétaire + villa, deux tableaux (électricité et eau, avec index de début/fin, consommation et prix unitaire), un encadré « calcul du prix du kWh » (A : facture JIRAMA, B : gasoil, C : kWh produits, D = (A+B)/C) pour la transparence, le grand total et le montant écrit en toutes lettres (« Soit … Ariary »). S\'il n\'y a pas encore de mois de coûts électricité, un message invite à les saisir d\'abord (menu « Coûts électricité ») et seules les lignes d\'eau sont facturées. Le propriétaire retrouve ce même PDF pour ses factures. Rien d\'autre ne change. (Détail précédent v3.46.5 : Nouveau : relevé de l\'électricité par villa (Gestion Eau, 2ᵉ étape de la facture combinée eau + électricité). Dans l\'écran « Relevés », un nouvel onglet « Électricité » (icône éclair) permet au releveur ou à l\'administrateur de noter l\'index du compteur ÉLECTRIQUE (en kWh) de chaque villa, exactement comme pour l\'eau : on cherche la villa (ce sont les mêmes que pour l\'eau), l\'app affiche le dernier index relevé et sa date, on saisit le nouvel index, et la consommation (en kWh) s\'affiche aussitôt. Comme pour l\'eau, l\'app prévient si l\'index saisi est plus bas que le précédent (compteur remplacé : « rupture ») ou si la consommation paraît anormale, et demande confirmation ; on peut joindre une photo du compteur. Un petit graphique montre la consommation des derniers relevés. Côté propriétaire, l\'onglet « Ma conso » affiche désormais, sous chaque compteur, une section « Électricité » en lecture seule : dernier index kWh et historique de consommation (tant qu\'aucun relevé électrique n\'existe, un message discret l\'indique). Le promoteur garde sa lecture seule ; rien d\'autre ne change. La facturation de l\'électricité avec l\'eau arrive aux étapes suivantes. (Détail précédent v3.46.4 : « Coûts électricité du mois » (Gestion Eau, 1ʳᵉ étape de la facture combinée eau + électricité). Un nouvel écran (menu en haut à droite → « Coûts électricité ») permet à l\'administrateur d\'enregistrer, pour chaque mois, le coût de l\'électricité de la centrale : (A) la facture JIRAMA, (B) le gasoil du groupe électrogène et (C) le nombre total de kWh produits. L\'application en déduit aussitôt (D) le prix d\'un kWh = (A + B) ÷ C, affiché en direct pendant la saisie puis conservé. On peut ajouter plusieurs mois, les modifier ou les supprimer ; ré-enregistrer un mois met simplement à jour ses chiffres (jamais de doublon). Si le total de kWh n\'est pas encore connu, le prix n\'est pas calculé (un message le rappelle). Le promoteur et le releveur peuvent consulter cet écran en lecture seule ; un propriétaire n\'y a pas accès. Cette étape pose aussi, en coulisses, de quoi relever les compteurs électriques et joindre l\'électricité aux factures (volets prévus aux étapes suivantes) ; rien d\'autre ne change dans l\'application. (Détail précédent v3.46.3 : Correctif (Gestion Eau) : le lien « Aller à la configuration » de la page Facturation ouvre désormais directement la page Configuration. Avant, ce lien rechargeait toute l\'application et, le temps que vos droits d\'administrateur soient reconnus, vous étiez renvoyé ailleurs ; il fonctionne maintenant comme une navigation interne (sans rechargement), exactement comme les autres boutons du module. (Détail précédent v3.46.2 : On dit désormais « Propriétaire » au lieu de « Client » (Gestion Eau). Dans tout le module Eau, le mot affiché « Client » est remplacé par « Propriétaire » : la case du rôle lors d\'une invitation et de la validation d\'une demande, les badges, l\'écran « Utilisateurs » (« Comptes propriétaires », « Nouveau compte propriétaire »…), les messages du scan de QR, le journal et les textes d\'aide. C\'est uniquement un changement de vocabulaire à l\'écran : rien ne change dans le fonctionnement, les accès, les rôles ni les données — un propriétaire accède à son espace exactement comme avant. (Détail précédent v3.46.1 : Chiffres de consommation et de pertes du bassin plus réalistes (Gestion Eau, suite). Cet après-midi, l\'affichage « consommation estimée » (tableau de bord et courbe) avait déjà été corrigé. Cette mise à jour corrige aussi le calcul de fond (le « moteur des bilans ») : jusqu\'ici il supposait que la pompe tournait sans arrêt, ce qui gonflait la consommation réseau estimée et les pertes. Désormais il tient compte du fait que la pompe se coupe quand le bassin est plein (elle ne tourne pas en continu). Conséquence : le chiffre « Conso réseau (période) » et les pertes affichées baissent vers des valeurs réalistes, et certaines fausses alertes d\'anomalie (dues à cette surestimation) disparaissent. La facturation (basée sur les compteurs) n\'est pas affectée. Note : pour appliquer ces nouveaux chiffres aux relevés DÉJÀ enregistrés, l\'administrateur lance une fois « Recalculer tous les bilans » (onglet Niveau de la saisie bassin) ; les nouveaux relevés sont déjà calculés correctement. (Détail précédent v3.46.0 : Le propriétaire peut voir la situation du bassin commun (Gestion Eau). Les propriétaires (qui ne voyaient que « Ma conso » et « Mes factures ») disposent désormais d\'un nouvel onglet « Le bassin » : il affiche, EN LECTURE SEULE, le niveau d\'eau actuel du bassin commun, son pourcentage de remplissage, l\'autonomie estimée et la consommation du jour, ainsi qu\'une courbe du niveau sur 30 jours. C\'est une simple consultation : aucune saisie ni modification n\'est possible (le serveur lui-même empêche toute écriture sur les données du bassin). Les autres rôles (administrateur, releveur, promoteur) et les écrans « Ma conso » / « Mes factures » ne changent pas. (Détail précédent v3.45.2 : Consommation estimée plus réaliste : on tient compte des coupures de pompe (Gestion Eau). Tant que les compteurs ne sont pas installés, la consommation d\'eau est estimée à partir du débit des pompes et des niveaux du bassin. Mais quand le bassin est plein, la pompe se coupe toute seule (flotteur) : sur ces périodes, supposer la pompe en marche continue gonflait l\'estimation (on voyait des journées à 80–140 m³ alors que la vraie consommation tourne autour de 18 m³/jour). Désormais, l\'application repère les périodes « bassin plein / pompe coupée » et y applique le rythme de consommation réellement observé quand le bassin se vidait, au lieu du débit théorique. Résultat : le chiffre « Consommation du jour » du tableau de bord et la courbe « Consommation estimée par jour » (Tendances) — ainsi que la projection en pointillés — affichent enfin des valeurs réalistes, du même ordre que l\'autonomie estimée. Les pertes du réseau (~30 %) restent déduites, et dès l\'installation des compteurs tout repasse sur la consommation réellement mesurée. Le calcul des bilans, des pertes (NRW) et de la « Conso réseau (période) » n\'est pas modifié. (Détail précédent v3.45.0 : Inviter un « promoteur » (Gestion Eau). Le formulaire « Nouvelle invitation » (écran Invitations & demandes) propose désormais le rôle Promoteur, en plus d\'Administrateur, Releveur et Client — aussi bien pour une invitation par email que par lien WhatsApp. On peut donc inviter quelqu\'un qui pourra TOUT consulter dans l\'espace eau (en lecture seule) et régler les seuils d\'alerte, sans rien pouvoir modifier d\'autre. Dès que la personne invitée se connecte, son accès « promoteur » s\'active tout seul (comme pour les autres rôles). Les invitations déjà envoyées affichent une pastille « Promoteur », et lorsqu\'on valide une demande d\'accès reçue on peut aussi y attribuer le rôle Promoteur. Les invitations Administrateur / Releveur / Client fonctionnent exactement comme avant. (Détail précédent v3.44.2 : Conso du jour : le trait pointillé de « projection » s\'affiche désormais aussi tôt le matin (Gestion Eau). Petit ajustement d\'affichage : sur la page Tendances, le segment en pointillés « projection (relevés en attente) » qui prolonge la courbe jusqu\'à aujourd\'hui apparaît maintenant correctement même dans les toutes premières heures de la journée (avant, à cause du décalage d\'heure, il ne se montrait qu\'à partir du milieu de matinée). Le tableau de bord et le calcul de la consommation estimée sont inchangés. (Détail précédent v3.44.1 : Consommation du jour : ne reste plus à zéro quand un relevé manque (Gestion Eau). Sur le tableau de bord, le chiffre « Consommation du jour » et, sur la page Tendances, la courbe « Consommation par jour » pouvaient retomber à zéro les jours où aucun relevé de niveau n\'avait encore été saisi — alors que l\'eau continue d\'être consommée. Désormais, tant qu\'il n\'y a pas de compteurs, l\'application ESTIME la consommation au lieu d\'afficher zéro : si les relevés tardent, elle prolonge la tendance des 3 derniers jours (le chiffre du jour monte progressivement au fil des heures) et la courbe se prolonge jusqu\'à aujourd\'hui par un trait en pointillés « projection (relevés en attente) ». Une absence de relevé n\'est donc plus prise pour une consommation nulle. L\'estimation tient compte d\'environ 30 % de pertes du réseau (évaporation + fuites entre le bassin et les villas), et une petite mention sous le chiffre précise son origine (« estimée (tendance…) », « estimée (moyenne période) »…). Seule exception : si des compteurs existent et indiquent réellement zéro, le zéro est conservé (« mesurée (compteurs à 0) ») — on ne projette jamais par-dessus une vraie mesure. Dès l\'installation des compteurs, tout repasse automatiquement sur la consommation réellement mesurée, sans pertes estimées. (Détail précédent v3.44.0 : Nouveau rôle « Promoteur » (Gestion Eau). L\'administrateur peut désormais désigner une personne comme « promoteur » : une nouvelle case « Promoteur » apparaît à côté de « Administrateur » et « Releveur » dans l\'écran « Utilisateurs & rôles ». Le promoteur voit TOUT l\'espace eau — tableau de bord, relevés, suivi, compteurs et facturation (y compris TOUTES les factures), ainsi que les écrans d\'administration (configuration, utilisateurs, demandes, alertes, annonces, journal) — mais uniquement en LECTURE : aucun bouton de saisie, de modification, de suppression, de validation, de génération ou de marquage ne lui est proposé, et un petit repère « Lecture seule (promoteur) » le rappelle sur chaque écran. SEULE exception : dans la Configuration, le promoteur peut régler les seuils d\'alerte (pourcentage et m³ d\'écart, facteur de relevé aberrant, jours sans relevé, bassin critique, écart de débit) ; tous les autres réglages lui restent en lecture seule. Les rôles existants (administrateur, releveur, client/propriétaire) ne changent en rien : l\'administrateur écrit partout comme avant. (Détail précédent v3.43.2 : Consommation estimée par le débit des pompes (Gestion Eau). Tant que les compteurs d\'eau ne sont pas installés, le graphique « Consommation par jour » (Suivi → Tendances) et le chiffre « consommation du jour » (tableau de bord) restaient à zéro, faute de relevés de compteurs. Désormais, l\'application affiche une consommation ESTIMÉE déduite du débit des pompes : tant que la pompe tourne, l\'eau apportée ≈ débit × durée, et la consommation ≈ apport − variation du niveau du bassin (les fuites et l\'évaporation sont négligées). Sur la page Tendances, la courbe s\'intitule alors « Consommation estimée par jour » avec une petite étiquette « estimée (débit) » et une aide dépliable qui explique le calcul ; sur le tableau de bord, le chiffre du jour porte la mention « estimée (débit) ». Si aucun test de débit n\'a encore été enregistré, un message invite à en faire un (onglet Débit de la saisie bassin). Dès qu\'un seul relevé de compteur existe, tout rebascule AUTOMATIQUEMENT sur la consommation réellement mesurée (la courbe redevient « Consommation métrée par jour », sans la mention « estimée »). Aucun chiffre n\'est enregistré : l\'estimation est recalculée à l\'affichage. (Détail précédent v3.43.1 : Correctif d\'affichage des graphiques (Gestion Eau). Les pages avec courbes — la courbe « Niveau du bassin » (Saisie bassin → onglet Niveau) et la page Tendances — pouvaient planter et afficher un écran d\'erreur à cause d\'une animation d\'apparition des graphiques qui tournait en boucle. L\'animation d\'apparition est désormais désactivée sur tous les graphiques du module Eau : les courbes, aires et barres s\'affichent exactement comme avant (mêmes chiffres, mêmes couleurs), simplement sans l\'effet d\'apparition, et les pages ne plantent plus. Aucun autre changement. (Détail précédent v3.43.0 : Mises à jour automatiques et propres de l\'application (sur téléphone comme sur ordinateur). Désormais, quand une nouvelle version est publiée, l\'application l\'installe et l\'applique TOUTE SEULE : plus de bouton « Actualiser » à chercher, plus de manipulations, et surtout plus de « résidus » de l\'ancienne version qui obligeaient parfois à se déconnecter ou à quitter l\'application. Concrètement, dès qu\'une nouvelle version est prête, l\'app active le nouveau moteur, efface les anciens fichiers en cache (SANS jamais toucher à vos données ni à vos saisies en attente d\'envoi hors-ligne) puis se recharge automatiquement ; un petit message « Application mise à jour ✅ » le confirme. Note importante : cette amélioration s\'installe AVEC la présente version — sur un appareil qui a encore l\'ancienne version, il faut une dernière mise à jour « à l\'ancienne » (relancer l\'application, ou se reconnecter) pour récupérer ce nouveau système ; ensuite, toutes les mises à jour suivantes seront automatiques. (Détail précédent v3.42.0 : Photos du domaine sur la page de présentation « lien déjà utilisé » (Gestion Eau). Les trois emplacements photo de cette page affichent désormais de vraies images du domaine Itampolo Resort : le practice de golf (« Le parcours de golf prend forme. »), les Résidences (« Les Résidences, pensées pour durer. ») et les villas avec piscine (« Les villas du domaine prennent vie. »). Tant qu\'une image n\'est pas encore chargée, l\'icône de repère reste affichée sur le fond vert ; dès que la photo arrive, elle la recouvre. Aucun autre changement. (Détail précédent v3.41.0 : Modifier ou supprimer un relevé de niveau du bassin (Gestion Eau, réservé à l\'administrateur). Sous l\'onglet « Niveau » de la saisie bassin, une nouvelle section dépliable « Relevés récents (admin) » liste les derniers relevés (date, hauteur, volume). L\'administrateur peut corriger un relevé (changer la hauteur et/ou la date-heure) ou le supprimer ; à chaque fois, les bilans concernés sont recalculés automatiquement. Un bilan compare deux relevés qui se suivent (niveau précédent → niveau actuel) pour estimer la consommation et les pertes : modifier un relevé ne touche donc qu\'au bilan de ce relevé et à celui du relevé suivant ; les autres bilans (et leur état « traité ») restent intacts. Un bouton « Recalculer tous les bilans » refait toute la série depuis le début (utile une seule fois pour générer les bilans de relevés importés). Ces actions exigent une connexion : hors ligne, les boutons sont désactivés. Cette section n\'apparaît QUE pour un administrateur ; un releveur ne la voit pas et ne peut pas modifier ni supprimer un relevé. Bonus : enregistrer un relevé à une date passée met aussi à jour le bilan du relevé qui le suit. La saisie normale d\'un relevé reste exactement comme avant. (Détail précédent v3.40.1 : Correctif d\'affichage de la page de présentation « lien déjà utilisé » (Gestion Eau, ÉVO 2). Sur les emplacements des photos du domaine pas encore ajoutées, l\'icône de repère s\'affiche désormais systématiquement sur le fond vert AHUVI ; auparavant, selon l\'hébergement, le fond pouvait rester vide (sans l\'icône) parce qu\'un emplacement de photo manquant renvoie une page technique au lieu d\'une vraie « image absente ». Dès que les vraies photos seront ajoutées, elles recouvrent l\'icône et s\'affichent normalement. Aucun autre changement. (Détail précédent v3.40.0 : Nouvel écran quand un lien d\'invitation a déjà servi (Gestion Eau). Jusqu\'ici, ouvrir un lien d\'invitation « 1sakely.org/i/… » déjà utilisé (ou expiré, révoqué, inconnu) menait à un simple message d\'erreur. Désormais, une vraie page de présentation s\'affiche : un mot doux rappelle que le lien a déjà servi, puis la page présente le domaine Itampolo Resort à Nosy Be (le golf, la centrale solaire, le ponton, les Résidences) avec quelques photos, explique en deux courts paragraphes pourquoi l\'eau y est suivie avec soin, donne quatre astuces d\'utilisation, et propose enfin une petite fiche « Demander un accès » (nom, numéro WhatsApp, email facultatif, fonction, message facultatif). En validant la fiche, on se connecte avec le compte Google de son choix et la demande part vers l\'administrateur — aucun lien déjà utilisé n\'est réemployé. Si le lien est encore valide, l\'écran d\'inscription habituel reste exactement le même qu\'avant. Les photos du domaine apparaîtront dès qu\'elles seront ajoutées ; en attendant, la page reste élégante (fond vert AHUVI). Hors connexion, l\'application reste prudente et montre cette page de présentation plutôt qu\'une inscription qui pourrait ne pas aboutir. (Détail précédent v3.39.0 : Inviter plusieurs personnes d\'un coup depuis le répertoire du téléphone (Gestion Eau). Sur l\'écran « Invitations & demandes », un administrateur peut maintenant appuyer sur « Importer du répertoire » pour choisir plusieurs contacts dans le carnet d\'adresses de son téléphone : le nom et le numéro WhatsApp de chacun sont remplis tout seuls (l\'adresse email aussi si elle existe), sans saisie une par une. On choisit ensuite un rôle commun (Releveur ou Administrateur) et une durée de validité commune (7, 30, 90 jours ou illimité), on peut corriger le nom/numéro ou retirer une ligne, puis « Créer les invitations » fabrique tous les liens d\'invitation d\'un coup. L\'application affiche alors la liste « Liens prêts à envoyer » : pour chaque personne, un bouton « Envoyer sur WhatsApp » ouvre WhatsApp avec le message et le lien tout prêts, et un bouton « Copier le lien ». WhatsApp s\'ouvre un contact à la fois (l\'envoi groupé automatique n\'existe pas gratuitement) : on touche « Envoyer » pour chacun. Cette fonction n\'existe que sur Android (Chrome) ; sur iPhone ou ordinateur, le bouton est affiché mais désactivé avec la mention « Disponible sur Android (Chrome) », et tout le reste de l\'écran (invitation à l\'unité par email ou par lien WhatsApp, validation des demandes reçues) fonctionne exactement comme avant. (Détail précédent v3.38.0 : Préparation (invisible) du prochain écran d\'invitation par lien (Gestion Eau). Deux briques sont posées côté serveur, sans rien changer à ce que vous voyez aujourd\'hui : (1) l\'application sait désormais demander si un lien d\'invitation « 1sakely.org/i/… » est encore utilisable ou non (déjà utilisé, expiré, révoqué, ou inconnu) — sans dévoiler aucune information personnelle ; le futur écran d\'accueil du lien s\'en servira pour proposer l\'inscription seulement quand le lien est valide, et afficher une page de présentation sinon. (2) La future fiche d\'accès pourra recueillir, en plus du nom et de l\'email, le numéro WhatsApp, la fonction et un message libre : ces informations seront jointes à la demande d\'accès envoyée à l\'administrateur. Hors connexion, l\'application reste prudente (elle considère un lien comme « non vérifiable » plutôt que de proposer une inscription trompeuse). Les écrans correspondants arrivent aux étapes suivantes. (Détail précédent v3.37.1 : Aperçu WhatsApp recentré : l\'image qui s\'affiche quand on partage un lien d\'invitation « 1sakely.org/i/… » est désormais composée bien au centre, pour qu\'elle reste entièrement lisible même quand WhatsApp la recadre en carré dans le fil de discussion. Avant, le grand pourcentage (par exemple « 76 % ») et les textes étaient calés à gauche : WhatsApp rognait les bords et on ne voyait plus que « % ». Tout (le pourcentage, « Niveau du bassin », la goutte « Gestion Eau AHUVI », la pastille de tendance et le bandeau d\'invitation) est maintenant ramené dans une zone centrale de sécurité et ne se fait plus couper. Pour que WhatsApp affiche bien la nouvelle image (il garde les aperçus en mémoire), il faut tester avec un NOUVEAU lien d\'invitation. (Détail précédent v3.37.0 : Aperçu WhatsApp du lien d\'invitation (Gestion Eau) — Phase 5 (finale). Désormais, quand on colle un lien d\'invitation « 1sakely.org/i/… » dans WhatsApp, un bel aperçu s\'affiche tout seul : une grande image aux couleurs AHUVI montrant le niveau actuel du bassin (en pourcentage, avec sa tendance) et le titre « Gestion Eau AHUVI », accompagnée d\'un court texte d\'invitation en français. En touchant l\'aperçu, on ouvre la page d\'accueil du lien, comme avant. Jusqu\'ici WhatsApp n\'affichait qu\'un lien nu, sans image ni texte, car il ne sait pas « lire » l\'application : l\'aperçu est maintenant préparé côté serveur au moment du partage. Si les chiffres ne sont pas disponibles, l\'image reste présentable avec un message général. À savoir : WhatsApp garde en mémoire l\'aperçu d\'un lien pendant plusieurs jours — comme chaque invitation a son propre lien, l\'aperçu est juste au premier partage et ne change plus ensuite pour ce même lien (sans importance : un lien = une personne). (Détail précédent v3.36.0 : Invitation par lien WhatsApp (Gestion Eau) — Phase 4 (écran pour créer et gérer les liens). L\'administrateur peut désormais, depuis l\'onglet « Invitations & demandes » du module Eau, inviter quelqu\'un de DEUX façons au choix grâce à deux onglets : « Email » (comme avant : on connaît l\'adresse Google de la personne) ou « WhatsApp » (nouveau : on n\'a que son numéro). En mode WhatsApp, on saisit le numéro, le nom (facultatif), le ou les rôles (Administrateur / Releveur / Client — pour un client, on coche ses compteurs) et la durée de validité du lien (7, 30, 90 jours ou illimité). À la création, l\'app génère un lien d\'invitation unique et secret « 1sakely.org/i/... » : un bouton « Envoyer sur WhatsApp » ouvre WhatsApp avec un message tout prêt contenant ce lien, et l\'on peut aussi « Copier le lien » ou « Copier le message ». Contrairement à l\'email, AUCUNE adresse Google n\'est imposée : la personne ouvre le lien, voit le niveau du bassin, puis se connecte avec le compte Google de son choix — son accès s\'active tout seul grâce au lien. Une nouvelle liste « Invitations par lien WhatsApp » montre chaque lien envoyé avec son statut (En attente / Acceptée / Expirée), sa date d\'expiration, et les actions Renvoyer (même lien), Copier le lien et Révoquer. L\'invitation par email et la validation des demandes reçues fonctionnent exactement comme avant. (Détail précédent v3.35.0 : Invitation par lien WhatsApp (Gestion Eau) — Phase 2 (page d\'accueil du lien). Quand l\'invité ouvre le lien d\'invitation reçu par WhatsApp, il arrive désormais sur une vraie page d\'accueil « Gestion Eau AHUVI », sans avoir besoin de se connecter : elle affiche le niveau actuel du bassin (en pourcentage, avec une flèche de tendance et la date du relevé), explique en quelques mots à quoi sert l\'application (suivi de l\'eau en temps réel, 100 % gratuit, fonctionne même sans connexion) et propose un seul bouton « Continuer avec Google ». En appuyant dessus, le lien secret est mémorisé puis la connexion Google démarre ; au retour, l\'accès s\'active tout seul et l\'invité atterrit directement au bon endroit selon son rôle (saisie du bassin pour un releveur/administrateur, espace personnel pour un client). Si les chiffres ne sont pas disponibles (hors connexion ou bassin non configuré), la page affiche un message d\'accueil simple sans chiffre. Si le lien n\'est plus valable (déjà utilisé ou expiré), un message clair l\'indique après la connexion, sans bloquer ni renvoyer ailleurs. (Détail précédent v3.34.0 : Invitation par lien WhatsApp (Gestion Eau) — Phase 1 (socle). Préparation d\'un 2ᵉ moyen d\'inviter quelqu\'un à l\'espace eau. Jusqu\'ici, pour donner un accès, il fallait connaître l\'adresse Google de la personne. Désormais l\'application sait aussi créer une invitation « par lien » : un lien d\'accès unique et secret, que l\'administrateur pourra envoyer par WhatsApp en ne connaissant que le numéro de téléphone — sans l\'adresse Google d\'avance. Quand la personne ouvre ce lien puis se connecte avec le compte Google de son choix, son accès (relevé, administration ou espace client avec ses compteurs) s\'active tout seul grâce au lien, quel que soit le compte utilisé. À cette étape, seule la « tuyauterie » est posée (côté serveur et dans l\'application) ; l\'écran pour créer ces liens et la page d\'accueil du lien arrivent aux étapes suivantes. Un lien peut avoir une date d\'expiration et ne sert qu\'une seule fois. L\'invitation par adresse Google (déjà en place) continue de fonctionner exactement comme avant, et l\'application reste utilisable hors connexion. (Détail précédent v3.33.0 : Invitation par email (Gestion Eau) — Phase 2 : l\'écran pour gérer les invitations arrive dans l\'application. Depuis l\'onglet « Invitations & demandes » du module Eau, un administrateur peut maintenant inviter quelqu\'un en remplissant son nom, son adresse Google, son numéro WhatsApp et son rôle (Administrateur, Releveur et/ou Client — pour un client, on choisit ses compteurs). Un bouton « Envoyer sur WhatsApp » ouvre WhatsApp avec un message tout prêt (lien d\'accès direct + rappel d\'utiliser bien CETTE adresse Google) : il n\'y a plus qu\'à appuyer sur Envoyer. La liste des invitations envoyées (en attente / acceptées) permet de renvoyer le message ou de révoquer une invitation pas encore utilisée. Les demandes d\'accès reçues continuent de se valider au même endroit. Dès que l\'invité se connecte avec l\'adresse Google indiquée, son accès s\'active tout seul (Phase 1). (Détail précédent v3.32.0 : Invitation par email (Gestion Eau) : un administrateur peut désormais pré-enregistrer une personne par son adresse Google et lui attribuer à l\'avance un rôle (relevé des compteurs, administration et/ou espace client avec ses compteurs). Dès que cette personne se connecte à BazarKELY avec l\'adresse Google invitée, son accès au module Eau s\'active tout seul, sans validation manuelle — et si elle est invitée comme client, son espace et ses compteurs sont créés automatiquement. (Pour l\'instant l\'invitation se dépose côté serveur ; l\'écran pour gérer ces invitations depuis l\'application arrivera à l\'étape suivante.) (Détail précédent v3.31.4 : Correctif navigation (verrou de module) : rafraîchir la page (F5 ou Shift+Ctrl+R) ou ouvrir directement l\'adresse d\'un module — Gestion Eau (/gestion-eau), Construction (/construction/…) ou une page budget BazarKELY (/transactions…) — vous maintient désormais EXACTEMENT là où vous étiez, dans tous les cas. Avant, dans le bref instant où l\'application restaurait votre connexion au démarrage, l\'adresse pouvait être remplacée par l\'écran de connexion, et au retour vous étiez renvoyé au tableau de bord BazarKELY au lieu de votre module. Désormais l\'écran de connexion s\'affiche sans changer l\'adresse, donc une fois la connexion restaurée vous restez sur votre module. Le seul moyen de changer de module reste le geste volontaire : logo en haut à gauche puis icône de la barre du bas. Bonus : si vous vous connectez avec Google depuis un lien profond (par exemple /gestion-eau alors que vous étiez déconnecté), vous revenez sur cette adresse après connexion. (Détail précédent v3.31.3 : ouvrir ou rafraîchir (F5) directement l\'adresse d\'un module (par exemple Gestion Eau /gestion-eau) vous y maintient désormais, au lieu de vous renvoyer au tableau de bord BazarKELY. La reprise automatique « revenir dans mon dernier module utilisé » est conservée, mais ne s\'applique plus que depuis l\'accueil neutre (/dashboard) : si vous arrivez par un lien, un signet ou un rechargement sur une adresse précise, vous restez exactement là. Le basculement de module via le logo en haut à gauche est inchangé. (Détail précédent v3.31.2 : Tableau de bord Eau : l\'icône d\'une carte bassin ouvre maintenant directement le bon onglet de saisie — Stock → Niveau, Entrées → Entrée, Débit → Débit. Avant, on tombait toujours sur Niveau quelle que soit la carte touchée. Les cartes compteur et le reste sont inchangés. (Détail précédent v3.31.1 : Correctif d\'affichage (Gestion Eau, sur téléphone) : sur les écrans du module Eau, la dernière carte du bas d\'une page n\'est plus masquée par la barre de navigation du bas — un petit espace apparaît désormais entre la carte et la barre, même quand les libellés des onglets passent sur deux lignes. Aucune autre fonction modifiée. (Détail précédent v3.31.0 : Tableau de bord Eau : chaque carte est maintenant cliquable — toucher le corps d\'une carte ouvre le détail (Tendances, ou Suivi pour le NRW et le Dernier bilan), toucher son icône ouvre directement la saisie correspondante (relevé bassin ou relevé compteur). Les sept cartes sont aussi rangées en deux colonnes : à gauche celles liées au bassin (Stock, Entrées, Débit), à droite celles liées aux compteurs (Conso du jour, NRW, Conso réseau, Autonomie). Les deux mini-graphiques et la carte « Dernier bilan » sont également cliquables. Rien d\'autre ne change : mêmes chiffres, mêmes couleurs, mêmes icônes. (Détail précédent v3.30.1 : Saisie du bassin (Gestion Eau) : vous pouvez maintenant choisir la date et l\'heure d\'un relevé de niveau ou d\'une entrée d\'eau, pour enregistrer une mesure faite plus tôt. Un nouveau champ « Date et heure » (facultatif) apparaît sous la note, dans les onglets Niveau et Entrée. Si vous le laissez vide, c\'est l\'instant présent qui est utilisé (comme avant) ; si vous le remplissez, le relevé est enregistré à la date choisie et apparaît au bon endroit sur la courbe. Une date dans le futur est refusée. (Détail précédent v3.30.0 : Sécurité du module Gestion Eau (Phase 2 — verrouillage des accès par rôle). Jusqu\'ici, même si l\'application affichait à chacun ce qui le concernait, les données de l\'eau (compteurs, relevés, factures, niveau du bassin commun) restaient techniquement accessibles côté serveur. Désormais, le serveur lui-même filtre tout selon votre rôle : un client ne voit QUE ses propres compteurs, relevés et factures — jamais ceux d\'un voisin, ni le bassin commun. Le releveur peut consulter les compteurs et le bassin et saisir des relevés, mais pas les factures ni la liste des clients. L\'administrateur garde l\'accès complet. Cette protection s\'applique partout, y compris si quelqu\'un essayait d\'interroger directement le serveur sans passer par l\'application. Le rattachement d\'un client par code et les demandes d\'accès passent maintenant par une voie sécurisée côté serveur. Aucune fonction visible n\'est retirée ; votre connexion (une seule fois) et le fonctionnement hors-ligne restent identiques. (Détail précédent v3.29.1 — Correctif : ouvrir ou rafraîchir directement l\'adresse du module Eau (/gestion-eau) ne vous renvoie plus par erreur au tableau de bord. Le problème survenait au tout premier affichage sur un appareil (cache vide) : le module n\'avait pas encore eu le temps de récupérer votre rôle (admin/releveur) auprès du serveur et concluait à tort « pas d\'accès ». Désormais, tant que vos droits ne sont pas confirmés (connexion lente), l\'app patiente proprement (et réessaie automatiquement) au lieu de vous éjecter ; en cas d\'échec durable, un écran clair « Vérification de votre accès… » avec un bouton « Réessayer » s\'affiche. Le renvoi vers l\'accueil ne se produit plus QUE si le serveur a bien répondu et que vous n\'avez réellement aucun rôle eau. Aucune autre fonction modifiée. (Détail précédent v3.29.0 : Sécurité du module Gestion Eau (Phase 1 — fondation identité). À l\'ouverture de l\'espace eau, l\'application vérifie désormais que vous êtes bien connecté avec VOTRE compte (la même session sécurisée que le reste de BazarKELY) avant d\'afficher quoi que ce soit. Concrètement : plus d\'éjection involontaire vers l\'accueil quand la connexion est lente (le module attend proprement votre session au lieu d\'abandonner), et si aucune session n\'est valide, un écran clair « Se reconnecter avec Google » s\'affiche. Votre connexion reste mémorisée : une seule connexion suffit, la session est conservée entre les fermetures de l\'app et les changements de page. Côté administrateur, la désignation du tout premier propriétaire de l\'espace eau se fait maintenant de façon fiable côté serveur. Aucune autre fonction modifiée ; les règles d\'accès restent ouvertes pour l\'instant (le verrouillage par rôle viendra en Phase 2). (Détail précédent v3.28.0 : Logo du module AHUVI Eau affiné : le logo de l\'en-tête Gestion Eau utilise désormais le visuel vectoriel officiel (carré sombre, jauge cyan, goutte d\'eau) — sans la lettre « A », avec un dégradé de goutte ajusté. Net à toute taille, sans requête réseau. Les autres modules (BazarKELY, Construction) gardent leur logo « B » inchangé et le clic sur le logo continue de basculer entre les modules. (Détail précédent v3.27.1 : Correctif menu Gestion Eau : le bouton « Mise à jour » du menu en haut à droite reste désormais DANS le module Eau (la page version s\'ouvre sous /gestion-eau/version au lieu de la route globale /app-version) — fini la sensation d\'être éjecté vers BazarKELY (le header AHUVI et la barre du bas du module restent en place). (Détail précédent v3.27.0 : Nouveau logo du module AHUVI Eau : dans l\'en-tête de la Gestion Eau, l\'ancien carré générique « B » est remplacé par le logo AHUVI Eau (carré sombre, jauge cyan, goutte d\'eau et lettre « A »). Les autres modules (BazarKELY, Construction) gardent leur logo « B » inchangé. Le clic sur le logo continue de basculer entre les modules. (Détail précédent v3.26.1 : Correctif scan de ticket — Quand vous supprimez (ou « restituez ») une dépense scannée, son ticket et ses lignes d\'article sont désormais supprimés EN MÊME TEMPS, sur l\'appareil comme dans le cloud : plus de données orphelines qui traînent. Les anciennes données orphelines déjà présentes ont aussi été nettoyées. Aucun changement visible sur la suppression des opérations normales ni des transferts. (Détail précédent v3.26.0 : Le scan de ticket gagne un 2ᵉ moteur, plus précis, qui s\'active TOUT SEUL quand vous avez Internet : Google Cloud Vision (lecture cloud haute précision). Hors-ligne, ou si le service en ligne tombe en panne / met trop de temps, l\'app bascule automatiquement sur la lecture locale gratuite Tesseract.js (Phase 1) — vous n\'êtes jamais bloqué. La clé du service reste cachée côté serveur (Netlify Function), jamais dans l\'application. Comme le texte lu en ligne est plus propre, le ticket est inséré directement plus souvent ; l\'écran de relecture n\'apparaît qu\'en cas de doute (lecture incertaine ou total ≠ somme des lignes). Le moteur réellement utilisé est tracé sur chaque ticket. Tout le reste de la Phase 1 est inchangé (création de la dépense = total, articles éditables, aucune image stockée).)))))))))))))))))))))))))))))))))))))))))))';
export const LAST_UPDATED = '2026-06-09';
export const APP_BUILD_DATE = '2026-06-09';
export const VERSION_HISTORY = [
  {
    version: '3.46.9',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : Phase 4 ÉLECTRICITÉ — finitions & pilotage. (1) Tableau de bord : carte KPI « Conso électrique » (icône Zap, tone gold) = somme par compteur de la dernière conso d\'intervalle exploitable (kWh), via getElecKpiData() (eauElecReleveService, lecture Dexie offline-first, état vide propre si 0 relevé / « 2ᵉ relevé attendu » si pas encore de conso) ; carte cliquable → /gestion-eau/releves?tab=elec (navigate interne). (2) Cas limite blindé : evaluerReleveElec ne signale plus « aberrant bas » quand conso === 0 (index identique = absence d\'usage légitime). (3) Doc FONCTIONNEMENT-MODULES.md : sous-système électricité (relevés kWh, coûts A/B/C→D, facture combinée, PDF, matrice d\'accès). Aides élec (elecReleves/elecCouts/factureCombinee), logo PDF dégradant, skip villa sans relevé, exclusion rupture, état vide client : déjà en place (Phases 1-3), vérifiés. tsc --noEmit OK, build OK.',
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
    description: 'feat(gestion-eau) : Phase 2 ÉLECTRICITÉ — saisie & suivi des relevés de compteur électrique (kWh). Service eauElecReleveService complété (miroir compteur eau sur eau_elec_releves_compteur) : evaluerReleveElec (rupture index< + conso=max(0,Δ) + detectAberrant via moyenne(historiqueConsoElec)+facteurAberrantFromConfig), historiqueConsoElec (deltas>0, saute rupture), addReleveElec (saveLocal upsert idempotent id client + agent_id getCurrentUserIdSync + created_at), updateReleveElec/deleteReleveElec (admin). Nouvel écran EauSaisieElecPage (copie adaptée de EauSaisieCompteurPage, kWh + icône Zap, ton or AHUVI) branché en sous-onglet « Électricité » (?tab=elec) de EauRelevesPage via EauTabs — mêmes compteurs que l\'eau (listCompteursActifs), dernier index, conso instantanée, confirmations rupture/aberrant (showConfirm), photo optionnelle, historique + BarChart 12 derniers (isAnimationActive=false). Écriture désactivée si isReadOnly (promoteur) ; accès admin+releveur via la garde de route existante de Relevés. Espace propriétaire EauClientPage (« Ma conso ») : section Électricité lecture seule par compteur (dernier index kWh + mini-BarChart conso, dégradation propre si aucun relevé). Helper fmtKwh + aide elecReleves. tsc OK, build OK.',
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
    description: 'fix(gestion-eau) : computeBilan plafonne l\'apport par débit à la pompe intermittente (FRACTION_POMPE). Suite/complément de v3.45.2 (qui corrigeait l\'AFFICHAGE estimé via consoEstimee.ts mais laissait computeBilan, donc les BILANS PERSISTÉS, « Conso réseau (période) », pertes/NRW et anomalies en débit×Δt → surestimés). Décision JOEL (questions fermées) : 1=corriger aussi le moteur ; facturation = compteurs uniquement (aucun impact montants). Changement : dans computeBilan, la branche apport par débit devient apport = débit × Δt × FRACTION_POMPE (la pompe se coupe au flotteur, pas de marche continue). FRACTION_POMPE (0,5) déplacée comme constante CANONIQUE dans utils/bilan.ts, ré-exportée par utils/projection.ts (importateurs inchangés). N\'impacte PAS override/entrées manuelles. Effet : « Conso réseau (période) » et pertes baissent vers le réaliste, fausses anomalies (apport gonflé → stock attendu trop haut) en moins. Les bilans DÉJÀ enregistrés gardent leurs valeurs jusqu\'à « Recalculer tous les bilans » (admin) ; les nouveaux sont corrects d\'emblée. consoEstimee.ts (affichage estimé) NON concerné → pas de double comptage. Tests computeBilan/débit adaptés (Δt 2h × 0,5 = valeurs inchangées) + 1 test FRACTION_POMPE. tsc OK, build OK, suite eau verte (hors eauNavRoles = échec pré-existant v3.46.0, et eauPhase4 environnemental).',
    changes: [
      'PARTAGÉ modules/gestion-eau/utils/bilan.ts : FRACTION_POMPE canonique + apport débit ×FRACTION_POMPE dans computeBilan',
      'modules/gestion-eau/utils/projection.ts : ré-export FRACTION_POMPE depuis bilan.ts',
      'modules/gestion-eau/__tests__/eauBassinDebit.test.ts : Δt 2h (compense ×0,5) + test FRACTION_POMPE',
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
    description: 'fix(gestion-eau) : conso estimée réaliste — ancrée sur le rythme observé au vidage (pompe intermittente). Validé chiffré en prod : la conso estimée (et la projection anti-zéro qui en hérite) surestimait massivement (tendance ~81,5 m³/j vs réel ~18,8 m³/j ; série 50–138 m³/j). Cause : apport = débit×Δt suppose la pompe en marche continue, or elle est intermittente → sur tout intervalle où le bassin NE MONTE PAS, débit×Δt surestime. (NB : la 1ʳᵉ approche « plafonner seulement les intervalles finissant au flotteur » testée en données live laissait consoBase≈5 m³/h → tendance 70,85, insuffisant ; corrigée vers l\'ancrage sur le vidage.) Nouveau helper PUR utils/consoEstimee.ts (calculerConsoEstimee + consoBaseM3hOf, 9 tests) : conso DIRECTEMENT OBSERVABLE uniquement sur les intervalles de VIDAGE (niveau baisse, pompe à l\'arrêt → conso = −Δstock) ; intervalles MONTANTS/PLATS (conso masquée par le remplissage) estimés par consoBase×Δt ; entrée manuelle = bilan direct max(0, entrée−Δstock). consoBase (m³/h) = moyenne du rythme des vidages (anti-circularité, aucune hypothèse de pompe) ; replis estimerAutonomie.consoMoyenneHeureM3 → débit×FRACTION_POMPE(0,5) → 0. Net de pertes = ×(1−0,30). Résultat live : consoBase 1,66 m³/h, série ~11–40 m³/j, tendance 22,5 m³/j (interval B 186→245 = 35 m³ au lieu de 95). eauTendanceService + eauBilanService rebranchés (SOURCE UNIQUE) ; bucket jour LOCAL (bucketByLocalDay). computeBilan/bilans persistés/NRW/Conso réseau période INCHANGÉS. tsc OK, build OK, 107 tests eau verts.',
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
    description: 'feat(gestion-eau) : conso du jour jamais 0 par absence de relevé (projection tendance + pertes réseau). Bug : « Conso du jour » (dashboard) et la courbe « Consommation par jour » (Tendances) retombaient à 0 les jours sans relevé de niveau, car la conso estimée ne bouclait que sur les relevés du jour (n=0 → 0). Règle métier : une absence de relevé n\'est PAS une conso nulle. Nouveau utils/projection.ts (pur, 7 tests) : projeterConsoJour() en cascade tendance3 → moyenne → débit borné (× 24 × FRACTION_POMPE 0,5 × (1−pertes), JAMAIS débit×24). Constante PERTE_RESEAU_DEFAUT_PCT=0,30 (NRW) dans utils/bilan.ts. getDashboardData() : anti-zéro (projection proratisée sur la fraction du jour écoulée) + champ consoJourSource (mesuree/estimee_intervalle/projection_*/zero_compteurs) ; carve-out 0 légitime si compteurs réels à 0 (aucune projection par-dessus une mesure). getTendances() : conso estimée NETTE des pertes + série consoProjeteeParJour comblant le trou jusqu\'à aujourd\'hui (pointillés) + projectionSource/aProjection. EauTendancesPage : 2ᵉ aire pointillée « projection (relevés en attente) » + légende. EauDashboard : mention selon la source (icône TrendingUp si projection). Bascule auto sur le métré dès 1 relevé compteur. Additif strict, isAnimationActive={false} conservé. tsc --noEmit OK, build OK, 98 tests eau verts.',
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
    description: 'feat(gestion-eau) : consommation ESTIMÉE par le débit des pompes (sans compteurs) + bascule auto vers le métré. Le graphique « Consommation par jour » (Tendances) et le chiffre « consommation du jour » (tableau de bord) étaient vides faute de relevés de compteurs (conso_m3). En attendant les compteurs, on expose une conso estimée déduite du débit, calculée À LA VOLÉE via computeBilan (formule unique, non modifiée) : consoReseauM3 = apport − Δstock, avec apport = débit × Δt quand aucune entrée manuelle, bornée ≥ 0. eauTendanceService.getTendances() ajoute consoEstimeeParJour + aDesCompteurs + debitDisponible (1 lecture supplémentaire : getDebitCourantM3h). eauBilanService.getDashboardData() ajoute consoJourEstimee et affiche l\'estimation du jour quand aucun compteur. Bascule auto : dès 1 relevé compteur, retour au métré (titre « métrée », sans mention « estimée »). UI : EauTendancesPage (3 états — métré / estimé avec badge + aide repliable / état vide « enregistrez un test de débit ») ; EauDashboard (mention « estimée (débit) » sous le chiffre). Additif strict, isAnimationActive={false} conservé. tsc --noEmit OK, build OK.',
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
    description: 'fix(pwa) : mise à jour 100% AUTOMATIQUE + rafraîchissement profond (anti-résidus d\'ancienne version). Cause : le registerSW.js généré (mode injectManifest) n\'enregistre que sw-custom.js SANS logique d\'auto-update, et sw-custom.ts ne faisait pas skipWaiting à l\'install → le nouveau SW restait « waiting » et l\'ancien continuait de servir des chunks périmés ; la seule voie était le bandeau manuel (standalone) qui ne purgeait pas les caches → résidus obligeant à se déconnecter/quitter. Correctifs : (1) sw-custom.ts : self.skipWaiting() à l\'install (auto-activation) + cleanupOutdatedCaches() + purge des caches OBSOLÈTES à activate (conserve precache/runtime courants + api-cache ; ne touche JAMAIS IndexedDB/Dexie → données + file de sync hors-ligne préservées) + clients.claim(). (2) useServiceWorkerUpdate : rechargement AUTOMATIQUE sur controllerchange (garde 1ʳᵉ installation via controller null + anti-boucle sessionStorage 10 s) + toast « Application mise à jour ✅ » au remontage. (3) UpdatePrompt : plus de bandeau — monte seulement le pilote d\'auto-update (rend null). (4) safariServiceWorkerManager : enregistre /sw-custom.js au lieu de /sw.js inexistant (fin du 404, idempotent avec registerSW.js) + bandeau bleu manuel neutralisé. Transition : les appareils encore sur l\'ancienne version récupèrent ce système au prochain relancement/màj manuelle, puis tout devient automatique. tsc --noEmit OK, build OK (sw-custom 23.98 kB).',
    changes: [
      'sw-custom.ts : skipWaiting à l\'install + cleanupOutdatedCaches + purge caches obsolètes (hors precache/runtime/api-cache, jamais IndexedDB) + clients.claim',
      'hooks/useServiceWorkerUpdate.ts : reload auto sur controllerchange (garde 1ʳᵉ install + anti-boucle 10 s) + toast post-update',
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
    description: 'feat(gestion-eau) : Phase 2 « invitation vitrine WhatsApp par JETON » — page vitrine publique /i/:token + capture jeton + atterrissage. Nouvelle route PUBLIQUE /i/:token (déclarée dans App.tsx au même niveau que /gestion-eau/accueil et /gestion-eau/scan, hors garde d\'auth) → composant lazy EauVitrinePage (charte AHUVI, mobile-first, une colonne) : en-tête léger 💧 « Gestion Eau AHUVI » + slogan + ligne d\'invitation ; bloc chiffres NON nominatifs via RPC publique eau_public_vitrine_stats() (anon, withTimeout 6000) → grand « {fill_pct} % » + libellé + tendance (TrendingUp/Down/Minus = en hausse/baisse/stable) + « Relevé du JJ/MM/AAAA » ; dégradation propre (slogan « Le suivi de l\'eau, clair et toujours à jour. » sans chiffre) si null/erreur/hors-ligne ; 3 bénéfices (Gauge/BadgeCheck/WifiOff) ; CTA unique « Continuer avec Google » (mémorise eau_pending_invitation_token = jeton de l\'URL + bazarkely_post_login_redirect = /gestion-eau/accueil, deep-link robuste au boot à froid sans garde de rôle pour éviter le rebond /gestion-eau→/dashboard, puis signInWithGoogle) ; aide repliable « Comment ça marche ? ». Le jeton est aussi capturé dès l\'arrivée (couvre le cas « déjà connecté »). Redirection post-claim ajoutée dans GestionEauContext.load : si claimPendingTokenInvitation renvoie un id (jeton fraîchement consommé), navigation vers invitationTargetPath(rôle) (releveur/admin → /gestion-eau/releves?tab=bassin&bt=niveau ; client → /gestion-eau/client) — une seule fois (jeton retiré au succès). Cas « déjà connecté en arrivant » : relance retryAccess() pour enchaîner le claim ; jeton invalide/expiré → message neutre « invitation invalide/expirée » sans éjection ni boucle. Additif (1 route + 1 page + redirection post-claim). tsc --noEmit OK, build OK.',
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
    description: 'feat(gestion-eau) : Phase 1 « invitation vitrine WhatsApp par JETON » — socle back + service + claim au login. 2ᵉ canal d\'invitation : l\'admin n\'a que le numéro WhatsApp (pas l\'email). On crée une invitation portant un jeton unique ; au 1er login Google (compte au choix de l\'invité), le JETON — et non l\'email — déclenche l\'octroi du rôle. SQL (idempotent, exécuté+vérifié via REST) : eau_invitations gagne token (index unique partiel WHERE token is not null), expires_at, invite_channel (\'email\'|\'whatsapp\', défaut email) ; email devient nullable. RPC SECURITY DEFINER eau_claim_invitation_by_token(p_token) (usage unique, idempotent même user, refuse jeton inconnu/expiré/déjà accepté ; upsert eau_roles, crée/active eau_comptes_client + compteurs si role_client) ; revoke execute from public,anon + grant authenticated (anon→401 42501). RPC PUBLIQUE eau_public_vitrine_stats() (grant anon) : agrégats NON nominatifs uniquement (% remplissage référencé flotteur + tendance + horodatage), dégrade en null si config/relevés manquants, jamais d\'erreur. Tests RPC (harnais transactionnel annulé, lecture REST) : jeton releveur→eau_roles.releveur=true + acceptee + idempotent + 2ᵉ user null + expiré null + client→compte actif + compteurs ✅. Code (additif, scopé module) : InvitationRow gagne token/expires_at/invite_channel (email nullable) ; Dexie v4 (index token) ; service eauInvitationService (generateInviteToken base64url 16o, buildInviteUrl /i/<token>, createWhatsappInvitation offline-first, claimPendingTokenInvitation best-effort lisant sessionStorage[eau_pending_invitation_token]) ; appel claimPendingTokenInvitation dans GestionEauContext.load juste après le claim email (en ligne, best-effort, avant lecture des rôles). Aucune nouvelle UI/écran (Phases 2-4). tsc --noEmit OK, build OK.',
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
    description: 'feat(gestion-eau) : Phase 2 « invitation par email » — UI admin (page « Invitations & demandes ») + envoi WhatsApp (wa.me). La page /gestion-eau/demandes (EauDemandesPage, sous garde admin) gagne : (1) un formulaire d\'invitation (nom optionnel, email Google requis et normalisé lower-case, numéro WhatsApp requis, rôles cumulables Admin/Releveur + option Client → multiselect compteurs) ; (2) à la création, un bouton « Envoyer sur WhatsApp » (+ « Copier le message » en secours) qui ouvre wa.me avec un message FR pré-rempli contenant le lien profond selon le rôle (Releveur/Admin → /gestion-eau/releves?tab=bassin&bt=niveau ; Client seul → /gestion-eau/client) et l\'email exact, en insistant sur l\'usage de CETTE adresse Google ; (3) une liste des invitations (en_attente puis acceptee, revoquee masquées) avec Renvoyer WhatsApp et Révoquer (en_attente uniquement, avec confirmation). La gestion des demandes reçues (valider/refuser) est conservée. Idempotence : createInvitation met à jour l\'invitation en_attente existante du même email (id + date conservés) au lieu d\'en créer une 2ᵉ. Helpers wa.me purs et testables dans eauInvitationService (normalizeWhatsappNumber : 0XXXXXXXXX → 261XXXXXXXXX ; invitationRoleLabel ; invitationTargetPath ; invitationDeepLink ; buildInvitationMessage ; buildWhatsappUrl). Aucune nouvelle table/SQL (tout posé en Phase 1). Pas de second header (shell partagé). Offline : création offline-first (saveLocal) ; si window.open échoue → repli « copier le message ». tsc --noEmit OK, build OK.',
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
    description: 'feat(gestion-eau) : Phase 1 « invitation par email » — socle + octroi automatique du rôle au 1er login Google. Un admin pré-enregistre une invitation (email Google, rôles admin/releveur/client cumulables, compteurs visibles pour un client). À la connexion de la personne avec cette adresse Google, son rôle est attribué SANS validation, et — si client — son compte client + compteurs sont créés/activés. SQL (idempotent, exécuté+vérifié) : table eau_invitations (PK id text, statut en_attente/acceptee/revoquee, compteur_ids jsonb), RLS active policy admin-only (eau_is_admin()), index partiel lower(email) WHERE en_attente ; RPC SECURITY DEFINER eau_claim_invitation() (cherche une invitation en_attente pour lower(auth.jwt()->>email), upsert eau_roles ON CONFLICT (user_id), crée/active eau_comptes_client si role_client, marque acceptee) ; revoke execute from public+anon, grant to authenticated. Tests RLS (transaction annulée) : anon→401 42501, authenticated sans invitation→null, invitation releveur→eau_roles.releveur=true + acceptee + 2ᵉ appel null (idempotent), invitation client→compte actif + compteurs, non-admin ne voit aucune invitation (0), admin voit (1). Code (additif, scopé module) : type InvitationLocal, store Dexie eau_invitations (v3, additif), eau_invitations dans PK_BY_TABLE + EAU_TABLES (sync), service eauInvitationService (claimInvitationForCurrentUser best-effort online + createInvitation/listInvitations/revokeInvitation pour la Phase 2), appel claimInvitationForCurrentUser dans GestionEauContext.load AVANT ensureRolesBootstrap (en ligne uniquement, best-effort, n\'écrit rien en local — le pull des rôles reflète l\'octroi). Aucune UI admin (Phase 2). tsc --noEmit OK, build OK.',
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
    description: 'PHASE 1 SÉCURITÉ du module gestion-eau (fondation session & identité, GO/NO-GO → GO). Aucune RLS restrictive introduite : les policies eau restent `public` (verrouillage = Phase 2). Diagnostic « anon » élucidé : la session Supabase EST authentifiée (JWT role=authenticated, sub == users.id), le client partagé porte le JWT sur toutes les requêtes eau ; la cause réelle du « anon » historique est une COURSE AU BOOT sur réseau lent (au montage, Zustand persisté pas encore réhydraté + getSession() pas prêt → getCurrentUserIdSafe() null → rôles vides → redirect /dashboard, et une écriture précoce dans cette fenêtre partirait sans Authorization = anon → 401 sous une policy authenticated). Le passage en `public` (S85) avait masqué ce symptôme. (B) Garantie de session au montage : nouveau waitForEauSession (eauAuth, lecture localStorage en retries, jamais de réseau, jamais de getUser) absorbe la course au boot ; GestionEauContext expose sessionStatus (checking/valid/needs-reauth/mismatch) calculé à partir de getSession + identité (session.user.id === store.user.id) ; GestionEauRoute affiche un spinner en « checking » (plus de redirect prématuré), l\'écran EauReauthScreen (« Se reconnecter avec Google ») en « needs-reauth »/« mismatch », et ne redirige vers /dashboard que si la session est fiable mais sans rôle. Aucune 2ᵉ identité créée ; persistSession + autoRefreshToken inchangés (connexion une seule fois, session conservée entre pages/fermetures) ; offline préservé (session déjà établie → lecture Dexie). (C) Bootstrap propriétaire CÔTÉ SERVEUR : nouvelle RPC idempotente eau_bootstrap_admin() (SECURITY DEFINER) qui pose admin=true sur auth.uid() uniquement si aucun admin n\'existe ; ensureRolesBootstrap appelle supabase.rpc + pullTable(eau_roles), suppression de l\'ancien setRoles()+push direct de la ligne admin (offline : lecture locale sans push). tsc --noEmit OK, build OK.',
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
    description: 'PHASE 2 du « Scan de ticket » : 2ᵉ moteur OCR EN LIGNE haute précision (Google Cloud Vision) avec bascule automatique online/offline. La clé Google Vision reste CÔTÉ SERVEUR via une Netlify Function `/.netlify/functions/ocr-receipt` (POST image base64 → DOCUMENT_TEXT_DETECTION, languageHints fr → { text, confidence }) — jamais dans le bundle client (vérifié : GOOGLE_VISION_API_KEY et vision.googleapis.com absents de dist). ocrService.recognize() : en ligne → recognizeOnline (appel fonction, withTimeout 12 s) ; hors-ligne OU échec/timeout/texte vide/quota Vision → repli SILENCIEUX recognizeOffline (Tesseract, Phase 1) — aucun blocage utilisateur. Chaque résultat porte engine = google_vision | tesseract, tracé dans transaction_receipts.ocr_engine. Le parsing (receiptParser) reste COMMUN aux deux moteurs (texte Vision plus propre → meilleurs résultats sans dupliquer la logique). Seuil de confiance par moteur : Tesseract prudent (0,75, revue plus fréquente), Vision plus permissif (0,60) car texte propre — la cohérence Σ lignes ≈ total reste le vrai garde-fou (confidenceThresholdFor). Dégradation propre : hors-ligne = aucun appel réseau ; en ligne mais Vision KO = repli Tesseract + log. Function : limite taille image (≤ 8 Mo base64 → 413), gestion clé absente (503), erreur/quota Vision (502), timeout (504, AbortController 10 s). Aucune dépendance npm ajoutée (fetch/Buffer/AbortController natifs Node 20). tsc (gate --noEmit) OK, build OK, 20 tests Phase 1 non régressés.',
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
    description: 'PHASE 1 du « Scan de ticket de caisse », intégrée au flux Transactions (pas un nouveau module). Depuis /add-transaction (dépenses ponctuelles), un bouton « Scanner un ticket » (icône ScanLine + aide ⓘ dépliable) ouvre la caméra arrière (input capture=environment, repli galerie). L\'image est pré-traitée en mémoire (downscale ~1500px + niveaux de gris, jamais stockée) puis lue HORS-LIGNE et gratuitement par Tesseract.js (langue fra, OEM LSTM, worker+cœur WASM simd-lstm+données servis depuis /public/tesseract — aucun CDN runtime ; assets PRÉCACHÉS par le service worker pour un OCR 100% hors-ligne). Parsing pur et testé (receiptParser) : fournisseur (1ʳᵉ ligne textuelle), lignes d\'article (libellé/quantité via « 2 x 1500 »/prix), total (TOTAL/NET/À PAYER sinon Σ lignes), exclusion TVA/rendu/dates/moyens de paiement, score de confiance (confiance OCR + cohérence Σ vs total). « Correction si doute » : confiance ≥ seuil (0,75) ET cohérent → insertion directe ; sinon écran de relecture/correction (fournisseur, lignes éditables, compte, catégorie suggérée, date). Création : 1 transaction expense (montant = total) + N transaction_items + 1 transaction_receipts (avec receipt_md, seule trace conservée — aucune image). Détail transaction : carte « Articles du ticket » (fournisseur + lignes + total) avec édition inline (corriger/ajouter/supprimer → recalcul du total ET ajustement du solde du compte) + « Voir le ticket » (markdown). Catégorie suggérée (historique fournisseur puis mots-clés), jamais bloquante. Offline-first : Dexie v17 (transactionReceipts/transactionItems), sync Supabase idempotente (id client, upsert onConflict, rejeu ignoreDuplicates) ; tables transaction_receipts/transaction_items + RLS user_id=auth.uid(). Dépendance ajoutée : tesseract.js (assets locaux ~7,2 Mo précachés). tsc --noEmit OK, build OK, 20 tests (parser + recalcul total + rendu carte).',
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
    description: 'ÉVOLUTION « Aide contextuelle » du module gestion-eau : chaque écran et chaque action explique « à quoi ça sert » et « comment s\'en servir » via un panneau d\'aide dépliable, pour des utilisateurs non techniques. (A) Nouveau composant réutilisable EauAide : bouton ⓘ « Aide » discret près du titre + sous-titre cliquable, qui déplient/replient un panneau structuré (À quoi ça sert / Comment s\'en servir). Accessible (aria-expanded, aria-controls, focus), charte AHUVI (vert/or, fond clair), mobile-first. État mémorisé par écran en localStorage (eau_aide_<id>) : replié par défaut, sauf 1ʳᵉ visite (déplié). (B) Aide branchée sur TOUS les écrans/onglets : Tableau de bord, Relevés (général), Saisie bassin (aide PAR onglet : Entrée / Niveau / Débit), Saisie compteur, Tournée, Scan, Suivi (Anomalies / Tendances), Compteurs, Carte, Facturation, Configuration, Utilisateurs, Demandes, Annonces, Audit, Centre d\'alertes, Rapports, Espace client, Page d\'accueil. (C) Intégration via prop `aide` de EauPageShell (bouton + sous-titre + panneau, état unique partagé) pour les écrans à shell, et composant EauAide autonome pour les emplacements hors shell (bandeau Relevés, onglet Scan, onglets bassin, Tournée, Carte, Accueil). Textes centralisés (eauAideTextes.ts). Évolution 100 % additive (aucune régression, aucun SQL). 5 tests ajoutés (rendu, 1ʳᵉ visite dépliée, mémorisation repli, toggle + persistance, couverture du catalogue).',
    changes: [
      'Nouveau composant components/EauAide.tsx (hook useAideState + AideToggleButton + AidePanel + EauAide autonome)',
      'Nouveau catalogue components/eauAideTextes.ts (22 entrées d\'aide, français simple)',
      'EauPageShell : prop optionnelle `aide` (bouton ⓘ près du titre, sous-titre cliquable, panneau sous l\'en-tête, état unique)',
      'Aide branchée sur tous les écrans à shell (Dashboard, SaisieCompteur, Anomalies, Tendances, Compteurs, Facturation, Config, Utilisateurs, Demandes, Annonces, Audit, Client, Alertes, Rapports)',
      'Aide autonome sur les écrans/onglets hors shell : Relevés (général + Scan), Saisie bassin (Entrée/Niveau/Débit), Tournée, Carte, Accueil',
      '5 tests RTL (eauAide.test.tsx) : rendu, 1ʳᵉ visite dépliée, mémorisation du repli, toggle + persistance localStorage, couverture du catalogue',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.22.0',
    date: '2026-06-05',
    description: 'ÉVOLUTION « bassin/débit » du module gestion-eau (modèle physique affiné + mesure de l\'apport). (A) Modèle bassin flotteur/trop-plein : la Configuration saisit désormais Longueur, Largeur, Hauteur flotteur (arrêt pompes — plafond opérationnel, référence du % de remplissage) et Hauteur trop-plein (sécurité) + écart débit max (%). Déductions centralisées et affichées en lecture seule : surface S = L×l, volume utile = S×Hf, volume sécurité = S×Htp, m³/cm = S×0,01 (ex. 14×7×2,50 → 98 m², 245 m³, 0,98 m³/cm ; trop-plein 2,90 → 284,2 m³). (B) Tests de débit des pompes « vanne fermée » (Relevés → onglet Bassin → mode Débit) : niveau début/fin (cm) + durée (min) → Q_in (m³/h) = S × (Δniveau/100) ÷ (durée/60) ; historique des tests + débit courant (dernier) mis en évidence ; écart % vs précédent ; alerte « débit instable » si écart > seuil (déf. 15 %). Nouvelle table eau_debit_tests. (C) Conso réseau & pertes recalculées : apport = Q_in×Δt (ou volume manuel en override) ; conso réseau = apport − Δstock ; pertes = conso réseau − Σ compteurs ; NRW = pertes / conso réseau. Bilans enrichis (apport_m3, conso_reseau_m3, pertes_m3, debit_m3h_utilise). (D) Autonomie estimée = stock courant ÷ conso horaire moyenne (+ date de vidage prévue), conso moyenne/jour. (E) Tableau de bord : cartes Débit courant, Conso réseau, NRW (modèle réseau), Autonomie ; % remplissage référencé au flotteur. (F) Alertes ajoutées : « flotteur défaillant » (niveau mesuré > flotteur → risque débordement) et « débit instable » — via le centre d\'alertes + notificationService existants. Rétrocompatible : sans test de débit, repli automatique sur la saisie manuelle d\'entrées (aucune casse). Offline-first (Dexie v2) + sync idempotente (id client, upsert). 15 tests ajoutés (107 tests eau au total).',
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
    description: 'Création de prêt (AddTransactionPage, catégories "prêt accordé" et "prêt reçu") : une icône répertoire 📇 apparaît à droite du champ Bénéficiaire/Prêteur sur les appareils qui supportent l\'API Contact Picker (Chrome/Edge Android, HTTPS). Le clic ouvre le sélecteur de contacts natif d\'Android et remplit automatiquement le nom + le téléphone. Si le contact a plusieurs numéros, une petite fenêtre "Quel numéro ?" laisse choisir. Sur iOS/desktop (API absente), aucune icône : saisie clavier classique préservée (l\'autocomplétion des bénéficiaires connus reste intacte). Le téléphone du prêt accordé est désormais aussi CONSERVÉ dans la fiche (auparavant perdu après le lien WhatsApp). Un champ téléphone est ajouté au prêt reçu (numéro du prêteur rangé dans borrower_phone, inutilisé pour ce type ; bouton WhatsApp prêteur à venir).',
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
      'Documentation: ETAT-TECHNIQUE-COMPLET.md section "🔄 SYNCHRONISATION ET OFFLINE" entièrement réécrite avec audit daté du 2026-05-10 (5 services, 7 écrans, 8 problèmes priorisés, plan de remédiation)',
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
