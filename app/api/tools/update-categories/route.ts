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
        let body: UpdateCategoriesRequest;
        try {
            body = (await request.json()) as UpdateCategoriesRequest;
        } catch {
            return NextResponse.json({ error: "Invalid request body. Expected JSON." }, { status: 400 });
        }

        const { toolId, categoryIds } = body;

        if (!toolId) {
            return NextResponse.json({ error: "toolId is required" }, { status: 400 });
        }

        if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
            return NextResponse.json({ error: "At least one category is required" }, { status: 400 });
        }

        if (!categoryIds.every((id) => typeof id === "number" && Number.isInteger(id))) {
            return NextResponse.json({ error: "categoryIds must be an array of integer IDs" }, { status: 400 });
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

        const { data: currentRelations, error: currentRelationsError } = await supabase
            .from("tool_categories")
            .select("category_id")
            .eq("tool_id", toolId);

        if (currentRelationsError) {
            console.error("Error fetching current tool categories:", currentRelationsError);
            return NextResponse.json({ error: "Failed to load current categories. Please try again." }, { status: 500 });
        }

        const currentCategoryIds = (currentRelations ?? []).map((relation) => relation.category_id);
        const removedCategoryIds = currentCategoryIds.filter((id) => !uniqueCategoryIds.includes(id));

        if (removedCategoryIds.length > 0) {
            return NextResponse.json(
                {
                    error: "Removing categories is not allowed. Please contact an administrator if you need to remove a category.",
                },
                { status: 400 },
            );
        }

        const categoriesToAdd = uniqueCategoryIds.filter((id) => !currentCategoryIds.includes(id));

        if (categoriesToAdd.length === 0) {
            return NextResponse.json({ error: "No new categories to add." }, { status: 400 });
        }

        const categoryRelations = categoriesToAdd.map((categoryId) => ({
            tool_id: toolId,
            category_id: categoryId,
        }));

        const { error: insertError } = await supabase.from("tool_categories").insert(categoryRelations);

        if (insertError) {
            console.error("Error inserting tool categories:", insertError);
            return NextResponse.json({ error: "Failed to save tool categories. Please try again." }, { status: 500 });
        }

        const finalCategoryIds = [...currentCategoryIds, ...categoriesToAdd];
        const { data: finalCategories, error: finalCategoriesError } = await supabase
            .from("categories")
            .select("id, name")
            .in("id", finalCategoryIds);

        if (finalCategoriesError || !finalCategories) {
            console.error("Error fetching updated tool categories:", finalCategoriesError);
            return NextResponse.json({ error: "Categories were saved but could not be loaded. Please refresh the page." }, { status: 500 });
        }

        const categories = finalCategories.map((category) => ({ id: category.id, name: category.name }));

        return NextResponse.json({
            success: true,
            message: categoriesToAdd.length === uniqueCategoryIds.length ? "Categories assigned successfully" : "Categories added successfully",
            categories,
        });
    } catch (error) {
        console.error("Error updating tool categories:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
