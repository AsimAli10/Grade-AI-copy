-- ============================================
-- Fix infinite recursion in courses RLS policy
-- ============================================
-- The issue: courses policy checks course_enrollments, 
-- and course_enrollments policy checks courses, causing infinite recursion
-- Solution: Use security definer functions to break the cycle

-- Drop the existing policies
DROP POLICY IF EXISTS "Teachers can manage own courses" ON public.courses;
DROP POLICY IF EXISTS "Manage course enrollments" ON public.course_enrollments;

-- Create a helper function to check if user is enrolled (bypasses RLS for the check)
CREATE OR REPLACE FUNCTION public.user_is_enrolled_in_course(course_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_enrollments 
    WHERE course_id = course_uuid 
    AND student_id = user_uuid
  );
$$;

-- Create a helper function to check if user is teacher of course (bypasses RLS for the check)
CREATE OR REPLACE FUNCTION public.user_is_teacher_of_course(course_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_uuid 
    AND teacher_id = user_uuid
  );
$$;

-- Recreate courses policy using helper function to avoid recursion
CREATE POLICY "Teachers can manage own courses" ON public.courses
  FOR ALL USING (
    -- Teachers can manage their own courses
    teacher_id = auth.uid() 
    OR
    -- Students can view courses they're enrolled in (using helper function to avoid recursion)
    public.user_is_enrolled_in_course(id, auth.uid())
  );

-- Recreate course_enrollments policy using helper function to avoid recursion
CREATE POLICY "Manage course enrollments" ON public.course_enrollments
  FOR ALL USING (
    -- Students can manage their own enrollments
    student_id = auth.uid() 
    OR
    -- Teachers can manage enrollments for courses where they are the teacher
    public.user_is_teacher_of_course(course_id, auth.uid())
  );

