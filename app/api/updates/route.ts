import { NextResponse } from "next/server";

import { getLatestUpdateReleaseSlug, listUpdateReleases } from "@/lib/updates";

// Revalidate periodically so clients can cache, while updates still propagate.
export const revalidate = 60;

export async function GET() {
    try {
        const releases = await listUpdateReleases();
        const latest = await getLatestUpdateReleaseSlug();

        return NextResponse.json({
            latest,
            releases,
        });
    } catch (error) {
        console.error("Error listing updates:", error);
        return NextResponse.json({ error: "Failed to list updates" }, { status: 500 });
    }
}
