import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { validateProfile } from "@/lib/profile";

const profileColumns = "name, linkedin_profile_url, discord_handle";
const headers = { "Cache-Control": "private, no-store" };

async function authenticate(request: NextRequest) {
    const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (!token) {
        return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401, headers }) };
    }
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        return { response: NextResponse.json({ error: "Supabase is not configured" }, { status: 500, headers }) };
    }
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401, headers }) };
    }
    return { supabase, user };
}

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticate(request);
        if (auth.response) return auth.response;
        const { data, error } = await auth.supabase.from("user_profiles").select(profileColumns).eq("id", auth.user.id).maybeSingle();
        if (error) throw error;
        return NextResponse.json({
            profile: {
                name: data?.name ?? "",
                linkedin_profile_url: data?.linkedin_profile_url ?? "",
                discord_handle: data?.discord_handle ?? "",
            },
        }, { headers });
    } catch (error) {
        console.error("Error loading profile:", error);
        return NextResponse.json({ error: "Unable to load your profile." }, { status: 500, headers });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const auth = await authenticate(request);
        if (auth.response) return auth.response;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers });
        }
        const result = validateProfile(body);
        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: 400, headers });
        }
        const profile = result.profile;
        const { error } = await auth.supabase.from("user_profiles").upsert({
            id: auth.user.id,
            name: profile.name,
            linkedin_profile_url: profile.linkedin_profile_url || null,
            discord_handle: profile.discord_handle || null,
            updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
        if (error) throw error;
        return NextResponse.json({ profile }, { headers });
    } catch (error) {
        console.error("Error saving profile:", error);
        return NextResponse.json({ error: "Unable to save your profile. Please try again." }, { status: 500, headers });
    }
}
