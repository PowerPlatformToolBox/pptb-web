"use client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

let cachedClient: SupabaseClient | null = null;

async function initClient(): Promise<SupabaseClient> {
    if (cachedClient) return cachedClient;
    const res = await fetch("/api/supabase-config");
    if (!res.ok) throw new Error("Failed to retrieve Supabase configuration");
    const { url, anonKey } = await res.json();
    cachedClient = createClient(url, anonKey);
    return cachedClient;
}

export function useSupabase() {
    const [client, setClient] = useState<SupabaseClient | null>(cachedClient);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!client) {
            initClient()
                .then(setClient)
                .catch((err) => {
                    console.error("Supabase initialization failed:", err);
                    setError(err instanceof Error ? err.message : "Unknown Supabase init error");
                });
        }
    }, [client]);

    return { supabase: client, error };
}
