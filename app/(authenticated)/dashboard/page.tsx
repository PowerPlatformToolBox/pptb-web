"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Container } from "@/components/Container";
import { FadeIn, SlideIn } from "@/components/animations";
import { useSupabase } from "@/lib/useSupabase";

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
    user_id?: string;
    status?: string;
    tool_categories?: Array<{
        categories: {
            id: number;
            name: string;
        };
    }>;
    categories?: Array<{ id: number; name: string }>; // Transformed from tool_categories
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
        categories: [{ id: 1, name: "Solutions" }],
        tool_analytics: [{ downloads: 1250, rating: 4.8, aum: 850 }],
    },
    {
        id: "2",
        name: "Environment Tools",
        description: "Compare environments and manage settings efficiently.",
        iconurl: "🌍",
        categories: [{ id: 2, name: "Environments" }],
        tool_analytics: [{ downloads: 980, rating: 4.6, aum: 620 }],
    },
    {
        id: "3",
        name: "Code Generator",
        description: "Generate early-bound classes and TypeScript definitions.",
        iconurl: "⚡",
        categories: [{ id: 3, name: "Development" }],
        tool_analytics: [{ downloads: 2100, rating: 4.9, aum: 1450 }],
    },
    {
        id: "4",
        name: "Plugin Manager",
        description: "Register and manage plugins with a modern interface.",
        iconurl: "🔌",
        categories: [{ id: 3, name: "Development" }],
        tool_analytics: [{ downloads: 1450, rating: 4.7, aum: 920 }],
    },
    {
        id: "5",
        name: "Data Import/Export",
        description: "Import and export data using Excel, CSV, or JSON.",
        iconurl: "📊",
        categories: [{ id: 4, name: "Data" }],
        tool_analytics: [{ downloads: 1800, rating: 4.5, aum: 1100 }],
    },
    {
        id: "6",
        name: "Performance Monitor",
        description: "Monitor and analyze solution performance.",
        iconurl: "📈",
        categories: [{ id: 5, name: "Monitoring" }],
        tool_analytics: [{ downloads: 750, rating: 4.4, aum: 480 }],
    },
];

