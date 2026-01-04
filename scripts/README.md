# Database Schema Scripts

This directory contains scripts to manage the GradeAI database schema programmatically.

## Files

- `create-tables.ts` - Creates all tables in a PostgreSQL database from schema definitions
- `generate-migration.ts` - Generates SQL migration file from schema definitions

## Prerequisites

Install dependencies:
```bash
npm install
# or
yarn install
```

This will install:
- `pg` - PostgreSQL client
- `tsx` - TypeScript execution
- `@types/pg` - TypeScript types for pg

## Usage

### Create Tables Locally

Create all tables in a local or remote PostgreSQL database:

```bash
# Using environment variable
DATABASE_URL="postgresql://user:password@localhost:5432/dbname" npm run db:create-tables

# Or using connection string flag
npm run db:create-tables -- --connection-string "postgresql://user:password@localhost:5432/dbname"

# Or using individual connection parameters
npm run db:create-tables -- --host localhost --port 5432 --database postgres --user postgres --password password
```

### Generate Migration File

Generate a SQL migration file from the schema definitions:

```bash
npm run db:generate-migration > supabase/migrations/YYYYMMDDHHMMSS_migration_name.sql
```

Example:
```bash
npm run db:generate-migration > supabase/migrations/20250102000000_gradeai_schema.sql
```

## Schema Source

The schema is defined in `src/models/schema.ts`. This file contains:
- Enum definitions
- Table definitions with columns, types, constraints
- Index definitions
- Foreign key relationships

## What Gets Created

The scripts create:
1. ✅ All enums (user_role, assignment_type, etc.)
2. ✅ All tables (profiles, courses, assignments, etc.)
3. ✅ All indexes
4. ✅ Row Level Security (RLS) enabled on all tables

**Note**: RLS policies and triggers are NOT created by these scripts. Use the full migration file (`supabase/migrations/20250101000000_gradeai_schema.sql`) for complete setup including policies and triggers.

## Environment Variables

- `DATABASE_URL` - Full PostgreSQL connection string
- `SUPABASE_DB_URL` - Alternative environment variable name

## Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

Example:
```
postgresql://postgres:password@localhost:5432/postgres
```

## Local Development with Supabase

If using Supabase locally:

```bash
# Start Supabase locally
supabase start

# Get the database URL from output, then:
npm run db:create-tables
```

## Troubleshooting

### Connection Errors
- Verify database is running
- Check connection string format
- Ensure user has CREATE TABLE permissions

### Type Errors
- Make sure `@types/pg` is installed
- Run `npm install` to ensure all dependencies are installed

### Permission Errors
- Ensure database user has CREATE, ALTER, and INDEX permissions
- For Supabase, use the service role key for admin operations

## Integration with Supabase

For Supabase projects:
1. Use the generated migration file in `supabase/migrations/`
2. Or use `create-tables.ts` with Supabase connection string
3. RLS policies should be added via migration files

## Schema Updates

When updating the schema:
1. Update `src/models/schema.ts`
2. Regenerate migration: `npm run db:generate-migration`
3. Or recreate tables: `npm run db:create-tables`


