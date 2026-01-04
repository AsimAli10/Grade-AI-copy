/**
 * GradeAI Database Schema Definitions
 * This file defines the complete database schema that can be used to:
 * - Generate SQL migrations
 * - Create tables programmatically
 * - Validate schema consistency
 */

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  default?: string | number | boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  };
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes?: Array<{
    name: string;
    columns: string[];
    unique?: boolean;
  }>;
}

export interface EnumDefinition {
  name: string;
  values: string[];
}

// ============================================
// ENUMS
// ============================================
export const enums: EnumDefinition[] = [
  {
    name: 'user_role',
    values: ['admin', 'teacher', 'student'],
  },
  {
    name: 'assignment_type',
    values: ['essay', 'code', 'math', 'multiple_choice', 'short_answer', 'file_upload'],
  },
  {
    name: 'submission_status',
    values: ['draft', 'submitted', 'graded', 'needs_review', 'flagged', 'returned'],
  },
  {
    name: 'grade_status',
    values: ['ai_graded', 'teacher_reviewed', 'accepted', 'modified', 'rejected'],
  },
  {
    name: 'ai_confidence',
    values: ['low', 'medium', 'high'],
  },
  {
    name: 'sync_status',
    values: ['pending', 'syncing', 'synced', 'error', 'expired'],
  },
  {
    name: 'subscription_type',
    values: ['free', 'premium'],
  },
];

