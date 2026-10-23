"use client";

import { useState } from "react";
import type { AuthorReply } from "@/lib/reviews";
import { useSupabase } from "@/lib/useSupabase";
import { ReviewText } from "@/components/ReviewText";

export function ReviewAuthorReply({ toolId, ratingId, authorReply, canReply }: {
    toolId: string;
    ratingId: string;
    authorReply: AuthorReply | null;
    canReply: boolean;
}) {
    const { supabase } = useSupabase();
    const [saved, setSaved] = useState(authorReply);
    const [editing, setEditing] = useState(false);
    const [reply, setReply] = useState(authorReply?.reply || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (!supabase) {
            setError("Sign in to reply.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session) throw new Error("Sign in to reply.");
            const response = await fetch(`/api/ratings/${toolId}/reply`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ ratingId, reply }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to save reply");
            setSaved(result.authorReply);
            setReply(result.authorReply.reply);
            setEditing(false);
        } catch (error) {
            console.error("Error saving author reply:", error);
            setError(error instanceof Error ? error.message : "Failed to save reply");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            {saved && (
                <div className="mt-4 border-l-4 border-blue-200 bg-blue-50 p-4">
                    <h4 className="font-semibold text-slate-900">Tool author response</h4>
                    <p className="text-xs text-slate-500">{new Date(saved.updatedAt).toLocaleDateString()}</p>
                    <p className="mt-2 whitespace-pre-wrap text-slate-700"><ReviewText text={saved.reply} /></p>
                </div>
            )}
            {canReply && !editing && (
                <button type="button" className="mt-4 text-sm text-blue-600 underline" onClick={() => setEditing(true)}>
                    {saved ? "Edit author response" : "Reply as tool author"}
                </button>
            )}
            {canReply && editing && (
                <form onSubmit={submit} className="mt-4 space-y-3">
                    <label htmlFor={`reply-${ratingId}`} className="block text-sm font-medium text-slate-700">Tool author response</label>
                    <textarea id={`reply-${ratingId}`} required maxLength={2000} rows={4} value={reply}
                        onChange={(event) => setReply(event.target.value)} disabled={saving}
                        className="w-full rounded-lg border border-slate-300 p-3 text-slate-900" />
                    <p className="text-xs text-slate-500">{reply.length}/2000 characters</p>
                    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                    <div className="flex gap-4">
                        <button type="submit" disabled={saving || !reply.trim()} className="btn-primary disabled:opacity-50">{saving ? "Saving..." : "Save response"}</button>
                        <button type="button" disabled={saving} onClick={() => { setEditing(false); setReply(saved?.reply || ""); setError(null); }} className="btn-secondary">Cancel</button>
                    </div>
                </form>
            )}
        </>
    );
}
