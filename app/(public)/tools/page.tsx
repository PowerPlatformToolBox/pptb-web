"use client";

import { Container } from "@/components/Container";
import { FadeIn, SlideIn } from "@/components/animations";
import { useSupabase } from "@/lib/useSupabase";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Tool {
    id: string;
    name: string;
    description: string;
    iconurl: string;
    categories: string[];
    downloads: number;
    rating: number;
    contributors: string[];
    mau?: number;
}

// Mock data for tools (will be replaced with Supabase data)
const mockTools: Tool[] = [
    {
        id: "1",
        name: "Solution Manager",
        description: "Manage your Power Platform solutions with ease. Export, import, and version control your solutions.",
        iconurl: "📦",
        contributors: ["PowerPlatformToolBox"],
        categories: ["Solutions"],
        downloads: 1250,
        rating: 4.8,
        mau: 320,
    },
    {
        id: "2",
        name: "Environment Tools",
        description: "Compare environments, copy configurations, and manage environment settings efficiently.",
        iconurl: "🌍",
        contributors: ["PowerPlatformToolBox"],
        categories: ["Environments"],
        downloads: 980,
        rating: 4.6,
        mau: 280,
    },
    {
        id: "3",
        name: "Code Generator",
        description: "Generate early-bound classes, TypeScript definitions, and more from your Dataverse metadata.",
        iconurl: "⚡",
        contributors: ["PowerPlatformToolBox"],
        categories: ["Development"],
        downloads: 2100,
        rating: 4.9,
        mau: 450,
    },
    {
        id: "4",
        name: "Plugin Manager",
        description: "Register, update, and manage your plugins and custom workflow activities with a modern interface.",
        iconurl: "🔌",
        contributors: ["PowerPlatformToolBox"],
        categories: ["Development"],
        downloads: 1450,
        rating: 4.7,
        mau: 380,
    },
    {
        id: "5",
        name: "Data Import/Export",
        description: "Import and export data using Excel, CSV, or JSON. Support for bulk operations and data transformation.",
        iconurl: "📊",
        contributors: ["PowerPlatformToolBox"],
        categories: ["Data"],
        downloads: 1800,
        rating: 4.5,
        mau: 410,
    },
    {
        id: "6",
        name: "Performance Monitor",
        description: "Monitor and analyze the performance of your Power Platform solutions. Identify bottlenecks and optimize.",
        iconurl: "📈",
        contributors: ["PowerPlatformToolBox"],
        categories: ["Monitoring"],
        downloads: 750,
        rating: 4.4,
        mau: 200,
    },
];

