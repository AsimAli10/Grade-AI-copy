/**
 * GradeAI Database Models
 * TypeScript type definitions for all database tables
 */

// ============================================
// ENUMS
// ============================================
export type UserRole = 'admin' | 'teacher' | 'student';
export type AssignmentType = 'essay' | 'code' | 'math' | 'multiple_choice' | 'short_answer' | 'file_upload';
export type SubmissionStatus = 'draft' | 'submitted' | 'graded' | 'needs_review' | 'flagged' | 'returned';
export type GradeStatus = 'ai_graded' | 'teacher_reviewed' | 'accepted' | 'modified' | 'rejected';
export type AIConfidence = 'low' | 'medium' | 'high';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error' | 'expired';
export type SubscriptionType = 'free' | 'premium';

// ============================================
// RUBRIC CRITERIA
// ============================================
export interface RubricCriterion {
  name: string;
  weight: number; // Percentage (0-100)
  description: string;
  examples?: string[];
  max_points?: number;
}

// ============================================
// DATABASE MODELS
// ============================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  organization_id: string | null;
  google_classroom_id: string | null;
  google_email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  domain: string | null;
  subscription_quota: number;
  llm_usage_count: number;
  llm_model: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformPlan {
  id: string;
  name: string;
  price_cents: number;
  interval: string;
  description: string | null;
  features: string[];
  stripe_price_id: string | null;
  billing_cycle: string;
  is_active: boolean;
  is_popular: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformSubscription {
  id: string;
  user_id: string;
  subscription_type: SubscriptionType;
  platform_plan_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  billing_cycle: string | null;
  is_active: boolean;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleClassroomIntegration {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  google_classroom_id: string;
  sync_status: SyncStatus;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  organization_id: string | null;
  teacher_id: string;
  google_classroom_course_id: string | null;
  name: string;
  description: string | null;
  subject: string | null;
  section: string | null;
  room: string | null;
  enrollment_code: string | null;
  student_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;
  student_id: string;
  google_classroom_user_id: string | null;
  enrollment_status: string;
  enrolled_at: string;
}

export interface Rubric {
  id: string;
  organization_id: string | null;
  created_by: string;
  name: string;
  description: string | null;
  criteria: RubricCriterion[];
  total_points: number;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  google_classroom_assignment_id: string | null;
  title: string;
  description: string | null;
  assignment_type: AssignmentType;
  max_points: number;
  due_date: string | null;
  rubric_id: string | null;
  test_cases: Record<string, any> | null; // For code assignments
  sync_status: SyncStatus;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  google_classroom_submission_id: string | null;
  content: string | null;
  file_urls: string[];
  code_content: string | null;
  status: SubmissionStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: string;
  submission_id: string;
  overall_score: number;
  max_score: number;
  criterion_scores: Record<string, number>;
  ai_explanations: Record<string, string> | null;
  evidence_highlights: Record<string, string[]> | null;
  ai_confidence: AIConfidence | null;
  grade_status: GradeStatus;
  graded_by: string | null;
  teacher_notes: string | null;
  student_comment: string | null;
  flagged_for_review: boolean;
  flag_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface GradeHistory {
  id: string;
  grade_id: string;
  action: string;
  previous_score: number | null;
  new_score: number | null;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Analytics {
  id: string;
  organization_id: string | null;
  course_id: string | null;
  assignment_id: string | null;
  student_id: string | null;
  metric_type: string;
  metric_data: Record<string, any>;
  calculated_at: string;
  created_at: string;
}

export interface Quiz {
  id: string;
  course_id: string;
  created_by: string;
  title: string;
  description: string | null;
  questions: QuizQuestion[];
  time_limit_minutes: number | null;
  max_attempts: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'short_answer' | 'essay' | 'code';
  question: string;
  options?: string[]; // For multiple choice
  correct_answer?: string | string[];
  points: number;
  explanation?: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  answers: Record<string, any>;
  score: number | null;
  max_score: number | null;
  started_at: string;
  submitted_at: string | null;
}

export interface Forum {
  id: string;
  organization_id: string | null;
  course_id: string | null;
  name: string;
  description: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ForumMessage {
  id: string;
  forum_id: string;
  author_id: string;
  parent_message_id: string | null;
  content: string;
  is_pinned: boolean;
  pinned_rubric_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// INSERT TYPES (for creating new records)
// ============================================
export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
export type OrganizationInsert = Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
export type CourseInsert = Omit<Course, 'id' | 'created_at' | 'updated_at' | 'student_count'>;
export type AssignmentInsert = Omit<Assignment, 'id' | 'created_at' | 'updated_at'>;
export type SubmissionInsert = Omit<Submission, 'id' | 'created_at' | 'updated_at'>;
export type GradeInsert = Omit<Grade, 'id' | 'created_at' | 'updated_at'>;
export type RubricInsert = Omit<Rubric, 'id' | 'created_at' | 'updated_at'>;

// ============================================
// UPDATE TYPES (for partial updates)
// ============================================
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>;
export type CourseUpdate = Partial<Omit<Course, 'id' | 'created_at'>>;
export type AssignmentUpdate = Partial<Omit<Assignment, 'id' | 'created_at'>>;
export type SubmissionUpdate = Partial<Omit<Submission, 'id' | 'created_at'>>;
export type GradeUpdate = Partial<Omit<Grade, 'id' | 'created_at'>>;


