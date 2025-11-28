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

// Send notification to admins about new tool intake
async function notifyAdmins(intakeDetails: { packageName: string; displayName: string; version: string; description: string; submittedBy?: string }) {
    // Log the notification (in production, integrate with email service like Resend, SendGrid, etc.)
    console.log("=== NEW TOOL INTAKE SUBMITTED ===");
    console.log(`Package: ${intakeDetails.packageName}`);
    console.log(`Display Name: ${intakeDetails.displayName}`);
    console.log(`Version: ${intakeDetails.version}`);
    console.log(`Description: ${intakeDetails.description}`);
    console.log(`Submitted By: ${intakeDetails.submittedBy || "Anonymous"}`);
    console.log("Review at: /admin/tool-intakes");
    console.log("================================");

    // Example integration with Supabase Edge Function for email:
    // const supabase = getSupabaseClient();
    // if (supabase && process.env.ADMIN_NOTIFICATION_EMAIL) {
    //     await supabase.functions.invoke("send-admin-notification", {
    //         body: {
    //             to: process.env.ADMIN_NOTIFICATION_EMAIL,
    //             subject: `New Tool Intake: ${intakeDetails.displayName}`,
    //             packageName: intakeDetails.packageName,
    //             displayName: intakeDetails.displayName,
    //             version: intakeDetails.version,
    //             description: intakeDetails.description,
    //             reviewUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/tool-intakes`,
    //         },
    //     });
    // }

    return true;
}

interface SubmitToolRequest {
    packageName: string;
    categoryIds: number[];
}

export async function POST(request: NextRequest) {
    try {
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
            configurations: npmResult.data.configurations,
        };

        const validationResult = validatePackageJson(packageJson);

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

        // Step 3: Get Supabase client and store the intake request
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

        // Get user from authorization header (if using Supabase auth)
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
                csp_exceptions: packageInfo.cspExceptions || null,
                configurations: packageInfo.configurations,
                submitted_by: userId,
                status: "pending_review",
                validation_warnings: validationResult.warnings.length > 0 ? validationResult.warnings : null,
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

        // Notify admins about the new submission
        await notifyAdmins({
            packageName: cleanPackageName,
            displayName: packageInfo.displayName,
            version: packageInfo.version,
            description: packageInfo.description,
            submittedBy: userId || undefined,
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
