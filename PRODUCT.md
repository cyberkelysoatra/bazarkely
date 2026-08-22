# Product

<!-- impeccable:product-schema 1 -->

## Register

product

> L'application **sert** le produit : elle n'est pas une vitrine. Ce n'est ni un site
> marketing, ni une landing page, ni une page de campagne. Le mode correspondant en
> vocabulaire Impeccable v4 est **Operate** (l'utilisateur accomplit une tâche).

## Platform

web

## Users

Des utilisateurs **non techniciens**, à Madagascar, majoritairement **sur téléphone
Android**. La cible de référence pour toute décision de mise en page est **412 × 869**
(portrait). La connexion réseau est **intermittente** : l'application doit rester
utilisable sans réseau, à l'identique.

Plusieurs rôles coexistent dans le module Gestion Eau — **administrateur**, **releveur**,
**propriétaire**, **promoteur** — et ne voient pas les mêmes écrans. Un même écran peut
donc exister en version pilotable et en version lecture seule selon le rôle effectif.

## Product Purpose

Une **PWA unique, hors-ligne d'abord**, qui héberge **trois modules indépendants**
accessibles par un sélecteur de module :

1. **Cœur BazarKELY** — gestion de budget familial à Madagascar (comptes, transactions,
   objectifs, prêts).
2. **Construction / 1saKELY** — approvisionnement BTP.
3. **Gestion Eau / AHUVI** — distribution et suivi d'eau à Nosy Be : relevés, compteurs,
   facturation eau et électricité.

Les trois modules partagent une coquille applicative (en-tête, navigation, mise en page)
mais **pas** leur identité visuelle. Voir `DESIGN.md`.

## Operating Context

Usage sur le terrain, au téléphone, souvent debout et à une main, parfois sans réseau.
Les relevés de compteurs se saisissent sur place. La consultation d'un tableau de bord ou
d'une facture se fait aussi bien hors ligne qu'en ligne, sans différence perceptible.

## Capabilities and Constraints

- Fonctionnement **identique hors ligne** : lecture depuis le stockage local, écritures
  mises en file et rejouées. Aucun écran ne doit dépendre d'un aller-retour réseau pour
  s'afficher.
- **Jamais d'écran vide sans explication** : tout état vide dit pourquoi il est vide et
  quoi faire ensuite.
- **Aide contextuelle dépliable (ⓘ)** sur chaque écran ou action non triviale, rédigée en
  **français simple, sans jargon**.
- Repérage **par l'icône avant le texte** : l'icône porte le sens, le libellé confirme.
- Lisibilité immédiate sur petit écran : c'est le critère qui tranche en cas de conflit.

## Brand Commitments

Trois chartes visuelles distinctes et **non fusionnables** coexistent (cœur BazarKELY,
Construction, AHUVI Eau). Elles sont décrites dans `DESIGN.md`, qui fait autorité sur le
choix de la palette selon le chemin du fichier travaillé.

## Anti-references

Ce que le produit ne doit **pas** devenir :

- le tableau de bord SaaS générique bleu-gris interchangeable ;
- les dégradés violets « faits par une IA » ;
- les cartes empilées sans hiérarchie ;
- les graphiques décoratifs qui n'apprennent rien ;
- le jargon technique ou l'anglais dans l'interface.

## Product Principles

1. **La charte du module en cours prime sur toute suggestion contraire**, y compris celles
   d'Impeccable.
2. Toute modification d'un fichier **partagé** (`Header`, `BottomNav`, `AppLayout`,
   `ModuleSwitcherContext`, `constants`) doit être **additive et conditionnée au module**,
   jamais globale.
3. **Aucune nouvelle palette, police ou bibliothèque d'interface** ne peut être introduite.
4. Le design ne touche **ni à la logique métier, ni aux données, ni à la navigation**.
5. Contraste **minimum 4,5:1** sur tout texte ; cibles tactiles confortables ; focus
   clavier visible.

## Accessibility & Inclusion

Contraste **≥ 4,5:1** sur tout texte, sans exception (y compris les libellés secondaires et
les textes sur fond coloré). Cibles tactiles confortables pour un usage à une main en
extérieur. Focus clavier visible. Langue de l'interface : **français simple**, sans jargon
technique ni anglicismes.
