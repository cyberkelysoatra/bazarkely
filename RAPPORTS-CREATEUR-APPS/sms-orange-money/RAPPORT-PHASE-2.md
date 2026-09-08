# Phase 2 — Le SMS crée la transaction, automatiquement

**Version livrée :** v3.75.0 — branche `cloudflare-migration` — 2026-09-08

---

## Ce qui a été fait, en une phrase

Quand un SMS d'opération Mobile Money arrive dans `sms_inbox`, la transaction correspondante
est créée toute seule et apparaît dans la page Transactions — **sans qu'aucun écran existant
n'ait été modifié**.

---

## État des critères d'acceptation

| # | Critère | État | Comment c'est prouvé |
|---|---------|------|----------------------|
| **AC1** | Un SMS reconnu **et** concordant crée la transaction, sans intervention | ✅ | Test d'intégration bout en bout sur le corpus réel : 48 opérations écrites, `bilan.erreurs = []`. En navigateur, la passe automatique se déclenche seule 8 s après le démarrage (log observé). |
| **AC2** | La transaction apparaît dans la page Transactions, sans qu'aucun fichier de cette page soit modifié | ✅ | L'écriture passe par `transactionService.createTransaction()`, exactement la même porte que le formulaire de saisie. `TransactionsPage.tsx` n'est pas dans la liste des fichiers touchés (voir plus bas). |
| **AC3** | Un SMS non reconnu, ou dont le solde ne concorde pas, ne crée aucune transaction et ne provoque aucune erreur visible | ✅ | Test dédié : les 2 SMS écartés ne laissent aucune trace, leurs lignes restent en `a_valider` avec `transaction_id = null`. Tout échec de lecture est capté et journalisé en `warn`, jamais remonté à l'écran. |
| **AC4** | Un SMS avec frais crée **deux** transactions | ✅ | Test sur `CO260801.0732.C44491` : 2 lignes, principale −60 000 Ar et frais −1 900 Ar, identifiants distincts. Test miroir : un SMS sans frais (`CI260808.1220.D56174`) ne crée qu'une ligne. |
| **AC5** | Rejouer l'écriture du même SMS ne crée aucun doublon | ✅ | Test dans le cas le plus défavorable : toute la file est remise à `a_valider` puis rejouée → `transactionsCreees = 0`, `dejaEcrites = 48`, l'ensemble des identifiants est identique au premier passage. |
| **AC6** | Une opération Orange Money est rattachée à un compte Orange Money, jamais à un autre | ✅ | Test : un seul compte créé, de type `orange_money`, et les 71 transactions y sont rattachées. Test complémentaire : un compte `orange_money` déjà existant est réutilisé, aucun second compte créé. Le repli en cas d'expéditeur inconnu est Orange Money — jamais un compte bancaire ni espèces. |
| **AC7** | Bilan chiffré sur les 50 SMS, avec les écartés et leur motif | ✅ | Voir la section « Le corpus des 50 SMS » ci-dessous. |
| **AC8** | ⛔ Aucun écran existant modifié | ✅ | Liste exhaustive des fichiers touchés ci-dessous. Vérifié en direct dans le navigateur : barre de navigation inchangée (6 entrées), aucune occurrence du mot « sms » dans l'interface, aucune erreur console. |
| **AC9** | `npx tsc --noEmit -p tsconfig.app.json` et `npm run build` passent | ✅ | Compteur **1984 → 1984**, jeu d'erreurs strictement identique au baseline. Build production ✅. |

---

## Le corpus des 50 SMS (AC7)

| | |
|---|---|
| SMS traités | **50** |
| Opérations écrites | **48** |
| dont avec frais (2ᵉ ligne) | **23** |
| **Transactions créées** | **71** (48 principales + 23 de frais) |
| SMS écartés | **2** |

### Les 2 SMS écartés, et pourquoi

| Référence | Motif | Détail |
|---|---|---|
| `OR260903ZQO043` | `non reconnu` | Transaction échouée côté opérateur (modèle `ECHEC`) : aucun mouvement, aucun montant, aucun solde. Il n'y a rien à écrire. |
| `CO260729.1038.C39365` | `solde non concordant` | Première ligne de la chaîne : il n'existe aucun solde précédent auquel la confronter. La condition n° 2 ne peut pas être établie, donc — sans tolérance — rien n'est écrit. |

**Zéro rupture de chaîne réelle** sur le corpus : les 48 autres opérations recollent toutes
exactement au solde précédent, au franc près. Un test indépendant rejoue la chaîne et vérifie
que chaque opération retenue — et seulement celle-là — est justifiée par son prédécesseur.

---

## Liste exhaustive des fichiers touchés (preuve de l'AC8)

### Créés — tous dans `frontend/src/modules/sms-inbox/`

