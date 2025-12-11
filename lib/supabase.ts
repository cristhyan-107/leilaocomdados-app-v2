// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// client para o frontend (uso público)
export const supabase = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// client para server (service role)
export const supabaseServer = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
