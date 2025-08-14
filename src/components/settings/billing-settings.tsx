'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  Zap, 
  Star, 
  ArrowUpCircle,
  ExternalLink,
  Loader2 
} from 'lucide-react';
import { logger } from '@/lib/services/logger';

interface BillingSettingsProps {
  user: User;
}

interface BillingInfo {
  plan: 'free' | 'pro' | 'enterprise';
  credits_used: number;
  credits_limit: number;
  billing_period_start: string;
  billing_period_end: string;
  next_billing_date: string;
}

export function BillingSettings({ user }: BillingSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    plan: 'free',
    credits_used: 0,
    credits_limit: 100,
    billing_period_start: new Date().toISOString(),
    billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const supabase = createClient();

  useEffect(() => {
    loadBillingInfo();
  }, []);

  const loadBillingInfo = async () => {
    setIsLoading(true);
    
    try {
      // In a real app, this would fetch from your billing/subscription table
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setBillingInfo({
          plan: data.plan || 'free',
          credits_used: data.credits_used || 0,
          credits_limit: data.credits_limit || 100,
          billing_period_start: data.billing_period_start || new Date().toISOString(),
          billing_period_end: data.billing_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          next_billing_date: data.next_billing_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to load billing info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    try {
      // In a real app, this would redirect to Stripe checkout or similar
      logger.userAction('upgrade_plan_clicked', {
        user_id: user.id,
        target_plan: plan,
      });
      
      // TODO: Implement Stripe checkout or billing provider integration
      console.log(`Upgrading to ${plan} plan`);
    } catch (error) {
      console.error('Upgrade error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  const creditsPercentage = (billingInfo.credits_used / billingInfo.credits_limit) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Current Plan</span>
            </div>
            {getPlanBadge(billingInfo.plan)}
          </CardTitle>
          <CardDescription>
            Your current subscription and usage details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credits Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Credits Used</Label>
              <span className="text-sm text-gray-600">
                {billingInfo.credits_used} / {billingInfo.credits_limit}
              </span>
            </div>
            <Progress value={creditsPercentage} className="h-2" />
            <p className="text-xs text-gray-500">
              {billingInfo.credits_limit - billingInfo.credits_used} credits remaining this period
            </p>
          </div>

          {/* Billing Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Billing Period</Label>
              <p className="text-sm text-gray-900">
                {formatDate(billingInfo.billing_period_start)} - {formatDate(billingInfo.billing_period_end)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Next Billing Date</Label>
              <p className="text-sm text-gray-900">
                {formatDate(billingInfo.next_billing_date)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Plans */}
      {billingInfo.plan === 'free' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pro Plan */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <span>Pro Plan</span>
              </CardTitle>
              <CardDescription>
                Perfect for regular users and small businesses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold">$29</p>
                <p className="text-sm text-gray-500">per month</p>
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span>1,000 credits per month</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span>Priority processing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span>Advanced OCR features</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span>Email support</span>
                </li>
              </ul>

              <Button 
                className="w-full" 
                onClick={() => handleUpgrade('pro')}
              >
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-purple-500" />
                <span>Enterprise Plan</span>
              </CardTitle>
              <CardDescription>
                For large organizations with high volume needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold">Custom</p>
                <p className="text-sm text-gray-500">pricing</p>
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  <span>Unlimited credits</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  <span>Dedicated infrastructure</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  <span>24/7 phone support</span>
                </li>
              </ul>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleUpgrade('enterprise')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Contact Sales
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Billing History</span>
          </CardTitle>
          <CardDescription>
            View and download your billing history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No billing history</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your billing history will appear here once you have transactions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Payment Method</span>
          </CardTitle>
          <CardDescription>
            Manage your payment methods and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payment method</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add a payment method to upgrade your plan
            </p>
            <div className="mt-6">
              <Button variant="outline" disabled>
                Add Payment Method
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ className, children, ...props }: { className?: string; children: React.ReactNode; [key: string]: any }) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  );
}