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

Before deploying intake resubmission, apply `scripts/resubmit-tool-intake.sql` in the Supabase SQL editor. It installs the service-role-only function that atomically refreshes a `needs_changes` intake and its category/contributor relationships.

### Intake icon previews

The intake form previews the SVG declared by `package.json`'s `icon` field, relative to the package's `dist/` folder (for example, `icons/tool.svg` resolves to `dist/icons/tool.svg`; an explicit `dist/` prefix is also supported, matching desktop). Light and dark previews reproduce the desktop app's compact tool card: a 20px SVG in a 30px icon container, beside the package display name and version. All SVGs retain their authored colors; unlike desktop's monochrome fallback, the preview never uses theme-color masks or recolors an icon. The cards use desktop theme colors independently of the site's theme and stack on narrow screens. After submission and during admin review, previews use the submitted npm version rather than `latest`. Reviewers can describe visibility/contrast issues in the existing review notes and request changes.

The authenticated `/api/package-icon` endpoint reads regular files from the npm tarball without extracting files to disk. Previews support npm-registry-hosted tarballs up to 25 MB (100 MB expanded) and SVGs up to 256 KB. Missing, oversized, unavailable or unrenderable icons show an explicit error; they do not change existing intake validation rules. SVGs are rendered as isolated images, not injected into the page.

Before deploying the combined Ideas board, follow the [Ideas rollout guide](docs/IDEAS_BOARD_ROLLOUT.md). Apply its database migration first; it preserves the legacy desktop RPC contracts and adds maintainer status management and GitHub issue linking.

For signed-in users claiming open Tool Ideas, follow the [claiming rollout guide](docs/IDEAS_CLAIMING_ROLLOUT.md). It includes the additional Supabase scripts, direct notification configuration, and the Discord receiver integration prompt. Claiming does not require or automatically enable a developer profile.

The website now uses generic `ideas` / `idea_votes` tables and renamed vote/claim RPCs. Apply the [breaking Ideas rename](docs/IDEAS_RENAME_ROLLOUT.md) after existing migrations/cleanups, and coordinate the desktop update before deployment. Old table/RPC names have no compatibility aliases.

### Running a Fork Without Supabase

If you are testing from a fork and do not have Supabase credentials, you can still run the app locally:

- Leave `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` unset.
- Public tool endpoints automatically return built-in mock data.
- Protected pages now enter a local mock-auth mode automatically, so pages like `/dashboard`, `/submit-tool`, and `/rate-tool` can be exercised without Supabase credentials.

### User profiles

Signed-in users can open `/profile` from the circular avatar menu on desktop or mobile to edit
their public display name, optional LinkedIn profile URL, and Discord handle.
The avatar menu includes Profile, Dashboard, and Sign out. It uses the account's
avatar when available and a user icon when the avatar is missing or cannot load.
A persistent reminder appears in the header when the display name is missing or
email-like. Completion is optional: reviews remain allowed and anonymous until
a valid name is saved. Saving a name also updates the attribution of existing
reviews. The reminder refreshes immediately after a successful save.

Before deploying profile editing, run
[profile-name-sync.sql](docs/sql/profile-name-sync.sql) in the Supabase SQL editor.
If you ran an earlier version, run this updated version too. Profile names now
take precedence over provider metadata, so later auth updates cannot overwrite
a user's chosen name. The script preserves the current trigger bindings and
does not invent names or backfill missing ones. Deliberately changing or clearing
auth name metadata no longer replaces a nonblank profile name; use `/profile`.

`GET /api/profile` and `PATCH /api/profile` require a verified user token. They
read/write only the caller's editable fields, never accept a target user ID, and
return uncached responses. Names are required when saving the form (1-100
characters, no email address); contact fields can be cleared. Email, avatar, and
developer status cannot be edited here. This feature requires Supabase and has no
mock-success save path. Keep the profile privacy RLS restrictions in place; this
feature does not grant public access to profiles.

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

### Discord Notifications

Tool submission, update and verification events can be posted to the PPTB Agent Discord bot. Set both variables in the deployment environment (for example, Vercel → Project Settings → Environment Variables):

| Variable                | Description                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `DISCORD_EVENTS_URL`    | The bot's signed event endpoint.                                                                   |
| `DISCORD_EVENTS_SECRET` | Shared secret for request signing. It must match the secret configured on the bot.                 |

If either variable is missing, notifications are skipped. Each request is a JSON body `{ type, id, occurredAt, data }` with the headers `X-PPTB-Timestamp` (Unix seconds) and `X-PPTB-Signature` (`sha256=` + hex HMAC-SHA256 of `${timestamp}.${body}`). Notifications are sent after the response with Next.js `after()`, use a 5 second timeout, and never affect the API response. Failures are logged with `console.error`. `NEXT_PUBLIC_SITE_URL` is used to build tool and admin review links.

Tool Idea claim notifications use the same signed transport and are sent directly during the claim request after a new claim is committed. Repeated claims do not send again. There is no notification table or automatic retry; failures are logged and shown as a warning without undoing the claim. No cron or `CRON_SECRET` is required. Update the Discord receiver to accept `idea.claimed` before enabling claims. See the [claiming rollout guide](docs/IDEAS_CLAIMING_ROLLOUT.md) for the cleanup script needed on previously migrated databases and best-effort delivery limitations.

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

#### GitHub Personal Access Token (Optional but Recommended)

To enable GitHub Sponsors data, trigger GitHub Actions workflows, and increase API rate limits, add a GitHub Personal Access Token:

```bash
GH_PAT_TOKEN=your-github-token
```

**How to create a GitHub Personal Access Token:**

1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Give your token a descriptive name (e.g., "PPTB Web - API Access")
4. Select the following scopes:
   - `public_repo` - For public repositories and basic API access
   - `read:org` - To read organization sponsorship data
   - `workflow` - To trigger GitHub Actions workflows
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
