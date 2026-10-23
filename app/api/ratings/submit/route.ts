import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { MOCK_AUTH_TOKEN } from "@/lib/mock-auth";
import { sendEmail } from "@/lib/resend";

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
        // Get authorization token from headers
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
        let body: { toolId?: unknown; rating?: unknown; comment?: unknown; toolVersion?: unknown } | null;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const { toolId, rating, comment, toolVersion } = body ?? {};
        if (typeof toolId !== "string" || !toolId.trim() || typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
            return NextResponse.json({ error: "A tool ID and an integer rating from 1 to 5 are required" }, { status: 400 });
        }
        if (toolVersion != null && (typeof toolVersion !== "string" || !toolVersion.trim() || toolVersion.trim().length > 100)) {
            return NextResponse.json({ error: "Tool version must contain 1 to 100 characters when supplied" }, { status: 400 });
        }
        if (comment != null && (typeof comment !== "string" || comment.trim().length > 500)) {
            return NextResponse.json({ error: "Review must be text of up to 500 characters" }, { status: 400 });
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
            if (token === MOCK_AUTH_TOKEN) {
                return NextResponse.json({ success: true, mock: true });
            }
            return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
        }

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const verifiedToken = authHeader.substring(7);

        // Verify the JWT token
        const {
            data: { user },
        } = await supabase.auth.getUser(verifiedToken);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: tool, error: toolError } = await supabase.from("tools").select("id, name, user_id").eq("id", toolId).maybeSingle();
        if (toolError) throw toolError;
        if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });

        const { error: submitError } = await supabase.from("ratings").insert({
            tool_id: toolId,
            user_id: user.id,
            rating,
            tool_version: toolVersion?.trim() ?? null,
            comment: comment?.trim() || null,
            created_at: new Date().toISOString(),
        });

        if (submitError) {
            throw submitError;
        }

        if (typeof tool.user_id === "string" && tool.user_id) {
            const emailResult = await sendEmail({
                type: "tool-review-submitted",
                supabase,
                data: {
                    developerId: tool.user_id,
                    toolId: tool.id,
                    toolName: tool.name,
                    rating,
                    comment: comment?.trim() || null,
                },
            });
            if (!emailResult.success) {
                console.warn(`[ratings] Review notification was not sent for tool ${toolId}: ${emailResult.error}`);
            }
        } else {
            console.warn(`[ratings] Review notification was not sent because tool ${toolId} has no owner`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error submitting rating:", error);
        return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
    }
}
