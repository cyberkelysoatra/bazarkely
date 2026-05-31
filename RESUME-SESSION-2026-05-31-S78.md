# RESUME SESSION S78 — 2026-05-31

**Baseline départ :** v3.16.12 (validée S77)
**Baseline fin :** **v3.16.26** (déployée, validée en prod par JOEL pour l'essentiel)
**Thème :** Répertoire de contacts (création prêt) + refonte complète du modèle d'intérêts de prêt (journalier, temps réel) + saisie date/montant + unification du tiroir de détail.

---

## 1. Répertoire de contacts (v3.16.13 → 3.16.14)
- **Contact Picker API** (Chrome/Edge Android uniquement, HTTPS) : icône 📇 à côté du champ « Bénéficiaire/Prêteur » (création prêt, `AddTransactionPage`). Remplit nom + téléphone ; si plusieurs numéros → fenêtre de choix.
- Icône affichée **seulement si l'API est supportée** (`'contacts' in navigator && 'ContactsManager' in window`). Sur iPhone/desktop : rien, saisie clavier normale (autocomplete préservé).
- La **fenêtre de sélection est imposée par Chrome** (confidentialité) : impossible de la remplacer par l'appli Contacts native ni de la restyler. Affiche un compteur « 1 sélectionné » → ajout d'une **confirmation verte** in-app après validation + toast.
- Téléphone désormais **persisté** sur la fiche du prêt (avant : perdu après le lien WhatsApp). Prêt reçu : numéro du prêteur rangé dans `borrower_phone` (inutilisé sinon).

## 2. Nouveau moteur d'intérêts journaliers « en direct » (v3.16.15 → 3.16.17)
- **Modèle validé (S78)** : taux JOURNALIER ; intérêt simple qui s'accumule en continu (recalcul à la seconde) sur le capital restant, à partir de `loan.createdAt` ; remboursement « intérêts d'abord » puis capital ; capitalisation UNE FOIS à l'échéance (sans échéance → pas de capitalisation) ; tout recalculé à la volée depuis `amountInitial` + remboursements (aucune écriture).
- **Moteur pur** `services/loanInterest.ts` : `computeLoanLiveState` + `sumLoanLiveStates` (+ `dailyRatePct`, `allocations` par remboursement, `totalInterestPaid/CapitalPaid`). **Couvert par 10 tests.**
- **Conversion auto des anciens taux** selon `interestFrequency` : `monthly` ÷30, `weekly` ÷7, `daily` tel quel → anciens prêts corrects **sans migration SQL**.
- `computeLoanDetails` (loanService) branché sur le moteur : `remainingBalance = total dû`, statut « soldé » piloté, champs `live*` (liveCapital, liveAccruedInterest, liveTotalOwed, liveDailyRatePct, liveAllocations) sur `LoanWithDetails`.
- Carte Dashboard « Prêts actifs » : gains (prêts accordés) + coûts (prêts reçus) séparés, par minute/heure/jour/mois, tick 1s.
- Composant partagé `LoanLiveTrio` (Capital · Intérêts courus · Total dû), recalculé chaque seconde.
- Ancien système « intérêts dus » par périodes mensuelles **retiré** de l'UI (page Prêts + PaymentModal).

## 3. Saisie date d'échéance + montant d'intérêt (v3.16.18 → 3.16.24)
- Note texte « Taux: X% » retirée (trompeuse) ; « Durée » idem.
- **Échéance en DATE** (sélecteur) au lieu de mois ; durée équivalente affichée.
- **Intérêt en Ar ou %**, **par jour / sur la durée** (2 toggles) → converti en taux journalier. Défaut création : **Ar · sur la durée**. Équivalent « % / jour » affiché en direct.
- Briques partagées : `services/loanTerms.ts` (`computeDailyRatePct`, `daysBetweenDates`, `formatDurationLabel` — **10 tests**) + `components/Loans/LoanTermsFields.tsx` (UI commune création + modif).
- `loanService.updateLoanInterestRate` → **`updateLoanTerms(id, dailyRate, dueDate?)`** (taux + échéance). La modif du taux/échéance met enfin à jour la **vraie fiche** du prêt (avant : seulement une note).
- Jauge + **compte à rebours** « 12J, 3h22mn12s » avant échéance (`LoanDueCountdown`), couleur selon urgence.

## 4. Tiroir de détail UNIFIÉ (v3.16.26)
- Nouveau **`components/Loans/LoanDetailPanel.tsx`** : même contenu sur page Prêts (Famille) ET page Transactions (Montant + trio + jauge échéance + « À percevoir/À payer » + Notes + Infos Catégorie/Devise + Historique).
- Boutons d'action propres à chaque page. Transactions : panneau seulement pour prêts origine (loan/loan_received).
- ⚠️ Ligne « Partage famille » retirée du détail prêt côté Transactions (pour rendu identique) — à remettre si JOEL le demande.

## 5. Correctifs
- **v3.16.22** : rechargement intempestif de `/transactions` (effet dépendait de l'OBJET `user` → relance après refresh session → carte ouverte perdait sa position). Corrigé : dépendre de `user?.id`.
- **v3.16.25 (HOTFIX)** : crash page modif transaction (`setDurationMonths is not defined`, appel orphelin). **Révélé que `npm run build` ne typecheck PAS** → garde-fou = `npx tsc --noEmit`.

---

## PIÈGE MAJEUR DÉCOUVERT
**`npm run build` (vite/esbuild) ne fait AUCUN contrôle de types.** Une référence à une variable supprimée passe le build et **plante en prod**. → Toujours `npx tsc --noEmit` AVANT de committer/déployer. (Ajouté à CLAUDE.md + mémoire.)

---

## BACKLOG — nouvelles idées de JOEL (notées, à faire prochaine session)
Cadrage série 1 déjà fait (réponses `1A, 2C, 3B`) :

1. **Rappels d'échéance** — prévenir quand **50 % de la durée** écoulée, puis **3 jours avant** l'échéance.
   - Canal : **notifications du téléphone** (gratuit, via l'app) — `1A`. (Pas de vrai SMS/WhatsApp auto : nécessiterait serveur + fournisseur payant.)
   - Concerne : **prêts accordés ET emprunts** — `2C`.
   - À cadrer encore : déclencheur (à l'ouverture de l'app ? Edge Function cron Supabase ?), état des notifications (logs montrent « Budget alerts temporarily disabled » → système notif partiellement désactivé à réactiver).

2. **Place de marché de prêt** — l'emprunteur publie une demande (montant + conditions tenables : intérêt, échéance) ; les prêteurs intéressés sont prévenus et peuvent accepter le deal.
   - Visibilité : **tous les utilisateurs BazarKELY** — `3B`.
   - Gros module nouveau (entité demande, matching, notifications multi-utilisateurs, flux d'acceptation). À cadrer en profondeur (séries de questions).

---

## ÉTAT
- Rien en attente de correctif. Tous les points demandés cette session sont déployés et validés (sauf confirmation finale du point 1 / tiroir unifié à reconfirmer si besoin).
- Prochaine session : attaquer le backlog (commencer par les **rappels d'échéance**, plus simple) OU attendre la demande de JOEL.
