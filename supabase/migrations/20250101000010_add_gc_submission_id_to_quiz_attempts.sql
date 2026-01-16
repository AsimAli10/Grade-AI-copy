-- Add Google Classroom submission ID to quiz_attempts
-- This allows tracking which quiz attempts were synced from Google Classroom

ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS google_classroom_submission_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_gc_submission_id ON public.quiz_attempts(google_classroom_submission_id);

-- Add comment
COMMENT ON COLUMN public.quiz_attempts.google_classroom_submission_id IS 'Google Classroom student submission ID for quiz attempts synced from Google Classroom';

