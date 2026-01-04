"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Container } from "@/components/Container";
import { FadeIn } from "@/components/animations";
import { useSupabase } from "@/lib/useSupabase";

interface Rating {
    id: string;
    toolId: string;
    userId: string;
    userName?: string | null;
    userEmail?: string | null;
    rating: number;
    comment?: string;
    createdAt: string;
}

export default function ToolReviewsPage() {
    const params = useParams();
    const router = useRouter();
    const { supabase } = useSupabase();
    const toolId = params?.id as string;

    const [toolName, setToolName] = useState<string>("");
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [loading, setLoading] = useState(true);
    const [averageRating, setAverageRating] = useState<number>(0);
    const [ratingDistribution, setRatingDistribution] = useState<Record<number, number>>({
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
    });

    useEffect(() => {
        if (!toolId) {
            router.push("/tools");
            return;
        }

        if (!supabase) {
            setLoading(false);
            return;
        }

        (async () => {
            try {
                // Fetch tool name
                const { data: toolData } = await supabase.from("tools").select("name").eq("id", toolId).single();

                if (toolData) {
                    setToolName(toolData.name);
                }

                // Fetch ratings with user info from server-side API
                const response = await fetch(`/api/ratings/${toolId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch ratings");
                }

                const { ratings: enrichedRatings } = await response.json();

                if (enrichedRatings && enrichedRatings.length > 0) {
                    setRatings(enrichedRatings);

                    // Calculate average rating
                    const avg = enrichedRatings.reduce((sum: number, r: Rating) => sum + r.rating, 0) / enrichedRatings.length;
                    setAverageRating(Math.round(avg * 10) / 10);

                    // Calculate rating distribution
                    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                    enrichedRatings.forEach((r: Rating) => {
                        distribution[r.rating as keyof typeof distribution]++;
                    });
                    setRatingDistribution(distribution);
                } else {
                    setRatings([]);
                }
            } catch (err) {
                console.error("Error fetching ratings:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, [toolId, supabase, router]);

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className={`h-4 w-4 ${star <= rating ? "fill-amber-500 text-amber-500" : "text-slate-300"}`} viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <main>
                <Container className="mt-16 sm:mt-32">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                        <p className="mt-4 text-slate-600">Loading reviews...</p>
                    </div>
                </Container>
            </main>
        );
    }

    return (
        <main>
            <Container className="mt-8 sm:mt-16">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto max-w-3xl">
                        {/* Back button */}
                        <Link href={`/tools/${toolId}`} className="inline-flex items-center gap-2 text-blue-600 hover:text-purple-600 transition-colors mb-8">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Tool
                        </Link>

                        {/* Header */}
                        <header className="mb-12">
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-2">Reviews for {toolName}</h1>
                            <p className="text-lg text-slate-600">See what users think about this tool</p>
                        </header>

                        {ratings.length === 0 ? (
                            <div className="card p-12 text-center">
                                <p className="text-slate-600 text-lg mb-4">No reviews yet</p>
                                <p className="text-slate-500 mb-6">Be the first to share your experience with this tool</p>
                                <Link href={`/rate-tool?toolId=${toolId}`} className="inline-block btn-primary">
                                    Write a Review
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Rating Summary */}
                                <div className="card p-8 shadow-lg">
                                    <h2 className="text-2xl font-semibold text-slate-900 mb-6">Rating Summary</h2>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
                                        {/* Overall Rating */}
                                        <div className="text-center">
                                            <div className="text-5xl font-bold text-slate-900 mb-2">{averageRating}</div>
                                            <div className="flex justify-center mb-2">{renderStars(Math.round(averageRating))}</div>
                                            <p className="text-sm text-slate-600">{ratings.length} reviews</p>
                                        </div>

                                        {/* Rating Distribution */}
                                        <div className="sm:col-span-2 space-y-3">
                                            {[5, 4, 3, 2, 1].map((star) => (
                                                <div key={star} className="flex items-center gap-3">
                                                    <span className="w-12 text-sm text-slate-600">{star} star</span>
                                                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                                                        <div
                                                            className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                                                            style={{
                                                                width: `${ratings.length > 0 ? (ratingDistribution[star as keyof typeof ratingDistribution] / ratings.length) * 100 : 0}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="w-12 text-right text-sm text-slate-600">{ratingDistribution[star as keyof typeof ratingDistribution]}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Reviews List */}
                                <div>
                                    <h2 className="text-2xl font-semibold text-slate-900 mb-6">User Reviews</h2>
                                    <div className="space-y-4">
                                        {ratings.map((rating) => (
                                            <FadeIn key={rating.id} direction="up" delay={0.1}>
                                                <div className="card p-6 shadow-md hover:shadow-lg transition-shadow">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div>
                                                            <h3 className="font-semibold text-slate-900">{rating.userName || rating.userEmail || rating.userId}</h3>
                                                            <p className="text-sm text-slate-500">
                                                                {new Date(rating.createdAt).toLocaleDateString("en-US", {
                                                                    year: "numeric",
                                                                    month: "long",
                                                                    day: "numeric",
                                                                })}
                                                            </p>
                                                        </div>
                                                        <div>{renderStars(rating.rating)}</div>
                                                    </div>

                                                    {rating.comment && <p className="text-slate-700 leading-relaxed">{rating.comment}</p>}
                                                </div>
                                            </FadeIn>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
