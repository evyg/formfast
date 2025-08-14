import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/services/stripe';
import { createClient } from '@supabase/supabase-js';

// Create admin Supabase client for webhook handling
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { success: false, error: 'Invalid signature' },
      { status: 400 }
    );
  }

  console.log('Stripe webhook event:', event.type);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePayment(event.data.object);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ success: true, received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionChange(subscription: any) {
  const customerId = subscription.customer;
  const status = subscription.status;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  
  // Find user by Stripe customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('Profile not found for customer:', customerId);
    return;
  }

  // Update or create billing customer record
  const billingData = {
    user_id: profile.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status,
    current_period_end: currentPeriodEnd.toISOString(),
    plan_id: getPlanIdFromPriceId(subscription.items.data[0]?.price?.id),
  };

  const { error } = await supabase
    .from('billing_customers')
    .upsert(billingData, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error updating billing customer:', error);
    throw error;
  }

  console.log('Subscription updated for user:', profile.id);
}

async function handleSubscriptionCanceled(subscription: any) {
  const customerId = subscription.customer;
  
  // Find user by Stripe customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('Profile not found for customer:', customerId);
    return;
  }

  // Update billing status to canceled
  const { error } = await supabase
    .from('billing_customers')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('user_id', profile.id);

  if (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }

  console.log('Subscription canceled for user:', profile.id);
}

async function handlePaymentSuccess(paymentIntent: any) {
  const customerId = paymentIntent.customer;
  const amount = paymentIntent.amount / 100; // Convert from cents
  
  // Find user by Stripe customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('Profile not found for customer:', customerId);
    return;
  }

  // For pay-as-you-go payments, add credits to user account
  if (paymentIntent.description?.includes('forms')) {
    const formsCount = Math.floor(amount / 0.50); // $0.50 per form
    
    // Update user credits (you'll need to add a credits column to profiles table)
    const { error } = await supabase.rpc('add_user_credits', {
      user_id: profile.id,
      credits: formsCount,
    });

    if (error) {
      console.error('Error adding credits:', error);
    } else {
      console.log(`Added ${formsCount} credits to user:`, profile.id);
    }
  }
}

async function handleInvoicePayment(invoice: any) {
  // Handle successful subscription invoice payments
  console.log('Invoice payment succeeded:', invoice.id);
}

async function handleCustomerCreated(customer: any) {
  console.log('New Stripe customer created:', customer.id);
}

function getPlanIdFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_INDIVIDUAL_PRICE_ID) return 'individual';
  if (priceId === process.env.STRIPE_FAMILY_PRICE_ID) return 'family';
  if (priceId === process.env.STRIPE_PAYG_PRICE_ID) return 'pay-as-you-go';
  return 'unknown';
}