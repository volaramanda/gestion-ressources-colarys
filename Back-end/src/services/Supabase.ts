// services/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ SUPABASE_URL:', process.env.SUPABASE_URL);
  console.error('❌ SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING');
  throw new Error('Missing Supabase environment variables. Please check your .env file');
}

console.log('✅ Supabase configured successfully');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;