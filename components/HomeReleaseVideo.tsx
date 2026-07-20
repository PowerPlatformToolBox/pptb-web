"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Container } from "@/components/Container";
import type { UpdateReleaseVideoMeta } from "@/lib/updates";

function formatDate(isoDate?: string): string | null {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function postPlayerCommand(iframe: HTMLIFrameElement, func: "playVideo" | "pauseVideo" | "mute" | "unMute" | "setVolume", args: Array<string | number> = []) {
    iframe.contentWindow?.postMessage(
        JSON.stringify({
            event: "command",
            func,
            args,
        }),
        "*",
    );
}

export function HomeReleaseVideo({ releaseTitle, description, video }: { releaseTitle: string; description?: string; video: UpdateReleaseVideoMeta }) {
    const sectionRef = useRef<HTMLElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [isInView, setIsInView] = useState(false);
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    useEffect(() => {
        const target = sectionRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.6);
            },
            {
                threshold: [0.2, 0.6, 0.9],
            },
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe || !isPlayerReady) return;

        if (isInView) {
            postPlayerCommand(iframe, "unMute");
            postPlayerCommand(iframe, "setVolume", [100]);
            postPlayerCommand(iframe, "playVideo");
            return;
        }

        postPlayerCommand(iframe, "pauseVideo");
    }, [isInView, isPlayerReady]);

    const publishedLabel = formatDate(video.publishedAt);

    return (
        <section ref={sectionRef} className="bg-slate-50 py-16 sm:py-20" aria-label="Latest release walkthrough video">
            <Container>
                <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-card">
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">Latest walkthrough video</span>
                        {video.duration && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 text-slate-500">
                                    <path d="M10 5.5v4l2.5 2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                                    <circle cx="10" cy="10" r="6.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                                {video.duration}
                            </span>
                        )}
                        {publishedLabel && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{publishedLabel}</span>}
                    </div>

                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{video.title || `${releaseTitle} walkthrough`}</h2>
                    <p className="mt-3 max-w-3xl text-base text-slate-600">{description ?? "Watch a guided walkthrough of the latest release improvements and fixes."}</p>

                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <div className="aspect-video w-full">
                            <iframe
                                ref={iframeRef}
                                className="h-full w-full"
                                src={`https://www.youtube.com/embed/${video.youtubeId}?enablejsapi=1&playsinline=1&rel=0`}
                                title={video.title || `${releaseTitle} walkthrough video`}
                                loading="lazy"
                                allow="autoplay; encrypted-media; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                                onLoad={() => setIsPlayerReady(true)}
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Link
                            href={video.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                        >
                            Open on YouTube
                        </Link>
                    </div>
                </div>
            </Container>
        </section>
    );
}
