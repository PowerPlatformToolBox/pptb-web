import Link from "next/link";

import type { UpdateReleaseVideoMeta } from "@/lib/updates";

function parseTimestampToSeconds(timestamp: string): number | null {
    const parts = timestamp
        .split(":")
        .map((part) => Number(part.trim()))
        .filter((part) => Number.isFinite(part));

    if (parts.length === 0 || parts.length > 3) {
        return null;
    }

    if (parts.length === 1) {
        return parts[0];
    }

    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }

    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
        return isoDate;
    }

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export function ReleaseVideoCard({ releaseTitle, video }: { releaseTitle: string; video: UpdateReleaseVideoMeta }) {
    return (
        <section id="release-video" className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card" aria-labelledby="release-video-title">
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Release walkthrough</span>
                    {video.duration && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {video.duration && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 text-slate-500">
                                        <path d="M10 5.5v4l2.5 2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                                        <circle cx="10" cy="10" r="6.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                    </svg>
                                    {video.duration}
                                </span>
                            )}
                        </span>
                    )}
                    {video.publishedAt && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{formatDate(video.publishedAt)}</span>}
                </div>

                <div>
                    <h2 id="release-video-title" className="text-2xl font-bold tracking-tight text-slate-900">
                        {video.title || `${releaseTitle} video walkthrough`}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">Watch the release highlights and walkthrough for this version.</p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    <div className="aspect-video w-full">
                        <iframe
                            className="h-full w-full"
                            src={`https://www.youtube.com/embed/${video.youtubeId}?rel=0`}
                            title={video.title || `${releaseTitle} video walkthrough`}
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                        Watch on YouTube
                    </Link>
                </div>

                {video.highlights && video.highlights.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Key moments</h3>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
                            {video.highlights.map((highlight) => (
                                <li key={highlight}>{highlight}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {video.chapters && video.chapters.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Chapters</h3>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                            {video.chapters.map((chapter) => {
                                const chapterSeconds = parseTimestampToSeconds(chapter.timestamp);
                                const chapterUrl = chapterSeconds === null ? video.url : `${video.url}&t=${chapterSeconds}s`;

                                return (
                                    <li key={`${chapter.timestamp}-${chapter.label}`}>
                                        <Link href={chapterUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue hover:underline underline-offset-4">
                                            {chapter.timestamp}
                                        </Link>{" "}
                                        {chapter.label}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </section>
    );
}