export default function DashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [tools, setTools] = useState<Tool[]>(mockTools);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<"downloads" | "rating" | "aum">("downloads");
    const [viewMode, setViewMode] = useState<"all" | "my">("all");
    const { supabase } = useSupabase();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (!supabase) return;
        (async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (user) {
                    setUser(user);

                    // Check if user is admin (avoid single/maybeSingle to prevent 406)
                    const { data: roleRows, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").limit(1);

                    if (roleError) {
                        console.warn("Role check failed:", roleError);
                    }
                    setIsAdmin(!!roleRows && roleRows.length > 0);
                }

                // Fetch tools data with analytics and categories
                const { data: toolsData, error } = await supabase
                    .from("tools")
                    .select(
                        `
                        id, 
                        name, 
                        description, 
                        iconurl, 
                        user_id,
                        status,
                        tool_analytics (downloads, rating, aum),
                        tool_categories (
                            categories (id, name)
                        )
                    `,
                    )
                    .order("name", { ascending: true });
                if (error) throw error;
                if (toolsData) {
                    // Transform tool_categories for easier rendering
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const transformedTools = toolsData.map((tool: any) => ({
                        ...tool,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        categories: tool.tool_categories?.map((tc: any) => tc.categories).filter(Boolean) || [],
                    })) as Tool[];
                    setTools(transformedTools);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                setTools(mockTools);
            } finally {
                setLoading(false);
            }
        })();
    }, [supabase]);

    // Sign out logic handled in Header component.

    const handleToolAction = async (toolId: string, action: "deprecate" | "delete") => {
        if (!supabase || !user) return;

        const confirmMessage =
            action === "deprecate"
                ? "Are you sure you want to deprecate this tool? It will be marked as deprecated but remain visible."
                : "Are you sure you want to delete this tool? This action cannot be undone.";

        if (!confirm(confirmMessage)) return;

        try {
            const newStatus = action === "deprecate" ? "deprecated" : "deleted";

            const {
                data: { session },
            } = await supabase.auth.getSession();

            const response = await fetch("/api/tools/update-status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ toolId, status: newStatus }),
            });

            if (!response.ok) {
                throw new Error("Failed to update tool status");
            }

            // Update local state
            setTools((prevTools) =>
                prevTools.map((tool) =>
                    tool.id === toolId ? { ...tool, status: newStatus } : tool
                )
            );

            alert(`Tool ${action === "deprecate" ? "deprecated" : "deleted"} successfully!`);
        } catch (error) {
            console.error("Error updating tool:", error);
            alert(`Failed to ${action} tool. Please try again.`);
        }
    };

    // Filter tools based on view mode
    const filteredTools = viewMode === "my" 
        ? tools.filter((tool) => tool.user_id === user?.id)
        : tools;

    const sortedTools = [...filteredTools].sort((a, b) => {
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
                                <div className="flex gap-3">
                                    {isAdmin && (
                                        <Link href="/admin/tool-intakes" className="btn-secondary flex items-center gap-2">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                                                />
                                            </svg>
                                            Review Intakes
                                        </Link>
                                    )}
                                    <Link href="/submit-tool" className="btn-primary flex items-center gap-2">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Submit Tool
                                    </Link>
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
                                            <p className="text-sm font-medium text-blue-900">{viewMode === "my" ? "My Tools" : "Total Tools"}</p>
                                            <p className="text-2xl font-bold text-blue-900">{filteredTools.length}</p>
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
                                            <p className="text-2xl font-bold text-purple-900">{filteredTools.reduce((sum, tool) => sum + (tool.tool_analytics?.[0]?.downloads || 0), 0).toLocaleString()}</p>
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
                                                {filteredTools.length > 0 ? (filteredTools.reduce((sum, tool) => sum + (tool.tool_analytics?.[0]?.rating || 0), 0) / filteredTools.length).toFixed(1) : "0.0"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SlideIn>

                        {/* View Selector and Sort Options */}
                        <FadeIn direction="up" delay={0.4}>
                            <div className="mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-2xl font-semibold text-slate-900">Tools</h2>
                                    <div className="flex gap-2 border border-slate-300 rounded-lg p-1">
                                        <button
                                            onClick={() => setViewMode("all")}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                                viewMode === "all"
                                                    ? "bg-blue-600 text-white shadow-sm"
                                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                            }`}
                                        >
                                            All Tools
                                        </button>
                                        <button
                                            onClick={() => setViewMode("my")}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                                viewMode === "my"
                                                    ? "bg-blue-600 text-white shadow-sm"
                                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                            }`}
                                        >
                                            My Tools
                                        </button>
                                    </div>
                                </div>
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
                            {sortedTools.length === 0 ? (
                                <div className="card p-12 text-center">
                                    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                        />
                                    </svg>
                                    <h3 className="mt-4 text-lg font-medium text-slate-900">No tools found</h3>
                                    <p className="mt-2 text-slate-600">
                                        {viewMode === "my" ? "You haven't submitted any tools yet." : "No tools are available at the moment."}
                                    </p>
                                    {viewMode === "my" && (
                                        <Link href="/submit-tool" className="mt-6 inline-flex items-center gap-2 btn-primary">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Submit Your First Tool
                                        </Link>
                                    )}
                                </div>
                            ) : (
                            <div className="card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tool</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                                                {viewMode === "my" && (
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                )}
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
                                                            <div className="flex flex-wrap gap-1">
                                                                {tool.categories && tool.categories.length > 0 ? (
                                                                    tool.categories.map((cat) => (
                                                                        <span key={cat.id} className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                                                                            {cat.name}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="px-2 py-1 text-xs font-medium text-slate-400 bg-slate-100 rounded-full">N/A</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        {viewMode === "my" && (
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {tool.status === "deprecated" ? (
                                                                    <span className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">Deprecated</span>
                                                                ) : tool.status === "deleted" ? (
                                                                    <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">Deleted</span>
                                                                ) : (
                                                                    <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">Active</span>
                                                                )}
                                                            </td>
                                                        )}
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
                                                                {viewMode === "my" ? (
                                                                    <>
                                                                        <Link href={`/tools/${tool.id}`} className="text-blue-600 hover:text-purple-600 font-medium">
                                                                            View
                                                                        </Link>
                                                                        <span className="text-slate-300">|</span>
                                                                        <button
                                                                            onClick={() => handleToolAction(tool.id, "deprecate")}
                                                                            disabled={tool.status === "deprecated" || tool.status === "deleted"}
                                                                            className="text-amber-600 hover:text-amber-700 font-medium disabled:text-slate-400 disabled:cursor-not-allowed"
                                                                        >
                                                                            {tool.status === "deprecated" ? "Deprecated" : "Deprecate"}
                                                                        </button>
                                                                        <span className="text-slate-300">|</span>
                                                                        <button
                                                                            onClick={() => handleToolAction(tool.id, "delete")}
                                                                            disabled={tool.status === "deleted"}
                                                                            className="text-red-600 hover:text-red-700 font-medium disabled:text-slate-400 disabled:cursor-not-allowed"
                                                                        >
                                                                            {tool.status === "deleted" ? "Deleted" : "Delete"}
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Link href={`/tools/${tool.id}`} className="text-blue-600 hover:text-purple-600 font-medium">
                                                                            View
                                                                        </Link>
                                                                        <span className="text-slate-300">|</span>
                                                                        <Link href={`/rate-tool?toolId=${tool.id}`} className="text-blue-600 hover:text-purple-600 font-medium">
                                                                            Rate
                                                                        </Link>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            )}
                        </SlideIn>
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
