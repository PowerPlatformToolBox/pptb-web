"use client";

import Link from "next/link";

import { hasDisplayName } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";

export function ProfileReminder() {
    const { profile, loading, error } = useProfile();
    if (loading) return null;
    if (error) {
        return <p role="alert" className="mt-4 text-sm text-red-700">Unable to check your profile. <Link href="/profile" className="underline">Open your profile to try again.</Link></p>;
    }
    if (!profile || hasDisplayName(profile.name)) return null;
    return (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-slate-800" role="status">
            <Link href="/profile" className="font-semibold text-blue-700 underline">Complete your profile</Link>
            {" "}by adding a public display name. Until then, your reviews appear as Anonymous reviewer. You can keep using the site.
        </div>
    );
}
