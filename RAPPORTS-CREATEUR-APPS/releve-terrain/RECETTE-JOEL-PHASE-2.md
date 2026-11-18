# Recette de Joël : Relevé terrain, phase 2 (version 3.154.0)

Sur ton téléphone Android, avec Chrome. Durée : environ 30 minutes. Pas de compte à créer : tout reste sur le téléphone.

Comment saisir un nombre : touche le champ, le pavé s'ouvre en bas ; la virgule est la touche « , » ; pour un nombre négatif, touche d'abord la touche moins ; termine par « OK ». Coche chaque case quand tu as bien lu la valeur indiquée.

## 1. Installer (avec du réseau)

- [ ] Ouvre Chrome à l'adresse `https://1sakely.org/releve/`.
- [ ] Menu de Chrome (les trois points) : « Ajouter à l'écran d'accueil » ou « Installer l'application ». L'icône « Relevé » apparaît sur l'écran d'accueil.
- [ ] Ouvre l'outil depuis l'icône. Menu en haut à droite : « Version de l'outil ». Tu lis **3.154.0** et **Prêt pour le mode avion**. Ferme.

## 2. Passer en mode avion

- [ ] Active le mode avion du téléphone (et coupe le Wi-Fi s'il reste allumé). Tout le reste de la fiche se fait en mode avion, jusqu'à l'étape 8.

## 3. Domaine et chantier

- [ ] Touche « + Nouveau domaine foncier », nom : `Essai Joël`, « Créer le domaine ».
- [ ] Sur le domaine, touche les trois points, « + Nouveau chantier », nom : `Premier chantier`, « Créer le chantier ».

## 4. Jeu A : calage des bornes

- [ ] « + Nouveau relevé », nom : `Calage A`, « Créer le relevé ». L'écran « Étape 1 : les bornes » s'ouvre.
- [ ] Saisis les trois bornes :

| Borne | Nom de l'endroit | X | Y | Altitude |
|---|---|---|---|---|
| A | Borne ouest | 0 | 0 | 38,11 |
| B | Borne nord | 47,29 | 22,67 | 26,83 |
| C | Borne sud-est | 69,15 | −17,32 | 21,33 |

- [ ] Touche « Étape suivante : caler les bornes ». L'écran « Étape 2 : caler les bornes » s'ouvre.
- [ ] Pour chaque côté, saisis les 3 lectures (distance puis pente, sens « de A vers B » laissé tel quel) et les deux valeurs du décamètre :

| Côté | Lecture 1 | Lecture 2 | Lecture 3 | Décamètre aller | Décamètre retour |
|---|---|---|---|---|---|
| A vers B | 53,64 et −12,1 | 53,67 et −12,0 | 53,62 et −12,2 | 53,64 | 53,68 |
| B vers C | 45,93 et −6,9 | 45,88 et −6,8 | 45,92 et −6,9 | 45,80 | 45,77 |
| A vers C | 73,28 et −13,1 | 73,23 et −13,2 | 73,19 et −13,3 | 73,27 | 73,22 |

- [ ] Carte « Cap A vers B » : pose le téléphone à plat et touche « Lire la boussole ». Une valeur s'affiche après 2 secondes immobile (ou le message « Pas de boussole sur ce téléphone »). Note la valeur lue : ........ (elle ne vaut 74,4 que sur le vrai terrain).
- [ ] Touche « Saisir le cap à la main » et tape **74,4**. Tu lis : « Cap lu 74,4° ; déclinaison 10° ; cap corrigé 64,4° ».
- [ ] Sous chaque côté, lis :

| Côté | Distance retenue | Écart décamètre et appareil | Biais de l'appareil | Dénivelé | Couleur |
|---|---|---|---|---|---|
| A vers B | 52,468 m | +0,016 m | −0,017 m | −11,245 m | VERT |
| B vers C | 45,457 m | −0,124 m | +0,125 m | −5,489 m | ORANGE |
| A vers C | 71,310 m | +0,011 m | −0,012 m | −16,723 m | VERT |

- [ ] Carte « Résultat du calage » : boucle des dénivelés **−0,011 m VERT** ; bornes placées A **0,000 0,000 38,110**, B **47,312 22,681 26,865**, C **69,217 −17,150 21,382** ; résultat du calage **ORANGE**.
- [ ] Carte « Contrôle du plan de masse » : position de B **0,025 m VERT**, position de C **0,182 m ORANGE**, altitude de B **+0,035 m VERT**, altitude de C **+0,052 m VERT**, cap A vers B (plan 64,4°) écart **0,0° VERT**.
- [ ] Touche « Étape suivante : valider le calage et relever » : l'écran des stations s'ouvre. Reviens à l'accueil par le menu.

## 5. Jeu B : trois stations normales

- [ ] Dans « Premier chantier », « + Nouveau relevé », nom : `Stations B`.
- [ ] Saisis les noms et les X, Y, altitudes des trois bornes (même tableau qu'à l'étape 4), puis touche le lien « Bornes déjà calées : les saisir comme vérifiées et sauter le calage ». L'écran des stations s'ouvre.
- [ ] Pour chaque station, saisis distance et pente vers A, B et C, puis « Calculer la station ». Le résultat paraît aussitôt (moins d'une seconde). Lis :

| Station | A | B | C | X | Y | Altitude du sol | Écart d'altitude | Indice | Couleur |
|---|---|---|---|---|---|---|---|---|---|
| S01 | 20,57 et 13,6 | 36,06 et −10,3 | 53,47 et −12,9 | 19,993 | 0,006 | 33,274 | 0,010 | 1,55 | VERT |
| S02 | 31,26 et 13,3 | 25,05 et −9,4 | 46,07 et −12,0 | 30,006 | 5,006 | 30,918 | 0,013 | 1,34 | VERT |
| S03 | 41,15 et 13,6 | 23,87 et −3,9 | 34,65 et −11,9 | 39,998 | −0,002 | 28,455 | 0,041 | 1,19 | VERT |

- [ ] Après chaque station, « Station suivante ». Continue avec trois stations de plus, toujours dans « Stations B » :

| Station | A | B | C | X | Y | Altitude du sol | Couleur |
|---|---|---|---|---|---|---|---|
| S04 | 46,99 et 13,4 | 30,76 et −0,7 | 26,55 et −12,8 | 45,000 | −8,001 | 27,211 | VERT |
| S05 | 56,58 et 13,6 | 24,03 et 4,7 | 22,64 et −8,9 | 54,993 | −0,005 | 24,843 | VERT |
| S06 | 37,94 et 12,8 | 16,53 et −10,1 | 45,79 et −10,6 | 35,000 | 11,999 | 29,728 | VERT |

## 6. Jeu F : la station S06 devient la borne éphémère D

- [ ] Sur le résultat vert de S06, touche « Faire de cette station une borne éphémère ». Tu lis « Accepté » et le rang **1**. Touche « Continuer ».
- [ ] La lettre proposée est **D**. Nom de l'endroit : `Piquet du manguier`. Tu lis « Depuis la station S06 : X 35,000 ; Y 11,999 ; altitude 29,728 ». Touche « Créer la borne D et revenir à la saisie ».
- [ ] De retour sur la saisie, il y a maintenant 4 lignes : A, B, C et D. Le bouton « Calculer la station » reste visible sans faire défiler.

## 7. Jeu C, cas E1 : une lecture fausse vers B

- [ ] Nouvelle station (ce sera S07) : A **31,26 et 13,3** ; B **27,05 et −9,4** ; C **46,07 et −12,0** ; sur la ligne D, touche « pas visible ». « Calculer la station ».
- [ ] Tu lis **Lecture fausse**, **ROUGE**, et l'action **Refaire la visée vers B, Borne nord** ; X **29,569**, Y **3,238**, altitude du sol **31,072** ; altitudes calculées **30,919 (A), 31,248 (B), 30,908 (C)** ; écart d'altitude **0,339 m ORANGE** ; plus grand écart de distance **0,676 m ROUGE**.
- [ ] Touche « Refaire la visée vers B » : le pavé s'ouvre sur la distance vers B. Tape **25,05**, OK. Tu lis la question « Remplacer la visée vers B (27,05 m ; −9,4°) ? L'ancienne valeur reste dans l'historique. ». Touche « Remplacer », puis « Calculer la station » : la station devient **VERT** (X 30,006 ; Y 5,006).

## 8. Partager un tableau et un plan (toujours en mode avion)

- [ ] Barre du bas : « Résultats ». Dans « Exporter », touche « Tableau des points (CSV) » : la feuille de partage d'Android s'ouvre. Choisis WhatsApp, envoie-le à toi-même. Le fichier s'appelle `Releve_Stations-B_<date>_points.csv`.
- [ ] Touche « Plan avec les courbes (PDF) » : même chose vers WhatsApp. Le fichier s'appelle `Releve_Stations-B_<date>.pdf`.
- [ ] Les deux messages restent en attente dans WhatsApp tant que le mode avion est actif : c'est normal.

## 9. Fermer et rouvrir en mode avion

- [ ] Ferme l'outil complètement (liste des applications récentes, balaye-le), puis rouvre-le depuis l'icône, toujours en mode avion.
- [ ] Tu retrouves « Essai Joël », « Premier chantier », les relevés « Calage A » et « Stations B ». Dans « Stations B », S01 à S07 sont là avec les mêmes valeurs, et la borne D « Piquet du manguier ».
- [ ] Désactive le mode avion : les deux messages WhatsApp partent. Ouvre-les : le tableau s'ouvre dans un tableur (colonnes séparées, nombres avec une virgule), le PDF montre les bornes, les stations et les courbes.

## 10. Ce qui ne se vérifie que sur ton téléphone

- [ ] L'écran ne s'éteint pas pendant la saisie d'une station (verrou d'écran).
- [ ] Le pavé se manie d'une main, en plein soleil.
- [ ] Rotation de l'écran pendant « Lire la boussole » : la valeur reste cohérente.

## Fin

- [ ] Si tout est coché, dis-le à Claude. Pour effacer l'essai : accueil, trois points du domaine « Essai Joël », « Supprimer le domaine ».

Remarques de Joël :

........................................................................
