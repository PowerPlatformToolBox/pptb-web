"use client";

import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Container } from "@/components/Container";
import { FadeIn, SlideIn } from "@/components/animations";
import { useSupabase } from "@/lib/useSupabase";

interface Category {
    id: number;
    name: string;
}

interface ToolIdea {
    id: string;
    title: string;
    description: string;
    upvotes: number;
}

interface ValidationError {
    error: string;
    step?: string;
    details?: {
        errors?: string[];
        warnings?: string[];
    };
}

interface SubmitSuccessResponse {
    success: true;
    message: string;
    data: {
        id: string;
        packageName: string;
        version: string;
        displayName: string;
        status: string;
        warnings: string[];
    };
}

export default function SubmitToolPage() {
    const { supabase } = useSupabase();
    const [packageName, setPackageName] = useState("");
    const [linkedinProfileUrl, setLinkedinProfileUrl] = useState("");
    const [discordHandle, setDiscordHandle] = useState("");
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [toolIdeas, setToolIdeas] = useState<ToolIdea[]>([]);
    const [selectedIdeaId, setSelectedIdeaId] = useState("");
    const [ideaQuery, setIdeaQuery] = useState("");
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingIdeas, setLoadingIdeas] = useState(true);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<ValidationError | null>(null);
    const [success, setSuccess] = useState<SubmitSuccessResponse["data"] | null>(null);
    const selectedIdea = toolIdeas.find((idea) => idea.id === selectedIdeaId);
    const filteredIdeas = toolIdeas.filter((idea) => `${idea.title} ${idea.description}`.toLowerCase().includes(ideaQuery.trim().toLowerCase()));
    const topIdeas = [...toolIdeas].sort((first, second) => second.upvotes - first.upvotes).slice(0, 3);
    const visibleIdeas = ideaQuery.trim() ? filteredIdeas : topIdeas;

    // Fetch categories from API on mount
    useEffect(() => {
        async function fetchCategories() {
            try {
                const response = await fetch("/api/categories");
                if (!response.ok) throw new Error("Failed to fetch categories");
                const data = await response.json();
                setCategories(data || []);
            } catch (err) {
                console.error("Error fetching categories:", err);
            } finally {
                setLoadingCategories(false);
            }
        }

        fetchCategories();
    }, []);

    useEffect(() => {
        if (!supabase) return;

        let active = true;
        async function fetchToolIdeas() {
            const { data, error } = await supabase!.rpc("get_tool_ideas", { p_install_id: "" });
            if (!active) return;
            if (error) {
                console.error("Error fetching tool ideas:", error);
            } else {
                setToolIdeas(data ?? []);
            }
            setLoadingIdeas(false);
        }

        void fetchToolIdeas();
        return () => {
            active = false;
        };
    }, [supabase]);

    useEffect(() => {
        if (!supabase) return;

        async function fetchDeveloperProfile() {
            try {
                const {
                    data: { session },
                } = await supabase!.auth.getSession();
                if (!session?.access_token) return;

                const response = await fetch("/api/submit-tool", {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (!response.ok) throw new Error("Failed to load developer profile");

                const data = (await response.json()) as { linkedinProfileUrl?: string; discordHandle?: string };
                setLinkedinProfileUrl(data.linkedinProfileUrl || "");
                setDiscordHandle(data.discordHandle || "");
            } catch (err) {
                console.error("Error loading developer profile:", err);
            } finally {
                setLoadingProfile(false);
            }
        }

        fetchDeveloperProfile();
    }, [supabase]);

    const handleCategoryToggle = (categoryId: number) => {
        setSelectedCategories((prev) => {
            if (prev.includes(categoryId)) {
                // Remove if already selected
                return prev.filter((id) => id !== categoryId);
            } else if (prev.length < 3) {
                // Add only if less than 3 selected
                return [...prev, categoryId];
            }
            // Don't add if already at limit
            return prev;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!packageName.trim()) {
            setError({ error: "Please enter a package name" });
            return;
        }

        if (!linkedinProfileUrl.trim()) {
            setError({ error: "Please enter your LinkedIn profile URL" });
            return;
        }

        if (selectedCategories.length === 0) {
            setError({ error: "Please select at least one category" });
            return;
        }

        if (selectedCategories.length > 3) {
            setError({ error: "Please select no more than 3 categories" });
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Get auth token if user is logged in
            let authToken: string | undefined;
            if (supabase) {
                const {
                    data: { session },
                } = await supabase.auth.getSession();
                authToken = session?.access_token;
            }

            const response = await fetch("/api/submit-tool", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify({
                    packageName: packageName.trim(),
                    categoryIds: selectedCategories,
                    toolIdeaId: selectedIdeaId || null,
                    linkedinProfileUrl: linkedinProfileUrl.trim(),
                    discordHandle: discordHandle.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data as ValidationError);
                return;
            }

            setSuccess((data as SubmitSuccessResponse).data);
            setPackageName("");
            setSelectedCategories([]);
            setSelectedIdeaId("");
        } catch (err) {
            console.error("Error submitting tool:", err);
            setError({
                error: "An unexpected error occurred. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <main>
            <Container className="mt-8 sm:mt-16 pb-16">
                <FadeIn direction="up" delay={0.2}>
                    <div className="mx-auto max-w-2xl">
                        {/* Back button */}
                        <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-purple-600 transition-colors mb-8">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </Link>

                        {/* Page Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Submit a New Tool</h1>
                            <p className="mt-4 text-lg text-slate-600">
                                Submit your npm package to be added to the Power Platform ToolBox. We&apos;ll validate your package and review it for inclusion.
                            </p>
                        </div>

                        {/* Info Box */}
                        <SlideIn direction="up" delay={0.3}>
                            <div className="card p-6 mb-8 bg-blue-50 border border-blue-200">
                                <h2 className="font-semibold text-blue-900 mb-2">Validate Your Tool</h2>
                                <p className="text-sm text-blue-800">
                                    Check the{" "}
                                    <a
                                        href="https://docs.powerplatformtoolbox.com/tool-development/validation#what-is-validated"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-blue-700 underline hover:text-blue-900"
                                    >
                                        validation requirements
                                    </a>{" "}
                                    for details on what is checked. Please run the{" "}
                                    <a
                                        href="https://docs.powerplatformtoolbox.com/tool-development/validation"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-blue-700 underline hover:text-blue-900"
                                    >
                                        local validation
                                    </a>{" "}
                                    before submitting your package.
                                </p>
                            </div>
                        </SlideIn>

                        {/* Submission Form */}
                        <SlideIn direction="up" delay={0.4}>
                            <form onSubmit={handleSubmit} className="card p-8">
                                <h2 className="text-xl font-semibold text-slate-900 mb-6">Submit Your Package</h2>

                                <div className="mb-6">
                                    <label htmlFor="packageName" className="block text-sm font-medium text-slate-700 mb-2">
                                        npm Package Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="packageName"
                                        type="text"
                                        value={packageName}
                                        onChange={(e) => setPackageName(e.target.value)}
                                        placeholder="e.g., pptb-my-tool or @myorg/pptb-tool"
                                        disabled={loading}
                                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-slate-50 disabled:cursor-not-allowed"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">Enter the exact npm package name as published on npmjs.com</p>
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="linkedinProfileUrl" className="block text-sm font-medium text-slate-700 mb-2">
                                        LinkedIn Profile <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="linkedinProfileUrl"
                                        type="url"
                                        value={linkedinProfileUrl}
                                        onChange={(e) => setLinkedinProfileUrl(e.target.value)}
                                        placeholder="https://www.linkedin.com/in/your-profile"
                                        required
                                        disabled={loading || loadingProfile}
                                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-slate-50 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="discordHandle" className="block text-sm font-medium text-slate-700 mb-2">
                                        Discord Handle <span className="font-normal text-slate-500">(optional, recommended)</span>
                                    </label>
                                    <input
                                        id="discordHandle"
                                        type="text"
                                        value={discordHandle}
                                        onChange={(e) => setDiscordHandle(e.target.value)}
                                        placeholder="your Discord username"
                                        maxLength={100}
                                        disabled={loading || loadingProfile}
                                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-slate-50 disabled:cursor-not-allowed"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">
                                        We recommend joining the{" "}
                                        <a href="https://discord.gg/efwAu9sXyJ" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-700 underline">
                                            PPTB community on Discord
                                        </a>{" "}
                                        to connect with other developers and get support.
                                    </p>
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="toolIdeaId" className="block text-sm font-medium text-slate-700 mb-2">
                                        Related community idea <span className="font-normal text-slate-500">(optional)</span>
                                    </label>
                                    <Combobox
                                        value={selectedIdeaId || null}
                                        onChange={(ideaId: string | null) => {
                                            setSelectedIdeaId(ideaId ?? "");
                                            setIdeaQuery("");
                                        }}
                                        disabled={loading || loadingIdeas || toolIdeas.length === 0}
                                    >
                                        <div className="relative">
                                            <ComboboxInput
                                                id="toolIdeaId"
                                                displayValue={(ideaId: string | null) => toolIdeas.find((idea) => idea.id === ideaId)?.title ?? ""}
                                                onChange={(event) => {
                                                    setIdeaQuery(event.target.value);
                                                    if (selectedIdeaId) setSelectedIdeaId("");
                                                }}
                                                placeholder={supabase && loadingIdeas ? "Loading ideas..." : toolIdeas.length === 0 ? "No ideas available" : "Search ideas..."}
                                                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:bg-slate-50 disabled:cursor-not-allowed"
                                            />
                                            {selectedIdeaId && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedIdeaId("");
                                                        setIdeaQuery("");
                                                    }}
                                                    aria-label="Clear selected idea"
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                                >
                                                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                                                </button>
                                            )}
                                            <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg focus:outline-none">
                                                {visibleIdeas.length === 0 ? (
                                                    <div className="px-4 py-3 text-sm text-slate-500">No matching ideas</div>
                                                ) : (
                                                    visibleIdeas.map((idea) => (
                                                        <ComboboxOption key={idea.id} value={idea.id} className={({ focus }) => `cursor-pointer px-4 py-2 ${focus ? "bg-blue-50" : ""}`}>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="font-medium text-slate-900">{idea.title}</span>
                                                                <span className="shrink-0 text-xs text-slate-500">{idea.upvotes} votes</span>
                                                            </div>
                                                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">{idea.description}</p>
                                                        </ComboboxOption>
                                                    ))
                                                )}
                                            </ComboboxOptions>
                                        </div>
                                    </Combobox>
                                    {selectedIdea?.description && <p className="mt-2 text-xs text-slate-500">{selectedIdea.description}</p>}
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Categories <span className="text-red-500">*</span>
                                    </label>
                                    {loadingCategories ? (
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-slate-400 border-r-transparent"></div>
                                            Loading categories...
                                        </div>
                                    ) : categories.length === 0 ? (
                                        <p className="text-sm text-red-600">No categories available. Please contact an administrator.</p>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {categories.map((category) => (
                                                    <label
                                                        key={category.id}
                                                        className={`
                                                            flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all
                                                            ${
                                                                selectedCategories.includes(category.id)
                                                                    ? "bg-blue-50 border-blue-500 text-blue-900"
                                                                    : "bg-white border-slate-300 text-slate-700 hover:border-blue-300"
                                                            }
                                                            ${loading || (selectedCategories.length >= 3 && !selectedCategories.includes(category.id)) ? "opacity-50 cursor-not-allowed" : ""}
                                                        `}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCategories.includes(category.id)}
                                                            onChange={() => handleCategoryToggle(category.id)}
                                                            disabled={loading || (selectedCategories.length >= 3 && !selectedCategories.includes(category.id))}
                                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm font-medium">{category.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <p className="mt-2 text-xs text-slate-500">Select up to 3 categories that best describe your tool ({selectedCategories.length}/3 selected)</p>
                                        </>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        type="submit"
                                        disabled={loading || loadingProfile || !packageName.trim() || !linkedinProfileUrl.trim() || selectedCategories.length === 0 || loadingCategories}
                                        className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                                                Validating...
                                            </span>
                                        ) : (
                                            "Submit Tool"
                                        )}
                                    </button>
                                    <Link href="/dashboard" className="btn-secondary">
                                        Cancel
                                    </Link>
                                </div>
                            </form>
                        </SlideIn>

                        {/* Success Message */}
                        {success && (
                            <SlideIn direction="up" delay={0.1}>
                                <div className="card p-6 mb-8 bg-green-50 border border-green-200">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0">
                                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-green-900">Tool Submitted Successfully!</h3>
                                            <p className="text-sm text-green-800 mt-1">
                                                Your tool <strong>{success.displayName}</strong> (v{success.version}) has been submitted for review.
                                            </p>
                                            <p className="text-sm text-green-700 mt-2">
                                                Status: <span className="font-medium capitalize">{success.status.replace(/_/g, " ")}</span>
                                            </p>
                                            {success.warnings.length > 0 && (
                                                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                                    <p className="text-sm font-medium text-yellow-800">Warnings:</p>
                                                    <ul className="text-sm text-yellow-700 list-disc list-inside mt-1">
                                                        {success.warnings.map((warning, index) => (
                                                            <li key={index}>{warning}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </SlideIn>
                        )}

                        {/* Error Message */}
                        {error && (
                            <SlideIn direction="up" delay={0.1}>
                                <div className="card p-6 mb-8 bg-red-50 border border-red-200">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0">
                                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-red-900">Submission Failed</h3>
                                            <p className="text-sm text-red-800 mt-1">{error.error}</p>
                                            {error.step && (
                                                <p className="text-xs text-red-600 mt-1">
                                                    Failed at: <span className="font-mono">{error.step}</span>
                                                </p>
                                            )}
                                            {error.details?.errors && error.details.errors.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-sm font-medium text-red-800">Validation Errors:</p>
                                                    <ul className="text-sm text-red-700 list-disc list-inside mt-1">
                                                        {error.details.errors.map((err, index) => (
                                                            <li key={index}>{err}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {error.details?.warnings && error.details.warnings.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-sm font-medium text-yellow-800">Warnings:</p>
                                                    <ul className="text-sm text-yellow-700 list-disc list-inside mt-1">
                                                        {error.details.warnings.map((warning, index) => (
                                                            <li key={index}>{warning}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </SlideIn>
                        )}

                        {/* Manifest Documentation */}
                        <SlideIn direction="up" delay={0.5}>
                            <div className="mt-8 card p-6">
                                <h2 className="text-lg font-semibold text-slate-900">Tool manifest</h2>
                                <p className="mt-2 text-sm text-slate-600">
                                    See the latest package structure and requirements in the{" "}
                                    <a
                                        href="https://docs.powerplatformtoolbox.com/tool-development/manifest"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-blue-600 underline hover:text-blue-700"
                                    >
                                        tool manifest documentation
                                    </a>
                                    .
                                </p>
                            </div>
                        </SlideIn>
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
