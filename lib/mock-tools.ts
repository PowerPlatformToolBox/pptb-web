export interface MockTool {
    id: string;
    name: string;
    description: string;
    icon: string;
    categories: string[];
    contributors: string[];
    downloads: number;
    rating: number;
    mau: number;
    version: string;
    repository: string;
    website: string;
    readmeUrl?: string;
}

export const mockTools: MockTool[] = [
    {
        id: "1",
        name: "Solution Manager",
        description: "Manage your Power Platform solutions with ease. Export, import, and version control your solutions.",
        icon: "📦",
        contributors: ["Power Platform ToolBox"],
        categories: ["Solutions"],
        downloads: 1250,
        rating: 4.8,
        mau: 320,
        version: "2.1.0",
        repository: "https://github.com/PowerPlatformToolBox/solution-manager",
        website: "https://powerplatformtoolbox.com",
    },
    {
        id: "2",
        name: "Environment Tools",
        description: "Compare environments, copy configurations, and manage environment settings efficiently.",
        icon: "🌍",
        contributors: ["Power Platform ToolBox"],
        categories: ["Environments"],
        downloads: 980,
        rating: 4.6,
        mau: 280,
        version: "1.8.5",
        repository: "https://github.com/PowerPlatformToolBox/desktop-app",
        website: "https://powerplatformtoolbox.com",
    },
    {
        id: "3",
        name: "Code Generator",
        description: "Generate early-bound classes, TypeScript definitions, and more from your Dataverse metadata.",
        icon: "⚡",
        contributors: ["Power Platform ToolBox"],
        categories: ["Development"],
        downloads: 2100,
        rating: 4.9,
        mau: 450,
        version: "3.0.2",
        repository: "https://github.com/PowerPlatformToolBox/desktop-app",
        website: "https://powerplatformtoolbox.com",
    },
    {
        id: "4",
        name: "Plugin Manager",
        description: "Register, update, and manage your plugins and custom workflow activities with a modern interface.",
        icon: "🔌",
        contributors: ["Power Platform ToolBox"],
        categories: ["Development"],
        downloads: 1450,
        rating: 4.7,
        mau: 380,
        version: "2.5.1",
        repository: "https://github.com/PowerPlatformToolBox/desktop-app",
        website: "https://powerplatformtoolbox.com",
    },
    {
        id: "5",
        name: "Data Import/Export",
        description: "Import and export data using Excel, CSV, or JSON. Support for bulk operations and data transformation.",
        icon: "📊",
        contributors: ["Power Platform ToolBox"],
        categories: ["Data"],
        downloads: 1800,
        rating: 4.5,
        mau: 410,
        version: "2.3.0",
        repository: "https://github.com/PowerPlatformToolBox/desktop-app",
        website: "https://powerplatformtoolbox.com",
    },
    {
        id: "6",
        name: "Performance Monitor",
        description: "Monitor and analyze the performance of your Power Platform solutions. Identify bottlenecks and optimize.",
        icon: "📈",
        contributors: ["Power Platform ToolBox"],
        categories: ["Monitoring"],
        downloads: 750,
        rating: 4.4,
        mau: 200,
        version: "1.5.3",
        repository: "https://github.com/PowerPlatformToolBox/desktop-app",
        website: "https://powerplatformtoolbox.com",
    },
];

export function toToolSummaryApiRecord(tool: MockTool) {
    return {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        icon: tool.icon,
        status: "active",
        tool_analytics: {
            downloads: tool.downloads,
            rating: tool.rating,
            mau: tool.mau,
        },
        tool_categories: tool.categories.map((name) => ({ categories: { name } })),
        tool_contributors: tool.contributors.map((name) => ({ contributors: { name } })),
    };
}

export function toToolDetailApiRecord(tool: MockTool) {
    return {
        ...toToolSummaryApiRecord(tool),
        readmeurl: tool.readmeUrl ?? null,
        version: tool.version,
        repository: tool.repository,
        website: tool.website,
    };
}
