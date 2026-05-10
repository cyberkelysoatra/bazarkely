# RÉSUMÉ SESSION S66 — 2026-05-10

**Version livrée :** 3.10.0
**Branche :** `claude/gracious-jennings-d94127` → mergée sur `main` (fast-forward)
**Commit :** `83c335a feat: offline-first robuste — SWR transactions + timeouts services métier v3.10.0`
**Déploiement :** ✅ Validé en production sur https://1sakely.org (logs `[TransactionService] ✅ 291 transaction(s) depuis IndexedDB (retour immédiat)` confirmés)

---

## Demande initiale de JOEL

> « J'ai toujours l'impression que l'application n'est pas en mesure de fonctionner convenablement quand elle ne peut pas accéder à la BD. Alors que j'ai besoin que si la BD n'est pas accessible pour une raison ou une autre, l'application continue de fonctionner normalement. Que tous les chiffres soient accessibles localement. »

→ Vrai offline-first attendu (niveau 3 dans la typologie) : IndexedDB est la source de vérité, Supabase est un miroir. L'app ne dépend jamais de Supabase pour fonctionner.

---

## Cadrage (3 séries de questions fermées)

| | Réponse | Implication |
|---|---|---|
| Q1 | C | Inclure le cas "Wi-Fi up mais Supabase rame", pas juste "no internet" |
| Q2 | OUI | Login offline si déjà connecté au moins une fois |
| Q3 | OUI | Écriture offline avec sync auto au retour |
| Q4 | A | Last-write-wins en cas de conflit |
| Q5 | A | Login offline pour email/password ET Google OAuth |
| Q6 | A | Sync auto silencieuse en arrière-plan |
| Q7 | OUI | Indicateur visuel (icône Wi-Fi existe déjà) |
| Q8 | A | État des lieux complet de TOUS les écrans |
| Q9 | NON | Signup nécessite Supabase |
| Q10 | A | Session persistante uniquement (pas de re-login fresh offline) |
| Q11 | A | Liste P1/P2/P3, pas de correctif tout de suite |
| Q12 | B | Stale-while-revalidate (pas IndexedDB-first strict) |
| Q13 | A | Timeout 5000 ms (cohérent avec authService) |

---

## Travail accompli

### Phase 1 — État des lieux (sans correctif)

