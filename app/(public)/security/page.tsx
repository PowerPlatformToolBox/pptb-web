import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/Container";
import { FadeIn } from "@/components/animations";
import { buildPageMetadata } from "@/lib/metadata";

const CONTACT_EMAIL = "powermaverick.tools@outlook.com";
const SECURITY_DOC_URL = "https://github.com/PowerPlatformToolBox/pptb-web/blob/main/artifacts/security";
const DESKTOP_APP_REPO_URL = "https://github.com/PowerPlatformToolBox/desktop-app";
const DESKTOP_APP_RELEASES_URL = "https://github.com/PowerPlatformToolBox/desktop-app/releases";

export const metadata: Metadata = buildPageMetadata({
    title: "Security & Trust | Power Platform ToolBox",
    description: "Review the security controls, architecture, and artifacts of the Power Platform ToolBox desktop app so enterprise reviewers and compliance teams can evaluate risk with confidence.",
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
                            The Power Platform ToolBox <strong>desktop app</strong>—the Electron-based client makers install on Windows, macOS, and Linux—ships with a pragmatic, transparent security
                            posture so information security reviewers can quickly evaluate risk, understand data flows, and approve usage inside their organization. This site (pptb-web) only hosts the
                            tool catalog, documentation, and community pages; the controls below describe the downloadable application itself.
                        </p>
                    </FadeIn>
                    <FadeIn direction="up" delay={0.35}>
                        <div className="mt-10 flex flex-col items-center gap-4 text-sm text-slate-600 sm:flex-row sm:justify-center">
                            <div className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-900">Distributed via GitHub Releases</div>
                            <div className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-900">Open source (GPL-3.0)</div>
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
                                    PPTB is a cross-platform Electron desktop application that installs community-built tools from an npm-based registry and runs them locally within an isolated, VS
                                    Code Extension Host-inspired &ldquo;Secure Tool Host.&rdquo; No customer Dataverse data is routed through PPTB-operated infrastructure—connections, credentials, and
                                    tokens stay on the user&apos;s device, and administrators retain full control over environments.
                                </p>
                            </div>
                            <dl className="space-y-4">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <dt className="text-sm font-semibold text-slate-900">Data storage</dt>
                                    <dd className="mt-2 text-sm text-slate-600">
                                        Connection details, settings, and auth tokens are kept locally on the device. Supabase is used only to serve the public tool catalog/registry metadata—never
                                        customer Dataverse data.
                                    </dd>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <dt className="text-sm font-semibold text-slate-900">Authentication</dt>
                                    <dd className="mt-2 text-sm text-slate-600">
                                        Uses Microsoft Entra ID (Azure AD) OAuth flows via the official <code>@azure/msal-node</code> library to sign in and connect to Dataverse/Power Platform
                                        environments.
                                    </dd>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <dt className="text-sm font-semibold text-slate-900">Distribution</dt>
                                    <dd className="mt-2 text-sm text-slate-600">
                                        Installers are code-signed (Azure Trusted Signing on Windows, Apple notarization on macOS) and published as GitHub Releases, so organizations can verify and
                                        mirror packages internally.
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
                                    ✅ <span className="font-semibold">Secure Tool Host:</span> Each installed tool runs in an isolated, VS Code Extension Host-inspired process so one tool cannot read
                                    or interfere with another.
                                </li>
                                <li>
                                    ✅ <span className="font-semibold">Per-tool Content Security Policy:</span> Tools must declare and request explicit user consent before reaching external resources
                                    beyond their sandboxed baseline.
                                </li>
                                <li>
                                    ✅ <span className="font-semibold">Signed &amp; notarized releases:</span> Windows binaries are signed with Azure Trusted Signing and macOS builds are notarized by
                                    Apple before publication—unsigned artifacts never reach end users.
                                </li>
                                <li>
                                    ✅ <span className="font-semibold">Hardened deep links:</span> The <code>pptb://</code> protocol handler validates and rate-limits install requests and always
                                    requires explicit user confirmation before installing a tool.
                                </li>
                                <li>
                                    ✅ <span className="font-semibold">Transparent code:</span> The entire desktop app is open-source (GPL-3.0) so internal security teams can audit, fork, or build
                                    custom policies.
                                </li>
                                <li>
                                    ✅ <span className="font-semibold">Continuous scanning:</span> CodeQL static analysis runs against every change, and a Snyk project monitors every repository across
                                    the PowerPlatformToolBox organization for vulnerable open-source dependencies and license issues.
                                </li>
                                <li>
                                    ✅ <span className="font-semibold">Controlled auto-updates:</span> <code>electron-updater</code> keeps installations current, with user visibility and control over
                                    when updates apply.
                                </li>
                                <li>
                                    ✅ <span className="font-semibold">Optional telemetry:</span> Error tracking via Sentry is on by default to help diagnose issues, and can be disabled at any time in
                                    application settings.
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
                                        <li>• Software bill of materials (SBOM) for the desktop app</li>
                                        <li>• Threat model outline with data-flow diagrams</li>
                                        <li>• Secure coding checklist aligned to OWASP</li>
                                        <li>• Release notes documenting security fixes</li>
                                    </ul>
                                </div>
                                <div className="rounded-2xl bg-white/80 p-5 shadow-sm">
                                    <h3 className="text-lg font-semibold text-slate-900">What we ask from you</h3>
                                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                        <li>• Download installers only from official GitHub releases</li>
                                        <li>• Verify code-signing/notarization before distribution</li>
                                        <li>• Keep auto-updates enabled or patch on a regular cadence</li>
                                        <li>• Share findings so we can harden the platform</li>
                                    </ul>
                                </div>
                            </div>
                            <p className="mt-6 text-sm text-slate-500">
                                Review the desktop app source and release history at
                                <Link href={DESKTOP_APP_REPO_URL} target="_blank" rel="noopener noreferrer" className="ml-1 font-semibold text-blue-600 underline-offset-4 hover:underline">
                                    PowerPlatformToolBox/desktop-app
                                </Link>
                                , download signed installers from the
                                <Link href={DESKTOP_APP_RELEASES_URL} target="_blank" rel="noopener noreferrer" className="ml-1 font-semibold text-blue-600 underline-offset-4 hover:underline">
                                    releases page
                                </Link>
                                , or browse our existing security artifacts at
                                <Link href={SECURITY_DOC_URL} target="_blank" rel="noopener noreferrer" className="ml-1 font-semibold text-blue-600 underline-offset-4 hover:underline">
                                    artifacts/security
                                </Link>
                                .
                            </p>
                        </div>
                    </FadeIn>

                    <FadeIn direction="up" delay={0.4}>
                        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
                            <h2 className="text-2xl font-semibold text-slate-900">Need deeper details?</h2>
                            <p className="mt-4 text-base text-slate-600">
                                We partner with enterprise security, compliance, and procurement teams through our sponsorship program. White-glove service provides detailed responses to security
                                questions and questionnaire completion for sponsoring organizations.
                            </p>
                            <div className="mt-6 rounded-2xl bg-slate-50 p-6">
                                <h3 className="text-base font-semibold text-slate-900">White-glove service includes:</h3>
                                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                    <li>• Responses to up to 5 security-related questions or questionnaire items</li>
                                    <li>• Additional question blocks available ($200 per 5 questions)</li>
                                </ul>
                                <p className="mt-3 text-xs text-slate-500">Response time varies based on the information requested.</p>
                            </div>
                            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                                <Link
                                    href="https://github.com/sponsors/PowerPlatformToolBox/sponsorships?tier_id=580381"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                                >
                                    Become a Sponsor
                                </Link>
                                <Link
                                    href={`mailto:${CONTACT_EMAIL}`}
                                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
                                >
                                    Contact Us
                                </Link>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </Container>
        </main>
    );
}
