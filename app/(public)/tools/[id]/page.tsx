/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode, useEffect, useState } from "react";

import "github-markdown-css/github-markdown-light.css";
import GithubSlugger from "github-slugger";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { Container } from "@/components/Container";
import { VerifiedCheckmark } from "@/components/VerifiedCheckmark";
import { FadeIn } from "@/components/animations";
import { formatSiteTitle } from "@/lib/metadata";

interface ReadmeNode {
    type: string;
    tagName?: string;
    value?: string;
    properties?: Record<string, unknown>;
    children?: ReadmeNode[];
}

function rehypeGithubSlug() {
    return (tree: ReadmeNode) => {
        const slugger = new GithubSlugger();
        const addHeadingIds = (node: ReadmeNode) => {
            if (/^h[1-6]$/.test(node.tagName ?? "")) {
                const text = (node.children ?? []).map(getReadmeNodeText).join("").trim() || "section";
                node.properties = { ...node.properties, id: slugger.slug(text) };
            }
            node.children?.forEach(addHeadingIds);
        };
        addHeadingIds(tree);
    };
}

function getReadmeNodeText(node: ReadmeNode): string {
    return node.value ?? (node.children ?? []).map(getReadmeNodeText).join("");
}

function scrollToReadmeFragment(event: MouseEvent<HTMLAnchorElement>, href?: string) {
    if (!href?.startsWith("#") || href.length < 2) return;

    const fragment = href.slice(1);
    let decodedFragment = fragment;
    try {
        decodedFragment = decodeURIComponent(fragment);
    } catch {
        // Use the literal fragment if the URL contains malformed escaping.
    }

    const readme = event.currentTarget.closest("[data-readme-content]");
    const headings = Array.from(readme?.querySelectorAll<HTMLElement>("[id]") ?? []);
    const targetId = [fragment, decodedFragment, new GithubSlugger().slug(decodedFragment)].find((id) => headings.some((heading) => heading.id === id));
    const target = targetId ? headings.find((heading) => heading.id === targetId) : undefined;
    if (!target) return;

    event.preventDefault();
    target.focus({ preventScroll: true });
    window.scrollTo({
        top: window.scrollY + target.getBoundingClientRect().top - 96,
        behavior: "smooth",
    });
}

function ReadmeMarkdown({ markdown }: { markdown: string }) {
    const heading = (level: 1 | 2 | 3 | 4 | 5 | 6, className: string) =>
        function MarkdownHeading({ children, id }: { children?: ReactNode; id?: string }) {
            const Heading = `h${level}` as const;
            return (
                <Heading id={id} tabIndex={-1} className={`scroll-mt-24 ${className}`}>
                    {children}
                </Heading>
            );
        };
    const components: Components = {
        h1: heading(1, "text-3xl font-semibold tracking-tight text-slate-900"),
        h2: heading(2, "text-2xl font-semibold tracking-tight text-slate-900"),
        h3: heading(3, "text-xl font-semibold text-slate-900"),
        h4: heading(4, "text-lg font-semibold text-slate-900"),
        h5: heading(5, "text-base font-semibold text-slate-900"),
        h6: heading(6, "text-sm font-semibold text-slate-900"),
        a: ({ href, children, ...props }) => (
            <a href={href} {...props} onClick={(event) => scrollToReadmeFragment(event, href)}>
                {children}
            </a>
        ),
    };

    return (
        <div data-readme-content className="markdown-body break-words">
            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeGithubSlug]} components={components}>
                {markdown}
            </Markdown>
        </div>
    );
}

interface Tool {
    id: string;
    name: string;
    description: string;
    icon: string;
    categories: string[];
    downloads: number;
    rating: number;
    mau?: number; // Monthly Active Users
    longDescription?: string;
    readmeUrl?: string;
    contributors?: string[];
    version?: string;
    lastUpdated?: string;
    repository?: string;
    website?: string;
    tool_maturity?: { status: "unverified" | "verified" };
    mcp_enabled?: boolean;
}

