"use client";

import { Container } from "@/components/Container";
import { FadeIn, SlideIn } from "@/components/animations";
import { useSupabase } from "@/lib/useSupabase";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

interface Tool {
    id: string;
    name: string;
    description: string;
    iconurl: string;
    category: string;
    author?: string;
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
        author: "Power Maverick",
        downloads: 1250,
        rating: 4.8,
    },
    {
        id: "2",
        name: "Environment Tools",
        description: "Compare environments, copy configurations, and manage environment settings efficiently.",
        iconurl: "🌍",
        category: "Environments",
        author: "John Doe",
        downloads: 980,
        rating: 4.6,
    },
    {
        id: "3",
        name: "Code Generator",
        description: "Generate early-bound classes, TypeScript definitions, and more from your Dataverse metadata.",
        iconurl: "⚡",
        category: "Development",
        author: "Dev Tools Inc",
        downloads: 2100,
        rating: 4.9,
    },
    {
        id: "4",
        name: "Plugin Manager",
        description: "Register, update, and manage your plugins and custom workflow activities with a modern interface.",
        iconurl: "🔌",
        category: "Development",
        author: "Plugin Pro",
        downloads: 1450,
        rating: 4.7,
    },
    {
        id: "5",
        name: "Data Import/Export",
        description: "Import and export data using Excel, CSV, or JSON. Support for bulk operations and data transformation.",
        iconurl: "📊",
        category: "Data",
        author: "Data Master",
        downloads: 1800,
        rating: 4.5,
    },
    {
        id: "6",
        name: "Performance Monitor",
        description: "Monitor and analyze the performance of your Power Platform solutions. Identify bottlenecks and optimize.",
        iconurl: "📈",
        category: "Monitoring",
        author: "Perf Tools",
        downloads: 750,
        rating: 4.4,
    },
];

export default function ToolsPage() {
    const [tools, setTools] = useState<Tool[]>(mockTools);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const { supabase } = useSupabase();

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }
        (async () => {
            try {
                const { data, error } = await supabase
                    .from("tools")
                    .select(`id,name,description,iconurl,category,author,tool_analytics (downloads,rating)`)
                    .order("name", { ascending: true });
                if (error) throw error;
                if (data) {
                    const transformed: Tool[] = data.map(
                        (tool: {
                            id: string;
                            name: string;
                            description: string;
                            iconurl: string;
                            category: string;
                            author?: string;
                            tool_analytics?: Array<{ downloads: number; rating: number }>;
                        }) => ({
                            id: tool.id,
                            name: tool.name,
                            description: tool.description,
                            iconurl: tool.iconurl || "📦",
                            category: tool.category,
                            author: tool.author || "Unknown",
                            downloads: tool.tool_analytics?.[0]?.downloads || 0,
                            rating: tool.tool_analytics?.[0]?.rating || 0,
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

    const categories = useMemo(() => ["All", ...Array.from(new Set(tools.map((t) => t.category)))], [tools]);

    const filteredTools = useMemo(() => {
        let filtered = tools;

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(
                (tool) =>
                    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    tool.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    tool.category.toLowerCase().includes(searchQuery.toLowerCase()),
            );
        }

        // Filter by category
        if (selectedCategory !== "All") {
            filtered = filtered.filter((t) => t.category === selectedCategory);
        }

        return filtered;
    }, [tools, searchQuery, selectedCategory]);

    return (
        <main className="bg-slate-50">
            <Container className="py-12 sm:py-20">
                <div className="mx-auto max-w-7xl">
                    {/* Header */}
                    <FadeIn direction="up" delay={0.1}>
                        <div className="mb-10">
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Power Platform Tools</h1>
                            <p className="mt-4 text-lg text-slate-700">Discover powerful tools to enhance your Power Platform experience</p>
                        </div>
                    </FadeIn>

                    {/* Search Bar */}
                    <FadeIn direction="up" delay={0.2}>
                        <div className="mb-8">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search for tools..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                                />
                            </div>
                        </div>
                    </FadeIn>

                    {/* Category Filters */}
                    <FadeIn direction="up" delay={0.3}>
                        <div className="mb-8 flex flex-wrap gap-2">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                                        selectedCategory === category
                                            ? "bg-blue-600 text-white shadow-md"
                                            : "bg-white text-slate-700 border border-slate-200 hover:border-blue-600 hover:text-blue-600"
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
                    ) : filteredTools.length === 0 ? (
                        <div className="mt-16 text-center">
                            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-slate-900">No tools found</h3>
                            <p className="mt-2 text-slate-600">Try adjusting your search or filter to find what you&apos;re looking for.</p>
                        </div>
                    ) : (
                        <>
                            <SlideIn direction="up" delay={0.4}>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {filteredTools.map((tool, index) => (
                                        <FadeIn key={tool.id} direction="up" delay={0.1 + index * 0.05}>
                                            <Link
                                                href={`/tools/${tool.id}`}
                                                className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 hover:border-blue-300 flex flex-col h-full"
                                            >
                                                {/* Card Header with Icon and Category */}
                                                <div className="p-6 pb-4">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-sm group-hover:shadow-md transition-shadow">
                                                            {tool.iconurl && tool.iconurl.startsWith("http") ? (
                                                                <>
                                                                    <Image
                                                                        src={tool.iconurl}
                                                                        alt={`${tool.name} icon`}
                                                                        width={48}
                                                                        height={48}
                                                                        className="object-contain rounded-xl"
                                                                        onError={(e) => {
                                                                            e.currentTarget.style.display = "none";
                                                                            const fallback = e.currentTarget.nextSibling as HTMLElement;
                                                                            if (fallback) fallback.style.display = "block";
                                                                        }}
                                                                    />
                                                                    <span className="text-3xl" style={{ display: "none" }}>
                                                                        {tool.iconurl || "📦"}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-3xl">{tool.iconurl || "📦"}</span>
                                                            )}
                                                        </div>
                                                        <span className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full">{tool.category}</span>
                                                    </div>

                                                    {/* Tool Name */}
                                                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{tool.name}</h3>

                                                    {/* Author */}
                                                    {tool.author && <p className="text-sm text-slate-500 mb-3">{tool.author}</p>}

                                                    {/* Description */}
                                                    <p className="text-sm text-slate-600 line-clamp-3">{tool.description}</p>
                                                </div>

                                                {/* Card Footer with Stats */}
                                                <div className="mt-auto px-6 py-4 bg-slate-50 border-t border-slate-100">
                                                    <div className="flex items-center justify-between text-sm">
                                                        {/* Rating */}
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="flex items-center">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <svg
                                                                        key={i}
                                                                        className={`h-4 w-4 ${i < Math.floor(tool.rating) ? "text-amber-400 fill-current" : "text-slate-300 fill-current"}`}
                                                                        viewBox="0 0 20 20"
                                                                    >
                                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                    </svg>
                                                                ))}
                                                            </div>
                                                            <span className="font-semibold text-slate-900">{tool.rating.toFixed(1)}</span>
                                                        </div>

                                                        {/* Downloads */}
                                                        <div className="flex items-center gap-1.5 text-slate-600">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                            <span className="font-medium">{tool.downloads >= 1000 ? `${(tool.downloads / 1000).toFixed(1)}K` : tool.downloads}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </FadeIn>
                                    ))}
                                </div>
                            </SlideIn>

                            {/* Results Count */}
                            <div className="mt-8 text-center">
                                <p className="text-sm text-slate-600">
                                    Showing <span className="font-semibold text-slate-900">{filteredTools.length}</span> of <span className="font-semibold text-slate-900">{tools.length}</span> tools
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </Container>
        </main>
    );
}
