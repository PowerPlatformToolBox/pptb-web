"use client";

import { Popover, PopoverBackdrop, PopoverButton, PopoverPanel } from "@headlessui/react";
import clsx from "clsx";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Container } from "@/components/Container";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import discordLogo from "@/images/logos/discord.png";
import githubLogo from "@/images/logos/github.png";
import linkedinLogo from "@/images/logos/linkedin.png";
import { useSupabase } from "@/lib/useSupabase";

type NavItem = {
    label: string;
    href: string;
    icon?: StaticImageData;
    external?: boolean;
};

type NavGroup = {
    label: string;
    items: NavItem[];
};

const PRIMARY_LINKS: NavItem[] = [
    { label: "Tools", href: "/tools" },
    { label: "Sponsors", href: "/sponsors" },
];

type SocialLink = NavItem & {
    icon: StaticImageData;
    external: true;
};

const SOCIAL_LINKS: SocialLink[] = [
    { label: "GitHub", href: "https://github.com/PowerPlatformToolBox", icon: githubLogo, external: true },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/power-platform-toolbox", icon: linkedinLogo, external: true },
    { label: "Discord", href: "https://discord.gg/efwAu9sXyJ", icon: discordLogo, external: true },
];

const NAVIGATION_GROUPS: NavGroup[] = [
    {
        label: "Platform",
        items: [
            { label: "Features", href: "/#features" },
            { label: "Teams", href: "/#team" },
            { label: "About", href: "/about" },
            { label: "Security", href: "/security" },
        ],
    },
    {
        label: "Resources",
        items: [
            { label: "Documentation", href: "https://docs.powerplatformtoolbox.com", external: true },
            { label: "FAQs", href: "/faqs" },
        ],
    },
    {
        label: "Social",
        items: SOCIAL_LINKS.map(({ label, href, icon }) => ({ label, href, icon, external: true })),
    },
];

function ChevronIcon({ open }: { open: boolean }) {
    return (
        <svg aria-hidden="true" viewBox="0 0 10 6" className={clsx("h-3 w-3 text-slate-500 transition-transform duration-150", open ? "rotate-180 text-slate-900" : "rotate-0")}>
            <path d="M1 1.25 5 5l4-3.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
        </svg>
    );
}

function DesktopNavGroup({ group }: { group: NavGroup }) {
    return (
        <Popover className="relative">
            {({ open, close }) => (
                <>
                    <PopoverButton
                        className={clsx("flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100/80", open && "text-slate-900")}
                        aria-label={`${group.label} navigation`}
                    >
                        {group.label}
                        <ChevronIcon open={open} />
                    </PopoverButton>
                    <PopoverPanel
                        transition
                        className="absolute left-1/2 z-50 mt-4 w-60 -translate-x-1/2 rounded-3xl border border-slate-100 bg-white/95 p-3 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur data-closed:scale-95 data-closed:opacity-0 data-enter:duration-150 data-enter:ease-out data-leave:duration-100 data-leave:ease-in"
                    >
                        <div className="flex flex-col gap-1">
                            {group.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    target={item.external ? "_blank" : undefined}
                                    rel={item.external ? "noreferrer" : undefined}
                                    onClick={() => close()}
                                    className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                                >
                                    {item.icon && <Image src={item.icon} alt={`${item.label} icon`} width={20} height={20} className="h-5 w-5" />}
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </PopoverPanel>
                </>
            )}
        </Popover>
    );
}

interface MobileNavLinkProps {
    href: string;
    children: ReactNode;
    onClick?: () => void;
    target?: string;
    rel?: string;
    icon?: StaticImageData;
}

function MobileNavLink({ href, children, onClick, target, rel, icon: Icon }: MobileNavLinkProps) {
    return (
        <Link href={href} onClick={onClick} target={target} rel={rel} className="flex items-center gap-3 rounded-2xl px-3 py-2 text-base font-semibold text-slate-700 transition hover:bg-slate-100">
            {Icon && <Image src={Icon} alt="" width={20} height={20} className="h-5 w-5" />}
            {children}
        </Link>
    );
}

function MobileNavButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
    return (
        <button type="button" onClick={onClick} className="flex w-full items-center rounded-2xl px-3 py-2 text-base font-semibold text-slate-700 transition hover:bg-slate-100">
            {children}
        </button>
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
            {({ open, close }) => (
                <>
                    <PopoverButton className="relative z-10 flex h-8 w-8 items-center justify-center focus:not-data-focus:outline-hidden" aria-label="Toggle Navigation">
                        <MobileNavIcon open={open} />
                    </PopoverButton>
                    <PopoverBackdrop transition className="fixed inset-0 bg-slate-900/30 backdrop-blur data-closed:opacity-0" />
                    <PopoverPanel
                        transition
                        className="absolute inset-x-0 top-full mt-4 flex origin-top flex-col rounded-3xl border border-slate-100 bg-white/95 p-5 text-base tracking-tight text-slate-900 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur data-closed:scale-95 data-closed:opacity-0 data-enter:duration-150 data-enter:ease-out data-leave:duration-100 data-leave:ease-in"
                    >
                        <div className="flex flex-col gap-4">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-2">
                                <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Links</p>
                                {PRIMARY_LINKS.map((item) => (
                                    <MobileNavLink key={item.href} href={item.href} onClick={() => close()}>
                                        {item.label}
                                    </MobileNavLink>
                                ))}
                            </div>
                            {NAVIGATION_GROUPS.map((group) => (
                                <div key={group.label} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-2">
                                    <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
                                    {group.items.map((item) => (
                                        <MobileNavLink
                                            key={item.href}
                                            href={item.href}
                                            icon={item.icon}
                                            target={item.external ? "_blank" : undefined}
                                            rel={item.external ? "noreferrer" : undefined}
                                            onClick={() => close()}
                                        >
                                            {item.label}
                                        </MobileNavLink>
                                    ))}
                                </div>
                            ))}
                            <hr className="m-2 border-slate-300/40" />
                            {isAuthenticated ? (
                                <>
                                    <MobileNavLink href="/dashboard" onClick={() => close()}>
                                        Dashboard
                                    </MobileNavLink>
                                    <MobileNavButton
                                        onClick={() => {
                                            close();
                                            onSignOut();
                                        }}
                                    >
                                        Sign out
                                    </MobileNavButton>
                                </>
                            ) : (
                                <MobileNavLink href="/auth/signin" onClick={() => close()}>
                                    Sign in
                                </MobileNavLink>
                            )}
                        </div>
                    </PopoverPanel>
                </>
            )}
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
        <header className="py-8 md:py-4 md:sticky md:top-0 md:z-40 md:border-b md:border-slate-100 md:bg-white/90 md:backdrop-blur">
            <Container>
                <nav className="relative z-50 flex justify-between">
                    <div className="flex items-center md:gap-x-12">
                        <Link href="/" aria-label="Home">
                            <Logo className="h-10 w-auto" alt="PPTB" />
                        </Link>
                        <div className="hidden md:flex md:items-center md:gap-x-3">
                            {PRIMARY_LINKS.map((item) => (
                                <NavLink key={item.href} href={item.href} className="text-slate-600 transition hover:bg-slate-100/80">
                                    {item.label}
                                </NavLink>
                            ))}
                            {NAVIGATION_GROUPS.map((group) => (
                                <DesktopNavGroup key={group.label} group={group} />
                            ))}
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
