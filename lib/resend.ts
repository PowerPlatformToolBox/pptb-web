import {
    ToolConversionSuccessEmail,
    ToolReviewChangeRequestEmail,
    ToolSubmissionAdminEmail,
    ToolUpdateAdminEmail,
    ToolUpdateDeveloperEmail,
    VerificationApprovedEmail,
    VerificationRequestAdminEmail,
    VerificationRejectedEmail,
    VerificationRequestCancelledEmail,
    VerificationRequestSubmittedEmail,
} from "@/components/emails/PPTBEmails";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createElement, type ReactElement } from "react";
import { Resend } from "resend";

interface ToolSubmissionAdminPayload {
    toolName: string;
    description: string;
    submissionDate: string;
    submittedBy: string;
}

interface ToolUpdateAdminPayload {
    packageName: string;
    toolName: string;
    version: string;
    validationErrors: string[];
}

interface ToolUpdateDeveloperPayload {
    packageName: string;
    toolName: string;
    version: string;
    validationErrors: string[];
}

interface ToolReviewChangeRequestPayload {
    submitterId: string;
    toolName: string;
    submittedOn: string;
    reviewComments: string;
}

interface ToolConversionSuccessPayload {
    submitterId: string;
    toolName: string;
    packageName: string;
    toolLink: string;
}

interface VerificationDeveloperPayload {
    developerId: string;
    toolName: string;
}

interface VerificationRequestAdminPayload {
    toolName: string;
    description: string;
    submittedOn: string;
    submittedBy: string;
}

interface VerificationRejectedPayload extends VerificationDeveloperPayload {
    failedCriteria: string[];
}

type SendEmailOptions =
    | {
          type: "tool-submission-admin";
          data: ToolSubmissionAdminPayload;
      }
    | {
          type: "tool-update-admin";
          data: ToolUpdateAdminPayload;
          supabase: SupabaseClient;
      }
    | {
          type: "tool-update-developer";
          data: ToolUpdateDeveloperPayload;
          supabase: SupabaseClient;
      }
    | {
          type: "tool-review-change-request";
          data: ToolReviewChangeRequestPayload;
          supabase: SupabaseClient;
      }
    | {
          type: "tool-conversion-success";
          data: ToolConversionSuccessPayload;
          supabase: SupabaseClient;
      }
    | {
          type: "verification-request-submitted" | "verification-request-cancelled" | "verification-approved";
          data: VerificationDeveloperPayload;
          supabase: SupabaseClient;
      }
    | {
          type: "verification-request-admin";
          data: VerificationRequestAdminPayload;
      }
    | {
          type: "verification-rejected";
          data: VerificationRejectedPayload;
          supabase: SupabaseClient;
      };

interface EmailResult {
    success: boolean;
    error?: string;
}

const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
const defaultFromAddress = process.env.RESEND_FROM_EMAIL;
const defaultRecipients = process.env.RESEND_ADMIN_RECIPIENTS;

function parseRecipients(recipients?: string): string[] {
    if (!recipients) {
        return [];
    }

    return recipients
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    switch (options.type) {
        case "tool-submission-admin":
            return sendToolSubmissionEmail(options.data);
        case "tool-update-admin":
            return sendToolUpdateAdminEmail(options.supabase, options.data);
        case "tool-update-developer":
            return sendToolUpdateDeveloperEmail(options.supabase, options.data);
        case "tool-review-change-request":
            return sendToolReviewChangeRequestEmail(options.supabase, options.data);
        case "tool-conversion-success":
            return sendToolConversionSuccessEmail(options.supabase, options.data);
        case "verification-request-submitted":
            return sendVerificationRequestSubmittedEmail(options.supabase, options.data);
        case "verification-request-admin":
            return sendVerificationRequestAdminEmail(options.data);
        case "verification-request-cancelled":
            return sendVerificationRequestCancelledEmail(options.supabase, options.data);
        case "verification-approved":
            return sendVerificationApprovedEmail(options.supabase, options.data);
        case "verification-rejected":
            return sendVerificationRejectedEmail(options.supabase, options.data);
        default:
            return { success: false, error: "Unsupported email type" };
    }
}

