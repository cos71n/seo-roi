import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service role client for admin operations
export const createServiceRoleClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Database Types (will be updated as we build the schema)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          phone: string | null
          domain: string
          company_name: string | null
          industry: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name?: string | null
          phone?: string | null
          domain: string
          company_name?: string | null
          industry?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          phone?: string | null
          domain?: string
          company_name?: string | null
          industry?: string | null
          created_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          user_id: string
          monthly_spend: number
          investment_duration: number
          target_keywords: string[]
          conversion_rate: number | null
          close_rate: number | null
          average_order_value: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          monthly_spend: number
          investment_duration: number
          target_keywords: string[]
          conversion_rate?: number | null
          close_rate?: number | null
          average_order_value?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          monthly_spend?: number
          investment_duration?: number
          target_keywords?: string[]
          conversion_rate?: number | null
          close_rate?: number | null
          average_order_value?: number | null
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          user_id: string
          overall_score: number | null
          link_score: number | null
          domain_score: number | null
          traffic_score: number | null
          ranking_score: number | null
          ai_visibility_score: number | null
          authority_domain_gap: number | null
          ai_visibility_data: any | null
          analysis_data: any | null
          ai_commentary: string | null
          pdf_url: string | null
          status: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          overall_score?: number | null
          link_score?: number | null
          domain_score?: number | null
          traffic_score?: number | null
          ranking_score?: number | null
          ai_visibility_score?: number | null
          authority_domain_gap?: number | null
          ai_visibility_data?: any | null
          analysis_data?: any | null
          ai_commentary?: string | null
          pdf_url?: string | null
          status?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          overall_score?: number | null
          link_score?: number | null
          domain_score?: number | null
          traffic_score?: number | null
          ranking_score?: number | null
          ai_visibility_score?: number | null
          authority_domain_gap?: number | null
          ai_visibility_data?: any | null
          analysis_data?: any | null
          ai_commentary?: string | null
          pdf_url?: string | null
          status?: string
          completed_at?: string | null
          created_at?: string
        }
      }
    }
  }
} 