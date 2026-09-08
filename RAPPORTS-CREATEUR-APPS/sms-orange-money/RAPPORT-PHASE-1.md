# Rapport — Phase 1 : Socle de données et ingestion des SMS Orange Money

**Horodatage :** 2026-09-08, session unique (≈ 19h30 → 20h10, heure de Madagascar)
**Version livrée :** v3.74.0
**Branche :** `cloudflare-migration`
**Projet Supabase :** `ofzmwrzatcztoekrpvkj`

---

## 1. Contexte atteint

La phase 1 est **terminée et vérifiée de bout en bout**. Le parseur, le contrôle de chaîne,
la table, les policies, l'Edge Function et le script de rejeu existent, sont déployés et
ont été éprouvés contre les 50 SMS réels du corpus.

**Aucune interface utilisateur n'a été créée**, conformément au périmètre. Aucun fichier
existant du dépôt n'a été modifié : la phase n'ajoute que des fichiers neufs (+ le bump de
version, obligatoire avant tout déploiement).

Serveur `npm run dev` : déjà actif sur le port 3000 au démarrage de la session (HTTP 200
vérifié), laissé tourner. La phase ne produisant aucun écran, il n'a servi à rien d'autre
qu'à respecter la consigne.

---

## 2. Itérations code → test → correction

| # | Ce qui a été tenté | Ce qui s'est passé | Correction |
|---|---|---|---|
| 1 | Écriture du parseur via un heredoc Bash | Échec de parsing du shell : le fichier contient des **caractères combinants bruts** (classe `[\u0300-\u036f]`) | Passage à l'outil d'écriture de fichier |
| 2 | 1re exécution de la suite de tests | 20/21. Mon test auxiliaire « rupture quand un maillon manque » attendait `ecart: +14675` | **Mon attente était fausse, pas le code** : retirer un débit place le solde annoncé *en dessous* de l'attendu → `ecart = −14675` |
| 3 | Copie du parseur dans `supabase/functions/_shared/` | L'éditeur de fonctions du tableau de bord est **à plat** (pas de sous-dossier commode) | Parseur déplacé **à côté** de `index.ts` (`supabase/functions/ingest-sms/`), import passé en `./parseurOrangeMoney.ts` |
| 4 | Transfert des sources vers l'éditeur du navigateur via le presse-papiers | **Corruption d'encodage** : `Get-Content -Raw` a lu l'UTF-8 en ANSI. La classe `[\u0300-\u036f]` est devenue `[Ì€-Í¯]` — **le retrait des accents aurait cessé de fonctionner en silence en production** | Double correction : (a) `Get-Content -Raw -Encoding UTF8`, (b) le parseur est réécrit **100 % ASCII** (échappements `\u`), pour qu'il survive à n'importe quel transfert |
| 5 | Lecture de `sms_inbox` par le script de rejeu en PostgREST direct | Impossible sans identifiant : RLS + `revoke from anon`. Obtenir un jeton utilisateur aurait exigé de saisir un mot de passe ou de moissonner une session — **tous deux interdits** | Ajout d'une **route de relecture** `GET ?ressource=inbox` à l'Edge Function, authentifiée par la clé d'appareil, dont le périmètre est imposé côté serveur |

**Aucune tentative n'a dépassé 2 échecs sur le même point.** La règle #4 (escalade) n'a pas
eu à s'appliquer.

---

## 3. État des critères d'acceptation

