# CLAUDE.md — BazarKELY
## Protocole de collaboration Claude Code + JOEL

**Projet :** BazarKELY — Application gestion budget familial Madagascar  
**Stack :** React 19 + TypeScript + Supabase + Vite + Tailwind + PWA (Netlify)  
**Racine projet :** `C:\bazarkely-2\`  
**Frontend :** `C:\bazarkely-2\frontend\`  
**Production :** `https://1sakely.org` (Netlify, auto-deploy depuis GitHub `main`)  
**Déploiement :** `DEPLOYER.ps1` → TypeScript check → build → git commit → push

---

## RÈGLE #0 — LANGUE

- Communication avec JOEL : **Français exclusivement**
- Code, commits, commentaires techniques : Anglais

---

## RÈGLE #1 — DIAGNOSTIC AVANT TOUTE ACTION

**Avant de modifier quoi que ce soit, lire les fichiers concernés et tracer le chemin complet d'exécution.**

### Protocole de diagnostic obligatoire

1. **Lire** les fichiers impliqués (jamais supposer le contenu)
2. **Tracer** le flux d'exécution complet (A appelle B qui appelle C...)
3. **Identifier** le point exact où ça casse (pas juste le symptôme)
4. **Vérifier** les dépendances — quelle modification peut casser quoi d'autre
5. **Proposer** la correction minimale qui résout le problème identifié

### Questions à se poser systématiquement

- La requête peut-elle hanger (ni succès, ni erreur) ? → ajouter un timeout
- Y a-t-il un état asynchrone qui n'est pas résolu dans tous les chemins ? → vérifier tous les `catch` et branches `else`
- Est-ce que deux processus font la même chose en parallèle ? → risque de conflit/race condition
- Le Service Worker peut-il cacher une ancienne version ? → penser à l'impact sur les tests

---

## RÈGLE #2 — ANTI-RÉGRESSION OBLIGATOIRE

Avant toute modification :
- Identifier tous les fichiers qui importent ou dépendent du fichier cible
- Ne pas modifier les signatures de fonctions utilisées ailleurs
- Ne pas supprimer de fonctions sans vérification complète
- Tester que les fonctionnalités existantes fonctionnent encore

---

## RÈGLE #3 — JAMAIS DÉCLARER "CORRIGÉ" SANS VÉRIFICATION

Un fix n'est déclaré résolu que si :
- Les logs de production confirment le nouveau comportement attendu
- Ou le code est suffisamment simple et isolé pour être certain par lecture

En cas de doute : **décrire ce qui devrait apparaître dans les logs** et demander à JOEL de confirmer.

---

## RÈGLE #4 — ESCALADE ET LIMITES

Après **2 tentatives échouées** sur le même problème :
1. Arrêter et relire l'ensemble du flux depuis le début
2. Chercher si le problème n'est pas ailleurs que là où on cherche
3. Demander à JOEL les logs complets de la console

Après **3 tentatives échouées** :
- Admettre explicitement que le diagnostic initial était incorrect
- Repartir de zéro : lire tous les fichiers impliqués sans présupposé

---

## RÈGLE #5 — DÉPLOIEMENT

**Workflow standard :**
```bash
cd C:\bazarkely-2\frontend
npm run build           # build local (vérif build OK)
cd C:\bazarkely-2
git add [fichiers]
git commit -m "fix/feat/chore: description v3.x.x"
git push origin main    # → Netlify déploie automatiquement
```

**Types de commits :** `fix:` `feat:` `chore:` `refactor:` `docs:`

**Versioning :** Bumper `frontend/src/constants/appVersion.ts` + `frontend/package.json` avant tout déploiement. Script : `npm run version:patch/minor/major`

**Important :** Le Service Worker met en cache les assets. Après déploiement, l'utilisateur peut avoir besoin de recharger pour voir la nouvelle version. Utiliser une fenêtre incognito pour tester sans cache SW.

---

## PIÈGES CONNUS — NE JAMAIS REPRODUIRE

### Supabase DB queries sans timeout (résolu v3.5.11)

**Problème :** Les requêtes `supabase.from('table').select()` peuvent hanger silencieusement — ni succès, ni erreur, ni timeout. Le bloc `catch` ne s'exécute jamais.

**Règle :** Toujours utiliser `withTimeout()` de `src/lib/supabase.ts` pour toute requête DB dans un chemin critique :
```typescript
import { withTimeout } from '../lib/supabase';
const { data, error } = await withTimeout(
  supabase.from('users').select('*').eq('id', userId).single(),
  5000,
  'label-pour-debug'
) as any;
```

**Ne jamais oublier :** `supabase.auth.*` (signIn, setSession, getSession) = fiable. `supabase.from()` = peut hanger → toujours timeout.

---

