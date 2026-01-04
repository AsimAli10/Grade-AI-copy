-- ============================================
-- GradeAI Complete Database Schema Migration
-- ============================================
-- This migration creates all tables needed for GradeAI
-- Run this single migration on a fresh Supabase database

-- ============================================
-- 1. CREATE ENUMS
-- ============================================
CREATE TYPE public.user_role AS ENUM ('admin', 'teacher', 'student');

CREATE TYPE public.assignment_type AS ENUM ('essay', 'code', 'math', 'multiple_choice', 'short_answer', 'file_upload');

CREATE TYPE public.submission_status AS ENUM ('draft', 'submitted', 'graded', 'needs_review', 'flagged', 'returned');

CREATE TYPE public.grade_status AS ENUM ('ai_graded', 'teacher_reviewed', 'accepted', 'modified', 'rejected');

CREATE TYPE public.ai_confidence AS ENUM ('low', 'medium', 'high');

CREATE TYPE public.sync_status AS ENUM ('pending', 'syncing', 'synced', 'error', 'expired');

-- Keep subscription_type enum for platform subscriptions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'subscription_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.subscription_type AS ENUM ('free', 'premium');
  END IF;
END$$;

-- ============================================
-- 2. CREATE PROFILES TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role public.user_role NOT NULL DEFAULT 'teacher',
  organization_id UUID,
  google_classroom_id TEXT,
  google_email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. CREATE PLATFORM PLANS TABLE (for subscriptions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.platform_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  interval TEXT NOT NULL DEFAULT 'month',
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  stripe_price_id TEXT,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. CREATE PLATFORM SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_type public.subscription_type NOT NULL DEFAULT 'free',
  platform_plan_id UUID REFERENCES public.platform_plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  billing_cycle TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- 5. ORGANIZATIONS (Multi-tenant support)
-- ============================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  subscription_quota INTEGER DEFAULT 1000,
  llm_usage_count INTEGER DEFAULT 0,
  llm_model TEXT DEFAULT 'gpt-4',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key to profiles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ============================================
-- 6. GOOGLE CLASSROOM INTEGRATIONS
-- ============================================
CREATE TABLE public.google_classroom_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  google_classroom_id TEXT NOT NULL,
  sync_status public.sync_status NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- 7. COURSES
-- ============================================
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  google_classroom_course_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  section TEXT,
  room TEXT,
  enrollment_code TEXT,
  student_count INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 8. COURSE ENROLLMENTS
-- ============================================
CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  google_classroom_user_id TEXT,
  enrollment_status TEXT DEFAULT 'active',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- ============================================
-- 9. RUBRICS
-- ============================================
CREATE TABLE public.rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL,
  total_points DECIMAL(10,2) NOT NULL DEFAULT 100,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 10. ASSIGNMENTS
-- ============================================
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  google_classroom_assignment_id TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  assignment_type public.assignment_type NOT NULL DEFAULT 'essay',
  max_points DECIMAL(10,2) NOT NULL DEFAULT 100,
  due_date TIMESTAMPTZ,
  rubric_id UUID REFERENCES public.rubrics(id) ON DELETE SET NULL,
  test_cases JSONB,
  sync_status public.sync_status NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 11. SUBMISSIONS
-- ============================================
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  google_classroom_submission_id TEXT UNIQUE,
  content TEXT,
  file_urls TEXT[],
  code_content TEXT,
  status public.submission_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- ============================================
-- 12. GRADES
-- ============================================
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  overall_score DECIMAL(10,2) NOT NULL,
  max_score DECIMAL(10,2) NOT NULL,
  criterion_scores JSONB NOT NULL,
  ai_explanations JSONB,
  evidence_highlights JSONB,
  ai_confidence public.ai_confidence,
  grade_status public.grade_status NOT NULL DEFAULT 'ai_graded',
  graded_by UUID REFERENCES public.profiles(id),
  teacher_notes TEXT,
  student_comment TEXT,
  flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 13. GRADE HISTORY
-- ============================================
CREATE TABLE public.grade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_score DECIMAL(10,2),
  new_score DECIMAL(10,2),
  changed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 14. ANALYTICS
-- ============================================
CREATE TABLE public.analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_data JSONB NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 15. QUIZZES
-- ============================================
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  time_limit_minutes INTEGER,
  max_attempts INTEGER DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 16. QUIZ ATTEMPTS
-- ============================================
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score DECIMAL(10,2),
  max_score DECIMAL(10,2),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  UNIQUE(quiz_id, student_id, started_at)
);

