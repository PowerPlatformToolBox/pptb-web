import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/Container";
import { FadeIn } from "@/components/animations";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
    title: "Project Alumni",
    description: "Recognizing the people who helped build and shape Power Platform ToolBox.",
    url: "/project-alumni",
});

const projectAlumni = [
    {
        name: "Oleksandr Olashyn",
        linkedin: "https://www.linkedin.com/in/dancingwithcrm/",
    },
    {
        name: "Mike Ochs",
        linkedin: "https://www.linkedin.com/in/mikefactorial/",
    },
];

export default function ProjectAlumniPage() {
    return (
        <main className="bg-slate-50">
            <section className="border-b border-slate-200 bg-linear-to-b from-white to-slate-50">
                <Container className="pt-20 pb-16 text-center lg:pt-32">
                    <FadeIn direction="up" delay={0.1}>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-700">Power Platform ToolBox</p>
                        <h1 className="mt-5 font-display text-4xl font-medium tracking-tight text-slate-900 sm:text-6xl">Project Alumni</h1>
                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-700">
                            This page recognizes people who helped build and shape Power Platform ToolBox. We&apos;re grateful for the time, ideas, and care they contributed.
                        </p>
                    </FadeIn>
                </Container>
            </section>

            <Container className="py-16 lg:py-24">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
                        {projectAlumni.map((member) => (
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
        </main>
    );
}
