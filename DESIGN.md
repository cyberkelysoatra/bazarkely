# Design

> **Ce dépôt porte TROIS chartes visuelles distinctes, pas une.** Il n'existe pas
> d'identité unique à faire converger. Toute proposition d'unification globale est hors
> périmètre par défaut.

## Règle de sélection — la palette se déduit du CHEMIN du fichier travaillé

| Chemin | Charte à appliquer |
|---|---|
| `frontend/src/modules/gestion-eau/**` | **AHUVI** (voir ci-dessous) |
| `frontend/src/modules/construction-poc/**` | **Construction** (dette assumée) |
| tout le reste | **Cœur BazarKELY** |

**Fichiers partagés** (`frontend/src/components/Layout/**`,
`frontend/src/components/Navigation/**`) : **aucune palette ne s'applique globalement.**
La couleur doit être **conditionnée au module actif**, sur le modèle des branches
`isEauModule` / `isConstructionModule` déjà en place dans le code.

Exemple du motif existant à reproduire (`Navigation/BottomNav.tsx`) :

```ts
const activeBg = isEauModule ? 'bg-ahuvi-forest' : 'bg-blue-600'
```

---

## Charte AHUVI — module Gestion Eau

La plus aboutie des trois. **C'est la référence de qualité du dépôt** : en cas de doute sur
le niveau de finition attendu ailleurs, c'est ce module qu'il faut regarder.

### Palette

| Rôle | Token Tailwind | Valeur |
|---|---|---|
| Marque principale | `ahuvi-forest` | `#364E30` |
| Secondaire | `ahuvi-olive` | `#4C6D40` |
| Accent (surfaces, icônes) | `ahuvi-gold` | `#9D9B4B` |
| Encre or accessible (**texte**) | `ahuvi-gold-700` | `#6f6d33` |
| Accent clair | `ahuvi-gold-light` | `#C3C067` |
| **Eau** | `ahuvi-teal` | `#10939F` |
| Échelle de fonds et d'encres | `ahuvi-50` … `ahuvi-900` | `#f4f6f2` … `#22301f` |

Échelle complète : `50 #f4f6f2` · `100 #e6ebe1` · `200 #cdd7c4` · `300 #a9bb9b` ·
`400 #84996f` · `500 #4C6D40` · `600 #3f5b36` · `700 #364E30` · `800 #2a3c26` ·
`900 #22301f`.

### Typographie

- Titres : `font-ahuvi-display` — **Playfair Display** (repli Georgia, serif).
- Corps : `font-ahuvi-body` — **Poppins** (repli Inter, system-ui, sans-serif).

### Ombre

`shadow-soft`.

### Règles de couleur — non négociables

- **Vert forêt + or = identité de marque.** C'est la signature du module.
- **Teal = tout ce qui parle d'eau** : niveaux, jauges, débit, flux. Rien d'autre ne porte
  cette couleur, et l'eau ne se représente pas autrement.
- `amber` / `rose` / `emerald` sont **réservés au sens** (alerte, perte, conformité) et
  **jamais décoratifs**.
- **Zéro bleu générique, zéro gris générique** dans ce module.
- **`ahuvi-gold-700` pour le TEXTE or**, `ahuvi-gold` pour les surfaces, icônes et séries
  de graphiques : `#9D9B4B` ne passe pas 4,5:1 en texte sur blanc, `#6f6d33` oui (≈ 5,37:1).
- Les couleurs de graphiques viennent **uniquement de la source unique `EAU_CHART`**
  (exportée par `EauUi`). **Jamais de couleur de série en dur.**

### Kit de briques existant — à réutiliser, pas à réinventer

`EauUi` · `EauPageShell` · `EauTabs` · `EauAide`.

---

## Charte Cœur BazarKELY

- Palette `primary` **bleu / cyan** (famille sky) — `primary.600 = #0284c7`.
- Accent **rouge** (`accent.600 = #dc2626`).
- Navigation active : `bg-blue-600`.
- Polices : **système** (`Inter`, `system-ui`, `sans-serif`).
- Sémantiques : `success` (vert), `warning` (ambre), `malgache`
  (`red #dc2626` / `white #ffffff` / `green #16a34a`).

*Observation de terrain (constatée dans `components/Layout/Header.tsx`, pas une règle
nouvelle) : la coquille d'en-tête hors module eau est en **violet** (`from-purple-900/80`
`to-purple-800/80`, `theme-color #3b0764`), tandis que la palette `primary` du thème est
bleu/cyan. Les deux coexistent aujourd'hui ; ne pas « harmoniser » l'un vers l'autre sans
chantier dédié.*

---

## Charte Construction

**Aucune charte unifiée à ce jour** : bleu, violet, orange et indigo s'y mêlent, il
n'existe aucun jeu de briques partagées, et chaque écran refait sa propre mise en page.

À traiter comme une **dette assumée** :

- ne **rien uniformiser au passage** sans chantier dédié ;
- se contenter de **ne pas l'aggraver**.

---

## Freins durs — à respecter sans exception

1. **Ne jamais retirer `isAnimationActive={false}`** d'une série Recharts. Avec React 19 +
   Recharts 3, l'animation part en **boucle infinie**.
2. **Ne jamais introduire de dépendance d'interface nouvelle** (bibliothèque de composants,
   de motion, d'icônes…).
3. **Ne jamais poser d'`overflow-hidden`** sur le `<header>`, sur sa rangée principale ou
   sur son conteneur de padding : ce sont les ancêtres de menus déroulants positionnés en
   absolu, qui seraient **coupés**. Les débordements se corrigent par une chaîne
   **`min-w-0` + troncature**.
4. **Le bloc titre du header porte un verrou de hauteur** (`min-h-[3.5rem] sm:min-h-0`
   pendant une simulation de rôle) : **le retirer ferait sauter le corps de page de 2 px.**
