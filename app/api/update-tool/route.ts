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

        // Verify authorization and identify user
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

        // Parse request body
        const body = (await request.json()) as UpdateToolRequest;
        const { toolUpdateId, packageName } = body;

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

        const validationResult = validatePackageJson(packageJson);

        if (!validationResult.valid) {
            // Update status in tool_updates table in Supabase as validation_failed
            await supabase.from("tool_updates").update({ status: "validation_failed", validation_warnings: validationResult }).eq("id", toolUpdateId);

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

        // Invoke GH action to process the tool update
        // Trigger GitHub Actions workflow to build and publish the tool and wait for completion
        // TODO: update workflow will handle downloadurl and iconurl
        const ghToken = process.env.GH_PAT_TOKEN;
        if (!ghToken) {
            return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
        }

        const repoOwner = "PowerPlatformToolBox";
        const repoName = "pptb-web";

        // Update tool table entry with latest validated package info
        await supabase
            .from("tools")
            .update({
                name: packageJson.displayName,
                description: packageJson.description,
                contributors: packageJson.contributors,
                csp_exceptions: packageJson.cspExceptions,
                license: packageJson.license,
                configurations: packageJson.configurations,
                version: packageJson.version,
                features: packageJson.features || null,
            })
            .eq("package_name", packageJson.name);

        // Update tool update record as validated
        await supabase.from("tool_updates").update({ status: "validated", validation_warnings: validationResult }).eq("id", toolUpdateId);

        return NextResponse.json({
            success: true,
            message: "Tool intake request submitted successfully",
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
