# RAPPORT PHASE 3 — Ondulation de l'étiquette % avec les vagues (carte « Stock actuel », module eau)

**Horodatage :** 2026-06-22
**Version :** 3.66.10 (branche `cloudflare-migration`)
**Fichier modifié :** `frontend/src/modules/gestion-eau/components/EauWaterFill.tsx` (+ `constants/appVersion.ts`, `package.json` pour le bump)

## Objectif

Faire onduler l'étiquette % flottante (« 70,4 % ») en rythme avec les vagues, comme posée sur la
houle. Pré-requis (PHASE-2 : étiquette posée sur la surface, `top` recalé chaque frame dans `paint()`)
déjà en place dans le fichier — aucun correctif préalable nécessaire.

## Choix retenu

- **Vague dominante seule** : `LABEL_WAVE = WAVES[1]` (amp `1.83`, cycles `1.8`, speed `-0.7`,
  opacity `0.3` = la plus visible). L'étiquette épouse donc la crête réellement perçue, ce qui colle
  à la consigne « pile sur la vague dominante ». La somme des deux vagues était une option acceptée
  mais aurait donné une amplitude composite moins lisible et moins « calée » sur la houle visible.
- **`X_LABEL = 85`** (unités viewBox 0→100), côté droit cohérent avec `right: 4.25rem`. Constante :
  seul `phase` (le temps) anime l'ondulation → **zéro reflow** (aucune mesure de largeur par frame).
- **Même formule que le dessin** : `waveOffset = LABEL_WAVE.amp · sin(LABEL_WAVE_K · X_LABEL + phase · LABEL_WAVE.speed)`
  avec `LABEL_WAVE_K = (cycles · 2π) / VB_W` précalculé. `waveOffset` est en unités viewBox = % de
  hauteur de carte → directement additionnable au `top` en %.
- **`labelTop = clamp(surfaceY + waveOffset, 0, VB_H)`** : clamp anti-rognage [0,100] pour que la
  houle (±1,83 %) ne fasse jamais sortir/couper l'étiquette aux extrêmes (bassin plein ou quasi vide).
- **`prefers-reduced-motion: reduce`** : `waveOffset = 0` (branche `reduce ? 0 : …`), donc l'étiquette
  reste posée sur la surface moyenne, statique, aucune ondulation. La branche `reduce` de `paint`
  (appel unique, `phase = 0`) en bénéficie automatiquement.

Le `top` inline React de l'étiquette reste la surface moyenne ; la RAF ajoute la houle par-dessus.
Les colonnes d'eau (streams) continuent d'utiliser `surfaceY` brut (pas d'ondulation) — inchangé.

## Itérations code → test → correction

1. Ajout de `LABEL_WAVE` / `LABEL_WAVE_K` / `X_LABEL` + injection du `waveOffset` clampé dans `paint()`.
2. `npx tsc --noEmit` → **exit 0** (premier essai).
3. `npm run build` → **OK** (premier essai, 3.66.10).

Aucune correction n'a été nécessaire (changement isolé, math vérifiée par lecture : même sinusoïde
que la surface, amplitude ±1,83 % de la hauteur de carte ≈ ±2 px → ondulation douce et visible).

## État des critères

- ✅ L'étiquette % ondule en rythme avec les vagues (même sinusoïde, même phase·speed).
- ✅ Amplitude = vague dominante (pas un tremblement aléatoire).
- ✅ Jamais coupée/sortie : clamp [0,100] sur `surfaceY + waveOffset`.
- ✅ Alignement horizontal (`right: 4.25rem`), taille (10px), pastille : inchangés (même style que « 100% »).
- ✅ `prefers-reduced-motion: reduce` : statique, `waveOffset = 0`.
- ✅ Vagues, niveau, repères flotteur/trop-plein, colonnes, couleurs (`EAU_CHART`), `aria-hidden`/
  `pointer-events-none` : intacts (aucune autre ligne touchée).
- ✅ `tsc --noEmit` exit 0 ; `npm run build` OK.
- ⚠️ Validation navigateur au premier plan : non réalisée automatiquement — la connexion à l'app
  (Supabase / Google) n'est pas possible dans le navigateur bridé de Claude (« Preview only supports
  localhost URLs » + login Google indisponible). À confirmer visuellement par JOEL dans son Chrome
  (localhost ou prod), fenêtre au premier plan (RAF gelée en arrière-plan = test invalide).

## Écarts au prompt

- Validation navigateur déléguée à JOEL (limitation outillage documentée en mémoire). Le reste de la
  boucle d'autonomie (code → tsc → build) est vert.

## Recommandations

- Si l'ondulation paraît trop ample/discrète à l'usage, ajuster `X_LABEL` (déphasage) ou pondérer
  `LABEL_WAVE.amp` ; aucun autre paramètre à toucher.
- Validation cache : Service Worker (Application → Unregister + « Update on reload » + incognito) et
  cache edge Cloudflare après déploiement.
