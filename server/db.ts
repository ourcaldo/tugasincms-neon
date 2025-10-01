import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ubspwwvwsdrlbhrxibpj.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVic3B3d3Z3c2RybGJocnhpYnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTcxMzIsImV4cCI6MjA3NDg3MzEzMn0.C8l9br1rsG6R04T5O5hf-NyAU2Ecih6KPZ_61xggmC4';

export const supabase = createClient(supabaseUrl, supabaseKey);
