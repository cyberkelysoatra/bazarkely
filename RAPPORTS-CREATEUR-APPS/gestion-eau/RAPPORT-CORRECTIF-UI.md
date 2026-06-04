# Rapport — Correctif UI : Header & Footer du module `gestion-eau`

**Module :** `frontend/src/modules/gestion-eau/` (BazarKELY / 1sakely.org)
**Version livrée :** **v3.19.0** (depuis v3.18.2)
**Commit :** `6acff81` — poussé sur `main` (Netlify auto-deploy)

## ⏱️ Horodatage
- **Début :** 2026-06-04 ~18:40 (heure locale poste)
- **Fin (push) :** 2026-06-04 ~19:00
- **Durée :** ~20 min (hors validation visuelle live, en attente connexion JOEL)

## 🔁 Itérations & erreurs rencontrées
- **0 erreur de compilation** sur le parcours : `tsc --noEmit` est passé **du premier coup** après l'ensemble des éditions (pas de référence orpheline, imports propres).
- **Vérification icônes lucide** avant usage (`node -e` sur `lucide-react`) → `Gauge, TrendingUp, Network, FileText, Droplet, Receipt, Megaphone, IdCard, ClipboardList, Inbox, Bell, QrCode` tous présents (évite un crash runtime).
- Découpe JSX des pages existantes (Compteurs/Facturation/Client) faite par éditions ciblées + relecture des fermetures de balises → build OK sans retouche.

## ✅ Gates techniques (locaux, avant push)
| Gate | Résultat |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 |
| Tests module (`vitest run src/modules/gestion-eau`) | ✅ **40/40** (3 fichiers) |
| `npm run build` (vite + PWA) | ✅ built, SW régénéré |
| Bump version `appVersion.ts` + `package.json` | ✅ 3.19.0 |

## 📊 État de chaque critère d'acceptation
*(Validé en direct sur 1sakely.org, compte admin eau, build déployé `index-DS9s7YiC.js` = v3.19.0, via Claude in Chrome — preuves DOM `read_page` + captures.)*

