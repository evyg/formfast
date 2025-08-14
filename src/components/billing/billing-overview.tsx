'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowUpCircle, Calendar, TrendingUp } from 'lucide-react';

interface BillingData {
  plan: 'free' | 'individual' | 'family';
  credits_used: number;
  credits_limit: number;
  billing_period_start: string;
  billing_period_end: string;
  next_billing_date: string;
  amount_due: number;
  currency: string;
}

interface BillingOverviewProps {
  billingData: BillingData;
}

export function BillingOverview({ billingData }: BillingOverviewProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
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

  const creditsPercentage = (billingData.credits_used / billingData.credits_limit) * 100;
  const creditsRemaining = billingData.credits_limit - billingData.credits_used;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Current Plan</span>
          {getPlanBadge(billingData.plan)}
        </CardTitle>
        <CardDescription>
          Your subscription details and usage summary
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credits Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Credits</span>
            <span className="text-sm text-gray-600">
              {billingData.credits_used} / {billingData.credits_limit}
            </span>
          </div>
          <Progress value={creditsPercentage} className="h-2" />
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <TrendingUp className="h-3 w-3" />
            <span>{creditsRemaining} credits remaining</span>
          </div>
        </div>

        {/* Billing Period */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Billing Period</span>
          </div>
          <p className="text-sm text-gray-600">
            {formatDate(billingData.billing_period_start)} - {formatDate(billingData.billing_period_end)}
          </p>
        </div>

        {/* Next Billing Date */}
        {billingData.plan !== 'free' && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Next Billing Date</span>
            <p className="text-sm text-gray-600">
              {formatDate(billingData.next_billing_date)}
            </p>
            {billingData.amount_due > 0 && (
              <p className="text-sm font-medium text-green-600">
                {formatCurrency(billingData.amount_due, billingData.currency)} due
              </p>
            )}
          </div>
        )}

        {/* Upgrade CTA for Free Users */}
        {billingData.plan === 'free' && creditsPercentage > 75 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <ArrowUpCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900">
                  Running low on credits
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  Upgrade to Pro for 10x more credits and priority processing
                </p>
                <Button size="sm" className="mt-2">
                  Upgrade Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Plan Benefits */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Plan Benefits</span>
          <ul className="text-sm text-gray-600 space-y-1">
            {billingData.plan === 'free' && (
              <>
                <li>• 100 credits per month</li>
                <li>• Standard processing speed</li>
                <li>• Basic OCR features</li>
                <li>• Email support</li>
              </>
            )}
            {billingData.plan === 'individual' && (
              <>
                <li>• Unlimited form processing</li>
                <li>• Cloud storage</li>
                <li>• AI-powered auto-fill</li>
                <li>• Email support</li>
                <li>• PDF generation</li>
              </>
            )}
            {billingData.plan === 'family' && (
              <>
                <li>• Everything in Individual</li>
                <li>• Up to 5 family members</li>
                <li>• Shared form templates</li>
                <li>• 24/7 phone support</li>
                <li>• SLA guarantee</li>
              </>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}