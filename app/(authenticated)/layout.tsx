"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { useSupabase } from "@/lib/useSupabase";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const { supabase } = useSupabase();

    useEffect(() => {
        if (!supabase) return; // wait for client
        (async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (!session) {
                    router.push("/auth/signin");
                    return;
                }

                // Store token in sessionStorage for API calls
                if (session.access_token) {
                    sessionStorage.setItem("supabaseToken", session.access_token);
                }

                setLoading(false);
            } catch (error) {
                console.error("Error checking auth:", error);
                router.push("/auth/signin");
            }
        })();
    }, [router, supabase]);

    if (loading) {
        return (
            <>
                <Header />
                <main className="flex min-h-screen items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                        <p className="mt-4 text-slate-600">Loading...</p>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            {children}
            <Footer />
        </>
    );
}
