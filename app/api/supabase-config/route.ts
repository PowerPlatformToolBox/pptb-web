import { NextRequest, NextResponse } from "next/server";

const defaultAllowedOrigins = ["http://localhost:3000", "https://powerplatformtoolbox.com", "https://www.powerplatformtoolbox.com"];

function isAllowedOrigin(request: NextRequest) {
    const configured = process.env.SUPABASE_CONFIG_ALLOWED_ORIGINS?.split(",")
        .map((o) => o.trim())
        .filter(Boolean);
    const allowed = configured && configured.length > 0 ? configured : defaultAllowedOrigins;
    const origin = request.headers.get("origin") || request.headers.get("referer");
    if (!origin) return false;
    try {
        const parsed = new URL(origin).origin;
        return allowed.includes(parsed);
    } catch (error) {
        return false;
    }
}

export async function GET(request: NextRequest) {
    if (!isAllowedOrigin(request)) {
        return NextResponse.json({ error: "Unauthorized origin" }, { status: 403 });
    }

    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        return NextResponse.json({ error: "Supabase environment variables not configured." }, { status: 500 });
    }

    return NextResponse.json({ url, anonKey });
}
