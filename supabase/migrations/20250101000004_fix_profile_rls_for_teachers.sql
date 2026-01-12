-- ============================================
-- Fix Profile RLS to allow teachers to view student profiles
-- ============================================
-- Teachers need to view student profiles for their courses
-- Students need to view teacher profiles for their courses

-- Drop existing profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a helper function to check if user is teacher of a course with a student
CREATE OR REPLACE FUNCTION public.user_is_teacher_of_student(student_uuid UUID, teacher_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    JOIN public.courses c ON c.id = ce.course_id
    WHERE ce.student_id = student_uuid
    AND c.teacher_id = teacher_uuid
  );
$$;

-- Create a helper function to check if user is student in a course with a teacher
CREATE OR REPLACE FUNCTION public.user_is_student_of_teacher(teacher_uuid UUID, student_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    JOIN public.courses c ON c.id = ce.course_id
    WHERE ce.student_id = student_uuid
    AND c.teacher_id = teacher_uuid
  );
$$;

-- Recreate profile SELECT policy to allow:
-- 1. Users to view their own profile
-- 2. Teachers to view student profiles in their courses
-- 3. Students to view teacher profiles in their courses
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    -- Users can view their own profile
    id = auth.uid()
    OR
    -- Teachers can view student profiles in their courses
    public.user_is_teacher_of_student(id, auth.uid())
    OR
    -- Students can view teacher profiles in their courses
    (id IN (SELECT teacher_id FROM public.courses WHERE id IN (
      SELECT course_id FROM public.course_enrollments WHERE student_id = auth.uid()
    )))
  );