// Mock data for a tool (will be replaced with Supabase data)
const mockTools: Record<string, Tool> = {
    "1": {
        id: "1",
        name: "Solution Manager",
        description: "Manage your Power Platform solutions with ease. Export, import, and version control your solutions.",
        longDescription:
            "Solution Manager is a comprehensive tool for managing your Power Platform solutions. It provides an intuitive interface for exporting, importing, and tracking versions of your solutions. With advanced features like dependency analysis, solution comparison, and bulk operations, you can streamline your solution lifecycle management.",
        icon: "📦",
        categories: ["Solutions"],
        downloads: 1250,
        rating: 4.8,
        mau: 850,
        contributors: ["PPTB Team"],
        version: "2.1.0",
        lastUpdated: "2024-01-15",
        repository: "https://github.com/PowerPlatformToolBox/solution-manager",
        website: "https://powerplatformtoolbox.com",
        mcp_enabled: true,
    },
    "2": {
        id: "2",
        name: "Environment Tools",
        description: "Compare environments, copy configurations, and manage environment settings efficiently.",
        longDescription:
            "Environment Tools helps you manage multiple Power Platform environments with ease. Compare configurations, copy settings between environments, and ensure consistency across your development, test, and production environments.",
        icon: "🌍",
        categories: ["Environments"],
        downloads: 980,
        rating: 4.6,
        mau: 620,
        contributors: ["PPTB Team"],
        version: "1.8.5",
        lastUpdated: "2024-01-10",
    },
    "3": {
        id: "3",
        name: "Code Generator",
        description: "Generate early-bound classes, TypeScript definitions, and more from your Dataverse metadata.",
        longDescription:
            "Code Generator automates the creation of strongly-typed code from your Dataverse metadata. Generate early-bound classes for .NET, TypeScript definitions for web resources, and more to improve your development productivity and code quality.",
        icon: "⚡",
        categories: ["Development"],
        downloads: 2100,
        rating: 4.9,
        mau: 1450,
        contributors: ["PPTB Team"],
        version: "3.0.2",
        lastUpdated: "2024-01-18",
    },
    "4": {
        id: "4",
        name: "Plugin Manager",
        description: "Register, update, and manage your plugins and custom workflow activities with a modern interface.",
        longDescription:
            "Plugin Manager provides a modern interface for managing your Dataverse plugins and custom workflow activities. Register new plugins, update existing ones, and manage plugin steps with an intuitive visual interface.",
        icon: "🔌",
        categories: ["Development"],
        downloads: 1450,
        rating: 4.7,
        mau: 920,
        contributors: ["PPTB Team"],
        version: "2.5.1",
        lastUpdated: "2024-01-12",
    },
    "5": {
        id: "5",
        name: "Data Import/Export",
        description: "Import and export data using Excel, CSV, or JSON. Support for bulk operations and data transformation.",
        longDescription:
            "Data Import/Export tool makes it easy to move data in and out of your Dataverse environment. Support for multiple formats including Excel, CSV, and JSON, with advanced features like data transformation, validation, and bulk operations.",
        icon: "📊",
        categories: ["Data"],
        downloads: 1800,
        rating: 4.5,
        mau: 1100,
        contributors: ["PPTB Team"],
        version: "2.3.0",
        lastUpdated: "2024-01-14",
    },
    "6": {
        id: "6",
        name: "Performance Monitor",
        description: "Monitor and analyze the performance of your Power Platform solutions. Identify bottlenecks and optimize.",
        longDescription:
            "Performance Monitor helps you track and analyze the performance of your Power Platform solutions. Identify bottlenecks, monitor resource usage, and get actionable insights to optimize your applications.",
        icon: "📈",
        categories: ["Monitoring"],
        downloads: 750,
        rating: 4.4,
        mau: 480,
        contributors: ["PPTB Team"],
        version: "1.5.3",
        lastUpdated: "2024-01-08",
    },
};

