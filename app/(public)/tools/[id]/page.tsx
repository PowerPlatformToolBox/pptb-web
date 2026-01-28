/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { marked } from "marked";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Container } from "@/components/Container";
import { FadeIn } from "@/components/animations";

interface Tool {
    id: string;
    name: string;
    description: string;
    iconurl: string;
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
}

// Mock data for a tool (will be replaced with Supabase data)
const mockTools: Record<string, Tool> = {
    "1": {
        id: "1",
        name: "Solution Manager",
        description: "Manage your Power Platform solutions with ease. Export, import, and version control your solutions.",
        longDescription:
            "Solution Manager is a comprehensive tool for managing your Power Platform solutions. It provides an intuitive interface for exporting, importing, and tracking versions of your solutions. With advanced features like dependency analysis, solution comparison, and bulk operations, you can streamline your solution lifecycle management.",
        iconurl: "📦",
        categories: ["Solutions"],
        downloads: 1250,
        rating: 4.8,
        mau: 850,
        contributors: ["PPTB Team"],
        version: "2.1.0",
        lastUpdated: "2024-01-15",
        repository: "https://github.com/PowerPlatformToolBox/solution-manager",
        website: "https://powerplatformtoolbox.com",
    },
    "2": {
        id: "2",
        name: "Environment Tools",
        description: "Compare environments, copy configurations, and manage environment settings efficiently.",
        longDescription:
            "Environment Tools helps you manage multiple Power Platform environments with ease. Compare configurations, copy settings between environments, and ensure consistency across your development, test, and production environments.",
        iconurl: "🌍",
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
        iconurl: "⚡",
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
        iconurl: "🔌",
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
        iconurl: "📊",
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
        iconurl: "📈",
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
                        iconurl: toolData.iconurl,
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
                const html = await marked(markdown);
                setReadmeContent(html);
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
                <Container className="mt-16 sm:mt-32">
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
        <main>
            <Container className="mt-2 sm:mt-4">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto max-w-2xl lg:max-w-5xl">
                        {/* Back button */}
                        <Link href="/tools" className="inline-flex items-center gap-2 text-blue-600 hover:text-purple-600 transition-colors mb-8">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Tools
                        </Link>

                        {/* Tool Header */}
                        <header className="flex items-start gap-6 mb-12">
                            <div className="w-20 h-20 relative flex items-center justify-center bg-linear-to-br from-blue-50 to-purple-50 rounded-xl shrink-0">
                                {tool.iconurl && tool.iconurl.startsWith("http") ? (
                                    <Image src={tool.iconurl} alt={`${tool.name} icon`} width={64} height={64} className="object-contain" />
                                ) : (
                                    <span className="text-5xl">{tool.iconurl || "📦"}</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <h1 className="text-4xl font-bold tracking-tight text-slate-900">{tool.name}</h1>
                                    {tool.categories.map((category) => (
                                        <span key={category} className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-full">
                                            {category}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-lg text-slate-600 mb-4">{tool.description}</p>
                                <div className="flex flex-wrap gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        <span className="text-slate-700">
                                            <strong>{tool.downloads.toLocaleString()}</strong> downloads
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg className="h-5 w-5 text-amber-500 fill-current" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        <span className="text-slate-700">
                                            <strong>{tool.rating > 0 ? tool.rating.toFixed(1) : "N/A"}</strong> rating
                                        </span>
                                    </div>
                                    {tool.mau && (
                                        <div className="flex items-center gap-2">
                                            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                />
                                            </svg>
                                            <span className="text-slate-700">
                                                <strong>{tool.mau.toLocaleString()}</strong> MAU
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </header>

                        {/* Tool Details Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-8">
                                <div className="card p-8 shadow-lg hover:shadow-xl transition-shadow">
                                    <h2 className="text-2xl font-semibold text-slate-900 mb-4">About</h2>
                                    {loadingReadme ? (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
                                            <span>Loading documentation...</span>
                                        </div>
                                    ) : readmeContent ? (
                                        <div
                                            className="prose prose-slate max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:bg-slate-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-pre:bg-slate-100"
                                            dangerouslySetInnerHTML={{ __html: readmeContent }}
                                        />
                                    ) : (
                                        <p className="text-slate-700 leading-relaxed">{tool.longDescription || tool.description}</p>
                                    )}
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-8">
                                <div className="card p-6 shadow-md hover:shadow-lg transition-shadow">
                                    <h3 className="font-semibold text-slate-900 mb-4">Tool Information</h3>
                                    <dl className="space-y-3 text-sm">
                                        {tool.version && (
                                            <>
                                                <dt className="text-slate-500">Version</dt>
                                                <dd className="text-slate-900 font-medium">{tool.version}</dd>
                                            </>
                                        )}
                                        {tool.repository && (
                                            <>
                                                <dt className="text-slate-500">Repository</dt>
                                                <dd className="text-slate-900 font-medium">
                                                    <a
                                                        href={tool.repository}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-purple-600 hover:underline transition-colors"
                                                    >
                                                        View on GitHub
                                                    </a>
                                                </dd>
                                            </>
                                        )}
                                        {tool.website && (
                                            <>
                                                <dt className="text-slate-500">Website</dt>
                                                <dd className="text-slate-900 font-medium">
                                                    <a href={tool.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-purple-600 hover:underline transition-colors">
                                                        Visit Website
                                                    </a>
                                                </dd>
                                            </>
                                        )}
                                        {tool.contributors && tool.contributors.length > 0 && (
                                            <>
                                                <dt className="text-slate-500">Contributors</dt>
                                                <dd className="text-slate-900 font-medium">{tool.contributors.join(", ")}</dd>
                                            </>
                                        )}
                                        {tool.lastUpdated && (
                                            <>
                                                <dt className="text-slate-500">Last Updated</dt>
                                                <dd className="text-slate-900 font-medium">
                                                    {new Date(tool.lastUpdated).toLocaleDateString("en-US", {
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                    })}
                                                </dd>
                                            </>
                                        )}
                                    </dl>
                                </div>

                                <div className="card p-6 text-center shadow-md hover:shadow-lg transition-shadow">
                                    <h3 className="font-semibold text-slate-900 mb-4">Rate this tool</h3>
                                    <p className="text-sm text-slate-600 mb-4">Share your experience with the community</p>
                                    <Link href={`/rate-tool?toolId=${tool.id}`} className="inline-block btn-primary w-full">
                                        <span className="flex items-center justify-center gap-2">
                                            Leave a Rating
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                                />
                                            </svg>
                                        </span>
                                    </Link>
                                </div>

                                <div className="card p-6 text-center shadow-md hover:shadow-lg transition-shadow">
                                    <h3 className="font-semibold text-slate-900 mb-4">See all reviews</h3>
                                    <p className="text-sm text-slate-600 mb-4">Read what users think about this tool</p>
                                    <Link href={`/tools/${tool.id}/reviews`} className="inline-block btn-outline w-full">
                                        <span className="flex items-center justify-center gap-2">
                                            View Reviews
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </span>
                                    </Link>
                                </div>

                                <div className="card p-6 text-center bg-linear-to-br from-blue-50 to-purple-50 shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-br from-blue-300/20 to-purple-300/20 rounded-full blur-2xl"></div>
                                    <h3 className="font-semibold text-slate-900 mb-2 relative z-10">Download PPTB</h3>
                                    <p className="text-sm text-slate-600 mb-4 relative z-10">Get the desktop app to use this tool</p>
                                    <Link href="/" className="inline-block btn-outline w-full relative z-10">
                                        <span className="flex items-center justify-center gap-2">
                                            Download Now
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
