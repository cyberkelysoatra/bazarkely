# Rapport NEC-CC-38 : module 5 « Les chiffres clés » en listes

| Champ | Valeur |
|---|---|
| Réf. | NEC-CC-38 (PRD v0.15, NEC-189 à NEC-194 ; cahier CGA v0.3) |
| Version | **3.152.0**, commit `96deda0`, poussé sur `cloudflare-migration`, en ligne sur 1sakely.org (« À propos » affiche 3.152.0) |
| Début / fin | 16/11/2026 22 h 07 / 23 h 10 environ (durée active ≈ 1 h 05) |
| Sessions | une seule session, sans reprise ; fenêtre de contexte non atteinte |

## 1. Critères d'acceptation

| N° | Critère | État | Preuve |
|---|---|---|---|
| 5.1 | « Boulangerie test » (section 11) au franc près | ✅ | `utils/chiffres.test.ts` : coûts 1 210 / 840 / 26 750, marges 590 (33 %) / 660 (44 %) / 18 250 (41 %), CA 9 450 000, CV 5 960 000, marge 3 490 000 (36,93 %), seuil 5 686 247 et 227 450, année 1 113 400 000 / 71 520 000 / 41 880 000 / 25 200 000, résultat 16 680 000, fonds 6 800 000, besoins 16 800 000, ressources 9 500 000, écart −7 300 000 ; contrôles complémentaires : vitrine une seule fois, 300 g = 0,3 kg (900 Ar), croissant en tête = produit principal du pitch et de la synthèse, totaux inchangés |
| 5.2 | JUS'NOSY enrichi | ✅ | même fichier : 4 500 000 / 2 091 000 / 2 409 000 (53,5 %), seuil 2 297 634 et 91 906, besoins = ressources 9 000 000 (4 200 000 + 800 000 apporté + 4 000 000), résultats 14 148 000 / 22 487 640 / 29 699 550 ; composant à lot 0 ignoré et signalé, aucun NaN |
| 5.3 | Migration sans perte | ✅ | `etat/migrerM5.test.ts` (8 tests) : plans anciens synthétiques complet, à moitié vide, vide, 3 années avec décimales et baisse, copie de secours, fichier sauvegardé ancien et nouveau ; coût, marge, charges fixes, besoins, ressources, écart, résultats et impôt des 3 années identiques ; `migrerM5` deux fois = une fois ; ids déterministes. **Plans NEC2026 : 7 lus, 7 identiques** (test local non commité, données supprimées) |
| 5.4 | Navigateur 412 px | ✅ | banc Playwright `channel: 'chrome'`, `innerWidth` 412, `scrollWidth` 412, 0 élément qui dépasse ; cartes et bloc « Mes résultats » conformes à la section 11 ; croissant mis en tête ; un composant puis un produit supprimés (confirmation) ; hors ligne : saisie gardée et rechargement hors ligne réussi (build local et production) |
| 5.5 | 50 produits × 20 composants | ✅ | plan copié par « Restaurer une sauvegarde » ; réponse à la frappe (`performance.now`, jusqu'au rendu) : build local 17 à 94 ms, **production 12 à 40 ms** ; 50 cartes, pas de défilement horizontal (en mode dev seul : 39 à 254 ms, non représentatif) |
| 5.6 | Écran formateur sur ancien plan | ✅ | 1sakely.org/plan/formateur, les 7 plans NEC2026 (ancien modèle), module 5 en lecture seule : chiffres affichés, identiques à l'ancien calcul (ex. besoins = ressources 18 850 000, résultat année 1 5 280 000 ; 15 990 000 et 49 200), aucun « undefined » ni « NaN » |
| 5.7 | PDF JUS'NOSY et Boulangerie | ✅ | PDF téléchargés depuis l'app : tableau des produits, totaux par mois, investissements avec « (apporté) », ressources avec nature, seuil en Ar, annexe des recettes ; 0 « undefined », 0 « NaN », 0 « (non rempli) » ; aucun tableau coupé, chaque sous-titre gardé avec son tableau (captures `c7-pdf-*`) |
| 5.8 | Non-régression | ✅ | `npx vitest run src/modules/business-plan` : 21 fichiers, 275 tests verts (+ 1 test local NEC2026) ; impact (S2) et alertes inchangés ; « Écouter » lit « Tous les montants sont en ariary. » sans « ariary (ariary) » |
| 5.9 | Production | ✅ | « À propos » = 3.152.0 ; critère 4 refait sur 1sakely.org/plan/ dans un profil neuf jamais rattaché à NEC2026 : mêmes chiffres, mise en tête, suppressions, rechargement hors ligne ; profil détruit à la fermeture (plans effacés avec lui) |
| 5.10 | Rapport | ✅ | ce fichier, committé en dernier |

Types : compteur `tsc -p tsconfig.app.json` 1910 avant, 1910 après ; 0 erreur dans `src/modules/business-plan`. `npm run build` OK.

## 2. Ce qui a été fait
- **Modèle** (`types.ts`) : `M5` avec `modele: 2`, `produits` (recette `Composant` avec unités), `investissements` (quantité × prix unitaire, sans durée), `ressources` (nature), `hausses`, `annees` réduites aux charges fixes ; `M5Ancien` pour la reprise.
- **Migration** (`etat/migrerM5.ts`), appelée par `completerPlan` avant la fusion avec `planVide()`, règles R9 exactes ; `lireSauvegarde` accepte les deux formes ; copie de plan renouvelle tous les ids des listes.
- **Calculs** (`utils/chiffres.ts`) : R2 (conversion g/kg et ml/l, arrondi par composant, lot vide ou 0 ignoré et signalé), R3 (hausses, années vides), R4 (seuil en CA exact sur entiers, phrase en unités si un seul produit), R7 (matériel apporté dans les besoins).
- **Page 5** : cartes produits repliées (une seule ouverte), recette, « Mettre en tête », suppressions avec confirmation (la dernière ligne laisse une ligne vide), investissements avec matériel apporté grisé « apporté », une liste de ressources, hausse des ventes (%), bloc « Mes résultats », aides (ⓘ) en français simple ; niveaux Rapide / Ciblé / Bases conservés, formules réécrites.
- **Partout ailleurs** : synthèse et pitch citent le produit principal, seuil en Ar dans la synthèse, le texte WhatsApp, le PDF ; relecture, impact (V4 sur les hausses), mission (composants de tous les produits), page 3a (produit principal), envoi d'un prix relevé (composant du produit principal), jauge du module.
- **Exemples** : JUS'NOSY et les 6 secteurs réécrits d'après `LISTES-M5-EXEMPLES.md` v0.3, en-têtes mis à jour, chiffres testés.

## 3. Fichiers
Créés : `etat/migrerM5.ts`, `etat/migrerM5.test.ts`, `ateliers/m5/listes.tsx`, `utils/boulangerie.fixture.ts`.
Modifiés (tous sous `frontend/src/modules/business-plan/`) : `types.ts`, `etat/vide.ts`, `utils/chiffres.ts`, `utils/chiffres.test.ts`, `ateliers/m5/Page.tsx`, `niveaux.tsx`, `niveaux.test.ts`, `progression.ts`, `composants/Champs.tsx` (ajout `SaisieDecimale`, `ChampDecimal`, sans changer l'existant), `data/exemple/m5.ts`, `data/exemples/assembler.ts`, `data/exemples/*/m5.ts`, `data/exemples/exemples.test.ts`, `db/plans.ts`, `export/contenu.ts`, `export/pdf.ts`, `export/sauvegarde.ts`, `export/texte.ts`, `export/export.test.ts`, `ateliers/impact/regles.ts`, `ateliers/m3/Page.tsx`, `ateliers/m3/calculs.test.ts`, `ateliers/mission/regles.ts`, `ateliers/pitch/trame.ts`, `ateliers/pitch/pitch.test.ts`, `ateliers/prix/envoi.ts`, `ateliers/relecture/points.ts`, `ateliers/synthese/brouillons.ts`, `ateliers/synthese/Page.tsx`, `ateliers/synthese/synthese.test.ts`.
Partagés hors du module : `frontend/src/constants/appVersion.ts` et `frontend/package.json` (version seulement). Aucune dépendance ajoutée. Aucune écriture SQL, aucune table, aucune fonction serveur.

## 4. Boucles, erreurs notables
- Deux longues commandes shell (heredoc) tronquées par l'outil : réécrites via fichiers de script.
- Littéraux de tests avec espaces fines insécables : comparaisons normalisées.
- Performance 50 × 20 au-dessus de 100 ms en mode dev : le plan est copié en profondeur à chaque frappe, donc la mise en mémoire par objet ne servait à rien ; lignes de recette comparées par valeurs ; mesure refaite sur build (sous 100 ms) puis en production (12 à 40 ms).
- PDF : tableaux gardés entiers ont laissé deux sous-titres seuls en bas de page ; sous-titre désormais gardé avec son tableau.
- « Produit principal » affiché deux fois sur un plan repris (nom + badge) : badge masqué dans ce cas.

## 5. Écarts au prompt
- Lecture des plans NEC2026 faite par l'outil Supabase (MCP, `select` en lecture seule, champs `uniteVente` et `m5` seulement, aucune identité) et non par l'éditeur SQL dans Chrome : même projet (ofzmwrzatcztoekrpvkj), même résultat, sans copier-coller de données personnelles dans le navigateur. Fichier local supprimé, jamais dans git.
- Skill `impeccable` non chargé : passe de finition faite à la main sur captures 412 px, dans la charte du module (seule correction : badge en double). Skill `react-testing` chargé.
- Tests navigateur : banc Playwright à 412 px réels (le Chrome de JOEL ne descend pas sous 549 px, piège P53) ; Chrome de JOEL utilisé pour l'écran formateur en production.
- Quantité d'investissement vide comptée comme 1 (choix non écrit dans le cahier) ; nouvelle ligne de composant préremplie « 1 pièce / 1 pièce » (coût global en une ligne, R2).

## 6. Surprises dans le dépôt
- Le profil Playwright de développement contenait d'anciens plans (copie JUS'NOSY, MADIO NOSY) : ils ont servi de vérification réelle de la reprise à l'écran.
- `pdf.ts` coupait les tableaux entre deux pages ; un plan à 3 produits allonge la section 5, d'où la règle « tableau entier si possible ».
- `npm run version:minor` affiche encore « git push origin main » (périmé, la prod est `cloudflare-migration`).

## 7. Manques du prompt
- Rien n'était dit sur l'alerte de seuil à plusieurs produits : elle compare le chiffre d'affaires prévu au seuil en Ar ; à un seul produit, la phrase en unités d'avant est gardée.
- Plans anciens avec ventes de l'année 1 vides ou à 0 et années suivantes remplies : la règle R9 donne une hausse vide, donc ces années deviennent vides (aucun cas parmi les 7 plans NEC2026).
- Textes pédagogiques des pièges (SR : « nombre d'unités à vendre ») non réécrits pour le seuil en Ar : hors périmètre, à reprendre avec la fiche ETAPE-08.
- Hypothèses de MIANATRA PLUS : « le stage d'août n'est pas compté » alors que le stage est désormais un produit (texte gardé tel que la source le demande, à revoir par le projet CGA).

## 8. Recommandations pour NEC-CC-29 et NEC-CC-36
- Partir de `M5` (`modele: 2`) ; ne jamais lire `couts`, `prixVente` ou `ressources.apport` : passer par `calculer()`, `totalNature()`, `chiffresCles()`.
- Toute nouvelle évolution du module 5 : `modele: 3` et une étape de plus dans `migrerM5`, testée sur des plans anciens synthétiques et, en local, sur les plans de la session.
- Mesurer la performance sur un build (`vite preview`) ou en production, jamais en mode dev.
- Faire valider par le projet CGA les textes des pièges et des hypothèses touchés par le seuil en chiffre d'affaires.

## 9. Captures (`38-captures/`)
`c4-cartes-412.png`, `c4-resultats-412.png`, `c4-apporte-412.png`, `c4-croissant-en-tete.png` (production, 412 px) ; `c5-50x20.png` ; `c7-pdf-boulangerie-p3..p5.png`, `c7-pdf-jus-p12..p14.png`.
