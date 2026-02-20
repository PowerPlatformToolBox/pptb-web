"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Container } from "@/components/Container";
import { FadeIn, SlideIn } from "@/components/animations";
import { useSupabase } from "@/lib/useSupabase";

interface Category {
    id: number;
    name: string;
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
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<ValidationError | null>(null);
    const [success, setSuccess] = useState<SubmitSuccessResponse["data"] | null>(null);

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
                                Submit your npm package to be added to the Power Platform Tool Box. We&apos;ll validate your package and review it for inclusion.
                            </p>
                        </div>

                        {/* Info Box */}
                        <SlideIn direction="up" delay={0.3}>
                            <div className="card p-6 mb-8 bg-blue-50 border border-blue-200">
                                <h2 className="font-semibold text-blue-900 mb-2">Package Requirements</h2>
                                <p className="text-sm text-blue-800 mb-3">
                                    Your npm package must include the following fields in its <code className="bg-blue-100 px-1 rounded">package.json</code>:
                                </p>
                                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                    <li>
                                        <strong>displayName</strong> - Human-readable name for your tool (required)
                                    </li>
                                    <li>
                                        <strong>description</strong> - A brief description of what your tool does (required)
                                    </li>
                                    <li>
                                        <strong>contributors</strong> - Array of contributor objects with name and optional URL (required, at least one)
                                    </li>
                                    <li>
                                        <strong>license</strong> - Must be an approved open-source license: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, GPL-2.0, GPL-3.0, LGPL-3.0, ISC, or
                                        AGPL-3.0-only (required)
                                    </li>
                                    {/* // TODO: Reenable when svg is ready
                                    <li>
                                        <strong>icon</strong> - Relative path to bundled SVG icon under <code className="bg-blue-100 px-1 rounded">dist</code> (e.g., &quot;icon.svg&quot; or
                                        &quot;icons/icon.svg&quot;). HTTP(S) URLs are not supported (required)
                                    </li> */}
                                    <li>
                                        <strong>configurations.repository</strong> - GitHub repository URL (required)
                                    </li>
                                    <li>
                                        <strong>configurations.readmeUrl</strong> - README URL, must be hosted on <code className="bg-blue-100 px-1 rounded">raw.githubusercontent.com</code> (required)
                                    </li>
                                    <li>
                                        <strong>configurations.website</strong> - Project website URL (optional)
                                    </li>
                                    <li>
                                        <strong>cspExceptions</strong> - Content Security Policy exceptions if your tool needs to access external resources (optional)
                                    </li>
                                    <li>
                                        <strong>features.multiConnection</strong> - Set to &quot;required&quot; or &quot;optional&quot; if your tool supports multiple connections (optional)
                                    </li>
                                </ul>
                                <p className="text-sm text-blue-800 mt-3">
                                    <strong>Note:</strong> You&apos;ll select categories from the dropdown below instead of including them in package.json.
                                </p>
                            </div>
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
                                        disabled={loading || !packageName.trim() || selectedCategories.length === 0 || loadingCategories}
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

                        {/* Example Package.json */}
                        <SlideIn direction="up" delay={0.5}>
                            <div className="mt-8 card p-6">
                                <h2 className="text-lg font-semibold text-slate-900 mb-4">Example package.json</h2>
                                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                                    {`{
  "name": "pptb-sample-tool",
  "version": "1.0.0",
  "displayName": "Sample Power Platform Tool",
  "description": "A sample tool for Power Platform",
  "icon": "icon.svg",
  "contributors": [
    {
      "name": "Your Name",
      "url": "https://github.com/yourusername"
    }
  ],
  "license": "MIT",
  "cspExceptions": {
    "connect-src": ["https://*.dynamics.com"],
    "script-src": ["https://cdn.example.com"]
  },
  "features": {
       "multiConnection": "required"/"optional"
  },
  "configurations": {
    "repository": "https://github.com/yourorg/your-tool",
    "website": "https://your-tool.example.com",
    "readmeUrl": "https://raw.githubusercontent.com/yourorg/your-tool/main/README.md"
  }
}`}
                                </pre>
                            </div>
                        </SlideIn>
                    </div>
                </FadeIn>
            </Container>
        </main>
    );
}