| Critère | État | Preuve |
|---|---|---|
| **AC1** — 50 SMS reconnus, répartition exacte | ✅ | Test `repartit exactement les 50 SMS entre les 8 modeles` : `PP_ENVOI 20, MP_MARCHAND 13, CI_BANQUE 10, CO_RETRAIT 3, CI_DEPOT 1, PP_NOMME 1, MP_OFFRE 1, ECHEC 1`. Aucun `reconnu: false`. |
| **AC2** — 48 vérifiés, 0 rupture | ✅ | Test `verifie 48 maillons et ne trouve aucune rupture` : 49 maillons (50 − 1 ECHEC sans solde) → 48 liens, 0 rupture. |
| **AC3** — Test de mutation sur le tri | ✅ | `controlerParOrdreArrivee()` produit des ruptures (dont `PP260821.1512.C18172`) tandis que `controlerChaine()` n'en produit aucune. Le test échouerait si le tri par ordre d'arrivée suffisait. |
| **AC4** — Table, index, policies vérifiés | ✅ | Via REST : `42501 permission denied` (≠ 404) prouve l'existence. Via SQL : **17 colonnes**, **3 index**, **9 policies**, `CREATE UNIQUE INDEX sms_inbox_user_reference_uniq ON public.sms_inbox USING btree (user_id, reference)`, RLS `true` sur les 3 tables. |
| **AC5** — Test négatif RLS | ✅ | En `rollback` : *« postgres voit 2 lignes \| u1 authentifié voit 1 ligne(s) : RLS-TEST-U1 »*. Nettoyage re-vérifié : 0 ligne de test restante. |
| **AC6** — Doublon → 1 seule ligne | ✅ | Rejeu du lot complet : `{"recus":50,"inseres":0,"doublons":50}`. SMS unique déjà connu : `{"recus":1,"inseres":0,"doublons":1}`. |
| **AC7** — Texte inconnu → `non_reconnu` sans échec du lot | ✅ | `{"recus":1,"inseres":1,"doublons":0,"non_reconnus":1}`, ligne présente avec `etat = 'non_reconnu'` et texte brut conservé. |
| **AC8** — Script de rejeu : 48 vérifiés, 0 rupture | ✅ | `node scripts/rejeu-sms-corpus.ts` → `maillons 49 / verifies 48 / ruptures 0` → **TOUT EST VERT**. |
| **AC9** — `tsc --noEmit` et `npm run build` | ⚠️ | `npx tsc --noEmit` : **exit 0**, et `npm run build` : **OK** (v3.74.0). **Mais voir la réserve importante ci-dessous** — la commande prescrite ne contrôle en réalité rien. |
| **AC10** — `expediteur` renseigné sur les 50 lignes | ✅ | Relecture : `Expediteur renseigne : 51 / 51` (50 du corpus + 1 texte inconnu). |
| **AC11** — `sms_expediteurs_autorises` lisible par un appareil relié | ✅ | 4 lignes : `Airtel Money / BMOI / MVola / OrangeMoney`. Route `GET` de l'Edge Function, authentifiée par clé d'appareil. |
| **AC12** — Aucun fichier partagé modifié | ✅ | `git status` : uniquement des fichiers **neufs**. Ni `Header.tsx`, ni `BottomNav.tsx`, ni `AppLayout.tsx`, ni `ModuleSwitcherContext.tsx`, ni `constants/index.ts`. |

### ⚠️ Réserve sur AC9 — à porter à la connaissance de JOEL

`npx tsc --noEmit`, la commande imposée par `CLAUDE.md` comme garde-fou obligatoire,
**sort en 0 parce qu'elle ne vérifie rien**. Le `tsconfig.json` racine du frontend contient
`"files": []` et ne fait que référencer deux sous-projets ; lancé sans `-p`, `tsc` ne
typecheck donc aucun fichier.

Le vrai contrôle est `npx tsc --noEmit -p tsconfig.app.json` (ou `npm run typecheck`), et il
révèle **1984 erreurs de types préexistantes** dans le dépôt.

- **Aucune** de ces erreurs ne concerne `sms-inbox` (vérifié par filtrage).
- Le total est **identique avant et après** cette phase : je n'en ai ajouté aucune.
- Le garde-fou censé protéger des « références orphelines après refactor » (piège documenté
  dans `CLAUDE.md`) est donc **inopérant depuis un moment**. C'est un point à traiter hors
  de cette phase.

---

## 4. Fichiers créés

Tous **nouveaux**. Aucun fichier partagé, aucun fichier existant modifié.

| Fichier | Rôle |
|---|---|
| `frontend/src/modules/sms-inbox/utils/parseurOrangeMoney.ts` | Parseur des 8 modèles, sans dépendance. **100 % ASCII** par choix délibéré. |
| `frontend/src/modules/sms-inbox/utils/controleChaine.ts` | Contrôle de chaîne des soldes, tri par horodatage de référence. |
| `frontend/src/modules/sms-inbox/utils/__tests__/corpus-50-sms.txt` | Corpus copié **à l'octet près** (md5 identique à la source). |
| `frontend/src/modules/sms-inbox/utils/__tests__/parseurOrangeMoney.test.ts` | 21 tests : reconnaissance, répartition, particularités des 8 modèles, normalisation, chaîne, mutation du tri. |
| `frontend/src/modules/sms-inbox/utils/__tests__/miroirParseur.test.ts` | **Garde anti-dérive** : échoue si la copie serveur du parseur diverge de la source. |
| `supabase/migrations/20260908120000_create_sms_inbox.sql` | DDL idempotent : 3 tables, index, contraintes, RLS, policies. |
| `supabase/functions/ingest-sms/index.ts` | Edge Function : ingestion `POST`, relecture `GET`. |
| `supabase/functions/ingest-sms/parseurOrangeMoney.ts` | Copie stricte du parseur (Deno ne peut pas importer depuis `frontend/src`). |
| `scripts/rejeu-sms-corpus.ts` | Rejeu du corpus + tableau de contrôle. |

