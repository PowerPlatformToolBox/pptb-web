import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Segoe UI Variable"', "Inter", "system-ui", "sans-serif"],
            },
            // ✅ Make sure this is inside `extend.colors`
            colors: {
                blue: "#0078D4", // Copilot / Fluent Blue
                purple: "#8A3FFC", // Copilot / Fluent Purple
                dark: "#0F172A", // Primary dark text
                mid: "#1E293B", // Body text
                light: "#475569", // Secondary text
                background: "#F8FAFC", // Fluent background
                surface: "#FFFFFF", // Card / container background
            },
            backgroundImage: {
                "pptb-gradient": "linear-gradient(to right, #0078D4, #8A3FFC)",
            },
            boxShadow: {
                fluent: "0 4px 12px rgba(0, 0, 0, 0.08)",
                card: "0 2px 8px rgba(0, 0, 0, 0.05)",
                glow: "0 0 20px rgba(138, 63, 252, 0.3)",
            },
            borderRadius: {
                "2xl": "1rem",
                "3xl": "1.25rem",
            },
        },
    },
    plugins: [],
};

export default config;
