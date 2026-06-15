# RAPPORT — ÉVO 1/3 : Back « lien usage unique » + fiche d'accès enrichie

**Projet :** BazarKELY — module Gestion Eau AHUVI
**Chantier :** Invitation vitrine WhatsApp (ÉVO 1 sur 3)
**Horodatage :** 2026-06-08, ~20:45–20:58 (heure locale machine)
**Version déployée :** v3.38.0 (commit `c458743`, push `0588402..c458743` sur `main`)
**Auteur :** Claude Code (Opus 4.8) — autonomie complète, aucune intervention de JOEL

---

## 1. Objectif de la phase

Poser le **back** des deux évolutions à venir (écrans en ÉVO 2/3) :

1. **État d'un jeton, anonyme** — RPC `eau_invitation_token_state(p_token)` exposant si un lien d'invitation est encore utilisable (`valid`) ou non (`used`/`expired`/`revoked`/`unknown`), **sans fuite de données nominatives**.
2. **Fiche d'accès enrichie** — extension de `eau_demandes_acces` (+ RPC + intention d'enrôlement) avec `phone`, `fonction`, `message`, pour que la demande créée au retour de Google porte ces champs.

L'usage unique reste garanti côté serveur par `eau_claim_invitation_by_token` (non touché).

---

## 2. Itérations & erreurs rencontrées

| # | Événement | Résolution |
|---|-----------|-----------|
| 1 | Lecture bornée (§2) + repérage des call-sites `processPendingEnrollment` / `setPendingEnrollment`. | OK direct. |
| 2 | Édits front (types, Dexie v5, 3 services) → `npx tsc --noEmit`. | **exit 0** du 1er coup (aucun constructeur littéral `DemandeAccesLocal` cassé ; `valider/refuser` font un spread `...demande`). |
| 3 | SQL produit + exécuté via l'éditeur Supabase (navigateur, Monaco `setValue` + Run). | **« Success. No rows returned »**. Dialog « Potential issue detected » (dû à `drop function`/`alter table`) confirmé volontairement. |
| 4 | Vérif des 7 cas d'état (lignes de test `tst-evo1-*` insérées puis supprimées). | OK : valid/used/revoked/expired + 3 unknown. |
| 5 | Vérif signatures + grants via `pg_proc`/`aclexplode`. | OK : 5-args `authenticated`-only, 2-args disparue, token-state inclut `anon`. |
| 6 | **`npm run build` échoue** : `SyntaxError: Unexpected token '﻿'` dans `package.json`. | **Cause :** `Set-Content -Encoding utf8` (PowerShell 5.1) a ajouté un **BOM** que `vite-plugin-pwa` (`JSON.parse`) refuse. **Fix :** restauration `git checkout` + remplacement chirurgical de la version via Node (sans BOM, formatage 4 espaces préservé) → diff minimal d'1 ligne. Build OK ensuite. |
| 7 | Commit + push `main` → déploiement Netlify (`npm ci`). | Build local et Netlify produisent des **hash d'assets différents** (cf. §6) → vérif par **contenu** (grep), pas par hash. |
| 8 | Vérif idempotence `eau_create_demande` en contexte **authentifié** (faux `sub` JWT via `set_config` + `DO` block terminé par `raise` → rollback garanti, aucun token réel moissonné). | OK : `same_id=true`, `count=1`. |

---

## 3. État des critères d'acceptation

### Compilation
- ✅ `npx tsc --noEmit` → exit 0
- ✅ `npm run build` → OK (`frontend@3.38.0`, build 364 ms, PWA injectManifest OK)

