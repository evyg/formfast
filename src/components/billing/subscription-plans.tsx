'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Star, 
  Check, 
  ArrowUpCircle, 
  ExternalLink,
  Loader2 
} from 'lucide-react';
import { logger } from '@/lib/services/logger';

interface SubscriptionPlansProps {
  currentPlan: 'free' | 'pro' | 'enterprise';
  userId: string;
}

export function SubscriptionPlans({ currentPlan, userId }: SubscriptionPlansProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleUpgrade = async (planType: string) => {
    setIsUpgrading(true);
    setSelectedPlan(planType);

    try {
      logger.userAction('plan_upgrade_initiated', {
        user_id: userId,
        from_plan: currentPlan,
        to_plan: planType,
      });

      // In a real app, this would redirect to Stripe checkout or payment provider
      // For now, we'll simulate the upgrade process
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (planType === 'enterprise') {
        // Enterprise plans typically require sales contact
        window.open('mailto:sales@formfast.com?subject=Enterprise Plan Inquiry', '_blank');
      } else {
        // TODO: Implement Stripe checkout or payment provider integration
        console.log(`Initiating upgrade to ${planType} plan`);
        
        // Redirect to checkout page (placeholder)
        // window.location.href = `/checkout?plan=${planType}`;
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      logger.error('plan_upgrade_error', {
        user_id: userId,
        plan: planType,
        error: 'Upgrade initiation failed',
      });
    } finally {
      setIsUpgrading(false);
      setSelectedPlan(null);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: 'month',
      description: 'Perfect for trying out FormFast',
      features: [
        '100 credits per month',
        'Standard processing speed',
        'Basic OCR features',
        'Email support',
        'Web dashboard access'
      ],
      buttonText: 'Current Plan',
      popular: false,
      disabled: currentPlan === 'free',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 29,
      period: 'month',
      description: 'For professionals and small businesses',
      features: [
        '1,000 credits per month',
        'Priority processing',
        'Advanced OCR features',
        'Email support',
        'API access',
        'Batch processing',
        'Custom export formats'
      ],
      buttonText: currentPlan === 'pro' ? 'Current Plan' : 'Upgrade to Pro',
      popular: true,
      disabled: currentPlan === 'pro',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: null,
      period: null,
      description: 'For large organizations with high volume',
      features: [
        'Unlimited credits',
        'Dedicated infrastructure',
        'Custom integrations',
        '24/7 phone support',
        'SLA guarantee',
        'On-premise deployment',
        'Custom AI models',
        'White-label options'
      ],
      buttonText: currentPlan === 'enterprise' ? 'Current Plan' : 'Contact Sales',
      popular: false,
      disabled: currentPlan === 'enterprise',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Plans</CardTitle>
        <CardDescription>
          Choose the plan that works best for you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-4 border rounded-lg ${
                plan.popular 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200'
              } ${
                plan.id === currentPlan 
                  ? 'ring-2 ring-blue-500 ring-opacity-50' 
                  : ''
              }`}
            >
              {plan.popular && (
                <Badge 
                  className="absolute -top-2 left-4 bg-blue-500 text-white"
                >
                  Most Popular
                </Badge>
              )}
              
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    {plan.id === 'pro' && <Zap className="h-4 w-4 text-blue-500" />}
                    {plan.id === 'enterprise' && <Star className="h-4 w-4 text-purple-500" />}
                  </div>
                  
                  <div className="mt-1">
                    {plan.price !== null ? (
                      <div className="flex items-baseline space-x-1">
                        <span className="text-2xl font-bold">${plan.price}</span>
                        <span className="text-gray-500">/{plan.period}</span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold">Custom</span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                  
                  <ul className="mt-3 space-y-1">
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm">
                        <Check className="h-3 w-3 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 3 && (
                      <li className="text-xs text-gray-500">
                        +{plan.features.length - 3} more features
                      </li>
                    )}
                  </ul>
                </div>
                
                <div className="ml-4">
                  <Button
                    variant={plan.disabled ? "secondary" : plan.popular ? "default" : "outline"}
                    size="sm"
                    disabled={plan.disabled || (isUpgrading && selectedPlan === plan.id)}
                    onClick={() => !plan.disabled && handleUpgrade(plan.id)}
                    className="min-w-[120px]"
                  >
                    {isUpgrading && selectedPlan === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {plan.id === 'enterprise' && !plan.disabled && (
                          <ExternalLink className="mr-2 h-3 w-3" />
                        )}
                        {!plan.disabled && plan.id !== 'enterprise' && (
                          <ArrowUpCircle className="mr-2 h-3 w-3" />
                        )}
                        {plan.buttonText}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Billing Notice */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            • All plans include a 7-day free trial
            <br />
            • Cancel anytime, no long-term commitments
            <br />
            • All prices shown in USD, taxes may apply
          </p>
        </div>
      </CardContent>
    </Card>
  );
}