import Link from "next/link";

import { Container } from "@/components/Container";
import { FadeIn } from "@/components/animations";

export const metadata = {
    title: "About XrmToolBox",
    description: "A tribute to Tanguy and the XrmToolBox project that inspired Power Platform Tool Box.",
};

export default function AboutPage() {
    return (
        <main>
            <Container className="mt-16 sm:mt-32">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto max-w-2xl lg:max-w-5xl">
                        <header className="max-w-2xl">
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Standing on the Shoulders of Giants</h1>
                            <p className="mt-6 text-lg text-slate-700">A heartfelt tribute to Tanguy and the XrmToolBox project that paved the way for Power Platform Tool Box.</p>
                        </header>

                        <div className="mt-16 sm:mt-20">
                            <div className="space-y-8 text-base text-slate-700">
                                <FadeIn direction="up" delay={0.4}>
                                    <div className="card p-8 border-l-4 border-blue-600">
                                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">The Revolutionary Impact of XrmToolBox</h2>
                                        <p className="mb-4 leading-relaxed">
                                            Since its inception, <strong>XrmToolBox</strong> has been the cornerstone of the Microsoft Dynamics and Power Platform community. Created by{" "}
                                            <strong>Tanguy Touzard</strong>, it revolutionized how developers, administrators, and consultants interact with Dynamics 365 and the Power Platform by
                                            providing a unified, extensible platform for community-built tools.
                                        </p>
                                        <p className="mb-4 leading-relaxed">
                                            With <strong>over 100+ community-contributed plugins</strong> and <strong>millions of downloads</strong>, XrmToolBox became the de facto standard for Power
                                            Platform development and administration. It democratized access to powerful utilities that would have otherwise required extensive custom development or
                                            costly third-party solutions.
                                        </p>
                                        <p className="leading-relaxed">
                                            The project&apos;s open architecture and welcoming community fostered innovation, enabling developers worldwide to contribute their own tools and solutions.
                                            This collaborative spirit is the very foundation that inspired the creation of Power Platform Tool Box.
                                        </p>
                                    </div>
                                </FadeIn>

                                <FadeIn direction="up" delay={0.5}>
                                    <div className="card p-8 bg-linear-to-br from-blue-50 to-purple-50">
                                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">💙 Tanguy&apos;s Leadership and Vision</h2>
                                        <p className="mb-4 leading-relaxed">
                                            <strong>Tanguy Touzard</strong> is not just a developer—he is a community leader, innovator, and inspiration to thousands in the Power Platform ecosystem.
                                            His dedication to creating free, open-source tools has saved countless hours of work and enabled projects that might not have been possible otherwise.
                                        </p>
                                        <p className="mb-4 leading-relaxed">
                                            Beyond the code, Tanguy&apos;s commitment to fostering a welcoming, collaborative community set the standard for how open-source projects should operate.
                                            His responsiveness to feedback, willingness to mentor new contributors, and genuine passion for helping others have created a ripple effect that extends far
                                            beyond XrmToolBox itself.
                                        </p>
                                        <p className="leading-relaxed text-lg font-medium text-slate-900">
                                            Power Platform Tool Box is our humble attempt to honor that legacy while bringing those capabilities into a modern, cross-platform architecture.
                                        </p>
                                    </div>
                                </FadeIn>

                                <FadeIn direction="up" delay={0.6}>
                                    <div className="card p-8">
                                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">🌟 Building on a Proven Foundation</h2>
                                        <p className="mb-4 leading-relaxed">
                                            Power Platform Tool Box isn&apos;t meant to replace XrmToolBox—it&apos;s designed to complement and extend its vision into new territories:
                                        </p>
                                        <ul className="space-y-3 mb-6">
                                            <li className="flex items-start gap-3">
                                                <svg className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>
                                                    <strong>Cross-Platform Support:</strong> Running natively on Windows, macOS, and Linux
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <svg className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>
                                                    <strong>Modern Architecture:</strong> Built with Electron and web technologies for flexibility
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <svg className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>
                                                    <strong>Enhanced Security:</strong> Modern authentication and sandboxed tool execution
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <svg className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>
                                                    <strong>Community-First:</strong> Maintaining the same open, collaborative spirit that made XrmToolBox successful
                                                </span>
                                            </li>
                                        </ul>
                                        <p className="leading-relaxed">
                                            We stand on the shoulders of XrmToolBox, learning from its successes and challenges, while striving to bring its proven model to a new generation of
                                            developers who work across different operating systems and modern development workflows.
                                        </p>
                                    </div>
                                </FadeIn>

                                <FadeIn direction="up" delay={0.7}>
                                    <div className="card p-8 border-l-4 border-purple-600">
                                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">🤝 Our Commitment to the Community</h2>
                                        <p className="mb-4 leading-relaxed">
                                            Just as XrmToolBox has remained free and open to the community, Power Platform Tool Box is committed to the same principles:
                                        </p>
                                        <ul className="space-y-3 mb-4">
                                            <li className="flex items-start gap-3">
                                                <span className="text-2xl">✅</span>
                                                <span>
                                                    <strong>Always Free:</strong> The core platform and community tools will always be free to use
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <span className="text-2xl">✅</span>
                                                <span>
                                                    <strong>Open Source:</strong> Transparent development with community contributions welcomed
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <span className="text-2xl">✅</span>
                                                <span>
                                                    <strong>Community-Driven:</strong> Tools created by the community, for the community
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <span className="text-2xl">✅</span>
                                                <span>
                                                    <strong>Respectful:</strong> Acknowledging the foundations we build upon and the pioneers who came before
                                                </span>
                                            </li>
                                        </ul>
                                        <p className="leading-relaxed text-lg font-medium text-slate-900">
                                            We will never forget that we owe our existence to Tanguy&apos;s vision and the XrmToolBox community&apos;s dedication.
                                        </p>
                                    </div>
                                </FadeIn>

                                <FadeIn direction="up" delay={0.8}>
                                    <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                                        <Link href="https://www.xrmtoolbox.com" target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center justify-center gap-2">
                                            Visit XrmToolBox
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </Link>
                                        <Link
                                            href="https://github.com/MscrmTools/XrmToolBox"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-outline inline-flex items-center justify-center gap-2"
                                        >
                                            XrmToolBox on GitHub
                                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </Link>
                                        <Link href="/tools" className="btn-secondary inline-flex items-center justify-center gap-2">
                                            Explore Our Tools
                                        </Link>
                                    </div>
                                </FadeIn>
                            </div>
                        </div>
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
