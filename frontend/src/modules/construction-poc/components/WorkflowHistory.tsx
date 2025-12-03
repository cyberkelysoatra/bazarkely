/**
 * Composant d'affichage de l'historique complet du workflow
 * Affiche toutes les transitions avec détails (date, statut, action, utilisateur, commentaires)
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  X,
  Check,
  User,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type {
  WorkflowHistory,
  PurchaseOrderStatus,
  WorkflowAction
} from '../types/construction';

interface WorkflowHistoryProps {
  purchaseOrderId: string;
}

interface HistoryRowData extends WorkflowHistory {
  userName?: string;
  userEmail?: string;
}

/**
 * Mapping des statuts vers les couleurs (même que AGENT 5)
 */
const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  draft: 'bg-gray-200 text-gray-800',
  pending_site_manager: 'bg-yellow-200 text-yellow-800',
  approved_site_manager: 'bg-green-200 text-green-800',
  checking_stock: 'bg-blue-200 text-blue-800',
  fulfilled_internal: 'bg-green-200 text-green-800',
  needs_external_order: 'bg-orange-200 text-orange-800',
  pending_management: 'bg-yellow-200 text-yellow-800',
  rejected_management: 'bg-red-200 text-red-800',
  approved_management: 'bg-green-200 text-green-800',
  submitted_to_supplier: 'bg-blue-200 text-blue-800',
  pending_supplier: 'bg-yellow-200 text-yellow-800',
  accepted_supplier: 'bg-green-200 text-green-800',
  rejected_supplier: 'bg-red-200 text-red-800',
  in_transit: 'bg-blue-200 text-blue-800',
  delivered: 'bg-green-200 text-green-800',
  completed: 'bg-green-600 text-white',
  cancelled: 'bg-red-200 text-red-800'
};

/**
 * Labels des statuts en français
 */
const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: 'Brouillon',
  pending_site_manager: 'En attente Chef Chantier',
  approved_site_manager: 'Approuvé Chef Chantier',
  checking_stock: 'Vérification Stock',
  fulfilled_internal: 'Satisfait Interne',
  needs_external_order: 'Commande Externe Requise',
  pending_management: 'En attente Direction',
  rejected_management: 'Rejeté Direction',
  approved_management: 'Approuvé Direction',
  submitted_to_supplier: 'Soumis Fournisseur',
  pending_supplier: 'En attente Fournisseur',
  accepted_supplier: 'Accepté Fournisseur',
  rejected_supplier: 'Rejeté Fournisseur',
  in_transit: 'En Transit',
  delivered: 'Livré',
  completed: 'Terminé',
  cancelled: 'Annulé'
};

/**
 * Labels des actions en français
 */
const ACTION_LABELS: Record<WorkflowAction, string> = {
  submit: 'Soumettre',
  approve_site: 'Approuver',
  reject_site: 'Rejeter',
  approve_mgmt: 'Approuver Achat',
  reject_mgmt: 'Rejeter Achat',
  accept_supplier: 'Accepter',
  reject_supplier: 'Refuser',
  deliver: 'Marquer Livré',
  complete: 'Finaliser',
  cancel: 'Annuler'
};

/**
 * Obtient l'icône pour une action
 */
const getActionIcon = (action: WorkflowAction): React.ReactNode => {
  if (action === 'cancel') {
    return <X className="w-4 h-4" />;
  }
  if (['approve_site', 'approve_mgmt', 'accept_supplier', 'complete'].includes(action)) {
    return <Check className="w-4 h-4" />;
  }
  return <ArrowRight className="w-4 h-4" />;
};

/**
 * Génère les initiales d'un utilisateur
 */
const getUserInitials = (name?: string, email?: string): string => {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return '??';
};

/**
 * Génère une couleur basée sur le nom/email de l'utilisateur
 */
const getUserColor = (name?: string, email?: string): string => {
  const text = name || email || 'default';
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-teal-500'
  ];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Formate un timestamp en format français
 */
const formatTimestamp = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

/**
 * Composant pour une ligne d'historique
 */
