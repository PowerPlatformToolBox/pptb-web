import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/Container";
import { FadeIn } from "@/components/animations";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
    title: "About Power Platform ToolBox",
    description: "Learn how Power Platform ToolBox honors the legacy of XrmToolBox and continues the mission of building community-driven tooling.",
    url: "/about",
});

export default function AboutPage() {
    return (
        <main className="bg-slate-50">
            {/* Hero */}
            <section className="border-b border-slate-200 bg-linear-to-b from-white to-slate-50">
                <Container className="pt-20 pb-16 text-center lg:pt-32">
                    <FadeIn direction="up" delay={0.1}>
                        <h1 className="mx-auto max-w-4xl font-display text-3xl font-medium tracking-tight text-slate-900 sm:text-7xl">
                            Standing on the{" "}
                            <span className="relative whitespace-nowrap">
                                <svg aria-hidden="true" viewBox="0 0 418 42" className="absolute top-2/3 left-0 h-[0.58em] w-full fill-blue-300/70" preserveAspectRatio="none">
                                    <path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.78 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.54-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.81 23.239-7.825 27.934-10.149 28.304-14.005.417-4.348-3.529-6-16.878-7.066Z" />
                                </svg>
                                <span className="relative text-gradient">shoulders of giants</span>
                            </span>
                        </h1>
                    </FadeIn>
                    <FadeIn direction="up" delay={0.25}>
                        <p className="mx-auto mt-6 max-w-2xl text-lg tracking-tight text-slate-700">
                            A heartfelt tribute to <strong>Tanguy Touzard</strong> and the <strong>XrmToolBox</strong> project that paved the way for Power Platform Tool Box.
                        </p>
                    </FadeIn>
                </Container>
            </section>

            {/* Content */}
            <Container className="py-16 lg:py-24">
                <div className="mx-auto max-w-5xl space-y-16">
                    <FadeIn direction="up" delay={0.1}>
                        <div className="card p-8 border-l-4 border-blue-600 shadow-lg hover:shadow-xl transition-shadow">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">The Revolutionary Impact of XrmToolBox</h2>
                            <p className="mb-4 leading-relaxed">
                                Since its inception, <strong>XrmToolBox</strong> has been the cornerstone of the Microsoft Dynamics and Power Platform community. Created by{" "}
                                <strong>Tanguy Touzard</strong>, it revolutionized how developers, administrators, and consultants interact with Dynamics 365 and the Power Platform by providing a
                                unified, extensible platform for community-built tools.
                            </p>
                            <p className="leading-relaxed">
                                With <strong>100+ community-contributed plugins</strong> and <strong>millions of downloads</strong>, XrmToolBox set the standard for productivity and collaboration
                                across the ecosystem.
                            </p>
                        </div>
                    </FadeIn>

                    <FadeIn direction="up" delay={0.2}>
                        <div className="card p-8 bg-linear-to-br from-blue-50 to-purple-50 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-blue-300/20 to-purple-300/20 rounded-full blur-3xl"></div>
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4 relative z-10">💙 Tanguy&apos;s Leadership and Vision</h2>
                            <p className="mb-4 leading-relaxed relative z-10">
                                <strong>Tanguy Touzard</strong> is not just a developer—he&apos;s a community leader, innovator, and inspiration to thousands in the Power Platform ecosystem. His
                                dedication to creating free, open-source tools has saved countless hours of work and enabled projects that might not have been possible otherwise.
                            </p>
                            <p className="leading-relaxed relative z-10">
                                Beyond the code, Tanguy&apos;s welcoming, collaborative approach set the standard for how open-source projects should operate.
                            </p>
                        </div>
                    </FadeIn>

                    <FadeIn direction="up" delay={0.3}>
                        <div className="card p-8 shadow-lg hover:shadow-2xl transition-shadow border-t-4 border-blue-600">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">🌟 Building on a Proven Foundation</h2>
                            <ul className="space-y-4 mb-6">
                                <li className="flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50/50 transition-colors">
                                    <svg className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>
                                        <strong>Cross‑Platform Support:</strong> Running natively on Windows, macOS, and Linux
                                    </span>
                                </li>
                                <li className="flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50/50 transition-colors">
                                    <svg className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>
                                        <strong>Modern Architecture:</strong> Built with web technologies for flexibility and scale
                                    </span>
                                </li>
                                <li className="flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50/50 transition-colors">
                                    <svg className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>
                                        <strong>Enhanced Security:</strong> Modern authentication and sandboxed tool execution
                                    </span>
                                </li>
                                <li className="flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50/50 transition-colors">
                                    <svg className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>
                                        <strong>Community‑First:</strong> The same open, collaborative spirit that made XrmToolBox thrive
                                    </span>
                                </li>
                            </ul>
                            <p className="leading-relaxed">
                                We stand on the shoulders of XrmToolBox, learning from its successes while bringing its proven model to a new generation of developers and modern workflows.
                            </p>
                        </div>
                    </FadeIn>

                    <FadeIn direction="up" delay={0.4}>
                        <div className="card p-8 border-l-4 border-purple-600">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">🤝 Our Commitment to the Community</h2>
                            <ul className="space-y-3 mb-4">
                                <li>
                                    ✅ <span className="font-medium">Always Free:</span> The core platform and community tools will remain free
                                </li>
                                <li>
                                    ✅ <span className="font-medium">Open Source:</span> Transparent development, welcoming contributions
                                </li>
                                <li>
                                    ✅ <span className="font-medium">Community‑Driven:</span> Tools by the community, for the community
                                </li>
                                <li>
                                    ✅ <span className="font-medium">Respectful:</span> We honor the foundations and pioneers we build upon
                                </li>
                            </ul>
                            <p className="leading-relaxed text-slate-700">We will never forget that we owe our existence to Tanguy’s vision and the XrmToolBox community’s dedication.</p>
                            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="https://www.xrmtoolbox.com" target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center justify-center gap-2">
                                    Visit XrmToolBox
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </Link>
                                <Link href="https://github.com/MscrmTools/XrmToolBox" target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex items-center justify-center gap-2">
                                    XrmToolBox on GitHub
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path
                                            fillRule="evenodd"
                                            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .268.18.58.688.481C19.138 20.194 22 16.44 22 12.017 22 6.484 17.523 2 12 2z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </Container>
        </main>
    );
}
