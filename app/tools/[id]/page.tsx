"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Container } from "@/components/Container";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { FadeIn } from "@/components/animations";
import { supabase } from "@/lib/supabase";

interface Tool {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    downloads: number;
    rating: number;
    aum?: number; // Active User Months
    longDescription?: string;
    features?: string[];
    author?: string;
    version?: string;
    lastUpdated?: string;
}

// Mock data for a tool (will be replaced with Supabase data)
const mockTools: Record<string, Tool> = {
    "1": {
        id: "1",
        name: "Solution Manager",
        description: "Manage your Power Platform solutions with ease. Export, import, and version control your solutions.",
        longDescription: "Solution Manager is a comprehensive tool for managing your Power Platform solutions. It provides an intuitive interface for exporting, importing, and tracking versions of your solutions. With advanced features like dependency analysis, solution comparison, and bulk operations, you can streamline your solution lifecycle management.",
        icon: "📦",
        category: "Solutions",
        downloads: 1250,
        rating: 4.8,
        aum: 850,
        author: "PPTB Team",
        version: "2.1.0",
        lastUpdated: "2024-01-15",
        features: [
            "Export and import solutions",
            "Version control integration",
            "Dependency analysis",
            "Solution comparison",
            "Bulk operations",
            "Automated backups"
        ]
    },
    "2": {
        id: "2",
        name: "Environment Tools",
        description: "Compare environments, copy configurations, and manage environment settings efficiently.",
        longDescription: "Environment Tools helps you manage multiple Power Platform environments with ease. Compare configurations, copy settings between environments, and ensure consistency across your development, test, and production environments.",
        icon: "🌍",
        category: "Environments",
        downloads: 980,
        rating: 4.6,
        aum: 620,
        author: "PPTB Team",
        version: "1.8.5",
        lastUpdated: "2024-01-10",
        features: [
            "Environment comparison",
            "Configuration copying",
            "Settings management",
            "Multi-environment support",
            "Change tracking"
        ]
    },
    "3": {
        id: "3",
        name: "Code Generator",
        description: "Generate early-bound classes, TypeScript definitions, and more from your Dataverse metadata.",
        longDescription: "Code Generator automates the creation of strongly-typed code from your Dataverse metadata. Generate early-bound classes for .NET, TypeScript definitions for web resources, and more to improve your development productivity and code quality.",
        icon: "⚡",
        category: "Development",
        downloads: 2100,
        rating: 4.9,
        aum: 1450,
        author: "PPTB Team",
        version: "3.0.2",
        lastUpdated: "2024-01-18",
        features: [
            "Early-bound class generation",
            "TypeScript definitions",
            "Action/Function proxies",
            "Custom templates",
            "Incremental updates",
            "Multiple language support"
        ]
    },
    "4": {
        id: "4",
        name: "Plugin Manager",
        description: "Register, update, and manage your plugins and custom workflow activities with a modern interface.",
        longDescription: "Plugin Manager provides a modern interface for managing your Dataverse plugins and custom workflow activities. Register new plugins, update existing ones, and manage plugin steps with an intuitive visual interface.",
        icon: "🔌",
        category: "Development",
        downloads: 1450,
        rating: 4.7,
        aum: 920,
        author: "PPTB Team",
        version: "2.5.1",
        lastUpdated: "2024-01-12",
        features: [
            "Plugin registration",
            "Step management",
            "Assembly upload",
            "Profiling integration",
            "Bulk updates",
            "Plugin testing"
        ]
    },
    "5": {
        id: "5",
        name: "Data Import/Export",
        description: "Import and export data using Excel, CSV, or JSON. Support for bulk operations and data transformation.",
        longDescription: "Data Import/Export tool makes it easy to move data in and out of your Dataverse environment. Support for multiple formats including Excel, CSV, and JSON, with advanced features like data transformation, validation, and bulk operations.",
        icon: "📊",
        category: "Data",
        downloads: 1800,
        rating: 4.5,
        aum: 1100,
        author: "PPTB Team",
        version: "2.3.0",
        lastUpdated: "2024-01-14",
        features: [
            "Multiple format support",
            "Data transformation",
            "Validation rules",
            "Bulk operations",
            "Scheduled imports",
            "Error handling"
        ]
    },
    "6": {
        id: "6",
        name: "Performance Monitor",
        description: "Monitor and analyze the performance of your Power Platform solutions. Identify bottlenecks and optimize.",
        longDescription: "Performance Monitor helps you track and analyze the performance of your Power Platform solutions. Identify bottlenecks, monitor resource usage, and get actionable insights to optimize your applications.",
        icon: "📈",
        category: "Monitoring",
        downloads: 750,
        rating: 4.4,
        aum: 480,
        author: "PPTB Team",
        version: "1.5.3",
        lastUpdated: "2024-01-08",
        features: [
            "Real-time monitoring",
            "Performance metrics",
            "Bottleneck detection",
            "Resource usage tracking",
            "Historical analysis",
            "Optimization recommendations"
        ]
    }
};

