import clsx from "clsx";
import { type Metadata } from "next";
import { Inter, Lexend } from "next/font/google";

import { ScrollToTop } from "@/components/ScrollToTop";
import { ThemeProvider } from "@/components/ThemeProvider";
import "@/styles/globals.css";

export const metadata: Metadata = {
    title: {
        template: "%s - PPTB",
        default: "PPTB - The ultimate desktop application for Power Platform",
    },
    description: "Streamline your development workflow with powerful set of tools for Power Platform developers.",
};

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

const lexend = Lexend({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-lexend",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={clsx("h-full scroll-smooth antialiased", inter.variable, lexend.variable)}>
            <body className="flex h-full flex-col bg-white dark:bg-slate-900">
                <ThemeProvider>
                    {children}
                    <ScrollToTop />
                </ThemeProvider>
            </body>
        </html>
    );
}
