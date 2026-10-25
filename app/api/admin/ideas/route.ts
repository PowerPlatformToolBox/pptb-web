import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { validateIdeaReview, type IdeaReview } from "@/lib/ideas";

async function authorize(request: NextRequest) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return { response: NextResponse.json({ error: "Database connection not configured" }, { status: 500 }) };
    const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return { response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
    const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const {
        data: { user },
        error: authError,
    } = await service.auth.getUser(token);
    if (authError || !user) return { response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
    const { data: roles, error } = await service.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").limit(1);
    if (error) {
        console.error("Error checking idea maintainer role:", error);
        return { response: NextResponse.json({ error: "Could not verify admin access" }, { status: 500 }) };
    }
    if (!roles?.length) return { response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
    // Forward the verified user identity so the RPC also enforces the admin role.
    const client = createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return { client };
}

export async function GET(request: NextRequest) {
    try {
        const auth = await authorize(request);
        if (auth.response) return auth.response;
        const { data, error } = await auth.client!.rpc("get_ideas_with_claims", { p_install_id: "" });
        if (error) {
            console.error("Error loading admin ideas:", error);
            return NextResponse.json({ error: "Ideas could not be loaded" }, { status: 500 });
        }
        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error loading admin ideas:", error);
        return NextResponse.json({ error: "Ideas could not be loaded" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const auth = await authorize(request);
        if (auth.response) return auth.response;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const validationError = validateIdeaReview(body);
        if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
        const review = body as IdeaReview;
        const { error } = await auth.client!.rpc("review_idea_with_claim", {
            p_id: review.id,
            p_expected_updated_at: review.expectedUpdatedAt,
            p_status: review.status,
            p_resolution: review.resolution,
            p_public_note: review.publicNote,
            p_duplicate_of: review.duplicateOf,
            p_github_issue_url: review.githubIssueUrl,
            p_repository_url: review.repositoryUrl ?? null,
            p_release_claim: review.releaseClaim ?? false,
        });
        if (error) {
            console.error("Error reviewing idea:", error);
            const status = error.code === "40001" ? 409 : error.code === "42501" ? 403 : error.code === "P0002" ? 404 : ["22023", "23514", "23503", "22P02"].includes(error.code) ? 400 : 500;
            const message =
                status === 409
                    ? "This idea changed. Reload the list before saving again."
                    : status === 400
                      ? "Invalid update. Check the resolution, duplicate target, and GitHub links. Claimed ideas must stay In progress or Closed unless explicitly released into Open."
                      : status === 403
                        ? "Admin access required"
                        : status === 404
                          ? "Idea not found"
                          : "Idea could not be updated";
            return NextResponse.json({ error: message }, { status });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error reviewing idea:", error);
        return NextResponse.json({ error: "Idea could not be updated" }, { status: 500 });
    }
}
