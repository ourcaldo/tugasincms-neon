import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const connectionString = `postgresql://postgres.ubspwwvwsdrlbhrxibpj:${supabaseKey}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

const client = postgres(connectionString);

export const db = drizzle(client, { schema });