### Flux OAuth Google — architecture à ne pas casser (résolu v3.5.9-10)

**Séquence correcte :**
1. `main.tsx` → `captureOAuthTokens()` capture le hash `#access_token` AVANT React, stocke en sessionStorage, efface le hash
2. `AuthPage.tsx` → `handleOAuthCallback()` lit sessionStorage → appelle `supabase.auth.setSession()`
3. `App.tsx` → `onAuthStateChange SIGNED_IN` → `loadUserFromSupabase()` avec timeout 5s

**Règles critiques :**
- `detectSessionInUrl: false` dans `supabase.ts` — **OBLIGATOIRE.** Si `true`, Supabase traite le hash en parallèle de `setSession()` et bloque indéfiniment
- `initializeApp()` dans App.tsx : **PAS** de `setAuthenticated(false)` dans le `else` de `getSession()` — la session OAuth n'est pas encore établie à ce moment
- `handleOAuthCallback()` dans AuthPage : **NE PAS** appeler `authService.handleOAuthCallback()` — contient `waitForUserProfile()` qui pollait sans timeout. Navigation directe après `setSession()` réussi
- Ne **PAS** gérer `INITIAL_SESSION` dans `onAuthStateChange` — crée une boucle de rechargement
- Dans tous les `catch` de fonctions auth : toujours appeler `setAuthenticated(true)` si la session Supabase Auth est valide

---

### Service Worker et tests en production

**Problème :** `Ctrl+Shift+R` ne bypass pas le Service Worker. La nouvelle version peut être déployée sur Netlify mais le browser sert toujours l'ancienne version en cache.

**Pour tester la vraie nouvelle version :** Ouvrir une fenêtre incognito (aucun SW enregistré).

**Pour identifier la version active :** Regarder le nom du fichier JS principal dans les logs Workbox : `index-[hash].js`. Un hash différent = nouvelle version chargée.

---

### setAuthenticated(false) intempestif

**Problème :** Appeler `setAuthenticated(false)` pendant le flux OAuth (quand `getSession()` retourne `null` car la session n'est pas encore établie) casse la connexion Google.

**Règle :** `setAuthenticated(false)` doit uniquement être appelé sur l'événement `SIGNED_OUT` de Supabase, jamais en inférence d'un `getSession()` null.

---

## ARCHITECTURE FICHIERS CLÉS

```
frontend/src/
├── App.tsx                          # Initialisation + onAuthStateChange
├── main.tsx                         # captureOAuthTokens() avant React
├── lib/supabase.ts                  # Client Supabase + withTimeout()
├── stores/appStore.ts               # Zustand : user, isAuthenticated
├── pages/
│   ├── AuthPage.tsx                 # handleOAuthCallback() OAuth
│   └── DashboardPage.tsx            # useEffect([userId]) + safety timeout
├── services/
│   ├── authService.ts               # login, handleOAuthCallback, logout
│   └── safariServiceWorkerManager.ts # SW registration (sw.js → 404, non bloquant)
└── constants/appVersion.ts          # Version + historique
```

---

## WORKFLOW DE SESSION (adapté du protocole AppBuildEXPERT)

### Quand JOEL signale un bug

1. **Clarifier** : 2-3 questions fermées OUI/NON pour cibler le problème
2. **Lire** les fichiers concernés (jamais modifier sans avoir lu)
3. **Tracer** le flux complet jusqu'au point de défaillance
4. **Corriger** de façon minimale et ciblée
5. **Déployer** avec bump de version
6. **Valider** via les logs que JOEL partage

### Format de log utile pour diagnostiquer

Demander à JOEL de partager la console Chrome (F12 → Console) après l'action problématique. Les éléments clés à chercher :
- Quel asset JS est chargé (`index-[hash].js`) → identifie la version
- Les logs `🔐 Auth state change:` → état du flux OAuth
- Les logs `✅ / ❌` de `loadUserFromSupabase` → état de la DB
- Présence ou absence de `DB timeout` → confirme si la DB répond

---

## MÉTRIQUES DE QUALITÉ

Avant tout déploiement, vérifier :
- [ ] TypeScript compile sans erreur (`npm run typecheck`)
- [ ] Build réussit (`npm run build`)
- [ ] Version bumpée dans `appVersion.ts` et `package.json`
- [ ] Toutes les requêtes DB Supabase dans les chemins critiques ont un timeout

---

## DOCUMENTATION PROJET

Fichiers de référence dans `C:\bazarkely-2\` :
- `README.md` — Architecture générale
- `ETAT-TECHNIQUE-COMPLET.md` — État actuel
- `FEATURE-MATRIX.md` — Fonctionnalités implémentées
- `VERSION_HISTORY.md` — Historique des versions
- `CONFIG-PROJET.md` — Configuration plateforme
