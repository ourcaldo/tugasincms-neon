import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const connectionString = `postgresql://postgres.ubspwwvwsdrlbhrxibpj:${supabaseKey}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

const client = postgres(connectionString);

export const db = drizzle(client, { schema });
