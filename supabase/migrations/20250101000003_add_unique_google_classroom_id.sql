-- ============================================
-- Add unique constraint on google_classroom_id
-- This prevents multiple users from connecting the same Google Classroom account
-- ============================================

-- First, remove any duplicate entries (keep the oldest one)
-- This is a safety measure in case duplicates already exist
WITH duplicates AS (
  SELECT 
    id,
    google_classroom_id,
    user_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY google_classroom_id 
      ORDER BY created_at ASC
    ) as row_num
  FROM public.google_classroom_integrations
)
DELETE FROM public.google_classroom_integrations
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Add unique constraint on google_classroom_id
-- This will prevent future duplicates at the database level
ALTER TABLE public.google_classroom_integrations
ADD CONSTRAINT google_classroom_integrations_google_classroom_id_unique 
UNIQUE (google_classroom_id);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT google_classroom_integrations_google_classroom_id_unique 
ON public.google_classroom_integrations IS 
'Ensures each Google Classroom account can only be connected to one GradeAI user account';

