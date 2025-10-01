import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

const runMigration = async () => {
  try {
    console.log('Creating tables...');
    
    const migrationSQL = fs.readFileSync('./drizzle/0000_tired_synch.sql', 'utf-8');
    
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      try {
        await sql([statement] as any as TemplateStringsArray);
        console.log('✓ Executed statement');
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log('⊘ Table already exists, skipping...');
        } else {
          console.error('Error executing statement:', error.message);
        }
      }
    }
    
    console.log('✓ Database setup complete!');
  } catch (error) {
    console.error('Failed to create tables:', error);
    process.exit(1);
  }
};

runMigration();
