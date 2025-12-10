/**
 * Types pour la fonctionnalité "Espace Famille"
 * Permet aux membres de famille de partager des transactions, 
 * demander des remboursements et suivre les soldes
 */

// ============================================================================
// TYPES DE BASE (Unions/Enums)
// ============================================================================

/**
 * Rôle d'un membre dans un groupe familial
 */
export type FamilyRole = 'admin' | 'member';

/**
 * Mode de partage des transactions
 */
export type SharingMode = 'selective' | 'share_all';

/**
 * Type de répartition des coûts
 */
export type SplitType = 'paid_by_one' | 'split_equal' | 'split_custom';

/**
 * Statut d'une demande de remboursement
 */
export type ReimbursementStatus = 
  | 'pending' 
  | 'accepted' 
  | 'declined' 
  | 'settled' 
  | 'cancelled';

/**
 * Méthode de règlement d'un solde
 */
export type SettlementMethod = 'transfer' | 'cash' | 'other';

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

/**
 * Paramètres d'un groupe familial (stockés en JSONB)
 */
export interface FamilyGroupSettings {
  sharingMode: SharingMode;
  allowMemberInvites: boolean;
  requireApprovalForExpenses: boolean;
  defaultSplitType: SplitType;
  currency: 'MGA' | 'EUR';
  monthlyBudgetLimit?: number;
  notificationsEnabled: boolean;
}

/**
 * Groupe familial
 */
