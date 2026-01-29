import { Faqs } from "@/components/Faqs";
import { buildPageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = buildPageMetadata({
    title: "Frequently Asked Questions | Power Platform ToolBox",
    description: "Answers to the most common questions about Power Platform ToolBox, from platform support to security and tool installation.",
    url: "/faqs",
});

export default function FaqPage() {
    return (
        <main>
            <Faqs />
        </main>
    );
}
