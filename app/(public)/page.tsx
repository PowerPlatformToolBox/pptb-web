import { Faqs } from "@/components/Faqs";
import { Hero } from "@/components/Hero";
import { Pricing } from "@/components/Pricing";
import { PrimaryFeatures } from "@/components/PrimaryFeatures";

export default function Home() {
    return (
        <main>
            <Hero />
            <PrimaryFeatures />
            {/* <Testimonials /> */}
            <Pricing />
            <Faqs />
        </main>
    );
}
