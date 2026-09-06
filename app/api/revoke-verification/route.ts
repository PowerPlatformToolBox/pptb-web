import { sendEmail } from "@/lib/resend";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
}

interface RevokeVerificationRequest {
    event?: string;
    developerId?: string;
    toolId?: string;
    toolName?: string;
    details?: {
        deadlineAt?: string;
        threshold?: string;
        openBugCount?: number;
        longestResponseDays?: number;
    };
}

const MATURITY_EVENTS: Record<string, { variant: "revoked" | "grace"; reason: string }> = {
    revoked_cve: {
        variant: "revoked",
        reason: "A high or critical severity CVE was found in your tool's dependencies.",
    },
    revoked_csp_exception: {
        variant: "revoked",
        reason: "A new CSP exception was added to your tool, which is not permitted for verified tools.",
    },
    bug_health_grace_started: {
        variant: "grace",
        reason: "Your tool's bug health has breached the verification thresholds.",
    },
    revoked_grace_expired_bug_health: {
        variant: "revoked",
        reason: "The grace period to restore your tool's bug health expired before the thresholds were met again.",
    },
    api_breaking_change_grace_started: {
        variant: "grace",
        reason: "A breaking API change was detected in your tool.",
    },
    revoked_grace_expired_api_breaking: {
        variant: "revoked",
        reason: "The grace period to resolve the breaking API change in your tool expired.",
    },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDeadline(deadlineAt?: string): string | undefined {
    if (!deadlineAt) {
        return undefined;
    }

    const parsed = new Date(deadlineAt);
    return Number.isNaN(parsed.getTime()) ? deadlineAt : parsed.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });
        }

        const body = (await request.json()) as RevokeVerificationRequest;
        const { event, developerId, toolId, toolName, details } = body;

        const maturityEvent = event ? MATURITY_EVENTS[event] : undefined;
        if (!maturityEvent) {
            return NextResponse.json({ error: `Unsupported event. Expected one of: ${Object.keys(MATURITY_EVENTS).join(", ")}` }, { status: 400 });
        }
        if (!developerId || !UUID_PATTERN.test(developerId)) {
            return NextResponse.json({ error: "A valid developerId is required" }, { status: 400 });
        }
        if (!toolId || !UUID_PATTERN.test(toolId)) {
            return NextResponse.json({ error: "A valid toolId is required" }, { status: 400 });
        }

        // The tool/developer pair is verified against the database so the endpoint cannot be used to email arbitrary users.
        const { data: tool, error: toolError } = await supabase.from("tools").select("id, name, user_id").eq("id", toolId).maybeSingle();

        if (toolError) {
            throw toolError;
        }
        if (!tool) {
            return NextResponse.json({ error: "Tool not found" }, { status: 404 });
        }
        if (tool.user_id !== developerId) {
            return NextResponse.json({ error: "Developer does not own this tool" }, { status: 403 });
        }

        const emailResult = await sendEmail({
            type: "verification-revoked",
            supabase,
            data: {
                developerId,
                toolName: tool.name || toolName || "your tool",
                variant: maturityEvent.variant,
                reason: maturityEvent.reason,
                deadlineAt: formatDeadline(details?.deadlineAt),
                threshold: details?.threshold,
                openBugCount: typeof details?.openBugCount === "number" ? details.openBugCount : undefined,
                longestResponseDays: typeof details?.longestResponseDays === "number" ? details.longestResponseDays : undefined,
            },
        });

        if (!emailResult.success) {
            console.warn(`[maturity] Verification ${maturityEvent.variant} email was not sent for tool ${toolId}: ${emailResult.error}`);
        }

        return NextResponse.json({ success: true, notificationSent: emailResult.success });
    } catch (error) {
        console.error("[maturity] Failed to process verification maturity notification", error);
        return NextResponse.json({ error: "Failed to process verification maturity notification" }, { status: 500 });
    }
}
