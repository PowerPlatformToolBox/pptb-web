"use client";

import { Container } from "@/components/Container";
import { FadeIn } from "@/components/animations";
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

type SortField = "name" | "downloads" | "rating" | "category" | "author";
type SortDirection = "asc" | "desc";

export default function ToolsPage() {
    const [tools, setTools] = useState<Tool[]>(mockTools);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
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

    const filteredAndSortedTools = useMemo(() => {
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

        // Sort
        const sorted = [...filtered].sort((a, b) => {
            let aVal: string | number = a[sortField] || "";
            let bVal: string | number = b[sortField] || "";

            if (typeof aVal === "string" && typeof bVal === "string") {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (sortDirection === "asc") {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });

        return sorted;
    }, [tools, searchQuery, selectedCategory, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return (
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }
        return sortDirection === "asc" ? (
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        );
    };

    return (
        <main>
            <Container className="mt-8 sm:mt-16 mb-20">
                <FadeIn direction="up" delay={0.1}>
                    <div className="mx-auto max-w-7xl">
                        <header className="mb-8">
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Power Platform Tools</h1>
                            <p className="mt-4 text-lg text-slate-700">Explore our collection of tools designed to supercharge your Power Platform development workflow.</p>
                        </header>

                        {/* Search and Filter Bar */}
                        <div className="mb-6 flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search tools by name, description, author, or category..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <div className="sm:w-48">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="block w-full px-3 py-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                >
                                    {categories.map((category) => (
                                        <option key={category} value={category}>
                                            {category === "All" ? "All Categories" : category}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Tools Table */}
                        {loading ? (
                            <div className="mt-16 text-center">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                                <p className="mt-4 text-slate-600">Loading tools...</p>
                            </div>
                        ) : (
                            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-slate-200">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th
                                                    scope="col"
                                                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                                                    onClick={() => handleSort("name")}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        Tool Name
                                                        <SortIcon field="name" />
                                                    </div>
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider hidden lg:table-cell">
                                                    Description
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 hidden md:table-cell"
                                                    onClick={() => handleSort("author")}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        Author
                                                        <SortIcon field="author" />
                                                    </div>
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                                                    onClick={() => handleSort("category")}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        Category
                                                        <SortIcon field="category" />
                                                    </div>
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 hidden sm:table-cell"
                                                    onClick={() => handleSort("downloads")}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        Downloads
                                                        <SortIcon field="downloads" />
                                                    </div>
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 hidden sm:table-cell"
                                                    onClick={() => handleSort("rating")}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        Rating
                                                        <SortIcon field="rating" />
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {filteredAndSortedTools.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                        No tools found matching your criteria.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredAndSortedTools.map((tool) => (
                                                    <tr key={tool.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <Link href={`/tools/${tool.id}`} className="flex items-center gap-3 group">
                                                                <div className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded flex-shrink-0">
                                                                    {tool.iconurl && tool.iconurl.startsWith("http") ? (
                                                                        <Image src={tool.iconurl} alt={`${tool.name} icon`} width={32} height={32} className="object-contain" />
                                                                    ) : (
                                                                        <span className="text-xl">{tool.iconurl || "📦"}</span>
                                                                    )}
                                                                </div>
                                                                <span className="text-sm font-medium text-slate-900 group-hover:text-blue-600">{tool.name}</span>
                                                            </Link>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600 hidden lg:table-cell">
                                                            <div className="max-w-md truncate">{tool.description}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 hidden md:table-cell">{tool.author || "Unknown"}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{tool.category}</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 hidden sm:table-cell">
                                                            <div className="flex items-center gap-1">
                                                                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                </svg>
                                                                {tool.downloads.toLocaleString()}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 hidden sm:table-cell">
                                                            <div className="flex items-center gap-1">
                                                                <svg className="h-4 w-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                </svg>
                                                                {tool.rating.toFixed(1)}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
                                    <p className="text-sm text-slate-600">
                                        Showing <span className="font-medium">{filteredAndSortedTools.length}</span> of <span className="font-medium">{tools.length}</span> tools
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
