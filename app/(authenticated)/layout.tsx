"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabase";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkAuth() {
            if (!supabase) {
                // If Supabase is not configured, redirect to sign in
                router.push('/auth/signin');
                return;
            }

            try {
                const { data: { user } } = await supabase.auth.getUser();
                
                if (!user) {
                    router.push('/auth/signin');
                    return;
                }
                
                setLoading(false);
            } catch (error) {
                console.error('Error checking auth:', error);
                router.push('/auth/signin');
            }
        }

        checkAuth();
    }, [router]);

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
