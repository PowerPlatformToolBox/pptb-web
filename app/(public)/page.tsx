import type { Metadata } from "next";

import { Hero } from "@/components/Hero";
import { HomeReleaseVideo } from "@/components/HomeReleaseVideo";
import { HonoringXTB } from "@/components/HonoringXTB";
import { Pricing } from "@/components/Pricing";
import { PrimaryFeatures } from "@/components/PrimaryFeatures";
import { Team } from "@/components/Team";
import { buildPageMetadata } from "@/lib/metadata";
import { getLatestUpdateReleaseWithVideoSlug, getUpdateRelease } from "@/lib/updates";

export const metadata: Metadata = buildPageMetadata({
    title: "Power Platform ToolBox | Modern desktop companion",
    description: "Discover the open-source desktop experience for Power Platform pros, complete with curated tools, secure distribution, and community-led innovation.",
    url: "/",
});

export default async function Home() {
    const latestVideoReleaseSlug = await getLatestUpdateReleaseWithVideoSlug();
    const latestVideoRelease = latestVideoReleaseSlug ? await getUpdateRelease(latestVideoReleaseSlug) : null;
    const latestVideo = latestVideoRelease?.meta.video;

    return (
        <main>
            <Hero />
            <PrimaryFeatures />
            {latestVideoRelease && latestVideo && <HomeReleaseVideo releaseTitle={latestVideoRelease.meta.title} description={latestVideoRelease.meta.description} video={latestVideo} />}
            <HonoringXTB />
            <Team />
            {/* <Testimonials /> */}
            <Pricing />
        </main>
    );
}
