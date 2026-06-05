# RAPPORT D'ÉVOLUTION — Aide contextuelle dépliable (module `gestion-eau`)

**Version :** v3.23.0
**Date :** 2026-06-06
**Type :** Évolution additive (aucune régression, aucun SQL)
**Statut :** ✅ Livré, déployé sur `1sakely.org`, validé en live (rôle admin, émulation mobile)

---

## 1. Objectif

Rendre le module compréhensible par des **utilisateurs non techniques** : chaque écran et
chaque action explique **« à quoi ça sert »** et **« comment s'en servir »**, via un panneau
d'aide **dépliable** que l'utilisateur ouvre/ferme à la demande.

---

## 2. Ce qui a été livré

### 2.1 Composant réutilisable `EauAide`
Fichier : `frontend/src/modules/gestion-eau/components/EauAide.tsx`

- Bouton **ⓘ « Aide »** discret (pastille verte/or, charte AHUVI) + chevron animé.
- Panneau structuré **« À quoi ça sert »** / **« Comment s'en servir »**.
- **Accessibilité** : `aria-expanded`, `aria-controls`, focus visible (`focus:ring`).
- **Mémorisation par écran** en `localStorage` (clé `eau_aide_<id>`) via le hook `useAideState` :
  - **1ʳᵉ visite** (clé absente) → **déplié** (pour découvrir), et on mémorise « replié » pour la suite ;
  - **visites suivantes** → suit le dernier choix de l'utilisateur (déplié/replié).
- Robuste si `localStorage` indisponible (repli en mémoire).
- **Mobile-first** (testé en émulation Pixel 4 XL, largeur 412).

Exports : `useAideState`, `AideToggleButton`, `AidePanel`, `EauAide` (autonome), type `AideContenu`.

### 2.2 Textes centralisés
Fichier : `frontend/src/modules/gestion-eau/components/eauAideTextes.ts`
22 entrées d'aide (français simple, ton rassurant), conformes aux textes fournis.

### 2.3 Intégration
- **`EauPageShell`** reçoit une prop optionnelle **`aide`** : le bouton ⓘ apparaît près du titre,
  le **sous-titre devient cliquable**, et le panneau s'affiche sous l'en-tête. Un **seul état**
  partagé entre le bouton, le sous-titre et le panneau.
- **Composant `EauAide` autonome** pour les emplacements hors shell.

---

## 3. Couverture — TOUS les écrans / onglets

| Écran / onglet | Branchement | id aide |
|---|---|---|
| Tableau de bord | shell | `dashboard` |
| Relevés (général) | autonome (sous les onglets) | `releves` |
| Saisie bassin → **Entrée** | autonome **par onglet** | `bassin-entree` |
| Saisie bassin → **Niveau** | autonome **par onglet** | `bassin-niveau` |
| Saisie bassin → **Débit** | autonome **par onglet** | `bassin-debit` |
| Saisie compteur | shell | `saisie-compteur` |
| Tournée | autonome | `tournee` |
| Scan | autonome | `scan` |
| Suivi → Anomalies / Bilans | shell | `anomalies` |
| Suivi → Tendances | shell | `tendances` |
| Compteurs (admin) | shell | `compteurs` |
| Carte | autonome | `carte` |
| Facturation (admin) | shell | `facturation` |
| Configuration (admin) | shell | `config` |
| Utilisateurs (admin) | shell | `utilisateurs` |
| Demandes (admin) | shell | `demandes` |
| Annonces (admin) | shell | `annonces` |
| Audit (admin) | shell | `audit` |
| Centre d'alertes (admin) | shell | `alertes` |
| Rapports (admin) | shell | `rapports` |
| Espace client | shell | `client` |
| Page d'accueil / mission | autonome | `accueil` |

> Les 3 onglets de **Saisie bassin** ont bien une **aide par onglet** (exigence explicite).

---

## 4. Fichiers touchés

- **Nouveaux** : `EauAide.tsx`, `eauAideTextes.ts`, `__tests__/eauAide.test.tsx`.
- **Modifiés** : `EauPageShell.tsx` (prop `aide`) + 21 pages/écrans (branchement) + `appVersion.ts`,
  `package.json` (bump 3.23.0), `FONCTIONNEMENT-MODULES.md`.
- 26 fichiers au total, +477 / −16.

---

## 5. Qualité & vérifications

- `npx tsc --noEmit` → **propre** (garde-fou obligatoire).
- `npm run build` → **OK** (frontend@3.23.0).
- Tests : **97/97 verts** sur `gestion-eau`, dont **5 nouveaux** (`eauAide.test.tsx`) :
  rendu + sections, 1ʳᵉ visite dépliée, mémorisation du repli (2ᵉ visite), toggle + persistance
  `localStorage`, couverture du catalogue de textes.
- **Aucun autre module affecté** (tokens `ahuvi` réservés au module ; évolution additive).

---

## 6. Validation live (1sakely.org, rôle admin, émulation mobile Pixel 4 XL — 412 px)

> Le déploiement Netlify étant servi via Service Worker + cache CDN, la version a été forcée
> (désenregistrement SW + purge caches + URL cache-bustée). Version active confirmée :
> chunk `index-DRcP0_Dt.js`.

- **Tableau de bord** : bouton ⓘ « Aide » présent près du titre ; clic → panneau déplié avec les
  deux sections (texte conforme) ; `aria-expanded` bascule `false`↔`true` ; `localStorage`
  `eau_aide_dashboard` passe à `1` (persistance confirmée).
- **Relevés** : aide générale « Relevés » dépliée à la 1ʳᵉ visite + aide de l'onglet actif.
- **Saisie bassin** : aide **par onglet** vérifiée — Niveau (`bassin-niveau`) puis Débit
  (`bassin-debit`) avec « fermez la vanne de sortie… ». Le panneau change bien selon l'onglet.
- **Capture mobile** : rendu AHUVI conforme (pastille verte, fond clair, lisible en 412 px).

---

## 7. Critères d'acceptation — tous remplis

1. ✅ `tsc --noEmit` + build OK ; tests verts ; aucune régression.
2. ✅ Aide sur tous les écrans **et** sur les 3 onglets de Saisie bassin ; ⓘ + sous-titre cliquables ; déplie/replie.
3. ✅ Contenu « À quoi ça sert » + « Comment s'en servir » conforme (bassin inclus).
4. ✅ État mémorisé (localStorage), replié par défaut sauf 1ʳᵉ visite, lisible en mobile.
5. ✅ Style AHUVI cohérent ; navigation non gênée ; aucun autre module affecté.
6. ✅ `FONCTIONNEMENT-MODULES.md` mentionne l'aide contextuelle.
7. ✅ Rapport écrit (ce fichier) + résumé chat.

---

## 8. Notes / pièges rencontrés

- **Service Worker + cache CDN Netlify** : pour valider la toute nouvelle version, désenregistrer
  le SW + purger les caches **et** utiliser une URL cache-bustée (le HTML de la route SPA était
  encore servi par le cache edge). Voir piège SW déjà documenté dans `CLAUDE.md`.
- **Tests `localStorage`** : le `setup.ts` global mocke `localStorage` avec des `vi.fn()` sans
  stockage réel → le test d'aide installe un `localStorage` en mémoire pour vérifier la persistance.
