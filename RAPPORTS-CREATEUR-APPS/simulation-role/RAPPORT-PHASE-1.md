# RAPPORT — Simulation de rôle (module Gestion Eau) — Phase 1

**Version livrée :** v3.68.0
**Branche :** `cloudflare-migration`
**Date :** 2026-07-07
**Périmètre :** socle + apparence pour les rôles **Releveur** et **Promoteur** (rôles « larges »).
Le rôle **Propriétaire/Client** (choix d'une villa + re-filtrage des données) est **posé mais désactivé** → Phase 2.

---

## 1. Horodatage & contexte

- **Début :** ~15:20 (heure locale poste JOEL), lancement `npm run dev` + lecture bornée des 8 fichiers de référence.
- **Fin :** ~15:50, après validation navigateur complète sur session admin réelle (localhost:3000).
- **Durée active :** ~30 min.
- **Fenêtre de contexte atteinte :** non — travail linéaire, aucune compression de contexte.
- **Mode de travail :** autonomie complète (coder → tester → se corriger), aucune question posée.

## 2. Itérations code → test → correction

Aucune boucle d'échec marquante. Déroulé quasi linéaire grâce à la lecture préalable :

1. Lecture bornée (ConstructionContext, GestionEauContext, HeaderEauActions, types, gardes de route, routes, BottomNav, Header, EauAide, constants).
2. Découverte : chemin réel de `HeaderEauActions.tsx` = `components/Layout/header/` (pas `modules/gestion-eau/...` comme indiqué au prompt). Corrigé sans incidence.
3. Vérification préalable des icônes lucide (`Drama`, `VenetianMask`, `Eye`, `ClipboardList`, `Home`) et des couleurs Tailwind (`ahuvi-gold`, `ahuvi-gold-light`, `ahuvi-gold-700`) → toutes présentes → aucun build cassé.
4. Implémentation additive (config + type + contexte + menu + marque header).
5. `npx tsc --noEmit` = **0 erreur** au 1er essai. `npm run build` = **OK** (built in 354 ms).
6. Validation navigateur (voir §4).

## 3. État des critères d'acceptation

| # | Critère | État |
|---|---------|------|
| 1 | Section « 🎭 Simulation de rôle » visible admin, jamais non-admin | ✅ (gate `realRoles.admin`, prouvé menu admin) |
| 2 | Releveur : nav réduite + garde bloque écrans admin + marque header | ✅ |
| 3 | Promoteur : nav selon matrice + `isReadOnly` vrai + marque header | ✅ |
| 4 | **Corps de page identique (hauteur header mesurée)** — BLOQUANT | ✅ **prouvé** (voir §4) |
| 5 | « Revenir à Admin (réel) » restaure l'app + marque disparaît | ✅ |
| 6 | Persistance après rechargement (localStorage), jamais pour non-admin | ✅ |
| 7 | Sortie toujours atteignable (marque cliquable + menu) | ✅ |
| 8 | « Propriétaire (Phase 2) » visible mais inactif | ✅ (`<div>` grisé + pastille « Phase 2 ») |
| 9 | Aucune régression hors eau ; modifs partagées additives conditionnées eau | ✅ (voir §6) |
| 10 | `tsc --noEmit` = 0 ; `build` OK | ✅ |
| 11 | Nouvelle série Recharts `isAnimationActive={false}` | N/A (aucune série ajoutée) |
| 12 | Version bumpée, commit poussé sur `cloudflare-migration`, un seul déploiement | ✅ |
| 13 | Validation navigateur sur session admin + preuve hauteur/position | ✅ (voir §4) |

## 4. Preuve « le corps de page ne bouge pas » (critère bloquant)

Mesures `getBoundingClientRect()` sur le navigateur réel de JOEL (localhost:3000, connecté **admin « Joël SOATRA »**, `window.innerWidth = 958`) :

| État | `header.height` | `main.firstChild.top` (haut du contenu) |
|------|-----------------|------------------------------------------|
| **Sans simulation** (baseline) | **139 px** | **147 px** |
| Simulation **Releveur** | 139 px (Δ 0) | 147 px (Δ 0) |
| Simulation **Promoteur** | 139 px (Δ 0) | 147 px (Δ 0) |
| Après rechargement (Promoteur restauré) | 139 px | 147 px |

→ **Hauteur du header identique et position du contenu inchangée** dans tous les états. La marque de simulation est un « chip » or **frère du bloc titre** dans la barre de titre (horizontal, comme le badge d'entreprise Construction), donc n'ajoute **aucune rangée ni hauteur**. Aucun élément inséré entre header et contenu.

Autres preuves navigateur :
- **Nav Releveur** (barre du bas visible car `innerWidth<1024`) = `[Tableau de bord, Relevés, Suivi]` — Compteurs/Facturation masqués.
- **Garde de route** : navigation vers `/gestion-eau/compteurs` en simulation Releveur → **redirigé vers `/gestion-eau`**.
- **Menu en simulation Releveur** = section Simulation (toujours là) + seulement `Tendances`/`Coûts électricité` (liens releveur) — liens admin masqués.
- **Nav Promoteur** = `[Tableau de bord, Relevés, Compteurs, Suivi, Facturation]` (matrice promoteur).
- **Marque header** = « Simulation : Releveur » / « Simulation : Promoteur ».
- **Persistance** : `localStorage['eau_sim_role'] = 'promoteur'`, restaurée après rechargement complet.
- **Sortie via clic sur la marque** : badge disparaît, `localStorage['eau_sim_role'] = null`, nav + menu admin **complets** restaurés, « Revenir à Admin (réel) » surligné actif.
- **Console** : seule erreur = `DB timeout after 5s` (connue/attendue, session reste valide — cf. mémoire `project_db_timeout_loaduser`). Aucune erreur liée à la simulation.

## 5. Fichiers créés / modifiés

**Créés :**
- `frontend/src/modules/gestion-eau/constants/simulationRoles.ts` — table de config des rôles simulables + `simulationRoleLabel()`.

**Modifiés (module eau) :**
- `frontend/src/modules/gestion-eau/context/GestionEauContext.tsx` — rôles réels vs effectifs, `setSimulation`/`clearSimulation`, persistance localStorage admin-only, purge non-admin/déconnexion.
- `frontend/src/modules/gestion-eau/types/gestionEau.ts` — type `EauSimulatedClient` (réservé Phase 2).

**Modifiés — FICHIERS PARTAGÉS (⚠️ signalés, strictement additifs et conditionnés au module eau) :**
- `frontend/src/components/Layout/header/HeaderEauActions.tsx` — section « Simulation de rôle » (gate `realRoles.admin`).
- `frontend/src/components/Layout/Header.tsx` — marque de simulation dans la barre de titre (bloc conditionné `isEauModule && eauIsSimulating`). **`BottomNav.tsx` et `constants/index.ts` n'ont PAS eu besoin d'être touchés** : ils filtraient déjà sur `context.roles`, qui renvoie désormais les rôles effectifs → le filtrage de simulation est automatique (0 modif partagée supplémentaire).

**Version :** `frontend/src/constants/appVersion.ts` + `frontend/package.json` → **3.68.0**.

## 6. Dépendances ajoutées

Aucune. Icônes lucide (`Drama`, `VenetianMask`, `Eye`, `ClipboardList`, `Home`, `ShieldCheck`, `Check`) déjà présentes ; couleurs AHUVI déjà dans `tailwind.config.js`.

## 7. Écarts au prompt & décisions

- **`BottomNav.tsx` / `constants/index.ts` non modifiés** : le prompt les listait comme candidats. Ils filtrent déjà sur les rôles effectifs du contexte → aucune modif nécessaire (moins de surface partagée touchée = mieux). Décision volontaire, conforme à l'esprit « modifs partagées minimales ».
- **Marque header = chip frère du bloc titre** (pas de modif du sous-titre ni des bordures) : choix le plus sûr pour garantir une hauteur strictement constante (les bordures/padding changent la hauteur, un frère horizontal non).
- **`simulatedClient`** exposé dès maintenant (toujours `null` en Phase 1) pour accueillir la Phase 2 sans refonte de l'API du contexte.

## 8. Surprises sur le dépôt

- Chemin réel de `HeaderEauActions.tsx` sous `components/Layout/header/` (le prompt indiquait `modules/gestion-eau/...`).
- Le filtrage de nav (bottom + desktop header) était déjà branché sur `context.roles` → le socle « rôles effectifs » suffit à tout propager, sans toucher la nav.
- Le pattern Construction utilise `getUser()` (online) ; le contexte eau est offline-first (`getSession`) — le socle simulation a été gardé 100 % frontend/localStorage, sans jamais introduire `getUser()`.

## 9. Ambiguïtés du prompt

- « emplacement `simulatedClient` typé, laissé null » → interprété comme un état + champ de contexte typé `EauSimulatedClient | null`, non câblé au sélecteur.
- Sortie de la marque « soit clearSimulation, soit ouvre le menu » → choisi **`clearSimulation`** (le plus robuste et immédiat) ; le menu reste de toute façon la 2ᵉ voie de sortie.

## 10. Recommandations pour la Phase 2 (vue « Propriétaire »)

La Phase 2 doit **re-filtrer les données** en plus des écrans. Surface exacte « ce que voit le client » à scoper :
- **Écran cible** : `EauClientPage` (+ `EauProprietaireBassinPage`) — déjà l'espace propriétaire réel (routes `/gestion-eau/client`, `/client/:tab`, `/client/bassin`).
- **Choix de la villa** : la simulation Propriétaire doit proposer une **liste des `eau_comptes_client` actifs** (id + nom) → renseigner `simulatedClient` (déjà typé/persisté via `eau_sim_client`, clé réservée).
- **Portée des données** : les services de lecture propriétaire (conso/factures) sont scopés par `compteur_ids` du compte client. En simulation, injecter `simulatedClient` comme filtre **au lieu de** l'identité admin — repérer tous les callsites qui lisent « mes compteurs » (getDashboardData/getTendances côté client) et leur passer le compte simulé.
- **Nav** : ajouter `'client'` à `SIMULATABLE_ROLES` + passer `available: true` sur l'option Propriétaire ; la nav client (`Ma conso`/`Le bassin`/`Mes factures`) apparaîtra automatiquement (déjà filtrée sur rôle effectif).
- **Marque header** : réutiliser telle quelle ; envisager d'ajouter le **nom de la villa** au libellé (« Simulation : Propriétaire — Villa X »).
- **Garde** : vérifier qu'en simulation client, l'admin est bien redirigé vers `/gestion-eau/client` (le `home` de `EauRoleProtectedRoute` gère déjà `roles.client`).

---

*Rapport généré automatiquement en fin de Phase 1.*
