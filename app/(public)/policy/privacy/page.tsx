import Link from "next/link";

export default function PrivacyPolicy() {
    return (
        <div className="max-w-2xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <p className="mb-4 text-gray-700">Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use Power Platform Tool Box.</p>
            <h2 className="text-xl font-semibold mt-8 mb-2">Information We Collect</h2>
            <ul className="list-disc ml-6 text-gray-700 mb-4">
                <li>Account and authentication information (email, OAuth provider)</li>
                <li>Usage analytics (tool ratings, downloads, feedback)</li>
                <li>Technical data (browser, device, IP address)</li>
            </ul>
            <h2 className="text-xl font-semibold mt-8 mb-2">How We Use Your Information</h2>
            <ul className="list-disc ml-6 text-gray-700 mb-4">
                <li>To provide and improve our services</li>
                <li>To personalize your experience</li>
                <li>To communicate with you about updates or issues</li>
                <li>To ensure security and prevent abuse</li>
            </ul>
            <h2 className="text-xl font-semibold mt-8 mb-2">Data Sharing</h2>
            <p className="mb-4 text-gray-700">
                We do not sell your personal information. We may share data with trusted service providers (such as Supabase, Vercel, or analytics providers) only as needed to operate the platform.
            </p>
            <h2 className="text-xl font-semibold mt-8 mb-2">Your Rights</h2>
            <ul className="list-disc ml-6 text-gray-700 mb-4">
                <li>You can request deletion of your account and data at any time.</li>
                <li>You may contact us for any privacy-related questions.</li>
            </ul>
            <h2 className="text-xl font-semibold mt-8 mb-2">Contact</h2>
            <p className="mb-4 text-gray-700">
                For privacy concerns, contact us on{" "}
                <a href="https://github.com/PowerPlatformToolBox/desktop-app" className="text-blue-600 underline">
                    GitHub
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
