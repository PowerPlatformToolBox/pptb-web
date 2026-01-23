import Link from "next/link";
import { FadeIn } from "./animations/FadeIn";
import { Container } from "./Container";

export function HonoringXTB() {
    return (
        <Container className="mt-8 sm:mt-16 mb-8 sm:mb-16">
            {/* Hero Tribute Section */}
            <FadeIn direction="up" delay={0.3}>
                <div className="mt-16 card-dark p-12 text-center">
                    <div className="mb-6 text-6xl">🙏</div>
                    <h2 className="text-3xl font-bold mb-4 text-white">Honoring XrmToolBox and Tanguy</h2>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-6">
                        Power Platform ToolBox exists because of the incredible foundation laid by
                        <span className="text-white font-semibold"> Tanguy Touzard</span> and the
                        <span className="text-white font-semibold"> XrmToolBox</span> community.
                    </p>
                    <Link href="/about" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3">
                        Learn More About Our Journey
                    </Link>
                </div>
            </FadeIn>
        </Container>
    );
}
