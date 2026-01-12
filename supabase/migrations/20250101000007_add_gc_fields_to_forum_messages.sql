-- Add Google Classroom specific fields to forum_messages table
-- This allows forum_messages to store both GradeAI forum posts and GC announcements

ALTER TABLE public.forum_messages
  ADD COLUMN IF NOT EXISTS google_classroom_announcement_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS google_classroom_alternate_link TEXT,
  ADD COLUMN IF NOT EXISTS google_classroom_materials JSONB,
  ADD COLUMN IF NOT EXISTS google_classroom_state TEXT,
  ADD COLUMN IF NOT EXISTS google_classroom_creation_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_classroom_update_time TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_forum_messages_gc_announcement_id ON public.forum_messages(google_classroom_announcement_id);

-- Add comment to explain the dual purpose
COMMENT ON COLUMN public.forum_messages.google_classroom_announcement_id IS 'If set, this message is a Google Classroom announcement. Otherwise, it is a GradeAI forum post.';

