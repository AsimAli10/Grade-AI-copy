#!/usr/bin/env tsx
/**
 * Script to generate SQL migration from schema definitions
 * 
 * Usage:
 *   tsx scripts/generate-migration.ts > supabase/migrations/YYYYMMDDHHMMSS_migration_name.sql
 */

import { enums, tables } from '../src/models/schema';
import { buildCreateTableSQL, buildCreateIndexSQL } from './create-tables';

function generateMigration(): string {
  let sql = `-- ============================================
-- GradeAI Database Schema Migration
-- Generated from src/models/schema.ts
-- ============================================
-- Run this migration to create all tables, enums, and indexes
-- Note: RLS policies and triggers are in the main migration file

`;

  // Generate enum creation
  sql += '-- ============================================\n';
  sql += '-- 1. CREATE ENUMS\n';
  sql += '-- ============================================\n';
  for (const enumDef of enums) {
    const values = enumDef.values.map(v => `'${v}'`).join(', ');
    sql += `
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = '${enumDef.name}' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.${enumDef.name} AS ENUM (${values});
  END IF;
END$$;
`;
  }

  // Generate table creation
  sql += '\n-- ============================================\n';
  sql += '-- 2. CREATE TABLES\n';
  sql += '-- ============================================\n';
  for (const table of tables) {
    sql += `\n-- ${table.name}\n`;
    sql += buildCreateTableSQL(table);
    sql += '\n';
  }

  // Generate indexes
  sql += '\n-- ============================================\n';
  sql += '-- 3. CREATE INDEXES\n';
  sql += '-- ============================================\n';
  for (const table of tables) {
    const indexes = buildCreateIndexSQL(table);
    if (indexes.length > 0) {
      sql += `\n-- Indexes for ${table.name}\n`;
      for (const indexSQL of indexes) {
        sql += indexSQL + '\n';
      }
    }
  }

  // Generate RLS enable
  sql += '\n-- ============================================\n';
  sql += '-- 4. ENABLE ROW LEVEL SECURITY\n';
  sql += '-- ============================================\n';
  for (const table of tables) {
    sql += `ALTER TABLE public.${table.name} ENABLE ROW LEVEL SECURITY;\n`;
  }

  sql += '\n-- Note: RLS policies and triggers should be added separately\n';
  sql += '-- See supabase/migrations/20250101000000_gradeai_schema.sql for complete setup\n';

  return sql;
}

if (require.main === module) {
  console.log(generateMigration());
}

export { generateMigration };


