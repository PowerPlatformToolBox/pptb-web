import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tool Marketplace | Power Platform ToolBox",
    description: "Explore tools for Power Platform development in the Power Platform ToolBox marketplace.",
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
