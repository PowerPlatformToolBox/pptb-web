import { runUpdateToolWorkflow } from "@/lib/github-api";
import { sendEmail } from "@/lib/resend";
import { fetchNpmPackageInfo, ToolPackageJson, validatePackageJson } from "@/lib/tool-intake-validation";
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

interface UpdateToolRequest {
    toolUpdateId: string;
    packageName: string;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseClient();

        if (!supabase) {
            return NextResponse.json(
                {
                    error: "Database connection not configured",
                    step: "database",
                },
                { status: 500 },
            );
        }

        // Verify authorization and identify user (optional for external calls)
        const authHeader = request.headers.get("authorization");
        let userId: string | null = null;

        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.slice(7);
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser(token);

            if (!authError && user) {
                userId = user.id;
            }
            // Note: Auth is optional - external calls can proceed without token
        }

        // Parse request body
        const body = (await request.json()) as UpdateToolRequest;
        const { toolUpdateId, packageName } = body;

        if (!toolUpdateId || typeof toolUpdateId !== "string") {
            return NextResponse.json({ error: "toolUpdateId is required" }, { status: 400 });
        }

        if (!packageName || typeof packageName !== "string") {
            return NextResponse.json({ error: "Package name is required" }, { status: 400 });
        }

        // Clean up package name
        const cleanPackageName = packageName.trim().toLowerCase();

        // Validate package name format using npm's naming rules
        // https://github.com/npm/validate-npm-package-name
        const npmPackageNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
        if (!npmPackageNameRegex.test(cleanPackageName)) {
            return NextResponse.json({ error: "Invalid npm package name format" }, { status: 400 });
        }

        // Step 1: Fetch package info from npm
        const npmResult = await fetchNpmPackageInfo(cleanPackageName);

        if (!npmResult.success) {
            return NextResponse.json(
                {
                    error: npmResult.error,
                    step: "npm_check",
                },
                { status: 404 },
            );
        }

        // Step 2: Validate package.json structure
        const packageJson: ToolPackageJson = {
            name: npmResult.data.name,
            version: npmResult.data.version,
            displayName: npmResult.data.displayName,
            description: npmResult.data.description,
            contributors: npmResult.data.contributors,
            cspExceptions: npmResult.data.cspExceptions,
            license: npmResult.data.license,
            configurations: npmResult.data.configurations,
            features: npmResult.data.features,
        };

        const validationResult = await validatePackageJson(packageJson);

        if (!validationResult.valid) {
            const toolName = packageJson.displayName || packageJson.name;
            const validationErrors = validationResult.errors || [];
            // Update status in tool_updates table in Supabase as validation_failed
            await supabase.from("tool_updates").update({ status: "validation_failed", validation_warnings: validationResult }).eq("id", toolUpdateId);

            await sendEmail({
                type: "tool-update-admin",
                data: {
                    toolName,
                    version: packageJson.version,
                    validationErrors,
                },
            });

            await sendEmail({
                type: "tool-update-developer",
                supabase,
                data: {
                    packageName: packageJson.name,
                    toolName,
                    version: packageJson.version,
                    validationErrors,
                },
            });

            return NextResponse.json(
                {
                    error: "Package validation failed",
                    step: "validation",
                    details: {
                        errors: validationResult.errors,
                        warnings: validationResult.warnings,
                    },
                },
                { status: 400 },
            );
        }

        // Update tool table entry with latest validated package info
        await supabase
            .from("tools")
            .update({
                name: packageJson.displayName,
                description: packageJson.description,
                iconurl: packageJson.configurations?.iconUrl || null,
                readmeurl: packageJson.configurations?.readmeUrl || null,
                version: packageJson.version,
                csp_exceptions: packageJson.cspExceptions,
                license: packageJson.license,
                features: packageJson.features || null,
                repository: packageJson.configurations?.repository || null,
                website: packageJson.configurations?.website || null,
            })
            .eq("package_name", packageJson.name);

        // Update tool update record as validated
        await supabase.from("tool_updates").update({ status: "validated", validation_warnings: validationResult }).eq("id", toolUpdateId);

        // Invoke GH action to process the tool update
        const ghToken = process.env.GH_PAT_TOKEN;
        if (!ghToken) {
            console.warn("[update-tool] GitHub token not configured; skipping workflow and email notifications.");
            return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
        }

        const repoOwner = "PowerPlatformToolBox";
        const repoName = "pptb-web";

        const conclusion = await runUpdateToolWorkflow({
            owner: repoOwner,
            repo: repoName,
            token: ghToken,
            inputs: {
                tool_id: packageJson.name,
                version: packageJson.version,
                authors: (packageJson.contributors || []).map((c) => (typeof c === "string" ? c : c.name)).join(", "),
                repository: packageJson.configurations?.repository || "",
                website: packageJson.configurations?.website || "",
            },
            ref: "main",
            timeoutMs: 180000,
            pollIntervalMs: 30000,
        });

        if (conclusion !== "success") {
            console.warn(`[update-tool] Conversion workflow failed for ${packageJson.name}@${packageJson.version} with conclusion: ${conclusion || "unknown"}`);
            return NextResponse.json({ error: "Conversion workflow did not complete successfully" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Tool intake request submitted successfully",
        });
    } catch (error) {
        console.error("[update-tool] Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 });
    }
}
