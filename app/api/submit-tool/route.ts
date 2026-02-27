import { sendEmail } from "@/lib/resend";
import { fetchNpmPackageInfo, ToolPackageJson, validatePackageJson, validatePackageStructure } from "@/lib/tool-validation";
import { extractVersionInfo } from "@/lib/version-extraction";
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

interface SubmitToolRequest {
    packageName: string;
    categoryIds: number[];
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
        const body = (await request.json()) as SubmitToolRequest;
        const { packageName, categoryIds } = body;

        if (!packageName || typeof packageName !== "string") {
            return NextResponse.json({ error: "Package name is required" }, { status: 400 });
        }

        if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
            return NextResponse.json({ error: "At least one category is required" }, { status: 400 });
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

        // Step 2.5: Validate package structure (npm-shrinkwrap and dist)
        const structureResult = await validatePackageStructure(cleanPackageName);

        if (!structureResult.success) {
            return NextResponse.json(
                {
                    error: "Failed to validate package structure",
                    step: "structure_check",
                    details: {
                        error: structureResult.error,
                    },
                },
                { status: 500 },
            );
        }

        // Check if npm-shrinkwrap.json exists
        if (!structureResult.data.hasNpmShrinkwrap) {
            return NextResponse.json(
                {
                    error: "Package validation failed",
                    step: "structure_validation",
                    details: {
                        errors: ["npm-shrinkwrap.json is required but not found in the package"],
                        warnings: [],
                    },
                },
                { status: 400 },
            );
        }

        // Check if dist folder exists
        if (!structureResult.data.hasDistFolder) {
            return NextResponse.json(
                {
                    error: "Package validation failed",
                    step: "structure_validation",
                    details: {
                        errors: ["dist folder is required but not found in the package"],
                        warnings: [],
                    },
                },
                { status: 400 },
            );
        }

        // Check if dist/index.html exists
        if (!structureResult.data.hasDistIndexHtml) {
            return NextResponse.json(
                {
                    error: "Package validation failed",
                    step: "structure_validation",
                    details: {
                        errors: ["dist/index.html is required but not found in the package"],
                        warnings: [],
                    },
                },
                { status: 400 },
            );
        }

        // Step 3: Extract version information (minAPI and maxAPI) — best-effort, null if unavailable
        const versionInfoResult = await extractVersionInfo(cleanPackageName);

        if (!versionInfoResult.success) {
            console.warn(`[submit-tool] Could not extract version info for ${cleanPackageName}: ${versionInfoResult.error}`);
        }

        const minAPI = versionInfoResult.success ? versionInfoResult.data.minAPI : null;
        const maxAPI = versionInfoResult.success ? versionInfoResult.data.maxAPI : null;

        // Step 4: Store the intake request
        if (!supabase) {
            return NextResponse.json(
                {
                    error: "Database connection not configured",
                    step: "database",
                },
                { status: 500 },
            );
        }

        // Check if this package already exists in tool_intakes
        const { data: existingIntake } = await supabase.from("tool_intakes").select("id, status").eq("package_name", cleanPackageName).single();

        if (existingIntake) {
            return NextResponse.json(
                {
                    error: `This package has already been submitted (Status: ${existingIntake.status})`,
                    step: "duplicate_check",
                },
                { status: 409 },
            );
        }

        // Extract packageInfo for cleaner access (validated to exist at this point)
        const packageInfo = validationResult.packageInfo;
        if (!packageInfo) {
            return NextResponse.json(
                {
                    error: "Unexpected validation error",
                    step: "validation",
                },
                { status: 500 },
            );
        }

        // Store the tool intake request (contributors now normalized via join table)
        const { data: intakeData, error: insertError } = await supabase
            .from("tool_intakes")
            .insert({
                package_name: cleanPackageName,
                version: packageInfo.version,
                display_name: packageInfo.displayName,
                description: packageInfo.description,
                license: packageInfo.license,
                icon: packageInfo.icon || null,
                csp_exceptions: packageInfo.cspExceptions || null,
                configurations: packageInfo.configurations,
                submitted_by: userId,
                status: "pending_review",
                validation_warnings: validationResult.warnings.length > 0 ? validationResult.warnings : null,
                features: packageInfo.features || null,
                min_api: minAPI,
                max_api: maxAPI,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error inserting tool intake:", insertError);
            return NextResponse.json(
                {
                    error: "Failed to save tool intake request",
                    step: "database",
                },
                { status: 500 },
            );
        }

        // Insert category relationships
        const categoryRelations = categoryIds.map((categoryId) => ({
            tool_intake_id: intakeData.id,
            category_id: categoryId,
        }));

        const { error: categoryError } = await supabase.from("tool_intake_categories").insert(categoryRelations);

        if (categoryError) {
            console.error("Error inserting tool intake categories:", categoryError);
            // Note: We don't fail the request here since the main intake was saved
            // The admin can manually fix categories if needed
        }

        // Normalize contributors: insert into contributors table & link
        if (packageInfo.contributors && packageInfo.contributors.length > 0) {
            for (const contrib of packageInfo.contributors) {
                if (!contrib.name) continue;

                // Attempt to find existing contributor by name + profile_url
                const { data: existingContributor } = await supabase
                    .from("contributors")
                    .select("id")
                    .eq("name", contrib.name)
                    .eq("profile_url", contrib.url || null)
                    .maybeSingle();

                let contributorId = existingContributor?.id;
                if (!contributorId) {
                    const { data: insertedContributor, error: insertContribError } = await supabase
                        .from("contributors")
                        .insert({ name: contrib.name, profile_url: contrib.url || null })
                        .select("id")
                        .single();
                    if (insertContribError) {
                        console.error("Failed to insert contributor", contrib.name, insertContribError);
                        continue; // skip this contributor
                    }
                    contributorId = insertedContributor.id;
                }

                // Link contributor to intake
                const { error: linkError } = await supabase.from("tool_intake_contributors").insert({ tool_intake_id: intakeData.id, contributor_id: contributorId });
                if (linkError) {
                    console.error("Failed to link contributor", contrib.name, linkError);
                }
            }
        }

        console.log("=== NEW TOOL INTAKE SUBMITTED ===");
        console.log(`Package: ${cleanPackageName}`);
        console.log(`Display Name: ${packageInfo.displayName}`);
        console.log(`Version: ${packageInfo.version}`);
        console.log(`Description: ${packageInfo.description}`);
        console.log(`Submitted By: ${userId || "Anonymous"}`);
        console.log("Review at: /admin/tool-intakes");
        console.log("================================");

        await sendEmail({
            type: "tool-submission-admin",
            data: {
                toolName: packageInfo.displayName,
                description: packageInfo.description,
                submissionDate: new Date().toISOString(),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Tool intake request submitted successfully",
            data: {
                id: intakeData.id,
                packageName: cleanPackageName,
                version: packageInfo.version,
                displayName: packageInfo.displayName,
                status: "pending_review",
                warnings: validationResult.warnings,
            },
        });
    } catch (error) {
        console.error("Error processing tool intake:", error);
        return NextResponse.json(
            {
                error: "Internal server error",
                step: "unknown",
            },
            { status: 500 },
        );
    }
}
