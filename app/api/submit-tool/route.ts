import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
    fetchNpmPackageInfo,
    validatePackageJson,
    ToolPackageJson,
} from "@/lib/tool-intake-validation";

// Create Supabase client with service role for server-side operations
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return null;
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

interface SubmitToolRequest {
    packageName: string;
}

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = (await request.json()) as SubmitToolRequest;
        const { packageName } = body;

        if (!packageName || typeof packageName !== "string") {
            return NextResponse.json(
                { error: "Package name is required" },
                { status: 400 }
            );
        }

        // Clean up package name
        const cleanPackageName = packageName.trim().toLowerCase();

        // Validate package name format
        if (!/^(@[\w-]+\/)?[\w.-]+$/.test(cleanPackageName)) {
            return NextResponse.json(
                { error: "Invalid npm package name format" },
                { status: 400 }
            );
        }

        // Step 1: Fetch package info from npm
        const npmResult = await fetchNpmPackageInfo(cleanPackageName);

        if (!npmResult.success) {
            return NextResponse.json(
                {
                    error: npmResult.error,
                    step: "npm_check",
                },
                { status: 404 }
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
                { status: 400 }
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
                { status: 500 }
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
        const { data: existingIntake } = await supabase
            .from("tool_intakes")
            .select("id, status")
            .eq("package_name", cleanPackageName)
            .single();

        if (existingIntake) {
            return NextResponse.json(
                {
                    error: `This package has already been submitted (Status: ${existingIntake.status})`,
                    step: "duplicate_check",
                },
                { status: 409 }
            );
        }

        // Store the tool intake request
        const { data: intakeData, error: insertError } = await supabase
            .from("tool_intakes")
            .insert({
                package_name: cleanPackageName,
                version: validationResult.packageInfo!.version,
                display_name: validationResult.packageInfo!.displayName,
                description: validationResult.packageInfo!.description,
                license: validationResult.packageInfo!.license,
                contributors: validationResult.packageInfo!.contributors,
                csp_exceptions: validationResult.packageInfo!.cspExceptions || null,
                configurations: validationResult.packageInfo!.configurations,
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
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Tool intake request submitted successfully",
            data: {
                id: intakeData.id,
                packageName: cleanPackageName,
                version: validationResult.packageInfo!.version,
                displayName: validationResult.packageInfo!.displayName,
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
            { status: 500 }
        );
    }
}
