import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { indexPublishedTools } from "@/lib/similarity-index";
import { SimilarityServiceError } from "@/lib/tool-similarity";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });
    const token = request.headers.get("authorization");
    if (!token?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const supabase = createClient(url, key);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token.slice(7));
        if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { data: role, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (roleError) {
            console.error("[similarity-index] Failed to verify administrator");
            return NextResponse.json({ error: "Failed to verify administrator" }, { status: 500 });
        }
        if (!role) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

        const result = await indexPublishedTools(supabase);
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        const code = error instanceof SimilarityServiceError ? error.code : "unavailable";
        console.error("[similarity-index] Indexing failed", { code });
        return NextResponse.json({ error: "Similarity indexing failed. Retry this batch after resolving the error.", code }, { status: 502 });
    }
}
