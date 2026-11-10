# Rapport NEC-CC-01 : Mon Business Plan, phase 1 (socle hors ligne + module 5)

Réf. NEC-CC-01 · version **3.129.0** · commit `18593e2` sur `cloudflare-migration`

## Durées et déroulement
- Début : 10/11/2026 06:56 · fin : 07:46 · durée active ≈ 50 min.
- Une seule session, aucune reprise, fenêtre de contexte non atteinte.
- Itérations notables :
  1. Le serveur de développement du port 3000 appartient à une autre session (ancienne configuration chargée, `/plan/` servait l'hôte) : serveur propre lancé sur le port **3005** (`.claude/launch.json`, entrée « Plan dev (3005) », non commitée).
  2. **Vrai défaut trouvé par le banc (C2/C3)** : une saisie suivie d'une navigation pleine page ou d'une fermeture immédiate était perdue (l'écriture IndexedDB n'a pas le temps de finir pendant le déchargement). Correctif : copie de secours synchrone dans `localStorage` (`nec.secours.<id>`) au `pagehide` / `visibilitychange` caché, rejouée en base à l'ouverture suivante puis effacée (`db/plans.ts`, `etat/usePlan.ts`).
  3. Test Vitest : espaces fines insécables (U+202F) mal recopiées ; bloc réécrit.
  4. Finition (`impeccable`) : les champs de montant affichaient « 0Ar » centré (la règle `.bp-champ { display:block }` écrasait `flex`) ; consigne de l'unité de vente tronquée. Corrigés.
  5. Message de commit mal passé par PowerShell (guillemets) : refait avec un fichier de message.

## Critères d'acceptation
Banc : Playwright + Chrome système (`channel: 'chrome'`), fenêtre **412 × 869, DPR 3,5, tactile** ; mesuré `window.innerWidth === 412`, `devicePixelRatio === 3.5`. Bancs : `banc-dev.cjs` (serveur de dev 3005), `banc-build.cjs` (build servi par `vite preview` 4180), `banc-hote.cjs`.

| | Critère | Résultat | Preuve |
|---|---|---|---|
| C1 | Zéro requête tierce | ✅ | Build : 179 requêtes, 0 hors `localhost:4180` (dont précache du SW). Dev : 0 tierce. |
| C2 | Deux plans séparés après rechargement | ✅ | « Projet A » / « Projet B » listés ; notes « Note de A » / « Note de B » ; nom B intact. |
| C3 | Saisie puis fermeture < 1 s | ✅ | Saisie, fermeture à 250 ms, réouverture : « Saisie rapide C3 » présent (après correctif, itération 2). |
| C4 | Mode avion | ✅ | « Prêt pour le mode avion ✓ » atteint, `setOffline(true)`, rechargement : accueil, sommaire, m5, identité, notes et les 8 pages d'attente s'affichent ; « Saisie hors ligne C4 » survit au rechargement hors ligne. |
| C5 | Exemple JUS'NOSY exact, sans alerte | ✅ | 18 valeurs attendues trouvées formatées (1 400 Ar, 3 000 Ar, 1 600 Ar, 53 %, 1 200 000 Ar, phrase du seuil 750 / 30, 5 000 000, 400 000, 4 000 000, 9 000 000, 14 400 bouteilles, 43 200 000, 20 160 000, 23 040 000, 14 400 000, 8 640 000, 15 120 000, 20 400 000) ; 0 alerte ; 0 champ de saisie. Vitest `chiffres.test.ts` : 12 tests verts. |
| C6 | Chaque alerte apparaît et disparaît | ✅ | Prix 1 400 → marge ; ventes 700 → « il faut vendre 750 bouteilles de 50 cl par mois. Vous en prévoyez 700. » ; subvention 4 000 000 (ressources 8 000 000) → « Il manque 1 000 000 Ar » ; fonds 1 000 000 → « Fonds de roulement trop faible … (3 600 000 Ar) » ; chaque correction : 0 alerte. |
| C7 | Pas de défilement horizontal | ✅ | `scrollWidth === innerWidth === 412` sur 21 écrans (accueil, sommaire, identité, notes, m5 années 1, 2, 3, copie en saisie, 8 pages d'attente, inviter, à propos, exemple). |
| C8 | Copie de l'exemple | ✅ | Copie modifiée ; l'exemple garde 3 000 Ar et 9 000 000 Ar, 0 champ de saisie, bandeau lecture seule. |
| C9 | Bannière de mise à jour | ✅ | Build 3.128.0 installé (profil Chrome persistant, plan « Plan avant mise à jour »), rebuild 3.129.0, relance du serveur : bannière « Nouvelle version : toucher pour mettre à jour » affichée, touchée, page rechargée, bannière partie, plan présent, « Version 3.129.0 », caches `plan-*` de l'ancienne version supprimés, contrôleur `sw.js?v=plan-DpqG_hBU.js`. |
| C10 | QR et `?code=` | ✅ | `/plan/?code=NEC2026` → `localStorage['nec.code'] = 'NEC2026'`, adresse `/plan/`. QR rendu HORS LIGNE, tracé identique à `qrcode.toString('https://1sakely.org/plan/?code=NEC2026')` (même bibliothèque, mêmes options). |
| C11 | Texte de partage sans tirets ni point médian | ✅ | 665 caractères capturés via `navigator.share` simulé ; aucun U+2014, U+2013, U+00B7 (et test Vitest). |
| C12 | Hôte inchangé | ✅ (local + en ligne, voir Production) | `/`, `/gestion-eau`, `/navy`, `/pudi/`, `/validation/`, `/plan/` : 200, racine rendue, 0 erreur, en dev ET sur le build. Sélecteur : test unitaire `moduleAccess` (admin voit `plan`, non admin jamais, jamais module de démarrage). |
| C13 | Poids ≤ 200 kB compressés hors polices | ✅ | **120,0 kB** gzip : page 0,6 + `plan-*.js` 111,6 + CSS 3,9 + manifeste 0,3 + icône 3,5. Polices (2 × 23 kB woff2) exclues. |
| C14 | Production | ✅ | Version 3.129.0 lue dans le bundle servi, `sw.js` et manifeste 200 au bon type, fichier manquant 404 `no-store`, exemple exact (détail ci-dessous). |
| C15 | Rapport | ✅ | Ce fichier. |

## Production (C14)
Poussé à 07:38, en ligne à **07:41:29** (`/plan/` sert `plan-DpqG_hBU.js`, qui contient `3.129.0`).

Contrôles `curl -I https://1sakely.org…` :
| Adresse | Réponse |
|---|---|
| `/plan/` | 200 `text/html`, `no-cache` |
| `/plan/p/abc/m5` | 200 `text/html`, `no-cache` (page du plan) |
| `/plan/sw.js` | 200 `application/javascript`, `Service-Worker-Allowed: /plan/` |
| `/plan/manifest.webmanifest` | 200 `application/manifest+json`, `no-cache` |
| `/plan/precache.json` | 200 `application/json`, `no-cache` |
| `/assets/plan/c/nope.js` | **404** `text/plain`, `no-store` |
| `/plan/nope.js` | **404** `text/plain`, `no-store` |

Dans Chrome, profil **CyberKELY SOATRA (cyberkelysoatra@gmail.com)** vérifié sur myaccount.google.com (jamais le profil ITAMPOLO) :
- `/plan/p/exemple/m5` : les 18 chiffres de la section 6 présents, années 2 et 3 comprises, 0 alerte ✅
- service worker actif `https://1sakely.org/plan/sw.js?v=plan-DpqG_hBU.js`, accueil « Prêt pour le mode avion ✓ » ✅
- C12 en ligne : compte administrateur, bouton « Basculer entre les modules » → « Business plan » présent → ouvre `https://1sakely.org/plan/` en pleine page ; `bazarkely_active_module` reste `gestion-eau` (jamais mémorisé) ✅. Le cas « non administrateur ne le voit pas » est prouvé par le test unitaire (pas de compte non administrateur dans ce profil).

Remarque : `/plan/sw.js` sort avec `Cache-Control: max-age=14400` au lieu du `no-cache` de `_headers`, exactement comme `/validation/sw.js` déjà en production (réglage du cache navigateur côté Cloudflare). Sans effet : le navigateur ignore le cache HTTP pour vérifier un service worker, et chaque version du plan a sa propre adresse `?v=`.

Fin : 10/11/2026 07:46.

## Fichiers
Créés :
- `frontend/plan/index.html`, `frontend/vite.plan.config.ts` (liste de précache `plan/precache.json`), `frontend/tailwind.plan.config.js`
- `frontend/functions/plan/_middleware.ts` (page pour les routes sans extension, 404 `no-store` pour un fichier manquant), `frontend/functions/assets/plan/_middleware.ts`
- `frontend/public/plan/sw.js`, `frontend/public/plan/manifest.webmanifest` (ajoutés avec `git add -f`, présents dans `git ls-files`)
- `frontend/src/modules/business-plan/**` (69 fichiers : types, db, etat, sync, composants, utils + test, rubriques, ateliers × 11, data/exemple × 12, pages)

Modifiés (**fichiers partagés**, ajouts seulement) :
- `frontend/package.json` (script `build` + `@fontsource/lato`, version), `frontend/package-lock.json`
- `frontend/vite.config.ts` (`planEntry()`, `globIgnores plan/**`)
- `frontend/src/sw-custom.ts` (refus de navigation `/plan`)
- `frontend/public/_headers` (entrées `/plan/`)
- `frontend/src/contexts/ModuleSwitcherContext.tsx`, `frontend/src/components/Navigation/BottomNav.tsx` (icône violette)
- `frontend/src/modules/navy-ay/utils/moduleAccess.ts` (+ test), `frontend/src/modules/navy-ay/services/modulePrefsSync.ts`
- `frontend/src/constants/appVersion.ts`

Dépendance ajoutée : `@fontsource/lato` (seules les deux woff2 latin 400 et 700 sont importées, par `plan.css`).

## Contrôles de fin
- Types : `npx tsc --noEmit -p tsconfig.app.json` → **1910 avant, 1910 après**, 0 erreur dans les fichiers du chantier.
- `npm run build` OK (hôte + PUDi + Validation + plan).
- Vitest : 36 tests verts (`business-plan` 12, `moduleAccess` 24).

## Écarts au prompt
- Tests C1, C4, C9, C13 faits sur le **build** (`vite preview`) et non sur le serveur de dev : le service worker n'existe qu'en production. Les autres critères sur le dev, port 3005 (le 3000 était tenu par une autre session).
- `netlify.toml` : aucune entrée Validation à imiter (aucun `validation` dedans), donc rien ajouté. `tsconfig.node.json` : idem.
- `ChampTexte`, `ChampMontant`, `ChampNombre` existent comme fichiers mais réexportent une implémentation commune `composants/Champs.tsx` (avec `Choix` et `SaisieMontant`).
- Ajouts hors liste : `etat/pwa.ts` (service worker, bannière, installation, état « mode avion »), `utils/partage.ts`, `version.ts`, `pages/PageRubrique.tsx`, `pages/Introuvable.tsx`, `composants/Bientot.tsx`, total des investissements affiché en 5c (chiffre de la section 6 qui n'avait pas d'écran).
- Numéros de page des sections en attente **estimés** (le cahier n'était pas fourni) : m1 p. 4, m2 p. 6, m3 p. 8, m4 p. 10, synthèse p. 15, relecture p. 16, après p. 17, prix p. 18. À corriger dans `ateliers/<id>/Page.tsx`.
- Textes « À RETENIR » de la page 14, hypothèses et risques JUS'NOSY rédigés dans l'esprit du cahier (texte exact non fourni).
- Les montants s'affichent avec U+202F aussi entre le nombre et « Ar » ; les alertes gardent « Ar » précédé d'une espace normale, comme le texte du prompt.

## Surprises dans le dépôt
- Un serveur Vite d'une autre session occupait le port 3000 avec une configuration ancienne.
- `.bp-champ` défini après `@tailwind utilities` l'emporte sur les classes utilitaires (`flex`) : attention à l'ordre CSS dans les entrées légères.
- `/assets/*` avait déjà un intergiciel P48 global : celui de `/assets/plan/` est redondant mais garde le motif Validation.

## Ce que le prompt n'avait pas prévu
- Perte de saisie à la fermeture immédiate : IndexedDB seul ne suffit pas, il faut une copie synchrone.
- Détection d'une nouvelle version : le fichier `sw.js` ne change pas d'un déploiement à l'autre ; la page l'enregistre donc avec `?v=<nom du fichier d'entrée>` (haché par Vite), ce qui crée un nouveau worker à chaque nouvelle version du code du plan, et seulement dans ce cas.

## Contrat pour les phases 3 et 4 (NEC-CC-03, NEC-CC-04, en parallèle)
**Serveur de dev dans un worktree** (dans `frontend/` du worktree, après `npm install`) :
```
npx vite --port 3001 --strictPort   # NEC-CC-03
npx vite --port 3002 --strictPort   # NEC-CC-04
```
puis ouvrir `http://localhost:3001/plan/` (ou 3002). `--port` remplace le 3000 de `vite.config.ts` ; le message d'erreur du websocket HMR (fixé sur 3000) n'empêche pas la page de marcher, recharger à la main au besoin.

**Ce que chaque phase modifie, et seulement cela** :
- `src/modules/business-plan/ateliers/<id>/Page.tsx` : `export default function Page({ plan, modifier, lectureSeule }: AtelierProps)`. Écrire via `modifier((p) => { p.m1.probleme = v; })` (recette mutable sur une copie, sauvegarde automatique 400 ms). En `lectureSeule` (exemple), rendre les valeurs sans champ : tous les composants l'acceptent.
- `src/modules/business-plan/ateliers/<id>/progression.ts` : `export function progression(plan: Plan): number` (0 à 100).
- `src/modules/business-plan/data/exemple/<id>.ts` : exporte un `Partial` de la section (ex. `export const m1: Partial<Plan['m1']> = {...}` ; pour `apres`, `prix`, `notes` : `Partial<Pick<Plan, 'actions' | 'prix' | 'notes'>>`). `data/exemple/index.ts` les assemble déjà : rien à y toucher.
- NEC-CC-03 : `m1`, `m2`. NEC-CC-04 : `m3`, `m4`, `prix`. `uniteVente` est partagé par 3a et 5a (champ racine `plan.uniteVente`).
- Ne JAMAIS modifier `types.ts` (contrat), `rubriques/registre.ts`, `composants/*` existants (en ajouter un nouveau si besoin, dans le dossier de sa phase de préférence `ateliers/<id>/`).

**Composants disponibles** (`composants/`) :
- `ChampTexte({ label, valeur, onChange, lectureSeule?, placeholder?, ligne?, type?: 'text'|'tel'|'email', mention?, aide? })` (multi-ligne auto-agrandi, `ligne` = une ligne)
- `ChampMontant({ label, valeur: number|null, onChange, lectureSeule?, mention?, aide? })` (clavier numérique, « 1 200 000 Ar »)
- `ChampNombre({ label, valeur, onChange, suffixe?, lectureSeule?, mention? })`
- `Choix({ label, options: {v,t}[], valeur, onChange, lectureSeule? })` (pastilles 44 px)
- `ListeLignes({ titre, lignes: Ligne[], onChange, lectureSeule?, placeholder?, ajouter? })`
- `Carte({ titre?, sousTitre?, ton?: 'blanc'|'violet'|'turquoise', id?, children })`, `Resultat({ label, valeur, fort? })`
- `Aide({ titre?, children })` (ⓘ fermé par défaut), `Alerte({ texte })`, `Progression({ pct, label?, compact? })`, `Bientot({ page })`, `Icone({ nom })` (liste `NomIcone`)
- Utilitaires : `utils/format.ts` (`ariary`, `grouper`, `pourcent`, `lireEntier`, `dateFr`, `pluriel`), `etat/vide.ts` (`nouvelId`, `ligneVide`).

**Phase 2 (NEC-CC-02)** : remplir `sync/index.ts` `signalerModification(plan)` (appelée après chaque sauvegarde, `plan.rev` croissant) ; le code d'invitation est dans `localStorage['nec.code']`.

## Recommandations
- Faire relire par l'équipe NEC les numéros de pages, le texte « À retenir » et les hypothèses de l'exemple, avant mercredi 8 h 45.
- Le jour J : faire ouvrir `/plan/` une fois en Wi-Fi et attendre « Prêt pour le mode avion ✓ » avant de couper.
- Penser à « Partager mes chiffres » en fin de journée : les données ne vivent que sur le téléphone.
