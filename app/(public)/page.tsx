import { Hero } from "@/components/Hero";
import { HonoringXTB } from "@/components/HonoringXTB";
import { Pricing } from "@/components/Pricing";
import { PrimaryFeatures } from "@/components/PrimaryFeatures";
import { Team } from "@/components/Team";

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
