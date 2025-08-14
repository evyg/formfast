import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Lazy initialization to avoid build-time errors
let supabaseServerInstance: ReturnType<typeof createClient<Database>> | null = null;

function createSupabaseServer() {
  if (supabaseServerInstance) {
    return supabaseServerInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment.'
    );
  }

  supabaseServerInstance = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseServerInstance;
}

// Export a proxy that creates the client only when accessed
export const supabaseServer = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop) {
    const client = createSupabaseServer();
    return client[prop as keyof typeof client];
  }
});