Audit complet de l'architecture offline-first :
- **Architecture data** : Dexie 12 versions, Zustand persist, syncQueue avec PWA Phase 3 fields. **Pas de table `loans` dans IndexedDB** (régression S64+).
- **Indicateur Wi-Fi** : ping Supabase réel (`SELECT count FROM users LIMIT 1`), pas juste `navigator.onLine`. Mais sans timeout sur le ping et polling 30s.
- **Auth offline** : session persistante OK (loadUserFromSupabase a timeout 5s, fallback sur Zustand persist).
- **Mécanisme de sync** : solide. Trigger sur `online` + `SIGNED_IN`, fallback polling, last-write-wins déjà implémenté.
- **5 services audités** :
  - accountService ✅ IndexedDB-first
  - budgetService ✅ IndexedDB-first
  - transactionService ❌ Supabase-first sans timeout (P1 #2)
  - goalService ⚠️ Supabase-first sans timeout
  - loanService ❌❌ 100% Supabase-only, aucune table Dexie (P1 #1)
- **8 problèmes priorisés** avec plan de remédiation.

Documentation : `ETAT-TECHNIQUE-COMPLET.md` section "🔄 SYNCHRONISATION ET OFFLINE" entièrement réécrite.

### Phase 2 — Correctifs P1 #2 + P2 #3

**transactionService.getTransactions() — stale-while-revalidate** :
- Lecture IndexedDB en premier → retour immédiat si données présentes
- Refresh Supabase en arrière-plan (fire-and-forget) avec withTimeout(5000) — met à jour IndexedDB pour la prochaine lecture
- Si IndexedDB vide au premier usage → fetch Supabase synchrone avec timeout 5s, fallback gracieux vers tableau vide

**Wrapping `withTimeout(5000)` sur tous les `apiService.*`** dans 4 services :
- transactionService (9 appels)
- accountService (6 appels)
- budgetService (4 appels)
- goalService (4 appels)
- Constante `SUPABASE_TIMEOUT_MS = 5000` ajoutée dans chaque service

### Phase 3 — Documentation et capitalisation

- **CLAUDE.md** : nouvelle RÈGLE #0bis "Questions fermées par séries (cadrage avant action)" — protocole skill projet.
- **Mémoire persistante** : nouveau feedback `feedback_questions_fermees_series.md` + index MEMORY.md mis à jour.
- **ETAT-TECHNIQUE-COMPLET.md** : section offline-first réécrite (audit daté + tableau stratégie par service + verdict par écran + plan de remédiation).
- **VERSION_HISTORY.md** : entrée v3.10.0 ajoutée.
- **FEATURE-MATRIX.md** : version 3.10.0 + nouvelle ligne stats.

---

## Validation en production

Logs prod confirmés (1sakely.org en fenêtre incognito) :
```
📱 [TransactionService] 💾 Lecture des transactions depuis IndexedDB...
📱 [TransactionService] ✅ 291 transaction(s) depuis IndexedDB (retour immédiat)
📱 [TransactionService] 🔄 IndexedDB rafraîchi avec 291 transaction(s) depuis Supabase (background)
```

Le pattern stale-while-revalidate fonctionne **exactement** comme conçu : retour immédiat depuis le cache local, refresh silencieux en arrière-plan.

---

## Pièges rencontrés et résolus en cours de session

1. **Édition par erreur dans le main au lieu du worktree** : utilisation de chemins absolus `C:\bazarkely-2\frontend\...` au lieu du worktree `C:\bazarkely-2\.claude\worktrees\gracious-jennings-d94127\frontend\...`. Corrigé en copiant les modifications dans le worktree puis `git restore` sur le main pour annuler.
2. **Limitation du dev mode Vite** : en navigant vers une page non encore visitée en mode offline, le navigateur ne peut pas charger les chunks JS (ERR_INTERNET_DISCONNECTED). Ce n'est pas un bug du code applicatif, juste une limitation du dev mode. En prod, le SW pré-cache 84 entrées.
3. **Bug familyGroupService préexistant en dev** : race condition session, "Utilisateur non authentifié" alors que le user est dans Zustand. N'apparaît PAS en prod (timing différent). Hors scope de cette session, follow-up créé.
4. **Service Worker cache l'ancien JS** : après merge sur main, JOEL voyait toujours v3.9.0. Solution : fenêtre incognito (piège connu déjà documenté dans CLAUDE.md).

---

## Reste à faire (sessions ultérieures)

- **P1 #1** : `loanService` 100% Supabase-only — refonte offline-first avec ajout d'une table `loans` dans Dexie. ~1 session entière.
- **P2 #4** : `goalService.getGoals()` à inverser en IndexedDB-first (pas critique car timeout fait déjà le job).
- **P3 #5-6** : timeout sur `getServerStatus()` + unification des 2 implémentations de l'indicateur online (`Header.tsx` + `useOnlineStatus.ts`).
- **familyGroupService** : race condition session, follow-up créé via spawn_task.

---

## Fichiers modifiés (commit 83c335a)

```
CLAUDE.md                                   |  25 ++
ETAT-TECHNIQUE-COMPLET.md                   | 114 ++++++++--
frontend/package-lock.json                  |   4 +-
frontend/package.json                       |   2 +-
frontend/src/constants/appVersion.ts        |  24 +-
frontend/src/services/accountService.ts     |  43 +++-
frontend/src/services/budgetService.ts      |  36 ++-
frontend/src/services/goalService.ts        |  24 +-
frontend/src/services/transactionService.ts | 201 +++++++++++++------
9 files changed, 369 insertions(+), 104 deletions(-)
```

Plus, hors commit principal (à committer dans la session de clôture) :
```
VERSION_HISTORY.md                          (entrée v3.10.0)
FEATURE-MATRIX.md                           (header + ligne stats)
RESUME-SESSION-2026-05-10-S66.md            (ce fichier)
```
