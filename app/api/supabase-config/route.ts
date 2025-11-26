import { NextResponse } from "next/server";

export async function GET() {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        return NextResponse.json({ error: "Supabase environment variables not configured." }, { status: 500 });
    }

    // The anon key is safe to expose. This endpoint intentionally returns it for client initialization.
    return NextResponse.json({ url, anonKey });
}
