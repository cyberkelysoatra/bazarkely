/**
 * Contexte du module gestion-eau : accès + rôles (admin / releveur / client, cumulables).
 * Modèle calqué sur ConstructionContext, mais offline-first (Dexie + getSession,
 * jamais getUser()). Applique le bootstrap « premier admin = propriétaire ».
 */
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../../stores/appStore';
import { getCurrentUserIdSafe } from '../services/eauAuth';
import { ensureRolesBootstrap, getRolesForUser } from '../services/eauRoleService';
import { refreshConfig } from '../services/eauConfigService';
import { pullAll } from '../services/eauSync';
import { getPendingEnrollment, processPendingEnrollment } from '../services/eauEnrollmentService';
import type { EauRoles } from '../types/gestionEau';

interface GestionEauContextType {
  userId: string | null;
  roles: EauRoles;
  /** Accès au module = au moins un rôle (admin OU releveur OU client). */
  hasEauAccess: boolean;
  isLoading: boolean;
  error: string | null;
  refreshRoles: () => Promise<void>;
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

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const id = await getCurrentUserIdSafe();
      if (!id) {
        // Pas d'utilisateur : pas d'accès, mais NE PAS planter (offline-first).
        setUserId(null);
        setRoles(EMPTY_ROLES);
        setIsLoading(false);
        return;
      }
      setUserId(id);

      const online = typeof navigator === 'undefined' ? true : navigator.onLine;

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

      // Rafraîchit config + données de base en arrière-plan (best-effort).
      void refreshConfig(online).catch(() => {});
      void pullAll().catch(() => {});

      // Bootstrap propriétaire + lecture des rôles effectifs.
      const effective = await ensureRolesBootstrap(id, online);
      setRoles(effective);
    } catch (e: any) {
      console.error('❌ [GestionEau] Erreur chargement contexte:', e);
      setError(e?.message ?? 'Erreur de chargement du module Gestion Eau');
      setRoles(EMPTY_ROLES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Recharge si l'utilisateur connecté change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeUser?.id, isOnline]);

  const refreshRoles = useCallback(async () => {
    if (!userId) return;
    const effective = await getRolesForUser(userId);
    setRoles(effective);
  }, [userId]);

  const hasEauAccess = roles.admin || roles.releveur || roles.client;

  return (
    <GestionEauContext.Provider
      value={{ userId, roles, hasEauAccess, isLoading, error, refreshRoles }}
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
