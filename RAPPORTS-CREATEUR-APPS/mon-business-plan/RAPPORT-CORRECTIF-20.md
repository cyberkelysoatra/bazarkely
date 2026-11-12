# RAPPORT NEC-CC-20 : pré-test papier saisi par le formateur, reçu par le téléphone (v3.145.0)

- **Référence :** NEC-CC-20 (story PRD NEC-169)
- **Début :** 12/11/2026 15 h 38 · **Fin :** 16 h 07 · **Durée active :** environ 30 min
- **Fenêtre de contexte :** une seule, sans résumé intermédiaire
- **Commit :** `6a5ace8` sur `cloudflare-migration`, en ligne sur https://1sakely.org/plan/ (bundle `plan-Da2l7CqF.js`, contient 3.145.0)

## Critères

| # | Critère | Résultat |
|---|---|---|
| 1 | SQL appliqué ; contrôles | ✅ Colonnes + 2 fonctions + `bp_admin_liste` / `bp_admin_plan` étendues. REST (clé anon) : `bp_lire_pretest` jeton court → `JETON` ; `bp_admin_poser_pretest` → `42501` (refusé à anon) ; `select` direct sur `bp_plans` → `42501`. En compte connecté non formateur (SQL, rôle `authenticated`, annulé) : `NON_AUTORISE` ; mauvais jeton sur un vrai plan → `JETON`. `authenticated` n'a aucun `select` sur la table. |
| 2 | Formateur saisit un pré-test papier complet ; la liste affiche « pré-test papier » | ✅ En production dans le Chrome de Joël (session formateur existante, aucun identifiant tapé) : plan TEST-CC20, 15 + 6 réponses, bouton grisé tant que incomplet, « Enregistré, le téléphone le recevra dès qu'il sera en ligne. Score : 13/15 ». Liste : « TEST-CC20 · pré-test papier », « TEST-CC20-APP · pré-test app ». ⚠️ voir écart 1 (serveur local). |
| 3 | Le téléphone le reçoit en moins de 60 s ; même score ; mention visible | ✅ Production (Playwright 412 px, autre profil) : reçu en **18 s**, « Ton parcours : 13/15 », « Ton pré-test papier a été ajouté par le formateur » sur le sommaire et la page pré-test ; module 5 au niveau « Bases » (Q11 « Je ne sais pas »). Même résultat en local. Le plan renvoyé au serveur porte `pretest.source = 'formateur'`. |
| 4 | Pré-test validé dans l'app : « Fait dans l'app », jamais modifié | ✅ Plan TEST-CC20-APP validé sur le téléphone (3/15), puis `pretest_formateur` posé en SQL (15/15) : après 65 s sommaire ouvert, toujours 3/15. Côté formateur : « Fait dans l'app », pas de grille. |
| 5 | Hors ligne : rien ne casse, arrive au retour | ✅ Plan TEST-CC20-HORS, téléphone hors ligne, pré-test posé, 70 s : aucune erreur de l'app, carte inchangée ; retour réseau → reçu en **1 s** (15/15). |
| 6 | Retirer les plans de test | ✅ 4 plans TEST-CC20* retirés par le bouton « Retirer » de l'écran formateur : 0 ligne restante dans `bp_plans`, 4 pierres tombales. |
| 7 | Tests du module | ✅ `npx vitest run src/modules/business-plan` : 16 fichiers, 182 tests verts. Nouveau `utils/pretestFormateur.test.ts` (8 tests) : adopté si rien de validé, gardé sinon, données mal formées ignorées, plans exemples ignorés, `source` conservée, étiquettes. |
| 8 | Compteur de types ; 412 px | ✅ 1910 avant, 1910 après, zéro erreur dans les fichiers du chantier. `window.innerWidth` = 412, largeur de page 397 (pas de défilement horizontal) sur sommaire, pré-test et écran formateur ; boutons de la grille ≥ 40 px. |

## Fichiers
- **Migration :** `supabase/migrations/20261112150000_nec_pretest_formateur.sql` (nouveau)
- **Créé :** `utils/pretestFormateur.test.ts`
- **Modifiés (module) :** `types.ts`, `utils/pretest.ts`, `sync/index.ts`, `sync/formateur.ts`, `etat/usePlan.ts` (partagé par tous les écrans du plan), `pages/Sommaire.tsx`, `pages/Pretest.tsx`, `pages/FormateurPlan.tsx`, `pages/Formateur.tsx`
- **Partagés hors module :** `frontend/src/constants/appVersion.ts`, `frontend/package.json` (3.145.0)
- **Captures :** `20-captures/` (local 412 px, ordinateur, production)

## Écarts
1. **Critère 2 testé en production, pas sur le serveur local** : le Chrome de Joël n'a pas de session sur `127.0.0.1:3000` (et `localhost:3000` renvoie 426, un autre programme écoute en IPv6). Sans recopier de jeton, l'écran formateur a été vérifié en local avec des réponses serveur simulées (grille, 40 px, bouton, envoi exact, pré-remplissage, « Effacer », étiquettes), puis en vrai en production après déploiement.
2. **SQL exécuté par le connecteur Supabase** (même projet, `apply_migration`) et non par l'éditeur SQL dans Chrome : l'onglet Supabase du Chrome connecté demandait une connexion.
3. **Garde FORMAT durcie** : `jsonb_typeof(...) is distinct from` au lieu de `<>` (avec `<>`, un pré-test sans clé `reponses` passait, la comparaison donnant NULL).
4. **`bp_admin_liste` renvoie aussi `pretest_valide`** (`'app'`, `'formateur'` ou null) : sans lui, la liste ne peut pas savoir qu'un pré-test a été fait dans l'app (elle ne reçoit pas `contenu`).
5. **Pré-test papier déjà reçu par le téléphone** : l'écran formateur affiche « Pré-test papier reçu par le téléphone » (pas de grille), au lieu de « Fait dans l'app », puisque le contenu renvoyé par le téléphone porte alors un pré-test validé.
6. **Reprise sur le téléphone** : si le participant met à jour son parcours (« Mettre à jour mon parcours »), `source` devient `'app'` et la mention disparaît.

## Surprises
- **4 vrais participants** (HALIB STEVIO, Justella, MARO Socrato Chrisolin, Noreshca) avaient déjà un `pretest_formateur` posé à **12:59:59 UTC par une seule requête SQL** (même horodatage aux microsecondes), pendant ce chantier et pas par moi. Non modifiés ; leurs téléphones le recevront à la prochaine ouverture du sommaire en ligne.
- **Précision de Joël (NEC-CC-20-B) :** ces 4 pré-tests ont été écrits volontairement par l'atelier CRéATEUR Apps (feuilles papier du formateur) ; il ne s'agit pas d'un acteur inconnu.
- Un autre commit (`91e5dcb`, rapport NEC-CC-19) est arrivé sur la branche pendant le chantier ; poussé en avance rapide, sans conflit.

## Ce qui manquait dans le prompt
- Comment la liste distingue « pré-test app » sans accès à `contenu` (résolu par l'écart 4).
- Le cas « pré-test papier déjà adopté par le téléphone » côté formateur (écart 5).
- Une modification du pré-test papier **après** son adoption par le téléphone n'arrive plus (règle stricte « jamais par-dessus un pré-test validé »).

## Recommandations
- Si Joël corrige une feuille après réception, il faut décider s'il peut écraser un pré-test reçu du formateur (`source = 'formateur'`) ; aujourd'hui non.
- Vérifier ce soir sur `bp_plans` que les 5 participants « papier » ont bien `contenu.pretest.source = 'formateur'` (preuve que leurs téléphones l'ont reçu).