-- ============================================
-- 17. FORUMS
-- ============================================
CREATE TABLE public.forums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 18. FORUM MESSAGES
-- ============================================
CREATE TABLE public.forum_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID NOT NULL REFERENCES public.forums(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_message_id UUID REFERENCES public.forum_messages(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  pinned_rubric_id UUID REFERENCES public.rubrics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 19. INDEXES
-- ============================================
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_courses_teacher_id ON public.courses(teacher_id);
CREATE INDEX idx_courses_organization_id ON public.courses(organization_id);
CREATE INDEX idx_course_enrollments_course_id ON public.course_enrollments(course_id);
CREATE INDEX idx_course_enrollments_student_id ON public.course_enrollments(student_id);
CREATE INDEX idx_assignments_course_id ON public.assignments(course_id);
CREATE INDEX idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX idx_grades_submission_id ON public.grades(submission_id);
CREATE INDEX idx_analytics_course_id ON public.analytics(course_id);
CREATE INDEX idx_analytics_assignment_id ON public.analytics(assignment_id);
CREATE INDEX idx_forum_messages_forum_id ON public.forum_messages(forum_id);
CREATE INDEX idx_forum_messages_author_id ON public.forum_messages(author_id);

-- ============================================
-- 20. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_classroom_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 21. RLS POLICIES
-- ============================================

-- Profiles: Users can view and update own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Organizations: Users can view their organization
CREATE POLICY "Users can view own organization" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- Platform Plans: Public read access
CREATE POLICY "Public can read platform plans" ON public.platform_plans
  FOR SELECT USING (is_active = TRUE);

-- Platform Subscriptions: Users can manage own
CREATE POLICY "Users can manage own subscription" ON public.platform_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Google Classroom Integrations: Users can manage own
CREATE POLICY "Users can manage own integration" ON public.google_classroom_integrations
  FOR ALL USING (auth.uid() = user_id);

-- Courses: Teachers can manage, students can view enrolled
CREATE POLICY "Teachers can manage own courses" ON public.courses
  FOR ALL USING (
    teacher_id = auth.uid() OR
    id IN (
      SELECT course_id FROM public.course_enrollments 
      WHERE student_id = auth.uid()
    )
  );

-- Course Enrollments: Teachers can manage, students can view own
CREATE POLICY "Manage course enrollments" ON public.course_enrollments
  FOR ALL USING (
    student_id = auth.uid() OR
    course_id IN (SELECT id FROM public.courses WHERE teacher_id = auth.uid())
  );

-- Assignments: Teachers can manage, students can view
CREATE POLICY "Manage assignments" ON public.assignments
  FOR ALL USING (
    course_id IN (
      SELECT id FROM public.courses 
      WHERE teacher_id = auth.uid() OR 
      id IN (SELECT course_id FROM public.course_enrollments WHERE student_id = auth.uid())
    )
  );

-- Rubrics: Users in same organization can view, creators can manage
CREATE POLICY "Manage rubrics" ON public.rubrics
  FOR ALL USING (
    created_by = auth.uid() OR
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- Submissions: Students can manage own, teachers can view course submissions
CREATE POLICY "Manage submissions" ON public.submissions
  FOR ALL USING (
    student_id = auth.uid() OR
    assignment_id IN (
      SELECT id FROM public.assignments 
      WHERE course_id IN (
        SELECT id FROM public.courses WHERE teacher_id = auth.uid()
      )
    )
  );

-- Grades: Students can view own, teachers can manage
CREATE POLICY "Manage grades" ON public.grades
  FOR ALL USING (
    submission_id IN (
      SELECT id FROM public.submissions WHERE student_id = auth.uid()
    ) OR
    submission_id IN (
      SELECT id FROM public.submissions 
      WHERE assignment_id IN (
        SELECT id FROM public.assignments 
        WHERE course_id IN (
          SELECT id FROM public.courses WHERE teacher_id = auth.uid()
        )
      )
    )
  );

-- Grade History: Same as grades
CREATE POLICY "View grade history" ON public.grade_history
  FOR SELECT USING (
    grade_id IN (
      SELECT id FROM public.grades 
      WHERE submission_id IN (
        SELECT id FROM public.submissions WHERE student_id = auth.uid()
      ) OR
      submission_id IN (
        SELECT id FROM public.submissions 
        WHERE assignment_id IN (
          SELECT id FROM public.assignments 
          WHERE course_id IN (
            SELECT id FROM public.courses WHERE teacher_id = auth.uid()
          )
        )
      )
    )
  );

-- Analytics: Teachers and admins can view
CREATE POLICY "View analytics" ON public.analytics
  FOR SELECT USING (
    course_id IN (SELECT id FROM public.courses WHERE teacher_id = auth.uid()) OR
    student_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Quizzes: Teachers can manage, students can view published
CREATE POLICY "Manage quizzes" ON public.quizzes
  FOR ALL USING (
    created_by = auth.uid() OR
    (is_published = TRUE AND course_id IN (
      SELECT course_id FROM public.course_enrollments WHERE student_id = auth.uid()
    ))
  );

-- Quiz Attempts: Students can manage own, teachers can view
CREATE POLICY "Manage quiz attempts" ON public.quiz_attempts
  FOR ALL USING (
    student_id = auth.uid() OR
    quiz_id IN (
      SELECT id FROM public.quizzes 
      WHERE course_id IN (
        SELECT id FROM public.courses WHERE teacher_id = auth.uid()
      )
    )
  );

-- Forums: Users in organization/course can view and post
CREATE POLICY "Manage forums" ON public.forums
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    course_id IN (
      SELECT course_id FROM public.course_enrollments WHERE student_id = auth.uid()
    ) OR
    course_id IN (SELECT id FROM public.courses WHERE teacher_id = auth.uid())
  );

-- Forum Messages: Users can view and post in accessible forums
CREATE POLICY "Manage forum messages" ON public.forum_messages
  FOR ALL USING (
    forum_id IN (
      SELECT id FROM public.forums 
      WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
      course_id IN (
        SELECT course_id FROM public.course_enrollments WHERE student_id = auth.uid()
      ) OR
      course_id IN (SELECT id FROM public.courses WHERE teacher_id = auth.uid())
    )
  );

-- ============================================
-- 22. TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_plans_updated_at BEFORE UPDATE ON public.platform_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_subscriptions_updated_at BEFORE UPDATE ON public.platform_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_classroom_integrations_updated_at BEFORE UPDATE ON public.google_classroom_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rubrics_updated_at BEFORE UPDATE ON public.rubrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forums_updated_at BEFORE UPDATE ON public.forums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_messages_updated_at BEFORE UPDATE ON public.forum_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 23. FUNCTION TO UPDATE STUDENT COUNT
-- ============================================
CREATE OR REPLACE FUNCTION update_course_student_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.courses
    SET student_count = (
      SELECT COUNT(*) FROM public.course_enrollments 
      WHERE course_id = NEW.course_id AND enrollment_status = 'active'
    )
    WHERE id = NEW.course_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.courses
    SET student_count = (
      SELECT COUNT(*) FROM public.course_enrollments 
      WHERE course_id = OLD.course_id AND enrollment_status = 'active'
    )
    WHERE id = OLD.course_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.courses
    SET student_count = (
      SELECT COUNT(*) FROM public.course_enrollments 
      WHERE course_id = NEW.course_id AND enrollment_status = 'active'
    )
    WHERE id = NEW.course_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_course_student_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_course_student_count();
