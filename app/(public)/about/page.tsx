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
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                                Standing on the Shoulders of Giants
                            </h1>
                            <p className="mt-6 text-lg text-slate-700">
                                A heartfelt tribute to Tanguy and the XrmToolBox project that paved the way for Power Platform Tool Box.
                            </p>
                        </header>
                        <div className="mt-16 sm:mt-20">
                            <div className="space-y-7 text-base text-slate-700">
                                <FadeIn direction="up" delay={0.3}>
                                    <div className="card p-8">
                                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
                                            🙏 Honoring XrmToolBox and Tanguy
                                        </h2>
                                        <p className="mb-4">
                                            [Placeholder: This section will contain a heartfelt tribute to Tanguy and the XrmToolBox project. 
                                            The text will be provided by the project owner and will express gratitude for the inspiration 
                                            and foundation that XrmToolBox has provided to the Power Platform community.]
                                        </p>
                                        <p className="mb-4">
                                            [Additional content about how XrmToolBox revolutionized Power Platform development and how 
                                            it continues to inspire new tools and approaches in the ecosystem.]
                                        </p>
                                        <p>
                                            [Content acknowledging Tanguy&apos;s contributions and leadership in the community, and how 
                                            Power Platform Tool Box aims to carry forward that legacy while adding modern capabilities.]
                                        </p>
                                    </div>
                                </FadeIn>

                                <FadeIn direction="up" delay={0.4}>
                                    <div className="card p-8">
                                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
                                            🌟 The Legacy Continues
                                        </h2>
                                        <p className="mb-4">
                                            [Placeholder: Details about how Power Platform Tool Box builds upon XrmToolBox&apos;s vision 
                                            while introducing modern architecture, cross-platform support, and enhanced security features.]
                                        </p>
                                        <p>
                                            [Information about our commitment to the community and continuing the spirit of open 
                                            collaboration that XrmToolBox established.]
                                        </p>
                                    </div>
                                </FadeIn>

                                <FadeIn direction="up" delay={0.5}>
                                    <div className="mt-8 flex gap-4">
                                        <Link 
                                            href="https://www.xrmtoolbox.com" 
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-primary inline-flex items-center gap-2"
                                        >
                                            Visit XrmToolBox
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </Link>
                                        <Link 
                                            href="/tools"
                                            className="btn-secondary inline-flex items-center gap-2"
                                        >
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