| Fichier | Rôle |
|---|---|
| `utils/identifiantTransaction.ts` | UUID v5 déterministe dérivé de la référence du SMS (idempotence) |
| `utils/decisionEcriture.ts` | Décision pure : qui est écrit, qui est écarté, avec le motif |
| `utils/libelles.ts` | Libellés d'opération et rattachement à l'opérateur |
| `services/ecritureAutomatiqueService.ts` | Passe de fond : lecture, écriture, marquage |
| `pages/SmsInboxPage.tsx` | Page brute `/sms-inbox` (liste seule, liée depuis nulle part) |
| `utils/__tests__/decisionEcriture.test.ts` | 38 tests : corpus, idempotence, rattachement, libellés |
| `services/__tests__/ecritureAutomatique.test.ts` | 10 tests d'intégration bout en bout (AC1, AC3→AC6) |

### Modifiés — 4 fichiers, tous de façon strictement additive

| Fichier | Modification | Pourquoi ce n'est pas un écran |
|---|---|---|
| `src/components/Layout/AppLayout.tsx` | **+2 lignes utiles** : un `lazy()` et la route `/sms-inbox` | C'est **l'unique exception prévue par le prompt**. Aucun bouton, aucune entrée de menu, aucune pastille. |
| `src/services/transactionService.ts` | Paramètre **optionnel** `options?: { id?: string }` sur `createTransaction`, et `options?.id ?? crypto.randomUUID()` | Service, pas écran. Purement additif : sans ce paramètre, le comportement est identique au précédent — tous les appelants existants sont inchangés. |
| `src/main.tsx` | Import + appel de `demarrerEcritureAutomatiqueSms()` | Amorçage de l'application, pas un écran : aucune interface produite, aucune navigation. |
| `src/constants/appVersion.ts` + `package.json` | Bump 3.74.0 → 3.75.0 | Versioning obligatoire avant déploiement. |

**Aucun fichier de `pages/`, aucun de `components/Navigation/`, aucun `constants/index.ts`.**
Le seul fichier de `components/Layout/` touché est `AppLayout.tsx`, pour la seule route.

---

## Comment ça marche

### La décision (`deciderEcriture`)

Fonction **pure**, sans base ni réseau, donc rejouable telle quelle contre le corpus. Deux
conditions, **sans tolérance ni arrondi** :

1. le modèle est reconnu et différent de `ECHEC` ;
2. `solde de la ligne précédente ± (montant + frais) === solde annoncé`.

Elle est appelée à l'identique par le service d'écriture **et** par la page `/sms-inbox` : le
motif affiché à l'écran est donc exactement celui qui a bloqué l'écriture, jamais une
reconstruction approximative.

Point structurant : la décision porte sur **toutes** les lignes de l'utilisateur, y compris
celles déjà écrites. Une ligne déjà traitée reste un maillon de la chaîne des soldes — la
retirer romprait la vérification de la suivante. Seules les lignes encore `a_valider` sont
ensuite réellement écrites.

Le tri est fait sur **l'horodatage issu de la référence**, jamais sur l'ordre d'arrivée :
l'opérateur ne délivre pas les SMS dans l'ordre des opérations (règle héritée de la phase 1).

### L'idempotence

L'identifiant de chaque transaction est un **UUID v5** dérivé de `utilisateur:référence:volet`
(volet = `principal` ou `frais`). Conséquences :

- rejouer converge sur la **même** ligne, jamais sur une seconde ;
- un timeout n'est pas un échec : si l'écriture a abouti côté serveur malgré une réponse
  perdue, la passe suivante retombe sur le même identifiant ;
- même l'upsert Supabase (`onConflict: 'id'`) converge, puisque l'identifiant est stable.

