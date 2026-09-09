# Phase 2 bis — Une seule ligne par opération, et plus jamais de doublon

**Version livrée :** v3.76.0 — branche `cloudflare-migration` — 2026-09-09

---

## En deux phrases

Une opération Orange Money ne produit désormais **qu'une seule ligne** dans la liste des
transactions, frais compris — le détail des frais se lit en ouvrant la fiche. Et si JOEL a
**déjà saisi l'opération à la main**, le SMS ne crée plus rien.

---

## ⚠️ UN POINT N'A PAS PU ÊTRE FAIT — À LIRE EN PREMIER

**La fusion des 23 lignes de frais déjà écrites (AC4) n'a pas pu être exécutée.**

Le tableau de bord Supabase **ne s'ouvre plus dans le navigateur de JOEL**. L'éditeur SQL reste
bloqué sur son indicateur de chargement indéfiniment. J'ai diagnostiqué la cause en lisant le
trafic réseau de la page : le tableau de bord n'envoie **aucune** requête à son propre serveur —
uniquement des rapports d'erreur vers Sentry, son outil de surveillance des plantages. Autrement
dit **le tableau de bord plante côté Supabase**, ce n'est pas un problème du projet BazarKELY.
Une première tentative avait aussi rebondi vers la page de connexion.

Je ne peux pas contourner : me connecter à un compte ou saisir un mot de passe m'est interdit, et
récupérer un jeton de session l'est tout autant (règle du projet et règle de sécurité). L'autre
voie — passer par l'application elle-même — est fermée aussi : la version en ligne n'expose pas
son accès à la base depuis la console.

**Ce qui est prêt :** le script SQL complet, idempotent, en 4 étapes (aperçu en lecture seule,
report des frais, suppression des lignes de frais, contrôle chiffré) est écrit et vérifié :
[`supabase/migrations/2026-09-09-fusion-frais-sms.sql`](../../supabase/migrations/2026-09-09-fusion-frais-sms.sql).
**Je l'exécuterai moi-même dès que le tableau de bord Supabase répondra** — JOEL n'aura rien à
copier-coller. Il suffit de rouvrir une session à la prochaine reprise.

**Conséquence en attendant :** les 23 anciennes opérations continuent d'afficher deux lignes,
exactement comme aujourd'hui. Ce n'est pas une régression, c'est l'état actuel qui perdure.
**Toute nouvelle opération, elle, ne fait déjà qu'une seule ligne.**

**L'invariant est garanti par construction, pas par espoir.** La ligne de frais porte un montant
négatif ; l'étape 2 l'ajoute au montant principal, l'étape 3 supprime ensuite la ligne. Le total
perd et regagne exactement la même valeur : l'écart est nul par construction. L'étape 3 ne
supprime en outre **que** les lignes dont la principale porte déjà ses frais — une étape 2
inachevée ne peut donc pas faire perdre d'argent au compte. L'étape 4 réaffiche le total : s'il
diffère d'un seul ariary du total relevé à l'étape 1, il faut annuler et me le signaler.

---

## État des critères d'acceptation

