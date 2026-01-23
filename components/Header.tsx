"use client";

import { Popover, PopoverBackdrop, PopoverButton, PopoverPanel } from "@headlessui/react";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Container } from "@/components/Container";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { useSupabase } from "@/lib/useSupabase";

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <PopoverButton as={Link} href={href} className="block w-full p-2">
            {children}
        </PopoverButton>
    );
}

function MobileNavButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    return (
        <PopoverButton as="button" onClick={onClick} className="block w-full p-2 text-left">
            {children}
        </PopoverButton>
    );
}

function MobileNavIcon({ open }: { open: boolean }) {
    return (
        <svg aria-hidden="true" className="h-3.5 w-3.5 overflow-visible stroke-slate-700" fill="none" strokeWidth={2} strokeLinecap="round">
            <path d="M0 1H14M0 7H14M0 13H14" className={clsx("origin-center transition", open && "scale-90 opacity-0")} />
            <path d="M2 2L12 12M12 2L2 12" className={clsx("origin-center transition", !open && "scale-90 opacity-0")} />
        </svg>
    );
}

interface MobileNavigationProps {
    isAuthenticated: boolean;
    onSignOut: () => void;
}

function MobileNavigation({ isAuthenticated, onSignOut }: MobileNavigationProps) {
    return (
        <Popover>
            <PopoverButton className="relative z-10 flex h-8 w-8 items-center justify-center focus:not-data-focus:outline-hidden" aria-label="Toggle Navigation">
                {({ open }) => <MobileNavIcon open={open} />}
            </PopoverButton>
            <PopoverBackdrop transition className="fixed inset-0 bg-slate-300/50 duration-150 data-closed:opacity-0 data-enter:ease-out data-leave:ease-in" />
            <PopoverPanel
                transition
                className="absolute inset-x-0 top-full mt-4 flex origin-top flex-col rounded-2xl bg-white p-4 text-lg tracking-tight text-slate-900 shadow-xl ring-1 ring-slate-900/5 data-closed:scale-95 data-closed:opacity-0 data-enter:duration-150 data-enter:ease-out data-leave:duration-100 data-leave:ease-in"
            >
                <MobileNavLink href="/#features">Features</MobileNavLink>
                <MobileNavLink href="/tools">Tools</MobileNavLink>
                <MobileNavLink href="https://docs.powerplatformtoolbox.com">Documentation</MobileNavLink>
                <MobileNavLink href="/#team">Teams</MobileNavLink>
                <MobileNavLink href="/about">About</MobileNavLink>
                <MobileNavLink href="/security">Security</MobileNavLink>
                <MobileNavLink href="/faqs">FAQs</MobileNavLink>
                <hr className="m-2 border-slate-300/40" />
                {isAuthenticated ? (
                    <>
                        <MobileNavLink href="/dashboard">Dashboard</MobileNavLink>
                        <MobileNavButton onClick={onSignOut}>Sign out</MobileNavButton>
                    </>
                ) : (
                    <MobileNavLink href="/auth/signin">Sign in</MobileNavLink>
                )}
            </PopoverPanel>
        </Popover>
    );
}

export function Header() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const { supabase } = useSupabase();

    useEffect(() => {
        if (!supabase) return; // Wait for client to be ready
        let subscription: { unsubscribe: () => void } | null = null;

        (async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                setIsAuthenticated(!!user);
            } catch (error) {
                console.error("Error checking auth:", error);
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        })();

        const authListener = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session);
        });
        subscription = authListener.data.subscription;

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, [supabase]);

    const handleSignOut = async () => {
        if (!supabase) return;

        try {
            await supabase.auth.signOut();
            setIsAuthenticated(false);
            router.push("/");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <header className="py-10">
            <Container>
                <nav className="relative z-50 flex justify-between">
                    <div className="flex items-center md:gap-x-12">
                        <Link href="/" aria-label="Home">
                            <Logo className="h-10 w-auto" alt="PPTB" />
                        </Link>
                        <div className="hidden md:flex md:gap-x-6">
                            <NavLink href="/#features">Features</NavLink>
                            <NavLink href="/tools">Tools</NavLink>
                            <NavLink href="https://docs.powerplatformtoolbox.com">Documentation</NavLink>
                            <NavLink href="/#team">Teams</NavLink>
                            <NavLink href="/about">About</NavLink>
                            <NavLink href="/security">Security</NavLink>
                            <NavLink href="/faqs">FAQs</NavLink>
                        </div>
                    </div>
                    <div className="flex items-center gap-x-5 md:gap-x-8">
                        <div className="hidden md:flex md:items-center md:gap-x-6">
                            {!loading && (
                                <>
                                    {isAuthenticated ? (
                                        <>
                                            <NavLink href="/dashboard">Dashboard</NavLink>
                                            <button
                                                onClick={handleSignOut}
                                                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
                                            >
                                                Sign out
                                            </button>
                                        </>
                                    ) : (
                                        <NavLink href="/auth/signin">Sign in</NavLink>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="-mr-1 md:hidden">
                            <MobileNavigation isAuthenticated={isAuthenticated} onSignOut={handleSignOut} />
                        </div>
                    </div>
                </nav>
            </Container>
        </header>
    );
}
