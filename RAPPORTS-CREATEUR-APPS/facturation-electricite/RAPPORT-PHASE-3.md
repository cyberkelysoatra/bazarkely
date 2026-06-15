# RAPPORT — Phase 3 : Facture combinée eau + électricité + PDF modernisé

**Module :** gestion-eau · **Session Claude Code :** « 3 — Facture combinée »
**Horodatage de clôture :** 2026-06-09 23:32:54 +03:00 (Antananarivo)
**Version en ligne validée :** **3.46.8** (bundle `index-DineVJDm.js`, origine Netlify `1sakely.org`)
**Versions intermédiaires :** 3.46.6 (fonctionnalité) → 3.46.7 (logo + chevauchement tableaux) → 3.46.8 (alignement à droite)

---

## 1. Garde-fous techniques

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | **exit 0** (à chaque version : 3.46.6 / 3.46.7 / 3.46.8) |
| `npm run build` (vite + injectManifest) | **OK** (build production réussi) |
| Déploiement | **OK** — push unique par version sur `main`, Netlify auto-deploy, vérifié via origine `*.netlify.app`/`1sakely.org` (JS live contient `3.46.8`, `/ahuvi-logo.png` → `image/png 200`) |

---

## 2. Résultat des 6 critères d'acceptation

### Critère 1 — tsc + build ✅
`tsc --noEmit` exit 0 et `npm run build` OK sur les 3 versions. Aucune référence orpheline.

### Critère 2 — Reproduction du modèle (test chiffré) ✅
Validé **end-to-end via l'Aperçu live** (code déployé : `previewFactures` → `computeLigneFacture` + `computeLigneElec` sur l'IndexedDB réelle) puis via le **PDF lu**.

Données : coût `2025-06` réel en base (A=7 852 098,40 ; B=472 500 ; C=5 529 → **D=1 505,6246**), V04 relevés eau 314,70 → 363,20 (48,50 m³) + relevés élec injectés 6 925,80 → 7 211,10 (285,30 kWh), période 01/06/2025 → 30/06/2025.

| Poste | Attendu (prompt) | Mesuré (live) |
|---|---|---|
| Eau | 145 500 | **145 500,00** (48,50 × 3 000) |
| Électricité | ≈ 429 554,70 | **429 554,70** (285,30 × 1 505,6246) |
| **Total** | ≈ 575 054,70 | **575 054,70** (affiché 575 055 arrondi) |

Le PDF montre les 2 tableaux + l'encadré A/B/C/D + « Soit : Cinq cent soixante-quinze mille cinquante-cinq Ariary ».

### Critère 3 — Mois de coûts appliqué ✅
En basculant le sélecteur sur un 2ᵉ mois de coûts (test `2025-05` à **3 000 MGA/kWh**), l'Aperçu V04 recalcule : Électricité **855 900 MGA** (285,30 × 3 000), **Total 1 001 400 MGA**, l'eau restant 145 500. → D et `montant_elec` changent bien avec le mois sélectionné.

### Critère 4 — `montantEnLettres` ✅
Fonction pure vérifiée (script + commentaires de tests) :
- `montantEnLettres(575055)` → **« Cinq cent soixante-quinze mille cinquante-cinq Ariary »** (= attendu)
- `montantEnLettres(61800)` → « Soixante et un mille huit cents Ariary »
- `montantEnLettres(145500)` → « Cent quarante-cinq mille cinq cents Ariary »
- `montantEnLettres(0)` → « Zéro Ariary » ; `(80)` → « Quatre-vingts » ; `(81)` → « Quatre-vingt-un » ; `(91)` → « Quatre-vingt-onze » ; `(1000000)` → « Un million » ; `(1234567)` → « Un million deux cent trente-quatre mille cinq cent soixante-sept ». Règles fr (et / cents / mille invariable) respectées.

### Critère 5 — Villa sans relevé élec ✅
V07 (relevés eau seuls 390,10 → 410,70 = 20,60 m³, **aucun relevé élec**) → facture **eau seule** : Aperçu « Élec : — », total 61 800 MGA. **PDF eau-seule** vérifié (F-TEST-V07, Mr SIRVENT) : **un seul tableau EAU**, pas de tableau ÉLECTRICITÉ, pas d'encadré A/B/C/D, **pas de crash**. Idempotence : `factureExistante(compteur, période)` inchangée (pas de doublon par période/compteur).