| # | Critère | État |
|---|---|---|
| 1 | `tsc --noEmit` + build + tests OK ; bazarkely (violet) & construction inchangés | ✅ tsc/build/tests ✅ ; **non-régression BazarKELY confirmée live** (`/accounts` : header violet, LevelBadge « Niveau 1 », 6 items /dashboard…/goals). Construction : branches code inchangées (conditions `!isConstructionModule` préservées) ; non affichable sur ce compte (pas d'accès Construction → garde redirige vers /dashboard, pré-existant). |
| 2 | BottomNav = boutons-thèmes du module, ≤ 6, filtrés par rôle (Admin 5 · Releveur 3 · Client 2), thèmes à onglets internes | ✅ **confirmé live** : footer admin = **5 liens** `/gestion-eau`, `/releves`, `/suivi`, `/compteurs`, `/facturation` (aucun item BazarKELY). Releveur (3) / Client (2) garantis par le filtrage `roles` + gardes (comptes non disponibles pour test direct). |
| 3 | Idem nav desktop du header | ✅ même source `GESTION_EAU_NAV_ITEMS` filtrée (rendu desktop ≥ 1024px) |
| 4 | Un seul header brandé AHUVI (couleurs + « AHUVI Eau » + slogan) ; plus de second header | ✅ **confirmé live** : header **vert AHUVI**, « AHUVI Eau » + « Distribution & suivi d'eau — Nosy Be », bouton « Menu Gestion Eau » à droite ; `<main>` ne contient qu'un titre de section discret (pas de 2ᵉ header) |
| 5 | `EauNav` n'est plus la barre principale ; écrans atteignables (thèmes + onglets + menu) | ✅ **confirmé live** : `/gestion-eau/releves` rend **4 onglets internes** (Compteur/Bassin + Tournée/Scan « bientôt ») + recherche compteur ; nav principale = footer + menu |
| 6 | Matrice d'accès (gardes + nav + données) | ✅ gardes `EauRoleProtectedRoute` sur **chaque** route + redirection role-aware (vérifié code) ; filtrage de nav confirmé live (admin 5) ; données client scoping inchangé |
| 7 | Bascule de module (switcher) sans casse | ✅ **confirmé live** : module eau persistant (retour auto sur `/gestion-eau`), BazarKELY rendu violet propre sur `/accounts` ; header + footer changent correctement |
| 8 | `FONCTIONNEMENT-MODULES.md` ajusté | ✅ |

### 🔎 Validation live réalisée (compte admin eau)
- Header **AHUVI vert** + « AHUVI Eau » + slogan + menu haut-droite → ✅ (capture + DOM)
- Footer admin = 5 boutons-thèmes (`read_page`) → ✅
- `/gestion-eau/releves` → 4 onglets internes + recherche compteur → ✅
- Non-régression BazarKELY (`/accounts`) → header violet, LevelBadge, 6 items → ✅
- Console : **0 erreur liée au correctif** ; seules 2 erreurs connues/non-bloquantes (`sw.js` 404/MIME — cf. `project_sw_js_404` ; `DB timeout 5s` profil — cf. `project_db_timeout_loaduser`)
- **Non couvert faute de comptes dédiés** : vues Releveur (3 boutons) / Client (2 boutons) et redirection URL directe d'un rôle non autorisé (garanties par le code/les gardes) ; header Construction (compte sans accès Construction).

## 📁 Fichiers créés / modifiés
### Partagés (⚠️ touchent toute l'app — modifs additives & conditionnées au module)
- `frontend/tailwind.config.js` — **+** namespace couleurs `ahuvi` + `fontFamily` `ahuvi-display`/`ahuvi-body` (utilisés uniquement en mode eau).
- `frontend/src/index.css` — **+** import Google Fonts (Playfair Display + Poppins).
- `frontend/src/constants/index.ts` — **+** `GESTION_EAU_NAV_ITEMS` (boutons-thèmes + rôles).
- `frontend/src/components/Navigation/BottomNav.tsx` — **+** branche `gestion-eau` (items role-filtrés ≤ 6, thème vert AHUVI actif, `end` sur routes racines).
- `frontend/src/components/Layout/Header.tsx` — **+** `isEauModule` (fond AHUVI, titre/slogan Playfair/Poppins, nav desktop role-filtrée, `HeaderEauActions`, masque bannière/quiz/level/menu bazarkely).
- `frontend/src/components/Layout/header/HeaderEauActions.tsx` — **NOUVEAU** (menu secondaire role-filtré).

### Module gestion-eau
- `EauPageShell.tsx` — suppression `EauNav` + gros en-tête → titre de section discret.
- `EauTabs.tsx` — **NOUVEAU** (onglets internes réutilisables).
- `EauRelevesPage.tsx` — **NOUVEAU** (thème Relevés : Bassin/Compteur + Tournée/Scan « bientôt »).
- `EauSuiviPage.tsx` — **NOUVEAU** (thème Suivi : Anomalies + Tendances « bientôt »).
- `EauCompteursPage.tsx` — onglets Liste/Carte.
- `EauFacturationPage.tsx` — onglets Factures/Rapports (export CSV global déplacé dans Rapports).
- `EauClientPage.tsx` — onglets Ma conso / Mes factures (pilotés par URL `:tab`) + Mon QR « bientôt ».
- `GestionEauRoutes.tsx` — routes `/releves`, `/suivi`, `/client/:tab` + gardes de rôle sur **chaque** route + redirections des anciennes routes (`saisie-bassin`/`saisie-compteur`→`/releves`, `anomalies`→`/suivi`) + dashboard guardé admin/releveur.
- `EauRoleProtectedRoute.tsx` — redirection **role-aware** (accueil calculé) sans boucle (client refusé → `/gestion-eau/client`).

### Documentation
- `FONCTIONNEMENT-MODULES.md` — section Module 5 : pages-thèmes, sous-section Header & navigation, **matrice d'accès** complète.
- `frontend/src/constants/appVersion.ts` — entrée v3.19.0.

## ⚠️ Écarts au prompt (assumés & documentés)
1. **Sous-vues non encore livrées** (Tournée, Scan, Tendances, Carte) : matérialisées par des **onglets désactivés « bientôt »** plutôt que des écrans factices — fidèle à la structure cible sans fabriquer de fonctionnalité. Ce sont des chantiers **Phase 3-4**.
2. **Menu haut-droite — Alertes / Annonces / Audit** : listés mais **désactivés (« bientôt »)** car les routes/écrans n'existent pas encore (Phase 3-4). Config/Utilisateurs/Demandes sont **fonctionnels**.
3. **Client = 2 boutons** : réalisé via deux routes (`/gestion-eau/client` = Ma conso, `/gestion-eau/client/factures` = Mes factures) pointant sur le **même écran** à onglets pilotés par l'URL (cohérence footer ↔ onglets). « Mon QR » est un 3ᵉ onglet désactivé (Phase 3).
4. **Langue dans le menu client** : non implémentée (l'i18n global n'est pas branché sur ce menu) — notée pour plus tard.
5. **Footer en mode eau** : couleur active passée au **vert AHUVI** (polish non strictement demandé) ; aucun impact bazarkely/construction (conditionné).
6. **`EauNav.tsx` / `navConfig.ts`** : conservés (toujours exportés + couverts par le test `eauNavRoles`) mais **plus utilisés comme barre principale**. Suppression remise à un nettoyage ultérieur pour ne pas casser le test existant.

## 😮 Surprises
- Le **header réellement monté** est `components/Layout/Header.tsx` (inline), pas l'assemblage `header/HeaderConstructionActions.tsx` (qui dépend d'un hook `useIsConstructionModule` introuvable au chemin attendu) → j'ai intégré le branding **directement dans `Header.tsx`** et créé `HeaderEauActions.tsx` consommé par lui. Le sous-dossier `header/*` est en partie **non câblé** à l'app.
- `window.confirm` est neutralisé globalement (piège connu v3.16.2/3.18.2) — non concerné ici (aucun ajout de confirm).

