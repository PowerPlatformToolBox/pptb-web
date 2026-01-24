"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Container } from "@/components/Container";
import { FadeIn } from "@/components/animations";

interface Sponsor {
    name: string;
    login: string;
    avatarUrl: string;
    githubUrl: string;
    tier: string;
    monthlyAmount: number;
}

export default function SponsorsPage() {
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSponsors() {
            try {
                const response = await fetch("/api/sponsors");
                if (response.ok) {
                    const data = await response.json();
                    setSponsors(data);
                }
            } catch (error) {
                console.error("Failed to fetch sponsors:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchSponsors();
    }, []);
    return (
        <main className="bg-slate-50">
            {/* Slim Hero Banner with CTA */}
            <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
                <Container className="py-12 text-center lg:py-16">
                    <FadeIn direction="up" delay={0.1}>
                        <div className="mx-auto max-w-3xl">
                            <h1 className="font-display text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">
                                Support{" "}
                                <span className="relative whitespace-nowrap">
                                    <svg aria-hidden="true" viewBox="0 0 418 42" className="absolute top-2/3 left-0 h-[0.58em] w-full fill-blue-300/70" preserveAspectRatio="none">
                                        <path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.78 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.54-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.81 23.239-7.825 27.934-10.149 28.304-14.005.417-4.348-3.529-6-16.878-7.066Z" />
                                    </svg>
                                    <span className="relative text-gradient">Open Source</span>
                                </span>
                            </h1>
                            <p className="mx-auto mt-4 max-w-2xl text-base tracking-tight text-slate-700 sm:text-lg">
                                Power Platform Tool Box is free and open source, made possible by the generous support of our sponsors. Your sponsorship helps us maintain and improve the tools that thousands of developers rely on every day.
                            </p>
                            <div className="mt-8 flex justify-center gap-4">
                                <Link
                                    href="https://github.com/sponsors/PowerPlatformToolBox"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary inline-flex items-center justify-center gap-2"
                                >
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="m8 14.25.345.666a.75.75 0 0 1-.69 0l-.008-.004-.018-.01a7.152 7.152 0 0 1-.31-.17 22.055 22.055 0 0 1-3.434-2.414C2.045 10.731 0 8.35 0 5.5 0 2.836 2.086 1 4.25 1 5.797 1 7.153 1.802 8 3.02 8.847 1.802 10.203 1 11.75 1 13.914 1 16 2.836 16 5.5c0 2.85-2.045 5.231-3.885 6.818a22.066 22.066 0 0 1-3.744 2.584l-.018.01-.006.003h-.002ZM4.25 2.5c-1.336 0-2.75 1.164-2.75 3 0 2.15 1.58 4.144 3.365 5.682A20.58 20.58 0 0 0 8 13.393a20.58 20.58 0 0 0 3.135-2.211C12.92 9.644 14.5 7.65 14.5 5.5c0-1.836-1.414-3-2.75-3-1.373 0-2.609.986-3.029 2.456a.749.749 0 0 1-1.442 0C6.859 3.486 5.623 2.5 4.25 2.5Z" />
                                    </svg>
                                    Become a Sponsor
                                </Link>
                            </div>
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* Sponsors Section */}
            <Container className="py-16 lg:py-24">
                <div className="mx-auto max-w-5xl">
                    <FadeIn direction="up" delay={0.2}>
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-semibold text-slate-900 mb-4">Our Amazing Sponsors</h2>
                            <p className="text-lg text-slate-700 max-w-2xl mx-auto">
                                We are incredibly grateful to all our sponsors who make this project possible. Thank you for believing in open source and supporting the Power Platform community!
                            </p>
                        </div>
                    </FadeIn>

                    {loading ? (
                        <FadeIn direction="up" delay={0.3}>
                            <div className="text-center py-12">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                                <p className="mt-4 text-slate-600">Loading sponsors...</p>
                            </div>
                        </FadeIn>
                    ) : sponsors.length > 0 ? (
                        <FadeIn direction="up" delay={0.3}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {sponsors.map((sponsor) => (
                                    <a
                                        key={sponsor.login}
                                        href={sponsor.githubUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="card p-6 hover:shadow-fluent transition-shadow block"
                                    >
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={sponsor.avatarUrl}
                                                alt={sponsor.name}
                                                className="h-12 w-12 rounded-full"
                                            />
                                            <div>
                                                <h3 className="font-semibold text-slate-900">{sponsor.name}</h3>
                                                <p className="text-sm text-slate-600">{sponsor.tier}</p>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </FadeIn>
                    ) : (
                        <FadeIn direction="up" delay={0.3}>
                            <div className="card p-12 text-center border-2 border-dashed border-slate-300 bg-white/50">
                                <div className="mx-auto w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                                    <svg className="h-8 w-8 text-blue-600" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="m8 14.25.345.666a.75.75 0 0 1-.69 0l-.008-.004-.018-.01a7.152 7.152 0 0 1-.31-.17 22.055 22.055 0 0 1-3.434-2.414C2.045 10.731 0 8.35 0 5.5 0 2.836 2.086 1 4.25 1 5.797 1 7.153 1.802 8 3.02 8.847 1.802 10.203 1 11.75 1 13.914 1 16 2.836 16 5.5c0 2.85-2.045 5.231-3.885 6.818a22.066 22.066 0 0 1-3.744 2.584l-.018.01-.006.003h-.002ZM4.25 2.5c-1.336 0-2.75 1.164-2.75 3 0 2.15 1.58 4.144 3.365 5.682A20.58 20.58 0 0 0 8 13.393a20.58 20.58 0 0 0 3.135-2.211C12.92 9.644 14.5 7.65 14.5 5.5c0-1.836-1.414-3-2.75-3-1.373 0-2.609.986-3.029 2.456a.749.749 0 0 1-1.442 0C6.859 3.486 5.623 2.5 4.25 2.5Z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-2">Be Our First Sponsor!</h3>
                                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                                    We&apos;re just getting started with GitHub Sponsors. Your support will help us build amazing tools for the Power Platform community.
                                </p>
                                <Link
                                    href="https://github.com/sponsors/PowerPlatformToolBox"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-outline inline-flex items-center justify-center gap-2"
                                >
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="m8 14.25.345.666a.75.75 0 0 1-.69 0l-.008-.004-.018-.01a7.152 7.152 0 0 1-.31-.17 22.055 22.055 0 0 1-3.434-2.414C2.045 10.731 0 8.35 0 5.5 0 2.836 2.086 1 4.25 1 5.797 1 7.153 1.802 8 3.02 8.847 1.802 10.203 1 11.75 1 13.914 1 16 2.836 16 5.5c0 2.85-2.045 5.231-3.885 6.818a22.066 22.066 0 0 1-3.744 2.584l-.018.01-.006.003h-.002ZM4.25 2.5c-1.336 0-2.75 1.164-2.75 3 0 2.15 1.58 4.144 3.365 5.682A20.58 20.58 0 0 0 8 13.393a20.58 20.58 0 0 0 3.135-2.211C12.92 9.644 14.5 7.65 14.5 5.5c0-1.836-1.414-3-2.75-3-1.373 0-2.609.986-3.029 2.456a.749.749 0 0 1-1.442 0C6.859 3.486 5.623 2.5 4.25 2.5Z" />
                                    </svg>
                                    Sponsor on GitHub
                                </Link>
                            </div>
                        </FadeIn>
                    )}

                    {/* Why Sponsor Section */}
                    <FadeIn direction="up" delay={0.4}>
                        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="card p-6 text-center">
                                <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-2">Faster Development</h3>
                                <p className="text-sm text-slate-600">Help us deliver new features and improvements faster for the entire community.</p>
                            </div>
                            <div className="card p-6 text-center">
                                <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-2">Better Security</h3>
                                <p className="text-sm text-slate-600">Support regular security audits and keep the tools safe for everyone.</p>
                            </div>
                            <div className="card p-6 text-center">
                                <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-green-100 flex items-center justify-center">
                                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-2">Strong Community</h3>
                                <p className="text-sm text-slate-600">Help build and maintain a thriving open source ecosystem for Power Platform.</p>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </Container>
        </main>
    );
}
