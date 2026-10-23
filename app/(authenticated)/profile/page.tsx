"use client";

import { useState } from "react";

import { Container } from "@/components/Container";
import { type EditableProfile, PROFILE_UPDATED_EVENT, validateProfile } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";
import { useSupabase } from "@/lib/useSupabase";

function ProfileForm({ profile }: { profile: EditableProfile }) {
    const { supabase } = useSupabase();
    const [fields, setFields] = useState(profile);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function save(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        setSuccess(false);
        const result = validateProfile(fields);
        if ("error" in result) {
            setError(result.error);
            return;
        }
        setSaving(true);
        try {
            if (!supabase) throw new Error("Authentication is not configured.");
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            if (!session) throw new Error("Your session has expired. Please sign in again.");
            const response = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify(result.profile),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Unable to save your profile.");
            setFields(data.profile);
            setSuccess(true);
            window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
        } catch (error) {
            console.error("Error saving profile:", error);
            setError(error instanceof Error ? error.message : "Unable to save your profile.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={save} className="card mt-8 space-y-6 p-6">
            {error && <p role="alert" className="text-red-700">{error}</p>}
            {success && <p role="status" className="text-green-700">Your profile has been updated.</p>}
            <fieldset disabled={saving} className="space-y-6">
                <div>
                    <label htmlFor="profile-name" className="block text-sm font-semibold text-slate-900">Public display name</label>
                    <p id="profile-name-help" className="mt-1 text-sm text-slate-600">Shown publicly on your reviews, including existing reviews. A nickname is fine; do not enter an email address.</p>
                    <input id="profile-name" aria-describedby="profile-name-help" autoComplete="nickname" required maxLength={100} value={fields.name} onChange={(event) => { setFields({ ...fields, name: event.target.value }); setSuccess(false); }} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
                <div>
                    <label htmlFor="profile-linkedin" className="block text-sm font-semibold text-slate-900">LinkedIn profile URL (optional)</label>
                    <input id="profile-linkedin" type="url" maxLength={500} placeholder="https://www.linkedin.com/in/your-name" value={fields.linkedin_profile_url} onChange={(event) => { setFields({ ...fields, linkedin_profile_url: event.target.value }); setSuccess(false); }} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
                <div>
                    <label htmlFor="profile-discord" className="block text-sm font-semibold text-slate-900">Discord handle (optional)</label>
                    <input id="profile-discord" maxLength={100} value={fields.discord_handle} onChange={(event) => { setFields({ ...fields, discord_handle: event.target.value }); setSuccess(false); }} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </div>
                <button type="submit" className="btn-primary disabled:opacity-50">{saving ? "Saving..." : "Save profile"}</button>
            </fieldset>
        </form>
    );
}

export default function ProfilePage() {
    const { profile, loading, error } = useProfile();
    return (
        <main>
            <Container className="my-12 sm:my-20">
                <div className="mx-auto max-w-2xl">
                    <h1 className="text-3xl font-bold text-slate-900">Your profile</h1>
                    <p className="mt-3 text-slate-600">Update your display name and optional contact details whenever you need. Your email address is not displayed on reviews.</p>
                    {loading ? <p className="mt-8" role="status">Loading your profile...</p>
                        : error ? <p className="mt-8 text-red-700" role="alert">{error} <button type="button" onClick={() => window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT))} className="underline">Try again</button></p>
                            : profile ? <ProfileForm profile={profile} />
                                : <p className="mt-8" role="alert">Please sign in to edit your profile.</p>}
                </div>
            </Container>
        </main>
    );
}
