-- Add attachments field to assignments table
-- This stores Google Classroom assignment materials/attachments (files, links, YouTube videos, etc.)

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN public.assignments.attachments IS 'Google Classroom assignment materials/attachments (files, links, YouTube videos, forms, etc.) stored as JSONB array';

