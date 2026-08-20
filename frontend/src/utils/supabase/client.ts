import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mpffdiqvtoiyltxxczxi.supabase.co') as string;
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_FdgFHmLASBfI0RSsIEbOqQ_EEw4ranq') as string;

export const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

export const createClient = () => supabase;
