import type { Metadata } from "next";

import { Hero } from "@/components/Hero";
import { HonoringXTB } from "@/components/HonoringXTB";
import { Pricing } from "@/components/Pricing";
import { PrimaryFeatures } from "@/components/PrimaryFeatures";
import { Team } from "@/components/Team";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
    title: "Power Platform ToolBox | Modern desktop companion",
    description: "Discover the open-source desktop experience for Power Platform pros, complete with curated tools, secure distribution, and community-led innovation.",
    url: "/",
});

export default function Home() {
    return (
        <main>
            <Hero />
            <PrimaryFeatures />
            <HonoringXTB />
            <Team />
            {/* <Testimonials /> */}
            <Pricing />
        </main>
    );
}
