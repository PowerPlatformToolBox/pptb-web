import { createClient } from '@supabase/supabase-js';

// Supabase client for authentication and data fetching
// Configure your Supabase project URL and anon key in .env.local:
// NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database types for TypeScript
export interface Tool {
  id: string;
  name: string;
  description: string;
  long_description?: string;
  icon: string;
  category: string;
  downloads: number;
  rating: number;
  aum?: number;
  author?: string;
  version?: string;
  last_updated?: string;
  features?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Rating {
  id: string;
  tool_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

