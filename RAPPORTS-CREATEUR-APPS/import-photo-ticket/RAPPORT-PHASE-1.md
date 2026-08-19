# Rapport — Import d'une photo enregistrée pour le scan de ticket (Phase 1)

**Horodatage :** 2026-08-20
**Branche :** `cloudflare-migration` (branche de production Cloudflare Pages)
**Version livrée :** 3.71.0 (depuis 3.70.0)
**Itérations code → test → correction :** 3

1. Écriture du composant + du test Vitest → 7 tests verts du premier coup, `tsc --noEmit` propre.
2. Validation navigateur à 412 px : la première capture était fausse (Puppeteer `page.screenshot`
   reposait l'override CDP et rendait à 800 px). Correction du harnais de capture
   (`page.setViewport` + `captureBeyondViewport: false`) → mesures réellement à 412 px.
3. Le harnais n'affichait pas les toasts (`<Toaster />` absent) → ajout, pour **prouver** le
   texte exact du message d'erreur AC5 au lieu de l'affirmer.

---

## 1. Ce qui a été fait

Une **deuxième porte d'entrée** vers le pipeline OCR existant, strictement additive :

- Second `<input type="file" accept="image/*">` **sans** attribut `capture` (`galleryInputRef`),
  branché sur le **même** `handleFile` que l'input caméra.
- Bouton secondaire **« Importer »** (icône lucide `ImagePlus`) à gauche du bouton violet
  « Scanner », dans un conteneur `flex-shrink-0 gap-2`. Palette violette conservée
  (`bg-white`, `border-purple-300`, `text-purple-700`, `rounded-lg`), `hover`/`disabled`
  alignés sur le bouton principal.
- Libellé « Importer » visible à partir de `sm` ; **icône seule 40×40 px** en dessous, avec
  `aria-label` et `title` = « Importer une photo enregistrée ».
- `handleFile` vide désormais **l'input réellement à l'origine de l'événement**
  (`const input = e.currentTarget` capturé avant tout `await`) au lieu de `fileInputRef` en dur.
- Garde-fou de type : `file.type` ne commençant pas par `image/` → message clair, sortie
  immédiate, aucun `isProcessing`, aucun écran de revue.
- Textes : sous-titre de la carte + paragraphe d'aide (ⓘ) sur l'import d'une photo/capture
  déjà enregistrée.
- Test anti-régression Vitest.

---

## 2. État des critères d'acceptation

| # | Critère | État | Preuve |
|---|---|---|---|
| AC1 | « Scanner » ouvre toujours l'appareil photo arrière | ✅ | Audit DOM à 412 px : premier input `{accept:"image/*", capture:"environment"}` — l'input caméra est inchangé (aucune ligne de son JSX modifiée). |
| AC2 | « Importer » ouvre le sélecteur système, sans forcer la caméra | ✅ | Audit DOM : second input `{accept:"image/*", capture:null, hasCapture:false}`. |
| AC3 | Une image de la galerie suit exactement le même pipeline | ✅ | Test navigateur : image PNG injectée sur l'input galerie → console `🧾 [ocrService] OCR en ligne (Google Vision) indisponible → repli Tesseract` puis parsing, `suggestCategory`, puis `transactionService.createTransaction` / `receiptService` appelés. Pipeline parcouru de bout en bout (~5 s mesurées). Les erreurs finales observées (« Utilisateur non authentifié », mise à jour de solde) viennent du harnais de test isolé, non connecté — pas du chemin d'import. |
| AC4 | Deux fois le même fichier → traitement relancé | ✅ | Juste après la 1re sélection : `inputValues = ["",""]`. Seconde sélection du **même** fichier → bouton repasse en « Lecture... » (`true`). |
| AC5 | Fichier non-image → message clair, pas de plantage | ✅ | PDF injecté → toast exact « Choisissez une image (photo ou capture d'écran). Les fichiers PDF ne sont pas encore pris en charge. », `isProcessing` reste `false` (`disabled: [false,false,false]`), pas d'écran de revue. Capture `ac5-toast-pdf.png`. |
| AC6 | Pendant une lecture, les deux boutons sont désactivés | ✅ | Pendant le traitement : `[{Importer, disabled:true}, {"Lecture...", disabled:true}]`. |
| AC7 | 412 px : aucun débordement, cibles ≥ 40 px | ✅ | `docScrollWidth = 412` = `docClientWidth = 412` → `horizontalOverflow: false`. Carte 380 px, contenu `scrollWidth 378` = `clientWidth 378`. Boutons : Importer **40×40**, Scanner **105,69×40**. |
| AC8 | Le test Vitest passe et échoue si `capture` revient sur le 2e input | ✅ | `npx vitest run src/components/Receipt` → **7 tests / 2 fichiers, tous verts**. Vérification par **mutation** : `capture="environment"` ajouté au second input → le test « un champ caméra … et un champ galerie SANS capture » **échoue** (1 failed / 4 passed), puis restauration. |
| AC9 | Aucune régression sur Gestion Eau | ✅ | Mon commit ne contient **aucun** fichier de `src/modules/gestion-eau/`. Le `capture="environment"` de `EauTiroirSaisie.tsx` n'a pas été ouvert. *(Voir §6 : `GestionEauRoutes.tsx` apparaît modifié dans l'arbre de travail — travail v3.70.0 de la session précédente, laissé tel quel et non commité par moi.)* |
| AC10 | `tsc --noEmit` propre, build OK, 3.71.0, push | ✅ | `npx tsc --noEmit` → exit 0. `npm run build` → OK (`frontend@3.71.0`). `appVersion.ts` + `package.json` en 3.71.0. Push sur `cloudflare-migration`. |

---

## 3. Preuve du viewport 412 px

Viewport forcé via CDP `Emulation.setDeviceMetricsOverride` (`mobile: true`), piloté par
Puppeteer (`page.setViewport` en est l'enrobage direct) — l'extension Chrome plafonnant vers
528 px ne pouvait pas servir ici.

```json
{
  "innerWidth": 412,
  "innerHeight": 915,
  "devicePixelRatio": 2.625,
  "docScrollWidth": 412,
  "docClientWidth": 412,
  "horizontalOverflow": false,
  "cardWidth": 380,
  "cardScrollWidth": 378,
  "cardClientWidth": 378,
  "buttons": [
    { "name": "Aide : scanner un ticket", "w": 16, "h": 16 },
    { "name": "Importer une photo enregistrée", "w": 40, "h": 40 },
    { "name": "Scanner", "w": 105.69, "h": 40 }
  ]
}
```

**Avant** (v3.70.0, même mesure à 412 px) : un seul input (`capture="environment"`), bouton
« Scanner » 113,69 × 40, pas de débordement non plus.

**Rendu à 412 px :** « Importer » est en icône seule (carré blanc bordé de violet), « Scanner »
garde son libellé. Le bloc texte se réduit : le titre passe sur 2 lignes et le sous-titre sur
4 lignes — lisible, aucun texte tronqué, aucune cible tactile sous 40 px. À partir de `sm`
(≥ 640 px) le libellé « Importer » réapparaît et tout tient sur une ligne.

Captures conservées dans le dossier de travail de session :
`avant-412.png`, `apres-412.png`, `apres-412-full.png`, `ac5-toast-pdf.png`,
`ac3-import-resultat.png`, `aide-412.png`.

---

## 4. Fichiers créés / modifiés

**Modifiés**

- `frontend/src/components/Receipt/ReceiptScanButton.tsx` — seul fichier de code métier touché.
- `frontend/src/constants/appVersion.ts` — bump 3.71.0 + note FR (voir §6).
- `frontend/package.json` — bump 3.71.0.

**Créés**

- `frontend/src/components/Receipt/__tests__/ReceiptScanButton.test.tsx`
- `RAPPORTS-CREATEUR-APPS/import-photo-ticket/RAPPORT-PHASE-1.md` (ce fichier)

**Fichiers partagés touchés : aucun.** Tout le code est confiné à `components/Receipt/`.
`AddTransactionPage.tsx` n'a pas été modifié (les props du composant sont inchangées).
`ocrService.ts`, `receiptParser.ts`, `receiptService.ts`, `utils/receiptImage.ts` et
`ReviewReceipt.tsx` n'ont pas été ouverts en écriture.

**Dépendances ajoutées : aucune.** `ImagePlus` vient de `lucide-react`, déjà présent.

---

## 5. Écarts au prompt

1. **Bouton « Scanner » : `px-4 py-2` → `h-10 px-3 sm:px-4`.** La hauteur reste identique
   (40 px dans les deux cas) ; seul le rembourrage horizontal passe de 16 à 12 px **en dessous
   de 640 px**, pour laisser 8 px de plus au bloc texte à 412 px. Aucun changement de
   comportement, de libellé ni de couleur. Signalé ici car le prompt demandait un chemin caméra
   « inchangé » : le *comportement* l'est strictement, l'écart est purement de gabarit mobile.
2. **Validation faite sur un harnais de rendu isolé, pas sur `/add-transaction` connecté.**
   La page réelle exige une session ; le navigateur pilotable partait d'un profil vierge sur
   `localhost:3000` (origine différente de `1sakely.org`, donc aucune session réutilisable).
   J'ai donc monté un harnais temporaire qui rend **le vrai composant** avec le **même
   habillage** que la page (`min-h-screen bg-gray-50` > `p-4` > `space-y-6`), soit exactement
   la largeur utile de la carte dans la page réelle (380 px sur 412). Le harnais
   (`__preview-*.html/.tsx/.cjs`) a été **supprimé** avant le commit — rien de tout cela n'est
   commité ni déployé.

---

## 6. Point d'attention important — travail v3.70.0 non commité

L'arbre de travail contenait déjà, **avant mon intervention**, des modifications non commitées
de la session précédente (« Simulation de rôle — Phase 3 ») :

- `frontend/src/components/Layout/header/HeaderEauActions.tsx` (modifié)
- `frontend/src/modules/gestion-eau/components/GestionEauRoutes.tsx` (modifié)
- `frontend/src/modules/gestion-eau/components/EauSimulationPage.tsx` (nouveau, non suivi)
- l'entrée `3.70.0` déjà écrite dans `appVersion.ts` / `package.json`

Je ne les ai **pas** commités : ils sortent de mon périmètre et n'ont pas été testés par moi.
Ils restent intacts dans l'arbre de travail.

**Conséquences à connaître :**

- `GestionEauRoutes.tsx` (suivi, modifié) importe `EauSimulationPage.tsx` (non suivi). Si l'un
  était commité sans l'autre, le build Cloudflare échouerait — c'est exactement le piège
  « helpers non commités ». Mon commit ne contient ni l'un ni l'autre, donc **HEAD reste
  cohérent et le build passe** (vérifié).
- En revanche, le fichier `appVersion.ts` que je commite contient **aussi** la note de version
  3.70.0 rédigée par la session précédente. La production affichera donc 3.71.0 avec un
  historique mentionnant 3.70.0, **alors que la fonctionnalité 3.70.0 (page de simulation de
  rôle) n'est pas déployée**. C'est du texte de notes de version uniquement, sans effet
  technique, mais il faudra committer la Phase 3 eau pour rétablir la cohérence.

**Recommandation :** committer la Phase 3 « Simulation de rôle » (les 3 fichiers eau ensemble,
jamais séparément) dans une session dédiée, après validation.

---

## 7. À confirmer par JOEL sur un vrai téléphone Android

Le **comportement réel du sélecteur système ne peut pas être observé depuis un navigateur de
bureau** : sur desktop, les deux inputs ouvrent la même boîte de dialogue de fichiers. Je peux
prouver que l'attribut `capture` est présent sur l'un et absent sur l'autre — c'est la seule
chose qui pilote le choix caméra vs galerie — mais pas ce que le téléphone en fait.

À vérifier sur le téléphone (Chrome Android), page « Ajouter une dépense » :

1. « Scanner » ouvre bien **directement** l'appareil photo arrière (inchangé).
2. « Importer » ouvre bien le **sélecteur de fichiers / la galerie** (Google Photos, Fichiers,
   Téléchargements, WhatsApp Images…) et **pas** la caméra.
3. Une capture d'écran Mvola ou Orange Money importée aboutit bien à des lignes exploitables
   (qualité de lecture, pas de blocage technique).
4. Le bouton en icône seule est confortable au doigt (40×40 px) à côté de « Scanner ».
5. Après déploiement : F12 → Application → Service Workers → **Unregister**, cocher
   « Update on reload », puis rouvrir une fenêtre de navigation privée pour être sûr de charger
   la 3.71.0.

---

## 8. Recommandations pour la suite

1. **HEIC / HEIF (iPhone, et certains Android récents).** Le garde-fou laisse passer
   `image/heic` (il commence bien par `image/`), mais `canvas.drawImage` ne décode pas HEIC
   sur Chrome Android ni sur Windows → `preprocessReceiptImage` échouera et l'utilisateur verra
   le message générique « Lecture du ticket impossible ». Deux options :
   - **peu coûteuse** : détecter `image/heic` / `image/heif` (et l'extension `.heic`) et
     afficher un message dédié (« Format iPhone non pris en charge : partagez la photo en JPEG »),
     plutôt que l'erreur générique ;
   - **complète** : ajouter un décodeur (`heic2any` ou `libheif-js`), ~1 Mo de WASM à servir
     localement comme Tesseract. À ne faire que si des utilisateurs iPhone sont réellement
     concernés — le parc BazarKELY est majoritairement Android.

   Recommandation : commencer par le message dédié, mesurer, puis décider.
2. **PDF (hors périmètre ici).** Beaucoup de reçus mobile money arrivent en PDF. Cela demande
   `pdfjs-dist` + ses assets servis localement (même schéma que `public/tesseract`), un rendu
   de la première page en canvas puis réinjection dans le pipeline existant. Le garde-fou
   actuel nomme déjà le PDF explicitement, ce qui rendra la bascule indolore côté message.
3. **Compression avant OCR en ligne.** Une capture d'écran plein écran est plus lourde qu'une
   photo de ticket recadrée ; `preprocessReceiptImage` fait déjà un downscale, mais il vaudrait
   la peine de vérifier le poids base64 envoyé à Google Vision sur une capture 1080×2400.
4. **Recadrage.** Sur une capture d'écran de paiement, le texte utile occupe souvent un tiers de
   l'image. Un recadrage manuel avant OCR améliorerait nettement le taux de lecture — chantier
   distinct, à envisager après retour d'usage réel.
