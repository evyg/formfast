'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Calendar, Zap, FileText } from 'lucide-react';

interface UsageMetricsProps {
  creditsUsed: number;
  creditsLimit: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

export function UsageMetrics({ 
  creditsUsed, 
  creditsLimit, 
  billingPeriodStart, 
  billingPeriodEnd 
}: UsageMetricsProps) {
  const creditsPercentage = (creditsUsed / creditsLimit) * 100;
  const creditsRemaining = creditsLimit - creditsUsed;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate days remaining in billing period
  const today = new Date();
  const periodEnd = new Date(billingPeriodEnd);
  const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  // Estimate daily usage
  const periodStart = new Date(billingPeriodStart);
  const daysElapsed = Math.max(1, Math.ceil((today.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
  const avgDailyUsage = creditsUsed / daysElapsed;

  return (
    <div className="space-y-6">
      {/* Credits Usage */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Credits Usage</span>
          </div>
          <span className="text-sm text-gray-600">
            {creditsUsed} / {creditsLimit}
          </span>
        </div>
        
        <Progress value={creditsPercentage} className="h-3" />
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{creditsRemaining} credits remaining</span>
          <span>{Math.round(creditsPercentage)}% used</span>
        </div>
      </div>

      {/* Usage Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {avgDailyUsage.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500">Avg daily usage</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{daysRemaining}</p>
            <p className="text-xs text-gray-500">Days remaining</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {Math.floor(creditsUsed / 2)}
            </p>
            <p className="text-xs text-gray-500">Docs processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Period */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Billing Period</span>
        </div>
        <span className="text-sm text-gray-600">
          {formatDate(billingPeriodStart)} - {formatDate(billingPeriodEnd)}
        </span>
      </div>

      {/* Usage Projection */}
      {avgDailyUsage > 0 && daysRemaining > 0 && (
        <div className="p-4 border rounded-lg">
          <h4 className="text-sm font-medium mb-2">Usage Projection</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Projected end-of-period usage:</span>
              <span className="font-medium">
                {Math.round(creditsUsed + (avgDailyUsage * daysRemaining))} credits
              </span>
            </div>
            {(creditsUsed + (avgDailyUsage * daysRemaining)) > creditsLimit && (
              <p className="text-amber-600 text-xs">
                ⚠️ You may exceed your credit limit before the period ends
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}