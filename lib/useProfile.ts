"use client";

import { useEffect, useRef, useState } from "react";

import { type EditableProfile, PROFILE_UPDATED_EVENT } from "@/lib/profile";
import { useSupabase } from "@/lib/useSupabase";

export function useProfile() {
    const { supabase, error: configurationError } = useSupabase();
    const [profile, setProfile] = useState<EditableProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [revision, setRevision] = useState(0);
    const account = useRef<string | null>(null);

    useEffect(() => {
        const refresh = () => setRevision((value) => value + 1);
        window.addEventListener(PROFILE_UPDATED_EVENT, refresh);
        return () => window.removeEventListener(PROFILE_UPDATED_EVENT, refresh);
    }, []);

    useEffect(() => {
        if (!supabase) return;
        const controller = new AbortController();
        let currentRequest = 0;

        const load = async (token?: string) => {
            const request = ++currentRequest;
            if (!token) {
                setProfile(null);
                setError(null);
                setLoading(false);
                return;
            }
            try {
                const response = await fetch("/api/profile", {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store",
                    signal: controller.signal,
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Unable to load your profile.");
                if (!controller.signal.aborted && request === currentRequest) {
                    setProfile(data.profile);
                    setError(null);
                }
            } catch (error) {
                if (!controller.signal.aborted && request === currentRequest) {
                    console.error("Error loading profile:", error);
                    setError(error instanceof Error ? error.message : "Unable to load your profile.");
                }
            } finally {
                if (!controller.signal.aborted && request === currentRequest) setLoading(false);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const userId = session?.user.id ?? null;
            if (account.current !== userId) {
                account.current = userId;
                setProfile(null);
                setError(null);
            }
            void load(session?.access_token);
        });
        // INITIAL_SESSION from onAuthStateChange also covers the first load.
        return () => {
            controller.abort();
            subscription.unsubscribe();
        };
    }, [supabase, revision]);

    return { profile, loading: loading && !configurationError, error: configurationError || error };
}
