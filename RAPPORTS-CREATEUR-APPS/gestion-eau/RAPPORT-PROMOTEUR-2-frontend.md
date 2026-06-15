# RAPPORT — Promoteur PHASE 2 (frontend) — module gestion-eau

**Horodatage :** 2026-06-09 (session autonome)
**Version livrée :** **v3.44.0** — déployée sur `main` (commit `85b58e8`), Netlify propagé (bundle servi `index-BIBsVLXK.js` contient `3.44.0`).
**Prérequis :** Phase 1 (RLS) déjà en place — colonne `eau_roles.promoteur`, helper `eau_is_promoteur()`, lecture-all promoteur, RPC `eau_set_alert_thresholds` (cf. `RAPPORT-PROMOTEUR-1-rls.md`).

---

## 1. État des 6 critères d'acceptation

| # | Critère | État | Détail |
|---|---|:--:|---|
| 1 | `tsc --noEmit` exit 0 + `npm run build` OK | ✅ | tsc propre (0 erreur), build OK (v3.44.0), 23 tests verts (eauNavRoles + eauScanQr). |
| 2 | Toggle **Promoteur** sur l'écran Utilisateurs (admin) + persistance `eau_roles.promoteur` | ✅ (code) / ⚠️ (E2E) | Case « Promoteur » ajoutée à côté d'Administrateur/Releveur ; `setRoles` persiste `promoteur` (upsert idempotent, push Supabase générique). **Live non validé** : navigateur admin non connecté (voir §6). |
| 3 | Accès **lecture** promoteur à tous les écrans (métier + admin), toutes les factures | ✅ (code) / ⚠️ (E2E) | Nav + routes + Header ouverts au promoteur ; RLS Phase 1 garantit la lecture-all. Live non validé (idem). |
| 4 | **Lecture seule** : aucun contrôle d'écriture cliquable pour le promoteur | ✅ (code) / ⚠️ (E2E) | `isReadOnly` masque/désactive les contrôles + gardes `if (isReadOnly) return;` sur tous les handlers de mutation. Live non validé (idem). |
| 5 | **Seuils** : promoteur édite seulement les seuils d'alerte (via RPC) dans Config | ✅ (code) / ⚠️ (E2E) | EauConfigPage : 6 seuils éditables + bouton « Enregistrer les seuils d'alerte » → RPC `eau_set_alert_thresholds` ; tout le reste de la config désactivé. Live non validé (idem). |
| 6 | **Non-régression** admin/releveur/client + console propre | ✅ (releveur/client validé live) / ⚠️ (admin non validé live) | **Validé live sur le navigateur cyberkelysoatra (releveur+client)** : app charge en v3.44.0, nav releveur+client correcte, **saisie Niveau affiche le formulaire ET le bouton « Enregistrer le relevé » présent et actif, SANS badge lecture seule** → la garde `isReadOnly` ne fuite PAS vers un non-promoteur. Console : seule erreur = `DB timeout after 5s` au login, **attendue et bénigne** (session reste valide via `catch`). **Admin non validé live** (navigateur joelsoatra non connecté). |

**Synthèse :** critère 1 ✅ ; critère 6 ✅ pour releveur/client (validé live), ⚠️ pour admin (non validé live) ; critères 2-5 ✅ au niveau code (tsc/build/tests) mais **E2E promoteur en attente** car le navigateur admin n'était pas connecté pour attribuer le rôle.

---

## 2. Compte de test & mesure