| # | Critère | État | Comment c'est prouvé |
|---|---------|------|----------------------|
| **AC1** | Une opération SMS avec frais crée **une seule** transaction, `amount` = montant + frais, `transfer_fee` = frais | ✅ | Test sur le cas réel `CO260801.0732.C44491` (retrait 60 000 + 1 900 de frais) : **1 seule** transaction, `amount = -61 900`, `transferFee = 1 900`, description sans mention de frais. Test miroir : un SMS sans frais laisse `transferFee` vide. |
| **AC2** | La liste affiche **une seule ligne** par opération | ✅ | Test sur tout le corpus : **zéro** transaction dont la description commence par « Frais - », et autant de transactions que de références de SMS distinctes (49 = 49). La liste lisant la même table, elle ne peut afficher qu'une ligne. |
| **AC3** | La fiche de détail affiche les frais et l'opérateur | ⚠️ | Le code est en place et compile (bloc conditionnel additif dans `TransactionDetailPage.tsx`). **Non vérifié à l'écran** : aucune transaction ne porte encore de frais tant que la fusion (AC4) n'a pas tourné, il n'y a donc littéralement rien à afficher. Vérifiable en un coup d'œil juste après la fusion. |
| **AC4** | Les 23 lignes de frais fusionnées, total du compte identique | ⛔ | **Non exécuté** — tableau de bord Supabase hors service, voir l'encadré ci-dessus. Script prêt, invariant garanti par construction, contrôle chiffré intégré à l'étape 4. |
| **AC5** | Rejouer un SMS déjà saisi à la main ne crée rien et marque `doublon_probable` | ✅ | 4 tests d'intégration + 10 tests unitaires. Le SMS n'écrit rien, la ligne passe à `doublon_probable` et `transaction_id` pointe vers la transaction manuelle. Cas négatifs couverts : autre jour, autre montant, transaction déjà issue d'un SMS. |
| **AC6** | Le cas réel `PP260905.0925` (91 900 + 500) face à « Karaté 3mois −92 400 » | ✅ | **Test nommé, au vert.** Voir la section dédiée ci-dessous. |
| **AC7** | Le premier SMS d'une chaîne est désormais écrit | ✅ | Test dédié : `CO260729.1038.C39365` produit une transaction et sa ligne passe à `auto_ecrit`. Le bilan passe de 48 à **49** opérations écrites, et de 2 à **1** SMS écarté (seul l'échec opérateur reste écarté, et c'est justifié : aucun mouvement). |
| **AC8** | Aucun calcul ne compte les frais deux fois | ✅ | Verdict chiffré ci-dessous. |
| **AC9** | Aucun écran modifié hormis l'ajout du point 3 | ✅ | Liste exhaustive ci-dessous. |
| **AC10** | Typecheck réel et `npm run build` | ✅ | Compteur **1984 → 1984**, jeu d'erreurs identique. Build production : **exit 0**. |

---

## AC8 — Verdict sur `transfer_fee` : aucun double comptage

**C'était le risque principal de cette phase.** Je l'ai levé avant d'écrire la moindre ligne.

`transfer_fee` est **purement descriptive**. Recherche exhaustive dans tout `frontend/src` :
la colonne n'apparaît qu'à **quatre** endroits, et les quatre sont de simples recopies d'un
format vers l'autre — jamais un calcul :

| Fichier | Ce qui s'y passe |
|---|---|
| `services/transactionService.ts:106` | `transferFee: supabaseTransaction.transfer_fee \|\| undefined` — recopie |
| `hooks/useBudgetGauge.ts:165` | recopie dans l'objet, la jauge ne s'en sert pas |
| `hooks/useYearlyBudgetData.ts:246` | recopie |
| `hooks/useMultiYearBudgetData.ts:296` | recopie |

**Aucune soustraction, aucune addition, aucun cumul.** Les seules additions portant le mot
`transferFee` sont dans `feeService.ts` (`totalFees: transferFee + withdrawalFee`) — mais il
s'agit d'une **variable locale du simulateur de frais** de la page Transfert, calculée à la volée
avant saisie, sans aucun rapport avec la colonne stockée en base.

Le solde des comptes, lui, est mis à jour par `updateAccountBalanceAfterTransaction`, qui fait
`balance + transaction.amount` — **`amount` seul**.

**Conclusion : mettre le total dans `amount` et le détail dans `transfer_fee` compte les frais
exactement une fois.** Si un jour un calcul venait à soustraire `transfer_fee` de `amount`, il
deviendrait faux — c'est à retenir, mais ce n'est le cas nulle part aujourd'hui.

---

## AC6 — Le cas réel « Karaté 3mois », nommément

**Test : `AC5/AC6 — le cas reel : « Karate 3mois » deja saisi a la main` — ✅ AU VERT.**

Le SMS `PP260905.0925.B08754` du corpus dit : *transfert de 91 900 Ar vers 0324174815, frais
500 Ar*, le 05/09/2026 à 09h25. Le test place une transaction manuelle de **−92 400 Ar** le
05/09 (91 900 + 500), sans note. Résultat :

- `bilan.doublons = 1` ;
- **aucune** transaction portant `SMS PP260905.0925.B08754` n'est créée ;
- la ligne `sms_inbox` passe à `doublon_probable` et pointe vers la transaction manuelle ;
- le reste du corpus est écrit normalement (48 opérations sur 49).

Un second test vérifie le cas où JOEL n'aurait saisi que **91 900** (frais oubliés) : reconnu
aussi. Deux tests négatifs vérifient qu'un montant identique **la veille**, ou une transaction
**issue d'un SMS**, ne bloquent rien.

---

## Comment la garde anti-doublon décide

Trois conditions, toutes obligatoires, dans `utils/doublon.ts` (fonction pure, donc rejouable
telle quelle dans les tests) :

