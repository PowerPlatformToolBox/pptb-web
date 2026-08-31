"use client";

import { Container } from "@/components/Container";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Criterion {
    key: string;
    category: string;
    label: string;
    reviewer_guidance: string;
    required: boolean;
    sort_order: number;
}

interface VerificationRequest {
    id: string;
    tool_id: string;
    developer_id: string;
    status: "queued" | "in_review";
    submitted_at: string;
    reviewed_by: string | null;
    tool: { id: string; name: string; version: string | null; repository: string | null } | null;
    usageMetrics: { mau: number; downloads: number; qualifyingReviews: number };
    usageMetricsMet: number;
}

interface ReviewResult {
    passed?: boolean;
    waived: boolean;
    comment: string;
}

export default function VerificationRequestsPage() {
    const [requests, setRequests] = useState<VerificationRequest[]>([]);
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [selected, setSelected] = useState<VerificationRequest | null>(null);
    const [results, setResults] = useState<Record<string, ReviewResult>>({});
    const [token] = useState(() => (typeof window === "undefined" ? "" : sessionStorage.getItem("supabaseToken") || ""));
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ kind: "success" | "warning"; message: string } | null>(null);

    useEffect(() => {
        async function loadQueue() {
            try {
                setError(null);
                const response = await fetch("/api/admin/verification-requests", { headers: { Authorization: `Bearer ${token}` } });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Failed to load verification queue");
                setRequests(data.requests || []);
                setCriteria(data.criteria || []);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : "Failed to load verification queue");
            } finally {
                setLoading(false);
            }
        }
        void loadQueue();
    }, [token]);

    async function openRequest(item: VerificationRequest) {
        try {
            setError(null);
            const response = await fetch("/api/admin/verification-requests", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ action: "claim", requestId: item.id }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to open verification request");

            const claimed = { ...item, status: "in_review" as const, reviewed_by: data.request.reviewed_by };
            setRequests((current) => current.map((request) => (request.id === item.id ? claimed : request)));
            setSelected(claimed);
            setResults(Object.fromEntries(criteria.map((criterion) => [criterion.key, { passed: undefined, waived: false, comment: "" }])));
        } catch (openError) {
            setError(openError instanceof Error ? openError.message : "Failed to open verification request");
        }
    }

    const allEvaluated = criteria.length === 13 && criteria.every((criterion) => typeof results[criterion.key]?.passed === "boolean");
    const failedRequired = criteria.filter((criterion) => criterion.required && results[criterion.key]?.passed === false && !(criterion.key === "usage_thresholds" && results[criterion.key]?.waived));
    const decision = allEvaluated ? (failedRequired.length === 0 ? "approve" : "reject") : null;

    async function decide(requestDecision: "approve" | "reject") {
        if (!selected || requestDecision !== decision) return;
        setSubmitting(true);
        setError(null);
        setNotice(null);
        try {
            const response = await fetch("/api/admin/verification-requests", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "decide",
                    requestId: selected.id,
                    decision: requestDecision,
                    results: criteria.map((criterion) => ({
                        criterionKey: criterion.key,
                        passed: results[criterion.key].passed,
                        waived: results[criterion.key].waived,
                        comment: results[criterion.key].comment,
                    })),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to complete review");

            const decisionLabel = requestDecision === "approve" ? "approved" : "rejected";
            setNotice(
                data.notificationSent
                    ? { kind: "success", message: `Verification ${decisionLabel}. The decision email was sent to the developer.` }
                    : { kind: "warning", message: data.notificationError || `Verification ${decisionLabel}, but the decision email could not be sent.` },
            );

            setRequests((current) => current.filter((request) => request.id !== selected.id));
            setSelected(null);
            setResults({});
        } catch (decisionError) {
            setError(decisionError instanceof Error ? decisionError.message : "Failed to complete review");
        } finally {
            setSubmitting(false);
        }
    }

    function updateResult(key: string, patch: Partial<ReviewResult>) {
        setResults((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
    }

    return (
        <main>
            <Container className="mt-8 sm:mt-16">
                <div className="mx-auto max-w-7xl">
                    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-emerald-700">Administration</p>
                            <h1 className="mt-1 text-3xl font-bold text-slate-900">Verification Queue</h1>
                            <p className="mt-2 text-slate-600">Oldest submissions appear first. Opening a queued request claims it.</p>
                        </div>
                        <Link href="/dashboard" className="btn-secondary">
                            Dashboard
                        </Link>
                    </header>

                    {error && (
                        <div role="alert" className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            {error}
                        </div>
                    )}
                    {notice && (
                        <div
                            role="status"
                            className={`mb-6 rounded border p-4 text-sm ${notice.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}
                        >
                            {notice.message}
                        </div>
                    )}

                    {loading ? (
                        <p className="py-16 text-center text-slate-600">Loading verification queue...</p>
                    ) : (
                        <div className="grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)]">
                            <aside className="border-r border-slate-200 pr-6">
                                <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">FIFO queue ({requests.length})</h2>
                                <div className="space-y-2">
                                    {requests.length === 0 && <p className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">No active requests.</p>}
                                    {requests.map((item, index) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => openRequest(item)}
                                            className={`w-full border p-4 text-left ${selected?.id === item.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-400"}`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-semibold text-slate-500">#{index + 1}</span>
                                                <span className={`text-xs font-medium ${item.status === "queued" ? "text-amber-700" : "text-blue-700"}`}>
                                                    {item.status === "queued" ? "Queued" : "In review"}
                                                </span>
                                            </div>
                                            <p className="mt-2 font-semibold text-slate-900">{item.tool?.name || "Unknown tool"}</p>
                                            <p className="mt-1 text-xs text-slate-500">Submitted {new Date(item.submitted_at).toLocaleString()}</p>
                                        </button>
                                    ))}
                                </div>
                            </aside>

                            <section>
                                {!selected ? (
                                    <div className="border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-600">Open the oldest queued request to begin its review.</div>
                                ) : (
                                    <div>
                                        <div className="mb-6 border-b border-slate-200 pb-5">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <h2 className="text-2xl font-bold text-slate-900">{selected.tool?.name}</h2>
                                                    <p className="mt-1 text-sm text-slate-600">Version {selected.tool?.version || "unknown"}</p>
                                                </div>
                                                {selected.tool?.repository && (
                                                    <a href={selected.tool.repository} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-700 hover:underline">
                                                        Repository
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            {criteria.map((criterion) => {
                                                const result = results[criterion.key] || { waived: false, comment: "" };
                                                return (
                                                    <fieldset key={criterion.key} className="border border-slate-200 bg-white p-5">
                                                        <legend className="px-2 text-base font-semibold text-slate-900">
                                                            {criterion.sort_order}. {criterion.label}{" "}
                                                            <span className={criterion.required ? "text-red-600" : "text-slate-500"}>{criterion.required ? "Required" : "Optional"}</span>
                                                        </legend>
                                                        <p className="mb-4 text-sm text-slate-600">{criterion.reviewer_guidance}</p>

                                                        {criterion.key === "bug_health" && (
                                                            <div className="mb-4 border-l-4 border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">
                                                                <p>
                                                                    <strong>Pass:</strong> fewer than 5 open bugs and every first maintainer response within 10 days.
                                                                </p>
                                                                <p>
                                                                    <strong>Flag:</strong> 5+ open bugs or any response later than 10 days; use reviewer judgment.
                                                                </p>
                                                                <p>
                                                                    <strong>Blocker:</strong> any bug with no maintainer response after 30 days.
                                                                </p>
                                                                <p className="mt-1">Measure issue creation to first maintainer response, not time to close.</p>
                                                            </div>
                                                        )}

                                                        {criterion.key === "usage_thresholds" && (
                                                            <div className="mb-4 grid gap-2 sm:grid-cols-3">
                                                                <Metric label="MAU" value={selected.usageMetrics.mau} met={selected.usageMetrics.mau >= 10} threshold="≥ 10" />
                                                                <Metric label="Downloads" value={selected.usageMetrics.downloads} met={selected.usageMetrics.downloads >= 50} threshold="≥ 50" />
                                                                <Metric
                                                                    label="Reviews rated 3+"
                                                                    value={selected.usageMetrics.qualifyingReviews}
                                                                    met={selected.usageMetrics.qualifyingReviews >= 1}
                                                                    threshold="≥ 1"
                                                                />
                                                                <p className="sm:col-span-3 text-sm font-medium text-slate-700">{selected.usageMetricsMet}/3 metrics met; 2 are required.</p>
                                                            </div>
                                                        )}

                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateResult(criterion.key, { passed: true, waived: false })}
                                                                className={`border px-3 py-2 text-sm font-medium ${result.passed === true ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-slate-700"}`}
                                                            >
                                                                Pass
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateResult(criterion.key, { passed: false })}
                                                                className={`border px-3 py-2 text-sm font-medium ${result.passed === false ? "border-red-600 bg-red-600 text-white" : "border-slate-300 text-slate-700"}`}
                                                            >
                                                                Not pass
                                                            </button>
                                                            {criterion.key === "usage_thresholds" && result.passed === false && (
                                                                <label className="ml-2 flex items-center gap-2 text-sm text-slate-700">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={result.waived}
                                                                        onChange={(event) => updateResult(criterion.key, { waived: event.target.checked })}
                                                                    />
                                                                    Waive for a high-quality tool with no prior usage history
                                                                </label>
                                                            )}
                                                        </div>
                                                        <label className="mt-4 block text-sm font-medium text-slate-700">
                                                            Reviewer comment
                                                            <textarea
                                                                value={result.comment}
                                                                onChange={(event) => updateResult(criterion.key, { comment: event.target.value })}
                                                                rows={2}
                                                                className="mt-1 block w-full border border-slate-300 p-2"
                                                            />
                                                        </label>
                                                    </fieldset>
                                                );
                                            })}
                                        </div>

                                        <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white py-5">
                                            <p className="text-sm text-slate-700">
                                                {!allEvaluated
                                                    ? "Evaluate all 13 criteria to decide."
                                                    : decision === "approve"
                                                      ? "All required criteria pass."
                                                      : `${failedRequired.length} required criterion/criteria did not pass.`}
                                            </p>
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    disabled={submitting || decision !== "reject"}
                                                    onClick={() => decide("reject")}
                                                    className="border border-red-600 px-4 py-2 font-semibold text-red-700 disabled:border-slate-300 disabled:text-slate-400"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={submitting || decision !== "approve"}
                                                    onClick={() => decide("approve")}
                                                    className="bg-emerald-700 px-4 py-2 font-semibold text-white disabled:bg-slate-300"
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </div>
            </Container>
        </main>
    );
}

function Metric({ label, value, met, threshold }: { label: string; value: number; met: boolean; threshold: string }) {
    return (
        <div className={`border p-3 ${met ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
            <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{value.toLocaleString()}</p>
            <p className="text-xs text-slate-600">Threshold {threshold}</p>
        </div>
    );
}
