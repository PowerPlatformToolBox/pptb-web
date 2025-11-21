"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): Theme {
    // On server, we don't know the theme yet
    if (typeof window === "undefined") {
        return "light";
    }

    // On client, read from data attribute set by ThemeScript
    const dataTheme = document.documentElement.getAttribute("data-theme");
    if (dataTheme === "dark" || dataTheme === "light") {
        return dataTheme;
    }

    return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    // Apply theme class whenever theme changes
    useEffect(() => {
        // Sync with data attribute on mount (in case it changed)
        const dataTheme = document.documentElement.getAttribute("data-theme");
        if (dataTheme === "dark" || dataTheme === "light") {
            // Apply inline styles on mount (workaround for Tailwind v4 + Turbopack issue)
            // Only set background color, not text color to avoid overriding component-specific text colors
            if (dataTheme === "dark") {
                document.body.style.backgroundColor = "#0f172a";
            } else {
                document.body.style.backgroundColor = "#ffffff";
            }
        }

        // Listen for system preference changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e: MediaQueryListEvent) => {
            // Only update if no theme is stored
            if (!localStorage.getItem("theme")) {
                const newTheme = e.matches ? "dark" : "light";
                setTheme(newTheme);
                document.documentElement.classList.toggle("dark", newTheme === "dark");
                document.documentElement.setAttribute("data-theme", newTheme);

                // Apply inline styles
                if (newTheme === "dark") {
                    document.body.style.backgroundColor = "#0f172a";
                } else {
                    document.body.style.backgroundColor = "#ffffff";
                }
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const toggleTheme = () => {
        setTheme((prevTheme) => {
            const newTheme = prevTheme === "light" ? "dark" : "light";

            // Update localStorage
            localStorage.setItem("theme", newTheme);

            // Update DOM
            document.documentElement.classList.toggle("dark", newTheme === "dark");
            document.documentElement.setAttribute("data-theme", newTheme);

            // Apply theme styles directly to body element (workaround for Tailwind v4 + Turbopack issue)
            // Only set background color, not text color to avoid overriding component-specific text colors
            if (newTheme === "dark") {
                document.body.style.backgroundColor = "#0f172a";
            } else {
                document.body.style.backgroundColor = "#ffffff";
            }

            return newTheme;
        });
    };

    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