**Modifiés (bump de version, obligatoire avant déploiement) :**
`frontend/package.json`, `frontend/src/constants/appVersion.ts`.

**Dépendances ajoutées : aucune.** Le parseur et le contrôle de chaîne n'importent rien.

---

## 5. Écarts au prompt, assumés et justifiés

1. **Le parseur ne vit pas dans `supabase/functions/_shared/`** mais à côté de `index.ts`.
   Raison : l'éditeur de fonctions du tableau de bord Supabase gère les fichiers à plat.
   Le déploiement reflète ainsi **exactement** le dépôt. Le test miroir interdit la dérive.

2. **Le script de rejeu relit `sms_inbox` par l'Edge Function**, pas par PostgREST direct.
   Raison : RLS + `revoke from anon` rendent la lecture impossible sans jeton utilisateur, et
   en obtenir un aurait exigé de saisir un mot de passe ou de moissonner une session — deux
   choses interdites par les règles du projet. La route ajoutée est authentifiée par la clé
   d'appareil et **son périmètre est imposé côté serveur** : un appareil ne peut jamais lire
   les SMS d'un autre utilisateur. C'est aussi ce dont le capteur Android de la phase 3 aura
   besoin pour se rapprocher.

3. **Horodatages en `+03:00`** (heure de Madagascar). Le prompt demandait « ISO 8601 » sans
   préciser le fuseau. Le décalage est uniforme, donc le tri par chaîne reste correct.

4. **Déploiement de l'Edge Function par le tableau de bord**, pas par la CLI : la CLI exige
   un jeton d'accès personnel que je n'ai pas créé (création/manipulation d'identifiant).

---

## 6. Points de vigilance pour la suite

**Le piège d'encodage mérite d'être retenu.** Faire transiter du code source par le
presse-papiers Windows avec `Get-Content -Raw` (sans `-Encoding UTF8`) corrompt l'UTF-8
**en silence**. Ici, la classe de caractères combinants serait devenue de la bouillie et le
retrait des accents aurait cessé de fonctionner en production — sans la moindre erreur, avec
pour seul symptôme des SMS accentués soudainement « non reconnus ». Deux parades sont en
place : encodage explicite, et parseur volontairement ASCII pur.

**État de la base à l'issue du rejeu :** `sms_inbox` contient **51 lignes** pour le compte
`itampolo.nosybe@gmail.com` — les 50 SMS réels du corpus (`etat = 'a_valider'`) et 1 ligne
synthétique issue du test « texte inconnu » (`etat = 'non_reconnu'`, texte
*« Bonjour, votre forfait Orange expire demain… »*). Cette ligne synthétique est recréée à
chaque exécution du script ; elle est sans effet mais peut être supprimée à volonté.

Un appareil de test est enregistré dans `sms_appareils` (libellé *« Appareil de rejeu du
corpus (phase 1) »*), relié à ce compte. Seul le **hachage SHA-256** de la clé est stocké.

---

## 7. Recommandations pour la phase 2

1. **Rapprochement SMS → transaction.** Le champ `transaction_id` et l'état `auto_ecrit`
   existent déjà mais ne sont jamais renseignés. C'est le cœur de la phase 2 : décider quels
   SMS deviennent des transactions sans intervention, et lesquels passent par une validation.

2. **Se servir du contrôle de chaîne comme garde-fou, pas comme décor.** L'état
   `rupture_chaine` est défini et jamais utilisé. Une rupture signale un SMS manquant : dans
   ce cas, écrire automatiquement une transaction serait hasardeux. Proposition : basculer en
   `a_valider` tout SMS situé après une rupture.

3. **`tiers` est brut et mérite un rapprochement.** Un numéro (`0326528126`) pour les envois,
   un nom de commerçant (`MAX IT`, `LEADER PRICE SARL`) pour les paiements. `MAX IT` revient
   **8 fois sur 13** paiements : une table de correspondance tiers → catégorie rendrait le
   classement automatique presque gratuit.

4. **Traiter la dette de types avant qu'elle ne morde.** Les 1984 erreurs préexistantes
   privent le projet de son garde-fou. Rien qu'ajouter un script
   `"typecheck:app": "tsc --noEmit -p tsconfig.app.json"` et geler le compteur empêcherait
   la dette d'augmenter.

5. **`recu_le` vs `horodatage` : ne pas les confondre.** `horodatage` est la date de
   l'opération (lue dans la référence), `recu_le` celle de la réception du SMS. Tout tri
   métier doit se faire sur `horodatage` — c'est exactement la leçon du 21/08/2026.

---

## 8. Commandes de vérification

```bash
cd C:\bazarkely-2\frontend && npx vitest run src/modules/sms-inbox/
```

```bash
cd C:\bazarkely-2 && node scripts/rejeu-sms-corpus.ts
```
