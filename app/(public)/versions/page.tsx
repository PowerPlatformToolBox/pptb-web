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
        <main className="py-20">
            <Container>
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-4">
                        Download Power Platform ToolBox
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Choose from stable releases for production use or insider builds to get the latest features and improvements.
                    </p>
                </div>
                <VersionsContent />
            </Container>
        </main>
    );
}
