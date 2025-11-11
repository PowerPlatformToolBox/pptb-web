import Link from "next/link";

import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { SlimLayout } from "@/components/SlimLayout";

export default function SignIn() {
    return (
        <SlimLayout>
            <div className="flex">
                <Link href="/" aria-label="Home">
                    <Logo className="h-10 w-auto" alt="PPTB" />
                </Link>
            </div>
            <p className="mt-20 text-sm font-medium text-gray-700">503</p>
            <h1 className="mt-3 text-lg font-semibold text-gray-900">Coming Soon</h1>
            <p className="mt-3 text-sm text-gray-700">Our sign-in functionality is coming soon. In the meantime, download the app from our homepage.</p>
            <Button href="/" className="mt-10">
                Go back home
            </Button>
        </SlimLayout>
    );
}
