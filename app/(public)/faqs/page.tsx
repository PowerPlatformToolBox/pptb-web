import type { Metadata } from "next";

import { Faqs } from "@/components/Faqs";

export const metadata: Metadata = {
    title: "Frequently Asked Questions | Power Platform ToolBox",
    description: "Answers to the most common questions about Power Platform ToolBox, from platform support to security and tool installation.",
};

export default function FaqPage() {
    return (
        <main>
            <Faqs />
        </main>
    );
}
