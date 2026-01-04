# How to Run the Widget Tracking Migration

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/20250130000000_widget_tracking.sql`
5. Click **Run** or press `Ctrl+Enter` (or `Cmd+Enter` on Mac)

## Option 2: Using Supabase CLI

If you have Supabase CLI installed locally:

```bash
# Apply the migration
supabase migration up
```

## Option 3: Copy SQL Directly

Here's the SQL to run directly in your Supabase SQL Editor:

```sql
-- Create widget_sites table to track where widgets are embedded
CREATE TABLE IF NOT EXISTS public.widget_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  site_name TEXT,
  widget_id TEXT NOT NULL REFERENCES public.widget_settings(widget_id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, site_url)
);

-- Create widget_api_calls table to track API usage
CREATE TABLE IF NOT EXISTS public.widget_api_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id TEXT NOT NULL REFERENCES public.widget_settings(widget_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  site_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  call_type TEXT NOT NULL DEFAULT 'scan',
  status TEXT NOT NULL DEFAULT 'success',
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_widget_api_calls_widget_id ON public.widget_api_calls(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_api_calls_user_id ON public.widget_api_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_widget_api_calls_created_at ON public.widget_api_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_widget_sites_user_id ON public.widget_sites(user_id);

-- Enable RLS
ALTER TABLE public.widget_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_api_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for widget_sites
CREATE POLICY "Users can view own widget sites" ON public.widget_sites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own widget sites" ON public.widget_sites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own widget sites" ON public.widget_sites
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own widget sites" ON public.widget_sites
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for widget_api_calls
CREATE POLICY "Users can view own widget API calls" ON public.widget_api_calls
  FOR SELECT USING (auth.uid() = user_id);

-- Allow anonymous inserts for widget usage tracking (from embedded widgets)
CREATE POLICY "Allow widget API call inserts" ON public.widget_api_calls
  FOR INSERT WITH CHECK (true);
```

## Troubleshooting

### If you get "relation already exists" errors:
The tables might already exist. The migration uses `CREATE TABLE IF NOT EXISTS`, so it should be safe to run. If you still get errors, the tables already exist and you can skip those parts.

### If you get "foreign key constraint" errors:
Make sure the `widget_settings` table exists first. Check the original migration file `20251029081307_5059b548-0000-4011-a8f3-8f7581041cf3.sql`.

### To check if migration ran successfully:
Run this in SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('widget_sites', 'widget_api_calls');
```

Both tables should appear in the results.

