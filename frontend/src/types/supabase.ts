export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          email: string
          phone: string | null
          role: string
          preferences: Json
          created_at: string
          updated_at: string
          last_sync: string | null
        }
        Insert: {
          id?: string
          username: string
          email: string
          phone?: string | null
          role?: string
          preferences?: Json
          created_at?: string
          updated_at?: string
          last_sync?: string | null
        }
        Update: {
          id?: string
          username?: string
          email?: string
          phone?: string | null
          role?: string
          preferences?: Json
          created_at?: string
          updated_at?: string
          last_sync?: string | null
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          balance: number
          currency: string
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          balance?: number
          currency?: string
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          balance?: number
          currency?: string
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          amount: number
          type: string
          category: string
          description: string | null
          date: string
          target_account_id: string | null
          transfer_fee: number
          tags: Json
          location: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          amount: number
          type: string
          category: string
          description?: string | null
          date?: string
          target_account_id?: string | null
          transfer_fee?: number
          tags?: Json
          location?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          amount?: number
          type?: string
          category?: string
          description?: string | null
          date?: string
          target_account_id?: string | null
          transfer_fee?: number
          tags?: Json
          location?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          amount: number
          spent: number
          period: string
          year: number
          month: number
          alert_threshold: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category: string
          amount: number
          spent?: number
          period?: string
          year: number
          month: number
          alert_threshold?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string
          amount?: number
          spent?: number
          period?: string
          year?: number
          month?: number
          alert_threshold?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount: number
          current_amount: number
          target_date: string | null
          category: string | null
          description: string | null
          priority: string
          is_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          target_amount: number
          current_amount?: number
          target_date?: string | null
          category?: string | null
          description?: string | null
          priority?: string
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          category?: string | null
          description?: string | null
          priority?: string
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      mobile_money_rates: {
        Row: {
          id: string
          service: string
          min_amount: number
          max_amount: number | null
          fee: number
          fee_percentage: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service: string
          min_amount: number
          max_amount?: number | null
          fee: number
          fee_percentage?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service?: string
          min_amount?: number
          max_amount?: number | null
          fee?: number
          fee_percentage?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sync_queue: {
        Row: {
          id: string
          user_id: string
          operation: string
          table_name: string
          record_id: string
          data: Json
          status: string
          retry_count: number
          error_message: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          operation: string
          table_name: string
          record_id: string
          data: Json
          status?: string
          retry_count?: number
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          operation?: string
          table_name?: string
          record_id?: string
          data?: Json
          status?: string
          retry_count?: number
          error_message?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
      fee_configurations: {
        Row: {
          id: string
          account_type: string
          transaction_type: string
          fee_amount: number
          fee_percentage: number
          min_amount: number
          max_amount: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_type: string
          transaction_type: string
          fee_amount: number
          fee_percentage?: number
          min_amount?: number
          max_amount?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_type?: string
          transaction_type?: string
          fee_amount?: number
          fee_percentage?: number
          min_amount?: number
          max_amount?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_users_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          username: string
          email: string
          role: string
          created_at: string
          last_sync: string | null
        }[]
      }
      get_admin_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_users: number
          total_transactions: number
          total_accounts: number
          total_budgets: number
          total_goals: number
        }
      }
      delete_user_admin: {
        Args: {
          target_user_id: string
        }
        Returns: {
          success: boolean
          message?: string
          user_deleted?: string
          transactions_deleted?: number
          error?: string
          user_id?: string
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type aliases for easier use
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Account = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export type Budget = Database['public']['Tables']['budgets']['Row']
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update']

export type Goal = Database['public']['Tables']['goals']['Row']
export type GoalInsert = Database['public']['Tables']['goals']['Insert']
export type GoalUpdate = Database['public']['Tables']['goals']['Update']

export type MobileMoneyRate = Database['public']['Tables']['mobile_money_rates']['Row']
export type MobileMoneyRateInsert = Database['public']['Tables']['mobile_money_rates']['Insert']
export type MobileMoneyRateUpdate = Database['public']['Tables']['mobile_money_rates']['Update']

export type SyncQueue = Database['public']['Tables']['sync_queue']['Row']
export type SyncQueueInsert = Database['public']['Tables']['sync_queue']['Insert']
export type SyncQueueUpdate = Database['public']['Tables']['sync_queue']['Update']

export type FeeConfiguration = Database['public']['Tables']['fee_configurations']['Row']
export type FeeConfigurationInsert = Database['public']['Tables']['fee_configurations']['Insert']
export type FeeConfigurationUpdate = Database['public']['Tables']['fee_configurations']['Update']