async function sendToolSubmissionEmail(data: ToolSubmissionAdminPayload): Promise<EmailResult> {
    return deliverEmail({
        subject: `New Tool Intake: ${data.toolName}`,
        react: createElement(ToolSubmissionAdminEmail, data),
    });
}

async function sendToolUpdateAdminEmail(supabase: SupabaseClient, data: ToolUpdateAdminPayload): Promise<EmailResult> {
    const submittedBy = await getToolOwnerIdentity(supabase, data.packageName);
    return deliverEmail({
        subject: `Tool Update Validation Failed: ${data.toolName}@${data.version}`,
        react: createElement(ToolUpdateAdminEmail, { ...data, submittedBy }),
    });
}

async function sendToolUpdateDeveloperEmail(supabase: SupabaseClient, data: ToolUpdateDeveloperPayload): Promise<EmailResult> {
    const developerEmail = await getToolOwnerEmail(supabase, data.packageName);

    if (!developerEmail) {
        console.warn(`[resend] Unable to determine developer email for package ${data.packageName}`);
        return { success: false, error: "Developer email not found" };
    }

    return deliverEmail({
        subject: `Action needed: ${data.toolName} update failed validation`,
        react: createElement(ToolUpdateDeveloperEmail, { toolName: data.toolName, version: data.version, validationErrors: data.validationErrors }),
        to: [developerEmail],
    });
}

async function sendToolReviewChangeRequestEmail(supabase: SupabaseClient, data: ToolReviewChangeRequestPayload): Promise<EmailResult> {
    const recipientEmail = await getSubmitterEmail(supabase, data.submitterId);

    if (!recipientEmail) {
        console.warn(`[resend] Unable to determine submitter email for user ID ${data.submitterId}`);
        return { success: false, error: "Submitter email not found" };
    }

    return deliverEmail({
        subject: `Changes requested: ${data.toolName}`,
        react: createElement(ToolReviewChangeRequestEmail, { toolName: data.toolName, submittedOn: data.submittedOn, reviewComments: data.reviewComments }),
        to: [recipientEmail],
    });
}

async function sendToolConversionSuccessEmail(supabase: SupabaseClient, data: ToolConversionSuccessPayload): Promise<EmailResult> {
    const recipientEmail = await getSubmitterEmail(supabase, data.submitterId);

    if (!recipientEmail) {
        console.warn(`[resend] Unable to determine submitter email for user ID ${data.submitterId}`);
        return { success: false, error: "Submitter email not found" };
    }

    return deliverEmail({
        subject: `Your tool "${data.toolName}" is now live on PPTB Marketplace!`,
        react: createElement(ToolConversionSuccessEmail, { toolName: data.toolName, packageName: data.packageName, toolLink: data.toolLink }),
        to: [recipientEmail],
    });
}

async function sendVerificationRequestSubmittedEmail(supabase: SupabaseClient, data: VerificationDeveloperPayload): Promise<EmailResult> {
    return deliverDeveloperEmail(supabase, data.developerId, {
        subject: `Verification requested: ${data.toolName}`,
        react: createElement(VerificationRequestSubmittedEmail, { toolName: data.toolName }),
    });
}

async function sendVerificationRequestAdminEmail(data: VerificationRequestAdminPayload): Promise<EmailResult> {
    return deliverEmail({
        subject: `Verification requested: ${data.toolName}`,
        react: createElement(VerificationRequestAdminEmail, data),
    });
}

async function sendVerificationRequestCancelledEmail(supabase: SupabaseClient, data: VerificationDeveloperPayload): Promise<EmailResult> {
    return deliverDeveloperEmail(supabase, data.developerId, {
        subject: `Verification cancelled: ${data.toolName} was updated`,
        react: createElement(VerificationRequestCancelledEmail, { toolName: data.toolName }),
    });
}

async function sendVerificationApprovedEmail(supabase: SupabaseClient, data: VerificationDeveloperPayload): Promise<EmailResult> {
    return deliverDeveloperEmail(supabase, data.developerId, {
        subject: `Verification approved: ${data.toolName}`,
        react: createElement(VerificationApprovedEmail, { toolName: data.toolName }),
    });
}

