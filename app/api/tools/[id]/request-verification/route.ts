import { ACTIVE_VERIFICATION_STATUSES } from "@/lib/maturity";
import { sendEmail } from "@/lib/resend";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });
        }

        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
        }

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser(authHeader.slice(7));
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized. Valid user token required." }, { status: 401 });
        }

        const { id: toolId } = await params;
        const [{ data: tool, error: toolError }, { data: profile, error: profileError }] = await Promise.all([
            supabase.from("tools").select("id, name, description, user_id, status").eq("id", toolId).maybeSingle(),
            supabase.from("user_profiles").select("name, email, is_tool_developer").eq("id", user.id).maybeSingle(),
        ]);

        if (toolError || !tool) {
            return NextResponse.json({ error: "Tool not found" }, { status: 404 });
        }
        if (profileError) {
            throw profileError;
        }
        if (tool.user_id !== user.id) {
            return NextResponse.json({ error: "You do not own this tool" }, { status: 403 });
        }
        if (!profile?.is_tool_developer) {
            return NextResponse.json({ error: "A tool developer profile is required" }, { status: 403 });
        }
        if (tool.status !== "active") {
            return NextResponse.json({ error: "Only active tools can be submitted for verification" }, { status: 400 });
        }

        const [{ data: maturity, error: maturityError }, { data: activeRequest, error: activeRequestError }] = await Promise.all([
            supabase.from("tool_maturity").select("status").eq("tool_id", toolId).maybeSingle(),
            supabase
                .from("tool_verification_requests")
                .select("id, status")
                .eq("tool_id", toolId)
                .in("status", [...ACTIVE_VERIFICATION_STATUSES])
                .maybeSingle(),
        ]);

        if (maturityError || activeRequestError) {
            throw maturityError || activeRequestError;
        }
        if (maturity?.status === "verified") {
            return NextResponse.json({ error: "This tool is already verified" }, { status: 409 });
        }
        if (activeRequest) {
            return NextResponse.json({ error: "This tool already has an active verification request", request: activeRequest }, { status: 409 });
        }

        const { data: verificationRequest, error: insertError } = await supabase
            .from("tool_verification_requests")
            .insert({ tool_id: toolId, developer_id: user.id, status: "queued" })
            .select("id, status, submitted_at")
            .single();

        if (insertError) {
            if (insertError.code === "23505") {
                return NextResponse.json({ error: "This tool already has an active verification request" }, { status: 409 });
            }
            throw insertError;
        }

        const emailResult = await sendEmail({
            type: "verification-request-submitted",
            supabase,
            data: { developerId: user.id, toolName: tool.name },
        });

        const adminEmailResult = await sendEmail({
            type: "verification-request-admin",
            data: {
                toolName: tool.name,
                description: tool.description || "No description provided.",
                submittedOn: verificationRequest.submitted_at,
                submittedBy: profile?.name && profile.email ? `${profile.name} (${profile.email})` : profile?.name || profile?.email || user.email || user.id,
            },
        });

        if (!emailResult.success) {
            console.warn(`[maturity] Verification confirmation email was not sent for request ${verificationRequest.id}: ${emailResult.error}`);
        }
        if (!adminEmailResult.success) {
            console.warn(`[maturity] Verification admin email was not sent for request ${verificationRequest.id}: ${adminEmailResult.error}`);
        }

        return NextResponse.json({ success: true, request: verificationRequest, notificationSent: emailResult.success && adminEmailResult.success }, { status: 201 });
    } catch (error) {
        console.error("[maturity] Failed to submit verification request", error);
        return NextResponse.json({ error: "Failed to submit verification request" }, { status: 500 });
    }
}
