# Recette de Joël : jeu H (droits et saisie), Relevé terrain 3.157.0

À faire sur 1sakely.org/releve/, avec deux téléphones et quatre comptes Google à vous.

## Avant de commencer

**Les quatre comptes**
- **P** = le propriétaire (par exemple votre compte habituel).
- **R** = l'invité « relever » (un deuxième compte Google à vous).
- **C** = l'invité « consulter » (un troisième compte).
- **N** = un compte sans aucun partage (un quatrième compte).

**Les deux téléphones**
- **Téléphone 1** : toujours connecté au compte P.
- **Téléphone 2** : il change de compte selon le cas (R, C ou N). Pour changer : menu du haut, « Se déconnecter », puis rouvrir 1sakely.org/releve/ et se connecter avec le compte demandé. Si la déconnexion est refusée parce que des saisies attendent, attendez le réseau (bandeau « Tout est envoyé »).

**Préparation sur le téléphone 1 (compte P)**
- Créer le domaine « Domaine 1 » avec les chantiers « Chantier 1 » et « Chantier 2 ».
- Créer le domaine « Domaine 2 » avec le chantier « Chantier 3 ».
- Attendre le bandeau « Tout est envoyé ».

**Envoyer une invitation (téléphone 1, compte P)** : bouton ⋯ du domaine, « Partager ce domaine » (ou bouton ⋯ du chantier, « Partager ce chantier »), cocher, choisir le droit, « Préparer le message WhatsApp ». Envoyez le message à vous-même dans WhatsApp, puis ouvrez le lien sur le téléphone 2.

**Si l'application ne montre pas la nouvelle version** : bandeau jaune « Nouvelle version disponible », le toucher.

## Les cas

### DR1 : partage par lien
- [ ] Téléphone 1 (P) : partager « Chantier 1 » en « relever » (message 1), puis « Tout le domaine Domaine 1 » en « consulter » (message 2).
- [ ] Le message commence par « *RELEVÉ TERRAIN : INVITATION* » et donne un lien 1sakely.org/releve/i/...
- [ ] Dans WhatsApp, l'aperçu du lien montre « Relevé terrain : invitation ».
- [ ] Téléphone 2, sans être connecté : ouvrir le lien 1. L'écran « Vous êtes invité » montre De : P, Domaine : Domaine 1, Chantier : Chantier 1, Droit : relever.
- [ ] Toucher « Se connecter et accepter », se connecter avec le compte **R**. L'accueil s'ouvre sur « Partagés avec moi ».
- [ ] Téléphone 2 (R) voit : Domaine 1, « Propriétaire : P », Chantier 1 avec la pastille verte « relever ». Pas de Chantier 2, pas de Domaine 2.
- [ ] Téléphone 2 : se déconnecter, ouvrir le lien 2, accepter avec le compte **C**.
- [ ] Téléphone 2 (C) voit : Domaine 1, « Propriétaire : P, tout le domaine », Chantier 1 et Chantier 2 avec la pastille grise « consulter ». Pas de Domaine 2.
- [ ] Téléphone 2 : se connecter avec **N**. « Partagés avec moi » n'apparaît pas.

### DR2 : chantier créé plus tard
- [ ] Téléphone 1 (P) : créer « Chantier 4 » dans Domaine 1.
- [ ] Téléphone 2 (C) : Chantier 4 apparaît dans « Partagés avec moi », « consulter » (attendre une minute ou rouvrir l'application).
- [ ] Téléphone 2 (R) : Chantier 4 n'apparaît pas.

### DR3 : R crée et tient un relevé
- [ ] Téléphone 2 (R) : ouvrir Chantier 1, « + Nouveau relevé », nom « R1 ». Le bandeau dit « Vous tenez la saisie ».
- [ ] Téléphone 1 (P) : ouvrir R1. Le bandeau dit « En saisie sur le téléphone de R depuis le JJ/MM à HH:MM. Lecture seule. »

### DR4 : P ne peut pas prendre la saisie de R1
- [ ] Téléphone 1 (P) : sur R1, pas de bouton « Prendre la saisie » ; seul « Reprendre la saisie » (propriétaire) est proposé. Ne pas le toucher ici.

### DR5 : C consulte seulement
- [ ] Téléphone 2 (C) : dans Chantier 1, pas de « + Nouveau relevé », pas de bouton ⋯, la phrase « Vous consultez ce chantier ».
- [ ] Ouvrir R1 : barre du bas avec Carte et Résultats seulement (pas de Saisir), pas de « Prendre la saisie ».
- [ ] Résultats : l'export (tableau des points, plan, sauvegarde) marche.

### DR6 : stations en mode avion
- [ ] Téléphone 2 (R) : mode avion, saisir S01 à S03 du jeu B dans R1. Le bandeau dit « 3 saisies en attente d'envoi ».
- [ ] Couper le mode avion, ne rien toucher : le bandeau passe à « Tout est envoyé ».
- [ ] Téléphone 1 (P) : R1 montre S01, S02, S03, une seule fois chacune.

### DR7 : Terminer la saisie en mode avion
- [ ] Téléphone 2 (R) : mode avion, « Terminer la saisie ». Message « Fin de saisie enregistrée : elle partira au retour du réseau ».
- [ ] Couper le mode avion : le bandeau passe à « Saisie libre ».
- [ ] Téléphone 1 (P) : « Prendre la saisie » sur R1 marche, puis « Terminer la saisie ».

### DR8 : reprise par le propriétaire
- [ ] Téléphone 2 (R) : prendre la saisie de R1, mode avion, saisir S04 et S05.
- [ ] Téléphone 1 (P) : sur R1, « Reprendre la saisie » : un avertissement s'affiche, confirmer.
- [ ] Téléphone 2 (R), toujours en mode avion : saisir S06 et S07, puis couper le mode avion.
- [ ] Téléphone 2 (R) : message « Saisie reprise par le propriétaire », R1 en lecture seule ; une nouvelle station est refusée.
- [ ] Téléphone 1 (P) : S04 à S07 apparaissent avec la pastille jaune « arrivé après reprise ».

### DR8b : R ne peut pas reprendre
- [ ] Téléphone 2 (R) : sur R1 tenu par P, aucun bouton « Reprendre la saisie ».

### DR9 : R supprime seulement ses relevés
- [ ] Téléphone 1 (P) : créer le relevé « P1 » dans Chantier 1, puis « Terminer la saisie ».
- [ ] Téléphone 2 (R) : bouton ⋯ de P1 : seulement « Dupliquer » (pas « Supprimer le relevé »).
- [ ] Téléphone 2 (R) : bouton ⋯ d'un relevé créé par R (créer « R3 » s'il le faut) : « Supprimer le relevé », confirmer : il disparaît.