### SQL (vérifié via REST + SQL ; tests de données nettoyés / rollback)
- ✅ `eau_invitation_token_state` **appelable en anon** ; renvoie le bon libellé pour chaque cas. Test (lignes `tst-evo1-*`, supprimées après) :

  | jeton | attendu | obtenu |
  |-------|---------|--------|
  | en_attente, exp+7j | `valid` | `valid` |
  | acceptee | `used` | `used` |
  | revoquee | `revoked` | `revoked` |
  | en_attente, exp-1j | `expired` | `expired` |
  | inconnu | `unknown` | `unknown` |
  | `''` | `unknown` | `unknown` |
  | `null` | `unknown` | `unknown` |

  **Aucune donnée nominative renvoyée** (la fonction `RETURNS text` ne renvoie que le libellé d'état — par construction, zéro fuite).
- ✅ `eau_demandes_acces` possède bien `phone`, `fonction`, `message` (REST anon : `select=phone,fonction,message` → `[]` au lieu de l'ancienne erreur `42703`). RLS activée (idempotent : l'était déjà depuis Phase 2).
- ✅ `eau_create_demande(5 args)` : anon → **refus `42501` permission denied** ; authenticated → crée une demande `en_attente` avec les champs ; 2ᵉ appel même user → **met à jour la même ligne** (`same_id=true`, `count=1`, pas de doublon).
- ✅ L'ancienne signature `eau_create_demande(text, text)` **n'existe plus** (une seule ligne `eau_create_demande` dans `pg_proc`, args = `p_email, p_nom, p_phone, p_fonction, p_message`).

### Front
- ✅ `getInvitationTokenState` (helper RPC anon) ajouté ; testé **en direct sur l'origine déployée** (console) : jeton bidon → `'unknown'`, vide → `'unknown'`. (Les libellés `valid`/`used` sont prouvés au niveau RPC, source de vérité — cf. tableau ci-dessus.)
- ✅ **Non-régression** : `EauDemandesPage` consomme `DemandeAccesLocal` en lecture seule (aucun littéral à compléter) → compile et liste toujours les demandes. Le flux d'enrôlement (`processPendingEnrollment` intents `code` **et** `demande`) est inchangé sur le chemin `code` et **enrichi additivement** sur `demande` (nouveaux champs optionnels).

### Déploiement
- ✅ Version bumpée (`appVersion.ts` + `package.json` → 3.38.0) + **note FR** (non-technique, intégrée à `APP_VERSION_NAME` + entrée `VERSION_HISTORY`).
- ✅ `git push origin main` → Netlify auto-deploy.
- ✅ Vérifié en ligne via l'origine `gleaming-sorbet-a37c08.netlify.app` (purge SW implicite via origine différente ; **pas de comparaison de hash**) : le bundle servi contient `3.38.0`, `eau_invitation_token_state`, `eau_create_demande` ; RPC token-state répond `unknown` depuis cette origine.

---

## 4. Fichiers créés / modifiés

**Front (tous PARTAGÉS) :**
- `frontend/src/modules/gestion-eau/types/gestionEau.ts` — `DemandeAccesRow` + `phone`/`fonction`/`message` (`string | null`).
- `frontend/src/modules/gestion-eau/db/gestionEauDb.ts` — `GestionEauDB.version(5)` (champs texte non indexés, migration additive, données conservées).
- `frontend/src/modules/gestion-eau/services/eauDemandeService.ts` — `DemandeInput` + 3 champs ; `createDemande` passe les 5 params à la RPC + reporte les champs dans le `record` local.
- `frontend/src/modules/gestion-eau/services/eauEnrollmentService.ts` — `PendingEnrollment` intent `demande` enrichi (`email`/`phone`/`fonction`/`message`) ; `processPendingEnrollment` relaie les champs (email réel du compte Google prioritaire sur celui de la fiche).
- `frontend/src/modules/gestion-eau/services/eauInvitationService.ts` — `export type InviteTokenState` + `getInvitationTokenState(token)` (RPC anon, `withTimeout` 6 s, défaut `'unknown'` si erreur/hors-ligne).
- `frontend/src/constants/appVersion.ts` — version 3.38.0 + note FR + entrée `VERSION_HISTORY`.
- `frontend/package.json` — version 3.38.0.

**SQL Supabase (PARTAGÉ, exécuté en prod) :**
- `eau_invitation_token_state(text)` (créée, SECURITY DEFINER, grant anon+authenticated, revoke public).
- `eau_demandes_acces` : `+ phone, fonction, message` (text) ; RLS enable (idempotent).
- `eau_create_demande` : `drop` de la 2-args ; recréée en 5-args, authenticated-only (revoke public+anon).

---

## 5. Infos confirmées pour ÉVO 2

- **Store Dexie** : nom exact `eau_demandes_acces` (PK `id`). **Index** = `'id, user_id, statut'` — `phone`/`fonction`/`message` **non indexés** (champs texte simples, lus en mémoire). DB désormais en `version(5)`.
- **Où `processPendingEnrollment` est invoqué :**
  - **Global (cœur du flux OAuth)** : `frontend/src/modules/gestion-eau/context/GestionEauContext.tsx:151` — `await processPendingEnrollment(id, email)` au montage du module, après authentification, quel que soit l'écran d'atterrissage. **C'est le point que la vitrine ÉVO 2 doit viser** (poser l'intention `demande` enrichie AVANT de lancer Google, elle sera traitée ici au retour).
  - **Direct (déjà authentifié)** : `frontend/src/modules/gestion-eau/components/EauAccueilPage.tsx:68` (intent `code`) et `:93` (intent `demande`).
