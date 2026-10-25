"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { canClaimIdea, validateIdeaClaim, type Idea } from "@/lib/ideas";

export function IdeaClaimForm({ idea, userId, supabase, onChanged }: { idea: Idea; userId: string | null; supabase: SupabaseClient | null; onChanged: () => Promise<void> }) {
    const [open, setOpen] = useState(false);
    const [repositoryUrl, setRepositoryUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [claimed, setClaimed] = useState(false);
    const [notificationWarning, setNotificationWarning] = useState("");

    async function claim(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (saving || !supabase) return;
        const body = { id: idea.id, repositoryUrl: repositoryUrl.trim() };
        const validation = validateIdeaClaim(body);
        if (validation) {
            setError(validation);
            return;
        }
        setSaving(true);
        setError("");
        let committed = false;
        try {
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();
            if (sessionError || !session) throw new Error("Please sign in again before picking up this idea.");
            const response = await fetch("/api/ideas/claim", {
                method: "POST",
                headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const result = await response.json();
            if (!response.ok) {
                if (response.status === 409) await onChanged();
                throw new Error(result.error || "The idea could not be claimed. Please try again.");
            }
            if (typeof result.claimId !== "string") throw new Error("Missing claim confirmation. Please retry.");
            committed = true;
            setClaimed(true);
            setNotificationWarning(typeof result.notificationWarning === "string" ? result.notificationWarning : "");
            setOpen(false);
            await onChanged();
        } catch (error) {
            console.error("Error starting work on idea:", error);
            setError(
                committed
                    ? "Your claim was saved, but the board could not be refreshed. Please reload the page."
                    : error instanceof Error
                      ? error.message
                      : "The request failed. Please retry; a saved claim will not be duplicated.",
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mt-4 space-y-3 text-sm">
            {claimed && (
                <p role="status" className="text-green-700">
                    You&apos;re now working on this idea.
                </p>
            )}
            {notificationWarning && <p role="alert" className="text-amber-700">{notificationWarning}</p>}
            {error && (
                <p role="alert" className="text-red-700">
                    {error}
                </p>
            )}
            {canClaimIdea(idea) &&
                !claimed &&
                (!userId ? (
                    <Link href={`/auth/signin?next=${encodeURIComponent(`/ideas#idea-${idea.id}`)}`} className="font-semibold text-blue-700 hover:underline">
                        Sign in to start working on this
                    </Link>
                ) : !open ? (
                    <button type="button" onClick={() => setOpen(true)} className="font-semibold text-blue-700 hover:underline">
                        Start working on this
                    </button>
                ) : (
                    <form onSubmit={(event) => void claim(event)} className="space-y-3 rounded-lg border border-slate-200 p-4">
                        <h4 className="font-semibold">Start working on: {idea.title}</h4>
                        <label htmlFor={`repository-${idea.id}`} className="block font-medium">
                            GitHub repository URL
                        </label>
                        <input
                            id={`repository-${idea.id}`}
                            type="url"
                            required
                            maxLength={500}
                            value={repositoryUrl}
                            onChange={(event) => setRepositoryUrl(event.target.value)}
                            disabled={saving}
                            placeholder="https://github.com/owner/repository"
                            className="block w-full rounded-md border-slate-300"
                        />
                        <p className="text-slate-600">
                            Create a repository on GitHub first if you don&apos;t have one. Use its canonical URL without a trailing slash or .git suffix. Repository existence and ownership are not
                            verified.
                        </p>
                        <p className="text-slate-600">
                            This idea will be marked In progress and reserved to you. Your display name and repository will be public. We will announce this on Discord and notify the creator if their
                            account is linked. No existing developer profile is required.
                        </p>
                        <p className="text-slate-600">
                            Contact a maintainer if you later need to release the idea, change the repository, or mark it completed. This does not publish a marketplace tool.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button type="submit" disabled={saving || !supabase} className="rounded-md bg-blue-700 px-3 py-2 font-semibold text-white disabled:opacity-50">
                                {saving ? "Saving..." : "Confirm and start working"}
                            </button>
                            <button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-md border border-slate-300 px-3 py-2">
                                Cancel
                            </button>
                        </div>
                    </form>
                ))}
        </div>
    );
}
