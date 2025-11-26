import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client with service role for server-side operations
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return null;
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

interface ConvertRequest {
    intakeId: string;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseClient();

        if (!supabase) {
            return NextResponse.json(
                { error: "Database connection not configured" },
                { status: 500 }
            );
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
                const { data: roleData } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", user.id)
                    .eq("role", "admin")
                    .single();

                isAdmin = !!roleData;
            }
        }

        if (!userId || !isAdmin) {
            return NextResponse.json(
                { error: "Unauthorized. Admin access required." },
                { status: 403 }
            );
        }

        // Parse request body
        const body = (await request.json()) as ConvertRequest;
        const { intakeId } = body;

        if (!intakeId) {
            return NextResponse.json(
                { error: "intakeId is required" },
                { status: 400 }
            );
        }

        // Fetch the approved intake
        const { data: intake, error: fetchError } = await supabase
            .from("tool_intakes")
            .select("*")
            .eq("id", intakeId)
            .single();

        if (fetchError || !intake) {
            return NextResponse.json(
                { error: "Tool intake not found" },
                { status: 404 }
            );
        }

        if (intake.status !== "approved") {
            return NextResponse.json(
                { error: `Cannot convert intake with status "${intake.status}". Only approved intakes can be converted.` },
                { status: 400 }
            );
        }

        // Check if tool with same npm package already exists
        const { data: existingTool } = await supabase
            .from("tools")
            .select("id")
            .eq("npm_package", intake.package_name)
            .single();

        if (existingTool) {
            return NextResponse.json(
                { error: "A tool with this npm package already exists" },
                { status: 409 }
            );
        }

        // Insert into tools table
        // Note: iconurl is the primary field used for displaying tool icons
        const { data: newTool, error: insertError } = await supabase
            .from("tools")
            .insert({
                name: intake.display_name,
                description: intake.description,
                iconurl: intake.configurations?.iconUrl || null,
                category: intake.configurations?.categories?.[0] || "other",
                author: intake.contributors?.[0]?.name || null,
                version: intake.version,
                npm_package: intake.package_name,
                repository_url: intake.configurations?.repository || null,
                website_url: intake.configurations?.website || null,
                readme_url: intake.configurations?.readmeUrl || null,
                license: intake.license,
                contributors: intake.contributors,
                csp_exceptions: intake.csp_exceptions,
                categories: intake.configurations?.categories || [],
                downloads: 0,
                rating: 0,
                aum: 0,
                last_updated: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error creating tool:", insertError);
            return NextResponse.json(
                { error: "Failed to create tool", details: insertError.message },
                { status: 500 }
            );
        }

        // Update intake status to converted
        const { error: updateError } = await supabase
            .from("tool_intakes")
            .update({
                status: "converted_to_tool",
                updated_at: new Date().toISOString(),
            })
            .eq("id", intakeId);

        if (updateError) {
            console.error("Error updating intake status:", updateError);
            // Tool was created but intake status update failed - log but don't fail
        }

        // TODO: Implement email notifications via Supabase Edge Functions or email service
        // For now, log the notification details for debugging
        if (intake.submitted_by) {
            const { data: submitter } = await supabase.auth.admin.getUserById(
                intake.submitted_by
            );

            if (submitter?.user?.email) {
                console.log("Tool Conversion Notification (implement email service):", {
                    to: submitter.user.email,
                    subject: `Your tool "${intake.display_name}" is now live!`,
                    body: `Great news! Your tool submission "${intake.display_name}" has been converted to a full tool and is now available in the Power Platform Tool Box.`,
                });
                // Example: await sendEmail({ to: submitter.user.email, subject, body });
            }
        }

        return NextResponse.json({
            success: true,
            message: "Tool created successfully",
            data: {
                toolId: newTool.id,
                name: newTool.name,
                status: "converted_to_tool",
            },
        });
    } catch (error) {
        console.error("Error converting intake to tool:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