- **Capture du jeton vitrine** : clé `sessionStorage` = `eau_pending_invitation_token` (`PENDING_TOKEN_KEY`), consommée par `claimPendingTokenInvitation`. La vitrine `/i/:token` (`EauVitrinePage`) y dépose le jeton avant Google.

---

## 6. Écarts / surprises

1. **BOM PowerShell** : `Set-Content -Encoding utf8` (PS 5.1) écrit un BOM UTF-8 qui casse `JSON.parse` de `vite-plugin-pwa`. → **Ne jamais reserialize `package.json` via PowerShell ; remplacement chirurgical sans BOM** (Node `fs.writeFileSync(..., 'utf8')` après strip du BOM, ou édition de la seule ligne `version`).
2. **Hash d'assets local ≠ Netlify** : le build Netlify (`NODE_ENV=development` dans `netlify.toml`, `npm ci`) produit des hash différents du build local. → vérification du déploiement **par le contenu du bundle servi** (grep `3.38.0`, noms de RPC), conforme à la consigne « pas de comparaison de hash ».
3. **Fallback SPA = HTTP 200** : un chemin d'asset inconnu renvoie `index.html` en 200 (redirect SPA) → un code 200 ne prouve PAS la présence d'un asset précis. Utiliser le grep de contenu sur l'index réellement servi.
4. **`COALESCE` dans `eau_create_demande`** : un 2ᵉ appel avec un champ `null` **conserve** la valeur précédente (ne l'efface pas) ; seul un champ non-null écrase. Vérifié (`phone`/`fonction` du 1er appel conservés, `message` écrasé). Comportement souhaitable mais à connaître côté ÉVO 2.

---

## 7. Recommandations pour ÉVO 2 (vitrine `/i/:token`)

1. **Décision d'affichage** : appeler `getInvitationTokenState(token)` au montage de `EauVitrinePage`. Afficher le parcours d'inscription **uniquement si `'valid'`** ; pour `used`/`expired`/`revoked`/`unknown` → page de présentation/marketing (jamais d'inscription trompeuse). Le défaut `'unknown'` (hors-ligne/erreur) bascule donc proprement sur la page marketing.
2. **Fiche enrichie → enrôlement** : avant `Continuer avec Google`, faire `setPendingEnrollment({ intent: 'demande', nom, email, phone, fonction, message })`. Le handler global `GestionEauContext.tsx:151` relaiera vers `createDemande` (RPC 5-args). **L'email réel du compte Google est prioritaire** sur celui saisi dans la fiche (déjà géré).
3. **Re-soumission** : grâce à l'idempotence (`user_id` + `en_attente`), re-remplir la fiche met à jour la même demande. Attention au `COALESCE` (§6.4) : envoyer une chaîne vide plutôt que `null` si l'on veut réellement effacer un champ.
4. **RLS** : aucune nouvelle policy ajoutée ici ; les colonnes `phone`/`fonction`/`message` héritent des policies row-level existantes de `eau_demandes_acces` (Phase 2). Vérifier en ÉVO 2 que l'admin voit bien ces 3 nouveaux champs dans la liste (lecture déjà autorisée pour l'admin).
5. **Affichage admin** : prévoir l'affichage de `phone`/`fonction`/`message` dans `EauDemandesPage` (cartes de demandes) — non fait ici (back uniquement).

---

## 8. Sobriété respectée

Lecture limitée au §2 (+ 2 call-sites pour cadrage ÉVO 2). Réutilisation de l'existant (`withTimeout`, `saveLocal`, RPC SECURITY DEFINER, patterns offline-first). Aucun nouvel écran. Changement additif et borné. Un seul passage : SQL → types/Dexie → services → tests → déploiement → rapport.
