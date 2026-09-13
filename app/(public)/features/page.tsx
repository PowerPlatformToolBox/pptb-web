import { ArrowPathIcon, BellIcon, BoltIcon, Cog6ToothIcon, LinkIcon, LockClosedIcon, ShieldCheckIcon, SparklesIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";

import { Container } from "@/components/Container";
import { FadeIn } from "@/components/animations";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
    title: "Features",
    description: "Everything Power Platform ToolBox can do — from secure, isolated tool hosting to Dataverse connections, settings management, and auto-updates.",
    url: "/features",
});

const features = [
    {
        icon: WrenchScrewdriverIcon,
        title: "Tool Management",
        description: "Install and manage external tools built by 3rd parties via npm.",
    },
    {
        icon: LockClosedIcon,
        title: "Secure Tool Host",
        description: "VS Code Extension Host-inspired architecture for isolated tool execution.",
    },
    {
        icon: ShieldCheckIcon,
        title: "Per-Tool CSP",
        description: "Content Security Policy configuration with user consent for external resource access.",
    },
    {
        icon: LinkIcon,
        title: "Dataverse Connections",
        description: "Create and manage connections to Dataverse environments.",
    },
    {
        icon: Cog6ToothIcon,
        title: "Settings Management",
        description: "User settings for the ToolBox application, plus individual tool-specific settings.",
    },
    {
        icon: SparklesIcon,
        title: "Modern Interface",
        description: "Built with Microsoft Fluent UI components for a consistent, accessible experience aligned with Power Platform.",
    },
    {
        icon: BoltIcon,
        title: "Event-Driven API",
        description: "ToolBox provides its own APIs that emit events for tools to react to.",
    },
    {
        icon: BellIcon,
        title: "Notifications",
        description: "Built-in notification system to keep users informed.",
    },
    {
        icon: ArrowPathIcon,
        title: "Auto-Updates",
        description: "Automatic application updates with user control.",
    },
];

export default function FeaturesPage() {
    return (
        <main className="bg-slate-50">
            <section className="border-b border-slate-200 bg-linear-to-b from-white to-slate-50">
                <Container className="pt-20 pb-16 text-center lg:pt-32">
                    <FadeIn direction="up" delay={0.1}>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-700">Power Platform ToolBox</p>
                        <h1 className="mt-5 font-display text-4xl font-medium tracking-tight text-slate-900 sm:text-6xl">Everything the ToolBox can do</h1>
                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
                            A universal desktop app that contains multiple tools to ease the customization and configuration of Power Platform.
                        </p>
                    </FadeIn>
                </Container>
            </section>

            <Container className="py-16 lg:py-24">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature) => (
                            <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                                    <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h3>
                                <p className="mt-2 text-base text-slate-700">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
