/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ toolId: string }> }) {
    try {
        const { toolId } = await params;

        if (!toolId) {
            return NextResponse.json({ error: "Tool ID is required" }, { status: 400 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
        }

        // Create Supabase client with service role key
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Fetch ratings for the tool
        const { data: ratingsData, error: ratingsError } = await supabase
            .from("ratings")
            .select("id, tool_id, user_id, rating, comment, created_at")
            .eq("tool_id", toolId)
            .order("created_at", { ascending: false });

        if (ratingsError) {
            throw ratingsError;
        }

        if (!ratingsData || ratingsData.length === 0) {
            return NextResponse.json({ ratings: [] });
        }

        // Get unique user IDs
        const userIds = Array.from(new Set(ratingsData.map((r: any) => r.user_id))).filter(Boolean) as string[];

        // Fetch user profiles from user_profiles table
        const { data: profilesData, error: profilesError } = await supabase.from("user_profiles").select("id, name, email").in("id", userIds);

        if (profilesError) {
            console.error("Error fetching user profiles:", profilesError);
        }

        // Create user map - use name if available and not empty, otherwise use email
        const userMap = new Map();
        if (profilesData) {
            profilesData.forEach((profile: any) => {
                const displayName = profile.name && profile.name.trim() !== "" ? profile.name : profile.email;
                userMap.set(profile.id, { name: displayName, email: profile.email });
            });
        }

        // Enrich ratings with user info
        const enrichedRatings = ratingsData.map((r: any) => ({
            id: r.id,
            toolId: r.tool_id,
            userId: r.user_id,
            userName: userMap.get(r.user_id)?.name || r.user_id,
            userEmail: userMap.get(r.user_id)?.email || null,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.created_at,
        }));

        return NextResponse.json({ ratings: enrichedRatings });
    } catch (error) {
        console.error("Error in ratings API:", error);
        return NextResponse.json({ error: "Failed to fetch ratings", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
