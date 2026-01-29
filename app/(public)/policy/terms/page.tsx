import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
    title: "Terms of Service | Power Platform ToolBox",
    description: "Review the usage guidelines, responsibilities, and legal disclaimers that govern participation in the Power Platform ToolBox community.",
    url: "/policy/terms",
});

export default function TermsOfService() {
    return (
        <div className="max-w-2xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
            <p className="mb-4 text-gray-700">By using Power Platform Tool Box, you agree to the following terms and conditions. Please read them carefully.</p>
            <h2 className="text-xl font-semibold mt-8 mb-2">Use of Service</h2>
            <ul className="list-disc ml-6 text-gray-700 mb-4">
                <li>You must be at least 13 years old to use this service.</li>
                <li>You are responsible for your account and activity.</li>
                <li>Do not misuse the platform or attempt unauthorized access.</li>
            </ul>
            <h2 className="text-xl font-semibold mt-8 mb-2">Intellectual Property</h2>
            <p className="mb-4 text-gray-700">
                All content, trademarks, and data on this site are the property of their respective owners. You may not copy, modify, or distribute content without permission.
            </p>
            <h2 className="text-xl font-semibold mt-8 mb-2">Disclaimer</h2>
            <p className="mb-4 text-gray-700">
                This service is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages or losses resulting from your use of the platform.
            </p>
            <h2 className="text-xl font-semibold mt-8 mb-2">Changes to Terms</h2>
            <p className="mb-4 text-gray-700">We may update these terms at any time. Continued use of the service constitutes acceptance of the new terms.</p>
            <h2 className="text-xl font-semibold mt-8 mb-2">Contact</h2>
            <p className="mb-4 text-gray-700">
                For questions about these terms, contact us on{" "}
                <a href="https://github.com/PowerPlatformToolBox/desktop-app" className="text-blue-600 underline">
                    GitHub
                </a>
                .
            </p>
            <div className="mt-8 text-center">
                <Link href="/policy/privacy" className="text-sm text-blue-600 hover:text-purple-600 transition-colors">
                    View Privacy Policy
                </Link>
            </div>
        </div>
    );
}
