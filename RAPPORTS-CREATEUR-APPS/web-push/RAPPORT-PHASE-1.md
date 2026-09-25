# Web Push — Rapport de phase 1 : le socle d'envoi distant

**Date :** 2026-09-26 · **Versions :** v3.83.0 (`00dbaf2`) → v3.83.1 (`d03e6d7`) → v3.83.2 (`a541ca8`) · **Branche :** `cloudflare-migration`
**Projet Supabase :** `ofzmwrzatcztoekrpvkj` (SQL et fonction serveur déployés directement par l'outil Supabase relié)

---

## 1. En bref

Le socle fonctionne de bout en bout **en production** : un navigateur qui active les notifications est abonné, le serveur envoie, et la notification arrive **application fermée**. Chemin interne (`notify_users`) et chemin administrateur vérifiés.

Trois livraisons au lieu d'une : les tests réels en production ont révélé deux défauts que les tests locaux ne pouvaient pas montrer.

| Version | Pourquoi |
|---|---|
| 3.83.0 | Le chantier complet |
| 3.83.1 | **Course** : deux demandes d'abonnement simultanées se remplaçaient et laissaient un abonnement mort en base. Correctif : une seule demande à la fois. Ajout d'un **journal de réception** dans le service worker (preuve de réception) |
| 3.83.2 | **Chiffrement** : le chiffrement du contenu par la bibliothèque `web-push` ne marche pas sous Deno (Google accepte, Chrome jette en silence). Remplacé par WebCrypto (RFC 8291). Délai d'abonnement 5 s → 15 s |

Test en local impossible jusqu'au bout : la session Supabase de `localhost:3000` avait expiré. Ta session admin sur 1sakely.org, où la permission de notifications était déjà accordée, a permis de tout tester sans te redemander d'action.

---

## 2. Critères d'acceptation

| AC | État | Preuve |
|---|---|---|
| **AC1** `sw-notifications.js` supprimé, écouteurs dans `sw-custom.ts` | ✅ | Fichier supprimé. Il n'était **même pas suivi par git** (dossier `public` ignoré) : il n'a jamais été en production. `push`, `notificationclick`, `notificationclose` sont dans `sw-custom.ts`. Références retirées de `vite.config.ts` / `vite.config.prod.ts`. `dist/sw-custom.js` contient `addEventListener("push"` et aucune trace de `sw-notifications` |
| **AC2** Un seul service worker | ✅ | `navigator.serviceWorker.getRegistrations()` sur localhost:3000 **et** sur 1sakely.org : une seule entrée, `sw-custom.js`, portée `/` |
| **AC3** Permission accordée → ligne dans `push_subscriptions` | ✅ | Ligne créée pour le compte admin (hôte `fcm.googleapis.com`) dès le chargement de la v3.83.0 |
| **AC4** Réabonnement sans doublon | ✅ | Quatre rechargements du tableau de bord (appel `push_subscribe` = 200) : toujours **1 ligne, 1 endpoint** |
| **AC5** Test RLS négatif | ✅ | Transaction annulée, compte A : `A_sees_total=1 \| A_sees_B=0 \| A_updates_B=0 \| A_deletes_B=0 \| A_inserts_for_B=refused 42501` |
| **AC6** Notification reçue, application fermée | ✅ ordinateur / ⏳ téléphone | Voir §3. **Confirmée visuellement par JOEL** : « Test E - application fermee » affichée à 01:59 (heure locale), boutons Voir / Ignorer, **aucun onglet 1sakely.org ouvert**. Téléphone : liste de contrôle §7 |
| **AC7** Abonnement révoqué → 404/410 → supprimé | ✅ | Abonnement mort réel (issu de la course, remplacé côté navigateur). 1ᵉʳ envoi : Google l'accepte encore. 2ᵉ envoi : refus → `{"abonnements":2,"envoyes":1,"supprimes":1}` → ligne supprimée |
| **AC8** `send-push` refuse un non-administrateur (serveur) | ✅ | Clé anon : `403 acces refuse`. Faux secret interne : `403`. Sans en-tête : `401`. Compte admin réel : `{"appelant":"admin","envoyes":1}`. Le rôle est lu dans `public.users` **par la fonction** (non modifiable par le compte depuis `876063a`) |
| **AC9** Clé privée VAPID absente du dépôt, des journaux, du bundle | ✅ | Paire générée **par la fonction serveur elle-même** au premier appel, rangée dans le coffre Supabase (Vault). Je ne l'ai jamais vue. Lecture réservée à `service_role` (`push_server_config`). Aucune occurrence de `vapid_private` / `push_server_config` / `push_internal_secret` dans `dist/`. Journal de la fonction : seulement « VAPID pair generated and stored in Vault » |
| **AC10** Refuser la permission ne casse rien | ✅ | Refus : `requestPermission` renvoie `denied`, aucun abonnement tenté, le bandeau passe en « Notifications désactivées » (inchangé). Échecs réels observés et absorbés **sans casser l'écran** : session expirée sur localhost, délai dépassé au démarrage en production → simple avertissement `⚠️ Abonnement push impossible (non bloquant)` |
| **AC11** Dérive `notificationPreferences` | ✅ | Voir §5 |
| **AC12** `tsc` + `build` | ✅ | Compteur **1978 → 1942** (même méthode `grep -c "error TS"`), **0 erreur** dans les fichiers touchés, `npm run build` OK aux trois versions |
| **AC13** `notify_users` : fonction serveur oui, compte ordinaire / anon non | ✅ | Appel serveur : `{"appelant":"interne","envoyes":1}`. Compte ordinaire : `42501 permission denied for function notify_users`. anon : `42501` |

---

## 3. Preuve de réception (AC6)

- **Appareil :** ordinateur de JOEL, Windows 11, Google Chrome, profil habituel (session admin 1sakely.org).
- **Capture d'écran :** l'accès à la capture d'écran Windows a été refusé. De plus, `getNotifications()` renvoyait 0 depuis un onglet affichant seulement une image (il liste bien les notifications depuis une page de l'application). J'ai donc ajouté au service worker un **journal de réception** : les 10 derniers titres, avec leur heure, dans le cache `bazarkely-push-receipts`.
- **Déroulé :** onglet de l'application fermé, un seul onglet ouvert affichant l'**image** `/icon-192x192.png` (pas l'application), envoi par `notify_users` depuis le serveur, puis lecture du journal :

```json
[
  { "receivedAt": "2026-09-25T22:45:52.169Z", "title": "BazarKELY - test Web Push" },
  { "receivedAt": "2026-09-25T22:42:58.577Z", "title": "BazarKELY" }
]
```

La 2ᵉ ligne est le diagnostic « sans contenu » : titre par défaut, ce qui prouve aussi qu'une charge **absente** est bien gérée. La 1ʳᵉ ligne est la vraie notification chiffrée, déchiffrée par Chrome. Tu as dû voir passer à l'écran, vers 01:45–01:50 (heure locale), des notifications « BazarKELY - test Web Push » et « BazarKELY - envoi admin ».

**Confirmation visuelle finale (2026-09-26, 01:59 heure locale) :** tous les onglets 1sakely.org fermés, envoi serveur `notify_users` → `{"appelant":"interne","abonnements":1,"envoyes":1,"supprimes":0,"echecs":0}` → JOEL voit « **Test E - application fermee** / Aucun onglet 1sakely.org ouvert » dans Windows, avec les boutons **Voir** et **Ignorer**.

Diagnostic intermédiaire (utile pour la suite) : pendant les essais, Chrome indiquait les notifications comme affichées (`getNotifications()` listait « Test D ») et l'écouteur `push` les notait bien dans son journal. Le journal de réception prouve la réception par le service worker ; seule la confirmation à l'écran prouve l'affichage.

**Capture sur téléphone : pas encore faite.** Elle fait partie de ta liste de contrôle (§7).

---

## 4. Choix techniques

- **Bibliothèque :** `npm:web-push@3.6.7`, l'implémentation de référence la plus utilisée, **uniquement** pour la partie VAPID (génération de la paire, en-tête `Authorization` signé). Son chiffrement du contenu passe par `node:crypto` et **ne produit pas un message déchiffrable sous Deno**. Constat du 2026-09-26 : Google répond 201, Chrome jette le message, alors qu'un envoi sans contenu arrive. Le contenu est donc chiffré par WebCrypto dans `send-push`, selon la norme **RFC 8291 (aes128gcm)**, environ 40 lignes.
- **Secrets :** coffre Supabase (Vault) plutôt que les secrets de la fonction. L'outil relié ne sait pas déposer un secret de fonction, et le coffre évite toute commande de ta part. La clé privée est **générée sur le serveur**, jamais transmise. Le secret interne est généré en SQL (`gen_random_bytes(32)`) et lu par `notify_users` et par `send-push`. **Aucune commande à exécuter de ton côté.**
- **Clé publique :** `VITE_VAPID_PUBLIC_KEY` (ajoutée à `env.example` et au `.env.production` local), avec la valeur écrite en repli dans `notificationService.ts`. Raison : `.env.production` n'est pas versionné et le build Cloudflare ne le voit pas. La clé est publique par nature, comme la clé anon déjà dans le code.
- **`notify_users`** : `pg_net` (disponible sur le plan gratuit, installé), appel à `send-push` avec l'en-tête `x-push-internal`. La clé anon publique sert seulement à passer la porte d'entrée de Supabase. Exécution retirée à `public`, `anon` et `authenticated`.
- **Écriture de l'abonnement :** fonction `push_subscribe()` (`security definer`), upsert sur `endpoint` pour `auth.uid()`. Si un autre compte se connecte sur le même navigateur, l'abonnement lui est transféré au lieu d'échouer sur une ligne invisible.
- **Liens :** `send-push` et le service worker n'acceptent que des liens **internes** (`/…`). Une notification ne peut jamais envoyer vers un autre site.

---

## 5. Dérive `notificationPreferences` — verdict

- La colonne **n'existait pas** en base (`public.users` : 13 colonnes, aucune de notifications).
- **Aucun code ne la lit ni ne l'écrit** : une seule occurrence dans le dépôt, la déclaration de type dans `types/index.ts`. Il n'y avait donc aucune synchronisation en échec aujourd'hui.
- Colonne ajoutée par précaution, sans risque : `alter table public.users add column if not exists notification_preferences jsonb;`. Elle servira en phase 2 pour respecter les préférences côté serveur.

---

## 6. `useNotifications` : capacités

| Capacité | État | Raison |
|---|---|---|
| `requestPermission` | ✅ réactivée | Demandée seulement sur action de l'utilisateur, puis abonnement push |
| Préférences (lecture / enregistrement) | ✅ réactivée | Réglages locaux (Dexie + localStorage) via le service |
| `sendNotification` (immédiate) | ✅ réactivée | Passe par les filtres du service : préférences, heures calmes, plafond de 5 par jour. Aucun appelant aujourd'hui |
| `scheduleNotification` | ⛔ laissée coupée | Une notification programmée est seulement stockée : rien ne la livre ensuite, elle serait perdue en silence |
| `checkBudgetAlerts` | ⛔ laissée coupée | Appelée à **chaque** ouverture du tableau de bord, sans anti-doublon : mêmes alertes à chaque visite. Et la comparaison de mois suppose un mois compté à partir de 0, non garanti pour les budgets stockés |
| `checkGoalReminders` | ⛔ laissée coupée | Même répétition à chaque ouverture du tableau de bord |
| `checkMadagascarNotifications`, `sendSyncNotification`, `sendSecurityAlert`, `sendMobileMoneyNotification` | ⛔ laissées coupées | Aucune implémentation dans le service |

La permission n'est **jamais** demandée au lancement. Si elle est déjà accordée, le bandeau réinscrit l'abonnement en silence, sans rien demander.

Non repris de l'ancien fichier orphelin : `message SHOW_NOTIFICATION`, `sync notification-sync` et `periodicsync recurring-transactions-check`. Ils n'avaient jamais fonctionné et ne sont pas demandés par cette phase.

---

## 7. Liste de contrôle pour JOEL (téléphone Android)

1. Sur le téléphone, ouvrir **1sakely.org** dans Chrome, appli installée sur l'écran d'accueil de préférence, et se connecter.
2. Tableau de bord → bandeau **« Activer les Notifications »** → **Autoriser**. Si le bandeau n'apparaît pas, la permission est déjà accordée : il suffit d'ouvrir le tableau de bord une fois.
3. **Fermer l'appli** (balayer depuis les applis récentes), puis **verrouiller l'écran**.
4. Me dire « téléphone prêt » : j'envoie une notification depuis le serveur.
5. Vérifier qu'elle apparaît sur l'écran verrouillé, la toucher : l'appli doit s'ouvrir sur le tableau de bord.
6. Faire une **capture d'écran** de la notification pour le rapport.

**iPhone :** les notifications ne marchent **que si l'appli est installée sur l'écran d'accueil** (Safari → Partager → « Sur l'écran d'accueil », iOS 16.4 minimum), jamais depuis un simple onglet Safari.

---

## 8. Mesures `tsc`

| Mesure | Méthode | Valeur |
|---|---|---|
| Avant | `npx tsc --noEmit -p tsconfig.app.json 2>&1 \| grep -c "error TS"` | **1978** |
| Après (3.83.0, 3.83.1, 3.83.2) | même méthode | **1942** |
| Erreurs dans les fichiers touchés | `grep` sur `notificationService`, `useNotifications`, `NotificationPermissionRequest`, `sw-custom` | **0** |

Les 36 erreurs en moins sont des erreurs anciennes des fichiers touchés, corrigées pour tenir la règle « zéro erreur dans les fichiers du chantier ». Détails : service worker typé souplement (la bibliothèque DOM ne décrit pas le service worker), tables Dexie typées avec les interfaces du service, imports inutilisés retirés, variables mortes supprimées.

---

## 9. Fichiers

- `supabase/migrations/20260926100000_web_push_phase_1.sql` : table, RLS, `push_subscribe`, coffre, `push_server_config`, `push_store_vapid`, `notify_users`, colonne `notification_preferences`
- `supabase/functions/send-push/index.ts` : fonction d'envoi (v3 déployée)
- `frontend/src/sw-custom.ts` : écouteurs rapatriés + journal de réception
- `frontend/src/services/notificationService.ts` : `ensurePushSubscription` (une seule demande à la fois, jamais bloquant)
- `frontend/src/components/NotificationPermissionRequest.tsx`, `frontend/src/hooks/useNotifications.ts`
- `frontend/vite.config.ts`, `frontend/vite.config.prod.ts`, `frontend/env.example`, version (`appVersion.ts`, `package.json`)
- `PROCEDURES-OUTILS.md` : P15 à P17 (en attente) + **P18** (tester un service worker en local ; port `[::1]:3000` pris par le canal de rechargement d'un autre serveur de dev)
- `public/sw-notifications.js` : supprimé (non suivi par git)

## 10. Points à noter

- Pour tester, j'ai arrêté les serveurs de dev d'autres sessions inactives (ports 3000, 3001, 3002). Le serveur de dev du port 3000 a été relancé à la fin.
- L'endpoint de test « mort » a été supprimé par `send-push` lui-même (AC7). La table contient 1 abonnement, celui de ton Chrome.
- Phase 2 : écran d'envoi admin, respect des préférences côté serveur (`notification_preferences`), désabonnement propre, journal des envois.
