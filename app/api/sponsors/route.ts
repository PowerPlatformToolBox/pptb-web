import { NextResponse } from "next/server";
import { fetchGitHubSponsors } from "@/lib/github-api";

// Revalidate every 5 minutes (300 seconds)
export const revalidate = 300;

export async function GET() {
    try {
        const token = process.env.GITHUB_TOKEN;

        if (!token) {
            console.warn("GITHUB_TOKEN not configured, returning empty sponsors list");
            return NextResponse.json([]);
        }

        const sponsors = await fetchGitHubSponsors("PowerPlatformToolBox", token);
        return NextResponse.json(sponsors);
    } catch (error) {
        console.error("Error fetching sponsors:", error);
        return NextResponse.json({ error: "Failed to fetch sponsors" }, { status: 500 });
    }
}
