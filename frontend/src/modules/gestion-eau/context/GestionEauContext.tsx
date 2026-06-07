/**
 * Contexte du module gestion-eau : accès + rôles (admin / releveur / client, cumulables).
 * Modèle calqué sur ConstructionContext, mais offline-first (Dexie + getSession,
 * jamais getUser()). Applique le bootstrap « premier admin = propriétaire ».
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../../stores/appStore';
import authService from '../../../services/authService';
import { waitForEauSession } from '../services/eauAuth';
import { ensureRolesBootstrap, getRolesForUser } from '../services/eauRoleService';
import { refreshConfig } from '../services/eauConfigService';
import { pullAll, syncAll } from '../services/eauSync';
import { getPendingEnrollment, processPendingEnrollment } from '../services/eauEnrollmentService';
import { claimInvitationForCurrentUser } from '../services/eauInvitationService';
import type { EauRoles } from '../types/gestionEau';

/**
 * État de la session Supabase vis-à-vis du module eau (Phase 1 — fondation identité) :
 *  - 'checking'      : vérification en cours (boot/réseau) — afficher un spinner.
 *  - 'valid'         : session présente ET identité = utilisateur courant du shell.
 *  - 'needs-reauth'  : aucune session lisible alors qu'on est en ligne (ou jamais
 *                      établie hors-ligne) → proposer une reconnexion Google.
 *  - 'mismatch'      : la session Google appartient à un AUTRE compte que celui du
 *                      shell → refuser (ne jamais créer une 2ᵉ identité).
 */
export type EauSessionStatus = 'checking' | 'valid' | 'needs-reauth' | 'mismatch';

interface GestionEauContextType {
  userId: string | null;
  roles: EauRoles;
  /** Accès au module = au moins un rôle (admin OU releveur OU client). */
  hasEauAccess: boolean;
  isLoading: boolean;
  error: string | null;
  /** Fiabilité de la session Supabase pour ce module (cf. EauSessionStatus). */
  sessionStatus: EauSessionStatus;
  /**
   * `true` = les rôles ont été résolus de façon FIABLE (pull serveur OK, ou cache local
   * hors-ligne). `false` = état non résolu (démarrage à froid : pull lent/échoué/timeout).
   * La garde d'accès ne redirige vers /dashboard QUE sur un refus confirmé
   * (`rolesConfirmed && !hasEauAccess`), jamais sur un état non résolu.
   */
  rolesConfirmed: boolean;
  refreshRoles: () => Promise<void>;
  /** Relance complète de la résolution session+rôles (bouton « Réessayer »). */
  retryAccess: () => Promise<void>;
  /** Déclenche une reconnexion Google (même identité que le shell). */
  reauth: () => Promise<void>;
}

const EMPTY_ROLES: EauRoles = { admin: false, releveur: false, client: false };

/** Notifie l'utilisateur du résultat d'un enrôlement traité au retour de Google. */
function notifyEnrollment(res: Awaited<ReturnType<typeof processPendingEnrollment>>): void {
  switch (res.kind) {
    case 'code-ok':
      toast.success(
        `Accès activé ✅ ${res.compteurCount} compteur(s) associé(s) à votre compte.`,
        { duration: 5000 }
      );
      break;
    case 'code-invalide':
      toast.error('Code d’enrôlement invalide. Vérifiez auprès de l’administrateur.', { duration: 6000 });
      break;
    case 'code-deja-utilise':
      toast.error('Ce code est déjà rattaché à un autre compte.', { duration: 6000 });
      break;
    case 'demande-ok':
      toast.success('Demande d’accès envoyée. Un administrateur va la traiter.', { duration: 6000 });
      break;
    default:
      break;
  }
}

export const GestionEauContext = createContext<GestionEauContextType | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
}

