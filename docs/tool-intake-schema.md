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

### Convert approved intake to tool
```sql
-- First, insert into tools table
INSERT INTO tools (
    name,
    description,
    icon,
    category,
    author,
    version,
    last_updated
)
SELECT 
    display_name,
    description,
    configurations->>'iconUrl',
    configurations->'categories'->>0,
    contributors->0->>'name',
    version,
    NOW()
FROM tool_intakes
WHERE id = 'INTAKE_UUID' AND status = 'approved';

-- Then, update the intake status
UPDATE tool_intakes 
SET status = 'converted_to_tool' 
WHERE id = 'INTAKE_UUID';
```

## Service Role Key

The API route requires the `SUPABASE_SERVICE_ROLE_KEY` environment variable to be set. This key bypasses Row Level Security and should only be used on the server side.

Add to your `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

⚠️ **Warning**: Never expose the service role key on the client side!
