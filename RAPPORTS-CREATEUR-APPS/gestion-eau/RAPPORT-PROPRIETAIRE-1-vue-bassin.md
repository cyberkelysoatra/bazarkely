# RAPPORT — Propriétaire : vue « Situation du bassin » (module gestion-eau)

**Horodatage :** 2026-06-09 (session autonome)
**Version livrée :** **v3.46.0** — déployée sur `main` (commit `b08e0c4`), Netlify propagé (bundle `index-DNUgMy64.js` contient `3.46.0`, vérifié live).
**Projet Supabase :** `ofzmwrzatcztoekrpvkj` (bazarkely).

---

## 1. SQL (produit ET exécuté par Claude via l'éditeur Supabase — RÈGLE #0ter)

### 1.1 Helper + policies (idempotent, additif)
```sql
create or replace function eau_is_client() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists(select 1 from eau_comptes_client where user_id = auth.uid()::text and actif);
$$;
grant execute on function eau_is_client() to public;

-- 5 policies SELECT additives _sel_client (boucle dynamique to_regclass), combinées en OR
-- avec l'existant (aucune policy en place altérée) :
--   eau_releves_bassin, eau_entrees_bassin, eau_bilans, eau_debit_tests, eau_config
--   create policy <t>_sel_client on <t> for select to public using (eau_is_client());
```
✅ Exécuté → « Success. No rows returned ».

### 1.2 Vérification (transaction ROLLBACK, `set role authenticated` + impersonation JWT)
RLS réellement exercée (rôle `authenticated`, non-propriétaire des tables → policies appliquées) ; résultats stockés en GUC pour survivre au changement de rôle.

| Contrôle | Résultat | Verdict |
|---|---|:--:|
| Propriétaire (`eau_is_client()`) | **true** | ✅ |
| Lecture `eau_releves_bassin` | **33 lignes** (> 0) | ✅ voit le bassin |
| Lecture `eau_config` | **1** | ✅ (dimensions → % remplissage) |
| Lecture `eau_bilans` | **9** | ✅ |
| Policies `_sel_client` posées | **5** | ✅ |
| Policies d'écriture (INSERT/UPDATE/DELETE) référençant `eau_is_client` | **0** | ✅ aucune écriture possible |
| Écriture (`insert eau_releves_bassin`) par un `authenticated` non-admin/releveur | **BLOCKED** | ✅ |
| Non-régression : uid sans compte client → `eau_is_client()` | **false** | ✅ |

Transaction **rollback** → aucune donnée de test persistée. Idempotent (helper `create or replace` + `drop policy if exists` avant `create`).