export const GestionEauProvider: React.FC<ProviderProps> = ({ children }) => {
  const storeUser = useAppStore((s) => s.user);
  const isOnline = useAppStore((s) => s.isOnline);
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<EauRoles>(EMPTY_ROLES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<EauSessionStatus>('checking');
  // Fiabilité de la résolution des rôles (cf. RolesResolution.confirmed). false au boot :
  // tant que le pull serveur n'a pas répondu, on ne conclut pas « aucun accès ».
  const [rolesConfirmed, setRolesConfirmed] = useState(false);
  // Le spinner bloquant ne doit s'afficher qu'au TOUT PREMIER chargement.
  // Les rechargements suivants (bascule online/offline, fréquente sur réseau instable)
  // se font en arrière-plan SANS démonter les écrans → pas de flash ni de perte de saisie.
  const initialLoadDoneRef = useRef(false);

  const load = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setIsLoading(true);
    setError(null);
    try {
      const online = typeof navigator === 'undefined' ? true : navigator.onLine;

      // ── Étape B : garantir une session Supabase FIABLE = utilisateur courant du shell.
      // On attend la session (absorbe la course au boot ; lecture localStorage, pas de
      // réseau). On NE crée jamais une 2ᵉ identité et on NE déconnecte jamais.
      const session = await waitForEauSession(online ? 6 : 2);
      const storeId = useAppStore.getState().user?.id ?? null;
      const sessionUserId = session?.user?.id ?? null;

      let id: string | null;
      if (sessionUserId) {
        if (storeId && sessionUserId !== storeId) {
          // Compte Google différent du compte connecté au shell → refuser.
          setSessionStatus('mismatch');
          setUserId(storeId);
          setRoles(EMPTY_ROLES);
          if (showSpinner) setIsLoading(false);
          return;
        }
        id = sessionUserId; // identité fiable (uid == users.id du shell)
        setSessionStatus('valid');
      } else if (storeId && !online) {
        // Hors-ligne sans session lisible MAIS une session avait été établie sur
        // l'appareil (store rehydraté) → continuer en lecture locale (Dexie).
        id = storeId;
        setSessionStatus('valid');
      } else {
        // En ligne sans session lisible (ou jamais établie hors-ligne) → ré-auth Google.
        setSessionStatus('needs-reauth');
        setUserId(storeId);
        setRoles(EMPTY_ROLES);
        if (showSpinner) setIsLoading(false);
        return;
      }

      setUserId(id);

      // Enrôlement en attente (retour de connexion Google) : lier un code ou créer
      // une demande d'accès, AVANT de lire les rôles (pour refléter le rôle client).
      if (getPendingEnrollment()) {
        try {
          const email = useAppStore.getState().user?.email ?? null;
          const res = await processPendingEnrollment(id, email);
          notifyEnrollment(res);
        } catch {
          /* best-effort */
        }
      }

      // Octroi automatique « invitation par email » (Phase 1) : si une invitation
      // `en_attente` cible l'adresse Google de ce compte, la RPC attribue les rôles
      // (et crée/active le compte client + compteurs). EN LIGNE uniquement et AVANT la
      // lecture des rôles, pour que `ensureRolesBootstrap` reflète le rôle fraîchement
      // accordé. Best-effort : un échec réseau ne casse pas le chargement.
      if (online) {
        await claimInvitationForCurrentUser(online).catch(() => null);
      }

      // Rafraîchit config + données de base en arrière-plan (best-effort).
      void refreshConfig(online).catch(() => {});
      void pullAll().catch(() => {});

      // Bootstrap propriétaire + lecture des rôles effectifs (avec retry du pull à froid).
      const { roles: effective, confirmed } = await ensureRolesBootstrap(id, online);
      setRoles(effective);
      setRolesConfirmed(confirmed);
    } catch (e: any) {
      console.error('❌ [GestionEau] Erreur chargement contexte:', e);
      setError(e?.message ?? 'Erreur de chargement du module Gestion Eau');
      setRoles(EMPTY_ROLES);
      // Erreur = état NON résolu : la garde affichera un écran d'attente, pas un rebond.
      setRolesConfirmed(false);
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Spinner uniquement au premier chargement ; rechargements (réseau/login) en arrière-plan.
    const showSpinner = !initialLoadDoneRef.current;
    initialLoadDoneRef.current = true;
    load(showSpinner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeUser?.id, isOnline]);

  // Déclencheur de SYNC au retour en ligne : vide la file `_dirty` (relevés, compteurs,
  // QR, scans… créés hors-ligne) puis tire les nouveautés serveur. Idempotent (upsert id
  // client) → aucun doublon même si un envoi hors-ligne avait déjà été commité. Best-effort.
  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    const cameOnline = !wasOnlineRef.current && isOnline;
    wasOnlineRef.current = isOnline;
    if (cameOnline) {
      void syncAll().catch(() => {});
    }
  }, [isOnline]);

  const refreshRoles = useCallback(async () => {
    if (!userId) return;
    const effective = await getRolesForUser(userId);
    setRoles(effective);
  }, [userId]);

  // Relance complète (session + bootstrap + pull rôles) avec spinner. Utilisé par
  // l'écran d'attente lorsque la résolution à froid a échoué (« Réessayer »).
  const retryAccess = useCallback(async () => {
    await load(true);
  }, [load]);

  // Reconnexion Google depuis le module (même identité que le shell). La redirection
  // OAuth est gérée par authService/AuthPage ; au retour, le statut repassera à 'valid'.
  const reauth = useCallback(async () => {
    try {
      await authService.signInWithGoogle();
    } catch (e: any) {
      console.error('❌ [GestionEau] Échec reconnexion Google:', e);
      toast.error('Reconnexion impossible pour le moment. Réessayez.', { duration: 5000 });
    }
  }, []);

  const hasEauAccess = roles.admin || roles.releveur || roles.client;

  return (
    <GestionEauContext.Provider
      value={{ userId, roles, hasEauAccess, isLoading, error, sessionStatus, rolesConfirmed, refreshRoles, retryAccess, reauth }}
    >
      {children}
    </GestionEauContext.Provider>
  );
};

export const useGestionEau = (): GestionEauContextType => {
  const ctx = useContext(GestionEauContext);
  if (ctx === undefined) {
    throw new Error('useGestionEau doit être utilisé à l\'intérieur d\'un GestionEauProvider');
  }
  return ctx;
};
