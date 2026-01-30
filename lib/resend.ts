import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type TemplateVariables = Record<string, unknown>;

interface ToolSubmissionAdminPayload {
    toolName: string;
    description: string;
    submissionDate: string;
}

interface ToolUpdateAdminPayload {
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
    packageName: string;
    toolName: string;
    submittedOn: string;
    reviewComments: string;
}

type SendEmailOptions =
    | {
          type: "tool-submission-admin";
          data: ToolSubmissionAdminPayload;
      }
    | {
          type: "tool-update-admin";
          data: ToolUpdateAdminPayload;
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
      };

interface EmailResult {
    success: boolean;
    error?: string;
}

const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
const defaultFromAddress = process.env.RESEND_FROM_EMAIL;
const defaultRecipients = process.env.RESEND_ADMIN_RECIPIENTS;
const submissionTemplateId = process.env.RESEND_TOOL_SUBMISSION_TEMPLATE_ID;
const updateTemplateId = process.env.RESEND_TOOL_UPDATE_TEMPLATE_ID;
const developerTemplateId = process.env.RESEND_TOOL_UPDATE_DEV_TEMPLATE_ID;
const reviewChangesTemplateId = process.env.RESEND_TOOL_REVIEW_CHANGES_TEMPLATE_ID;

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
            return sendToolUpdateAdminEmail(options.data);
        case "tool-update-developer":
            return sendToolUpdateDeveloperEmail(options.supabase, options.data);
        case "tool-review-change-request":
            return sendToolReviewChangeRequestEmail(options.supabase, options.data);
        default:
            return { success: false, error: "Unsupported email type" };
    }
}

async function sendToolSubmissionEmail(data: ToolSubmissionAdminPayload): Promise<EmailResult> {
    if (!submissionTemplateId) {
        console.warn("[resend] RESEND_TOOL_SUBMISSION_TEMPLATE_ID is not configured; skipping email notification.");
        return { success: false, error: "Submission template missing" };
    }

    return deliverEmail({
        subject: `New Tool Intake: ${data.toolName}`,
        templateId: submissionTemplateId,
        variables: {
            toolName: data.toolName,
            description: data.description,
            submissionDate: data.submissionDate,
        },
    });
}

async function sendToolUpdateAdminEmail(data: ToolUpdateAdminPayload): Promise<EmailResult> {
    if (!updateTemplateId) {
        console.warn("[resend] RESEND_TOOL_UPDATE_TEMPLATE_ID is not configured; skipping tool update email.");
        return { success: false, error: "Update template missing" };
    }

    return deliverEmail({
        subject: `Tool Update Validation Failed: ${data.toolName}@${data.version}`,
        templateId: updateTemplateId,
        variables: {
            toolName: data.toolName,
            version: data.version,
            validationErrors: data.validationErrors,
        },
    });
}

async function sendToolUpdateDeveloperEmail(supabase: SupabaseClient, data: ToolUpdateDeveloperPayload): Promise<EmailResult> {
    if (!developerTemplateId) {
        console.warn("[resend] RESEND_TOOL_UPDATE_DEV_TEMPLATE_ID is not configured; skipping developer notification.");
        return { success: false, error: "Developer template missing" };
    }

    const developerEmail = await getToolOwnerEmail(supabase, data.packageName);

    if (!developerEmail) {
        console.warn(`[resend] Unable to determine developer email for package ${data.packageName}`);
        return { success: false, error: "Developer email not found" };
    }

    return deliverEmail({
        subject: `Action needed: ${data.toolName} update failed validation`,
        templateId: developerTemplateId,
        variables: {
            toolName: data.toolName,
            version: data.version,
            validationErrors: data.validationErrors,
        },
        to: [developerEmail],
    });
}

async function sendToolReviewChangeRequestEmail(supabase: SupabaseClient, data: ToolReviewChangeRequestPayload): Promise<EmailResult> {
    if (!reviewChangesTemplateId) {
        console.warn("[resend] RESEND_TOOL_REVIEW_CHANGES_TEMPLATE_ID is not configured; skipping review change notification.");
        return { success: false, error: "Review change template missing" };
    }

    const recipientEmail = await getToolOwnerEmail(supabase, data.packageName);

    if (!recipientEmail) {
        console.warn(`[resend] Unable to determine developer email for package ${data.packageName}`);
        return { success: false, error: "Developer email not found" };
    }

    return deliverEmail({
        subject: `Changes requested: ${data.toolName}`,
        templateId: reviewChangesTemplateId,
        variables: {
            toolName: data.toolName,
            submittedOn: data.submittedOn,
            reviewComments: data.reviewComments,
        },
        to: [recipientEmail],
    });
}

async function deliverEmail({ subject, templateId, variables = {}, to }: { subject: string; templateId: string; variables?: TemplateVariables; to?: string[] }): Promise<EmailResult> {
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

    if (!templateId) {
        return { success: false, error: "Template id is required" };
    }

    try {
        const payload = {
            from: defaultFromAddress,
            to: recipients,
            subject,
            template: {
                id: templateId,
                variables,
            },
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
