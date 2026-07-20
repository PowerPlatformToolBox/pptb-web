import type { Metadata } from "next";

import { UpdatesShell } from "@/components/UpdatesShell";
import { defaultOpenGraph, defaultTwitter } from "@/lib/metadata";
import { getLatestUpdateReleaseSlug, getLatestUpdateReleaseWithVideoSlug, getUpdateRelease, hasReleaseVideo, listUpdateReleases } from "@/lib/updates";

export async function generateMetadata(): Promise<Metadata> {
    const latestSlug = await getLatestUpdateReleaseSlug();
    const latest = await getUpdateRelease(latestSlug);

    const title = `Updates | Power Platform ToolBox`;
    const description = latest.meta.description ?? "Release notes and updates for Power Platform ToolBox.";
    const hero = latest.meta.heroImage;

    return {
        title,
        description,
        openGraph: {
            ...defaultOpenGraph,
            title,
            description,
            url: "/updates",
            images: hero
                ? [
                      {
                          url: hero,
                          alt: `${latest.meta.title} hero image`,
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
}

export default async function UpdatesPage({ searchParams }: { searchParams?: Promise<{ hasVideo?: string }> }) {
    const hasVideoFilterEnabled = (await searchParams)?.hasVideo === "true";
    const releases = await listUpdateReleases();
    const latestSlug = await getLatestUpdateReleaseSlug();

    const releasesToShow = hasVideoFilterEnabled ? releases.filter(hasReleaseVideo) : releases;
    const latestWithVideoSlug = hasVideoFilterEnabled ? await getLatestUpdateReleaseWithVideoSlug() : null;
    const currentSlug = latestWithVideoSlug ?? latestSlug;
    const current = await getUpdateRelease(currentSlug);

    return <UpdatesShell releases={releasesToShow.length > 0 ? releasesToShow : releases} current={current} latestSlug={latestSlug} />;
}
