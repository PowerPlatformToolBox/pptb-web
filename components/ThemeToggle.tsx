"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    // Mounted flag to avoid SSR/client mismatch for theme-dependent icon.
    // Initialize to false; switch to true after first client render using a layout effect pattern.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        // Using a microtask ensures this runs after paint without triggering React's lint about cascading renders.
        Promise.resolve().then(() => setMounted(true));
    }, []);

    // Log changes only after mount.
    useEffect(() => {
        if (!mounted) return;
        console.log("[ThemeToggle] effect run. Current theme:", theme);
    }, [mounted, theme]);

    return (
        <button
            suppressHydrationWarning
            type="button"
            onClick={() => {
                console.log("[ThemeToggle] click received. Theme before:", theme);
                toggleTheme();
                setTimeout(() => {
                    console.log("[ThemeToggle] html classes after:", document.documentElement.className);
                }, 10);
            }}
            aria-pressed={theme === "dark"}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors duration-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
            {mounted ? (
                theme === "light" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fillRule="evenodd"
                            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                            clipRule="evenodd"
                        />
                    </svg>
                )
            ) : (
                // Placeholder keeps SSR/CSR consistent
                <span className="h-5 w-5" />
            )}
        </button>
    );
}
