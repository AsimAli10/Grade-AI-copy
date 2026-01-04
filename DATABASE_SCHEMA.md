# GradeAI Database Schema

## Overview

The GradeAI database schema is defined in code and can be used to:
1. **Generate SQL migrations** - Create migration files from schema definitions
2. **Create tables programmatically** - Run scripts to create tables in any PostgreSQL database
3. **Type-safe development** - Use TypeScript types for database operations

## Schema Definition

The schema is defined in **`src/models/schema.ts`** which contains:
- Enum definitions (user_role, assignment_type, etc.)
- Table definitions with columns, types, constraints, and indexes
- Foreign key relationships

## Files Structure

```
src/models/
  ├── index.ts          # TypeScript type definitions for all tables
  └── schema.ts         # Schema definitions (enums, tables, columns)

scripts/
  ├── create-tables.ts       # Script to create tables in PostgreSQL
  └── generate-migration.ts  # Script to generate SQL migration file

supabase/migrations/
  └── 20250101000000_gradeai_schema.sql  # Complete migration with RLS policies
```

## Usage

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `pg` - PostgreSQL client library
- `tsx` - TypeScript execution
- `@types/pg` - TypeScript types

### 2. Create Tables Locally

Create all tables in a PostgreSQL database:

```bash
# Using environment variable
DATABASE_URL="postgresql://user:password@localhost:5432/dbname" npm run db:create-tables

# Or with connection string flag
npm run db:create-tables -- --connection-string "postgresql://user:password@localhost:5432/dbname"
```

### 3. Generate Migration File

Generate a SQL migration from schema definitions:

```bash
npm run db:generate-migration > supabase/migrations/YYYYMMDDHHMMSS_name.sql
```

### 4. Use TypeScript Types

Import types in your code:

```typescript
import { Profile, Course, Assignment, Submission, Grade } from '@/models';

const profile: Profile = {
  id: '...',
  email: 'teacher@example.com',
  role: 'teacher',
  // ...
};
```

## What Gets Created

### By `create-tables.ts`:
- ✅ All enums
- ✅ All tables with columns and constraints
- ✅ All indexes
- ✅ Row Level Security enabled

### By Migration File:
- ✅ Everything above PLUS
- ✅ RLS policies (security rules)
- ✅ Triggers (auto-update timestamps, student counts)
- ✅ Functions (update_updated_at_column, update_course_student_count)

## Schema Tables

1. **profiles** - User accounts with roles
2. **organizations** - Multi-tenant organizations
3. **platform_plans** - Subscription plans
4. **platform_subscriptions** - User subscriptions
5. **google_classroom_integrations** - OAuth tokens
6. **courses** - Google Classroom courses
7. **course_enrollments** - Student enrollments
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

## Connection Examples

### Local PostgreSQL
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/gradeai" npm run db:create-tables
```

### Supabase Local
```bash
# Start Supabase
supabase start

# Get connection string from output, then:
npm run db:create-tables
```

### Supabase Remote
```bash
# Get connection string from Supabase dashboard
# Settings > Database > Connection string > URI
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" npm run db:create-tables
```

## Workflow

### For New Database
1. Run migration file in Supabase dashboard or via CLI
2. Or use `create-tables.ts` script for basic setup

### For Schema Updates
1. Update `src/models/schema.ts`
2. Regenerate migration: `npm run db:generate-migration`
3. Or recreate tables: `npm run db:create-tables`

### For Development
1. Use TypeScript types from `src/models/index.ts`
2. Import in components, API routes, etc.
3. Type-safe database operations

## Benefits

✅ **Single Source of Truth** - Schema defined in code  
✅ **Type Safety** - TypeScript types match database schema  
✅ **Reproducible** - Can recreate schema anywhere  
✅ **Version Control** - Schema changes tracked in git  
✅ **Local Development** - Create tables locally without Supabase  
✅ **Migration Generation** - Auto-generate SQL from code  

## Next Steps

1. Install dependencies: `npm install`
2. Run migration on Supabase: Use the SQL file in dashboard
3. Or create tables locally: `npm run db:create-tables`
4. Use types in code: Import from `@/models`


