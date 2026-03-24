import { runUpdateToolWorkflow } from "@/lib/github-api";
import { fetchNpmPackageInfo, ToolPackageJson, validatePackageJson } from "@/lib/tool-validation";
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = getSupabaseClient();

        if (!supabase) {
            return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });
        }

        // Verify user is authenticated
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
            } else {
                return NextResponse.json({ error: "Unauthorized. Valid user token required." }, { status: 401 });
            }
        }

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
        }

        const { id: toolId } = await params;

        if (!toolId) {
            return NextResponse.json({ error: "Tool ID is required" }, { status: 400 });
        }

        // Fetch the tool and verify ownership
        const { data: tool, error: fetchError } = await supabase.from("tools").select("id, user_id, packagename, version").eq("id", toolId).single();

        if (fetchError || !tool) {
            return NextResponse.json({ error: "Tool not found" }, { status: 404 });
        }

        if (tool.user_id !== userId) {
            return NextResponse.json({ error: "You do not have permission to trigger an update for this tool" }, { status: 403 });
        }

        const packageName = tool.packagename as string;

        if (!packageName) {
            return NextResponse.json({ error: "Tool does not have a package name configured" }, { status: 400 });
        }

        // Fetch latest package info from npm
        const npmResult = await fetchNpmPackageInfo(packageName);

        if (!npmResult.success) {
            return NextResponse.json(
                {
                    error: npmResult.error,
                    step: "npm_check",
                },
                { status: 404 },
            );
        }

        // Validate package.json structure
        const packageJson: ToolPackageJson = {
            name: npmResult.data.name,
            version: npmResult.data.version,
            displayName: npmResult.data.displayName,
            description: npmResult.data.description,
            contributors: npmResult.data.contributors,
            cspExceptions: npmResult.data.cspExceptions,
            license: npmResult.data.license,
            icon: npmResult.data.icon,
            configurations: npmResult.data.configurations,
            features: npmResult.data.features,
        };

        const validationResult = await validatePackageJson(packageJson);

        if (!validationResult.valid) {
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

        // Invoke the GitHub update workflow for this specific tool
        const ghToken = process.env.GH_PAT_TOKEN;
        if (!ghToken) {
            return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
        }

        const repoOwner = "PowerPlatformToolBox";
        const repoName = "tool-management";

        const conclusion = await runUpdateToolWorkflow({
            owner: repoOwner,
            repo: repoName,
            token: ghToken,
            inputs: {
                tool_id: packageJson.name,
                version: packageJson.version,
                authors: (packageJson.contributors || []).map((c) => (typeof c === "string" ? c : c.name)).filter(Boolean).join(", "),
                repository: packageJson.configurations?.repository || "",
                website: packageJson.configurations?.website || "",
            },
            ref: "main",
            timeoutMs: 180000,
            pollIntervalMs: 30000,
        });

        if (conclusion !== "success") {
            console.warn(`[trigger-update] Update workflow failed for ${packageJson.name}@${packageJson.version} with conclusion: ${conclusion || "unknown"}`);
            return NextResponse.json({ error: "Update workflow did not complete successfully" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Update workflow completed successfully for ${packageJson.name}@${packageJson.version}`,
        });
    } catch (error) {
        console.error("[trigger-update] Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 });
    }
}
