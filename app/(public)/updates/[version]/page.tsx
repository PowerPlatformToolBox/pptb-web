import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UpdatesShell } from "@/components/UpdatesShell";
import { defaultOpenGraph, defaultTwitter } from "@/lib/metadata";
import { getLatestUpdateReleaseSlug, getUpdateRelease, listUpdateReleases, normalizeUpdateSlug } from "@/lib/updates";

export const dynamicParams = true;

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

    return <UpdatesShell releases={releases} current={current} latestSlug={latestSlug} />;
}
