import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";

async function authorize(request: NextRequest, toolId: string) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        return { response: NextResponse.json({ error: "Supabase is not configured" }, { status: 500 }) };
    }
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
        return { response: NextResponse.json({ error: "Sign in to reply" }, { status: 401 }) };
    }
    const supabase = createClient(url, key);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authorization.slice(7));
    if (authError || !user) {
        return { response: NextResponse.json({ error: "Sign in to reply" }, { status: 401 }) };
    }
    const { data: tool, error } = await supabase.from("tools").select("user_id, name").eq("id", toolId).maybeSingle();
    if (error) throw error;
    if (!tool) return { response: NextResponse.json({ error: "Tool not found" }, { status: 404 }) };
    return { supabase, url, key, authorization, canReply: tool.user_id === user.id, toolName: tool.name };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ toolId: string }> }) {
    try {
        const { toolId } = await params;
        const auth = await authorize(request, toolId);
        if (auth.response) return auth.response;
        return NextResponse.json({ canReply: auth.canReply }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Error checking review reply permission:", error);
        return NextResponse.json({ error: "Failed to check reply permission" }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ toolId: string }> }) {
    try {
        const { toolId } = await params;
        const auth = await authorize(request, toolId);
        if (auth.response) return auth.response;
        if (!auth.canReply) return NextResponse.json({ error: "Only the tool owner can reply" }, { status: 403 });
        let body: { ratingId?: unknown; reply?: unknown } | null;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const { ratingId, reply } = body ?? {};
        if (typeof ratingId !== "string" || !ratingId.trim() || typeof reply !== "string" || !reply.trim() || reply.trim().length > 2000) {
            return NextResponse.json({ error: "A review ID and reply of 1 to 2000 characters are required" }, { status: 400 });
        }
        const { data: rating, error: ratingError } = await auth.supabase.from("ratings").select("id, user_id, rating_author_replies(id)").eq("id", ratingId).eq("tool_id", toolId).maybeSingle();
        if (ratingError) throw ratingError;
        if (!rating) return NextResponse.json({ error: "Review not found" }, { status: 404 });
        const existingReply = Array.isArray(rating.rating_author_replies) ? rating.rating_author_replies[0] : rating.rating_author_replies;
        // The RPC also checks ownership atomically, including for direct desktop calls.
        const client = createClient(auth.url, auth.key, {
            global: { headers: { Authorization: auth.authorization } },
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await client.rpc("save_rating_author_reply", { p_rating_id: ratingId, p_reply: reply.trim() });
        if (error) {
            if (error.code === "42501") return NextResponse.json({ error: "Only the tool owner can reply" }, { status: 403 });
            if (error.code === "P0002") return NextResponse.json({ error: "Review not found" }, { status: 404 });
            throw error;
        }
        if (!existingReply && typeof rating.user_id === "string" && rating.user_id) {
            const emailResult = await sendEmail({
                type: "tool-review-response",
                supabase: auth.supabase,
                data: { reviewerId: rating.user_id, toolId, toolName: auth.toolName, reply: reply.trim() },
            });
            if (!emailResult.success) {
                console.warn(`[ratings] Author response notification was not sent for review ${ratingId}: ${emailResult.error}`);
            }
        } else if (!existingReply) {
            console.warn(`[ratings] Author response notification was not sent because review ${ratingId} has no reviewer`);
        }
        return NextResponse.json({ authorReply: { reply: data.reply, createdAt: data.created_at, updatedAt: data.updated_at } });
    } catch (error) {
        console.error("Error saving review reply:", error);
        return NextResponse.json({ error: "Failed to save reply" }, { status: 500 });
    }
}
