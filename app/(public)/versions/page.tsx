import type { Metadata } from "next";

import { Container } from "@/components/Container";
import { VersionsContent } from "@/components/VersionsContent";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
    title: "Download Versions | Power Platform ToolBox",
    description: "Download the latest stable or insider releases of Power Platform ToolBox for Windows, macOS, and Linux.",
    url: "/versions",
});

export default function VersionsPage() {
    return (
        <main className="min-h-screen bg-slate-50 pb-16">
            <Container className="py-8 sm:py-12">
                <div className="mb-8 border-b border-slate-200 pb-6">
                    <p className="text-sm font-semibold text-blue-700">Power Platform ToolBox</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Download versions
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-600">
                        Choose from stable releases for production use or insider builds to get the latest features and improvements.
                    </p>
                </div>
                <VersionsContent />
            </Container>
        </main>
    );
}
