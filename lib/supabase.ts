import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client (do NOT import this in client components).
// Environment variables no longer use NEXT_PUBLIC_ prefix.
// For browser usage a client hook fetches config from /api/supabase-config.

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

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
    mau?: number;
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
