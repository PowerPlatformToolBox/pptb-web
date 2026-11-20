import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
    title: "Marketplace Policy | Power Platform ToolBox",
    description: "Learn how Power Platform ToolBox Marketplace tools are maintained, deprecated, and retired.",
    url: "/policy/marketplace",
});

export default function MarketplacePolicy() {
    return (
        <div className="max-w-2xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold mb-6">Marketplace Policy</h1>
            <p className="mb-4 text-gray-700">
                This policy describes the lifecycle of tools published in the Power Platform ToolBox Marketplace. Tool lifecycle status describes the availability and support of a
                tool package; it does not describe the maturity or compatibility of PPTB APIs.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-2">Tool lifecycle states</h2>
            <ul className="list-disc ml-6 text-gray-700 mb-4">
                <li>
                    <strong>Active:</strong> The publisher supports the tool and it is available for normal Marketplace discovery and installation.
                </li>
                <li>
                    <strong>Deprecated:</strong> The publisher no longer recommends the tool for new use. The tool may remain available for compatibility where the Marketplace
                    permits it, but users should plan to move to a replacement or stop using it. Its listing must communicate the deprecation reason, effective date, whether new
                    installations are available, and a replacement link or retirement date when provided.
                </li>
                <li>
                    <strong>Retired:</strong> The tool is no longer supported or available for new installation and is removed from normal Marketplace discovery. A historical
                    listing may be retained to help existing users identify the tool and its replacement.
                </li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-2">Publisher requests and responsibilities</h2>
            <p className="mb-4 text-gray-700">
                To request a tool status change, reach out in the{" "}
                <a href="https://discord.gg/efwAu9sXyJ" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    PPTB Discord server
                </a>
                {" "}and tag the @TeamMember role. Include the tool name and ID, requested status, reason, effective date, expected retirement date if known, replacement tool or
                migration guidance if available, compatibility and update impact, and how existing users will be notified.
            </p>
            <p className="mb-4 text-gray-700">
                Publishers are responsible for accurate lifecycle information and for notifying their users through their normal release notes or support channels. Give reasonable
                advance notice of planned retirement; where practical, provide at least 30 days. If urgent security, legal, safety, or compatibility concerns require faster action,
                explain the urgency and effective date in the request.
            </p>
            <p className="mb-4 text-gray-700">
                The Marketplace team reviews requests, may ask for clarification, and manages the listing status and discovery visibility. The team may deprecate or retire a tool
                without a publisher request when necessary to protect users or the service, and may delist a tool immediately for urgent security, legal, or policy reasons.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-2">What users should expect</h2>
            <p className="mb-4 text-gray-700">
                Deprecation does not itself uninstall a tool or guarantee that it will stop running for users who already installed it. However, continued operation, compatibility,
                support, and future updates are not guaranteed. Users should review the publisher&apos;s migration guidance, move to a recommended replacement when available, and
                uninstall the tool when it is no longer needed.
            </p>
            <p className="mb-4 text-gray-700">
                Retirement prevents new installations and removes the tool from normal discovery. Existing copies may continue to run locally, but users should not expect further
                support or updates. Marketplace status changes do not guarantee an individual notification; users should check the listing and publisher announcements.
            </p>
            <p className="mb-4 text-gray-700">
                Lifecycle requests are handled manually while Marketplace lifecycle metadata and dedicated user notifications are being developed. Until then, publishers should not
                assume that every listing can display all lifecycle details or that users will be notified automatically.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-2">Tool lifecycle vs. API maturity</h2>
            <p className="mb-4 text-gray-700">
                Tool deprecation and retirement apply to a publisher&apos;s Marketplace tool. PPTB API deprecation is a separate compatibility and maturity concern described by the{" "}
                <a href="https://docs.powerplatformtoolbox.com/tool-development/maturity-model" className="text-blue-600 underline">
                    Tool Maturity Model
                </a>
                . A tool can be deprecated without a PPTB API change, and an API deprecation does not by itself retire a Marketplace tool.
            </p>

            <div className="mt-8 text-center">
                <Link href="/policy/terms" className="text-sm text-blue-600 hover:text-purple-600 transition-colors">
                    View Terms of Service
                </Link>
            </div>
        </div>
    );
}