### Critère 6 — PDF lisible + logo absent géré ✅ (après 2 correctifs)
- Logo absent géré proprement : le fichier `public/ahuvi-logo.png` était **gitignored donc non déployé** → `/ahuvi-logo.png` renvoyait le HTML de repli SPA → bascule sur le **titre texte « RÊVE D'OR / AHUVI »** (try/catch, aucun crash). Corrigé en déployant le logo (`git add -f`, v3.46.7).
- **2 bugs de chevauchement/troncature détectés et corrigés** (voir §4).

---

## 3. Rendu PDF (description + écarts au modèle)

PDF A4 portrait, mise en page finale (v3.46.8) :
- **En-tête** : logo AHUVI (paysage 800×268, ratio respecté 42 mm × ~14 mm) en haut à gauche ; « FACTURE », N° facture, « Émise le … » à droite.
- **Bloc émetteur / propriétaire** : `copro_nom` (RÊVE D'OR) + contact, mention « Le propriétaire doit à la SCI RÊVE D'OR la somme de : » ; à droite **VILLA N°4** (dérivée de `V04`), « Propriétaire : Mr & Mme PAUGET », « Période : 01/06/2025 00:00 au 30/06/2025 23:59 ».
- **Tableau ÉLECTRICITÉ** (teal/sky) : Désignation / Index init. / Index final / Conso / P.U. (MGA) / Total (MGA) → 6 925,80 · 7 211,10 · 285,30 kWh · 1 505,62 · 429 554,70.
- **Tableau EAU** (vert AHUVI) : 314,70 · 363,20 · 48,50 m³ · 3 000,00 · 145 500,00.
- **Encadré A/B/C/D** (4 lignes empilées) : A=JIRAMA 7 852 098,40 · B=Gasoil 472 500,00 · C=5 529 kWh · **D=(A+B)/C=1 505,62**.
- **Bandeau TOTAL À PAYER** (sky-700) : **575 055 MGA** + « Soit : Cinq cent soixante-quinze mille cinquante-cinq Ariary ».
- **Statut/échéance** + pied « Document généré par BazarKELY — Gestion Eau ».

**Écarts au modèle SCI RÊVE D'OR (assumés, modernisation) :**
- Devise affichée dans l'**en-tête des colonnes** P.U./Total (et non répétée dans chaque cellule) — choix de lisibilité pour éviter le chevauchement.
- Séparateur de période « au » au lieu de « → » (la flèche est absente de la police Helvetica → calcul de largeur faussé).
- Encadré A/B/C/D en 4 lignes verticales (modèle papier : 2 colonnes) — meilleure lisibilité mobile.
- « Dates des relevés » : la facture stocke la **période** (début/fin) mais pas l'horodatage exact de chaque relevé ; le PDF affiche donc la période (proxy fidèle) — voir recommandations.

---

## 4. Bugs détectés & corrigés pendant la validation (boucle d'autonomie)

1. **Logo non déployé** (v3.46.7) : `public/ahuvi-logo.png` gitignored → `git add -f`. Sans correctif, repli texte (fonctionnel mais sans logo).
2. **Chevauchement P.U./Total** sur les gros montants (v3.46.7) : le suffixe « MGA » dans chaque cellule poussait « 429 »/« 145 » sous la colonne voisine. Fix : devise en en-tête de colonne, cellules en nombre nu (`fmtNb`), largeurs rééquilibrées (40/24/24/26/28/32) ; encadré A/B/C/D réécrit en 4 lignes (au lieu de 2 colonnes qui se télescopaient).
3. **Débordement/troncature à droite** du bandeau TOTAL (« 575 055 M » coupé) et de la période (v3.46.8) : les caractères absents d'Helvetica — **espace fine insécable U+202F** (séparateur de milliers `toLocaleString('fr-FR')`) et **flèche →** — faussent le calcul de largeur jsPDF pour l'alignement à droite. Fix : helper `pdfSafe()` normalise U+202F/U+00A0 en espace normale (dans `fmtNb`/`fmtAr` + total du bandeau) ; « → » → « au ».

---

## 5. Test mobile

`window.innerWidth` **réel mesuré = 588 px** (fenêtre redimensionnée à 390 px d'extérieur, mais la largeur CSS plancher de cet environnement reste 588 ; `devicePixelRatio` 0,75 → 441 px device). À cette largeur, la page Facturation rend proprement : sélecteur « Mois de coûts électricité (prix du kWh) » présent, dates en 2 colonnes, cartes factures avec sous-ligne « Eau : … · Élec : … », barre de navigation du bas intacte, **aucun débordement horizontal**.

---

## 6. Propreté des données (production)

Toutes les données de test ont été **injectées en local uniquement** (`_dirty:false` → jamais poussées vers Supabase) puis **supprimées de l'IndexedDB** après validation :
- 2 relevés élec V04 (note `TEST-PHASE3-PURGE`) — supprimés.
- Coût mensuel test `2025-05` (3 000 MGA/kWh) — supprimé (le coût réel `2025-06` conservé).
- Factures `F-TEST-V04` / `F-TEST-V07` — supprimées.

**Supabase n'a jamais été modifié** par la validation. État restant = état d'origine de JOEL (préexistant, hors session) :
- 2 relevés élec test sur **LODGE_V01** (1000, 1150) — *déjà notés « à purger »* avant cette session.
- Factures **F-000001 / F-000002** (V04/V07, période 2026-05, 0 m³) — préexistantes.

> ⚠️ À purger éventuellement par JOEL (hors périmètre Phase 3) : les 2 relevés LODGE_V01 et les factures F-000001/F-000002 de test.

---

## 7. Surprises & recommandations Phase 4

**Surprises :**
- Le calcul est solide du premier coup (Aperçu live exact), mais **3 itérations PDF** ont été nécessaires sur la mise en page (logo non déployé + 2 défauts d'alignement liés aux caractères hors-police). Leçon : jsPDF + police standard ⇒ proscrire `→`, espaces fines insécables et tout glyphe hors WinAnsi dans le texte aligné à droite.
- `public/` gitignored : tout asset livré au PDF doit être `git add -f` (déjà connu pour les photos vitrine, désormais aussi pour le logo facture).

**Recommandations Phase 4 :**
1. **Dates de relevés exactes sur le PDF** : si souhaité, persister sur `eau_factures` les timestamps des relevés eau/élec retenus (debut/fin) pour afficher les vraies dates plutôt que la période. Sinon, conserver la période (suffisant).
2. **Montant élec arrondi ?** Décider si `montant_elec`/`montant_total` doivent être arrondis à l'entier à la génération (actuellement décimales conservées : 429 554,70). Le bandeau affiche l'entier (`fmtMontant`), les tableaux 2 décimales — cohérent, mais à valider avec JOEL.
3. **Envoi de la facture** (WhatsApp/email du PDF) — pertinent si Phase 4 couvre la distribution.
4. **Purge** des données de test préexistantes (LODGE_V01, F-000001/002) via SQL si besoin d'un environnement propre.

---

## 8. Fichiers livrés

- `modules/gestion-eau/utils/facture.ts` — `computeLigneElec` (kWh).
- `modules/gestion-eau/services/eauFactureService.ts` — `FacturePreview` étendu + `previewFactures`/`genererFactures(coutMois)` + persistance volet élec/`cout_mois`/`montant_total`.
- `modules/gestion-eau/utils/montantLettres.ts` (neuf) — `montantEnLettres` pur.
- `modules/gestion-eau/utils/pdf.ts` — `buildFactureCombineePdf`/`downloadFactureCombineePdf` + `pdfSafe()`.
- `modules/gestion-eau/components/EauFacturationPage.tsx` — sélecteur mois de coûts + garde-fou + colonnes eau/élec/total + aide.
- `modules/gestion-eau/components/EauClientPage.tsx` — PDF combiné côté propriétaire.
- `modules/gestion-eau/components/eauAideTextes.ts` — aide `factureCombinee`.
- `frontend/public/ahuvi-logo.png` — déployé (`git add -f`).
- `constants/appVersion.ts` + `package.json` — versions 3.46.6 / 3.46.7 / 3.46.8 + notes FR + VERSION_HISTORY.

---

## 9. Demande à JOEL

🙏 **Merci de partager la capture du compteur de contexte de cette session Claude Code** (pour calibrer la taille des prochains prompts de phase).
