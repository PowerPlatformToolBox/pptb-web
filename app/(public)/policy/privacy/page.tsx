import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
    title: "Privacy Policy | Power Platform ToolBox",
    description: "Understand how Power Platform ToolBox respects your data, handles authentication details, and collaborates with trusted partners to run the platform.",
    url: "/policy/privacy",
});

export default function PrivacyPolicy() {
    return (
        <div className="max-w-2xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <p className="mb-4 text-gray-700">
                Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use Power Platform Tool Box on the web or in the desktop app.
            </p>
            <h2 className="text-xl font-semibold mt-8 mb-2">Information We Collect</h2>
            <ul className="list-disc ml-6 text-gray-700 mb-4">
                <li>Web account and authentication information when you sign in, such as your email address and OAuth provider.</li>
                <li>Content you submit through the web experience, including tool intake requests, ratings, feedback, and related metadata.</li>
                <li>Technical and usage data such as browser information, device details, IP address, and analytics related to your use of the platform.</li>
                <li>
                    Desktop app telemetry collected only when an error or warning occurs, including an anonymous install ID, installed version, operating system, CPU architecture, and error details.
                </li>
            </ul>
            <h2 className="text-xl font-semibold mt-8 mb-2">How We Use Your Information</h2>
            <ul className="list-disc ml-6 text-gray-700 mb-4">
                <li>To provide, operate, and improve our web services and desktop app experience</li>
                <li>To process tool submissions, ratings, and feedback and to communicate with you about updates or issues</li>
                <li>To diagnose errors, improve stability, and help prevent abuse or security issues</li>
            </ul>
            <h2 className="text-xl font-semibold mt-8 mb-2">Data Sharing</h2>
            <p className="mb-4 text-gray-700">
                We do not sell your personal information. We may share data with trusted service providers such as Supabase, analytics providers, and error-reporting services only as needed to operate
                the platform and support the desktop app experience.
            </p>
            <h2 className="text-xl font-semibold mt-8 mb-2">Your Rights</h2>
            <ul className="list-disc ml-6 text-gray-700 mb-4">
                <li>You can request deletion of your account, submissions, ratings, and related data at any time.</li>
                <li>You may contact us for any privacy-related questions or concerns.</li>
            </ul>
            <h2 className="text-xl font-semibold mt-8 mb-2">Contact</h2>
            <p className="mb-4 text-gray-700">
                For privacy concerns, contact us on{" "}
                <a href="https://discord.gg/efwAu9sXyJ" className="text-blue-600 underline">
                    Discord
                </a>
                .
            </p>
            <div className="mt-8 text-center">
                <Link href="/policy/terms" className="text-sm text-blue-600 hover:text-purple-600 transition-colors">
                    View Terms of Service
                </Link>
            </div>
        </div>
    );
}
