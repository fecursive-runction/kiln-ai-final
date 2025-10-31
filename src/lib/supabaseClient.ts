import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client intended for browser usage (public anon key).
 * Use this only in client-side code. It uses NEXT_PUBLIC_* env vars.
 */
export function createSupabaseClient(): SupabaseClient {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Create a Supabase client for server-side use. This must use a service role key
 * (kept in server environment variables) for write/admin operations. Do NOT
 * expose the service role key to the browser.
 */
export function createSupabaseServerClient(): SupabaseClient {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for server Supabase client');
  }

  // Prefer the service role key (full privileges). If it's not set (development),
  // fall back to the anon key but log a warning because it's less privileged
  // and may be insufficient for some operations. The fallback prevents runtime
  // crashes in dev when the service key isn't provided.
  const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!serverKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY for Supabase client');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // eslint-disable-next-line no-console
    console.warn(
      'Warning: SUPABASE_SERVICE_ROLE_KEY not set. Falling back to NEXT_PUBLIC_SUPABASE_ANON_KEY for server client (insecure for privileged ops).'
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serverKey);
}
