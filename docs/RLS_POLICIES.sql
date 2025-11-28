-- Row Level Security (RLS) Policies for Categories, Authors, and Join Tables
-- These policies allow public read access (anon and authenticated users)
-- while restricting write operations

-- ============================================
-- CATEGORIES TABLE
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow select for anon" ON public.categories;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.categories;

-- Allow anonymous users to select categories
CREATE POLICY "Allow select for anon" ON public.categories
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to select categories
CREATE POLICY "Allow select for authenticated" ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- TOOL_CATEGORIES TABLE (Join Table)
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow select for anon" ON public.tool_categories;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.tool_categories;

-- Allow anonymous users to select tool categories
CREATE POLICY "Allow select for anon" ON public.tool_categories
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to select tool categories
CREATE POLICY "Allow select for authenticated" ON public.tool_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- TOOL_INTAKE_CATEGORIES TABLE (Join Table)
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow select for anon" ON public.tool_intake_categories;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.tool_intake_categories;

-- Allow anonymous users to select tool intake categories
CREATE POLICY "Allow select for anon" ON public.tool_intake_categories
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to select tool intake categories
CREATE POLICY "Allow select for authenticated" ON public.tool_intake_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- AUTHORS TABLE
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow select for anon" ON public.authors;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.authors;

-- Allow anonymous users to select authors
CREATE POLICY "Allow select for anon" ON public.authors
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to select authors
CREATE POLICY "Allow select for authenticated" ON public.authors
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- TOOL_AUTHORS TABLE (Join Table)
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow select for anon" ON public.tool_authors;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.tool_authors;

-- Allow anonymous users to select tool authors
CREATE POLICY "Allow select for anon" ON public.tool_authors
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to select tool authors
CREATE POLICY "Allow select for authenticated" ON public.tool_authors
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- TOOL_INTAKE_AUTHORS TABLE (Join Table)
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow select for anon" ON public.tool_intake_authors;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.tool_intake_authors;

-- Allow anonymous users to select tool intake authors
CREATE POLICY "Allow select for anon" ON public.tool_intake_authors
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to select tool intake authors
CREATE POLICY "Allow select for authenticated" ON public.tool_intake_authors
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- View all policies for these tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN (
    'categories',
    'tool_categories', 
    'tool_intake_categories',
    'authors',
    'tool_authors',
    'tool_intake_authors'
)
ORDER BY tablename, policyname;
