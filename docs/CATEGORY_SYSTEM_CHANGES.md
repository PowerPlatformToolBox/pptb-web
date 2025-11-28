# Category System Changes

## Overview

Categories have been moved from the package.json configuration to a separate database-driven system. This allows for better control and management of categories without requiring changes to npm packages.

## Changes Made

### 1. Database Schema

- Removed `category` column from `tools` table
- Removed `categories` from JSON validation in `configurations`
- Added `categories` table to store available categories
- Added `tool_categories` join table for many-to-many relationship between tools and categories
- Added `tool_intake_categories` join table for many-to-many relationship between tool intakes and categories

### 2. Validation (`lib/tool-intake-validation.ts`)

- Removed `categories` from `Configurations` interface
- Removed validation requirement for `configurations.categories`
- Made `configurations` optional (no longer required)
- Categories are now validated separately via UI selection

### 3. Submit Tool Page (`app/(authenticated)/submit-tool/page.tsx`)

- Added category fetching from Supabase on component mount
- Added multi-select checkbox UI for category selection
- Added validation to require at least one category selection
- Updated API call to include `categoryIds` in the request body
- Updated example package.json to remove categories
- Updated requirements documentation

### 4. API Route (`app/api/submit-tool/route.ts`)

- Added `categoryIds` to request interface
- Added validation for category selection
- Added insertion of category relationships into `tool_intake_categories` table
- Categories are now stored as relationships instead of in JSON

## Required Database Setup

Run this SQL in Supabase to set up the category system:

```sql
-- 1. Create categories table
CREATE TABLE public.categories (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL
);

-- 2. Remove category columns from tools and tool_intakes
ALTER TABLE public.tools DROP COLUMN IF EXISTS category;
ALTER TABLE public.tools DROP COLUMN IF EXISTS categories;
ALTER TABLE public.tool_intakes DROP COLUMN IF EXISTS category;
ALTER TABLE public.tool_intakes DROP COLUMN IF EXISTS categories;

-- 3. Create join tables for many-to-many relationships
CREATE TABLE public.tool_categories (
  tool_id uuid REFERENCES public.tools(id) ON DELETE CASCADE,
  category_id integer REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (tool_id, category_id)
);

CREATE TABLE public.tool_intake_categories (
  tool_intake_id uuid REFERENCES public.tool_intakes(id) ON DELETE CASCADE,
  category_id integer REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (tool_intake_id, category_id)
);

-- 4. Enable RLS on new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_intake_categories ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS policies for select (public read)
CREATE POLICY "Allow select for authenticated users" ON public.categories
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow select for authenticated users" ON public.tool_categories
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow select for authenticated users" ON public.tool_intake_categories
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 6. Add RLS policies for insert and update (anon can insert/update)
CREATE POLICY "Allow insert for anon" ON public.categories
  FOR INSERT
  WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Allow insert for anon" ON public.tool_categories
  FOR INSERT
  WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Allow insert for anon" ON public.tool_intake_categories
  FOR INSERT
  WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Allow update for anon" ON public.categories
  FOR UPDATE
  USING (auth.role() = 'anon');

CREATE POLICY "Allow update for anon" ON public.tool_categories
  FOR UPDATE
  USING (auth.role() = 'anon');

CREATE POLICY "Allow update for anon" ON public.tool_intake_categories
  FOR UPDATE
  USING (auth.role() = 'anon');

-- 7. Populate categories with predefined values
INSERT INTO public.categories (name) VALUES
  ('Comparison'),
  ('Configuration'),
  ('Customizations'),
  ('Data'),
  ('Development'),
  ('Documentation'),
  ('Migration'),
  ('Plugins'),
  ('Power Automate'),
  ('Power BI'),
  ('Power Pages'),
  ('Processes'),
  ('Reporting'),
  ('Security'),
  ('Solutions'),
  ('Troubleshooting'),
  ('User Settings')
ON CONFLICT (name) DO NOTHING;
```

## Migration Notes

### For Existing Tools

If you have existing tools with categories in the old format:

```sql
-- Migrate existing tool categories (if tools table had categories as array)
-- Note: This assumes the old format stored categories in a JSONB array
INSERT INTO tool_categories (tool_id, category_id)
SELECT
  t.id,
  c.id
FROM tools t
CROSS JOIN LATERAL jsonb_array_elements_text(t.categories) AS cat(name)
JOIN categories c ON c.name = cat.name;
```

### For Package.json Files

Developers no longer need to include categories in their package.json. The simplified format is:

```json
{
    "name": "pptb-sample-tool",
    "version": "1.0.0",
    "displayName": "Sample Power Platform Tool",
    "description": "A sample tool for Power Platform",
    "contributors": [
        {
            "name": "Your Name",
            "url": "https://github.com/yourusername"
        }
    ],
    "license": "MIT",
    "cspExceptions": {
        "connect-src": ["https://*.dynamics.com"]
    },
    "configurations": {
        "repository": "https://github.com/yourorg/your-tool",
        "website": "https://your-tool.example.com",
        "iconUrl": "https://example.com/icon.png",
        "readmeUrl": "https://github.com/yourorg/your-tool/blob/main/README.md"
    }
}
```

## Benefits

1. **Better Control**: Categories are now managed in the database, not hardcoded in packages
2. **Consistency**: All tools use the same set of categories
3. **Flexibility**: Categories can be added/removed without requiring package updates
4. **Validation**: UI enforces category selection before submission
5. **Multiple Categories**: Tools can belong to multiple categories easily
6. **Admin Management**: Admins can manage categories centrally

## User Flow

1. User navigates to Submit Tool page
2. Categories are fetched from Supabase and displayed as checkboxes
3. User enters package name and selects one or more categories
4. Form validates that at least one category is selected
5. On submit, package is validated from npm and categories are stored as relationships
6. Admin can view submissions with their selected categories in the admin panel