// ============================================
// TABLES
// ============================================
export const tables: TableDefinition[] = [
  // Profiles
  {
    name: 'profiles',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, references: { table: 'auth.users', column: 'id', onDelete: 'CASCADE' } },
      { name: 'email', type: 'TEXT', nullable: false },
      { name: 'full_name', type: 'TEXT', nullable: true },
      { name: 'role', type: 'user_role', nullable: false, default: "'teacher'" },
      { name: 'organization_id', type: 'UUID', nullable: true, references: { table: 'organizations', column: 'id', onDelete: 'SET NULL' } },
      { name: 'google_classroom_id', type: 'TEXT', nullable: true },
      { name: 'google_email', type: 'TEXT', nullable: true },
      { name: 'avatar_url', type: 'TEXT', nullable: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
    indexes: [
      { name: 'idx_profiles_organization_id', columns: ['organization_id'] },
      { name: 'idx_profiles_role', columns: ['role'] },
    ],
  },

  // Organizations
  {
    name: 'organizations',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'name', type: 'TEXT', nullable: false },
      { name: 'domain', type: 'TEXT', nullable: true },
      { name: 'subscription_quota', type: 'INTEGER', nullable: false, default: 1000 },
      { name: 'llm_usage_count', type: 'INTEGER', nullable: false, default: 0 },
      { name: 'llm_model', type: 'TEXT', nullable: false, default: "'gpt-4'" },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
  },

  // Platform Plans
  {
    name: 'platform_plans',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'name', type: 'TEXT', nullable: false },
      { name: 'price_cents', type: 'INTEGER', nullable: false, default: 0 },
      { name: 'interval', type: 'TEXT', nullable: false, default: "'month'" },
      { name: 'description', type: 'TEXT', nullable: true },
      { name: 'features', type: 'JSONB', nullable: false, default: "'[]'::jsonb" },
      { name: 'stripe_price_id', type: 'TEXT', nullable: true },
      { name: 'billing_cycle', type: 'TEXT', nullable: false, default: "'monthly'" },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, default: true },
      { name: 'is_popular', type: 'BOOLEAN', nullable: false, default: false },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
  },

  // Platform Subscriptions
  {
    name: 'platform_subscriptions',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'UUID', nullable: false, unique: true, references: { table: 'profiles', column: 'id', onDelete: 'CASCADE' } },
      { name: 'subscription_type', type: 'subscription_type', nullable: false, default: "'free'" },
      { name: 'platform_plan_id', type: 'UUID', nullable: true, references: { table: 'platform_plans', column: 'id' } },
      { name: 'stripe_customer_id', type: 'TEXT', nullable: true },
      { name: 'stripe_subscription_id', type: 'TEXT', nullable: true },
      { name: 'stripe_price_id', type: 'TEXT', nullable: true },
      { name: 'billing_cycle', type: 'TEXT', nullable: true },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, default: true },
      { name: 'current_period_end', type: 'TIMESTAMPTZ', nullable: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
  },

  // Google Classroom Integrations
  {
    name: 'google_classroom_integrations',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'UUID', nullable: false, unique: true, references: { table: 'profiles', column: 'id', onDelete: 'CASCADE' } },
      { name: 'access_token', type: 'TEXT', nullable: false },
      { name: 'refresh_token', type: 'TEXT', nullable: false },
      { name: 'token_expires_at', type: 'TIMESTAMPTZ', nullable: false },
      { name: 'google_classroom_id', type: 'TEXT', nullable: false },
      { name: 'sync_status', type: 'sync_status', nullable: false, default: "'pending'" },
      { name: 'last_sync_at', type: 'TIMESTAMPTZ', nullable: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
  },

  // Courses
  {
    name: 'courses',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'organization_id', type: 'UUID', nullable: true, references: { table: 'organizations', column: 'id', onDelete: 'CASCADE' } },
      { name: 'teacher_id', type: 'UUID', nullable: false, references: { table: 'profiles', column: 'id', onDelete: 'CASCADE' } },
      { name: 'google_classroom_course_id', type: 'TEXT', nullable: true, unique: true },
      { name: 'name', type: 'TEXT', nullable: false },
      { name: 'description', type: 'TEXT', nullable: true },
      { name: 'subject', type: 'TEXT', nullable: true },
      { name: 'section', type: 'TEXT', nullable: true },
      { name: 'room', type: 'TEXT', nullable: true },
      { name: 'enrollment_code', type: 'TEXT', nullable: true },
      { name: 'student_count', type: 'INTEGER', nullable: false, default: 0 },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, default: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
    indexes: [
      { name: 'idx_courses_teacher_id', columns: ['teacher_id'] },
      { name: 'idx_courses_organization_id', columns: ['organization_id'] },
    ],
  },

  // Course Enrollments
  {
    name: 'course_enrollments',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'course_id', type: 'UUID', nullable: false, references: { table: 'courses', column: 'id', onDelete: 'CASCADE' } },
      { name: 'student_id', type: 'UUID', nullable: false, references: { table: 'profiles', column: 'id', onDelete: 'CASCADE' } },
      { name: 'google_classroom_user_id', type: 'TEXT', nullable: true },
      { name: 'enrollment_status', type: 'TEXT', nullable: false, default: "'active'" },
      { name: 'enrolled_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
    indexes: [
      { name: 'idx_course_enrollments_course_id', columns: ['course_id'] },
      { name: 'idx_course_enrollments_student_id', columns: ['student_id'] },
    ],
  },

  // Rubrics
  {
    name: 'rubrics',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'organization_id', type: 'UUID', nullable: true, references: { table: 'organizations', column: 'id', onDelete: 'CASCADE' } },
      { name: 'created_by', type: 'UUID', nullable: false, references: { table: 'profiles', column: 'id', onDelete: 'CASCADE' } },
      { name: 'name', type: 'TEXT', nullable: false },
      { name: 'description', type: 'TEXT', nullable: true },
      { name: 'criteria', type: 'JSONB', nullable: false },
      { name: 'total_points', type: 'DECIMAL(10,2)', nullable: false, default: 100 },
      { name: 'is_template', type: 'BOOLEAN', nullable: false, default: false },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
  },

  // Assignments
  {
    name: 'assignments',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'course_id', type: 'UUID', nullable: false, references: { table: 'courses', column: 'id', onDelete: 'CASCADE' } },
      { name: 'google_classroom_assignment_id', type: 'TEXT', nullable: true, unique: true },
      { name: 'title', type: 'TEXT', nullable: false },
      { name: 'description', type: 'TEXT', nullable: true },
      { name: 'assignment_type', type: 'assignment_type', nullable: false, default: "'essay'" },
      { name: 'max_points', type: 'DECIMAL(10,2)', nullable: false, default: 100 },
      { name: 'due_date', type: 'TIMESTAMPTZ', nullable: true },
      { name: 'rubric_id', type: 'UUID', nullable: true, references: { table: 'rubrics', column: 'id', onDelete: 'SET NULL' } },
      { name: 'test_cases', type: 'JSONB', nullable: true },
      { name: 'sync_status', type: 'sync_status', nullable: false, default: "'pending'" },
      { name: 'last_sync_at', type: 'TIMESTAMPTZ', nullable: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
    indexes: [
      { name: 'idx_assignments_course_id', columns: ['course_id'] },
    ],
  },

  // Submissions
  {
    name: 'submissions',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'assignment_id', type: 'UUID', nullable: false, references: { table: 'assignments', column: 'id', onDelete: 'CASCADE' } },
      { name: 'student_id', type: 'UUID', nullable: false, references: { table: 'profiles', column: 'id', onDelete: 'CASCADE' } },
      { name: 'google_classroom_submission_id', type: 'TEXT', nullable: true, unique: true },
      { name: 'content', type: 'TEXT', nullable: true },
      { name: 'file_urls', type: 'TEXT[]', nullable: false, default: "'{}'" },
      { name: 'code_content', type: 'TEXT', nullable: true },
      { name: 'status', type: 'submission_status', nullable: false, default: "'draft'" },
      { name: 'submitted_at', type: 'TIMESTAMPTZ', nullable: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
    indexes: [
      { name: 'idx_submissions_assignment_id', columns: ['assignment_id'] },
      { name: 'idx_submissions_student_id', columns: ['student_id'] },
    ],
  },

  // Grades
  {
    name: 'grades',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'submission_id', type: 'UUID', nullable: false, references: { table: 'submissions', column: 'id', onDelete: 'CASCADE' } },
      { name: 'overall_score', type: 'DECIMAL(10,2)', nullable: false },
      { name: 'max_score', type: 'DECIMAL(10,2)', nullable: false },
      { name: 'criterion_scores', type: 'JSONB', nullable: false },
      { name: 'ai_explanations', type: 'JSONB', nullable: true },
      { name: 'evidence_highlights', type: 'JSONB', nullable: true },
      { name: 'ai_confidence', type: 'ai_confidence', nullable: true },
      { name: 'grade_status', type: 'grade_status', nullable: false, default: "'ai_graded'" },
      { name: 'graded_by', type: 'UUID', nullable: true, references: { table: 'profiles', column: 'id' } },
      { name: 'teacher_notes', type: 'TEXT', nullable: true },
      { name: 'student_comment', type: 'TEXT', nullable: true },
      { name: 'flagged_for_review', type: 'BOOLEAN', nullable: false, default: false },
      { name: 'flag_reason', type: 'TEXT', nullable: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
    indexes: [
      { name: 'idx_grades_submission_id', columns: ['submission_id'] },
    ],
  },

  // Grade History
  {
    name: 'grade_history',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'grade_id', type: 'UUID', nullable: false, references: { table: 'grades', column: 'id', onDelete: 'CASCADE' } },
      { name: 'action', type: 'TEXT', nullable: false },
      { name: 'previous_score', type: 'DECIMAL(10,2)', nullable: true },
      { name: 'new_score', type: 'DECIMAL(10,2)', nullable: true },
      { name: 'changed_by', type: 'UUID', nullable: true, references: { table: 'profiles', column: 'id' } },
      { name: 'notes', type: 'TEXT', nullable: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
  },

  // Analytics
  {
    name: 'analytics',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'organization_id', type: 'UUID', nullable: true, references: { table: 'organizations', column: 'id', onDelete: 'CASCADE' } },
      { name: 'course_id', type: 'UUID', nullable: true, references: { table: 'courses', column: 'id', onDelete: 'CASCADE' } },
      { name: 'assignment_id', type: 'UUID', nullable: true, references: { table: 'assignments', column: 'id', onDelete: 'CASCADE' } },
      { name: 'student_id', type: 'UUID', nullable: true, references: { table: 'profiles', column: 'id', onDelete: 'CASCADE' } },
      { name: 'metric_type', type: 'TEXT', nullable: false },
      { name: 'metric_data', type: 'JSONB', nullable: false },
      { name: 'calculated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
    indexes: [
      { name: 'idx_analytics_course_id', columns: ['course_id'] },
      { name: 'idx_analytics_assignment_id', columns: ['assignment_id'] },
    ],
  },

  // Quizzes
  {
    name: 'quizzes',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'course_id', type: 'UUID', nullable: false, references: { table: 'courses', column: 'id', onDelete: 'CASCADE' } },
      { name: 'created_by', type: 'UUID', nullable: false, references: { table: 'profiles', column: 'id', onDelete: 'CASCADE' } },
      { name: 'title', type: 'TEXT', nullable: false },
      { name: 'description', type: 'TEXT', nullable: true },
      { name: 'questions', type: 'JSONB', nullable: false },
      { name: 'time_limit_minutes', type: 'INTEGER', nullable: true },
      { name: 'max_attempts', type: 'INTEGER', nullable: false, default: 1 },
      { name: 'is_published', type: 'BOOLEAN', nullable: false, default: false },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
  },

  // Quiz Attempts
  {
    name: 'quiz_attempts',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'quiz_id', type: 'UUID', nullable: false, references: { table: 'quizzes', column: 'id', onDelete: 'CASCADE' } },
      { name: 'student_id', type: 'UUID', nullable: false, references: { table: 'profiles', column: 'id', onDelete: 'CASCADE' } },
      { name: 'answers', type: 'JSONB', nullable: false },
      { name: 'score', type: 'DECIMAL(10,2)', nullable: true },
      { name: 'max_score', type: 'DECIMAL(10,2)', nullable: true },
      { name: 'started_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'submitted_at', type: 'TIMESTAMPTZ', nullable: true },
    ],
    indexes: [
      { name: 'idx_quiz_attempts_unique', columns: ['quiz_id', 'student_id', 'started_at'], unique: true },
    ],
  },

  // Forums
  {
    name: 'forums',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'organization_id', type: 'UUID', nullable: true, references: { table: 'organizations', column: 'id', onDelete: 'CASCADE' } },
      { name: 'course_id', type: 'UUID', nullable: true, references: { table: 'courses', column: 'id', onDelete: 'CASCADE' } },
      { name: 'name', type: 'TEXT', nullable: false },
      { name: 'description', type: 'TEXT', nullable: true },
      { name: 'is_public', type: 'BOOLEAN', nullable: false, default: true },
      { name: 'created_by', type: 'UUID', nullable: false, references: { table: 'profiles', column: 'id', onDelete: 'CASCADE' } },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
  },

  // Forum Messages
  {
    name: 'forum_messages',
    columns: [
      { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'forum_id', type: 'UUID', nullable: false, references: { table: 'forums', column: 'id', onDelete: 'CASCADE' } },
      { name: 'author_id', type: 'UUID', nullable: false, references: { table: 'profiles', column: 'id', onDelete: 'CASCADE' } },
      { name: 'parent_message_id', type: 'UUID', nullable: true, references: { table: 'forum_messages', column: 'id', onDelete: 'CASCADE' } },
      { name: 'content', type: 'TEXT', nullable: false },
      { name: 'is_pinned', type: 'BOOLEAN', nullable: false, default: false },
      { name: 'pinned_rubric_id', type: 'UUID', nullable: true, references: { table: 'rubrics', column: 'id', onDelete: 'SET NULL' } },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, default: 'NOW()' },
    ],
    indexes: [
      { name: 'idx_forum_messages_forum_id', columns: ['forum_id'] },
      { name: 'idx_forum_messages_author_id', columns: ['author_id'] },
    ],
  },
];

