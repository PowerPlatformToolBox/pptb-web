"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Container } from "@/components/Container";
import { FadeIn, SlideIn } from "@/components/animations";
import { useSupabase } from "@/lib/useSupabase";

interface Contributor {
    name: string;
    url?: string;
}

interface Category {
    id: number;
    name: string;
}

interface ToolIntake {
    id: string;
    package_name: string;
    version: string;
    display_name: string;
    description: string;
    license: string;
    contributors: Contributor[];
    csp_exceptions: Record<string, string[]> | null;
    configurations: {
        repository?: string;
        website?: string;
        funding?: string;
        iconUrl?: string;
        readmeUrl?: string;
    };
    submitted_by: string | null;
    status: string;
    validation_warnings: string[] | null;
    reviewer_notes: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
    categories?: Category[];
}

type StatusFilter = "all" | "pending_review" | "approved" | "rejected" | "needs_changes";

export default function AdminToolIntakesPage() {
    const { supabase } = useSupabase();
    const [intakes, setIntakes] = useState<ToolIntake[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending_review");
    const [selectedIntake, setSelectedIntake] = useState<ToolIntake | null>(null);
    const [reviewNotes, setReviewNotes] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const refreshIntakes = async () => {
        if (!supabase) {
            setError("Database not configured");
            setLoading(false);
            return;
        }

        try {
            let query = supabase
                .from("tool_intakes")
                .select(
                    `
                    *,
                    tool_intake_categories(
                        categories(id, name)
                    ),
                    tool_intake_contributors(
                        contributor_id,
                        contributors(id, name, profile_url)
                    )
                `,
                )
                .order("created_at", { ascending: false });

            if (statusFilter !== "all") {
                query = query.eq("status", statusFilter);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            // Transform the data to flatten categories
            const transformedData = (data || []).map((intake: any) => ({
                ...intake,
                categories: intake.tool_intake_categories?.map((tic: any) => tic.categories).filter(Boolean) || [],
                contributors:
                    intake.tool_intake_contributors
                        ?.map((tic: any) => ({
                            name: tic.contributors?.name,
                            url: tic.contributors?.profile_url || undefined,
                        }))
                        .filter((c: any) => c.name) || [],
            }));

            setIntakes(transformedData);
        } catch (err) {
            console.error("Error fetching intakes:", err);
            setError("Failed to load tool intake requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!supabase) return; // wait for client init

        async function checkAdminStatus() {
            try {
                const {
                    data: { user },
                } = await supabase!.auth.getUser();
                if (!user) {
                    setIsAdmin(false);
                    return;
                }
                // Count-based head query to avoid 406 and reduce payload
                const { count, error: roleError } = await supabase!.from("user_roles").select("role", { head: true, count: "exact" }).eq("user_id", user.id).eq("role", "admin");
                if (roleError) {
                    console.warn("Admin role check failed:", roleError);
                    setIsAdmin(false);
                } else {
                    setIsAdmin((count || 0) > 0);
                }
            } catch (err) {
                console.error("Error checking admin status:", err);
                setIsAdmin(false);
            }
        }

        refreshIntakes();
        checkAdminStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, supabase]);

    async function handleReviewAction(intakeId: string, action: "approve" | "reject" | "needs_changes") {
        if (!supabase) return;

        setActionLoading(true);
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const response = await fetch("/api/admin/tool-intakes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({
                    intakeId,
                    action,
                    reviewerNotes: reviewNotes,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update intake");
            }

            // Refresh the list
            await refreshIntakes();
            setSelectedIntake(null);
            setReviewNotes("");
        } catch (err) {
            console.error("Error updating intake:", err);
            setError(err instanceof Error ? err.message : "Failed to update intake");
        } finally {
            setActionLoading(false);
        }
    }

    async function handleConvertToTool(intakeId: string) {
        if (!supabase) return;

        setActionLoading(true);
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const response = await fetch("/api/admin/tool-intakes/convert", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({ intakeId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to convert intake to tool");
            }

            // Refresh the list
            await refreshIntakes();
            setSelectedIntake(null);
        } catch (err) {
            console.error("Error converting intake:", err);
            setError(err instanceof Error ? err.message : "Failed to convert intake to tool");
        } finally {
            setActionLoading(false);
        }
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending_review: "bg-yellow-100 text-yellow-800",
            approved: "bg-green-100 text-green-800",
            rejected: "bg-red-100 text-red-800",
            needs_changes: "bg-orange-100 text-orange-800",
            converted_to_tool: "bg-blue-100 text-blue-800",
        };
        return styles[status] || "bg-gray-100 text-gray-800";
    };

    if (loading) {
        return (
            <main>
                <Container className="mt-16 sm:mt-32">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                        <p className="mt-4 text-slate-600">Loading tool intakes...</p>
                    </div>
                </Container>
            </main>
        );
    }

    if (!isAdmin) {
        return (
            <main>
                <Container className="mt-16 sm:mt-32">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                        <h2 className="mt-4 text-xl font-semibold text-slate-900">Access Denied</h2>
                        <p className="mt-2 text-slate-600">You need admin privileges to access this page.</p>
                        <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
                            ← Back to Dashboard
                        </Link>
                    </div>
                </Container>
            </main>
        );
    }

    return (
        <main>
            <Container className="mt-8 sm:mt-16 pb-16">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto max-w-6xl">
                        {/* Back button */}
                        <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-purple-600 transition-colors mb-8">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </Link>

                        {/* Page Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Tool Intake Review</h1>
                            <p className="mt-4 text-lg text-slate-600">Review and manage tool submission requests from the community.</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        {/* Filter Tabs */}
                        <SlideIn direction="up" delay={0.3}>
                            <div className="mb-6 flex flex-wrap gap-2">
                                {(["all", "pending_review", "approved", "rejected", "needs_changes"] as StatusFilter[]).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            statusFilter === status ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                    >
                                        {status === "all" ? "All" : status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                    </button>
                                ))}
                            </div>
                        </SlideIn>

                        {/* Intakes List */}
                        <SlideIn direction="up" delay={0.4}>
                            <div className="space-y-4">
                                {intakes.length === 0 ? (
                                    <div className="card p-8 text-center">
                                        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                            />
                                        </svg>
                                        <p className="mt-4 text-slate-600">No tool intake requests found.</p>
                                    </div>
                                ) : (
                                    intakes.map((intake) => (
                                        <div key={intake.id} className="card p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-lg font-semibold text-slate-900">{intake.display_name}</h3>
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(intake.status)}`}>{intake.status.replace(/_/g, " ")}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-2">{intake.description}</p>
                                                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                                                        <span>
                                                            <strong>Package:</strong> {intake.package_name}
                                                        </span>
                                                        <span>
                                                            <strong>Version:</strong> {intake.version}
                                                        </span>
                                                        <span>
                                                            <strong>License:</strong> {intake.license}
                                                        </span>
                                                        <span>
                                                            <strong>Submitted:</strong> {new Date(intake.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    {intake.categories && intake.categories.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {intake.categories.map((cat) => (
                                                                <span key={cat.id} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                                                                    {cat.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {intake.validation_warnings && intake.validation_warnings.length > 0 && (
                                                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                                            <strong className="text-yellow-800">Warnings:</strong>
                                                            <ul className="list-disc list-inside text-yellow-700 mt-1">
                                                                {intake.validation_warnings.map((warning, idx) => (
                                                                    <li key={idx}>{warning}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {intake.reviewer_notes && (
                                                        <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded text-xs">
                                                            <strong className="text-slate-700">Reviewer Notes:</strong>
                                                            <p className="text-slate-600 mt-1">{intake.reviewer_notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <button
                                                        onClick={() => setSelectedIntake(selectedIntake?.id === intake.id ? null : intake)}
                                                        className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                                    >
                                                        {selectedIntake?.id === intake.id ? "Close" : "Review"}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Review Panel */}
                                            {selectedIntake?.id === intake.id && (
                                                <div className="mt-4 pt-4 border-t border-slate-200">
                                                    <h4 className="font-medium text-slate-900 mb-3">Review Actions</h4>

                                                    {/* Package Details */}
                                                    <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <strong className="text-slate-700">Contributors:</strong>
                                                            <ul className="text-slate-600 mt-1">
                                                                {intake.contributors.map((contrib, idx) => (
                                                                    <li key={idx}>
                                                                        {contrib.name}
                                                                        {contrib.url && (
                                                                            <a href={contrib.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:underline">
                                                                                (link)
                                                                            </a>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <strong className="text-slate-700">Links:</strong>
                                                            <ul className="text-slate-600 mt-1">
                                                                {intake.configurations.repository && (
                                                                    <li>
                                                                        <a href={intake.configurations.repository} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                                            Repository
                                                                        </a>
                                                                    </li>
                                                                )}
                                                                {intake.configurations.website && (
                                                                    <li>
                                                                        <a href={intake.configurations.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                                            Website
                                                                        </a>
                                                                    </li>
                                                                )}
                                                                {intake.configurations.readmeUrl && (
                                                                    <li>
                                                                        <a href={intake.configurations.readmeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                                            README
                                                                        </a>
                                                                    </li>
                                                                )}
                                                                <li>
                                                                    <a
                                                                        href={`https://www.npmjs.com/package/${intake.package_name}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 hover:underline"
                                                                    >
                                                                        npm Package
                                                                    </a>
                                                                </li>
                                                            </ul>
                                                        </div>
                                                    </div>

                                                    {/* Review Notes */}
                                                    <div className="mb-4">
                                                        <label htmlFor="reviewNotes" className="block text-sm font-medium text-slate-700 mb-1">
                                                            Review Notes
                                                        </label>
                                                        <textarea
                                                            id="reviewNotes"
                                                            value={reviewNotes}
                                                            onChange={(e) => setReviewNotes(e.target.value)}
                                                            placeholder="Add notes about your review decision..."
                                                            rows={3}
                                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                                        />
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex flex-wrap gap-3">
                                                        {intake.status === "approved" ? (
                                                            <button
                                                                onClick={() => handleConvertToTool(intake.id)}
                                                                disabled={actionLoading}
                                                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                            >
                                                                {actionLoading ? "Processing..." : "🚀 Convert to Tool"}
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => handleReviewAction(intake.id, "approve")}
                                                                    disabled={actionLoading}
                                                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                                                >
                                                                    {actionLoading ? "Processing..." : "✓ Approve"}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReviewAction(intake.id, "needs_changes")}
                                                                    disabled={actionLoading}
                                                                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                                                                >
                                                                    {actionLoading ? "Processing..." : "⚠ Request Changes"}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReviewAction(intake.id, "reject")}
                                                                    disabled={actionLoading}
                                                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                                                                >
                                                                    {actionLoading ? "Processing..." : "✕ Reject"}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </SlideIn>
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
