# pptb-web

The official website for Power Platform Tool Box - showcasing features and providing easy downloads for the desktop application.

## Overview

This is a Next.js-based static website built with TypeScript and Tailwind CSS that:
- Showcases the key features of Power Platform Tool Box
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
│   ├── layout.tsx       # Root layout with metadata
│   ├── page.tsx         # Homepage
│   └── globals.css      # Global styles
├── components/
│   ├── DownloadButton.tsx  # Smart download button with OS detection
│   └── Features.tsx        # Features showcase section
├── lib/
│   ├── os-detection.ts     # OS detection utility
│   └── github-api.ts       # GitHub API integration
└── public/              # Static assets
```

## Future Enhancements

- Add Supabase integration for user analytics
- Implement documentation section
- Add blog or news section
- Create video tutorials section
- Add community showcase

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [Desktop App Repository](https://github.com/PowerPlatformToolBox/desktop-app)
- [Latest Releases](https://github.com/PowerPlatformToolBox/desktop-app/releases)

---

Made with ❤️ for the Power Platform community
