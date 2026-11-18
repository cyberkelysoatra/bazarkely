# Rapport RELEVE-CC-01 : Relevé de terrain, phase 1 (base de données)

**Référence :** RELEVE-CC-01 (prompt `gestion-terrassement\PROMPT-RELEVE-CC-01-base-de-donnees.md`)
**Date :** 18/11/2026. **Début :** 17:03 · **Fin :** 17:17 (heure de l'ordinateur) · **Durée active :** environ 14 min.
**Contexte atteint :** environ 45 % de la fenêtre (deux envois complets du SQL de 40 Ko en sont la plus grosse part).
**Projet Supabase :** `ofzmwrzatcztoekrpvkj` (organisation bazarkely), via le connecteur `execute_sql` (P22). Dans le dépôt, seul ce rapport a été créé : aucune ligne de code modifiée, ni build, ni version, ni commit, ni déploiement.
**Skills :** `supabase` et `supabase-postgres-best-practices` sont présents dans le dépôt. Je ne les ai pas chargés, car le prompt impose d'exécuter un SQL figé tel quel, sans le retoucher.

## Verdict

| Critère | État |
|---|---|
| C1 Prérequis relevés, aucun manquant | ✅ |
| C2 SQL exécuté deux fois sans erreur, md5 conforme | ✅ `ec258885bc1b26735bfc311fe20299c0` = attendu, contrôlé **côté serveur** à chaque exécution |
| C3 8 tables, RLS activée et forcée, aucun droit de table pour `public`, `anon`, `authenticated`, `service_role` | ✅ |
| C4 Droits sur les fonctions exactement comme décrits | ✅ (tableau ci-dessous) |
| C5 Tous les tests de comportement conformes, l'annulation ne laisse rien | ✅ 96 contrôles OK, 0 KO ; tout est à 0 après annulation |
| C6 URL de redirection ajoutées, existantes intactes | ✅ 9 → 11 |
| C7 Rapport écrit | ✅ (ce fichier) |

## Étape 1 : prérequis (lecture seule)

- `to_regclass('public.users')` = `users` (non nul) ; colonnes `id`, `preferences`, `role` présentes.
- Déclencheur sur `auth.users` : `trigger_handle_new_user` = `CREATE TRIGGER trigger_handle_new_user AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()`. Il crée la ligne `public.users` avec les préférences `{theme, language, currency, provider, avatar_url}`, sans clé `modules`.
- Objets `rt\_%` existants : aucune table, aucune fonction (`null` / `null`).
- `select rolname, rolbypassrls from pg_roles where rolname = current_user` → `postgres`, `true`.
- Contrôle annexe : la fonction `sha256` existe (nécessaire à `rt_hash`).

## Étape 2 : exécution du SQL (deux fois)

- Le bloc a été extrait du prompt (UTF-8, fins de ligne LF, une seule fin de ligne finale, 40 156 caractères). md5 calculé localement : `ec258885bc1b26735bfc311fe20299c0`.
- **Preuve côté serveur :** chaque envoi se terminait par `select md5(substr(current_query(), strpos(current_query(), '-- Relevé de terrain (module'), 40156))`, soit le md5 du texte **réellement reçu et exécuté par Postgres**. Résultat : `ec258885bc1b26735bfc311fe20299c0` aux deux exécutions (position 1, longueur de la requête 40 484 = SQL + ligne de contrôle).
- Exécution 1 : sans erreur. Exécution 2 : sans erreur.
- **Preuve d'idempotence :** empreinte de 93 éléments (fonctions = signature + md5 du corps + ACL ; index ; contraintes ; RLS et ACL des tables ; règles), relevée avant et après la seconde exécution. Elle est identique dans les deux cas : `ec83d14c574c74ad4bdca4939b6a3c7b`. La seconde exécution n'a donc ajouté aucun doublon et rien changé.

## Étape 3 : vérification de la structure

**Tables (8)**, toutes avec `relrowsecurity = true` et `relforcerowsecurity = true` : `rt_appareils`, `rt_chantiers`, `rt_domaines`, `rt_invitations`, `rt_journal`, `rt_objets`, `rt_partages`, `rt_releves`. ACL de chacune : `{postgres=arwdDxtm/postgres}`. Règles RLS : 0.
`information_schema.role_table_grants` sur `rt\_%` pour `PUBLIC`, `anon`, `authenticated`, `service_role` : **aucune ligne**. Le seul bénéficiaire de droits est `postgres`.

**Fonctions (31)**, toutes `SECURITY DEFINER` sauf `rt_hash` et `rt_nouveau_jeton` (fonctions SQL pures, conformes au SQL, appelables par aucun rôle client). Droits mesurés avec `has_function_privilege` :

| Fonction | anon | authenticated | service_role |
|---|---|---|---|
| rt_invitation_apercu(text) | ✅ | ✅ | — |
| rt_ouvrir(uuid,text) | — | ✅ | — |
| rt_mes_terrains() | — | ✅ | — |
| rt_domaine_enregistrer(uuid,text) | — | ✅ | — |
| rt_chantier_enregistrer(uuid,uuid,text) | — | ✅ | — |
| rt_chantier_supprimer(uuid,uuid) | — | ✅ | — |
| rt_domaine_supprimer(uuid,uuid) | — | ✅ | — |
| rt_releve_creer(uuid,uuid,uuid,text,jsonb) | — | ✅ | — |
| rt_releve_lire(uuid) | — | ✅ | — |
| rt_saisie_prendre(uuid,uuid) | — | ✅ | — |
| rt_saisie_reprendre(uuid,uuid) | — | ✅ | — |
| rt_saisie_terminer(uuid,uuid) | — | ✅ | — |
| rt_reprise_accuser(uuid,uuid) | — | ✅ | — |
| rt_envoyer(uuid,uuid,jsonb,jsonb) | — | ✅ | — |
| rt_releve_supprimer(uuid,uuid) | — | ✅ | — |
| rt_invitation_creer(uuid,uuid[],text) | — | ✅ | — |
| rt_invitation_accepter(text) | — | ✅ | — |
| rt_acces(uuid) | — | ✅ | — |
| rt_partage_modifier(uuid,text) | — | ✅ | — |
| rt_partage_retirer(uuid) | — | ✅ | — |
| rt_invitation_retirer(uuid) | — | ✅ | — |
| rt_moi() | — | — | — |
| rt_nouveau_jeton() | — | — | — |
| rt_hash(text) | — | — | — |
| rt_journaliser(text,jsonb) | — | — | — |
| rt_nom_compte(uuid) | — | — | — |
| rt_droit(uuid,uuid) | — | — | — |
| rt_ouvrir_module(uuid) | — | — | — |
| rt_appareil(uuid,text) | — | — | — |
| rt_liberer_sans_droit(uuid,uuid) | — | — | — |
| rt_releve_resume(uuid,uuid) | — | — | — |

Bilan : `anon` exécute **uniquement** `rt_invitation_apercu` ; `authenticated` exécute `rt_invitation_apercu` et les 20 fonctions du dernier `grant` ; aucune des 10 fonctions internes n'est exécutable par un rôle client ; `service_role` n'exécute rien. Le `public` ne figure dans aucune ACL.

**Contrôle complémentaire par l'API REST avec la clé anon (P22) :**
- `GET /rest/v1/rt_releves` → 401 `42501 permission denied for table rt_releves`
- `POST /rpc/rt_mes_terrains` → 401 `permission denied for function rt_mes_terrains`
- `POST /rpc/rt_droit` → 401 `permission denied for function rt_droit`
- `POST /rpc/rt_invitation_apercu {"p_jeton":"jeton-faux"}` → 200 `{"valide": false}`

## Étape 4 : tests de comportement (base réelle, une transaction annulée)

**Méthode.** Le connecteur ne rend que le résultat de la dernière instruction. Le scénario est donc un seul appel : quatre fonctions d'aide `pg_temp` (personnification par `set_config('request.jwt.claims', {sub, role}, true)` + `set local role authenticated|anon`, puis `reset role`), suivies d'un bloc `DO` qui accumule chaque résultat et se termine par `raise exception` (annulation forcée de tout, aides comprises). Comptes jetables P, R, C, N créés dans `auth.users` (`rt-test-<x>@example.invalid`). **Le déclencheur a créé leurs 4 lignes `public.users` : aucune insertion manuelle.** Chaque compte a appelé `rt_ouvrir(<uuid aléatoire>, 'test')` ; P a deux téléphones.

Sortie brute (chaque ligne `OK` = résultat conforme à l'attendu ; aucune ligne `KO`) :

```
OK  [setup] lignes public.users creees par le declencheur => 4
OK  ouvrir P tel1 => {"ok": true, "nom": "rt-test-p", "user_id": "6a7643c2-…"}
OK  ouvrir P tel2 => {"ok": true, "nom": "rt-test-p", …}
OK  ouvrir R / ouvrir C / ouvrir N => {"ok": true, …}
OK  P cree Domaine 1, Chantier 1, Chantier 2, Domaine 2, Chantier 3 (D2) => {"id": …, "ok": true}
OK  P nom vide => ERR:RT_NOM_VIDE
OK  R cree un chantier dans D1 => ERR:RT_NON_PROPRIETAIRE
OK  preferences (P, R, C, N) : modules contient releve, autres cles intactes => true (x4)
    (preferences de P apres : {"theme": "system", "modules": ["releve"], "currency": "MGA", "language": "fr", "provider": "google", "avatar_url": null})
OK  DR1 P invite Chantier 1 relever (jeton rendu, 64 car.) => true/true
OK  DR1 P invite Domaine 1 entier consulter => true/true
OK  DR1 anon apercu jeton 1 => {"droit": "relever", "valide": true, "chantiers": ["Chantier 1"], "domaine_nom": "Domaine 1", "domaine_entier": false, "proprietaire_nom": "rt-test-p"}
OK  DR1 anon apercu jeton 2 => {"droit": "consulter", "valide": true, "chantiers": [], "domaine_nom": "Domaine 1", "domaine_entier": true, …}
OK  DR1 anon apercu faux jeton => {"valide": false}
OK  DR1 P invite Chantier 3 sous Domaine 1 => ERR:RT_CHANTIER_HORS_DOMAINE
OK  DR1 R accepte jeton 1 / C accepte jeton 2 => {"ok": true, "domaine_id": …}
OK  DR1 R voit => Chantier 1:relever
OK  DR1 C voit => Chantier 1:consulter, Chantier 2:consulter
OK  DR1 N voit => (rien)
OK  DR2 P cree Chantier 4 (D1) => ok
OK  DR2 C voit => Chantier 1:consulter, Chantier 2:consulter, Chantier 4:consulter
OK  DR2 R voit => Chantier 1:relever
OK  DR3 R cree R1 => {"ok": true}
OK  DR3 R rejoue la creation => {"ok": true, "deja": true}
OK  DR3 C lit R1 : saisie.user_id = R => true (droit consulter)
OK  DR4 P prend la saisie de R1 => {"ok": false, "code": "EN_SAISIE", "saisie": {"moi": false, "nom": "rt-test-r", …}}
OK  DR5 C cree un releve => ERR:RT_DROIT_INSUFFISANT
OK  DR5 C envoie => {"ok": false, "code": "DROIT_RETIRE"}
OK  DR5 C lit R1 => {"id": "<R1>", "nom": "R1", "droit": "consulter", …}
OK  DR6 R envoie 3 stations => {"ok": true, "recus": 3, "reprise_at": null, "apres_reprise": false}
OK  DR6 R renvoie le meme lot => {"ok": true, "recus": 3, …}
OK  DR6 objets de R1 => 3
OK  DR7 R termine / P prend / P termine => {"ok": true} (x3)
OK  DR8 R reprend la saisie (prendre) => {"ok": true}
OK  DR8 R tente rt_saisie_reprendre => ERR:RT_REPRISE_PROPRIETAIRE_SEUL
OK  DR8 P reprend => {"ok": true, "reprise": true}
OK  DR8 P envoie 1 station => {"ok": true, "recus": 1, "apres_reprise": false}
OK  DR8b R envoie 4 stations (tardif) ok/apres_reprise/recus => true/true/4
OK  DR8b R accuse la reprise => {"ok": true}
OK  DR8b R renvoie apres accuse => {"ok": false, "code": "SAISIE_REPRISE", "saisie": {"nom": "rt-test-p", …}}
OK  DR8b objets R1 apres_reprise => 4
OK  DR8b objets R1 au total (3 + 1 + 4) => 8
OK  DR8b saisie.user_id de R1 = P => true
OK  DR9 P cree RP (releve de P, tel2) => {"ok": true}
OK  DR9 R supprime RP (cree par P) => ERR:RT_DROIT_INSUFFISANT
OK  DR9 R cree R9 => {"ok": true}
OK  DR9 P supprime R9 (tenu par R) => ERR:RT_RELEVE_TENU_AILLEURS
OK  DR9 P supprime Chantier 1 => ERR:RT_RELEVE_TENU_AILLEURS
OK  DR9 R supprime R9 => {"ok": true}
OK  DR10 R cree R10 => {"ok": true}
OK  DR10 rt_acces trouve le partage de R sur Chantier 1 => true
OK  DR10 P passe R en consulter => {"ok": true}
OK  DR10 saisie de R10 => null
OK  DR10 R envoie sur R10 => {"ok": false, "code": "DROIT_RETIRE"}
OK  DR10 P remet relever => {"ok": true}
OK  DR12 R cree une invitation => ERR:RT_NON_PROPRIETAIRE
OK  DR12 C renomme Chantier 2 => ERR:RT_NON_PROPRIETAIRE
OK  DR13 N accepte le lien deja accepte par R => ERR:RT_INVITATION_PLUS_VALABLE
OK  DR13 apercu de ce lien => {"valide": false, "plus_valable": true}
OK  DR15 R accepte Domaine 1 relever / Chantier 2 consulter => {"ok": true, …} (x2)
OK  DR15 R voit => Chantier 1:relever, Chantier 2:consulter, Chantier 4:relever
OK  DR16 P retire le partage Chantier 2 de R => {"ok": true}
OK  DR16 R voit => Chantier 1:relever, Chantier 2:relever, Chantier 4:relever
OK  DR18 R cree R2 => {"ok": true}
OK  DR18 P lit R2 : saisie.user_id = R => true
OK  DR17 N accepte une invitation vieille de 30 jours (cree_at reculé par postgres) => {"ok": true, …}
OK  DR17 N voit => Chantier 2:consulter
    (DR11 partages de R retires : 2 — Chantier 1 et domaine entier)
OK  DR11 R voit => (rien)
OK  DR11 stations de R1 conservees => 8
OK  DR11 saisie de R2 => null
OK  R ouvre avec le telephone de P => ERR:RT_APPAREIL_AUTRE_COMPTE
OK  P accepte sa propre invitation (Domaine 2) => ERR:RT_INVITATION_PROPRIETAIRE
OK  anon select * from rt_releves => ERR:permission denied for table rt_releves
OK  anon rt_mes_terrains() => ERR:permission denied for function rt_mes_terrains
OK  authenticated select * from rt_releves => ERR:permission denied for table rt_releves      (en plus)
OK  authenticated appelle rt_droit (interne) => ERR:permission denied for function rt_droit   (en plus)
OK  modules de P, R, C, N : releve une seule fois => 1 (x4)                                    (en plus)
    (lignes rt_journal pendant le scenario : 27)
```

**Concurrence** (lecture de la définition dans une connexion séparée) : `rt_saisie_prendre` verrouille la ligne : `select * into r from public.rt_releves where id = p_releve and supprime_at is null for update;`. Les fonctions qui posent aussi `for update` sont `rt_envoyer`, `rt_invitation_accepter`, `rt_invitation_retirer`, `rt_partage_modifier`, `rt_partage_retirer`, `rt_releve_supprimer`, `rt_saisie_prendre`, `rt_saisie_reprendre` et `rt_saisie_terminer`.

**Après l'annulation** (appel séparé) : `rt_domaines` 0, `rt_chantiers` 0, `rt_invitations` 0, `rt_partages` 0, `rt_appareils` 0, `rt_releves` 0, `rt_objets` 0, `rt_journal` 0 ; `auth.users` `rt-test-%` : 0 ; `public.users` `rt-test-%` : 0 ; comptes ayant `releve` dans `modules` : 0 ; fonctions d'aide `pg_temp` : 0.

## Étape 5 : URL de redirection Supabase Auth

Navigateur : « Browser 1 » (`909e8779-…`), compte Google vérifié = **CyberKELY SOATRA** (cyberkelysoatra@gmail.com). Organisation **bazarkely** confirmée sur `/dashboard/organizations`. Aucune saisie d'identifiants. L'onglet ouvert a été refermé.

- **Avant (9) :** `https://1sakely.org/**`, `https://1sakely.org/auth`, `https://1sakely.org/auth/`, `http://localhost:3000/auth`, `http://localhost:3000/auth/`, `com.cyberkely.navyay://auth-callback`, `http://localhost:3000/pudi/**`, `https://1sakely.org/validation/**`, `http://localhost:3000/validation/**`
- **Après rechargement de la page (11) :** les 9 ci-dessus, inchangées, + `https://1sakely.org/releve/**` + `http://localhost:3000/releve/**`

## Surprises

1. **Mon script de test, pas le SQL :** PL/pgSQL ne distingue pas les majuscules des minuscules (`R`/`r`, `N`/`n`). Le premier envoi a été refusé à l'analyse (`duplicate declaration`) : rien n'a été exécuté et rien n'a été écrit. J'ai renommé mes variables, puis relancé.
2. La clé anon n'est pas dans `frontend/.env*` (elle est posée côté Cloudflare). Pour le contrôle REST, je l'ai lue par le connecteur (`get_publishable_keys`), sans l'enregistrer nulle part.
3. La séquence d'identité de `rt_journal` a avancé de 27 pendant le scénario annulé : une annulation ne remet pas une séquence à zéro. C'est sans effet, à part des numéros sautés.

## Points relevés dans le SQL (non corrigés, comme l'exige le prompt)

1. **`rt_envoyer` : un objet sans `saisi_at` est daté de 12 h dans le futur.** `least((o->>'saisi_at')::timestamptz, now() + interval '12 hours')` : la fonction `LEAST` de Postgres **ignore les NULL** et renvoie donc `now() + 12 h`. Je l'ai vérifié sur la base : `least(null, now()+12h) - now() = 12:00:00`. Proposition : `case when o ? 'saisi_at' then least(…) end`, ou exiger `saisi_at` côté téléphone. **À corriger avant le socle client.** Sinon, le client devra toujours envoyer `saisi_at`.
2. **`rt_invitation_accepter` : le journal `invitation_refusee` ne s'écrit jamais.** Il est inséré juste avant le `raise exception 'RT_INVITATION_PLUS_VALABLE'`, qui annule tout l'appel, insertion comprise. Si cette trace compte, il faut renvoyer `{ok:false, code}` au lieu de lever l'exception, ou accepter qu'il n'y ait pas de trace.
3. Les fonctions `SECURITY DEFINER` appartiennent à `postgres`, qui a `bypassrls = true` : c'est ce qui leur permet de lire les tables malgré la RLS forcée. Si on changeait un jour leur propriétaire pour un rôle sans `bypassrls`, toutes les fonctions verraient des tables vides. **Ne pas changer de propriétaire.**

## Recommandations pour la phase suivante (socle client)

- Appeler uniquement les fonctions `rpc('rt_…')`, jamais `from('rt_…')` : les tables refusent tout accès direct, `401 / 42501`.
- Toutes les erreurs métier arrivent en message d'exception `RT_…` (`error.message`) ; certains refus de saisie arrivent en réponse normale `{ok:false, code:'EN_SAISIE'|'DROIT_RETIRE'|'SAISIE_REPRISE'|'PAS_LA_SAISIE'}`. Le client doit traiter les deux formes.
- Envoyer `saisi_at` sur chaque objet (point 1 ci-dessus) tant que le SQL n'est pas corrigé.
- `rt_ouvrir` est la première opération à appeler dès qu'il y a du réseau (enregistre l'appareil et pose `releve` dans `preferences.modules`). Côté client, `modulePrefsSync` reste le seul écrivain de `modules` ; le serveur en devient un troisième (après `vc_ouvrir_module`). La règle de **fusion** doit absorber `releve`.
- Les deux URL de redirection `/releve/**` sont en place pour l'entrée légère `/releve/`.
