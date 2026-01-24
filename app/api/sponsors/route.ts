import { NextResponse } from "next/server";

interface GitHubSponsor {
    sponsorEntity: {
        login: string;
        name: string | null;
        avatarUrl: string;
        url: string;
    };
    tier: {
        name: string;
        monthlyPriceInDollars: number;
    } | null;
}

interface SponsorData {
    name: string;
    login: string;
    avatarUrl: string;
    githubUrl: string;
    tier: string;
    monthlyAmount: number;
}

export async function GET() {
    try {
        const token = process.env.GITHUB_TOKEN;

        if (!token) {
            console.warn("GITHUB_TOKEN not configured, returning empty sponsors list");
            return NextResponse.json([]);
        }

        const query = `
            query {
                organization(login: "PowerPlatformToolBox") {
                    sponsorshipsAsMaintainer(first: 100, activeOnly: true) {
                        nodes {
                            sponsorEntity {
                                ... on User {
                                    login
                                    name
                                    avatarUrl
                                    url
                                }
                                ... on Organization {
                                    login
                                    name
                                    avatarUrl
                                    url
                                }
                            }
                            tier {
                                name
                                monthlyPriceInDollars
                            }
                        }
                    }
                }
            }
        `;

        const response = await fetch("https://api.github.com/graphql", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.errors) {
            console.error("GitHub GraphQL errors:", result.errors);
            throw new Error(result.errors[0]?.message || "GraphQL query failed");
        }

        const sponsors: SponsorData[] = result.data?.organization?.sponsorshipsAsMaintainer?.nodes
            ?.filter((node: GitHubSponsor) => node.sponsorEntity)
            ?.map((node: GitHubSponsor) => ({
                name: node.sponsorEntity.name || node.sponsorEntity.login,
                login: node.sponsorEntity.login,
                avatarUrl: node.sponsorEntity.avatarUrl,
                githubUrl: node.sponsorEntity.url,
                tier: node.tier?.name || "Sponsor",
                monthlyAmount: node.tier?.monthlyPriceInDollars || 0,
            }))
            .sort((a: SponsorData, b: SponsorData) => b.monthlyAmount - a.monthlyAmount) || [];

        return NextResponse.json(sponsors);
    } catch (error) {
        console.error("Error fetching sponsors:", error);
        return NextResponse.json({ error: "Failed to fetch sponsors" }, { status: 500 });
    }
}