1. **même jour calendaire local** — local et non UTC, volontairement : à Madagascar (UTC+3) une
   saisie du 05/09 est stockée `2026-09-04T21:00:00Z`, et la comparer en UTC la placerait au
   04/09 — le doublon passerait entre les mailles ;
2. **montant égal au montant seul, ou au montant plus les frais** — la saisie manuelle inclut
   souvent les frais sans les distinguer ;
3. **la transaction candidate n'est pas elle-même issue d'un SMS** (elle porterait la marque
   `SMS <référence>` dans ses notes).

Deux choix méritent d'être dits :

- **La comparaison porte sur la valeur absolue du montant, sans exiger que le sens corresponde.**
  Dans le doute on n'écrit pas : un manque se rattrape à la main, un doublon fausse les comptes
  en silence.
- **Une saisie manuelle ne peut justifier qu'un seul SMS.** Sans cela, deux opérations jumelles
  le même jour s'annuleraient toutes les deux, et l'une des deux serait perdue pour de bon.

Les transactions comparées sont lues **à la fois** sur le serveur (qui fait foi) et dans la base
locale — cette dernière seule contient une saisie faite hors ligne et pas encore remontée.
L'ignorer laisserait passer exactement le doublon qu'on cherche à éviter. La fenêtre est bornée
aux jours concernés, avec un jour de marge de chaque côté.

**Aucun écran, aucune question posée à l'utilisateur.** La vérification est silencieuse et se
fait avant toute écriture.

---

## Bilan chiffré sur le corpus des 50 SMS

| | v3.75.0 | v3.76.0 |
|---|---|---|
| SMS traités | 50 | 50 |
| Opérations écrites | 48 | **49** (+ l'ancre de chaîne) |
| **Transactions créées** | **71** (48 + 23 lignes de frais) | **49** (une par opération) |
| SMS écartés | 2 | **1** (le seul échec opérateur) |

**Audit du corpus, mesuré :** 24 opérations portent des frais, et **toutes sont des débits** —
zéro crédit avec frais. La fusion `amount = amount + amount_de_la_ligne_de_frais` est donc
correcte de bout en bout, et le total du compte reste invariant.

**Tests : 66 au vert** dans le module `sms-inbox` (5 fichiers), dont 12 nouveaux.

---

## Liste exhaustive des fichiers touchés (preuve de l'AC9)

### Créés

| Fichier | Rôle |
|---|---|
| `frontend/src/modules/sms-inbox/utils/doublon.ts` | Garde anti-doublon, fonction pure |
| `frontend/src/modules/sms-inbox/utils/__tests__/doublon.test.ts` | 12 tests unitaires de la garde |
| `supabase/migrations/2026-09-09-fusion-frais-sms.sql` | Script de fusion des 23 lignes de frais (non exécuté) |

### Modifiés

| Fichier | Modification |
|---|---|
| `frontend/src/modules/sms-inbox/services/ecritureAutomatiqueService.ts` | Une seule transaction par opération (frais dans `transfer_fee`) ; garde anti-doublon ; état `doublon_probable` ; compteur `doublons` au bilan |
| `frontend/src/modules/sms-inbox/utils/decisionEcriture.ts` | La première ligne de la chaîne est désormais écrite (elle ancre la chaîne) |
| `frontend/src/modules/sms-inbox/services/__tests__/ecritureAutomatique.test.ts` | Attentes mises à jour + 5 tests neufs (doublons, ancre) |
| `frontend/src/modules/sms-inbox/utils/__tests__/decisionEcriture.test.ts` | Attente de l'ancre de chaîne inversée |
| **`frontend/src/pages/TransactionDetailPage.tsx`** | **Seul écran touché.** Ajout strictement additif : un bloc « Frais de transaction » affiché hors édition uniquement quand `transfer_fee` est renseignée, plus un petit helper qui nomme l'opérateur d'après le type de compte. Rien de déplacé, rien de renommé, rien d'enlevé. |
| `frontend/src/constants/appVersion.ts` + `frontend/package.json` | Bump 3.75.0 → 3.76.0 |

**Aucun autre fichier de `pages/`, aucun de `components/`, aucun service partagé.**
`transactionService.ts` n'a **pas** été touché cette fois : le paramètre `transferFee` qu'il
accepte existait déjà.

---

## Ce qui reste à faire à la reprise

1. **Exécuter la fusion des 23 lignes de frais** dès que le tableau de bord Supabase répond.
   Script prêt, je le lance moi-même, contrôle chiffré à l'étape 4.
2. **Vérifier l'affichage des frais dans la fiche** juste après — ce sera visible immédiatement.
