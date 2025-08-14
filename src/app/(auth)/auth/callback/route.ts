import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/services/logger';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        logger.error('auth_callback_error', { error: error.message });
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
      }

      if (data.user) {
        logger.userAction('auth_callback_success', { 
          user_id: data.user.id,
          email: data.user.email 
        });
        
        // Set user context for logging
        logger.setUser(data.user.id, data.user.email);
        
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (error: any) {
      logger.error('auth_callback_exception', { error: error.message });
    }
  }

  // Return the user to an error page with instructions
  logger.warn('auth_callback_no_code', { searchParams: Object.fromEntries(searchParams) });
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}