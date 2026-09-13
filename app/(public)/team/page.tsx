import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/Container";
import { Team } from "@/components/Team";
import { FadeIn } from "@/components/animations";
import { alumni, discordInviteUrl, openRoles } from "@/lib/constants/team";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
    title: "Team",
    description: "Meet the community-driven team behind Power Platform ToolBox, our project alumni, and the open roles we're looking to fill.",
    url: "/team",
});

export default function TeamPage() {
    return (
        <main className="bg-slate-50">
            <Team />

            <section id="alumni" className="border-b border-slate-200 bg-linear-to-b from-white to-slate-50">
                <Container className="pt-16 pb-16 text-center lg:pt-24">
                    <FadeIn direction="up" delay={0.1}>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-700">Power Platform ToolBox</p>
                        <h2 className="mt-5 font-display text-4xl font-medium tracking-tight text-slate-900 sm:text-5xl">Project Alumni</h2>
                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
                            This section recognizes people who helped build and shape Power Platform ToolBox. We&apos;re grateful for the time, ideas, and care they contributed.
                        </p>
                    </FadeIn>
                </Container>
            </section>

            <Container className="py-16 lg:py-24">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
                        {alumni.map((member) => (
                            <Link
                                key={member.name}
                                href={member.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-6 py-5 text-lg font-semibold text-slate-900 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                            >
                                {member.name}
                                <svg className="h-5 w-5 text-slate-500 transition group-hover:text-blue-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M20.447 20.452H16.89v-5.569c0-1.328-.024-3.037-1.852-3.037-1.853 0-2.136 1.447-2.136 2.941v5.665H9.345V9h3.41v1.561h.048c.476-.9 1.637-1.852 3.368-1.852 3.602 0 4.268 2.37 4.268 5.452v6.291zM5.337 7.433a1.985 1.985 0 01-1.985-1.983 1.985 1.985 0 011.985-1.984 1.985 1.985 0 11-.001 3.967zM7.119 20.452H3.554V9h3.565v11.452z" />
                                </svg>
                            </Link>
                        ))}
                    </div>
                </FadeIn>
            </Container>

            <section id="open-roles" className="border-t border-slate-200 bg-white">
                <Container className="py-16 lg:py-24">
                    <FadeIn direction="up" delay={0.1}>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-700">Join us</p>
                        <h2 className="mt-5 font-display text-4xl font-medium tracking-tight text-slate-900 sm:text-5xl">Open Roles</h2>
                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
                            We&apos;re a volunteer-run, community-first project and always looking for makers to join the core team.
                        </p>
                    </FadeIn>
                    <FadeIn direction="up" delay={0.2}>
                        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
                            {openRoles.map((role) => (
                                <div key={role.title} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                                    <h3 className="text-xl font-semibold text-slate-900">{role.title}</h3>
                                    <p className="mt-3 flex-1 text-base text-slate-700">{role.description}</p>
                                    <Link
                                        href={discordInviteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-6 inline-flex items-center gap-2 self-start rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50"
                                    >
                                        Interested? Join the Discord
                                        <span aria-hidden="true">&rarr;</span>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </FadeIn>
                </Container>
            </section>
        </main>
    );
}
