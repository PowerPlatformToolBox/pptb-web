import { runConvertToolWorkflow } from "@/lib/github-api";
import { sendEmail } from "@/lib/resend";
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

interface ConvertRequest {
    intakeId: string;
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
        const body = (await request.json()) as ConvertRequest;
        const { intakeId } = body;

        if (!intakeId) {
            return NextResponse.json({ error: "intakeId is required" }, { status: 400 });
        }

        // Fetch the approved intake with categories & contributors (normalized)
        const { data: intake, error: fetchError } = await supabase
            .from("tool_intakes")
            .select(
                `
                *,
                tool_intake_categories(
                    category_id
                ),
                tool_intake_contributors(
                    contributor_id,
                    contributors(id,name,profile_url)
                )
            `,
            )
            .eq("id", intakeId)
            .single();

        if (fetchError || !intake) {
            return NextResponse.json({ error: "Tool intake not found" }, { status: 404 });
        }

        if (intake.status !== "approved") {
            return NextResponse.json({ error: `Cannot convert intake with status "${intake.status}". Only approved intakes can be converted.` }, { status: 400 });
        }

        // Trigger GitHub Actions workflow to build and publish the tool and wait for completion
        const ghToken = process.env.GH_PAT_TOKEN;
        if (!ghToken) {
            return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
        }

        const repoOwner = "PowerPlatformToolBox";
        const repoName = "pptb-web";
        const authorString =
            (intake.tool_intake_contributors || [])
                .map((tic: { contributors?: { name?: string | null } }) => tic.contributors?.name)
                .filter(Boolean)
                .join(", ") || "";

        const conclusion = await runConvertToolWorkflow({
            owner: repoOwner,
            repo: repoName,
            token: ghToken,
            inputs: {
                npm_package_name: intake.package_name,
                display_name: intake.display_name,
                description: intake.description,
                icon_url: intake.configurations?.iconUrl || "",
                readme_url: intake.configurations?.readmeUrl || "",
                version: intake.version || "1.0.0",
                license: intake.license || "MIT",
                csp_exceptions: intake.csp_exceptions ? JSON.stringify(intake.csp_exceptions) : "",
                submitted_by: intake.submitted_by || "",
                features: intake.features ? JSON.stringify(intake.features) : "",
                authors: authorString,
                repository: intake.configurations?.repository || "",
                website: intake.configurations?.website || "",
            },
            ref: "main",
            timeoutMs: 180000,
            pollIntervalMs: 30000,
        });

        if (conclusion !== "success") {
            return NextResponse.json({ error: "Conversion workflow did not complete successfully" }, { status: 500 });
        }

        const intakeWithContrib = intake as typeof intake & {
            tool_intake_contributors?: Array<{ contributor_id: number; contributors?: { id: number; name: string; profile_url: string | null } }>;
        };

        // Fetch the tool created by the workflow (upsert) using unique packagename
        const { data: newTool, error: fetchToolError } = await supabase.from("tools").select("id, packagename, name, version").eq("packagename", intake.package_name).single();
        if (fetchToolError || !newTool) {
            console.error("Tool not found after workflow upsert:", fetchToolError);
            return NextResponse.json({ error: "Tool not found after workflow" }, { status: 500 });
        }

        // // Backfill fields not set by workflow (non-fatal on failure)
        // const updates: Partial<{
        //     readmeurl: string;
        //     license: string;
        //     csp_exceptions: unknown;
        //     user_id: string;
        // }> = {};
        // if (intake.configurations?.readmeUrl) updates.readmeurl = intake.configurations.readmeUrl;
        // if (intake.license) updates.license = intake.license;
        // if (intake.csp_exceptions) updates.csp_exceptions = intake.csp_exceptions;
        // if (intake.submitted_by) updates.user_id = intake.submitted_by;
        // // repository/website backfill omitted until schema fields confirmed
        // if (Object.keys(updates).length > 0) {
        //     const { error: backfillError } = await supabase.from("tools").update(updates).eq("id", newTool.id);
        //     if (backfillError) {
        //         console.warn("Non-fatal: failed to backfill some tool fields", backfillError);
        //     }
        // }

        // // Insert contributor relationships for the new tool
        // const toolContributorRelations =
        //     intakeWithContrib.tool_intake_contributors?.map((tic: { contributor_id: number }) => ({
        //         tool_id: newTool.id,
        //         contributor_id: tic.contributor_id,
        //     })) || [];
        // if (toolContributorRelations.length > 0) {
        //     const { error: toolContribError } = await supabase.from("tool_contributors").insert(toolContributorRelations);
        //     if (toolContribError) {
        //         console.error("Error inserting tool contributors:", toolContribError);
        //     }
        // }

        // Insert category relationships for the new tool
        const intakeWithCategories = intake as typeof intake & {
            tool_intake_categories?: Array<{ category_id: number }>;
        };
        const categoryIds = intakeWithCategories.tool_intake_categories?.map((tic: { category_id: number }) => tic.category_id) || [];
        if (categoryIds.length > 0) {
            const toolCategoryRelations = categoryIds.map((categoryId: number) => ({
                tool_id: newTool.id,
                category_id: categoryId,
            }));

            const { error: categoryError } = await supabase.from("tool_categories").insert(toolCategoryRelations);

            if (categoryError) {
                console.error("Error inserting tool categories:", categoryError);
                // Don't fail the conversion if categories fail - they can be added manually
            }
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

        // Send email notification to submitter
        if (intake.submitted_by) {
            const toolLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.powerplatformtoolbox.com"}/tools/${newTool.id}`;
            await sendEmail({
                type: "tool-conversion-success",
                supabase,
                data: {
                    submitterId: intake.submitted_by,
                    toolName: intake.display_name || intake.package_name,
                    packageName: intake.package_name,
                    toolLink,
                },
            });
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
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
