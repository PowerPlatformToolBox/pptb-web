"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Container } from "@/components/Container";
import { FadeIn } from "@/components/animations";
import { useSupabase } from "@/lib/useSupabase";
import Image from "next/image";

interface Tool {
    id: string;
    name: string;
    description: string;
    iconurl: string;
}

const mockTools: Record<string, Tool> = {
    "1": { id: "1", name: "Solution Manager", description: "Manage your Power Platform solutions with ease.", iconurl: "📦" },
    "2": { id: "2", name: "Environment Tools", description: "Compare environments and manage settings efficiently.", iconurl: "🌍" },
    "3": { id: "3", name: "Code Generator", description: "Generate early-bound classes and TypeScript definitions.", iconurl: "⚡" },
    "4": { id: "4", name: "Plugin Manager", description: "Register and manage plugins with a modern interface.", iconurl: "🔌" },
    "5": { id: "5", name: "Data Import/Export", description: "Import and export data using Excel, CSV, or JSON.", iconurl: "📊" },
    "6": { id: "6", name: "Performance Monitor", description: "Monitor and analyze solution performance.", iconurl: "📈" },
};

export default function RateToolPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const toolId = searchParams?.get("toolId");
    const { supabase } = useSupabase();

    const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { name?: string; avatar_url?: string } } | null>(null);
    const [tool, setTool] = useState<Tool | null>(null);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [authToken, setAuthToken] = useState<string>("");

    useEffect(() => {
        if (!supabase) return;
        (async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();
                if (!session) {
                    router.push("/auth/signin");
                    return;
                }

                if (session.access_token) {
                    setAuthToken(session.access_token);
                    sessionStorage.setItem("supabaseToken", session.access_token);
                }

                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (user) setUser(user);
                if (!toolId) {
                    router.push("/tools");
                    return;
                }

                // Fetch tool using API
                const response = await fetch(`/api/tools/${toolId}`);
                if (response.ok) {
                    const toolData = await response.json();
                    if (toolData) {
                        setTool({
                            id: toolData.id,
                            name: toolData.name,
                            description: toolData.description,
                            iconurl: toolData.iconurl,
                        });
                    } else if (toolId && mockTools[toolId]) {
                        setTool(mockTools[toolId]);
                    } else {
                        router.push("/tools");
                    }
                } else {
                    if (toolId && mockTools[toolId]) setTool(mockTools[toolId]);
                    else router.push("/tools");
                }
            } catch (err) {
                console.error("Error loading data:", err);
                if (toolId && mockTools[toolId]) setTool(mockTools[toolId]);
                else router.push("/tools");
            } finally {
                setLoading(false);
            }
        })();
    }, [router, toolId, supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            setError("Please select a rating");
            return;
        }

        if (!user || !tool || !authToken) {
            setError("Unable to submit rating at this time");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch("/api/ratings/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    toolId: tool.id,
                    rating,
                    comment: comment.trim() || null,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to submit rating");
            }

            setSuccess(true);
            setTimeout(() => {
                router.push(`/tools/${tool.id}`);
            }, 2000);
        } catch (err) {
            console.error("Error submitting rating:", err);
            setError(err instanceof Error ? err.message : "Failed to submit rating");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <main>
                <Container className="mt-16 sm:mt-32">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                        <p className="mt-4 text-slate-600">Loading...</p>
                    </div>
                </Container>
            </main>
        );
    }

    if (!tool) {
        return null;
    }

    return (
        <main>
            <Container className="mt-2 sm:mt-4">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto max-w-2xl">
                        {/* Back button */}
                        <Link href={`/tools/${tool.id}`} className="inline-flex items-center gap-2 text-blue-600 hover:text-purple-600 transition-colors mb-8">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to {tool.name}
                        </Link>

                        {/* Tool Header */}
                        <div className="card p-8 mb-8">
                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-5xl">
                                    <Image src={tool.iconurl} alt={tool.name} width={32} height={32} className="rounded" />
                                </span>
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900">{tool.name}</h1>
                                    <p className="text-slate-600">{tool.description}</p>
                                </div>
                            </div>
                        </div>

                        {/* Rating Form */}
                        {success ? (
                            <div className="card p-8 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-green-100">
                                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Thank you for your rating!</h2>
                                <p className="text-slate-600">Your feedback helps improve the Power Platform community.</p>
                                <p className="text-sm text-slate-500 mt-4">Redirecting...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="card p-8">
                                <h2 className="text-2xl font-semibold text-slate-900 mb-6">Rate this tool</h2>

                                {error && (
                                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-800">{error}</p>
                                    </div>
                                )}

                                {/* Star Rating */}
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-slate-700 mb-3">
                                        Your Rating <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className="transition-transform hover:scale-110 focus:outline-none"
                                            >
                                                <svg className={`h-12 w-12 ${star <= (hoverRating || rating) ? "text-amber-500 fill-current" : "text-slate-300"}`} viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                    {rating > 0 && (
                                        <p className="mt-2 text-sm text-slate-600">
                                            You rated:{" "}
                                            <strong>
                                                {rating} {rating === 1 ? "star" : "stars"}
                                            </strong>
                                        </p>
                                    )}
                                </div>

                                {/* Comment */}
                                <div className="mb-6">
                                    <label htmlFor="comment" className="block text-sm font-medium text-slate-700 mb-2">
                                        Your Review (Optional)
                                    </label>
                                    <textarea
                                        id="comment"
                                        rows={4}
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Share your experience with this tool..."
                                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        maxLength={500}
                                    />
                                    <p className="mt-1 text-xs text-slate-500">{comment.length}/500 characters</p>
                                </div>

                                {/* Submit Button */}
                                <div className="flex gap-4">
                                    <button type="submit" disabled={submitting || rating === 0} className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                                        {submitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                                                Submitting...
                                            </span>
                                        ) : (
                                            "Submit Rating"
                                        )}
                                    </button>
                                    <Link href={`/tools/${tool.id}`} className="btn-secondary">
                                        Cancel
                                    </Link>
                                </div>
                            </form>
                        )}
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
