"use client";

import { Container } from "@/components/Container";
import { VerifiedCheckmark } from "@/components/VerifiedCheckmark";
import { FunnelIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

const PAGE_SIZE = 12;
const RECENT_WINDOW_DAYS = 90;

function subscribeToFilters(onChange: () => void) {
    window.addEventListener("popstate", onChange);
    window.addEventListener("tools:filters", onChange);
    return () => {
        window.removeEventListener("popstate", onChange);
        window.removeEventListener("tools:filters", onChange);
    };
}

function getFilterQuery() {
    return window.location.search;
}

function getServerFilterQuery() {
    return "";
}

interface Tool {
    id: string;
    name: string;
    description: string;
    icon: string;
    categories: string[];
    downloads: number;
    rating: number;
    contributors: string[];
    mau?: number;
    tool_maturity?: { status: "unverified" | "verified" };
    mcp_enabled?: boolean;
    multi_connection?: string | null;
    enabled_for_power_platform_api?: boolean;
    published_at?: string | null;
    created_at?: string | null;
}

function isRecentlyPublished(tool: Tool) {
    const date = tool.published_at || tool.created_at;
    if (!date) return false;

    const publishedAt = new Date(date).getTime();
    const age = Date.now() - publishedAt;
    return Number.isFinite(publishedAt) && age >= 0 && age <= RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export default function ToolsPage() {
    const [tools, setTools] = useState<Tool[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const filterParams = new URLSearchParams(useSyncExternalStore(subscribeToFilters, getFilterQuery, getServerFilterQuery));
    const selectedCategory = filterParams.get("category") || "All";
    const searchQuery = filterParams.get("q") || "";
    const mcpOnly = filterParams.get("mcp") === "true";
    const verifiedOnly = filterParams.get("verified") === "true";
    const powerPlatformOnly = filterParams.get("powerPlatform") === "true";
    const multiConnection = filterParams.get("multiConnection") || "any";
    const selectedView = filterParams.get("view") || "all";
    const sortBy = filterParams.get("sort") || (selectedView === "popular" ? "downloads" : "featured");
    const requestedPage = Math.max(1, Number.parseInt(filterParams.get("page") || "1", 10) || 1);

    function updateQueryParams(updates: Record<string, string | null>, resetPage = true) {
        const url = new URL(window.location.href);
        for (const [key, value] of Object.entries(updates)) {
            if (value) url.searchParams.set(key, value);
            else url.searchParams.delete(key);
        }
        if (resetPage && !("page" in updates)) url.searchParams.delete("page");
        window.history.replaceState(null, "", url);
        window.dispatchEvent(new Event("tools:filters"));
    }

    function clearFilters() {
        updateQueryParams({
            category: null,
            q: null,
            mcp: null,
            verified: null,
            powerPlatform: null,
            multiConnection: null,
            sort: null,
            view: null,
            page: null,
        });
    }

    useEffect(() => {
        let cancelled = false;

        async function loadTools() {
            try {
                const response = await fetch("/api/tools");
                if (!response.ok) throw new Error(`Failed to fetch tools: ${response.status}`);

                const data: unknown = await response.json();
                if (!Array.isArray(data)) throw new Error("The tools response was not a list");

                const transformed: Tool[] = data.map(
                    (tool: {
                        id: string;
                        name: string;
                        description: string;
                        icon: string | null;
                        tool_analytics?: { downloads?: number; rating?: number; mau?: number } | null;
                        tool_categories?: Array<{ categories: { name: string } | null }> | null;
                        tool_contributors?: Array<{ contributors: { name: string } | null }> | null;
                        tool_maturity?: { status: "unverified" | "verified" };
                        mcp_enabled?: boolean;
                        multi_connection?: string | null;
                        enabled_for_power_platform_api?: boolean;
                        published_at?: string | null;
                        created_at?: string | null;
                    }) => ({
                        id: tool.id,
                        name: tool.name,
                        description: tool.description,
                        icon: tool.icon || "📦",
                        contributors: tool.tool_contributors?.flatMap((item) => (item.contributors ? [item.contributors.name] : [])) || [],
                        categories: tool.tool_categories?.flatMap((item) => (item.categories ? [item.categories.name] : [])) || [],
                        downloads: tool.tool_analytics?.downloads || 0,
                        rating: tool.tool_analytics?.rating || 0,
                        mau: tool.tool_analytics?.mau || 0,
                        tool_maturity: tool.tool_maturity || { status: "unverified" },
                        mcp_enabled: tool.mcp_enabled ?? false,
                        multi_connection: tool.multi_connection ?? null,
                        enabled_for_power_platform_api: tool.enabled_for_power_platform_api ?? false,
                        published_at: tool.published_at ?? null,
                        created_at: tool.created_at ?? null,
                    }),
                );
                if (!cancelled) setTools(transformed);
            } catch (error) {
                console.error("Error fetching tools:", error);
                if (!cancelled) setLoadError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadTools();
        return () => {
            cancelled = true;
        };
    }, []);

    const categories = ["All", ...Array.from(new Set(tools.flatMap((tool) => tool.categories))).filter(Boolean).sort((a, b) => a.localeCompare(b))];
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    const filteredTools = tools
        .filter((tool) => {
            const matchesCategory = selectedCategory === "All" || tool.categories.includes(selectedCategory);
            const searchableText = [tool.name, tool.description, ...tool.categories, ...tool.contributors].join(" ").toLocaleLowerCase();
            const matchesSearch = normalizedQuery === "" || searchableText.includes(normalizedQuery);
            const matchesView =
                selectedView === "verified"
                    ? tool.tool_maturity?.status === "verified"
                    : selectedView === "recent"
                      ? isRecentlyPublished(tool)
                      : true;

            return (
                matchesCategory &&
                matchesSearch &&
                matchesView &&
                (!mcpOnly || tool.mcp_enabled) &&
                (!verifiedOnly || tool.tool_maturity?.status === "verified") &&
                (!powerPlatformOnly || tool.enabled_for_power_platform_api) &&
                (multiConnection === "any" || tool.multi_connection === multiConnection)
            );
        })
        .sort((first, second) => {
            if (sortBy === "downloads" || selectedView === "popular") return second.downloads - first.downloads || first.name.localeCompare(second.name);
            if (sortBy === "rating") return second.rating - first.rating || first.name.localeCompare(second.name);
            if (sortBy === "newest") return (second.published_at || second.created_at || "").localeCompare(first.published_at || first.created_at || "") || first.name.localeCompare(second.name);
            if (sortBy === "name") return first.name.localeCompare(second.name);
            return Number(second.tool_maturity?.status === "verified") - Number(first.tool_maturity?.status === "verified") || first.name.localeCompare(second.name);
        });

    const filteredCount = filteredTools.length;
    const pageCount = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
    const currentPage = Math.min(requestedPage, pageCount);
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pageTools = filteredTools.slice(pageStart, pageStart + PAGE_SIZE);
    const hasFilters =
        searchQuery !== "" ||
        selectedCategory !== "All" ||
        mcpOnly ||
        verifiedOnly ||
        powerPlatformOnly ||
        multiConnection !== "any" ||
        sortBy !== "featured" ||
        selectedView !== "all";
    const activeAdvancedFilters = Number(mcpOnly) + Number(verifiedOnly) + Number(powerPlatformOnly) + Number(multiConnection !== "any");
    const quickViews = [
        { id: "all", label: "All tools", count: loading ? undefined : tools.length },
        { id: "recent", label: "New & updated", count: loading ? undefined : tools.filter(isRecentlyPublished).length },
        { id: "verified", label: "Verified", count: loading ? undefined : tools.filter((tool) => tool.tool_maturity?.status === "verified").length },
        { id: "popular", label: "Most popular" },
    ];

    return (
        <main className="bg-slate-50 pb-20">
            <Container className="pt-8 sm:pt-10">
                <div className="mx-auto max-w-7xl">
                    <header className="mb-6 flex items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Power Platform tools</h1>
                        </div>
                        <Link href="/ideas" className="shrink-0 text-right text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline">
                            <span className="hidden sm:inline">Missing a tool? </span>Suggest one
                        </Link>
                    </header>

                    <section aria-label="Find a tool" className="mb-5">
                        <div className="flex gap-2">
                            <label className="relative block min-w-0 flex-1">
                                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input
                                    type="search"
                                    aria-label="Search all tools"
                                    placeholder="Search tools by name, category, or contributor..."
                                    value={searchQuery}
                                    onChange={(event) => updateQueryParams({ q: event.target.value || null })}
                                    className="block h-12 w-full rounded-lg border border-slate-300 bg-white pl-12 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                            <button
                                type="button"
                                aria-expanded={filtersOpen}
                                aria-controls="advanced-tool-filters"
                                onClick={() => setFiltersOpen((open) => !open)}
                                className={`inline-flex h-12 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors ${filtersOpen || activeAdvancedFilters ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                            >
                                <FunnelIcon className="h-4 w-4" aria-hidden="true" />
                                <span className="hidden sm:inline">Filters</span>
                                {activeAdvancedFilters > 0 && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs">{activeAdvancedFilters}</span>}
                            </button>
                        </div>

                        <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200 pb-2" aria-label="Featured tool views">
                            {quickViews.map((view) => (
                                <button
                                    key={view.id}
                                    type="button"
                                    onClick={() =>
                                        updateQueryParams({
                                            view: view.id === "all" ? null : view.id,
                                            ...(view.id === "popular" ? { sort: "downloads" } : selectedView === "popular" ? { sort: null } : {}),
                                        })
                                    }
                                    aria-pressed={selectedView === view.id}
                                    className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${selectedView === view.id ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}
                                >
                                    {view.label}
                                    {view.count !== undefined && <span className={`ml-1.5 text-xs ${selectedView === view.id ? "text-blue-600" : "text-slate-400"}`}>{view.count}</span>}
                                </button>
                            ))}
                        </nav>

                        <nav className="flex gap-2 overflow-x-auto py-3" aria-label="Tool categories">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    type="button"
                                    onClick={() => updateQueryParams({ category: category === "All" ? null : category })}
                                    aria-pressed={selectedCategory === category}
                                    className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${selectedCategory === category ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}
                                >
                                    {category === "All" ? "All categories" : category}
                                </button>
                            ))}
                        </nav>

                        {filtersOpen && (
                            <div id="advanced-tool-filters" className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 py-3 text-sm text-slate-700">
                                {[
                                    { label: "MCP enabled", key: "mcp", checked: mcpOnly },
                                    { label: "Verified only", key: "verified", checked: verifiedOnly },
                                    { label: "Power Platform API", key: "powerPlatform", checked: powerPlatformOnly },
                                ].map((filter) => (
                                    <label key={filter.key} className="inline-flex min-h-9 cursor-pointer items-center gap-2 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={filter.checked}
                                            onChange={(event) => updateQueryParams({ [filter.key]: event.target.checked ? "true" : null })}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                                        />
                                        {filter.label}
                                    </label>
                                ))}
                                <label className="inline-flex min-h-9 items-center gap-2 whitespace-nowrap">
                                    Multi-connection
                                    <select
                                        value={multiConnection}
                                        onChange={(event) => updateQueryParams({ multiConnection: event.target.value === "any" ? null : event.target.value })}
                                        className="h-9 min-w-20 rounded-md border border-slate-300 bg-white px-2 text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", lineHeight: "20px" }}
                                    >
                                        <option value="any">Any</option>
                                        <option value="required">Required</option>
                                        <option value="optional">Optional</option>
                                        <option value="none">None</option>
                                    </select>
                                </label>
                            </div>
                        )}
                    </section>

                    <div className="mb-3 flex min-h-9 items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-3 text-slate-500">
                            <span aria-live="polite">
                                {loading ? "Loading tools..." : filteredCount === 0 ? "No tools found" : `${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filteredCount)} of ${filteredCount} tools`}
                            </span>
                            {hasFilters && (
                                <button type="button" onClick={clearFilters} className="font-medium text-blue-700 hover:underline">
                                    Clear filters
                                </button>
                            )}
                        </div>
                        <label className="flex shrink-0 items-center gap-2 text-slate-500">
                            <span className="hidden sm:inline">Sort by</span>
                            <select
                                value={sortBy}
                                onChange={(event) =>
                                    updateQueryParams({
                                        sort: event.target.value === "featured" ? null : event.target.value,
                                        ...(selectedView === "popular" ? { view: null } : {}),
                                    })
                                }
                                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", lineHeight: "20px" }}
                                aria-label="Sort tools"
                            >
                                <option value="featured">Featured</option>
                                <option value="downloads">Most downloaded</option>
                                <option value="rating">Top rated</option>
                                <option value="newest">Recently published</option>
                                <option value="name">A–Z</option>
                            </select>
                        </label>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Loading tools">
                            {Array.from({ length: 8 }, (_, index) => (
                                <div key={index} className="h-52 animate-pulse rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="h-5 w-2/5 rounded bg-slate-100" />
                                    <div className="mt-5 flex gap-3">
                                        <div className="h-12 w-12 rounded-lg bg-slate-100" />
                                        <div className="flex-1 space-y-2 pt-1">
                                            <div className="h-4 w-3/4 rounded bg-slate-100" />
                                            <div className="h-3 w-1/2 rounded bg-slate-100" />
                                        </div>
                                    </div>
                                    <div className="mt-5 h-8 rounded bg-slate-100" />
                                </div>
                            ))}
                        </div>
                    ) : loadError ? (
                        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center">
                            <h2 className="text-lg font-semibold text-slate-900">Tools couldn’t be loaded</h2>
                            <p className="mt-2 text-sm text-slate-600">Please try again in a moment.</p>
                            <button type="button" onClick={() => window.location.reload()} className="mt-4 text-sm font-semibold text-blue-700 hover:underline">
                                Try again
                            </button>
                        </div>
                    ) : pageTools.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                            <h2 className="text-lg font-semibold text-slate-900">No tools found</h2>
                            <p className="mt-2 text-sm text-slate-600">Try another search or adjust your filters.</p>
                            {hasFilters && (
                                <button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-blue-700 hover:underline">
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {pageTools.map((tool) => (
                                <Link
                                    key={tool.id}
                                    href={`/tools/${tool.id}`}
                                    className="group flex min-h-52 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                >
                                    <div className="mb-3 flex h-12 content-start flex-wrap gap-1.5 overflow-hidden">
                                        {tool.categories.slice(0, 2).map((category) => (
                                            <span key={category} className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                                                {category}
                                            </span>
                                        ))}
                                        {tool.tool_maturity?.status === "verified" && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">
                                                <VerifiedCheckmark className="h-3 w-3" />
                                                Verified
                                            </span>
                                        )}
                                        {isRecentlyPublished(tool) && <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">Recently updated</span>}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-linear-to-br from-blue-50 to-purple-50">
                                            {tool.icon.startsWith("http") ? (
                                                <Image
                                                    src={tool.icon}
                                                    alt={`${tool.name} icon`}
                                                    width={40}
                                                    height={40}
                                                    className="h-10 w-10 object-contain"
                                                    onError={(event) => {
                                                        event.currentTarget.style.display = "none";
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-2xl" aria-hidden="true">{tool.icon || "📦"}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900 group-hover:text-blue-700" title={tool.name}>
                                                {tool.name}
                                            </h2>
                                            <p className="mt-1 truncate text-xs text-slate-500">{tool.contributors.join(", ") || "Community contributor"}</p>
                                        </div>
                                    </div>

                                    <p className="mt-3 line-clamp-2 flex-1 text-xs leading-5 text-slate-600" title={tool.description}>
                                        {tool.description}
                                    </p>

                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                                        <span className="inline-flex items-center gap-1.5" title={`${tool.downloads.toLocaleString()} downloads`}>
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            {tool.downloads.toLocaleString()}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-amber-600" title={`${tool.rating > 0 ? tool.rating.toFixed(1) : "No"} rating`}>
                                            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            {tool.rating > 0 ? tool.rating.toFixed(1) : "--"}
                                        </span>
                                        <span className="font-semibold text-blue-700">View tool <span aria-hidden="true">→</span></span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {!loading && pageCount > 1 && (
                        <nav className="mt-7 flex flex-wrap items-center justify-center gap-2" aria-label="Tool pages">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => updateQueryParams({ page: currentPage > 2 ? String(currentPage - 1) : null }, false)}
                                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Previous
                            </button>
                            {Array.from({ length: pageCount }, (_, index) => index + 1)
                                .filter((page) => page === 1 || page === pageCount || Math.abs(page - currentPage) <= 1)
                                .map((page, index, visiblePages) => (
                                    <span key={page} className="contents">
                                        {index > 0 && page - visiblePages[index - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
                                        <button
                                            type="button"
                                            aria-current={page === currentPage ? "page" : undefined}
                                            onClick={() => updateQueryParams({ page: page === 1 ? null : String(page) }, false)}
                                            className={`h-9 min-w-9 rounded-md border px-2 text-sm font-medium ${page === currentPage ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                                        >
                                            {page}
                                        </button>
                                    </span>
                                ))}
                            <button
                                type="button"
                                disabled={currentPage === pageCount}
                                onClick={() => updateQueryParams({ page: String(currentPage + 1) }, false)}
                                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                            </button>
                        </nav>
                    )}

                    <section className="mt-16 rounded-2xl bg-slate-900 px-6 py-10 text-center sm:px-10">
                        <h2 className="text-2xl font-bold text-white">Want to contribute a tool?</h2>
                        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300">Join our community of developers and help build the next generation of Power Platform tools.</p>
                        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                            <Link href="https://github.com/PowerPlatformToolBox" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">
                                Visit GitHub
                            </Link>
                            <Link href="/auth/signin" className="rounded-lg border border-slate-500 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                                Sign in to rate tools
                            </Link>
                        </div>
                    </section>
                </div>
            </Container>
        </main>
    );
}
