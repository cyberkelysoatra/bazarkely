import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

// Supabase configuration
const supabaseUrl = 'https://ofzmwrzatcztoekrpvkj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mem13cnphdGN6dG9la3JwdmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjAxMTUsImV4cCI6MjA3NDczNjExNX0.hYDpbvzwNZWmDgXPSGEgoKLR-m51TQZmaWw1whQ90Cw'

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Helper function to get current session
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

// Database helper functions
export const db = {
  // Users
  users: () => supabase.from('users'),
  
  // Accounts
  accounts: () => supabase.from('accounts'),
  
  // Transactions
  transactions: () => supabase.from('transactions'),
  
  // Budgets
  budgets: () => supabase.from('budgets'),
  
  // Goals
  goals: () => supabase.from('goals'),
  
  // Mobile Money Rates
  mobileMoneyRates: () => supabase.from('mobile_money_rates'),
  
  // Sync Queue
  syncQueue: () => supabase.from('sync_queue'),
  
  // Fee Configurations
  feeConfigurations: () => supabase.from('fee_configurations')
}

// Error handling helper
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error)
  
  if (error?.message) {
    return error.message
  }
  
  if (error?.error_description) {
    return error.error_description
  }
  
  return 'Une erreur inattendue s\'est produite'
}

// Type exports
export type { Database } from '../types/supabase'













