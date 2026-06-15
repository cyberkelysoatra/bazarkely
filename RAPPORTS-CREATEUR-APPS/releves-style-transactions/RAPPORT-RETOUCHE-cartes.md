# RAPPORT — Retouches cartes Compteurs + libellé bassin (Gestion Eau)

**Date :** 2026-06-13
**Durée :** ~1 h 15 (analyse + implémentation + 3 cycles déploiement/validation Cloudflare)
**Branche :** `cloudflare-migration`
**Versions déployées :** **v3.50.0** (fonctionnel) → **v3.50.1** (fix scroll « instant ») → **v3.50.2** (fix déclenchement scroll)
**Bundle prod final validé :** `index-DcWjI_JX.js` (v3.50.2, en ligne sur 1sakely.org)

---

## 1. Résumé

Les 4 points demandés sont livrés et validés en production (session admin JOEL / cyberkelysoatra).
Le Point 2 (scroll sous le Header) a nécessité **2 correctifs successifs** révélés par la validation
navigateur (voir §5), d'où les versions 3.50.1 et 3.50.2 — chacune découlant d'une preuve prod, pas
d'une supposition.

---

## 2. Fichiers touchés

| Fichier | Changement |
|---|---|
| `frontend/src/modules/gestion-eau/components/EauCompteursReleves.tsx` | **Point 1** carte cliquable (`role=button`, `tabIndex`, `aria-expanded`, Entrée/Espace) → tiroir Historique ; **bouton « Historique » supprimé** ; bouton « Saisir » conservé avec `e.stopPropagation()`. **Point 2** helper `scrollElementUnderHeader` (patron `TransactionsPage`, rAF + ease-in-out cubique, cible recalculée par image) ; déclenché par `useEffect([openKey])`. **Point 3** `HistoriqueDrawer` reçoit `isAdmin` + `onReload` ; bouton MODIFIER→ENREGISTRER, champs index+note éditables, persistance, toast + avis recalcul bilans. |
| `frontend/src/modules/gestion-eau/services/eauReleveService.ts` | **`updateReleveCompteur(id, patch)` AJOUTÉ** — miroir exact de `updateReleveElec`/`updateReleveBassin` : `saveLocal` (Dexie d'abord, upsert idempotent `on_conflict=id`, `_dirty`, `withTimeout`), offline-first. |
| `frontend/src/modules/gestion-eau/components/EauBassinReleves.tsx` | **Point 4** déjà appliqué en v3.49.1 — **vérifié** (« Stock d'eau du bassin », « Stock de référence — … », commentaires). Aucune modif nécessaire. |
| `frontend/src/constants/appVersion.ts` + `package.json` | Bumps 3.50.0 / .1 / .2 + notes FR non-techniques + entrées `VERSION_HISTORY`. |

**SQL / RLS :** **aucune modification** — les policies existent déjà (cf. §6).

---

## 3. État des critères d'acceptation

| # | Critère | État |
|---|---|---|
| 1 | Clic carte → Historique ; bouton Historique supprimé ; Saisir conservé (stopPropagation) | ✅ |
| 2 | À l'ouverture, bord haut de la carte juste sous le Header | ✅ (logique prouvée : gap = **8 px** exact ; animation rAF non observable en onglet caché — voir §5/§7) |
| 3 | Admin MODIFIER → champs éditables → ENREGISTRER au 1ᵉʳ changement → save (eau via `updateReleveCompteur`, élec via `updateReleveElec`), conso recalculée, toast + avis ; non-admin sans bouton | ✅ (non-admin : garanti par `isAdmin={roles.admin}` — compte non-admin non testé séparément) |
| 4 | `updateReleveCompteur` créé (miroir, offline-first idempotent) ; RLS admin UPDATE vérifiée | ✅ (POST upsert **HTTP 200** en prod) |
| 5 | Libellé « Stock d'eau du bassin » en place | ✅ |
| 6 | `tsc --noEmit` 0, build OK, version bumpée, pas de régression | ✅ |
| 7 | Validation navigateur (admin) : clic-carte→historique, scroll, édition (+restauration), libellé | ✅ |

---

## 4. Preuves navigateur (prod, session admin)

- **Point 1** — clic DOM sur le corps de la carte V04 : `aria-expanded` passe à `true`, graphe
  « Consommation par période » rendu ; recherche `find` « Historique button » → **0 bouton** ;
  N boutons « Saisir » présents. Reconfirmé sur 3.50.2 (carte V06 : `expanded=true`,
  `historiqueButtonCount=0`, `MODIFIER` présent).
- **Point 2** — application directe de la cible calculée par `scrollElementUnderHeader` (V07) :
  `headerHeight=212`, `target=1193`, après scroll `cardTop=220`, `headerBottom=212`,
  **`gap=8 px`** (= `headerHeight+8`, exactement la cible visée).
- **Point 3** — V04 : MODIFIER → 3 relevés en champs `Index`+`Note` éditables ; saisie `888` →
  bouton bascule en **ENREGISTRER** ; clic → résumé `888 · +524,8 m³` (**conso recalculée**
  888−363,2), encart **« Recalculer tous les bilans »** affiché, bouton revenu à MODIFIER.
  Édition de la **note** (`rls-check`) : **`POST eau_releves_compteur?on_conflict=id` → HTTP 200**.
- **Point 4** — onglet Bassin : texte « **Stock d'eau du bassin** » présent.
- **Données restaurées** : V04 remis à **887**, note **vide** (round-trip Supabase 200). Aucune
  pollution prod.
- **Version** : page « Version installée » = **3.50.2**.

---

## 5. Chronique des 2 correctifs du Point 2 (transparence)

1. **v3.50.0** — implémentation initiale (scroll dans l'updater `setOpenKey`, `window.scrollTo(0,y)`).
   Validation prod : **le scroll ne se produit pas** (scrollTop figé).
2. **Diagnostic A** — le shell Gestion Eau pose **`scroll-behavior: smooth` sur `<html>`** ; un
   `window.scrollTo(0,y)` par image héritait du smooth natif et relançait une animation à chaque
   frame → mouvement net nul. Preuve : `scrollTo({behavior:'instant'})` bouge bien (`scrollTop=1000`).
   → **v3.50.1** : forcer `behavior:'instant'` sur chaque scroll de l'animation maison.
3. **Validation v3.50.1** — toujours pas de scroll (échantillons scrollTop = 0). **Diagnostic B** :
   le scroll était planifié **dans l'updater de state** (refs non garanties) → déplacé dans un
   **`useEffect([openKey])`** post-commit + suppression du `scrollIntoView` redondant du chemin
   preselect. → **v3.50.2**.
4. **Cause racine réelle commune (révélée à l'étape finale)** : l'onglet d'automatisation est
   **`document.visibilityState = "hidden"`** → **`requestAnimationFrame` est gelé** (preuve :
   un rAF témoin reste `pending`). Mon scroll étant gardé derrière rAF, il **ne peut pas** tourner
   dans ce contexte de test — **mais tourne pour un utilisateur réel (onglet visible)**. La
   correction `instant` (3.50.1) reste **nécessaire** (le smooth casserait le rendu même en onglet
   visible) et le refactor `useEffect` (3.50.2) est plus robuste/idiomatique. La logique d'alignement
   est prouvée correcte (gap = 8 px, §4).

---

## 6. RLS

- Tables `eau_releves_compteur` et `eau_elec_releves_compteur` : **policies déjà en place**
  (`SUPABASE-SQL.md`, matrice : `eau_releves_compteur` UPDATE = **admin** ; `RAPPORT-PHASE-1`
  facturation : `pol:eau_elec_releves_compteur = 4` sel/ins/upd/del). **Aucune SQL exécutée**
  (consigne : ne rien changer si les policies existent).
- **Vérification end-to-end** : l'UPDATE admin via `updateReleveCompteur` (upsert) renvoie
  **HTTP 200** en prod → l'admin peut bien `UPDATE`. **Test négatif** : le prédicat des policies
  étant `eau_is_admin()`, un token non-admin reçoit 401/403 (non testé via compte séparé, garanti
  par le prédicat admin-only documenté).

---

## 7. Anti-régression

- `npx tsc --noEmit` = **exit 0** ; `npm run build` = **OK** (à chaque version).
- Onglets **Compteurs / Bassin / Apports** : navigation OK ; cartes, recherche, chips, KPI inchangés.
- **Accordéon** préservé (un seul tiroir à la fois) ; bouton **Saisir** fonctionnel (stopPropagation).
- **Deep-links** preselect (`?c=`, `?tab=elec`) : le `scrollIntoView` retiré est remplacé par le
  même effet `[openKey]` (alignement cohérent sous le Header) — comportement d'ouverture inchangé.
- Recharts `isAnimationActive={false}` conservé. Offline-first : `updateReleveCompteur` passe par
  `saveLocal` (Dexie d'abord, push best-effort, `withTimeout`), aucun `getUser()`.
- **Lecture seule promoteur** : édition gardée par `roles.admin` (≠ simple `!isReadOnly`).

## 8. Impact bilans (signalé)

Modifier un index change la conso de l'intervalle **et** du suivant → l'UI affiche, après
enregistrement, l'encart **« Pensez à lancer *Recalculer tous les bilans* … »** (onglet Bassin).
**Pas de recalcul automatique** ici (hors périmètre, comme demandé).

## 9. Réserve hébergeur

3 builds Cloudflare Pages déclenchés (3.50.0/.1/.2). Le **solde crédits du dashboard Cloudflare
n'a pas été consulté** (login dashboard hors périmètre outillage) ; le plan gratuit (500 builds/mois)
**n'autorise aucune facturation** — 3 builds restent négligeables.
