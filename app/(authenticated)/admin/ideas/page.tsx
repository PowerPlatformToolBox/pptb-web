"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Container } from "@/components/Container";
import { IdeaBadges, IdeaLinks } from "@/components/IdeaDetails";
import { filterIdeas, IDEA_RESOLUTIONS, IDEA_STATUSES, IDEA_TYPES, validateIdeaReview, type Idea, type IdeaReview, type IdeaStatus, type IdeaType } from "@/lib/ideas";
import { useSupabase } from "@/lib/useSupabase";

export default function AdminIdeasPage() {
    const { supabase, error: connectionError } = useSupabase();
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [review, setReview] = useState<IdeaReview | null>(null);
    const [typeFilter, setTypeFilter] = useState<IdeaType | "all">("all");
    const [statusFilter, setStatusFilter] = useState<IdeaStatus | "all">("all");
    const selectedIdea = ideas.find((idea) => idea.id === review?.id);

    const request = useCallback(
        async (method: "GET" | "PATCH", body?: IdeaReview) => {
            if (!supabase) throw new Error("Database connection is unavailable.");
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();
            if (sessionError || !session) throw new Error("Please sign in again to manage ideas.");
            const response = await fetch("/api/admin/ideas", {
                method,
                headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
                body: body ? JSON.stringify(body) : undefined,
                cache: "no-store",
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "The request could not be completed.");
            return data;
        },
        [supabase],
    );

    const loadIdeas = useCallback(async () => {
        try {
            const { data } = await request("GET");
            setIdeas(data);
            setReview(null);
            setError("");
        } catch (error) {
            console.error("Error loading maintainer ideas:", error);
            setError(error instanceof Error ? error.message : "Ideas could not be loaded.");
        } finally {
            setLoading(false);
        }
    }, [request]);

    useEffect(() => {
        if (!supabase) return;
        let active = true;
        void request("GET")
            .then(({ data }) => {
                if (active) setIdeas(data);
            })
            .catch((error: unknown) => {
                console.error("Error loading maintainer ideas:", error);
                if (active) setError(error instanceof Error ? error.message : "Ideas could not be loaded.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [supabase, request]);

    function edit(idea: Idea) {
        setReview({
            id: idea.id,
            expectedUpdatedAt: idea.updated_at,
            status: idea.status,
            resolution: idea.resolution,
            publicNote: idea.public_note,
            duplicateOf: idea.duplicate_of,
            githubIssueUrl: idea.github_issue_url,
        });
        setError("");
        setSuccess("");
    }

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!review || saving) return;
        const validationError = validateIdeaReview(review);
        if (validationError) {
            setError(validationError);
            return;
        }
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            await request("PATCH", review);
            setReview(null);
            setSuccess("Idea updated. The review change has been recorded.");
            await loadIdeas();
        } catch (error) {
            console.error("Error saving idea review:", error);
            setError(error instanceof Error ? error.message : "Idea could not be updated.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="py-12">
            <Container>
                <div className="mx-auto max-w-5xl">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl font-bold text-slate-900">Manage ideas</h1>
                        <Link href="/ideas" className="font-semibold text-blue-700 hover:underline">
                            Public idea board
                        </Link>
                    </div>
                    <p className="mt-3 text-slate-600">
                        Triage all community ideas. For PPTB work, create an issue in GitHub or find an existing issue, then paste its URL below. GitHub remains authoritative for delivery progress.
                    </p>
                    <div className="mt-6 flex flex-wrap items-end gap-4">
                        <label className="text-sm font-medium text-slate-700">
                            Idea type
                            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as IdeaType | "all")} className="mt-1 block rounded-md border-slate-300">
                                <option value="all">All types</option>
                                {Object.entries(IDEA_TYPES).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-sm font-medium text-slate-700">
                            Status
                            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as IdeaStatus | "all")} className="mt-1 block rounded-md border-slate-300">
                                <option value="all">All statuses</option>
                                {Object.entries(IDEA_STATUSES).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button
                            type="button"
                            disabled={loading || saving || !supabase}
                            onClick={() => {
                                setLoading(true);
                                setError("");
                                void loadIdeas();
                            }}
                            className="rounded-md border border-slate-300 px-4 py-2 disabled:opacity-50"
                        >
                            Reload ideas
                        </button>
                    </div>
                    {(error || connectionError) && (
                        <p role="alert" className="mt-4 text-red-700">
                            {error || "Ideas are unavailable. Please try again later."}
                        </p>
                    )}
                    {success && (
                        <p role="status" className="mt-4 text-green-700">
                            {success}
                        </p>
                    )}
                    {loading && !connectionError && (
                        <p role="status" className="mt-6">
                            Loading ideas...
                        </p>
                    )}
                    {!loading && !error && filterIdeas(ideas, typeFilter, statusFilter).length === 0 && <p className="mt-6 text-slate-600">No ideas match these filters.</p>}
                    <div className="mt-8 grid gap-8 lg:grid-cols-2">
                        <div className="divide-y divide-slate-200">
                            {filterIdeas(ideas, typeFilter, statusFilter).map((idea) => (
                                <article key={idea.id} className="py-5">
                                    <IdeaBadges idea={idea} />
                                    <h2 className="mt-2 wrap-break-word text-lg font-semibold">{idea.title}</h2>
                                    <p className="mt-2 wrap-break-word whitespace-pre-wrap text-sm text-slate-600">{idea.description}</p>
                                    <p className="my-2 text-sm text-slate-500">{idea.upvotes} votes</p>
                                    <IdeaLinks idea={idea} />
                                    <button type="button" disabled={saving} onClick={() => edit(idea)} className="mt-3 font-semibold text-blue-700 hover:underline disabled:opacity-50">
                                        Manage {idea.title}
                                    </button>
                                </article>
                            ))}
                        </div>
                        {review && selectedIdea && (
                            <form onSubmit={(event) => void save(event)} className="space-y-5 self-start rounded-lg border border-slate-200 p-5">
                                <h2 className="wrap-break-word text-xl font-semibold">Review: {selectedIdea.title}</h2>
                                <label className="block text-sm font-medium">
                                    Status
                                    <select
                                        value={review.status}
                                        onChange={(event) => {
                                            const status = event.target.value as IdeaStatus;
                                            setReview({
                                                ...review,
                                                status,
                                                resolution: status === "closed" ? review.resolution : null,
                                                duplicateOf: status === "duplicate" ? review.duplicateOf : null,
                                            });
                                        }}
                                        className="mt-1 block w-full rounded-md border-slate-300"
                                    >
                                        {Object.entries(IDEA_STATUSES).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                {review.status === "closed" && (
                                    <label className="block text-sm font-medium">
                                        Closed resolution
                                        <select
                                            required
                                            value={review.resolution ?? ""}
                                            onChange={(event) => setReview({ ...review, resolution: event.target.value as IdeaReview["resolution"] })}
                                            className="mt-1 block w-full rounded-md border-slate-300"
                                        >
                                            <option value="" disabled>
                                                Choose a resolution
                                            </option>
                                            {Object.entries(IDEA_RESOLUTIONS).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                )}
                                {review.status === "duplicate" && (
                                    <label className="block text-sm font-medium">
                                        Original idea
                                        <select
                                            required
                                            value={review.duplicateOf ?? ""}
                                            onChange={(event) => setReview({ ...review, duplicateOf: event.target.value })}
                                            className="mt-1 block w-full rounded-md border-slate-300"
                                        >
                                            <option value="" disabled>
                                                Choose the original idea
                                            </option>
                                            {ideas
                                                .filter((idea) => idea.id !== review.id)
                                                .map((idea) => (
                                                    <option key={idea.id} value={idea.id}>
                                                        {IDEA_TYPES[idea.idea_type]}: {idea.title}
                                                    </option>
                                                ))}
                                        </select>
                                    </label>
                                )}
                                <label className="block text-sm font-medium">
                                    Public explanation {review.status === "closed" ? "(required)" : "(optional)"}
                                    <textarea
                                        required={review.status === "closed"}
                                        maxLength={3000}
                                        rows={4}
                                        value={review.publicNote ?? ""}
                                        onChange={(event) => setReview({ ...review, publicNote: event.target.value || null })}
                                        className="mt-1 block w-full rounded-md border-slate-300"
                                    />
                                </label>
                                {selectedIdea.idea_type !== "tool" && (
                                    <div>
                                        <label className="block text-sm font-medium">
                                            GitHub issue URL (optional)
                                            <input
                                                type="url"
                                                value={review.githubIssueUrl ?? ""}
                                                onChange={(event) => setReview({ ...review, githubIssueUrl: event.target.value.trim() || null })}
                                                className="mt-1 block w-full rounded-md border-slate-300"
                                            />
                                        </label>
                                        <a
                                            href={`https://github.com/PowerPlatformToolBox/${selectedIdea.idea_type === "pptb_desktop" ? "desktop-app" : "vscode-extension"}/issues`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-2 inline-block text-sm text-blue-700 hover:underline"
                                        >
                                            Find or create an issue in the matching repository
                                        </a>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Use the canonical issue URL, without query parameters or fragments. The link format is validated; issue existence is not checked.
                                        </p>
                                    </div>
                                )}
                                <p className="text-xs text-slate-500">
                                    Closed and duplicate ideas keep their votes but cannot receive new votes. Reopening clears the resolution or duplicate reference; history is retained.
                                </p>
                                <div className="flex gap-4">
                                    <button type="submit" disabled={saving || loading} className="rounded-md bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
                                        {saving ? "Saving..." : "Save review"}
                                    </button>
                                    <button type="button" disabled={saving} onClick={() => setReview(null)} className="text-slate-600">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </Container>
        </main>
    );
}
