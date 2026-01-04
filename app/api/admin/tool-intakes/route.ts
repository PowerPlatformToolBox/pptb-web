/* eslint-disable @typescript-eslint/no-explicit-any */
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
    action: "approve" | "reject" | "needs_changes";
    reviewerNotes?: string;
}

// Send notification to the submitter about their review status
async function sendSubmitterNotification(email: string, subject: string, body: string): Promise<boolean> {
    // For now, we'll log the notification (in production, integrate with email service)
    console.log("Submitter Notification:", { to: email, subject, body });

    // Example using Supabase Edge Function (if configured):
    // const supabase = getSupabaseClient();
    // if (supabase) {
    //     await supabase.functions.invoke("send-email", {
    //         body: { to: email, subject, body }
    //     });
    // }

    return true;
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
        const { intakeId, action, reviewerNotes } = body;

        if (!intakeId || !action) {
            return NextResponse.json({ error: "intakeId and action are required" }, { status: 400 });
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
            })
            .eq("id", intakeId)
            .select()
            .single();

        if (updateError) {
            console.error("Error updating intake:", updateError);
            return NextResponse.json({ error: "Failed to update tool intake" }, { status: 500 });
        }

        // Send notification to the submitter if they have an email
        if (updatedIntake.submitted_by) {
            const { data: submitter } = await supabase.auth.admin.getUserById(updatedIntake.submitted_by);

            if (submitter?.user?.email) {
                const actionText = {
                    approve: "approved",
                    reject: "rejected",
                    needs_changes: "marked as needing changes",
                }[action];

                await sendSubmitterNotification(
                    submitter.user.email,
                    `Tool Intake Update: ${updatedIntake.display_name}`,
                    `Your tool submission "${updatedIntake.display_name}" has been ${actionText}.${reviewerNotes ? `\n\nReviewer Notes: ${reviewerNotes}` : ""}`,
                );
            }
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

        let query = supabase
            .from("tool_intakes")
            .select(
                `*,
                contributors:tool_intake_contributors(contributors(id, name, profile_url)),
                categories:tool_intake_categories(categories(id, name))`,
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
