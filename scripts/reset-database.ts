#!/usr/bin/env tsx
/**
 * Reset Database Script
 * Drops all tables and recreates the database schema
 * WARNING: This will delete all data!
 */

import { Client } from 'pg';

async function resetDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Safety check for production
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot reset database in production environment');
    process.exit(1);
  }

  console.log('⚠️  WARNING: This will delete all data in the database!');
  console.log(`📍 Database: ${databaseUrl.split('@')[1] || databaseUrl}`);
  console.log('');

  // Give user time to cancel
  console.log('Starting in 3 seconds... (Press Ctrl+C to cancel)');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('🔌 Connected to database');

    // Drop all tables in the correct order (respecting foreign key constraints)
    const tables = [
      'outbox',
      'event_log',
      'process_instance',
      'process_definition',
      'relation',
      'relation_type',
      'entity',
      'entity_type',
    ];

    console.log('🗑️  Dropping tables...');
    for (const table of tables) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`   ✓ Dropped table: ${table}`);
      } catch (error: any) {
        console.log(`   ⚠️  Could not drop table ${table}: ${error}`);
      }
    }

    // Also drop the drizzle migration table
    await client.query('DROP TABLE IF EXISTS __drizzle_migrations CASCADE');
    console.log('   ✓ Dropped migration tracking table');

    console.log('\n✅ Database reset complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run migrations: npm run db:migrate');
    console.log('  2. Seed data (optional): npm run seed');
    console.log('  3. Start the server: npm run dev');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the reset
resetDatabase().catch(console.error);
