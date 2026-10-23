import { extractPackageIcon, isValidPackageName } from "@/lib/package-icon";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = createClient(url, key);
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(authHeader.slice(7));
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const packageName = request.nextUrl.searchParams.get("packageName") || "";
    const version = request.nextUrl.searchParams.get("version") || undefined;
    if (!isValidPackageName(packageName) || (version && !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version))) {
        return NextResponse.json({ error: "A valid npm package name and exact version are required" }, { status: 400 });
    }
    try {
        const icon = await extractPackageIcon(packageName, version);
        return NextResponse.json(icon, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        console.error("[package-icon] Failed to extract package icon:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to extract package icon" }, { status: 502 });
    }
}
