# Supabase Configuration Guide

This guide will help you set up Supabase authentication and database for the Power Platform Tool Box website.

## Prerequisites

- A Supabase account (create one at [supabase.com](https://supabase.com))
- Your Supabase project URL and anon key

## Step 1: Set up Environment Variables

Create a `.env.local` file in the root of the project (prefix removed so keys are not automatically exposed to client bundles):

```bash
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

These values are now accessed server-side and provided to the browser through a lightweight internal API (`/api/supabase-config`) instead of direct `process.env` usage in client components.

## Step 2: Configure OAuth Providers

### Microsoft (Azure AD)

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Azure" provider
3. Follow the setup instructions to create an Azure AD app
4. Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret to Supabase

### Google

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Google" provider
3. Create OAuth credentials in Google Cloud Console
4. Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret to Supabase

### GitHub

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "GitHub" provider
3. Create OAuth app in GitHub Settings → Developer settings
4. Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret to Supabase

## Step 3: Create Database Tables

Run these SQL commands in the Supabase SQL Editor:

### Tools Table

```sql
-- Create tools table (metadata only)
create table public.tools (
  id uuid default gen_random_uuid() primary key,
  packageName text not null,
  name text not null,
  description text not null,
  downloadUrl text not null,
  iconUrl text not null,
  readmeUrl text not null,
  author text,
  version text,
  checksum text,
  size text,
  category text not null,
  published_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create tool_analytics table (analytics only)
create table public.tool_analytics (
  tool_id uuid references public.tools(id) on delete cascade primary key,
  downloads integer default 0,
  rating numeric(2,1) default 0.0,
  aum integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.tools enable row level security;
alter table public.tool_analytics enable row level security;

-- Allow public read access
create policy "Allow public read access on tools"
  on public.tools for select
  to anon, authenticated
  using (true);
create policy "Allow public read access on tool_analytics"
  on public.tool_analytics for select
  to anon, authenticated
  using (true);
```

### Ratings Table

```sql
-- Create ratings table
create table public.ratings (
  id uuid default gen_random_uuid() primary key,
  tool_id uuid references public.tools(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(tool_id, user_id)
);

-- Enable Row Level Security
alter table public.ratings enable row level security;

-- Allow users to read all ratings
create policy "Allow public read access on ratings"
  on public.ratings for select
  to anon, authenticated
  using (true);

-- Allow authenticated users to insert their own ratings
create policy "Allow authenticated users to insert ratings"
  on public.ratings for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Allow users to update their own ratings
create policy "Allow users to update their own ratings"
  on public.ratings for update
  to authenticated
  using (auth.uid() = user_id);
```

### User Profiles Table (Optional)

```sql
-- Create user profiles table
create table public.user_profiles (
  id uuid references auth.users(id) primary key,
  email text not null,
  name text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.user_profiles enable row level security;

-- Allow users to read all profiles
create policy "Allow public read access on user_profiles"
  on public.user_profiles for select
  to anon, authenticated
  using (true);

-- Allow users to update their own profile
create policy "Allow users to update their own profile"
  on public.user_profiles for update
  to authenticated
  using (auth.uid() = id);
```

## Step 4: Seed Initial Data (Optional)

```sql
-- Insert sample tools (metadata)
insert into public.tools (packageName, name, description, downloadUrl, iconUrl, readmeUrl, author, version, category, checksum, size, published_at) values
('@power-maverick/tool-erd-generator', 'ERD Generator', 'Generate Entity Relationship Diagrams for Dataverse', 'https://github.com/PowerPlatformToolBox/pptb-web/releases/download/power-maverick-tool-erd-generator-1.0.0/power-maverick-tool-erd-generator-1.0.0.tar.gz', '', 'https://raw.githubusercontent.com/Power-Maverick/DVDT-Tools/refs/heads/main/tools/erd-generator/README.md', 'Power Maverick', '1.0.0', 'Utilities', 'f4366d1e352cde09aa5b8e0c644e38ce0974470d856479f090783f915fd63302', '20867415', '2025-11-12T03:23:40Z'),
('pptb-standard-sample-tool', 'Sample Standard Tool', 'A sample HTML tool that showcases various features provided by the PPTB', 'https://github.com/PowerPlatformToolBox/pptb-web/releases/download/pptb-standard-sample-tool-1.0.4/pptb-standard-sample-tool-1.0.4.tar.gz', 'https://github.com/PowerPlatformToolBox/pptb-web/releases/download/pptb-standard-sample-tool-1.0.2/pptb-standard-sample-tool-1.0.2-icon.png', 'https://raw.githubusercontent.com/PowerPlatformToolBox/sample-tools/refs/heads/main/new/html-sample/README.md', 'PPTB Creator', '1.0.4', 'Other', '2720257a84c31c42a1abdd9c6bfe485c155564c1b623af52de940da50bc80d66', '87892', '2025-11-08T19:28:01Z');

-- Insert analytics for the tools
-- First, get the tool IDs from the tools table
insert into public.tool_analytics (tool_id, downloads, rating, aum)
select id, 0, 0.0, 0 from public.tools where packageName = '@power-maverick/tool-erd-generator';

insert into public.tool_analytics (tool_id, downloads, rating, aum)
select id, 0, 0.0, 0 from public.tools where packageName = 'pptb-standard-sample-tool';
```

## Step 5: Configure Redirect URLs

In your Supabase Dashboard:

1. Go to Authentication → URL Configuration
2. Add your site URL: `https://your-domain.com`
3. Add redirect URLs:
    - `http://localhost:3000/dashboard` (for local development)
    - `https://your-domain.com/dashboard` (for production)

## Testing

1. Start the development server: `npm run dev`
2. Navigate to `/auth/signin`
3. Try signing in with one of the OAuth providers
4. You should be redirected to `/dashboard` after successful authentication

## Troubleshooting

### "Authentication is not configured" error

- Check that your `.env.local` file has the correct Supabase URL and anon key
- Restart the development server after adding environment variables

### OAuth provider not working

- Verify that the provider is enabled in Supabase Dashboard
- Check that redirect URLs are correctly configured
- Ensure Client ID and Client Secret are correct

### Cannot fetch tools data

- Check that the `tools` table exists in your Supabase database
- Verify that Row Level Security policies allow public read access
- The app will use mock data if Supabase is not configured or fails

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Next.js with Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