async function sendVerificationRejectedEmail(supabase: SupabaseClient, data: VerificationRejectedPayload): Promise<EmailResult> {
    return deliverDeveloperEmail(supabase, data.developerId, {
        subject: `Verification not approved: ${data.toolName}`,
        react: createElement(VerificationRejectedEmail, { toolName: data.toolName, failedCriteria: data.failedCriteria }),
    });
}

async function deliverDeveloperEmail(supabase: SupabaseClient, developerId: string, message: { subject: string; react: ReactElement }): Promise<EmailResult> {
    const recipientEmail = await getSubmitterEmail(supabase, developerId);
    if (!recipientEmail) {
        return { success: false, error: "Developer email not found" };
    }

    return deliverEmail({ ...message, to: [recipientEmail] });
}

async function deliverEmail({ subject, react, to }: { subject: string; react: ReactElement; to?: string[] }): Promise<EmailResult> {
    if (!resendClient) {
        return { success: false, error: "Resend API key not configured" };
    }

    if (!defaultFromAddress) {
        return { success: false, error: "RESEND_FROM_EMAIL is not configured" };
    }

    const recipients = to && to.length > 0 ? to : parseRecipients(defaultRecipients);

    if (recipients.length === 0) {
        return { success: false, error: "RESEND_ADMIN_RECIPIENTS is not configured" };
    }

    try {
        const payload = {
            from: defaultFromAddress,
            to: recipients,
            subject,
            react,
        } as Record<string, unknown>;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await resendClient.emails.send(payload as any);

        if (error) {
            throw new Error(error.message);
        }

        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send email";
        console.error("[resend] email send failed", message);
        return { success: false, error: message };
    }
}

async function getToolOwnerEmail(supabase: SupabaseClient, packageName: string): Promise<string | null> {
    try {
        const { data, error } = await supabase.from("tools").select("user_id").eq("packagename", packageName).maybeSingle();
        if (error) {
            console.warn("[supabase] Failed to fetch tool owner", error.message);
            return null;
        }

        const ownerId = data?.user_id;
        if (typeof ownerId !== "string" || ownerId.length === 0) {
            return null;
        }

        const { data: profile, error: profileError } = await supabase.from("user_profiles").select("email").eq("id", ownerId).maybeSingle();
        if (profileError) {
            console.warn("[supabase] Failed to fetch user profile email", profileError.message);
            return null;
        }

        const email = profile?.email;
        return typeof email === "string" && email.includes("@") ? email : null;
    } catch (error) {
        console.error("[supabase] Unexpected error fetching tool owner", error);
        return null;
    }
}

async function getToolOwnerIdentity(supabase: SupabaseClient, packageName: string): Promise<string> {
    const { data, error } = await supabase.from("tools").select("user_id").eq("packagename", packageName).maybeSingle();
    if (error || !data?.user_id) return "Unknown developer";

    const { data: profile } = await supabase.from("user_profiles").select("name, email").eq("id", data.user_id).maybeSingle();
    if (profile?.name && profile.email) return `${profile.name} (${profile.email})`;
    return profile?.name || profile?.email || "Unknown developer";
}

async function getSubmitterEmail(supabase: SupabaseClient, submitterId: string): Promise<string | null> {
    try {
        if (!submitterId || typeof submitterId !== "string" || submitterId.length === 0) {
            console.warn("[resend] Invalid submitter ID provided");
            return null;
        }

        const { data: profile, error: profileError } = await supabase.from("user_profiles").select("email").eq("id", submitterId).maybeSingle();
        if (profileError) {
            console.warn("[supabase] Failed to fetch submitter email", profileError.message);
        }

        const email = profile?.email;
        if (typeof email === "string" && email.includes("@")) {
            return email;
        }

        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(submitterId);
        if (authError) {
            console.warn("[supabase] Failed to fetch submitter auth email", authError.message);
            return null;
        }

        const authEmail = authUser.user?.email;
        return typeof authEmail === "string" && authEmail.includes("@") ? authEmail : null;
    } catch (error) {
        console.error("[supabase] Unexpected error fetching submitter email", error);
        return null;
    }
}
