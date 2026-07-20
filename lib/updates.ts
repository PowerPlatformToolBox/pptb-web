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
    video?: UpdateReleaseVideoMeta;
};

export type UpdateReleaseVideoChapter = {
    label: string;
    timestamp: string;
};

export type UpdateReleaseVideoMeta = {
    url: string;
    youtubeId: string;
    title?: string;
    thumbnail?: string;
    duration?: string;
    publishedAt?: string;
    highlights?: string[];
    chapters?: UpdateReleaseVideoChapter[];
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

function parseStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const normalized = value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    return normalized.length > 0 ? normalized : undefined;
}

function parseVideoChapters(value: unknown): UpdateReleaseVideoChapter[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const chapters: UpdateReleaseVideoChapter[] = [];

    for (const item of value) {
        if (!item || typeof item !== "object") {
            continue;
        }

        const label = typeof (item as { label?: unknown }).label === "string" ? (item as { label: string }).label.trim() : "";
        const timestamp = typeof (item as { timestamp?: unknown }).timestamp === "string" ? (item as { timestamp: string }).timestamp.trim() : "";

        if (!label || !timestamp) {
            continue;
        }

        chapters.push({ label, timestamp });
    }

    return chapters.length > 0 ? chapters : undefined;
}

function extractYouTubeVideoId(rawUrl: string): string | undefined {
    let parsed: URL;

    try {
        parsed = new URL(rawUrl);
    } catch {
        return undefined;
    }

    const host = parsed.hostname.toLowerCase();
    const normalizedHost = host.startsWith("www.") ? host.slice(4) : host;
    const isYouTubeHost = normalizedHost === "youtube.com" || normalizedHost === "youtu.be" || normalizedHost === "youtube-nocookie.com";

    if (!isYouTubeHost) {
        return undefined;
    }

    if (normalizedHost === "youtu.be") {
        const idFromPath = parsed.pathname.split("/").filter(Boolean)[0];
        if (idFromPath) {
            return idFromPath;
        }
    }

    const watchVideoId = parsed.searchParams.get("v");
    if (watchVideoId) {
        return watchVideoId;
    }

    const [firstSegment, secondSegment] = parsed.pathname.split("/").filter(Boolean);
    if (firstSegment === "shorts" || firstSegment === "embed") {
        return secondSegment;
    }

    return undefined;
}

function parseReleaseVideoMeta(frontmatter: Record<string, unknown>): UpdateReleaseVideoMeta | undefined {
    const videoUrl = typeof frontmatter.videoUrl === "string" ? frontmatter.videoUrl.trim() : "";
    if (!videoUrl) {
        return undefined;
    }

    const youtubeId = extractYouTubeVideoId(videoUrl);
    if (!youtubeId) {
        return undefined;
    }

    const video: UpdateReleaseVideoMeta = {
        url: `https://www.youtube.com/watch?v=${youtubeId}`,
        youtubeId,
        title: typeof frontmatter.videoTitle === "string" ? frontmatter.videoTitle.trim() : undefined,
        thumbnail: typeof frontmatter.videoThumbnail === "string" ? frontmatter.videoThumbnail.trim() : undefined,
        duration: typeof frontmatter.videoDuration === "string" ? frontmatter.videoDuration.trim() : undefined,
        publishedAt: typeof frontmatter.videoPublishedAt === "string" ? frontmatter.videoPublishedAt.trim() : undefined,
        highlights: parseStringArray(frontmatter.videoHighlights),
        chapters: parseVideoChapters(frontmatter.videoChapters),
    };

    return video;
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
    const frontmatter = parsed.data ?? {};

    const title = typeof frontmatter.title === "string" ? frontmatter.title : slug;
    const date = typeof frontmatter.date === "string" ? frontmatter.date : "";
    const description = typeof frontmatter.description === "string" ? frontmatter.description : undefined;
    const heroImage = typeof frontmatter.heroImage === "string" ? frontmatter.heroImage : undefined;
    const video = parseReleaseVideoMeta(frontmatter);

    const meta: UpdateReleaseMeta = {
        slug,
        title,
        date,
        description,
        heroImage,
        video,
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

export function hasReleaseVideo(release: UpdateReleaseMeta): boolean {
    return Boolean(release.video);
}

export async function getLatestUpdateReleaseWithVideoSlug(): Promise<string | null> {
    const releases = await listUpdateReleases();
    const latestWithVideo = releases.find((release) => hasReleaseVideo(release));
    return latestWithVideo?.slug ?? null;
}
