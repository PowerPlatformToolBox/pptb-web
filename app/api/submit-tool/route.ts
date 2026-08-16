import { sendEmail } from "@/lib/resend";
import { fetchNpmPackageInfo, ToolPackageJson } from "@/lib/tool-validation";
import { extractVersionInfo } from "@/lib/version-extraction";
import { validatePackageJson } from "@pptb/validate";
import { validatePackageStructure } from "@pptb/validate/npm";
import { createClient, User } from "@supabase/supabase-js";
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
    linkedinProfileUrl: string;
    discordHandle?: string;
}

const linkedInProfileRegex = /^https:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_%~-]+\/?(?:\?.*)?$/i;

async function getAuthenticatedUser(request: NextRequest, supabase: NonNullable<ReturnType<typeof getSupabaseClient>>): Promise<User | null> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(token);

    return error ? null : user;
}

export async function GET(request: NextRequest) {
    const supabase = getSupabaseClient();
    if (!supabase) return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });

    const user = await getAuthenticatedUser(request, supabase);
    if (!user) return NextResponse.json({ error: "Unauthorized. Valid user token required." }, { status: 401 });

    const { data, error } = await supabase.from("user_profiles").select("linkedin_profile_url, discord_handle").eq("id", user.id).maybeSingle();
    if (error) {
        console.error("Error loading developer profile:", error);
        return NextResponse.json({ error: "Failed to load developer profile" }, { status: 500 });
    }

    return NextResponse.json({
        linkedinProfileUrl: data?.linkedin_profile_url || "",
        discordHandle: data?.discord_handle || "",
    });
}

// Helper function to assert the package structure is valid
async function assertPackageStructure(packageName: string): Promise<NextResponse | null> {
    const structureResult = await validatePackageStructure(packageName);

    // If the package structure validation fails, return a structured error response
    if (!structureResult.success) {
        return NextResponse.json(
            {
                error: "Failed to validate package structure",
                step: "structure_check",
                details: { error: structureResult.error },
            },
            { status: 500 },
        );
    }

    // If the package structure validation succeeds, check the package structure and return a structured error response if any of the following are missing:
    const { hasNpmShrinkwrap, hasDistFolder, hasDistIndexHtml } = structureResult.data;
    const errors: string[] = [];

    if (!hasNpmShrinkwrap) {
        errors.push("npm-shrinkwrap.json is required but not found in the package");
    }
    if (!hasDistFolder) {
        errors.push("dist folder is required but not found in the package");
    }
    if (!hasDistIndexHtml) {
        errors.push("dist/index.html is required but not found in the package");
    }

    if (errors.length > 0) {
        return NextResponse.json(
            {
                error: "Package validation failed",
                step: "structure_validation",
                details: { errors, warnings: [] },
            },
            { status: 400 },
        );
    }

    return null;
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
        const user = await getAuthenticatedUser(request, supabase);
        if (!user) return NextResponse.json({ error: "Unauthorized. Valid user token required." }, { status: 401 });

        // Parse request body
        const body = (await request.json()) as SubmitToolRequest;
        const { packageName, categoryIds, linkedinProfileUrl, discordHandle } = body;

        if (!packageName || typeof packageName !== "string") {
            return NextResponse.json({ error: "Package name is required" }, { status: 400 });
        }

        if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
            return NextResponse.json({ error: "At least one category is required" }, { status: 400 });
        }

        const cleanLinkedInProfileUrl = linkedinProfileUrl?.trim();
        const cleanDiscordHandle = discordHandle?.trim() || null;
        if (!cleanLinkedInProfileUrl || !linkedInProfileRegex.test(cleanLinkedInProfileUrl)) {
            return NextResponse.json({ error: "A valid LinkedIn profile URL is required" }, { status: 400 });
        }

        if (cleanDiscordHandle && cleanDiscordHandle.length > 100) {
            return NextResponse.json({ error: "Discord handle must be 100 characters or fewer" }, { status: 400 });
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
        const structureError = await assertPackageStructure(cleanPackageName);
        if (structureError) return structureError;

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

        const { error: profileError } = await supabase.from("user_profiles").upsert(
            {
                id: user.id,
                email: user.email || "",
                linkedin_profile_url: cleanLinkedInProfileUrl,
                discord_handle: cleanDiscordHandle,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
        );

        if (profileError) {
            console.error("Error updating developer profile:", profileError);
            return NextResponse.json({ error: "Failed to update developer profile", step: "profile_update" }, { status: 500 });
        }

        // Extract packageInfo for cleaner access (validated to exist at this point)
        const packageInfo: ToolPackageJson = validationResult.packageInfo as ToolPackageJson;
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
                submitted_by: user.id,
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

        // Helper to rollback the intake insert; logs a warning if the delete itself fails
        const rollbackIntake = async () => {
            const { error: deleteError } = await supabase.from("tool_intakes").delete().eq("id", intakeData.id);
            if (deleteError) {
                console.warn(`[submit-tool] Failed to rollback intake ${intakeData.id}:`, deleteError);
            }
        };

        // Validate that all provided category IDs exist
        const { data: existingCategories, error: categoriesLookupError } = await supabase
            .from("categories")
            .select("id")
            .in("id", categoryIds);

        if (categoriesLookupError || !existingCategories) {
            await rollbackIntake();
            console.error("Error validating categories:", categoriesLookupError);
            return NextResponse.json(
                {
                    error: "Failed to validate categories. Please resubmit.",
                    step: "category_validation",
                },
                { status: 500 },
            );
        }

        const validCategoryIds = new Set(existingCategories.map((c) => c.id));
        const invalidCount = categoryIds.filter((id) => !validCategoryIds.has(id)).length;

        if (invalidCount > 0) {
            await rollbackIntake();
            return NextResponse.json(
                {
                    error: `${invalidCount} selected ${invalidCount === 1 ? "category is" : "categories are"} invalid. Please resubmit with valid categories.`,
                    step: "category_validation",
                },
                { status: 400 },
            );
        }

        // Insert category relationships
        const categoryRelations = categoryIds.map((categoryId) => ({
            tool_intake_id: intakeData.id,
            category_id: categoryId,
        }));

        const { error: categoryError } = await supabase.from("tool_intake_categories").insert(categoryRelations);

        if (categoryError) {
            await rollbackIntake();
            console.error("Error inserting tool intake categories:", categoryError);
            return NextResponse.json(
                {
                    error: "Failed to save tool categories. Please resubmit.",
                    step: "category_insert",
                },
                { status: 500 },
            );
        }

        const { error: developerFlagError } = await supabase.from("user_profiles").update({ is_tool_developer: true }).eq("id", user.id);

        if (developerFlagError) {
            console.error("Error setting tool developer flag:", developerFlagError);
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
        console.log(`Submitted By: ${user.id}`);
        console.log("Review at: /admin/tool-intakes");
        console.log("================================");

        await sendEmail({
            type: "tool-submission-admin",
            data: {
                toolName: packageInfo.displayName!,
                description: packageInfo.description!,
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
