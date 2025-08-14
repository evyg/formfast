import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { StripeService, PLANS } from '@/lib/services/stripe';
import { z } from 'zod';

const CreateCheckoutSchema = z.object({
  planId: z.enum(['individual', 'family', 'pay-as-you-go']),
  quantity: z.number().optional().default(1),
});

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

    // Parse and validate request body
    const body = await request.json();
    const { planId, quantity } = CreateCheckoutSchema.parse(body);

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await StripeService.createCustomer(
        profile.email,
        `${profile.first_name} ${profile.last_name}`.trim()
      );
      customerId = customer.id;

      // Update profile with customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const plan = PLANS[planId.toUpperCase() as keyof typeof PLANS];
    if (!plan.priceId) {
      return NextResponse.json(
        { success: false, error: 'Plan price not configured' },
        { status: 400 }
      );
    }

    // Create checkout session
    const session = await StripeService.createCheckoutSession({
      customerId,
      priceId: plan.priceId,
      successUrl: `${request.nextUrl.origin}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${request.nextUrl.origin}/dashboard/billing`,
      mode: planId === 'pay-as-you-go' ? 'payment' : 'subscription',
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}