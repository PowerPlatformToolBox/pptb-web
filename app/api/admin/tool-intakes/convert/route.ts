import { randomUUID } from "node:crypto";
import { runConvertToolWorkflow } from "@/lib/github-api";
import { fetchIntakeManifest } from "@/lib/intake-package";
import { sendEmail } from "@/lib/resend";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const url = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceKey) return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });
        const supabase = createClient(url, serviceKey);

        const authorization = request.headers.get("authorization");
        if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
        const { data: { user }, error: authError } = await supabase.auth.getUser(authorization.slice(7));
        if (authError || !user) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
        const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (!role) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

        const { intakeId, version, revision } = await request.json();
        if (typeof intakeId !== "string" || typeof version !== "string" || typeof revision !== "string") {
            return NextResponse.json({ error: "Intake ID, approved version and revision are required." }, { status: 400 });
        }
        const { data: intake, error: intakeError } = await supabase
            .from("tool_intakes")
            .select("*, tool_intake_contributors(contributors(name))")
            .eq("id", intakeId)
            .maybeSingle();
        if (intakeError) throw intakeError;
        if (!intake) return NextResponse.json({ error: "Tool intake not found." }, { status: 404 });
        if (
            (intake.status !== "approved" && intake.status !== "converted_to_tool") ||
            intake.version !== version ||
            (intake.updated_at !== revision && intake.status !== "converted_to_tool")
        ) {
            return NextResponse.json({ error: "This intake has changed. Refresh it and check the approved version before converting." }, { status: 409 });
        }

        let workflow: Awaited<ReturnType<typeof runConvertToolWorkflow>> | undefined;
        if (!intake.conversion_receipt && intake.status === "approved") {
            const { data: existingTool, error: lookupError } = await supabase
                .from("tools").select("id").eq("packagename", intake.package_name).maybeSingle();
            if (lookupError) throw lookupError;
            if (existingTool) {
                return NextResponse.json({
                    error: "This package already has a marketplace listing without a matching conversion receipt. Resolve the existing listing before converting; it was not changed.",
                }, { status: 409 });
            }

            try {
                const manifest = await fetchIntakeManifest(intake.package_name, version);
                if (manifest.version !== version) throw new Error("npm did not return the approved version.");
            } catch (error) {
                console.warn("Could not verify approved intake version:", error);
                return NextResponse.json({
                    error: `Could not verify ${intake.package_name}@${version} on npm. Retry if npm is unavailable, or select a published version for fresh review.`,
                }, { status: 409 });
            }

            const token = process.env.GH_PAT_TOKEN;
            if (!token) return NextResponse.json({ error: "GitHub token not configured." }, { status: 500 });
            const authors = (intake.tool_intake_contributors || [])
                .map((link: { contributors?: { name?: string | null } }) => link.contributors?.name)
                .filter(Boolean)
                .join(", ");
            workflow = await runConvertToolWorkflow({
                owner: "PowerPlatformToolBox",
                repo: "tool-management",
                token,
                inputs: {
                    intake_id: intakeId,
                    intake_revision: revision,
                    request_id: randomUUID(),
                    npm_package_name: intake.package_name,
                    display_name: intake.display_name,
                    description: intake.description,
                    icon: intake.icon || "",
                    readme_url: intake.configurations?.readmeUrl || "",
                    version,
                    license: intake.license || "MIT",
                    csp_exceptions: intake.csp_exceptions ? JSON.stringify(intake.csp_exceptions) : "",
                    submitted_by: intake.submitted_by || "",
                    features: intake.features ? JSON.stringify(intake.features) : "",
                    authors,
                    repository: intake.configurations?.repository || "",
                    website: intake.configurations?.website || "",
                    minAPI: intake.min_api || intake.features?.minAPI || "",
                },
                ref: "main",
                timeoutMs: 180_000,
                pollIntervalMs: 5_000,
            });
        }

        const { data: result, error: finalizeError } = await supabase.rpc("finalize_tool_intake_conversion", { p_intake_id: intakeId, p_version: version });
        if (finalizeError) throw finalizeError;
        if (!result) {
            if (workflow?.conclusion !== "success" && workflow?.failureReason) {
                return NextResponse.json({
                    error: `${workflow.failureReason} Check the workflow before retrying. If it has published, retrying will resume finalization.`,
                    workflowUrl: workflow.htmlUrl,
                }, { status: workflow.conclusion ? 502 : 504 });
            }
            return NextResponse.json({
                error: `Could not finalize the approved ${version} release. Check the workflow result and current marketplace release; neither will be overwritten by a retry.`,
                workflowUrl: workflow?.htmlUrl,
            }, { status: 409 });
        }

        if (result.finalized_now && intake.submitted_by) {
            const toolLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.powerplatformtoolbox.com"}/tools/${result.tool_id}`;
            try {
                await sendEmail({
                    type: "tool-conversion-success",
                    supabase,
                    data: { submitterId: intake.submitted_by, toolName: intake.display_name || intake.package_name, packageName: intake.package_name, toolLink },
                });
            } catch (error) {
                console.error("Intake converted, but its notification failed:", error);
            }
        }

        return NextResponse.json({
            success: true,
            message: "Tool created successfully",
            warning: workflow?.conclusion && workflow.conclusion !== "success"
                ? "The marketplace release was published, but a follow-up workflow step failed. Check the workflow; do not republish the release."
                : undefined,
            workflowUrl: workflow?.htmlUrl,
            data: { toolId: result.tool_id, releaseId: result.release_id, version: result.version, name: intake.display_name, status: "converted_to_tool" },
        });
    } catch (error) {
        console.error("Error converting intake to tool:", error);
        return NextResponse.json({ error: "Could not complete conversion. Refresh the intake and retry to resume if it has already published." }, { status: 500 });
    }
}