L'implémentation de SHA-1 est vérifiée contre le **vecteur de référence public RFC 4122**
(`python.org` dans l'espace de noms DNS → `886313e1-3b8a-5372-9b90-0c9aee199e5d`).

### Le déclenchement

`demarrerEcritureAutomatiqueSms()` s'abonne lui-même, depuis `main.tsx` :

- une première passe 8 s après le démarrage (laisse le boot et le retour OAuth se terminer) ;
- à chaque `SIGNED_IN` ;
- au retour du réseau (`online`).

Une seule passe à la fois. Aucune interface, aucune navigation : ne peut pas perturber le flux
OAuth ni l'affichage.

### Hors ligne

`sms_inbox` vit côté serveur : hors ligne, la passe sort **avant toute requête** (repli
`skip-offline early return`). L'écriture elle-même, quand elle a lieu, reste offline-first :
elle passe par `transactionService`, donc par IndexedDB puis la file de synchronisation, avec
`upsert` idempotent. Un test vérifie qu'hors ligne rien n'est écrit et que rien ne lève.

### Les pièges du projet, respectés

- jamais `supabase.auth.getUser()` : ordre store Zustand → `getSession()` → `null` ;
- `withTimeout(5000)` sur **tous** les `supabase.from()` ;
- écritures rejouables idempotentes avec identifiant dérivé de la source ;
- aucune colonne nouvelle côté Dexie ou Supabase → **aucun risque de drift** `PGRST204`
  (le module réutilise `sms_inbox` telle que la phase 1 l'a créée, y compris `transaction_id`).

---

## Les tests

**48 tests, tous verts** (`npx vitest run src/modules/sms-inbox/`) :

- 22 hérités de la phase 1 (parseur, contrôle de chaîne, miroir serveur) ;
- 16 sur la décision, l'idempotence, le rattachement et les libellés ;
- 10 d'intégration bout en bout, qui rejouent le corpus complet à travers le vrai service.

Le test d'intégration impose que `createTransaction` reçoive **toujours** un identifiant :
s'il venait à être omis, le test échoue immédiatement — le rejeu doublerait sinon les lignes
en silence.

---

## Contrôles TypeScript et build (AC9)

```
AVANT  npx tsc --noEmit -p tsconfig.app.json | grep -c "error TS"   →  1984
APRÈS  npx tsc --noEmit -p tsconfig.app.json | grep -c "error TS"   →  1984
```

Le baseline a été mesuré **de la même façon**, en mettant les modifications de côté
(`git stash`), puis restauré. Comparaison des deux jeux d'erreurs, numéros de ligne neutralisés :
**strictement identiques**. Zéro erreur nouvelle.

Zéro erreur sur les fichiers du chantier :

- `src/modules/sms-inbox/**` : **aucune erreur**.
- `src/components/Layout/AppLayout.tsx` : 1 erreur `TS6133 'ConstructionProvider' is declared
  but its value is never read` — **préexistante**, présente au baseline (ligne 50, décalée en
  ligne 54 par mes 4 lignes ajoutées).
- `src/services/transactionService.ts` : 1 erreur `TS6133 'getAccountById' ...` — **préexistante**
  (ligne 1076 au baseline, 1083 après).

`npm run build` : ✅ (bundle + service worker).

---

## Vérification en navigateur

Sur `http://localhost:3000` :

- `/sms-inbox` s'affiche, ne plante pas, et ne casse pas la mise en page de l'application ;
- la barre de navigation reste à 6 entrées, identique — **aucune entrée SMS** ;
- le mot « sms » n'apparaît nulle part dans l'interface hors de cette page ;
- aucune erreur console sur `/transactions` ;
- la passe automatique se déclenche seule, sans clic, 8 s après le chargement (log observé).

**Une limite honnête :** le navigateur utilisé pour ce contrôle n'avait pas de session Supabase
Auth active (aucune clé `sb-*` en stockage local — l'application était « connectée » via son
seul état local). La lecture de `sms_inbox` est donc partie en `anon` et a été refusée par la
RLS (`42501 permission denied`), ce qui est le comportement **attendu et correct**. La page a
affiché « Lecture impossible. » sans planter, et le service a journalisé un avertissement non
bloquant. La chaîne complète d'écriture n'a donc pas pu être observée sur données réelles dans
ce navigateur : elle est prouvée par les 10 tests d'intégration qui rejouent le corpus entier à
travers le vrai service. **Il reste à confirmer en production, une fois connecté**, que les
transactions apparaissent bien dans la page Transactions.

---

## Écarts au prompt, assumés et signalés

1. **La toute première ligne de la chaîne n'est pas écrite.** Le prompt exige que le solde
   précédent confirme le solde annoncé, sans aucune tolérance. Le premier SMS de l'historique
   n'a, par construction, aucun prédécesseur : la condition ne peut pas être établie, donc elle
   « manque », donc rien n'est écrit. C'est la lecture littérale de la règle. Sur le corpus,
   cela concerne **1 SMS** (`CO260729.1038.C39365`), listé dans `/sms-inbox` avec le motif
   `solde non concordant` et le détail « première ligne de la chaîne : aucun solde précédent à
   confronter ». Si tu préfères que cette ligne d'ancrage soit écrite malgré tout, c'est un
   changement d'une ligne dans `decisionEcriture.ts`.

2. **`src/main.tsx` a été modifié** (import + un appel). Le prompt interdit de toucher aux
   écrans et énumère `pages/`, `components/Layout/`, `components/Navigation/`,
   `constants/index.ts` — `main.tsx` n'en fait pas partie. C'était le seul point d'accroche
   possible pour un déclenchement réellement automatique sans ajouter quoi que ce soit à une
   interface. Aucune interface n'est produite, aucune navigation n'est faite.

3. **`transactionService.createTransaction` a reçu un troisième paramètre optionnel.** Sans lui,
   l'identifiant restait tiré au hasard et l'idempotence (AC5) était impossible. La modification
   est additive : aucun appelant existant n'est impacté, aucune signature cassée.

4. **Lecture hors du périmètre borné :** j'ai lu `src/pages/AddTransactionPage.tsx` (≈ 70 lignes)
   pour établir la convention de signe des montants — une dépense est stockée en **négatif**,
   puisque le solde du compte est mis à jour par `balance + amount`. Cette convention n'était
   déductible d'aucun fichier de la liste, et s'y tromper aurait inversé tous les mouvements.
   Ce fichier a été **lu, jamais modifié**.

---

## Ce qui reste ouvert pour la suite

- La place et l'apparence définitives de la page `/sms-inbox` — délibérément laissées à ta main.
- Le rattachement d'un SMS à un compte lorsqu'un utilisateur possède **plusieurs** comptes du
  même opérateur : aujourd'hui le premier trouvé est retenu.
- La catégorisation : tout part en `autres`, conformément à la consigne de ne pas inventer de
  catégorie.