export default function ToolsPage() {
    const [tools, setTools] = useState<Tool[]>(mockTools);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const { supabase } = useSupabase();

    useEffect(() => {
        if (!supabase) return;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from("tools")
                    .select(`id,name,description,iconurl,tool_analytics (downloads,rating,mau),tool_categories (categories (name)),tool_contributors (contributors (name))`)
                    .eq("status", "active")
                    .order("name", { ascending: true });

                console.log(data);

                if (error) throw error;
                if (data) {
                    const transformed: Tool[] = data.map(
                        (tool: {
                            id: string;
                            name: string;
                            description: string;
                            iconurl: string;
                            tool_analytics?: unknown;
                            tool_categories?: Array<{ categories: unknown }>;
                            tool_contributors?: Array<{ contributors: unknown }>;
                        }) => ({
                            id: tool.id,
                            name: tool.name,
                            description: tool.description,
                            iconurl: tool.iconurl || "📦",
                            contributors: tool.tool_contributors?.flatMap((tc) => (tc.contributors as { name: string }).name) || [],
                            categories: tool.tool_categories?.flatMap((tc) => (tc.categories as { name: string }).name) || ["\u00A0"],
                            downloads: (tool.tool_analytics as { downloads: number; rating: number; mau?: number })?.downloads || 0,
                            rating: (tool.tool_analytics as { downloads: number; rating: number; mau?: number })?.rating || 0,
                            mau: (tool.tool_analytics as { downloads: number; rating: number; mau?: number })?.mau || 0,
                        }),
                    );
                    setTools(transformed);
                }
            } catch (err) {
                console.error("Error fetching tools:", err);
                setTools(mockTools);
            } finally {
                setLoading(false);
            }
        })();
    }, [supabase]);

    const categories = ["All", ...Array.from(new Set(tools.flatMap((t) => t.categories)))];
    const filteredTools = selectedCategory === "All" ? tools : tools.filter((t) => t.categories.includes(selectedCategory));

    return (
        <main>
            <Container className="mt-8 sm:mt-16">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto max-w-2xl lg:max-w-7xl">
                        <header className="max-w-2xl mb-16">
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Power Platform Tools</h1>
                            <p className="mt-6 text-lg text-slate-700">Explore our collection of tools designed to supercharge your Power Platform development workflow.</p>
                        </header>

                        {/* Category Filter */}
                        <FadeIn direction="up" delay={0.3}>
                            <div className="mb-12 flex flex-wrap gap-3">
                                {categories.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                                            selectedCategory === category
                                                ? "bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105"
                                                : "bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-600 hover:text-blue-600 hover:shadow-md"
                                        }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </FadeIn>

                        {/* Tools Grid */}
                        {loading ? (
                            <div className="mt-16 text-center">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                                <p className="mt-4 text-slate-600">Loading tools...</p>
                            </div>
                        ) : (
                            <SlideIn direction="up" delay={0.4}>
                                <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                                    {filteredTools.map((tool, index) => (
                                        <FadeIn key={tool.id} direction="up" delay={0.5 + index * 0.05}>
                                            <Link
                                                href={`/tools/${tool.id}`}
                                                className="card group block h-full transition-all duration-300 hover:scale-105 hover:shadow-2xl flex flex-col rounded-2xl bg-gradient-to-br from-blue-500/70 via-purple-500/70 to-blue-600/70 p-[1.5px]"
                                            >
                                                <div className="p-6 flex flex-col h-full bg-white rounded-2xl">
                                                    {/* Tags Section */}
                                                    <div className="flex flex-wrap gap-2 mb-4 h-7">
                                                        {tool.categories.slice(0, 3).map((category) => (
                                                            <span key={category} className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                                                                {category}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    {/* Icon and Name Section */}
                                                    <div className="flex items-start gap-4 mb-4 h-20">
                                                        <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-linear-to-br from-blue-50 to-purple-50 rounded-lg">
                                                            {tool.iconurl && tool.iconurl.startsWith("http") ? (
                                                                <Image
                                                                    src={tool.iconurl}
                                                                    alt={`${tool.name} icon`}
                                                                    width={48}
                                                                    height={48}
                                                                    className="object-contain"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = "none";
                                                                        if (e.currentTarget.nextSibling) {
                                                                            (e.currentTarget.nextSibling as HTMLElement).style.display = "block";
                                                                        }
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span className="text-4xl">{tool.iconurl || "📦"}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 flex flex-col justify-between">
                                                            <p className="text-lg font-semibold text-slate-900 group-hover:text-gradient transition-colors line-clamp-2" title={tool.name}>
                                                                {tool.name}
                                                            </p>
                                                            <p className="text-xs text-slate-600">
                                                                by {tool.contributors.slice(0, 2).join(", ")}
                                                                {tool.contributors.length > 2 && ` +${tool.contributors.length - 2}`}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Description Section (2 lines max) */}
                                                    <p className="text-sm text-slate-600 mb-4 line-clamp-2 flex-1" title={tool.description}>
                                                        {tool.description}
                                                    </p>

                                                    {/* Stats Section */}
                                                    <div
                                                        className="flex items-center justify-between text-sm pt-4 border-t border-slate-200"
                                                        title={`${tool.downloads.toLocaleString()} downloads • ${tool.rating.toFixed(1)} rating • ${tool.mau?.toLocaleString() || "0"} MAU`}
                                                    >
                                                        <div className="flex items-center gap-1 text-slate-600">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                            <span>{tool.downloads.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-amber-500">
                                                            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                            </svg>
                                                            <span>{tool.rating.toFixed(1)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-purple-600">
                                                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                                                <circle cx="9" cy="7" r="4" />
                                                                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                                                                <path d="M16 3.13a4 4 0 010 7.75" />
                                                            </svg>
                                                            <span className="text-xs">{tool.mau?.toLocaleString() || "0"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </FadeIn>
                                    ))}
                                </div>
                            </SlideIn>
                        )}

                        {/* Call to Action */}
                        <FadeIn direction="up" delay={0.6}>
                            <div className="mt-20 card-dark p-10 text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-linear-to-br from-blue-600/10 to-purple-600/10"></div>
                                <div className="relative z-10">
                                    <h2 className="text-3xl font-bold text-white">Want to contribute a tool?</h2>
                                    <p className="mt-4 text-slate-300 max-w-2xl mx-auto">Join our community of developers and help build the next generation of Power Platform tools.</p>
                                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                                        <Link href="https://github.com/PowerPlatformToolBox" target="_blank" rel="noopener noreferrer" className="btn-primary">
                                            <span className="flex items-center justify-center gap-2">
                                                Visit GitHub
                                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </span>
                                        </Link>
                                        <Link href="/auth/signin" className="btn-outline bg-white">
                                            <span className="flex items-center justify-center gap-2">Sign in to rate tools</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
