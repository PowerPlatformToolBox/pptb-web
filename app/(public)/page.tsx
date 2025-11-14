import { Faqs } from "@/components/Faqs";
import { Hero } from "@/components/Hero";
import { HonoringXTB } from "@/components/HonoringXTB";
import { Pricing } from "@/components/Pricing";
import { PrimaryFeatures } from "@/components/PrimaryFeatures";

export default function Home() {
    return (
        <main>
            <Hero />
            <PrimaryFeatures />
            <HonoringXTB />
            {/* <Testimonials /> */}
            <Pricing />
            <Faqs />
        </main>
    );
}
