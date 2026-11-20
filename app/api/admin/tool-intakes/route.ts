/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDiscordActor, notifyDiscordAfterResponse, toDiscordTool, truncate } from "@/lib/discord-notify";
import { fetchIntakeManifest, validateIntakeVersion } from "@/lib/intake-package";
import { sendEmail } from "@/lib/resend";
import { isValidSemver } from "@/lib/version-extraction";
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

interface ReviewRequest {
    intakeId: string;
    action: "approve" | "reject" | "needs_changes" | "review_version";
    version: string;
    revision: string;
    reviewerNotes?: string;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseClient();

        if (!supabase) {
            return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });
        }

        // Verify admin authorization
        const authHeader = request.headers.get("authorization");
        let userId: string | null = null;
        let isAdmin = false;

        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.slice(7);
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser(token);

            if (!authError && user) {
                userId = user.id;

                // Check if user has admin role
                const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();

                isAdmin = !!roleData;
            }
        }

        if (!userId || !isAdmin) {
            return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
        }

        // Parse request body
        const body = (await request.json()) as ReviewRequest;
        const { intakeId, action, version, revision, reviewerNotes } = body;

        if (typeof intakeId !== "string" || typeof version !== "string" || typeof revision !== "string" || !action) {
            return NextResponse.json({ error: "Intake ID, version, revision and action are required." }, { status: 400 });
        }

        if (action === "review_version") {
            if (!isValidSemver(version)) return NextResponse.json({ error: "Select an exact npm version." }, { status: 400 });
            const { data: intake, error } = await supabase
                .from("tool_intakes").select("package_name, version, updated_at, status, conversion_receipt").eq("id", intakeId).maybeSingle();
            if (error) throw error;
            if (!intake) return NextResponse.json({ error: "Tool intake not found." }, { status: 404 });
            if (intake.updated_at !== revision || intake.version === version || intake.conversion_receipt || !["pending_review", "approved", "needs_changes"].includes(intake.status)) {
                return NextResponse.json({ error: "This intake has changed or already published. Refresh it before selecting a version." }, { status: 409 });
            }
            let validated;
            try {
                validated = await validateIntakeVersion(intake.package_name, version);
            } catch (error) {
                console.warn("Could not validate selected intake version:", error);
                return NextResponse.json({ error: `Could not load and validate ${intake.package_name}@${version}. Check that it is still published on npm.` }, { status: 502 });
            }
            if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
            const { data: refreshed, error: refreshError } = await supabase.rpc("refresh_tool_intake_version", {
                p_intake_id: intakeId,
                p_revision: revision,
                p_values: validated.values,
                p_contributors: validated.contributors,
            });
            if (refreshError) throw refreshError;
            if (!refreshed) return NextResponse.json({ error: "This intake changed during validation. Refresh it and try again." }, { status: 409 });
            return NextResponse.json({ success: true, message: `${version} is pending review.` });
        }

        const validActions = ["approve", "reject", "needs_changes"];
        if (!validActions.includes(action)) {
            return NextResponse.json({ error: "Invalid action. Must be approve, reject, or needs_changes" }, { status: 400 });
        }

        // Map action to status
        const statusMap: Record<string, string> = {
            approve: "approved",
            reject: "rejected",
            needs_changes: "needs_changes",
        };

        // Update the tool intake
        const { data: updatedIntake, error: updateError } = await supabase
            .from("tool_intakes")
            .update({
                status: statusMap[action],
                reviewer_notes: reviewerNotes || null,
                reviewed_by: userId,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", intakeId)
            .eq("version", version)
            .eq("updated_at", revision)
            .in("status", ["pending_review", "needs_changes", "rejected"])
            .is("conversion_receipt", null)
            .select("*, submitted_by")
            .maybeSingle();

        if (updateError) {
            console.error("Error updating intake:", updateError);
            return NextResponse.json({ error: "Failed to update tool intake" }, { status: 500 });
        }
        if (!updatedIntake) return NextResponse.json({ error: "This intake has changed. Refresh it before reviewing." }, { status: 409 });

        // Notify submitter when changes are requested
        if (action === "needs_changes") {
            await sendEmail({
                type: "tool-review-change-request",
                supabase,
                data: {
                    submitterId: updatedIntake.submitted_by,
                    toolName: updatedIntake.display_name || updatedIntake.package_name || "Tool submission",
                    submittedOn: updatedIntake.created_at || new Date().toISOString(),
                    reviewComments: reviewerNotes || "Please address the requested changes.",
                },
            });
        }

        if (action === "approve" || action === "reject") {
            const reviewerId = userId;
            notifyDiscordAfterResponse(action === "approve" ? "tool-submission.approved" : "tool-submission.rejected", async () => {
                const { data: contributorLinks } = await supabase.from("tool_intake_contributors").select("contributors(name)").eq("tool_intake_id", updatedIntake.id);
                const tool = toDiscordTool({ ...updatedIntake, tool_intake_contributors: contributorLinks }, { includeUrl: false });
                const reviewer = await getDiscordActor(supabase, reviewerId);
                const reason = reviewerNotes?.trim() ? truncate(reviewerNotes.trim(), 1000) : undefined;
                return action === "approve" ? { tool, approvedBy: reviewer } : { tool, reason, rejectedBy: reviewer };
            });
        }

        return NextResponse.json({
            success: true,
            message: `Tool intake ${statusMap[action]} successfully`,
            data: updatedIntake,
        });
    } catch (error) {
        console.error("Error processing review action:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// GET endpoint to fetch all intakes for admin review
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseClient();

        if (!supabase) {
            return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });
        }

        // Verify admin authorization
        const authHeader = request.headers.get("authorization");
        let userId: string | null = null;
        let isAdmin = false;

        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.slice(7);
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser(token);

            if (!authError && user) {
                userId = user.id;

                // Check if user has admin role
                const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();

                isAdmin = !!roleData;
            }
        }

        if (!userId || !isAdmin) {
            return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
        }

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const intakeId = searchParams.get("latestFor");
        if (intakeId) {
            const { data: intake, error } = await supabase.from("tool_intakes").select("package_name").eq("id", intakeId).maybeSingle();
            if (error) throw error;
            if (!intake) return NextResponse.json({ error: "Tool intake not found." }, { status: 404 });
            try {
                const latest = await fetchIntakeManifest(intake.package_name);
                return NextResponse.json({ version: latest.version });
            } catch (error) {
                console.warn("Could not check npm latest for intake:", error);
                return NextResponse.json({ error: "Could not check the latest version on npm." }, { status: 502 });
            }
        }

        let query = supabase
            .from("tool_intakes")
            .select(
                `*,
                contributors:tool_intake_contributors(contributors(id, name, profile_url)),
                categories:tool_intake_categories(categories(id, name)),
                tool_idea:tool_ideas!tool_intakes_tool_idea_id_fkey(id, title, description)`,
            )
            .order("created_at", { ascending: false });

        if (status && status !== "all") {
            query = query.eq("status", status);
        }

        const { data: rawData, error } = await query;

        if (error) {
            console.error("Error fetching intakes:", error);
            return NextResponse.json({ error: "Failed to fetch tool intakes" }, { status: 500 });
        }

        // Transform the data to flatten contributors and categories
        const data =
            rawData?.map((intake: any) => ({
                ...intake,
                contributors: intake.contributors?.map((c: any) => c.contributors).filter(Boolean) || [],
                categories: intake.categories?.map((cat: any) => cat.categories).filter(Boolean) || [],
            })) || [];

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Error fetching intakes:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