export default function ToolDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const toolId = params?.id as string;

    const [tool, setTool] = useState<Tool | null>(null);
    const [loading, setLoading] = useState(true);
    const [readmeContent, setReadmeContent] = useState<string>("");
    const [loadingReadme, setLoadingReadme] = useState(false);

    useEffect(() => {
        if (tool) document.title = formatSiteTitle(tool.name);
    }, [tool]);

    useEffect(() => {
        if (!toolId) {
            router.push("/tools");
            return;
        }

        (async () => {
            try {
                const response = await fetch(`/api/tools/${toolId}`);
                if (!response.ok) throw new Error("Failed to fetch tool");

                const toolData = await response.json();

                if (toolData) {
                    setTool({
                        id: toolData.id,
                        name: toolData.name,
                        description: toolData.description,
                        icon: toolData.icon,
                        readmeUrl: (toolData as any).readmeurl,
                        contributors: (toolData as any).tool_contributors?.flatMap((tc: any) => tc.contributors?.name) || [],
                        version: (toolData as any).version,
                        lastUpdated: (toolData as any).updated_at,
                        categories: toolData.tool_categories?.flatMap((tc: any) => tc.categories?.name) || [],
                        downloads: (toolData.tool_analytics as any)?.downloads || 0,
                        rating: (toolData.tool_analytics as any)?.rating || 0,
                        mau: (toolData.tool_analytics as any)?.mau || 0,
                        repository: (toolData as any).repository,
                        website: (toolData as any).website,
                        tool_maturity: toolData.tool_maturity || { status: "unverified" },
                        mcp_enabled: toolData.mcp_enabled ?? false,
                    });
                } else if (mockTools[toolId]) {
                    setTool(mockTools[toolId]);
                } else {
                    router.push("/tools");
                    return;
                }
            } catch (err) {
                console.error("Error fetching tool:", err);
                if (mockTools[toolId]) setTool(mockTools[toolId]);
                else router.push("/tools");
            } finally {
                setLoading(false);
            }
        })();
    }, [toolId, router]);

    // Fetch and convert markdown from readme URL using marked
    useEffect(() => {
        if (!tool?.readmeUrl) return;

        const fetchReadme = async () => {
            setLoadingReadme(true);
            try {
                const response = await fetch(tool.readmeUrl!);
                if (!response.ok) throw new Error("Failed to fetch README");
                const markdown = await response.text();
                setReadmeContent(markdown);
            } catch (error) {
                console.error("Error fetching README:", error);
                setReadmeContent("");
            } finally {
                setLoadingReadme(false);
            }
        };

        fetchReadme();
    }, [tool?.readmeUrl]);

    if (loading) {
        return (
            <main>
                <Container className="pt-16 sm:pt-24">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                        <p className="mt-4 text-slate-600">Loading tool details...</p>
                    </div>
                </Container>
            </main>
        );
    }

    if (!tool) {
        return null;
    }

    return (
        <main className="bg-slate-50 pb-16">
            <Container className="pt-6 sm:pt-8">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto max-w-7xl">
                        {/* Back button */}
                        <Link href="/tools" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-blue-700">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            All tools
                        </Link>

                        {/* Tool Header */}
                        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                            <div className="flex flex-col gap-5">
                                <div className="flex min-w-0 items-start gap-4">
                                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-blue-50 to-purple-50 sm:h-16 sm:w-16">
                                        {tool.icon && tool.icon.startsWith("http") ? (
                                            <Image src={tool.icon} alt={`${tool.name} icon`} width={48} height={48} className="h-12 w-12 object-contain" />
                                        ) : (
                                            <span className="text-3xl">{tool.icon || "📦"}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{tool.name}</h1>
                                            {tool.tool_maturity?.status === "verified" && <VerifiedCheckmark className="h-5 w-5" />}
                                        </div>
                                        {tool.contributors && tool.contributors.length > 0 && <p className="mt-1 text-sm text-slate-500">by {tool.contributors.join(", ")}</p>}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 sm:pl-20">
                                    {tool.categories.map((category) => (
                                        <span key={category} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                            {category}
                                        </span>
                                    ))}
                                    {tool.mcp_enabled && <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">MCP enabled</span>}
                                </div>
                                <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:pl-20">{tool.description}</p>
                                <div className="flex flex-wrap items-center gap-2 sm:pl-20">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const protocolUrl = `pptb://install?toolId=${tool.id}&toolName=${encodeURIComponent(tool.name)}`;
                                            window.location.href = protocolUrl;
                                        }}
                                        className="hidden items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:inline-flex"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Open in PPTB
                                    </button>
                                    <Link
                                        href={`/tools/${tool.id}/reviews`}
                                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        See reviews
                                    </Link>
                                    <Link
                                        href={`/rate-tool?toolId=${tool.id}`}
                                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Leave a review
                                    </Link>
                                    <span className="text-xs text-slate-500 sm:hidden">
                                        Desktop app ·{" "}
                                        <Link href="/versions" className="font-semibold text-blue-700 hover:underline">
                                            Get PPTB
                                        </Link>
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-3 border-t border-slate-200 pt-5">
                                <div className="px-2 sm:px-4">
                                    <p className="text-xs text-slate-500">Downloads</p>
                                    <p className="mt-1 text-base font-semibold text-slate-900">{tool.downloads.toLocaleString()}</p>
                                </div>
                                <Link href={`/tools/${tool.id}/reviews`} className="border-x border-slate-200 px-3 transition hover:text-blue-700 sm:px-5">
                                    <p className="text-xs text-slate-500">Rating</p>
                                    <p className="mt-1 text-base font-semibold text-slate-900">
                                        <span className="text-amber-500">★</span> {tool.rating > 0 ? tool.rating.toFixed(1) : "--"}
                                    </p>
                                </Link>
                                <div className="px-3 sm:px-5">
                                    <p className="text-xs text-slate-500">Monthly users</p>
                                    <p className="mt-1 text-base font-semibold text-slate-900">{tool.mau ? tool.mau.toLocaleString() : "0"}</p>
                                </div>
                            </div>
                        </header>

                        {/* Tool Details Grid */}
                        <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
                            {/* Main Content */}
                            <div className="min-w-0 lg:col-span-2">
                                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                                    <h2 className="text-xl font-semibold text-slate-900">About this tool</h2>
                                    <div className="mt-5">
                                        {loadingReadme ? (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
                                                <span>Loading documentation...</span>
                                            </div>
                                        ) : readmeContent ? (
                                            <ReadmeMarkdown markdown={readmeContent} />
                                        ) : (
                                            <p className="text-sm leading-6 text-slate-600">{tool.longDescription || tool.description}</p>
                                        )}
                                    </div>
                                </section>
                            </div>

                            {/* Sidebar */}
                            <aside className="space-y-4">
                                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <h2 className="text-base font-semibold text-slate-900">Tool information</h2>
                                    <dl className="mt-4 divide-y divide-slate-100 text-sm">
                                        {tool.version && (
                                            <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                                                <dt className="text-slate-500">Version</dt>
                                                <dd className="text-right font-medium text-slate-900">{tool.version}</dd>
                                            </div>
                                        )}
                                        {tool.repository && (
                                            <div className="flex items-center justify-between gap-4 py-3">
                                                <dt className="text-slate-500">Source</dt>
                                                <dd>
                                                    <a href={tool.repository} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">
                                                        View repository
                                                    </a>
                                                </dd>
                                            </div>
                                        )}
                                        {tool.website && (
                                            <div className="flex items-center justify-between gap-4 py-3">
                                                <dt className="text-slate-500">Website</dt>
                                                <dd>
                                                    <a href={tool.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">
                                                        Visit website
                                                    </a>
                                                </dd>
                                            </div>
                                        )}
                                        {tool.contributors && tool.contributors.length > 0 && (
                                            <div className="py-3">
                                                <dt className="text-slate-500">Contributors</dt>
                                                <dd className="mt-1 break-words font-medium text-slate-900">{tool.contributors.join(", ")}</dd>
                                            </div>
                                        )}
                                        {tool.lastUpdated && Number.isFinite(new Date(tool.lastUpdated).getTime()) && (
                                            <div className="flex items-center justify-between gap-4 py-3">
                                                <dt className="text-slate-500">Last updated</dt>
                                                <dd className="text-right font-medium text-slate-900">
                                                    {new Date(tool.lastUpdated).toLocaleDateString("en-US", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                </section>

                                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <h2 className="text-base font-semibold text-slate-900">Use this tool</h2>
                                    <p className="mt-2 text-sm leading-5 text-slate-600">Power Platform ToolBox is a desktop app for Windows, macOS, and Linux.</p>
                                    <Link href="/versions" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
                                        Get PPTB for desktop <span aria-hidden="true">→</span>
                                    </Link>
                                </section>
                            </aside>
                        </div>
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
