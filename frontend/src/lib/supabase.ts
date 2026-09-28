import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'
import { isAuthSessionKey, pickNewerSession } from '../modules/navy-ay/utils/backgroundRules'

// Supabase configuration
export const supabaseUrl = 'https://ofzmwrzatcztoekrpvkj.supabase.co'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mem13cnphdGN6dG9la3JwdmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjAxMTUsImV4cCI6MjA3NDczNjExNX0.hYDpbvzwNZWmDgXPSGEgoKLR-m51TQZmaWw1whQ90Cw'

// Timeout helper: reject a promise after N ms
export function withTimeout<T>(promise: Promise<T>, ms = 8000, label = 'Supabase'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    )
  ]);
}

/**
 * NAVY ay Android app (phase 3B) ONLY: one Supabase session shared with the app's native
 * services. The location service keeps sending with the screen off for hours, so it may
 * refresh the session itself; the page then reads the newer copy from the app instead of
 * replaying an already used refresh token (Supabase would revoke the whole session).
 * Every session the page writes is handed to the app. On the web (and in app 1.0.0,
 * without the NavyNative bridge) this returns undefined: the default storage is kept.
 */
function navyAppSessionStorage() {
  if (typeof window === 'undefined') return undefined
  const cap = (window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean
      PluginHeaders?: { name: string }[]
      nativePromise?: (plugin: string, method: string, options?: Record<string, unknown>) => Promise<any>
    }
  }).Capacitor
  // PluginHeaders: plugins declared by the app itself (injected before the page runs).
  if (!cap?.isNativePlatform?.() || !cap.PluginHeaders?.some((h) => h.name === 'NavyNative') || typeof cap.nativePromise !== 'function') {
    return undefined
  }
  const call = (method: string, options: Record<string, unknown> = {}) =>
    withTimeout(cap.nativePromise!('NavyNative', method, options), 1500, `navy-native-${method}`)
  const hand = (session: string) => {
    void call('setSession', { session, url: supabaseUrl, anonKey: supabaseAnonKey }).catch(() => undefined)
  }
  return {
    async getItem(key: string): Promise<string | null> {
      const local = localStorage.getItem(key)
      if (!isAuthSessionKey(key)) return local
      try {
        const { session } = (await call('getSession')) as { session?: string | null }
        if (pickNewerSession(local, session ?? null) === 'native' && session) {
          localStorage.setItem(key, session)
          return session
        }
        // The app does not hold this session yet (first start, older copy): hand it over.
        if (local && session !== local) hand(local)
      } catch {
        // bridge busy: the page's copy
      }
      return local
    },
    setItem(key: string, value: string) {
      localStorage.setItem(key, value)
      if (isAuthSessionKey(key)) hand(value)
    },
    removeItem(key: string) {
      localStorage.removeItem(key)
      if (isAuthSessionKey(key)) void call('clearSession').catch(() => undefined)
    },
  }
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,  // captureOAuthTokens() in main.tsx handles URL tokens manually
    storage: navyAppSessionStorage()
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




























