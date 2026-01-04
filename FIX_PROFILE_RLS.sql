-- ============================================
-- FIX PROFILE RLS POLICIES
-- ============================================
-- This script fixes RLS policies for profiles table
-- Run this in Supabase SQL Editor

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. Create SELECT policy
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- 3. Create INSERT policy
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 4. Create UPDATE policy (with both USING and WITH CHECK)
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Verify policies exist
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY policyname;

-- 6. Test the policy (replace with your user ID)
-- SELECT auth.uid(); -- Check your user ID
-- UPDATE public.profiles 
-- SET full_name = 'Test', bio = 'Test bio'
-- WHERE id = auth.uid(); -- This should work if policy is correct

