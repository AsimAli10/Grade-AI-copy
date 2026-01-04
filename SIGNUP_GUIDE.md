# GradeAI Signup Guide

## Overview

GradeAI supports three user roles that can be selected during signup:
- **Teacher** - Default role for grading assignments and managing courses
- **Student** - For submitting assignments and viewing grades
- **Administrator** - For managing organization settings and users

## Signup Flow

### Step 1: Account Creation
1. Enter email and password
2. **Select your role** (Teacher, Student, or Administrator)
3. Click "Create Account"

### Step 2: Profile Completion
1. Enter your full name
2. Review your selected role (can be changed later by admin)
3. Click "Complete Registration"

## Role Selection

### Teacher (Default)
- **Purpose**: Grade assignments, manage courses, create rubrics
- **Features**: 
  - Create and manage courses
  - Grade student submissions
  - Create rubrics and assignments
  - View analytics
  - Access teacher forums

### Student
- **Purpose**: Submit assignments and view grades
- **Features**:
  - View enrolled courses
  - Submit assignments
  - View grades and feedback
  - Access student analytics

### Administrator
- **Purpose**: Manage organization settings
- **Features**:
  - All teacher features
  - Manage organization settings
  - View organization-wide analytics
  - Manage LLM quotas and models
  - User management

## Database Setup

### Required Migrations

Run these migrations in order:

1. **Main Schema**: `20250101000000_gradeai_schema.sql`
   - Creates all tables, enums, indexes, and RLS policies

2. **Profile Trigger**: `20250101000001_create_profile_trigger.sql`
   - Automatically creates a profile when a user signs up
   - Sets default role to 'teacher' if not specified

### Profile Creation

Profiles are created in two ways:

1. **Automatic (via trigger)**: When a user signs up, a profile is automatically created with:
   - Default role: `teacher`
   - Email from auth.users
   - Other fields: null

2. **Manual (via complete-profile function)**: When user completes profile step:
   - Updates full_name
   - Updates role (if different from default)
   - Can be called multiple times (upsert)

## Testing Signup

### Test Different Roles

1. **As Teacher**:
   ```
   Email: teacher@example.com
   Password: password123
   Role: Teacher
   ```

2. **As Student**:
   ```
   Email: student@example.com
   Password: password123
   Role: Student
   ```

3. **As Admin**:
   ```
   Email: admin@example.com
   Password: password123
   Role: Administrator
   ```

### Verify Profile Creation

After signup, check the database:

```sql
SELECT id, email, full_name, role, created_at 
FROM public.profiles 
ORDER BY created_at DESC;
```

## Role-Based Access

### RLS Policies

The database has Row Level Security (RLS) policies that enforce:

- **Teachers**: Can manage their own courses and view student submissions
- **Students**: Can view enrolled courses and submit work
- **Admins**: Can view organization-wide data

### Changing Roles

Roles can be changed by:
1. **Database admin**: Direct SQL update
2. **Application admin**: Through admin panel (to be implemented)
3. **Support**: Contact support for role changes

## Troubleshooting

### Profile Not Created

If profile is not created after signup:

1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. Check trigger function:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
   ```

3. Manually create profile:
   ```sql
   INSERT INTO public.profiles (id, email, role)
   VALUES ('user-uuid', 'email@example.com', 'teacher');
   ```

### Role Not Saving

1. Check complete-profile function logs in Supabase dashboard
2. Verify RLS policies allow profile updates
3. Check that role enum value is valid ('admin', 'teacher', 'student')

### Email Verification

If email verification is required:
- User must verify email before accessing dashboard
- Profile can still be created before verification
- Some features may be restricted until email is verified

## Next Steps After Signup

1. **Verify Email** (if required)
2. **Complete Profile** - Add full name
3. **Connect Google Classroom** (for teachers)
4. **Create/Join Organization** (if needed)
5. **Start Using GradeAI**


