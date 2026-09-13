import Link from "next/link";

import { Container } from "@/components/Container";
import { FadeIn } from "@/components/animations";

export function SponsorsTeaser() {
    return (
        <section className="bg-slate-50 py-16 sm:py-20">
            <Container>
                <FadeIn direction="up">
                    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Powered by our sponsors</h2>
                        <p className="max-w-xl text-base text-slate-600">
                            Sponsors — recurring, one-time, and past — help keep Power Platform ToolBox free, open-source, and actively maintained for the whole community.
                        </p>
                        <Link href="/sponsors" className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500">
                            View sponsors
                            <span aria-hidden="true">&rarr;</span>
                        </Link>
                    </div>
                </FadeIn>
            </Container>
        </section>
    );
}
