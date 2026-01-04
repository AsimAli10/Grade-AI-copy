#!/usr/bin/env tsx
/**
 * Script to create GradeAI database tables from schema definitions
 * 
 * Usage:
 *   tsx scripts/create-tables.ts [--connection-string "postgresql://..."]
 * 
 * Or set DATABASE_URL environment variable
 */

import { Client } from 'pg';
import { enums, tables } from '../src/models/schema';

interface CreateTableOptions {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

function buildColumnSQL(column: any): string {
  let sql = `  ${column.name} ${column.type}`;
  
  if (column.primaryKey) {
    sql += ' PRIMARY KEY';
  }
  
  if (column.unique && !column.primaryKey) {
    sql += ' UNIQUE';
  }
  
  if (!column.nullable && !column.primaryKey) {
    sql += ' NOT NULL';
  }
  
  if (column.default !== undefined) {
    if (typeof column.default === 'string' && column.default.startsWith("'")) {
      sql += ` DEFAULT ${column.default}`;
    } else {
      sql += ` DEFAULT ${column.default}`;
    }
  }
  
  if (column.references) {
    sql += ` REFERENCES ${column.references.table}(${column.references.column})`;
    if (column.references.onDelete) {
      sql += ` ON DELETE ${column.references.onDelete}`;
    }
  }
  
  return sql;
}

function buildCreateTableSQL(table: any): string {
  const columns = table.columns.map(buildColumnSQL).join(',\n');
  
  // Add unique constraints for composite unique columns
  const uniqueConstraints: string[] = [];
  const uniqueColumnGroups = new Map<string, string[]>();
  
  // Check for composite unique constraints (course_enrollments, submissions)
  if (table.name === 'course_enrollments') {
    uniqueConstraints.push(',\n  UNIQUE(course_id, student_id)');
  } else if (table.name === 'submissions') {
    uniqueConstraints.push(',\n  UNIQUE(assignment_id, student_id)');
  } else if (table.name === 'quiz_attempts') {
    // quiz_attempts has unique on (quiz_id, student_id, started_at) - handled in index
  }
  
  let sql = `CREATE TABLE IF NOT EXISTS public.${table.name} (\n${columns}${uniqueConstraints.join('')}\n);`;
  
  return sql;
}

function buildCreateIndexSQL(table: any): string[] {
  const indexes: string[] = [];
  
  if (table.indexes) {
    for (const index of table.indexes) {
      if (!index.unique || index.columns.length === 1) {
        const uniqueClause = index.unique ? 'UNIQUE ' : '';
        indexes.push(
          `CREATE ${uniqueClause}INDEX IF NOT EXISTS ${index.name} ON public.${table.name} (${index.columns.join(', ')});`
        );
      }
    }
  }
  
  return indexes;
}

async function createTables(options: CreateTableOptions = {}) {
  const connectionString = 
    options.connectionString || 
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL;

  if (!connectionString && !options.host) {
    throw new Error(
      'Database connection required. Provide --connection-string or set DATABASE_URL environment variable.\n' +
      'Example: postgresql://postgres:password@localhost:5432/postgres'
    );
  }

  const client = new Client(
    connectionString
      ? { connectionString }
      : {
          host: options.host || 'localhost',
          port: options.port || 5432,
          database: options.database || 'postgres',
          user: options.user || 'postgres',
          password: options.password || '',
        }
  );

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Create enums
    console.log('\n📋 Creating enums...');
    for (const enumDef of enums) {
      const values = enumDef.values.map(v => `'${v}'`).join(', ');
      const sql = `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typname = '${enumDef.name}' AND n.nspname = 'public'
          ) THEN
            CREATE TYPE public.${enumDef.name} AS ENUM (${values});
          END IF;
        END$$;
      `;
      await client.query(sql);
      console.log(`  ✓ Created enum: ${enumDef.name}`);
    }

    // Create tables
    console.log('\n📊 Creating tables...');
    for (const table of tables) {
      const createTableSQL = buildCreateTableSQL(table);
      await client.query(createTableSQL);
      console.log(`  ✓ Created table: ${table.name}`);
    }

    // Create indexes
    console.log('\n🔍 Creating indexes...');
    for (const table of tables) {
      const indexes = buildCreateIndexSQL(table);
      for (const indexSQL of indexes) {
        await client.query(indexSQL);
        const indexName = indexSQL.match(/INDEX IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
        console.log(`  ✓ Created index: ${indexName}`);
      }
    }

    // Enable RLS
    console.log('\n🔒 Enabling Row Level Security...');
    for (const table of tables) {
      await client.query(`ALTER TABLE public.${table.name} ENABLE ROW LEVEL SECURITY;`);
      console.log(`  ✓ Enabled RLS on: ${table.name}`);
    }

    console.log('\n✅ Database schema created successfully!');
    console.log('\n⚠️  Note: RLS policies and triggers need to be set up separately.');
    console.log('   Run the migration file for complete setup including policies.');

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: CreateTableOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--connection-string' && args[i + 1]) {
      options.connectionString = args[i + 1];
      i++;
    } else if (args[i] === '--host' && args[i + 1]) {
      options.host = args[i + 1];
      i++;
    } else if (args[i] === '--port' && args[i + 1]) {
      options.port = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--database' && args[i + 1]) {
      options.database = args[i + 1];
      i++;
    } else if (args[i] === '--user' && args[i + 1]) {
      options.user = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      options.password = args[i + 1];
      i++;
    }
  }

  createTables(options)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createTables, buildCreateTableSQL, buildCreateIndexSQL };