const HistoryRow: React.FC<{ entry: HistoryRowData }> = ({ entry }) => {
  const userInitials = getUserInitials(entry.userName, entry.userEmail);
  const userColor = getUserColor(entry.userName, entry.userEmail);
  const displayName = entry.userName || entry.userEmail || entry.changedBy;

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-900">
        {formatTimestamp(entry.changedAt)}
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[entry.toStatus]}`}
        >
          {STATUS_LABELS[entry.toStatus]}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          {getActionIcon(entry.action)}
          <span>{ACTION_LABELS[entry.action]}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full ${userColor} text-white flex items-center justify-center text-xs font-semibold`}
          >
            {userInitials}
          </div>
          <span className="text-sm text-gray-700">{displayName}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {entry.notes ? (
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 mt-0.5 text-gray-400" />
            <span>{entry.notes}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
    </tr>
  );
};

const WorkflowHistory: React.FC<WorkflowHistoryProps> = ({ purchaseOrderId }) => {
  const [history, setHistory] = useState<HistoryRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [purchaseOrderId]);

  /**
   * Charge l'historique depuis Supabase
   */
  const loadHistory = async () => {
    if (!purchaseOrderId) {
      setError('ID de bon de commande manquant');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Récupérer l'historique du workflow
      const { data: historyData, error: historyError } = await supabase
        .from('poc_purchase_order_workflow_history')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId)
        .order('changed_at', { ascending: false });

      if (historyError) {
        throw historyError;
      }

      if (!historyData || historyData.length === 0) {
        setHistory([]);
        setLoading(false);
        return;
      }

      // Récupérer les informations utilisateur pour chaque entrée
      const userIds = [...new Set(historyData.map((h: any) => h.changed_by))];
      const userMap = new Map<string, { name?: string; email?: string }>();

      // Essayer de récupérer les noms d'utilisateurs depuis auth.users
      // Note: Cette requête peut nécessiter des permissions spéciales
      for (const userId of userIds) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', userId)
            .single();

          if (userData) {
            userMap.set(userId, {
              name: userData.name,
              email: userData.email
            });
          }
        } catch (err) {
          // Si la table users n'existe pas ou n'est pas accessible,
          // on essaie avec auth.users via RPC ou on utilise juste l'ID
          console.warn(`Impossible de récupérer les infos utilisateur pour ${userId}`);
        }
      }

      // Mapper les données avec les informations utilisateur
      const mappedHistory: HistoryRowData[] = historyData.map((entry: any) => {
        const userInfo = userMap.get(entry.changed_by) || {};
        return {
          id: entry.id,
          purchaseOrderId: entry.purchase_order_id,
          fromStatus: entry.from_status as PurchaseOrderStatus,
          toStatus: entry.to_status as PurchaseOrderStatus,
          changedBy: entry.changed_by,
          changedAt: new Date(entry.changed_at),
          notes: entry.notes || undefined,
          action: entry.action as WorkflowAction,
          userName: userInfo.name,
          userEmail: userInfo.email
        };
      });

      setHistory(mappedHistory);
    } catch (err: any) {
      console.error('Erreur lors du chargement de l\'historique:', err);
      setError(err.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="text-red-600 text-sm">
          Erreur : {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header avec bouton collapse/expand */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Historique Workflow
          </h2>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label={isExpanded ? 'Réduire' : 'Développer'}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {history.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <p>Aucun historique disponible</p>
            </div>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Date & Heure
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Commentaires
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((entry) => (
                      <HistoryRow key={entry.id} entry={entry} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Cards */}
              <div className="md:hidden divide-y divide-gray-200">
                {history.map((entry) => {
                  const userInitials = getUserInitials(entry.userName, entry.userEmail);
                  const userColor = getUserColor(entry.userName, entry.userEmail);
                  const displayName = entry.userName || entry.userEmail || entry.changedBy;

                  return (
                    <div key={entry.id} className="p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-10 h-10 rounded-full ${userColor} text-white flex items-center justify-center text-sm font-semibold`}
                          >
                            {userInitials}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {displayName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatTimestamp(entry.changedAt)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[entry.toStatus]}`}
                        >
                          {STATUS_LABELS[entry.toStatus]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        {getActionIcon(entry.action)}
                        <span className="text-sm text-gray-700">
                          {ACTION_LABELS[entry.action]}
                        </span>
                      </div>
                      {entry.notes && (
                        <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 mt-0.5 text-gray-400" />
                            <p className="text-sm text-gray-600">{entry.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default WorkflowHistory;