### DR10 : passage de R en « consulter » pendant qu'il tient la saisie
- [ ] Téléphone 2 (R) : créer « R4 », mode avion, saisir une station.
- [ ] Téléphone 1 (P) : ⋯ du domaine, « Qui a accès », compte de R, ligne Chantier 1, « Changer le droit » : le message « Sa saisie en cours sera libérée et ses saisies non envoyées n'entreront pas. » s'affiche, confirmer. La pastille passe à « consulter ».
- [ ] Téléphone 2 (R) : couper le mode avion. Message « Vous n'avez plus le droit de relever ici ». La station reste sur le téléphone, exportable en sauvegarde ; elle n'apparaît pas chez P.
- [ ] Téléphone 1 (P) : remettre le droit de R sur « relever ».

### DR11 : retrait du partage de R
- [ ] Téléphone 1 (P) : « Qui a accès », compte de R, ligne Chantier 1, « Retirer », confirmer.
- [ ] Téléphone 2 (R) : rouvrir l'application avec du réseau : Domaine 1 a disparu de « Partagés avec moi ».
- [ ] Téléphone 1 (P) : les stations envoyées par R restent dans R1.

### DR12 : un invité ne partage pas et ne renomme pas
- [ ] Téléphone 2 (R, à réinviter sur Chantier 1 si besoin) : bouton ⋯ de Chantier 1 : ni « Partager », ni « Qui a accès », ni « Renommer ».
- [ ] Téléphone 2 (R) : taper dans la barre d'adresse 1sakely.org/releve/d/<n'importe quoi>/partager : « Réservé au propriétaire du domaine. »
- [ ] Téléphone 2 (C) : pas de bouton ⋯ sur Chantier 2, aucun moyen de le renommer.

### DR13 : lien déjà utilisé
- [ ] Téléphone 2, compte **N** : ouvrir le lien 1 (déjà accepté par R). Message « Invitation plus valable : elle a déjà été acceptée ou elle a été retirée. Demandez-en une nouvelle au propriétaire. »

### DR14 : second téléphone du propriétaire
- [ ] Téléphone 2 : se connecter avec **P**. Domaine 1, Domaine 2, leurs chantiers et leurs relevés apparaissent, à jour.

### DR15 : le plus précis l'emporte
- [ ] Téléphone 1 (P) : partager « Tout le domaine Domaine 1 » en « relever » à R, puis « Chantier 2 » en « consulter » à R (deux messages, R accepte les deux).
- [ ] Téléphone 1 (P), « Qui a accès » : compte de R avec deux lignes et la phrase « Sur Chantier 2, R ne fait que consulter : le partage du chantier passe avant celui du domaine. »
- [ ] Téléphone 2 (R) : Chantier 1 et Chantier 4 en « relever », Chantier 2 en « consulter » (pas de « + Nouveau relevé » dans Chantier 2).

### DR16 : retrait du partage du chantier
- [ ] Téléphone 1 (P) : « Qui a accès », compte de R, ligne Chantier 2, « Retirer ».
- [ ] Téléphone 2 (R) : Chantier 2 repasse en « relever » ; « + Nouveau relevé » revient.

### DR17 : lien ancien
- [ ] Téléphone 1 (P) : préparer une invitation et la garder sans l'ouvrir plusieurs jours (l'essai au bureau a simulé 30 jours).
- [ ] Ouvrir le lien plus tard avec un compte : il est accepté.
- [ ] Téléphone 1 (P) : une invitation non ouverte apparaît dans « Qui a accès », rubrique « Invitation en attente » ; « Retirer l'invitation » la rend inutilisable.

### DR18 : relevé créé en mode avion
- [ ] Téléphone 2 (R) : mode avion, créer « R2 » dans Chantier 1 et saisir S01. Le bandeau dit « Vous tenez la saisie ».
- [ ] Couper le mode avion.
- [ ] Téléphone 1 (P) : R2 et S01 apparaissent, « En saisie sur le téléphone de R ».

## Facultatif
- [ ] Aperçu Facebook : sur developers.facebook.com/tools/debug, coller un lien d'invitation : titre « Relevé terrain : invitation » et l'image jaune et noire.

## À la fin
- Téléphone 1 (P) : supprimer Domaine 1 et Domaine 2 (bouton ⋯, « Supprimer le domaine »).
- Me dire les cases qui ne sont pas cochées, avec une capture d'écran.
