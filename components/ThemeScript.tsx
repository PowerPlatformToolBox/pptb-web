/**
 * Theme initialization script that runs before React hydration
 * This prevents theme flicker and ensures consistent SSR/client rendering
 */
export function ThemeScript() {
    const themeScript = `
        (function() {
            function getTheme() {
                // Check localStorage first
                const stored = localStorage.getItem('theme');
                if (stored === 'dark' || stored === 'light') {
                    return stored;
                }
                
                // Fall back to system preference
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    return 'dark';
                }
                
                return 'light';
            }
            
            function applyTheme(theme) {
                document.documentElement.classList.toggle('dark', theme === 'dark');
                document.documentElement.setAttribute('data-theme', theme);
                
                // Apply theme styles directly to body element (workaround for Tailwind v4 + Turbopack)
                // Only set background color, not text color to avoid overriding component-specific text colors
                if (document.body) {
                    if (theme === 'dark') {
                        document.body.style.backgroundColor = '#0f172a';
                    } else {
                        document.body.style.backgroundColor = '#ffffff';
                    }
                }
            }
            
            const theme = getTheme();
            applyTheme(theme);
            
            // Also apply after DOM is fully loaded (in case body wasn't ready)
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    applyTheme(theme);
                });
            }
        })();
    `;

    return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
