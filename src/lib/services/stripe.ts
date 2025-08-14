import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
  typescript: true,
});

export const PLANS = {
  INDIVIDUAL: {
    id: 'individual',
    name: 'Individual Plan',
    priceId: process.env.STRIPE_INDIVIDUAL_PRICE_ID,
    price: 9.00,
    features: [
      'Unlimited form processing',
      'Cloud storage',
      'AI-powered auto-fill',
      'Email support',
    ],
    limits: {
      forms: -1, // unlimited
      storage: '10GB',
    },
  },
  FAMILY: {
    id: 'family',
    name: 'Family Plan',
    priceId: process.env.STRIPE_FAMILY_PRICE_ID,
    price: 19.00,
    features: [
      'Everything in Individual',
      'Up to 5 family members',
      'Shared form templates',
      'Priority support',
    ],
    limits: {
      forms: -1, // unlimited
      storage: '50GB',
      members: 5,
    },
  },
  PAY_AS_YOU_GO: {
    id: 'pay-as-you-go',
    name: 'Pay-as-you-go',
    priceId: process.env.STRIPE_PAYG_PRICE_ID,
    price: 0.50,
    features: [
      'Pay per form processed',
      'No monthly commitment',
      'Basic cloud storage',
      'Email support',
    ],
    limits: {
      forms: 0, // pay per use
      storage: '1GB',
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;

export class StripeService {
  /**
   * Create a Stripe customer
   */
  static async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    return await stripe.customers.create({
      email,
      name,
      metadata: {
        created_by: 'formfast',
      },
    });
  }

  /**
   * Create a checkout session for subscription
   */
  static async createCheckoutSession({
    customerId,
    priceId,
    successUrl,
    cancelUrl,
    mode = 'subscription',
  }: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    mode?: 'subscription' | 'payment';
  }): Promise<Stripe.Checkout.Session> {
    return await stripe.checkout.sessions.create({
      customer: customerId,
      mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        created_by: 'formfast',
      },
    });
  }

  /**
   * Create a customer portal session
   */
  static async createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Get customer with subscriptions
   */
  static async getCustomerWithSubscriptions(customerId: string): Promise<{
    customer: Stripe.Customer;
    subscriptions: Stripe.Subscription[];
  }> {
    const customer = await stripe.customers.retrieve(customerId);
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
    });

    return {
      customer: customer as Stripe.Customer,
      subscriptions: subscriptions.data,
    };
  }

  /**
   * Create payment intent for pay-as-you-go
   */
  static async createPaymentIntent({
    customerId,
    amount,
    currency = 'usd',
    description,
  }: {
    customerId: string;
    amount: number;
    currency?: string;
    description?: string;
  }): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.create({
      customer: customerId,
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        created_by: 'formfast',
      },
    });
  }

  /**
   * Update subscription
   */
  static async updateSubscription(
    subscriptionId: string,
    priceId: string
  ): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    return await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.cancel(subscriptionId);
  }

  /**
   * Get usage for pay-as-you-go customers
   */
  static async recordUsage({
    customerId,
    quantity,
    description,
  }: {
    customerId: string;
    quantity: number;
    description: string;
  }): Promise<void> {
    // For pay-as-you-go, we'll create a one-time payment
    await this.createPaymentIntent({
      customerId,
      amount: PLANS.PAY_AS_YOU_GO.price * quantity,
      description: `${description} (${quantity} forms)`,
    });
  }
}