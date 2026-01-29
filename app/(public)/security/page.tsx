import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/Container";
import { FadeIn } from "@/components/animations";
import { buildPageMetadata } from "@/lib/metadata";

const CONTACT_EMAIL = "powermaverick.tools@outlook.com";
const SECURITY_DOC_URL = "https://github.com/PowerPlatformToolBox/pptb-web/blob/main/artifacts/security";

export const metadata: Metadata = buildPageMetadata({
    title: "Security & Trust | Power Platform ToolBox",
    description: "Review the security controls, architecture, and artifacts Power Platform ToolBox provides to enterprise reviewers and compliance teams.",
    url: "/security",
});

export default function SecurityPage() {
    return (
        <main className="bg-slate-50">
            <section className="border-b border-slate-200 bg-linear-to-b from-white to-slate-50">
                <Container className="pt-20 pb-16 text-center lg:pt-32">
                    <FadeIn direction="up" delay={0.1}>
                        <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-600">Security &amp; Trust</p>
                        <h1 className="mx-auto mt-6 max-w-4xl font-display text-3xl font-medium tracking-tight text-slate-900 sm:text-6xl">Built so your security teams can say “yes”</h1>
                    </FadeIn>
                    <FadeIn direction="up" delay={0.25}>
                        <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-700">
                            Power Platform ToolBox ships with a pragmatic, transparent security posture so information security reviewers can quickly evaluate risk, understand data flows, and approve
                            usage inside their organization.
                        </p>
                    </FadeIn>
                    <FadeIn direction="up" delay={0.35}>
                        <div className="mt-10 flex flex-col items-center gap-4 text-sm text-slate-600 sm:flex-row sm:justify-center">
                            <div className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-900">Version: Public Preview</div>
                            <div className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-900">Maintained by the PPTB community</div>
                        </div>
                    </FadeIn>
                </Container>
            </section>

            <Container className="py-16 lg:py-24">
                <div className="mx-auto grid max-w-5xl gap-10">
                    <FadeIn direction="up" delay={0.1}>
                        <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg lg:grid-cols-2">
                            <div>
                                <h2 className="text-2xl font-semibold text-slate-900">Architecture in plain language</h2>
                                <p className="mt-4 text-base leading-relaxed text-slate-600">
                                    PPTB is a cross-platform desktop shell that securely downloads community-built tools from GitHub releases, validates file integrity, and runs them locally within
                                    the user&apos;s operating system. No customer data is routed through PPTB servers—administrators retain full control over credentials and environments.
                                </p>
                            </div>
                            <dl className="space-y-4">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <dt className="text-sm font-semibold text-slate-900">Data storage</dt>
                                    <dd className="mt-2 text-sm text-slate-600">No persistent customer data is stored on PPTB infrastructure. Settings live locally on the user&apos;s device.</dd>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <dt className="text-sm font-semibold text-slate-900">Authentication</dt>
                                    <dd className="mt-2 text-sm text-slate-600">
                                        Uses Microsoft Entra ID (Azure AD) OAuth flows via the official MSAL libraries for sign-in to Microsoft cloud services.
                                    </dd>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <dt className="text-sm font-semibold text-slate-900">Distribution</dt>
                                    <dd className="mt-2 text-sm text-slate-600">
                                        Installers are signed and distributed from GitHub, allowing organizations to mirror or validate packages internally.
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </FadeIn>

                    <FadeIn direction="up" delay={0.2}>
                        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
                            <h2 className="text-2xl font-semibold text-slate-900">Security controls at a glance</h2>
                            <ul className="mt-6 space-y-4 text-base text-slate-600">
                                <li>
                                    ✅ <span className="font-semibold">Least privilege:</span> Tools request credentials only when needed, and nothing is stored without user consent.
                                </li>
                                <li>
                                    ✅ <span className="font-semibold">Signed releases:</span> We rely on GitHub release signing plus community validation to detect tampering before distribution.
                                </li>
                                <li>
                                    ✅ <span className="font-semibold">Transparent code:</span> The entire stack is open-source so internal security teams can audit, fork, or build custom policies.
                                </li>
                                <li>
                                    ✅ <span className="font-semibold">Network awareness:</span> The desktop client only communicates with GitHub APIs, Microsoft identity endpoints, and the
                                    organization&apos;s own Dataverse/Power Platform services.
                                </li>
                                <li>
                                    ✅ <span className="font-semibold">Dependency hygiene:</span> Automated Dependabot alerts and manual reviews keep OSS libraries patched.
                                </li>
                            </ul>
                        </div>
                    </FadeIn>

                    <FadeIn direction="up" delay={0.3}>
                        <div className="rounded-3xl border border-blue-200 bg-blue-50/60 p-8 shadow-lg">
                            <h2 className="text-2xl font-semibold text-slate-900">For security reviewers</h2>
                            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                                <div className="rounded-2xl bg-white/80 p-5 shadow-sm">
                                    <h3 className="text-lg font-semibold text-slate-900">Artifacts we provide</h3>
                                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                        <li>• Software bill of materials (SBOM) upon request</li>
                                        <li>• Threat model outline with data-flow diagrams</li>
                                        <li>• Secure coding checklist aligned to OWASP</li>
                                        <li>• Release notes documenting security fixes</li>
                                    </ul>
                                </div>
                                <div className="rounded-2xl bg-white/80 p-5 shadow-sm">
                                    <h3 className="text-lg font-semibold text-slate-900">What we ask from you</h3>
                                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                        <li>• Validate the GitHub org and release signatures</li>
                                        <li>• Distribute installers via your approved channels</li>
                                        <li>• Enforce endpoint protection policies for the client</li>
                                        <li>• Share findings so we can harden the platform</li>
                                    </ul>
                                </div>
                            </div>
                            <p className="mt-6 text-sm text-slate-500">
                                Review our existing security documentation in the repository at
                                <Link href={SECURITY_DOC_URL} target="_blank" rel="noopener noreferrer" className="ml-1 font-semibold text-blue-600 underline-offset-4 hover:underline">
                                    docs/security
                                </Link>
                                .
                            </p>
                        </div>
                    </FadeIn>

                    <FadeIn direction="up" delay={0.4}>
                        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
                            <h2 className="text-2xl font-semibold text-slate-900">Need deeper details?</h2>
                            <p className="mt-4 text-base text-slate-600">
                                We gladly partner with enterprise security, compliance, and procurement teams. Reach out for white-glove reviews, questionnaire support, or architecture walkthroughs.
                            </p>
                            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                                <Link
                                    href={`mailto:${CONTACT_EMAIL}`}
                                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                                >
                                    Contact Security Team
                                </Link>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </Container>
        </main>
    );
}
