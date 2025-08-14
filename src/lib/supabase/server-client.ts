import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Lazy initialization to avoid build-time errors
let supabaseServer: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseServer() {
  if (supabaseServer) {
    return supabaseServer;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  supabaseServer = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseServer;
}

// Safe getter that returns the client or throws a runtime error
export function getSupabaseServerClient() {
  return getSupabaseServer();
}

// Check if Supabase is properly configured (for build-time safety)
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Export a default client for backward compatibility (but with better error handling)
export const supabaseServer = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop) {
    const client = getSupabaseServer();
    return client[prop as keyof typeof client];
  }
});