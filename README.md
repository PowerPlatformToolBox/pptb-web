# pptb-web

The official website for Power Platform ToolBox - showcasing features and providing easy downloads for the desktop application.

## Overview

This is a Next.js-based static website built with TypeScript and Tailwind CSS that:

- Showcases the key features of Power Platform ToolBox
- Automatically detects the user's operating system (Windows, macOS, or Linux)
- Provides smart download links from the latest GitHub release of the [desktop-app](https://github.com/PowerPlatformToolBox/desktop-app)
- Features a responsive, modern design

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework
- **Supabase** - Backend service (ready for future enhancements)

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/PowerPlatformToolBox/pptb-web.git
cd pptb-web

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the website.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint

## Deployment

This website is designed to be deployed as a static site. It works with:

- **Vercel** (recommended) - Zero configuration deployment
- **Netlify** - Static site hosting
- **GitHub Pages** - Free hosting for public repositories
- **Any static hosting service**

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PowerPlatformToolBox/pptb-web)

Or using the Vercel CLI:

```bash
npm install -g vercel
vercel
```

## Features

### OS Detection

The website automatically detects the user's operating system and displays the appropriate download button for their platform.

### GitHub Release Integration

Downloads are automatically fetched from the latest release of the desktop-app repository, ensuring users always get the most recent version.

### Responsive Design

The website is fully responsive and works seamlessly on desktop, tablet, and mobile devices.

### Features Showcase

Six key features are highlighted with icons and descriptions:

1. Solution Management
2. Environment Tools
3. Code Generation
4. Plugin Management
5. Data Import/Export
6. Performance Monitoring

## Project Structure

```
pptb-web/
├── app/
│   ├── about/              # XrmToolBox tribute page
│   ├── auth/
│   │   └── signin/         # OAuth sign-in page (Microsoft, Google, GitHub)
│   ├── dashboard/          # Authenticated user dashboard
│   ├── rate-tool/          # Tool rating page
│   ├── tools/
│   │   ├── [id]/           # Individual tool details page
│   │   └── page.tsx        # Tools showcase page
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Homepage
│   └── globals.css         # Global styles
├── components/
│   ├── animations/         # Reusable animation components
│   ├── Button.tsx          # Button component
│   ├── Container.tsx       # Container component
│   ├── DownloadButton.tsx  # Smart download button with OS detection
│   ├── Footer.tsx          # Footer component
│   ├── Header.tsx          # Header with navigation
│   └── ...                 # Other components
├── lib/
│   ├── os-detection.ts     # OS detection utility
│   ├── github-api.ts       # GitHub API integration
│   └── supabase.ts         # Supabase client and types
├── styles/
│   └── globals.css         # Custom theme and styles
└── public/                 # Static assets
```

## Pages

### Public Pages

- **Home (`/`)**: Main landing page with features and download button
- **Tools (`/tools`)**: Showcase of all available tools with filtering by category
- **About (`/about`)**: Tribute to XrmToolBox and Tanguy (with placeholder text)
- **Tool Details (`/tools/[id]`)**: Individual tool page with features, ratings, and version info

### Authentication

- **Sign In (`/auth/signin`)**: OAuth authentication with Microsoft, Google, and GitHub

### Protected Pages (Requires Authentication)

- **Dashboard (`/dashboard`)**: User dashboard with tool analytics (downloads, ratings, AUM)
- **Rate Tool (`/rate-tool`)**: Form to rate and review tools

## Features

### Authentication

- OAuth sign-in with three providers: Microsoft (Azure AD), Google, and GitHub
- Protected routes automatically redirect to sign-in
- Graceful handling when Supabase is not configured (uses mock data)

### Tool Management

- Browse all tools with category filtering
- View detailed information about each tool
- Rate and review tools (authenticated users only)
- Real-time statistics: downloads, ratings, and AUM (Active User Months)

### User Dashboard

- Overview of all tools with sortable analytics
- Quick access to rate tools
- Statistics summary (total tools, downloads, average rating)

## Supabase Integration

The website integrates with Supabase for:

- User authentication (OAuth providers)
- Tool data storage and retrieval

### Environment Variables (Updated)

Supabase configuration no longer uses `NEXT_PUBLIC_` prefixed variables. Instead set the following in your `.env.local`:

```bash
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

#### GitHub Token (Optional but Recommended)

To enable GitHub Sponsors data and increase API rate limits, add a GitHub Personal Access Token:

```bash
GITHUB_TOKEN=your-github-token
```

**How to create a GitHub Personal Access Token:**

1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Give your token a descriptive name (e.g., "PPTB Web - Sponsors API")
4. Select the following scopes:
   - `public_repo` - For public repositories and basic API access
   - `read:org` - To read organization sponsorship data
5. Click "Generate token" and copy the token
6. Add it to your `.env.local` file

**Note:** Never commit your `.env.local` file to version control. Use `.env.example` as a template.

Client components now initialize Supabase via a lightweight hook `useSupabase()` that fetches configuration from an internal API route (`/api/supabase-config`). This prevents accidental exposure of additional server-only environment variables while still allowing the (safe) anon key to be used in the browser.

### Usage in Client Components

```tsx
import { useSupabase } from "@/lib/useSupabase";

export function Example() {
    const { supabase } = useSupabase();
    // supabase will be null until initialized
    // Add guards before calling auth/data methods
}
```

### Server-Side Usage

For server components or route handlers, use the server client in `lib/supabase.ts`.

- User ratings and reviews
- Analytics tracking

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed setup instructions.

## Future Enhancements

- Add user profile management
- Implement real-time analytics updates
- Add tool search functionality
- Create admin panel for tool management
- Add blog or news section
- Create video tutorials section
- Add community showcase

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Links

- [Desktop App Repository](https://github.com/PowerPlatformToolBox/desktop-app)
- [Latest Releases](https://github.com/PowerPlatformToolBox/desktop-app/releases)

---

Made with ❤️ for the Power Platform community
