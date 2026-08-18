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

interface UpdateCategoriesRequest {
    toolId: string;
    categoryIds: number[];
}

export async function POST(request: NextRequest) {
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

        // Parse request body
        const body = (await request.json()) as UpdateCategoriesRequest;
        const { toolId, categoryIds } = body;

        if (!toolId) {
            return NextResponse.json({ error: "toolId is required" }, { status: 400 });
        }

        if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
            return NextResponse.json({ error: "At least one category is required" }, { status: 400 });
        }

        const uniqueCategoryIds = Array.from(new Set(categoryIds));

        if (uniqueCategoryIds.length > 3) {
            return NextResponse.json({ error: "Please select no more than 3 categories" }, { status: 400 });
        }

        // Verify the tool exists and belongs to the user
        const { data: tool, error: fetchError } = await supabase.from("tools").select("id, user_id").eq("id", toolId).single();

        if (fetchError || !tool) {
            return NextResponse.json({ error: "Tool not found" }, { status: 404 });
        }

        if (tool.user_id !== userId) {
            return NextResponse.json({ error: "You do not have permission to update this tool" }, { status: 403 });
        }

        // Empty-only: refuse to change categories on a tool that already has some
        const { data: existingRelations, error: existingError } = await supabase
            .from("tool_categories")
            .select("category_id")
            .eq("tool_id", toolId);

        if (existingError) {
            console.error("Error checking existing tool categories:", existingError);
            return NextResponse.json({ error: "Failed to load current categories. Please try again." }, { status: 500 });
        }

        if (existingRelations && existingRelations.length > 0) {
            return NextResponse.json({ error: "This tool already has categories assigned." }, { status: 409 });
        }

        // Validate that all provided category IDs exist
        const { data: existingCategories, error: categoriesLookupError } = await supabase
            .from("categories")
            .select("id, name")
            .in("id", uniqueCategoryIds);

        if (categoriesLookupError || !existingCategories) {
            console.error("Error validating categories:", categoriesLookupError);
            return NextResponse.json({ error: "Failed to validate categories. Please try again." }, { status: 500 });
        }

        const validCategoryIds = new Set(existingCategories.map((c) => c.id));
        const invalidCount = uniqueCategoryIds.filter((id) => !validCategoryIds.has(id)).length;

        if (invalidCount > 0) {
            return NextResponse.json(
                {
                    error: `${invalidCount} selected ${invalidCount === 1 ? "category is" : "categories are"} invalid. Please try again with valid categories.`,
                },
                { status: 400 },
            );
        }

        // Insert category relationships
        const categoryRelations = uniqueCategoryIds.map((categoryId) => ({
            tool_id: toolId,
            category_id: categoryId,
        }));

        const { error: insertError } = await supabase.from("tool_categories").insert(categoryRelations);

        if (insertError) {
            console.error("Error inserting tool categories:", insertError);
            return NextResponse.json({ error: "Failed to save tool categories. Please try again." }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Categories assigned successfully",
            categories: existingCategories.map((c) => ({ id: c.id, name: c.name })),
        });
    } catch (error) {
        console.error("Error updating tool categories:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