- **Navigateur connecté :** « CyberKELY SOATRA » (deviceId `909e8779-843c-4c92-a853-a7379cd39bca`), compte app **cyberkelysoatra** = **releveur + client** (NON admin).
- **`window.innerWidth` réellement mesuré : `588` px** (via `window.innerWidth` exécuté dans la page ; `devicePixelRatio` 0,75, d'où un screenshot rendu en 441 px — la valeur logique réelle est **588**).
- **Cache SW :** confirmé sur v3.44.0 — script chargé `assets/index-BIBsVLXK.js` (contient `3.44.0`), SW actif `sw-custom.js`, aucun SW en attente. Pas de résidu d'ancienne version (auto-update v3.43.0 effective).
- **Navigateur admin (joelsoatra) : NON connecté** → impossible d'attribuer le rôle Promoteur via l'UI ni de valider côté admin. Conforme au fallback §6 (« valide ce qui l'est et flague le reste »).

---

## 3. Écrans où des contrôles d'écriture ont été masqués/désactivés

`isReadOnly = roles.promoteur && !roles.admin && !roles.releveur` (un admin/releveur cumulant promoteur **garde** l'écriture).

| Écran | Contrôles masqués/désactivés | Handlers gardés (`if isReadOnly return`) |
|---|---|---|
| **EauSaisieBassinPage** | boutons Enregistrer (Entrée/Niveau/Débit) masqués + tous les inputs désactivés ; badge | submitEntree, submitNiveau, submitDebit, saveEdit, removeReleve, recomputeAll |
| **EauSaisieCompteurPage** | bouton Enregistrer, bouton Scan, inputs index/note, capture & retrait photo désactivés ; badge | submit, onPhotoChange |
| **EauRelevesPage** | bouton scanner (Caméra) masqué ; badge | — |
| **EauTourneePage** | badge seul (navigation, écriture en aval déjà gardée) | — |
| **EauCompteursPage** | boutons Nouveau/Modifier/Supprimer masqués, Enregistrer désactivé ; QR (consultation) conservé ; badge | openNew, openEdit, save, remove |
| **EauFacturationPage** | bouton Générer masqué, bascule de statut → span non cliquable, Relancer masqué ; **Aperçu / Export PDF / Export CSV conservés (lecture)** ; badge | runGenerate, toggleStatut, relancer |
| **EauDemandesPage** | bouton « Inviter » → badge ; bloc « Importer du répertoire » masqué ; Valider/Refuser (demandes) masqués ; Révoquer (invitations) masqués ; formulaire/lot d'invitation inatteignables ; partage WhatsApp/copie d'invitations existantes conservés (lecture) | openContactPicker, createBatch, submitInvite, valider, refuser, revoke |
| **EauAnnoncesPage** | boutons Nouvelle/Modifier/Supprimer masqués, bascule actif/inactif → span, Enregistrer désactivé ; badge | openNew, openEdit, save, remove, toggle |
| **EauAlertesPage** | bouton Générer → badge, boutons Traité / Lu masqués ; `markAllLues` auto neutralisé ; **activerNotifications conservé** (action locale) ; badge | generer, traiter, basculerLu |
| **EauAnomaliesPage** | bouton « Marquer traitée » masqué ; badge | traiter |
| **EauQrCompteurManager** | bouton Générer QR + champ emplacement désactivés, Supprimer QR masqué ; **Export JPEG / Impression conservés** ; badge | addQr, removeQr |
| **EauConfigPage** | tous les champs sauf les 6 seuils d'alerte désactivés ; purge cache désactivée ; bouton → « Enregistrer les seuils d'alerte » (RPC) ; badge | onSave branché RPC, purgerCacheCarte |
| **EauUtilisateursPage** | bouton « Compte client » → badge, cases de rôle désactivées ; badge | toggleRole, submitClient |

**Contrôles volontairement CONSERVÉS pour le promoteur** (lecture/export/partage, aucune écriture base) : Aperçu/Export PDF/Export CSV (Facturation), Export JPEG/Impression QR, activer les notifications (Alertes), partage WhatsApp/copie de liens d'invitations déjà créées (Demandes), génération de PDF de rapport mensuel (Rapports — sortie en lecture, non gardée).

**Contrôle non couvert / à noter :** aucun contrôle d'écriture résiduel identifié sur les écrans listés. Les sections admin déjà conditionnées par `roles.admin` (ex. « Relevés récents (admin) » de la saisie bassin) sont de toute façon invisibles pour un promoteur pur ; une garde `isReadOnly` y a tout de même été ajoutée par défense en profondeur.

---

## 4. Fichiers créés / modifiés

**PARTAGÉS (impact hors-promoteur — vérifiés non régressifs) :**
- `types/gestionEau.ts` — `EauRoles`/`EauRole`/`RoleRow` += `promoteur`.
- `services/eauRoleService.ts` — `getRolesForUser` + `setRoles` gèrent `promoteur`.
- `context/GestionEauContext.tsx` — expose `isReadOnly` ; `hasEauAccess` inclut `promoteur` ; `EMPTY_ROLES` += `promoteur`.
- `constants/index.ts` — `GESTION_EAU_NAV_ITEMS` ouverts au promoteur (dashboard/relevés/suivi/compteurs/facturation).
- `components/Layout/header/HeaderEauActions.tsx` — entrées admin visibles au promoteur (+ badge alertes).
- `components/GestionEauRoutes.tsx` + `components/EauRoleProtectedRoute.tsx` — routes métier+admin autorisées au promoteur, `home` → tableau de bord.

**Nouveau :** `components/EauReadOnly.tsx` (`EauReadOnlyBadge` / `EauReadOnlyBanner`).

**Écrans (lecture seule)** : EauSaisieBassinPage, EauSaisieCompteurPage, EauRelevesPage, EauTourneePage, EauCompteursPage, EauFacturationPage, EauDemandesPage, EauAnnoncesPage, EauAlertesPage, EauAnomaliesPage, EauQrCompteurManager, EauConfigPage, EauUtilisateursPage.

**Tests** : `__tests__/eauNavRoles.test.tsx` (cas promoteur) + `__tests__/eauScanQr.test.ts` (`EauRoles` += promoteur).

**Versioning/doc** : `constants/appVersion.ts` + `package.json` (3.44.0) ; `FONCTIONNEMENT-MODULES.md` (rôles + matrice d'accès).

---

## 5. Écarts au prompt

- **Renommage Client → Propriétaire NON effectué** (hors périmètre, phase ultérieure) — mais une mention « client/propriétaire » a été ajoutée dans la note de version et la doc pour anticiper.
- **Exclusivité des rôles NON implémentée** (conforme : phase ultérieure). Le promoteur reste cumulable ; `isReadOnly` ne s'active que pour un promoteur « pur ».
- **Validation navigateur §6 partielle** : seul le navigateur non-admin était connecté → étapes 1-4 de §6 (attribution + vérif promoteur + vérif admin + restauration) **non exécutées**. Aucune modification de rôle n'a été faite en production (aucun état à restaurer).

---

## 6. Surprises / points d'attention

- **Un seul navigateur connecté** (cyberkelysoatra, non-admin) au lieu des deux annoncés ; le navigateur admin (joelsoatra) était absent → l'E2E promoteur n'a pas pu être réalisé proprement (RÈGLE #3 : ne pas déclarer « validé » ce qui ne l'est pas).
- **`window.innerWidth` réel = 588** alors que les screenshots rendent en 441 (dpr 0,75) — la mesure logique fait foi, comme exigé.
- La lecture JS de la page est bloquée quand l'URL contient une query string (« Cookie/query string data ») → vérifications faites par screenshot + JS sur URL sans query.
- L'erreur console `DB timeout after 5s` au login est **attendue** (déjà documentée) et sans rapport avec cette livraison.

---

## 7. Recommandations pour la suite

1. **Valider l'E2E promoteur** dès que le navigateur admin (joelsoatra) est connecté : attribuer « Promoteur » à un compte de test + décocher Releveur pour obtenir un promoteur pur, puis vérifier critères 3/4/5 (accès lecture partout, toutes factures visibles, aucun bouton d'écriture, réglage d'un seuil d'alerte qui persiste) et critère 6 (admin écrit toujours). Restaurer l'état du compte de test ensuite.
2. **Phase Exclusivité des rôles** : un promoteur ne devrait à terme pas pouvoir cumuler admin/releveur (et inversement) — ajouter le garde-fou côté UI + serveur.
3. **Renommage Client → Propriétaire** (UI + libellés), cohérent avec le vocabulaire copropriété.
4. **Vue bassin propriétaire** : exposer au client/propriétaire le niveau du bassin commun en lecture (aujourd'hui réservé admin/releveur/promoteur).
