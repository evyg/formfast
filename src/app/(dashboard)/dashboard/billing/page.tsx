import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BillingOverview } from '@/components/billing/billing-overview';
import { SubscriptionPlans } from '@/components/billing/subscription-plans';
import { PaymentMethods } from '@/components/billing/payment-methods';
import { BillingHistory } from '@/components/billing/billing-history';
import { UsageMetrics } from '@/components/billing/usage-metrics';
import { 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  Zap
} from 'lucide-react';

interface BillingData {
  plan: 'free' | 'pro' | 'enterprise';
  credits_used: number;
  credits_limit: number;
  billing_period_start: string;
  billing_period_end: string;
  next_billing_date: string;
  amount_due: number;
  currency: string;
}

async function getBillingData(userId: string): Promise<BillingData> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Default billing data for free users
    return {
      plan: data?.plan || 'free',
      credits_used: data?.credits_used || 25,
      credits_limit: data?.credits_limit || 100,
      billing_period_start: data?.billing_period_start || new Date().toISOString(),
      billing_period_end: data?.billing_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      next_billing_date: data?.next_billing_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount_due: data?.amount_due || 0,
      currency: data?.currency || 'USD',
    };
  } catch (error) {
    console.error('Get billing data error:', error);
    return {
      plan: 'free',
      credits_used: 0,
      credits_limit: 100,
      billing_period_start: new Date().toISOString(),
      billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount_due: 0,
      currency: 'USD',
    };
  }
}

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const billingData = await getBillingData(user.id);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'free': return 'Free Plan';
      case 'pro': return 'Pro Plan';
      case 'enterprise': return 'Enterprise Plan';
      default: return 'Free Plan';
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'free':
        return <Badge variant="secondary">Free</Badge>;
      case 'pro':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Pro</Badge>;
      case 'enterprise':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Enterprise</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const creditsPercentage = (billingData.credits_used / billingData.credits_limit) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600">
            Manage your subscription, view usage, and billing information
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {getPlanBadge(billingData.plan)}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getPlanName(billingData.plan)}</div>
            <p className="text-xs text-muted-foreground">
              {billingData.plan === 'free' ? 'No subscription' : 'Active subscription'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billingData.credits_used}/{billingData.credits_limit}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(creditsPercentage)}% used this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDate(billingData.next_billing_date)}
            </div>
            <p className="text-xs text-muted-foreground">
              {billingData.plan === 'free' ? 'No billing' : 'Upcoming payment'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(billingData.amount_due, billingData.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {billingData.amount_due > 0 ? 'Payment pending' : 'No amount due'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Billing Overview & Usage */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Current Usage</CardTitle>
              <CardDescription>
                Your usage for the current billing period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsageMetrics
                creditsUsed={billingData.credits_used}
                creditsLimit={billingData.credits_limit}
                billingPeriodStart={billingData.billing_period_start}
                billingPeriodEnd={billingData.billing_period_end}
              />
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                View and download your past invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BillingHistory userId={user.id} />
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Payment Methods</span>
              </CardTitle>
              <CardDescription>
                Manage your payment methods and billing address
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentMethods userId={user.id} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Plan Management */}
        <div className="space-y-6">
          {/* Billing Overview */}
          <BillingOverview billingData={billingData} />

          {/* Subscription Plans */}
          <SubscriptionPlans 
            currentPlan={billingData.plan} 
            userId={user.id}
          />
        </div>
      </div>
    </div>
  );
}