export interface FamilyGroup {
  id: string;
  name: string;
  description?: string;
  createdBy: string; // userId du créateur
  settings: FamilyGroupSettings;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Membre d'un groupe familial
 */
export interface FamilyMember {
  id: string;
  familyGroupId: string;
  userId: string | null; // null si membre invité (pas encore inscrit)
  email?: string; // Pour les invitations
  phone?: string; // Pour les invitations
  displayName: string;
  role: FamilyRole;
  isActive: boolean;
  joinedAt: Date;
  invitedBy?: string; // userId de l'inviteur
  // Relation optionnelle avec User (chargée séparément)
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

/**
 * Transaction partagée dans un groupe familial
 */
export interface FamilySharedTransaction {
  id: string;
  familyGroupId: string;
  transactionId: string | null; // null si transaction virtuelle (non créée dans le compte)
  sharedBy: string; // userId
  description: string;
  amount: number;
  category: string;
  date: Date;
  splitType: SplitType;
  paidBy: string; // userId de la personne qui a payé
  splitDetails: SplitDetail[]; // Détails de la répartition
  isSettled: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Relation optionnelle avec Transaction (chargée séparément)
  transaction?: {
    id: string;
    accountId: string;
    type: 'income' | 'expense' | 'transfer';
  };
}

/**
 * Détail de répartition d'une transaction partagée
 */
export interface SplitDetail {
  memberId: string; // FamilyMember.id
  userId: string; // userId (pour référence rapide)
  amount: number; // Montant attribué à ce membre
  percentage?: number; // Pourcentage si split_custom
  isPaid: boolean; // Si ce membre a déjà payé sa part
}

/**
 * Règle de partage automatique
 */
export interface FamilySharingRule {
  id: string;
  familyGroupId: string;
  createdBy: string; // userId
  name: string;
  description?: string;
  category?: string; // Catégorie de transaction à partager automatiquement
  accountId?: string; // Compte source pour le partage automatique
  splitType: SplitType;
  defaultSplitDetails?: SplitDetail[]; // Répartition par défaut
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Demande de remboursement
 */
export interface ReimbursementRequest {
  id: string;
  familyGroupId: string;
  requestedBy: string; // userId du demandeur
  requestedFrom: string; // userId de la personne qui doit rembourser
  familySharedTransactionId: string; // Transaction partagée liée
  amount: number;
  description: string;
  status: ReimbursementStatus;
  statusChangedAt: Date;
  statusChangedBy?: string; // userId qui a changé le statut
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Relation optionnelle avec FamilySharedTransaction
  sharedTransaction?: FamilySharedTransaction;
}

/**
 * Solde entre deux membres d'un groupe familial
 */
export interface FamilyBalance {
  id: string;
  familyGroupId: string;
  memberA: string; // userId
  memberB: string; // userId
  balance: number; // Montant que memberA doit à memberB (négatif = memberB doit à memberA)
  lastTransactionDate?: Date; // Date de la dernière transaction affectant ce solde
  isSettled: boolean;
  settlementDate?: Date;
  settlementMethod?: SettlementMethod;
  settlementNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// TYPES D'AGRÉGATION (Pour statistiques et tableaux de bord)
// ============================================================================

/**
 * Contribution d'un membre pour les statistiques
 */
export interface MemberContribution {
  memberId: string;
  userId: string;
  displayName: string;
  totalPaid: number; // Total payé par ce membre
  totalOwed: number; // Total dû par ce membre
  totalReceived: number; // Total reçu par ce membre
  netBalance: number; // Solde net (positif = on lui doit, négatif = il doit)
  transactionCount: number;
  lastActivityDate?: Date;
}

/**
 * Statistiques consolidées du tableau de bord familial
 */
export interface FamilyDashboardStats {
  familyGroupId: string;
  totalSharedTransactions: number;
  totalAmount: number;
  totalPendingReimbursements: number;
  totalPendingAmount: number;
  memberContributions: MemberContribution[];
  recentTransactions: FamilySharedTransaction[];
  pendingRequests: ReimbursementRequest[];
  balances: FamilyBalance[];
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Résumé des soldes pour un membre
 */
export interface BalanceSummary {
  memberId: string;
  userId: string;
  displayName: string;
  totalOwed: number; // Total dû par ce membre
  totalOwedTo: number; // Total dû à ce membre
  netBalance: number; // Solde net
  balances: Array<{
    otherMemberId: string;
    otherMemberName: string;
    balance: number; // Montant dû (positif = on lui doit, négatif = il nous doit)
    isSettled: boolean;
  }>;
}

// ============================================================================
// TYPES D'INPUT (Pour formulaires et API)
// ============================================================================

/**
 * Données pour créer un groupe familial
 */
export interface CreateFamilyGroupInput {
  name: string;
  description?: string;
  settings?: Partial<FamilyGroupSettings>;
}

/**
 * Données pour rejoindre un groupe familial
 */
export interface JoinFamilyGroupInput {
  familyGroupId: string;
  invitationCode?: string; // Code d'invitation si requis
}

/**
 * Données pour partager une transaction
 */
export interface ShareTransactionInput {
  familyGroupId: string;
  transactionId?: string; // Optionnel si transaction virtuelle
  description: string;
  amount: number;
  category: string;
  date: Date;
  splitType: SplitType;
  paidBy: string; // userId
  splitDetails: SplitDetail[];
  notes?: string;
}

/**
 * Données pour créer une demande de remboursement
 */
export interface CreateReimbursementRequestInput {
  familyGroupId: string;
  requestedFrom: string; // userId
  familySharedTransactionId: string;
  amount: number;
  description: string;
  notes?: string;
}

/**
 * Données pour mettre à jour une demande de remboursement
 */
export interface UpdateReimbursementRequestInput {
  status?: ReimbursementStatus;
  notes?: string;
}

/**
 * Données pour régler un solde
 */
export interface SettleBalanceInput {
  familyBalanceId: string;
  settlementMethod: SettlementMethod;
  settlementNotes?: string;
}

/**
 * Données pour mettre à jour un membre
 */
export interface UpdateMemberInput {
  displayName?: string;
  role?: FamilyRole;
  isActive?: boolean;
}

// ============================================================================
// TYPES SUPABASE (snake_case pour la base de données)
// ============================================================================

/**
 * Ligne de la table family_groups (format Supabase)
 */
export interface FamilyGroupRow {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  settings: FamilyGroupSettings; // JSONB
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

/**
 * Ligne de la table family_members (format Supabase)
 */
export interface FamilyMemberRow {
  id: string;
  family_group_id: string;
  user_id: string | null;
  email: string | null;
  phone: string | null;
  display_name: string;
  role: FamilyRole;
  is_active: boolean;
  joined_at: string; // ISO date string
  invited_by: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

/**
 * Ligne de la table family_shared_transactions (format Supabase)
 */
export interface FamilySharedTransactionRow {
  id: string;
  family_group_id: string;
  transaction_id: string | null;
  shared_by: string;
  description: string;
  amount: number;
  category: string;
  date: string; // ISO date string
  split_type: SplitType;
  paid_by: string;
  split_details: SplitDetail[]; // JSONB
  is_settled: boolean;
  notes: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

/**
 * Ligne de la table family_sharing_rules (format Supabase)
 */
export interface FamilySharingRuleRow {
  id: string;
  family_group_id: string;
  created_by: string;
  name: string;
  description: string | null;
  category: string | null;
  account_id: string | null;
  split_type: SplitType;
  default_split_details: SplitDetail[] | null; // JSONB
  is_active: boolean;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

/**
 * Ligne de la table reimbursement_requests (format Supabase)
 */
export interface ReimbursementRequestRow {
  id: string;
  family_group_id: string;
  requested_by: string;
  requested_from: string;
  family_shared_transaction_id: string;
  amount: number;
  description: string;
  status: ReimbursementStatus;
  status_changed_at: string; // ISO date string
  status_changed_by: string | null;
  notes: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

/**
 * Ligne de la table family_balances (format Supabase)
 */
export interface FamilyBalanceRow {
  id: string;
  family_group_id: string;
  member_a: string;
  member_b: string;
  balance: number;
  last_transaction_date: string | null; // ISO date string
  is_settled: boolean;
  settlement_date: string | null; // ISO date string
  settlement_method: SettlementMethod | null;
  settlement_notes: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

/**
 * Ligne de la table reimbursement_requests (format Supabase)
 * Nouvelle structure de table créée dans Supabase (2025-01-19)
 * Note: Structure différente de l'ancien ReimbursementRequestRow (ligne 396)
 */
export interface ReimbursementRequest {
  id: string;
  shared_transaction_id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'settled' | 'cancelled';
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  settled_at: string | null; // ISO date string
  settled_by: string | null;
  note: string | null;
}

/**
 * Ligne de la vue family_member_balances (format Supabase)
 * Vue calculant les soldes des membres d'un groupe familial
 */
export interface FamilyMemberBalance {
  family_group_id: string;
  member_id: string;
  user_id: string | null;
  display_name: string;
  total_paid: number;
  total_owed: number;
  pending_to_receive: number;
  pending_to_pay: number;
  net_balance: number;
}

// ============================================================================
// TYPES UTILITAIRES
// ============================================================================

/**
 * Type pour créer un membre (Omit des champs auto-générés)
 */
export type FamilyMemberCreate = Omit<
  FamilyMember,
  'id' | 'joinedAt' | 'user'
>;

/**
 * Type pour mettre à jour un membre
 */
export type FamilyMemberUpdate = Partial<
  Omit<FamilyMember, 'id' | 'familyGroupId' | 'joinedAt' | 'user'>
> & {
  id: string;
};

/**
 * Type pour créer un groupe familial (Omit des champs auto-générés)
 */
export type FamilyGroupCreate = Omit<
  FamilyGroup,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * Type pour mettre à jour un groupe familial
 */
export type FamilyGroupUpdate = Partial<
  Omit<FamilyGroup, 'id' | 'createdBy' | 'createdAt'>
> & {
  id: string;
};

/**
 * Type pour créer une transaction partagée (Omit des champs auto-générés)
 */
export type FamilySharedTransactionCreate = Omit<
  FamilySharedTransaction,
  'id' | 'createdAt' | 'updatedAt' | 'transaction'
>;

/**
 * Type pour mettre à jour une transaction partagée
 */
export type FamilySharedTransactionUpdate = Partial<
  Omit<FamilySharedTransaction, 'id' | 'familyGroupId' | 'createdAt' | 'transaction'>
> & {
  id: string;
};

/**
 * Type pour créer une règle de partage (Omit des champs auto-générés)
 */
export type FamilySharingRuleCreate = Omit<
  FamilySharingRule,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * Type pour mettre à jour une règle de partage
 */
export type FamilySharingRuleUpdate = Partial<
  Omit<FamilySharingRule, 'id' | 'familyGroupId' | 'createdBy' | 'createdAt'>
> & {
  id: string;
};

/**
 * Type pour créer une demande de remboursement (Omit des champs auto-générés)
 */
export type ReimbursementRequestCreate = Omit<
  ReimbursementRequest,
  'id' | 'status' | 'statusChangedAt' | 'createdAt' | 'updatedAt' | 'sharedTransaction'
>;

/**
 * Type pour mettre à jour une demande de remboursement
 */
export type ReimbursementRequestUpdate = Partial<
  Omit<ReimbursementRequest, 'id' | 'familyGroupId' | 'requestedBy' | 'requestedFrom' | 'createdAt' | 'sharedTransaction'>
> & {
  id: string;
};

/**
 * Type pour créer un solde (Omit des champs auto-générés)
 */
export type FamilyBalanceCreate = Omit<
  FamilyBalance,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * Type pour mettre à jour un solde
 */
export type FamilyBalanceUpdate = Partial<
  Omit<FamilyBalance, 'id' | 'familyGroupId' | 'memberA' | 'memberB' | 'createdAt'>
> & {
  id: string;
};



