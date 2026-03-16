import fs from "node:fs/promises";
import path from "node:path";

import GithubSlugger from "github-slugger";
import matter from "gray-matter";

export type UpdateReleaseMeta = {
    slug: string;
    title: string;
    date: string;
    description?: string;
    heroImage?: string;
};

export type TocItem = {
    id: string;
    text: string;
    level: 2 | 3;
};

export type UpdateRelease = {
    meta: UpdateReleaseMeta;
    markdown: string;
    toc: TocItem[];
};

const UPDATES_DIR = path.join(process.cwd(), "content", "updates");
const INSIDER_SLUG = "insider";

function safeParseDate(isoDate: string): number {
    const time = Date.parse(isoDate);
    return Number.isFinite(time) ? time : 0;
}

function assertSafeSlug(slug: string) {
    // Avoid path traversal. Keep it simple: allow letters, numbers, dash, underscore, dot.
    if (!/^[a-zA-Z0-9._-]+$/.test(slug)) {
        throw new Error(`Invalid updates slug: ${slug}`);
    }
}

function isDevBuildSlug(slug: string): boolean {
    // Example: v1.2.1-dev.20260315
    return /-dev\./i.test(slug);
}

export function normalizeUpdateSlug(inputSlug: string): string {
    const slug = inputSlug.trim();

    // Bundle all dev builds into the Insider page.
    if (isDevBuildSlug(slug)) {
        return INSIDER_SLUG;
    }

    // Accept common tag format (v1.2.0) and map to our file slug (v1_2_0).
    if (/^v\d+\.\d+\.\d+$/i.test(slug)) {
        return slug.replace(/\./g, "_");
    }

    // Canonicalize the Insider slug.
    if (slug.toLowerCase() === INSIDER_SLUG) {
        return INSIDER_SLUG;
    }

    // Back-compat: previously used as a placeholder update entry.
    if (slug.toLowerCase() === "v1_2_1") {
        return INSIDER_SLUG;
    }

    return slug;
}

function normalizeHeadingText(raw: string): string {
    // Small, pragmatic normalizer to keep TOC IDs stable.
    // This matches typical release notes heading style (no complex inline markup).
    return raw
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/_([^_]+)_/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/<[^>]+>/g, "")
        .trim();
}

function extractToc(markdown: string): TocItem[] {
    const slugger = new GithubSlugger();
    const toc: TocItem[] = [];

    const lines = markdown.split(/\r?\n/);
    let inFence = false;
    let fenceMarker: "```" | "~~~" | null = null;

    for (const line of lines) {
        const fenceMatch = line.match(/^\s*(```|~~~)/);
        if (fenceMatch) {
            const marker = fenceMatch[1] as "```" | "~~~";
            if (!inFence) {
                inFence = true;
                fenceMarker = marker;
            } else if (fenceMarker === marker) {
                inFence = false;
                fenceMarker = null;
            }
            continue;
        }

        if (inFence) continue;

        const headingMatch = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
        if (!headingMatch) continue;

        const level = headingMatch[1].length as 2 | 3;
        const text = normalizeHeadingText(headingMatch[2]);
        if (!text) continue;

        toc.push({
            id: slugger.slug(text),
            text,
            level,
        });
    }

    return toc;
}

async function readReleaseFile(slug: string): Promise<{ meta: UpdateReleaseMeta; markdown: string; toc: TocItem[] }> {
    assertSafeSlug(slug);
    const fullPath = path.join(UPDATES_DIR, `${slug}.md`);

    const fileContents = await fs.readFile(fullPath, "utf8");
    const parsed = matter(fileContents);

    const title = typeof parsed.data?.title === "string" ? parsed.data.title : slug;
    const date = typeof parsed.data?.date === "string" ? parsed.data.date : "";
    const description = typeof parsed.data?.description === "string" ? parsed.data.description : undefined;
    const heroImage = typeof parsed.data?.heroImage === "string" ? parsed.data.heroImage : undefined;

    const meta: UpdateReleaseMeta = {
        slug,
        title,
        date,
        description,
        heroImage,
    };

    return {
        meta,
        markdown: parsed.content.trim() + "\n",
        toc: extractToc(parsed.content),
    };
}

export async function listUpdateReleases(): Promise<UpdateReleaseMeta[]> {
    const entries = await fs.readdir(UPDATES_DIR, { withFileTypes: true });
    const slugs = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).map((entry) => entry.name.replace(/\.md$/, ""));

    const metas = await Promise.all(
        slugs.map(async (slug) => {
            const { meta } = await readReleaseFile(slug);
            return meta;
        }),
    );

    return metas.sort((a, b) => safeParseDate(b.date) - safeParseDate(a.date));
}

export async function getUpdateRelease(slug: string): Promise<UpdateRelease> {
    const normalized = normalizeUpdateSlug(slug);
    const { meta, markdown, toc } = await readReleaseFile(normalized);
    return { meta, markdown, toc };
}

export async function getLatestUpdateReleaseSlug(): Promise<string> {
    const releases = await listUpdateReleases();
    if (releases.length === 0) {
        throw new Error("No update releases found in content/updates");
    }

    const latestNonInsider = releases.find((r) => r.slug.toLowerCase() !== INSIDER_SLUG);
    return (latestNonInsider ?? releases[0]).slug;
}
