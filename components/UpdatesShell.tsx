import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/Container";
import { UpdatesMarkdown } from "@/components/UpdatesMarkdown";
import type { UpdateRelease, UpdateReleaseMeta } from "@/lib/updates";

function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export function UpdatesShell({ releases, current, latestSlug }: { releases: UpdateReleaseMeta[]; current: UpdateRelease; latestSlug: string }) {
    return (
        <main className="bg-slate-50">
            <Container className="py-12 sm:py-16">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[16rem_minmax(0,1fr)_14rem]">
                    {/* Left: timeline */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-24">
                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-card">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</p>
                                <nav className="mt-4">
                                    <ol className="space-y-1">
                                        {releases.map((release) => {
                                            const isActive = release.slug === current.meta.slug;
                                            return (
                                                <li key={release.slug}>
                                                    <Link
                                                        href={release.slug === latestSlug ? "/updates" : `/updates/${release.slug}`}
                                                        className={clsx(
                                                            "block rounded-2xl px-3 py-2 transition",
                                                            isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                                                        )}
                                                    >
                                                        <div className="text-sm font-semibold">{release.title}</div>
                                                        {release.date && <div className="mt-0.5 text-xs text-slate-500">{formatDate(release.date)}</div>}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </aside>

                    {/* Center: release content */}
                    <article className="min-w-0">
                        <header className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card">
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{current.meta.title}</span>
                                    {current.meta.date && <span className="text-xs font-semibold text-slate-500">{formatDate(current.meta.date)}</span>}
                                </div>
                                {current.meta.description && <p className="text-base text-slate-600">{current.meta.description}</p>}

                                {current.meta.heroImage && (
                                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                        <Image src={current.meta.heroImage} alt="Release hero image" width={1200} height={630} className="h-auto w-full object-cover" priority />
                                    </div>
                                )}
                            </div>
                        </header>

                        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card">
                            <UpdatesMarkdown markdown={current.markdown} />
                        </div>
                    </article>

                    {/* Right: on this page */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-24">
                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-card">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">On this page</p>
                                {current.toc.length === 0 ? (
                                    <p className="mt-4 text-sm text-slate-600">No sections found.</p>
                                ) : (
                                    <nav className="mt-4">
                                        <ol className="space-y-2">
                                            {current.toc.map((item) => (
                                                <li key={item.id} className={item.level === 3 ? "pl-3" : undefined}>
                                                    <a href={`#${item.id}`} className={clsx("block text-sm font-semibold text-slate-600 hover:text-slate-900", item.level === 3 && "text-slate-500")}>
                                                        {item.text}
                                                    </a>
                                                </li>
                                            ))}
                                        </ol>
                                    </nav>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </Container>
        </main>
    );
}
