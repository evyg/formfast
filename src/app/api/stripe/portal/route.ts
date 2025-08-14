import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { StripeService } from '@/lib/services/stripe';

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const { supabase, user } = await createClient(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { success: false, error: 'No billing information found' },
        { status: 404 }
      );
    }

    // Create customer portal session
    const session = await StripeService.createPortalSession(
      profile.stripe_customer_id,
      `${request.nextUrl.origin}/dashboard/billing`
    );

    return NextResponse.json({
      success: true,
      data: {
        url: session.url,
      },
    });

  } catch (error) {
    console.error('Stripe portal error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}