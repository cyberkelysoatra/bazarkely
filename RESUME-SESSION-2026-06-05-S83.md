# RESUME SESSION S83 — 2026-06-05

## Objet
Évolution **« bassin/débit »** du module `gestion-eau` (v3.22.0) : modèle physique
flotteur/trop-plein, tests de débit des pompes, conso réseau/pertes/NRW réelles, autonomie estimée.

## Livré & déployé
- **Commits** : `d238614` (code) + `00fa176` (rapport) poussés sur `main` → Netlify.
- **Bundle live** : `index-D9IkhmOc.js` (v3.22.0) confirmé sur `https://1sakely.org`.
- **SQL exécuté par Claude via navigateur** (RÈGLE #0ter) + vérifié REST (200) :
  `eau_config` (+flotteur/trop-plein/écart débit), `eau_debit_tests` (nouvelle table),
  `eau_bilans` (+apport/conso réseau/pertes/débit), check `eau_alertes` élargi.

## Nouveautés
- **Config** : Hauteur flotteur (plafond op. = réf. % remplissage), Hauteur trop-plein (sécurité),
  Écart débit max (%). Déductions lecture seule (surface, volume utile/sécurité, m³/cm).
- **Saisie bassin → onglet Débit** : test « vanne fermée » → Q_in (m³/h), historique + débit courant + écart %.
- **Tableau de bord** : cartes Débit courant, Conso réseau, NRW (réseau), Autonomie.
- **Alertes** : `flotteur_defaillant` (niveau > flotteur) + `debit_instable` (écart test > seuil).
- **Service central** `eauBassinService` (source unique des déductions + tests de débit).
- Rétrocompatible : sans test de débit → repli auto sur la saisie manuelle d'entrées.

## Qualité
- `tsc --noEmit` ✅ · `build` ✅ · **92 tests verts** (15 nouveaux dans `eauBassinDebit.test.ts`).
- **Validé live en rôle ADMIN** (Joël SOATRA, viewport mobile) : déductions 98/245/0,98/284,2 m²/m³,
  Q_in 9,8 m³/h + historique, cartes dashboard, sync `_dirty:false` (push Supabase confirmé).

## Pièges capitalisés (mémoire + CLAUDE déjà à jour)
- RLS `to authenticated` → **lecture REST anon des `eau_*` renvoie `[]`** même si lignes présentes :
  vérifier la présence de lignes via le flag Dexie `_dirty:false`, pas le REST anon (qui ne sert que le schéma).
- Après deploy : `index.html` HTTP-caché peut pointer un ancien hash JS malgré unregister SW + purge caches
  → forcer un document frais avec un **cache-buster** (`?cb=...`).

## Rapport
`RAPPORTS-CREATEUR-APPS/gestion-eau/RAPPORT-EVOLUTION-bassin-debit.md`

## Non re-testé live
Rôles Releveur/Client (OAuth multi-compte non jouable côté agent) → couverts par gardes inchangées + tests.