export default function ToolDetailPage() {
    const params = useParams();
    const router = useRouter();
    const toolId = params?.id as string;
    
    const [tool, setTool] = useState<Tool | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTool() {
            if (!supabase) {
                // If Supabase is not configured, use mock data
                const mockTool = mockTools[toolId];
                if (mockTool) {
                    setTool(mockTool);
                } else {
                    router.push('/tools');
                }
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('tools')
                    .select('*')
                    .eq('id', toolId)
                    .single();

                if (error) throw error;
                if (data) {
                    setTool(data);
                } else {
                    router.push('/tools');
                }
            } catch (error) {
                console.error('Error fetching tool:', error);
                // Fallback to mock data
                const mockTool = mockTools[toolId];
                if (mockTool) {
                    setTool(mockTool);
                } else {
                    router.push('/tools');
                }
            } finally {
                setLoading(false);
            }
        }

        fetchTool();
    }, [toolId, router]);

    if (loading) {
        return (
            <>
                <Header />
                <main>
                    <Container className="mt-16 sm:mt-32">
                        <div className="text-center">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                            <p className="mt-4 text-slate-600">Loading tool details...</p>
                        </div>
                    </Container>
                </main>
                <Footer />
            </>
        );
    }

    if (!tool) {
        return null;
    }

    return (
        <>
            <Header />
            <main>
                <Container className="mt-16 sm:mt-32">
                    <FadeIn direction="up" delay={0.2}>
                        <div className="mx-auto max-w-2xl lg:max-w-5xl">
                            {/* Back button */}
                            <Link 
                                href="/tools"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-purple-600 transition-colors mb-8"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Tools
                            </Link>

                            {/* Tool Header */}
                            <header className="flex items-start gap-6 mb-12">
                                <div className="text-7xl">{tool.icon}</div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                                            {tool.name}
                                        </h1>
                                        <span className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-full">
                                            {tool.category}
                                        </span>
                                    </div>
                                    <p className="text-lg text-slate-600 mb-4">{tool.description}</p>
                                    <div className="flex flex-wrap gap-6 text-sm">
                                        <div className="flex items-center gap-2">
                                            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            <span className="text-slate-700"><strong>{tool.downloads.toLocaleString()}</strong> downloads</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <svg className="h-5 w-5 text-amber-500 fill-current" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            <span className="text-slate-700"><strong>{tool.rating.toFixed(1)}</strong> rating</span>
                                        </div>
                                        {tool.aum && (
                                            <div className="flex items-center gap-2">
                                                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                <span className="text-slate-700"><strong>{tool.aum.toLocaleString()}</strong> AUM</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </header>

                            {/* Tool Details Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                                {/* Main Content */}
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="card p-8">
                                        <h2 className="text-2xl font-semibold text-slate-900 mb-4">About</h2>
                                        <p className="text-slate-700 leading-relaxed">
                                            {tool.longDescription || tool.description}
                                        </p>
                                    </div>

                                    {tool.features && tool.features.length > 0 && (
                                        <div className="card p-8">
                                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Features</h2>
                                            <ul className="space-y-3">
                                                {tool.features.map((feature, index) => (
                                                    <li key={index} className="flex items-start gap-3">
                                                        <svg className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className="text-slate-700">{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Sidebar */}
                                <div className="space-y-6">
                                    <div className="card p-6">
                                        <h3 className="font-semibold text-slate-900 mb-4">Tool Information</h3>
                                        <dl className="space-y-3 text-sm">
                                            {tool.version && (
                                                <>
                                                    <dt className="text-slate-500">Version</dt>
                                                    <dd className="text-slate-900 font-medium">{tool.version}</dd>
                                                </>
                                            )}
                                            {tool.author && (
                                                <>
                                                    <dt className="text-slate-500">Author</dt>
                                                    <dd className="text-slate-900 font-medium">{tool.author}</dd>
                                                </>
                                            )}
                                            {tool.lastUpdated && (
                                                <>
                                                    <dt className="text-slate-500">Last Updated</dt>
                                                    <dd className="text-slate-900 font-medium">
                                                        {new Date(tool.lastUpdated).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </dd>
                                                </>
                                            )}
                                        </dl>
                                    </div>

                                    <div className="card p-6 text-center">
                                        <h3 className="font-semibold text-slate-900 mb-4">Rate this tool</h3>
                                        <p className="text-sm text-slate-600 mb-4">
                                            Share your experience with the community
                                        </p>
                                        <Link 
                                            href={`/rate-tool?toolId=${tool.id}`}
                                            className="btn-primary w-full inline-block"
                                        >
                                            Leave a Rating
                                        </Link>
                                    </div>

                                    <div className="card p-6 text-center bg-gradient-to-br from-blue-50 to-purple-50">
                                        <h3 className="font-semibold text-slate-900 mb-2">Download PPTB</h3>
                                        <p className="text-sm text-slate-600 mb-4">
                                            Get the desktop app to use this tool
                                        </p>
                                        <Link 
                                            href="/"
                                            className="btn-outline w-full inline-block"
                                        >
                                            Download Now
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </Container>
            </main>
            <Footer />
        </>
    );
}
