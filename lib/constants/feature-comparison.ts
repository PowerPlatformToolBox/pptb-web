export type SupportLevel = "yes" | "no" | "partial" | "na";

export interface ComparisonFeature {
    label: string;
    desktop: SupportLevel;
    vscode: SupportLevel;
    desktopNote?: string;
    vscodeNote?: string;
}

export interface ComparisonCategory {
    title: string;
    features: ComparisonFeature[];
}

export const FEATURE_COMPARISON: ComparisonCategory[] = [
    {
        title: "Installed Tools SidePanel",
        features: [
            { label: "List installed tools in a sidebar/main list", desktop: "yes", vscode: "yes" },
            { label: "Launch a tool in the context of the active connection", desktop: "yes", vscode: "yes" },
            { label: "Uninstall a tool", desktop: "yes", vscode: "yes" },
            { label: "Refresh list", desktop: "yes", vscode: "yes" },
            { label: "Verified badge, publisher/contributor, category tooltip", desktop: "yes", vscode: "yes" },
            { label: "Category/capability tags shown on the list item", desktop: "yes", vscode: "yes", vscodeNote: "tooltip only" },
            { label: "Download count / rating / active-user stats shown", desktop: "yes", vscode: "partial", vscodeNote: "used for sorting, not displayed" },
            { label: "Mark tool as favorite (star)", desktop: "yes", vscode: "yes" },
            { label: "Search box", desktop: "yes", vscode: "no" },
            { label: "Sort (name, popularity, rating, downloads, favorite)", desktop: "yes", vscode: "yes" },
            { label: "Filter by category/verified-only", desktop: "yes", vscode: "yes" },
        ],
    },
    {
        title: "Marketplace SidePanel",
        features: [
            { label: "Browse marketplace tools in a sidebar/main list", desktop: "yes", vscode: "yes" },
            { label: "Install a tool", desktop: "yes", vscode: "yes" },
            { label: "Uninstall an installed marketplace tool", desktop: "yes", vscode: "yes" },
            { label: "Verified badge, publisher/contributor, category tooltip", desktop: "yes", vscode: "yes" },
            { label: "Refresh list", desktop: "yes", vscode: "yes" },
            { label: "Category/capability tags shown on the list item", desktop: "yes", vscode: "yes", vscodeNote: "tooltip only" },
            { label: "Download count / rating / active-user stats shown", desktop: "yes", vscode: "partial", vscodeNote: "used for sorting, not displayed" },
            { label: "Search box", desktop: "yes", vscode: "no" },
            { label: "Sort (name, popularity, rating, downloads)", desktop: "yes", vscode: "yes" },
            { label: "Filter by category/verified-only", desktop: "yes", vscode: "yes" },
            { label: '"New tools" highlight/notification', desktop: "yes", vscode: "no" },
        ],
    },
    {
        title: "Installed Tools Full View",
        features: [
            { label: "Dedicated full-tab card-grid view of installed tools", desktop: "no", vscode: "yes" },
            { label: "Search installed tools", desktop: "no", vscode: "yes" },
            { label: "Sort and filter installed tools (shares state with the sidebar)", desktop: "no", vscode: "yes" },
            { label: "Mark tool as favorite (star)", desktop: "no", vscode: "yes" },
            { label: "Tabbed switch between Installed/Marketplace in the same panel", desktop: "no", vscode: "yes" },
        ],
    },
    {
        title: "Marketplace Full View",
        features: [
            { label: "Dedicated full-tab card-grid marketplace browser", desktop: "no", vscode: "yes" },
            { label: "Search marketplace tools", desktop: "no", vscode: "yes" },
            { label: "Category filter chips", desktop: "no", vscode: "yes" },
            { label: "Sort marketplace tools (shares state with the sidebar)", desktop: "no", vscode: "yes" },
            { label: "Paginated results", desktop: "no", vscode: "yes" },
        ],
    },
    {
        title: "Tool Updates",
        features: [
            { label: "Check for a newer version of an installed tool", desktop: "yes", vscode: "yes" },
            { label: 'One-click "Update" action', desktop: "yes", vscode: "yes" },
            { label: "Update all available tools", desktop: "yes", vscode: "yes" },
            { label: "Update-in-progress indicator", desktop: "yes", vscode: "yes" },
            { label: "Update-available badge/notification", desktop: "yes", vscode: "yes" },
        ],
    },
    {
        title: "Personalization & Home",
        features: [
            { label: "Mark tools as favorite", desktop: "yes", vscode: "yes" },
            { label: 'Recently used tools list ("Open Recent")', desktop: "yes", vscode: "no" },
            { label: "Homepage dashboard (stats, quick actions, sponsors)", desktop: "yes", vscode: "no" },
            { label: '"What\'s New" page shown after an update', desktop: "yes", vscode: "no" },
        ],
    },
    {
        title: "Connection Management",
        features: [
            { label: "Add / edit / delete connections", desktop: "yes", vscode: "yes" },
            { label: "Auth: Interactive Browser (OAuth)", desktop: "yes", vscode: "yes" },
            { label: "Auth: Client Credentials (Service Principal)", desktop: "yes", vscode: "yes" },
            { label: "Auth: Username/Password", desktop: "yes", vscode: "yes" },
            { label: "Connection string import & export", desktop: "yes", vscode: "no" },
            { label: "Test connection", desktop: "yes", vscode: "yes" },
            { label: "Export / import connections", desktop: "yes", vscode: "yes" },
            { label: "Categories with custom colors", desktop: "yes", vscode: "yes" },
            { label: "Category header shows connection count + collapse/expand", desktop: "yes", vscode: "no", vscodeNote: "not supported in VS Code Extension" },
            { label: "Active connection (primary & secondary) indicator", desktop: "yes", vscode: "no", vscodeNote: "only primary is shown" },
            { label: "Browser + profile selection for interactive auth", desktop: "yes", vscode: "yes" },
            { label: "Auth type badge shown in the connection list", desktop: "yes", vscode: "no" },
            { label: "Environment badge/pill shown in the connection list", desktop: "yes", vscode: "partial", vscodeNote: "colored dot only, no text pill" },
            { label: "Credential storage", desktop: "yes", vscode: "yes", desktopNote: "custom encryption manager", vscodeNote: "native VS Code SecretStorage" },
            { label: "Search box", desktop: "yes", vscode: "no" },
            { label: "Sort (Last Used, Name A-Z/Z-A)", desktop: "yes", vscode: "no" },
            { label: "Filter by auth type / environment", desktop: "yes", vscode: "no" },
        ],
    },
    {
        title: "Settings",
        features: [
            { label: "Per-tool settings persistence", desktop: "yes", vscode: "yes" },
            { label: "User/app-level settings", desktop: "yes", vscode: "no" },
            { label: "Dedicated settings UI panel", desktop: "yes", vscode: "no" },
        ],
    },
    {
        title: "CSP",
        features: [
            { label: "Per-tool webview CSP enforcement", desktop: "yes", vscode: "yes" },
            { label: "User-consent workflow for external resource access", desktop: "yes", vscode: "yes" },
            { label: "Configurable CSP per tool", desktop: "yes", vscode: "yes" },
        ],
    },
    {
        title: "Agentic AI",
        features: [
            { label: "MCP (Model Context Protocol) tool support", desktop: "yes", vscode: "no" },
            { label: "Inter-tool invocation", desktop: "yes", vscode: "no" },
            { label: "Headless/unattended tool invocation (automation)", desktop: "yes", vscode: "no" },
            { label: "Standalone CLI", desktop: "yes", vscode: "no" },
        ],
    },
    {
        title: "General",
        features: [
            { label: "Launch tools with multiple connections", desktop: "yes", vscode: "yes" },
            { label: "Notifications", desktop: "yes", vscode: "yes", desktopNote: "custom notification window", vscodeNote: "native VS Code notifications" },
            { label: "Auto-update", desktop: "yes", vscode: "na", vscodeNote: "handled by VS Code Marketplace" },
            { label: "System tray integration", desktop: "yes", vscode: "na", vscodeNote: "not applicable" },
            { label: "Custom protocol handler (deep links)", desktop: "yes", vscode: "no", vscodeNote: "not supported by VS Code" },
            { label: "Telemetry / error tracking", desktop: "yes", vscode: "no", desktopNote: "Sentry" },
            { label: "Private/custom marketplace registry configuration", desktop: "yes", vscode: "no" },
            { label: "Tool/app API version compatibility checks", desktop: "yes", vscode: "no" },
            { label: "Terminal command sandboxing / blocklist", desktop: "yes", vscode: "no" },
            { label: "Azure Blob storage fallback for registry & packages", desktop: "yes", vscode: "no" },
        ],
    },
];
