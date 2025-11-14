"use client";

import { Container } from "@/components/Container";
import { FadeIn, SlideIn } from "@/components/animations";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Tool {
    id: string;
    name: string;
    description: string;
    iconurl: string;
    category: string;
    downloads: number;
    rating: number;
}

// Mock data for tools (will be replaced with Supabase data)
const mockTools: Tool[] = [
    {
        id: "1",
        name: "Solution Manager",
        description: "Manage your Power Platform solutions with ease. Export, import, and version control your solutions.",
        iconurl: "📦",
        category: "Solutions",
        downloads: 1250,
        rating: 4.8,
    },
    {
        id: "2",
        name: "Environment Tools",
        description: "Compare environments, copy configurations, and manage environment settings efficiently.",
        iconurl: "🌍",
        category: "Environments",
        downloads: 980,
        rating: 4.6,
    },
    {
        id: "3",
        name: "Code Generator",
        description: "Generate early-bound classes, TypeScript definitions, and more from your Dataverse metadata.",
        iconurl: "⚡",
        category: "Development",
        downloads: 2100,
        rating: 4.9,
    },
    {
        id: "4",
        name: "Plugin Manager",
        description: "Register, update, and manage your plugins and custom workflow activities with a modern interface.",
        iconurl: "🔌",
        category: "Development",
        downloads: 1450,
        rating: 4.7,
    },
    {
        id: "5",
        name: "Data Import/Export",
        description: "Import and export data using Excel, CSV, or JSON. Support for bulk operations and data transformation.",
        iconurl: "📊",
        category: "Data",
        downloads: 1800,
        rating: 4.5,
    },
    {
        id: "6",
        name: "Performance Monitor",
        description: "Monitor and analyze the performance of your Power Platform solutions. Identify bottlenecks and optimize.",
        iconurl: "📈",
        category: "Monitoring",
        downloads: 750,
        rating: 4.4,
    },
];

export default function ToolsPage() {
    const [tools, setTools] = useState<Tool[]>(mockTools);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>("All");

    useEffect(() => {
        async function fetchTools() {
            if (!supabase) {
                // If Supabase is not configured, use mock data
                setTools(mockTools);
                setLoading(false);
                return;
            }

            try {
                // Fetch tools with analytics data using a join
                const { data, error } = await supabase
                    .from("tools")
                    .select(
                        `
                        id,
                        name,
                        description,
                        iconurl,
                        category,
                        tool_analytics (
                            downloads,
                            rating
                        )
                    `,
                    )
                    .order("name", { ascending: true });

                if (error) throw error;

                if (data) {
                    // Transform the data to match the Tool interface
                    const transformedTools: Tool[] = data.map(
                        (tool: { id: string; name: string; description: string; iconurl: string; category: string; tool_analytics?: Array<{ downloads: number; rating: number }> }) => ({
                            id: tool.id,
                            name: tool.name,
                            description: tool.description,
                            iconurl: tool.iconurl || "📦",
                            category: tool.category,
                            downloads: tool.tool_analytics?.[0]?.downloads || 0,
                            rating: tool.tool_analytics?.[0]?.rating || 0,
                        }),
                    );
                    setTools(transformedTools);
                }
            } catch (error) {
                console.error("Error fetching tools:", error);
                // Fallback to mock data
                setTools(mockTools);
            } finally {
                setLoading(false);
            }
        }

        fetchTools();
    }, []);

    const categories = ["All", ...Array.from(new Set(tools.map((t) => t.category)))];
    const filteredTools = selectedCategory === "All" ? tools : tools.filter((t) => t.category === selectedCategory);

    return (
        <main>
            <Container className="mt-16 sm:mt-32">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto max-w-2xl lg:max-w-7xl">
                        <header className="max-w-2xl">
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Power Platform Tools</h1>
                            <p className="mt-6 text-lg text-slate-700">Explore our collection of tools designed to supercharge your Power Platform development workflow.</p>
                        </header>

                        {/* Category Filter */}
                        <FadeIn direction="up" delay={0.3}>
                            <div className="mt-12 flex flex-wrap gap-3">
                                {categories.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                            selectedCategory === category
                                                ? "bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                                                : "bg-white text-slate-700 border border-slate-300 hover:border-blue-600 hover:text-blue-600"
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
                                            <Link href={`/tools/${tool.id}`} className="card group block h-full transition-all duration-300 hover:scale-105 hover:shadow-xl">
                                                <div className="p-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="w-16 h-16 relative flex items-center justify-center bg-linear-to-br from-blue-50 to-purple-50 rounded-lg">
                                                            {tool.iconurl && tool.iconurl.startsWith("http") ? (
                                                                <Image
                                                                    src={tool.iconurl}
                                                                    alt={`${tool.name} icon`}
                                                                    width={48}
                                                                    height={48}
                                                                    className="object-contain"
                                                                    onError={(e) => {
                                                                        // Fallback to emoji if image fails to load
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
                                                        <span className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">{tool.category}</span>
                                                    </div>
                                                    <h3 className="text-xl font-semibold text-slate-900 group-hover:text-gradient transition-colors">{tool.name}</h3>
                                                    <p className="mt-3 text-sm text-slate-600">{tool.description}</p>
                                                    <div className="mt-6 flex items-center justify-between text-sm">
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
                            <div className="mt-16 card-dark p-8 text-center">
                                <h2 className="text-2xl font-bold">Want to contribute a tool?</h2>
                                <p className="mt-4 text-slate-300">Join our community of developers and help build the next generation of Power Platform tools.</p>
                                <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link
                                        href="https://github.com/PowerPlatformToolBox"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary inline-flex items-center justify-center gap-2"
                                    >
                                        Visit GitHub
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path
                                                fillRule="evenodd"
                                                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </Link>
                                    <Link href="/auth/signin" className="btn-outline inline-flex items-center justify-center gap-2 bg-white">
                                        Sign in to rate tools
                                    </Link>
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