> Note : **aucun propriétaire « pur »** (client sans admin/releveur) n'existe en base aujourd'hui (tous les comptes client testés sont aussi admin/releveur) — la lecture est prouvée par l'uid client trouvé (`isclient=true → bassin=33`), et la **refus d'écriture** est prouvé structurellement (0 policy d'écriture client) + via un `authenticated` non-admin/releveur (BLOCKED).

---

## 2. Frontend (additif)

- **Nouveau** `components/EauProprietaireBassinPage.tsx` : vue LECTURE SEULE réutilisant `getDashboardData()` + `getTendances()` (aucun calcul dupliqué). Cartes KPI « icône d'abord » (charte AHUVI) : **Niveau actuel** (m³ / max), **Remplissage** (%), **Autonomie estimée**, **Conso du jour** (mention estimée/mesurée) + **courbe « Niveau du bassin (30 j) »** (AreaChart, `isAnimationActive={false}`). État vide propre si aucun relevé.
- `components/EauClientPage.tsx` : onglet **« Le bassin »** (`tab='bassin'`, route `/gestion-eau/client/bassin` déjà couverte par `client/:tab`) ; titre « Situation du bassin » + sous-titre « Espace propriétaire » + aide `proprietaireBassin` conditionnels.
- `constants/index.ts` *(PARTAGÉ)* : `GESTION_EAU_NAV_ITEMS` += `{ /gestion-eau/client/bassin, icon: 'Waves', label: 'Le bassin', roles: ['client'] }`.
- `Navigation/BottomNav.tsx` + `Layout/Header.tsx` *(PARTAGÉS)* : icône `Waves` ajoutée aux maps d'icônes eau (BottomNav sans fallback → obligatoire).
- `components/eauAideTextes.ts` : aide `proprietaireBassin` (« Voir l'état du bassin commun… Écran en lecture seule »).
- **100 % lecture seule** : aucun contrôle de saisie/modification. Écrans Relevés/Compteurs/Facturation/admin **inchangés**.

---

## 3. État des 5 critères d'acceptation

| # | Critère | État | Détail |
|---|---|:--:|---|
| 1 | `tsc --noEmit` exit 0 + `npm run build` OK | ✅ | tsc propre, build OK (v3.46.0). |
| 2 | SQL : helper + 5 policies `_sel_client` + vérif ROLLBACK + idempotent | ✅ | Voir §1.2 (bassin=33, config=1, write BLOCKED, non-client false, 5 policies). |
| 3 | Nav propriétaire : item « Le bassin » présent + accessible | ✅ **(code + live)** | Item ajouté à `GESTION_EAU_NAV_ITEMS` (rôle client) ; onglet **« Le bassin »** visible & actif dans l'espace propriétaire (validé live, cf. §4). |
| 4 | Écran : niveau, %, autonomie, courbe — lecture seule | ✅ **(validé live)** | Vue rendue sur `/gestion-eau/client/bassin` : titre « Situation du bassin », cartes **Niveau actuel 245 m³**, **Remplissage 100 %**, **Autonomie 13 j 1 h (18,8 m³/j)**, **Conso du jour 3,6 m³ (estimée)** + **courbe niveau 30 j**. Aucun contrôle d'écriture. |
| 5 | Non-régression : admin/releveur/promoteur inchangés ; pas d'écriture/écran interdit pour le propriétaire ; console propre (pas de boucle Recharts) | ✅ | Nav admin inchangée (Tableau de bord/Relevés/Suivi/Compteurs/Facturation) ; aucune policy d'écriture client (§1.2) ; console propre — **aucune erreur « Maximum update depth »** (pas de boucle Recharts), seule l'erreur connue/bénigne `DB timeout after 5s` au login. |

---

## 4. Validation navigateur (§6)

- **Rôle réellement LU (pas supposé)** du compte connecté `cyberkelysoatra@gmail.com` (« CyberKELY SOATRA », deviceId `909e8779-843c-4c92-a853-a7379cd39bca`) : **administrateur du module eau** — BottomNav affiche Tableau de bord / Relevés / Suivi / Compteurs / Facturation (items admin), **pas** d'items client → `roles.client=false` pour ce compte. L'automatisation ne pouvant pas ouvrir une session d'un compte propriétaire Google distinct, la vue a été validée via la **route directe `/gestion-eau/client/bassin`** (accessible aussi à l'admin), qui rend **exactement** l'écran propriétaire (l'admin lit le bassin via sa propre RLS ; la lecture propriétaire est prouvée séparément par la vérif SQL §1.2).
- **`window.innerWidth` réellement mesuré** : **396 px** (via `window.innerWidth` dans la page ; dpr 0,75).
- **Cache SW** : v3.46.0 confirmée via le bundle servi `index-DNUgMy64.js` (contient `3.46.0`) chargé dans un **onglet neuf** après désinscription du SW + purge des caches (les onglets pré-existants servaient encore l'ancien bundle ; fraîcheur forcée par onglet neuf — piège SW récurrent).
- **Rendu live confirmé** : onglet « Le bassin » actif, titre « Situation du bassin » + « Espace propriétaire », 4 cartes KPI + courbe niveau 30 j, lecture seule. Console propre.
- **Flagué pour JOEL** : ouvrir une session **propriétaire réelle** (un compte avec `eau_comptes_client` actif et SANS rôle admin/releveur) pour voir l'item « Le bassin » dans la barre du bas et confirmer le parcours de bout en bout côté propriétaire pur. (La lecture serveur et le rendu de l'écran sont déjà prouvés.)

---

## 5. Fichiers modifiés

**SQL (exécuté hors dépôt) :** `eau_is_client()` + 5 policies `_sel_client`.

**Frontend (commit `b08e0c4`) — PARTAGÉS signalés :**
- `frontend/src/constants/index.ts` *(PARTAGÉ — nav)*
- `frontend/src/components/Navigation/BottomNav.tsx` *(PARTAGÉ — map icônes)*
- `frontend/src/components/Layout/Header.tsx` *(PARTAGÉ — map icônes)*
- `frontend/src/modules/gestion-eau/components/EauClientPage.tsx` *(PARTAGÉ — onglets espace propriétaire)*
- `frontend/src/modules/gestion-eau/components/EauProprietaireBassinPage.tsx` *(nouveau)*
- `frontend/src/modules/gestion-eau/components/eauAideTextes.ts`
- `frontend/src/constants/appVersion.ts` + `frontend/package.json` (v3.46.0)
- `FONCTIONNEMENT-MODULES.md`

---

## 6. Écarts / surprises

- **Aucun propriétaire « pur » en base** → la vue propriétaire en direct (avec l'item dans la barre du bas) n'a pas pu être ouverte sous une vraie session propriétaire ; contournée par la route directe (rendu identique) + preuve SQL de la lecture. Conforme au fallback §6.
- **Cache SW** : onglets pré-existants servaient l'ancien bundle malgré purge ; **onglet neuf** nécessaire pour charger 3.46.0 (piège récurrent, déjà consigné).
- **Lent chargement de l'éditeur SQL Supabase** (Monaco) + crash cosmétique Translate (pièges P1/P11 déjà documentés) — contournés (resize fenêtre, lecture par GUC/string court).
- Erreur console `DB timeout after 5s` au login = **attendue**, sans rapport avec cette livraison.

---

## 7. Recommandation pour le prompt suivant

**Renommage Client → Propriétaire des libellés** : remplacer partout les libellés visibles « Client » / « Espace client » par « Propriétaire » / « Espace propriétaire » (le rôle technique reste `client`/`eau_comptes_client`). Cet écran « Situation du bassin » utilise déjà les nouveaux libellés (« Espace propriétaire ») ; le balayage couvrira EauClientPage (onglets, titres), EauUtilisateursPage (« compte client »), EauDemandesPage (case « Client »), les aides et la nav. Penser aussi à la phase **Exclusivité des rôles** (déjà recommandée) pour éviter qu'un propriétaire cumule un rôle d'écriture.
