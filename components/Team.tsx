import Link from "next/link";

import { Container } from "@/components/Container";
import { FadeIn, SlideIn } from "@/components/animations";

const lead = {
    name: "Danish Naglekar",
    alias: "Power Maverick",
    title: "Chief Tool Wrangler",
    description: "Builds the vision for Power Platform ToolBox and stewards the open-source roadmap.",
    linkedin: "https://www.linkedin.com/in/danishnaglekar/",
};

const supportingTeam = [
    {
        name: "Matt Berg",
        title: "The Product Whisperer",
        blurb: "Turns ideas into features and chaos into clarity.",
        linkedin: "https://www.linkedin.com/in/mattberg11/",
    },
    {
        name: "Carl Cookson",
        title: "Bug Crusher 🐞💥",
        blurb: "First to test, first to build, first to break things so others don’t.",
        linkedin: "https://www.linkedin.com/in/carlcookson/",
    },
    {
        name: "Lars Hildebrandt",
        title: "The Box Breaker 📦🚀",
        blurb: "Thinks beyond boundaries and makes bold ideas actually work.",
        linkedin: "https://www.linkedin.com/in/lars-hildebrandt-6209a437/",
    },
    {
        name: "Mohsin Mirza",
        title: "The Triple Threat ⚔️",
        blurb: "Tester, implementor, and tool author — a one-person strike team.",
        linkedin: "https://www.linkedin.com/in/mohsin-mirza-94210615/",
    },
    {
        name: "Oleksandr Olashyn",
        title: "The UI Polisher 🎨",
        blurb: "Refines the toolbox UI and elevates the overall experience.",
        linkedin: "https://www.linkedin.com/in/dancingwithcrm/",
    },
    {
        name: "Oliver Flint",
        title: "The Momentum Engine ⚡",
        blurb: "Generates ideas and relentlessly pushes the team forward.",
        linkedin: "https://www.linkedin.com/in/oliverflint/",
    },
    {
        name: "Mike Ochs",
        title: "The Idea Factory 💡",
        blurb: "Constantly brainstorming new features and improvements.",
        linkedin: "https://www.linkedin.com/in/mikefactorial/",
    },
];

export function Team() {
    return (
        <section id="team" className="relative overflow-hidden bg-slate-950 pt-20 pb-28 sm:py-32">
            <div className="absolute inset-0 opacity-80" aria-hidden="true">
                <div className="absolute inset-0 bg-gradient-to-br from-[#050810] via-[#101b37] to-[#2a0d46]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.35),transparent_55%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(147,51,234,0.4),transparent_50%)]" />
            </div>
            <Container className="relative">
                <FadeIn direction="up" delay={0.1}>
                    <p className="text-sm uppercase tracking-[0.4em] text-white">The humans behind the toolbox</p>
                    <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl text-white">Community-built, maker-driven</h2>
                    <p className="mt-4 max-w-3xl text-lg text-slate-300">
                        Power Platform ToolBox exists because makers across the community lend their time, ideas, and obsession for detail. Meet the core crew keeping the lights on and the features
                        shipping.
                    </p>
                </FadeIn>

                <FadeIn direction="up" delay={0.2}>
                    <div className="mt-16 grid gap-6 rounded-3xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-blue-600/20 p-8 shadow-2xl backdrop-blur">
                        <div className="flex flex-col gap-6 md:flex-row md:items-center">
                            <div className="flex-1">
                                <p className="text-sm uppercase tracking-[0.3em] text-blue-200">Created & maintained by</p>
                                <h3 className="mt-2 text-3xl font-semibold text-white">
                                    <Link href={lead.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 hover:text-blue-200 transition-colors">
                                        {lead.name}
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M20.447 20.452H16.89v-5.569c0-1.328-.024-3.037-1.852-3.037-1.853 0-2.136 1.447-2.136 2.941v5.665H9.345V9h3.41v1.561h.048c.476-.9 1.637-1.852 3.368-1.852 3.602 0 4.268 2.37 4.268 5.452v6.291zM5.337 7.433a1.985 1.985 0 01-1.985-1.983 1.985 1.985 0 011.985-1.984 1.985 1.985 0 11-.001 3.967zM7.119 20.452H3.554V9h3.565v11.452z" />
                                        </svg>
                                    </Link>
                                </h3>
                                <p className="text-lg text-slate-200">
                                    ({lead.alias}) — {lead.title}
                                </p>
                            </div>
                            <p className="flex-1 text-base text-slate-200">{lead.description}</p>
                        </div>
                        <div className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm text-slate-200">
                            If you&apos;d like to join the core team, reach out to {lead.name} ({lead.alias}) for onboarding.
                        </div>
                    </div>
                </FadeIn>

                <SlideIn direction="up" delay={0.3}>
                    <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {supportingTeam.map((member) => (
                            <div
                                key={member.name}
                                className="group h-full rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-100 shadow-xl transition hover:-translate-y-1 hover:border-white/40 hover:bg-white/10"
                            >
                                <p className="text-sm font-semibold text-blue-200">{member.title}</p>
                                <h3 className="mt-2 text-xl font-semibold text-white">
                                    <Link href={member.linkedin || "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-blue-200 transition-colors">
                                        {member.name}
                                        {member.linkedin && (
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                <path d="M20.447 20.452H16.89v-5.569c0-1.328-.024-3.037-1.852-3.037-1.853 0-2.136 1.447-2.136 2.941v5.665H9.345V9h3.41v1.561h.048c.476-.9 1.637-1.852 3.368-1.852 3.602 0 4.268 2.37 4.268 5.452v6.291zM5.337 7.433a1.985 1.985 0 01-1.985-1.983 1.985 1.985 0 011.985-1.984 1.985 1.985 0 11-.001 3.967zM7.119 20.452H3.554V9h3.565v11.452z" />
                                            </svg>
                                        )}
                                    </Link>
                                </h3>
                                <p className="mt-3 text-base text-slate-300">{member.blurb}</p>
                            </div>
                        ))}
                    </div>
                </SlideIn>

                <FadeIn direction="up" delay={0.4}>
                    <div className="mt-16 flex flex-wrap items-center gap-4 rounded-2xl border border-white/15 bg-white/5 px-6 py-5 text-sm text-slate-200">
                        <span>Want to contribute a tool or help shape the roadmap?</span>
                        <Link
                            href="https://discord.gg/efwAu9sXyJ"
                            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-white transition hover:border-white hover:bg-white/10"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Join the Discord
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.211.375-.444.864-.608 1.248-1.844-.276-3.68-.276-5.486 0-.164-.398-.406-.873-.617-1.248a.077.077 0 00-.079-.037 19.736 19.736 0 00-4.885 1.515.07.07 0 00-.032.028C2.18 9.045 1.399 13.58 1.819 18.058a.082.082 0 00.031.056 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.105 12.305 12.305 0 01-1.75-.83.077.077 0 01-.008-.128c.117-.089.234-.178.346-.27a.074.074 0 01.077-.01c3.676 1.688 7.647 1.688 11.287 0a.074.074 0 01.078.009c.112.092.229.183.346.271a.077.077 0 01-.007.128c-.558.325-1.142.6-1.751.83a.076.076 0 00-.04.106c.376.699.788 1.363 1.225 1.993a.077.077 0 00.084.029 19.87 19.87 0 005.994-3.03.077.077 0 00.03-.055c.5-5.177-.838-9.673-3.548-13.661a.061.061 0 00-.031-.029zM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.955 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.419 0 1.333-.947 2.419-2.157 2.419z" />
                            </svg>
                        </Link>
                    </div>
                </FadeIn>
            </Container>
        </section>
    );
}
