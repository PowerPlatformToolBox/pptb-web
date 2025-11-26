# Database Schema for Tool Intake Requests

This document contains the SQL queries needed to create and update the Supabase tables for the tool intake feature.

## Create Tool Intakes Table

Run this SQL in your Supabase SQL Editor to create the `tool_intakes` table:

```sql
-- Create tool_intakes table
CREATE TABLE IF NOT EXISTS tool_intakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_name TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    license TEXT NOT NULL,
    contributors JSONB NOT NULL,
    csp_exceptions JSONB,
    configurations JSONB NOT NULL,
    submitted_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending_review',
    validation_warnings TEXT[],
    reviewer_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_tool_intakes_status ON tool_intakes(status);

-- Create index for faster package name lookups
CREATE INDEX IF NOT EXISTS idx_tool_intakes_package_name ON tool_intakes(package_name);

-- Create index for user submissions lookup
CREATE INDEX IF NOT EXISTS idx_tool_intakes_submitted_by ON tool_intakes(submitted_by);

-- Enable Row Level Security
ALTER TABLE tool_intakes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert their own submissions
CREATE POLICY "Users can insert own submissions" ON tool_intakes
    FOR INSERT
    WITH CHECK (auth.uid() = submitted_by OR submitted_by IS NULL);

-- Policy: Allow users to view their own submissions
CREATE POLICY "Users can view own submissions" ON tool_intakes
    FOR SELECT
    USING (auth.uid() = submitted_by);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_tool_intakes_updated_at ON tool_intakes;
CREATE TRIGGER update_tool_intakes_updated_at
    BEFORE UPDATE ON tool_intakes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Create User Roles Table (for Admin Access)

```sql
-- Create user_roles table for admin permissions
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to view their own roles
CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Only admins can manage roles (using service role key)
-- Note: Role management should be done via admin API with service role key
```

## Admin Policies for Tool Intakes

```sql
-- Policy: Allow admins to view all submissions
CREATE POLICY "Admins can view all submissions" ON tool_intakes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Allow admins to update submissions (for review actions)
CREATE POLICY "Admins can update submissions" ON tool_intakes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
```

## Add Admin User

```sql
-- Add admin role to a user (replace USER_UUID with actual user ID)
INSERT INTO user_roles (user_id, role) 
VALUES ('USER_UUID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Example: Find user by email and add admin role
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'admin' FROM auth.users WHERE email = 'admin@example.com'
-- ON CONFLICT (user_id, role) DO NOTHING;
```

## Status Values

The `status` field can have the following values:
- `pending_review` - Initial status when submitted
- `approved` - Tool has been approved by a reviewer
- `rejected` - Tool has been rejected
- `needs_changes` - Tool requires changes before approval
- `converted_to_tool` - Tool has been converted to a full tool entry

## Example Queries

### Get all pending submissions
```sql
SELECT * FROM tool_intakes 
WHERE status = 'pending_review' 
ORDER BY created_at DESC;
```

### Approve a submission
```sql
UPDATE tool_intakes 
SET 
    status = 'approved',
    reviewer_notes = 'Approved for inclusion',
    reviewed_by = 'REVIEWER_UUID',
    reviewed_at = NOW()
WHERE id = 'INTAKE_UUID';
```

### Get submissions by user
```sql
SELECT * FROM tool_intakes 
WHERE submitted_by = 'USER_UUID' 
ORDER BY created_at DESC;
```

## Converting Approved Intake to Tool

Once an admin approves a tool intake request, it needs to be converted to an actual tool entry in the `tools` table. This can be done via the admin API endpoint or manually via SQL.

### Option 1: Using the Admin API (Recommended)

Call the `/api/admin/tool-intakes/convert` endpoint:

```bash
POST /api/admin/tool-intakes/convert
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "intakeId": "intake-uuid-here"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Tool created successfully",
    "data": {
        "toolId": "new-tool-uuid",
        "name": "Tool Display Name",
        "status": "converted_to_tool"
    }
}
```

### Option 2: Manual SQL Conversion

Run these queries in the Supabase SQL Editor:

```sql
-- Step 1: Insert into tools table
-- Note: iconurl is the primary field used for displaying tool icons
INSERT INTO tools (
    name,
    description,
    iconurl,
    category,
    author,
    version,
    npm_package,
    repository_url,
    website_url,
    readme_url,
    license,
    contributors,
    csp_exceptions,
    categories,
    last_updated,
    created_at
)
SELECT 
    display_name,
    description,
    configurations->>'iconUrl',
    configurations->'categories'->>0,
    contributors->0->>'name',
    version,
    package_name,
    configurations->>'repository',
    configurations->>'website',
    configurations->>'readmeUrl',
    license,
    contributors,
    csp_exceptions,
    configurations->'categories',
    NOW(),
    NOW()
FROM tool_intakes
WHERE id = 'INTAKE_UUID' AND status = 'approved';

-- Step 2: Update the intake status to mark it as converted
UPDATE tool_intakes 
SET 
    status = 'converted_to_tool',
    updated_at = NOW()
WHERE id = 'INTAKE_UUID';
```

### Tools Table Schema

If the `tools` table doesn't exist, create it with:

```sql
CREATE TABLE IF NOT EXISTS tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    iconurl TEXT,  -- Primary field for tool icon URL
    category TEXT NOT NULL,
    author TEXT,
    version TEXT,
    npm_package TEXT UNIQUE,
    repository_url TEXT,
    website_url TEXT,
    readme_url TEXT,
    license TEXT,
    contributors JSONB,
    csp_exceptions JSONB,
    categories JSONB,
    downloads INTEGER DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0,
    aum INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tools_npm_package ON tools(npm_package);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);

-- Enable Row Level Security
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to tools
CREATE POLICY "Public can view tools" ON tools
    FOR SELECT
    USING (true);

-- Policy: Only admins can insert/update tools
CREATE POLICY "Admins can manage tools" ON tools
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
```

## Environment Variables

### Server-Side Only Variables (NOT prefixed with NEXT_PUBLIC_)

These variables are only available on the server and are never exposed to the browser:

```env
# Supabase Service Role Key - NEVER expose this to the client!
# This key bypasses Row Level Security and should only be used in API routes
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin email for notifications (optional)
ADMIN_NOTIFICATION_EMAIL=admin@example.com

# GitHub Token for API rate limits (optional)
GITHUB_TOKEN=your-github-token
```

### Public Variables (prefixed with NEXT_PUBLIC_)

These variables are available in both client and server code:

```env
# Supabase URL and anonymous key (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Site URL for email links
NEXT_PUBLIC_SITE_URL=https://your-site.com
```

### Vercel Deployment

When deploying to Vercel, add these environment variables in the Vercel dashboard:

1. Go to your project settings → Environment Variables
2. Add each variable with appropriate environments (Production, Preview, Development)
3. For `SUPABASE_SERVICE_ROLE_KEY`, ensure it's only added for server-side use

**Important Security Notes:**
- `SUPABASE_SERVICE_ROLE_KEY` is automatically excluded from client bundles by Next.js because it doesn't have the `NEXT_PUBLIC_` prefix
- Never log or expose the service role key in client-side code
- The service role key should only be used in API routes (`/api/*`) and server components

⚠️ **Warning**: Never prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_` as this would expose it to the browser!
