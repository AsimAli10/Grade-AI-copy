# GradeAI Database Migration

## Overview
This is a fresh migration for a new Supabase database. It creates all tables, enums, indexes, RLS policies, and triggers needed for GradeAI.

## Migration File
- `20250101000000_gradeai_schema.sql` - Complete schema for GradeAI

## What Gets Created

### Tables
1. **profiles** - User profiles with roles (admin, teacher, student)
2. **organizations** - Multi-tenant organization management
3. **platform_plans** - Subscription plans
4. **platform_subscriptions** - User subscriptions
5. **google_classroom_integrations** - OAuth token storage
6. **courses** - Google Classroom courses
7. **course_enrollments** - Student-course relationships
8. **rubrics** - Grading rubrics
9. **assignments** - Course assignments
10. **submissions** - Student submissions
11. **grades** - AI and teacher grades
12. **grade_history** - Grade change audit trail
13. **analytics** - Performance metrics
14. **quizzes** - AI-generated quizzes
15. **quiz_attempts** - Student quiz responses
16. **forums** - Teacher collaboration forums
17. **forum_messages** - Forum posts and threads

### Enums
- `user_role` - admin, teacher, student
- `assignment_type` - essay, code, math, multiple_choice, short_answer, file_upload
- `submission_status` - draft, submitted, graded, needs_review, flagged, returned
- `grade_status` - ai_graded, teacher_reviewed, accepted, modified, rejected
- `ai_confidence` - low, medium, high
- `sync_status` - pending, syncing, synced, error, expired
- `subscription_type` - free, premium

## How to Run

### Option 1: Supabase CLI (Recommended)
```bash
# Make sure you're in the project root
cd /Users/asimali/Xappifai/GradeAI-App

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

### Option 2: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20250101000000_gradeai_schema.sql`
5. Paste into the SQL Editor
6. Click **Run** or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

### Option 3: Local Development
```bash
# Start local Supabase
supabase start

# Apply migration
supabase db reset
```

## Post-Migration Steps

1. **Generate TypeScript Types**:
   ```bash
   supabase gen types typescript --local > src/integrations/supabase/types.ts
   # Or for remote:
   supabase gen types typescript --project-id your-project-ref > src/integrations/supabase/types.ts
   ```

2. **Verify Tables**:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

3. **Test RLS Policies**:
   - Create a test user
   - Verify they can only access their own data
   - Test teacher/student/admin permissions

4. **Seed Initial Data** (Optional):
   ```sql
   -- Create a default organization
   INSERT INTO public.organizations (name, domain) 
   VALUES ('Default Organization', 'example.com')
   RETURNING id;
   
   -- Create admin user (after auth user is created)
   UPDATE public.profiles 
   SET role = 'admin', organization_id = 'your-org-id'
   WHERE id = 'user-uuid';
   ```

## TypeScript Models

TypeScript type definitions are available in `src/models/index.ts`. These can be used for:
- Type-safe database queries
- Form validation
- API request/response types
- Component props

Example usage:
```typescript
import { Profile, Course, Assignment, Submission, Grade } from '@/models';

const profile: Profile = {
  id: '...',
  email: 'teacher@example.com',
  role: 'teacher',
  // ...
};
```

## Schema Relationships

```
organizations
  └── profiles (users)
      ├── google_classroom_integrations
      ├── platform_subscriptions
      └── courses (as teacher)
          ├── course_enrollments (students)
          ├── assignments
          │   ├── rubrics
          │   └── submissions
          │       └── grades
          │           └── grade_history
          ├── quizzes
          │   └── quiz_attempts
          └── forums
              └── forum_messages
```

## Security

All tables have Row Level Security (RLS) enabled with policies for:
- **Teachers**: Can manage their courses, assignments, view student submissions
- **Students**: Can view enrolled courses, submit work, view own grades
- **Admins**: Can view organization-wide analytics and manage settings

## Notes

- This migration is idempotent (safe to run multiple times)
- Uses `CREATE TABLE IF NOT EXISTS` for safety
- All foreign keys have proper CASCADE/SET NULL behavior
- Indexes are created for optimal query performance
- Triggers automatically update `updated_at` timestamps
- Student count is automatically maintained via trigger

## Troubleshooting

If you encounter errors:

1. **Enum already exists**: The migration checks for existing enums, so this should be safe
2. **Foreign key violations**: Make sure to create organizations before profiles
3. **RLS blocking queries**: Check that you're authenticated and policies are correct
4. **Trigger errors**: Verify the `update_updated_at_column()` function exists

## Support

For issues, check:
- Supabase dashboard logs
- Migration execution logs
- RLS policy violations in Supabase logs


