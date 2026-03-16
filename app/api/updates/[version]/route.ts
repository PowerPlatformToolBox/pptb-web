import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getUpdateRelease, normalizeUpdateSlug } from "@/lib/updates";

export const revalidate = 60;

export async function GET(request: NextRequest, { params }: { params: Promise<{ version: string }> }) {
    const { version } = await params;
    const format = request.nextUrl.searchParams.get("format");

    const normalized = normalizeUpdateSlug(version);
    const release = await getUpdateRelease(normalized).catch(() => null);
    if (!release) {
        return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    if (format === "json") {
        return NextResponse.json(release);
    }

    // Default: raw markdown body.
    return new NextResponse(release.markdown, {
        status: 200,
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
        },
    });
}
