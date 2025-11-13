# Supabase Configuration Guide

This guide will help you set up Supabase authentication and database for the Power Platform Tool Box website.

## Prerequisites

- A Supabase account (create one at [supabase.com](https://supabase.com))
- Your Supabase project URL and anon key

## Step 1: Set up Environment Variables

Create a `.env.local` file in the root of the project:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

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
-- Create tools table
create table public.tools (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text not null,
  long_description text,
  icon text not null,
  category text not null,
  downloads integer default 0,
  rating numeric(2,1) default 0.0,
  aum integer default 0,
  author text,
  version text,
  last_updated timestamp with time zone,
  features text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.tools enable row level security;

-- Allow public read access
create policy "Allow public read access on tools"
  on public.tools for select
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
-- Insert sample tools
insert into public.tools (name, description, long_description, icon, category, downloads, rating, aum, author, version, last_updated, features) values
('Solution Manager', 'Manage your Power Platform solutions with ease.', 'Solution Manager is a comprehensive tool for managing your Power Platform solutions. It provides an intuitive interface for exporting, importing, and tracking versions of your solutions.', '📦', 'Solutions', 1250, 4.8, 850, 'PPTB Team', '2.1.0', now(), ARRAY['Export and import solutions', 'Version control integration', 'Dependency analysis', 'Solution comparison', 'Bulk operations', 'Automated backups']),
('Environment Tools', 'Compare environments and manage settings efficiently.', 'Environment Tools helps you manage multiple Power Platform environments with ease. Compare configurations, copy settings between environments, and ensure consistency.', '🌍', 'Environments', 980, 4.6, 620, 'PPTB Team', '1.8.5', now(), ARRAY['Environment comparison', 'Configuration copying', 'Settings management', 'Multi-environment support', 'Change tracking']),
('Code Generator', 'Generate early-bound classes and TypeScript definitions.', 'Code Generator automates the creation of strongly-typed code from your Dataverse metadata. Generate early-bound classes for .NET, TypeScript definitions for web resources, and more.', '⚡', 'Development', 2100, 4.9, 1450, 'PPTB Team', '3.0.2', now(), ARRAY['Early-bound class generation', 'TypeScript definitions', 'Action/Function proxies', 'Custom templates', 'Incremental updates', 'Multiple language support']),
('Plugin Manager', 'Register and manage plugins with a modern interface.', 'Plugin Manager provides a modern interface for managing your Dataverse plugins and custom workflow activities. Register new plugins, update existing ones, and manage plugin steps.', '🔌', 'Development', 1450, 4.7, 920, 'PPTB Team', '2.5.1', now(), ARRAY['Plugin registration', 'Step management', 'Assembly upload', 'Profiling integration', 'Bulk updates', 'Plugin testing']),
('Data Import/Export', 'Import and export data using Excel, CSV, or JSON.', 'Data Import/Export tool makes it easy to move data in and out of your Dataverse environment. Support for multiple formats including Excel, CSV, and JSON.', '📊', 'Data', 1800, 4.5, 1100, 'PPTB Team', '2.3.0', now(), ARRAY['Multiple format support', 'Data transformation', 'Validation rules', 'Bulk operations', 'Scheduled imports', 'Error handling']),
('Performance Monitor', 'Monitor and analyze solution performance.', 'Performance Monitor helps you track and analyze the performance of your Power Platform solutions. Identify bottlenecks, monitor resource usage, and get actionable insights.', '📈', 'Monitoring', 750, 4.4, 480, 'PPTB Team', '1.5.3', now(), ARRAY['Real-time monitoring', 'Performance metrics', 'Bottleneck detection', 'Resource usage tracking', 'Historical analysis', 'Optimization recommendations']);
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
