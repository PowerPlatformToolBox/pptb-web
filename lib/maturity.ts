import { sendEmail } from "@/lib/resend";
import type { SupabaseClient } from "@supabase/supabase-js";

export const ACTIVE_VERIFICATION_STATUSES = ["queued", "in_review"] as const;

export async function cancelActiveVerificationRequest(supabase: SupabaseClient, tool: { id: string; name: string }): Promise<boolean> {
    const { data: activeRequest, error: requestError } = await supabase
        .from("tool_verification_requests")
        .select("id, developer_id")
        .eq("tool_id", tool.id)
        .in("status", [...ACTIVE_VERIFICATION_STATUSES])
        .maybeSingle();

    if (requestError) {
        throw new Error(`Failed to check active verification request: ${requestError.message}`);
    }

    if (!activeRequest) {
        return false;
    }

    const { data: cancelledRequest, error: cancelError } = await supabase
        .from("tool_verification_requests")
        .update({
            status: "cancelled",
            cancelled_reason: "tool_updated_during_review",
            updated_at: new Date().toISOString(),
        })
        .eq("id", activeRequest.id)
        .in("status", [...ACTIVE_VERIFICATION_STATUSES])
        .select("id")
        .maybeSingle();

    if (cancelError) {
        throw new Error(`Failed to cancel active verification request: ${cancelError.message}`);
    }

    if (!cancelledRequest) {
        return false;
    }

    const emailResult = await sendEmail({
        type: "verification-request-cancelled",
        supabase,
        data: { developerId: activeRequest.developer_id, toolName: tool.name },
    });

    if (!emailResult.success) {
        console.warn(`[maturity] Verification cancellation email was not sent for request ${activeRequest.id}: ${emailResult.error}`);
    }

    return true;
}
