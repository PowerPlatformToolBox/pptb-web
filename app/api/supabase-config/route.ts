import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    // Verify request origin
    const referer = request.headers.get("referer");
    const origin = referer ? new URL(referer).origin + "/" : null;
    const allowedOrigins = ["http://localhost:3000/", "https://powerplatformtoolbox.com/"];

    if (!allowedOrigins.includes(origin || "")) {
        return NextResponse.json({ error: "Unauthorized origin" }, { status: 403 });
    }

    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        return NextResponse.json({ error: "Supabase environment variables not configured." }, { status: 500 });
    }

    return NextResponse.json({ url, anonKey });
}
