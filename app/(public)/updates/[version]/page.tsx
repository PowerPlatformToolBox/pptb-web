import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UpdatesShell } from "@/components/UpdatesShell";
import { defaultOpenGraph, defaultTwitter } from "@/lib/metadata";
import { getLatestUpdateReleaseSlug, getUpdateRelease, listUpdateReleases, normalizeUpdateSlug } from "@/lib/updates";

export const dynamicParams = true;

function parseClockToISO8601Duration(input: string): string | undefined {
    if (/^P/i.test(input)) {
        return input;
    }

    const parts = input
        .split(":")
        .map((part) => Number(part.trim()))
        .filter((part) => Number.isFinite(part));

    if (parts.length === 0 || parts.length > 3) {
        return undefined;
    }

    const [hours, minutes, seconds] = parts.length === 3 ? [parts[0], parts[1], parts[2]] : parts.length === 2 ? [0, parts[0], parts[1]] : [0, 0, parts[0]];

    const hasAny = hours > 0 || minutes > 0 || seconds > 0;
    if (!hasAny) {
        return "PT0S";
    }

    return `PT${hours > 0 ? `${hours}H` : ""}${minutes > 0 ? `${minutes}M` : ""}${seconds > 0 ? `${seconds}S` : ""}`;
}

export async function generateStaticParams() {
    const releases = await listUpdateReleases();
    return releases.map((release) => ({ version: release.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ version: string }> }): Promise<Metadata> {
    const { version } = await params;
    const normalized = normalizeUpdateSlug(version);

    try {
        const release = await getUpdateRelease(normalized);
        const title = `${release.meta.title} Updates | Power Platform ToolBox`;
        const description = release.meta.description ?? "Release notes and updates for Power Platform ToolBox.";
        const hero = release.meta.heroImage;

        return {
            title,
            description,
            openGraph: {
                ...defaultOpenGraph,
                title,
                description,
                url: `/updates/${release.meta.slug}`,
                images: hero
                    ? [
                          {
                              url: hero,
                              alt: `${release.meta.title} hero image`,
                          },
                      ]
                    : defaultOpenGraph.images,
            },
            twitter: {
                ...defaultTwitter,
                title,
                description,
                images: hero ? [hero] : defaultTwitter.images,
            },
        };
    } catch {
        return {
            title: "Updates | Power Platform ToolBox",
        };
    }
}

export default async function UpdatesVersionPage({ params }: { params: Promise<{ version: string }> }) {
    const { version } = await params;
    const normalized = normalizeUpdateSlug(version);

    const releases = await listUpdateReleases();
    const latestSlug = await getLatestUpdateReleaseSlug();

    const current = await getUpdateRelease(normalized).catch(() => null);
    if (!current) {
        notFound();
    }

    const video = current.meta.video;
    const videoJsonLd =
        video &&
        JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: video.title || `${current.meta.title} video walkthrough`,
            description: current.meta.description || `Video walkthrough for ${current.meta.title}`,
            thumbnailUrl: video.thumbnail || `https://i.ytimg.com/vi/${video.youtubeId}/maxresdefault.jpg`,
            uploadDate: video.publishedAt,
            duration: video.duration ? parseClockToISO8601Duration(video.duration) : undefined,
            embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
            contentUrl: video.url,
        });

    return (
        <>
            {videoJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: videoJsonLd }} />}
            <UpdatesShell releases={releases} current={current} latestSlug={latestSlug} />
        </>
    );
}