## ❓ Ambiguïtés
- Le périmètre « onglets internes » pour Compteurs/Facturation (sous-vue unique aujourd'hui) : tranché en faveur d'un **onglet réel + onglet « bientôt »** (Compteurs) et d'un **vrai split Factures/Rapports** (Facturation, exports isolés).
- `/gestion-eau/scan` (public dans la matrice) : route **non créée** (Phase 3 QR) ; documentée comme publique-cible.

## 🧭 Recommandations pour la Phase 3
1. **QR / Scan terrain** : route publique `/gestion-eau/scan` + onglet **Scan** actif dans Relevés + **Mon QR** actif dans l'espace client (activer les onglets aujourd'hui « bientôt »).
2. **Carte compteurs** : onglet Carte (géoloc `lat/lng` déjà présents dans le type `CompteurRow`).
3. **Tournée** : 3ᵉ onglet de Relevés (séquence ordonnée par `ordre`/zone).
4. **Alertes** (badge non-lus dans le menu haut-droite) + **Annonces** (bandeau défilant) + **Audit/Journaux** : activer les entrées du menu `HeaderEauActions` (aujourd'hui « bientôt »).
5. **RLS Supabase par rôle** : aujourd'hui l'isolement repose sur les gardes + le scoping des requêtes ; durcir côté base (policies par rôle eau).
6. **i18n** : brancher le sélecteur de langue dans le menu client.
7. **Nettoyage** : retirer `EauNav.tsx`/`navConfig.ts` une fois leur test migré vers le filtrage `GESTION_EAU_NAV_ITEMS`.

---
*Validation visuelle live réalisée le 2026-06-04 sur 1sakely.org (compte admin eau). Reste à confirmer côté JOEL, avec des comptes dédiés : vue Releveur (3 boutons), vue Client (2 boutons + espace limité à ses compteurs), header Construction.*
