import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create Supabase client with service role for server-side operations
function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return null;
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
        }

        // Get authorization token from headers
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.substring(7);

        // Verify the JWT token
        const {
            data: { user },
        } = await supabase.auth.getUser(token);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { toolId, rating, comment } = body;

        if (!toolId || !rating) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const { error: submitError } = await supabase.from("ratings").insert({
            tool_id: toolId,
            user_id: user.id,
            rating,
            comment: comment?.trim() || null,
            created_at: new Date().toISOString(),
        });

        if (submitError) {
            throw submitError;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error submitting rating:", error);
        return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
    }
}
