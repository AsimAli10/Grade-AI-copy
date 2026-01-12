-- Add Google Classroom quiz ID to quizzes table
-- This allows tracking which quizzes were synced from Google Classroom

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS google_classroom_quiz_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quizzes_gc_quiz_id ON public.quizzes(google_classroom_quiz_id);

-- Add comment
COMMENT ON COLUMN public.quizzes.google_classroom_quiz_id IS 'Google Classroom coursework ID for quizzes synced from Google Classroom';

