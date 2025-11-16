"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Container } from "@/components/Container";
import { FadeIn, SlideIn } from "@/components/animations";
import { supabase } from "@/lib/supabase";

interface User {
    id: string;
    email?: string;
    user_metadata?: {
        name?: string;
        avatar_url?: string;
    };
}

interface Tool {
    id: string;
    name: string;
    description: string;
    iconurl: string;
    category: string;
    tool_analytics?: Array<{
        downloads: number;
        rating: number;
        aum?: number; // Active User Months
    }>;
}

// Mock data for tools (fallback if Supabase fails)
const mockTools: Tool[] = [
    {
        id: "1",
        name: "Solution Manager",
        description: "Manage your Power Platform solutions with ease.",
        iconurl: "📦",
        category: "Solutions",
        tool_analytics: [{ downloads: 1250, rating: 4.8, aum: 850 }],
    },
    {
        id: "2",
        name: "Environment Tools",
        description: "Compare environments and manage settings efficiently.",
        iconurl: "🌍",
        category: "Environments",
        tool_analytics: [{ downloads: 980, rating: 4.6, aum: 620 }],
    },
    {
        id: "3",
        name: "Code Generator",
        description: "Generate early-bound classes and TypeScript definitions.",
        iconurl: "⚡",
        category: "Development",
        tool_analytics: [{ downloads: 2100, rating: 4.9, aum: 1450 }],
    },
    {
        id: "4",
        name: "Plugin Manager",
        description: "Register and manage plugins with a modern interface.",
        iconurl: "🔌",
        category: "Development",
        tool_analytics: [{ downloads: 1450, rating: 4.7, aum: 920 }],
    },
    {
        id: "5",
        name: "Data Import/Export",
        description: "Import and export data using Excel, CSV, or JSON.",
        iconurl: "📊",
        category: "Data",
        tool_analytics: [{ downloads: 1800, rating: 4.5, aum: 1100 }],
    },
    {
        id: "6",
        name: "Performance Monitor",
        description: "Monitor and analyze solution performance.",
        iconurl: "📈",
        category: "Monitoring",
        tool_analytics: [{ downloads: 750, rating: 4.4, aum: 480 }],
    },
];

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [tools, setTools] = useState<Tool[]>(mockTools);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<"downloads" | "rating" | "aum">("downloads");

    useEffect(() => {
        async function fetchData() {
            if (!supabase) {
                setLoading(false);
                return;
            }

            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (user) {
                    setUser(user);
                }

                // Fetch tools data with analytics
                const { data: toolsData, error } = await supabase
                    .from("tools")
                    .select("id, name, description, iconurl, category, tool_analytics (downloads, rating, aum)")
                    .order("name", { ascending: true });

                if (error) throw error;
                if (toolsData) setTools(toolsData);
            } catch (error) {
                console.error("Error fetching data:", error);
                // Fallback to mock data
                setTools(mockTools);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const handleSignOut = async () => {
        if (!supabase) return;

        await supabase.auth.signOut();
        router.push("/");
    };

    const sortedTools = [...tools].sort((a, b) => {
        const aAnalytics = a.tool_analytics?.[0];
        const bAnalytics = b.tool_analytics?.[0];

        switch (sortBy) {
            case "downloads":
                return (bAnalytics?.downloads || 0) - (aAnalytics?.downloads || 0);
            case "rating":
                return (bAnalytics?.rating || 0) - (aAnalytics?.rating || 0);
            case "aum":
                return (bAnalytics?.aum || 0) - (aAnalytics?.aum || 0);
            default:
                return 0;
        }
    });

    if (loading) {
        return (
            <main>
                <Container className="mt-16 sm:mt-32">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                        <p className="mt-4 text-slate-600">Loading dashboard...</p>
                    </div>
                </Container>
            </main>
        );
    }

    return (
        <main>
            <Container className="mt-8 sm:mt-16">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto max-w-2xl lg:max-w-7xl">
                        {/* Welcome Header */}
                        <header className="mb-12">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                                        Welcome back{user?.user_metadata?.name ? `, ${user.user_metadata.name.split(" ")[0]}` : ""}!
                                    </h1>
                                    <p className="mt-4 text-lg text-slate-700">Here&apos;s an overview of all available Power Platform tools with their analytics.</p>
                                </div>
                            </div>
                        </header>

                        {/* Stats Overview */}
                        <SlideIn direction="up" delay={0.3}>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-12">
                                <div className="card p-6 bg-linear-to-br from-blue-50 to-blue-100">
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-full bg-blue-600 p-3">
                                            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-blue-900">Total Tools</p>
                                            <p className="text-2xl font-bold text-blue-900">{tools.length}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="card p-6 bg-linear-to-br from-purple-50 to-purple-100">
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-full bg-purple-600 p-3">
                                            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-purple-900">Total Downloads</p>
                                            <p className="text-2xl font-bold text-purple-900">{tools.reduce((sum, tool) => sum + (tool.tool_analytics?.[0]?.downloads || 0), 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="card p-6 bg-linear-to-br from-amber-50 to-amber-100">
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-full bg-amber-600 p-3">
                                            <svg className="h-6 w-6 text-white fill-current" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-amber-900">Average Rating</p>
                                            <p className="text-2xl font-bold text-amber-900">
                                                {tools.length > 0 ? (tools.reduce((sum, tool) => sum + (tool.tool_analytics?.[0]?.rating || 0), 0) / tools.length).toFixed(1) : "0.0"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SlideIn>

                        {/* Sort Options */}
                        <FadeIn direction="up" delay={0.4}>
                            <div className="mb-8 flex items-center justify-between">
                                <h2 className="text-2xl font-semibold text-slate-900">All Tools</h2>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="sort" className="text-sm text-slate-600">
                                        Sort by:
                                    </label>
                                    <select
                                        id="sort"
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as "downloads" | "rating" | "aum")}
                                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                    >
                                        <option value="downloads">Downloads</option>
                                        <option value="rating">Rating</option>
                                        <option value="aum">Active Users</option>
                                    </select>
                                </div>
                            </div>
                        </FadeIn>

                        {/* Tools Table */}
                        <SlideIn direction="up" delay={0.5}>
                            <div className="card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tool</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Downloads</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rating</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">AUM</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {sortedTools.map((tool) => {
                                                const analytics = tool.tool_analytics?.[0];
                                                return (
                                                    <tr key={tool.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-3">
                                                                {tool.iconurl.startsWith("http") ? (
                                                                    <Image src={tool.iconurl} alt={tool.name} width={32} height={32} className="rounded" />
                                                                ) : (
                                                                    <span className="text-2xl">{tool.iconurl}</span>
                                                                )}
                                                                <div>
                                                                    <div className="text-sm font-medium text-slate-900">{tool.name}</div>
                                                                    <div className="text-sm text-slate-500">{tool.description}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">{tool.category}</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{(analytics?.downloads || 0).toLocaleString()}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-1">
                                                                <svg className="h-4 w-4 text-amber-500 fill-current" viewBox="0 0 20 20">
                                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                </svg>
                                                                <span className="text-sm text-slate-900">{(analytics?.rating || 0).toFixed(1)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{analytics?.aum?.toLocaleString() || "N/A"}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <div className="flex gap-2">
                                                                <Link href={`/tools/${tool.id}`} className="text-blue-600 hover:text-purple-600 font-medium">
                                                                    View
                                                                </Link>
                                                                <span className="text-slate-300">|</span>
                                                                <Link href={`/rate-tool?toolId=${tool.id}`} className="text-blue-600 hover:text-purple-600 font-medium">
                                                                    Rate
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </SlideIn>
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
