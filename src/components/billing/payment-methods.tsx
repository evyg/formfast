'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CreditCard, 
  Plus, 
  MoreVertical, 
  Trash2, 
  Star,
  Shield
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PaymentMethodsProps {
  userId: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'paypal';
  last4: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  billing_address?: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export function PaymentMethods({ userId }: PaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, [userId]);

  const loadPaymentMethods = async () => {
    setIsLoading(true);
    
    try {
      // TODO: Replace with actual API call to fetch payment methods
      // const response = await fetch(`/api/billing/payment-methods?userId=${userId}`);
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockPaymentMethods: PaymentMethod[] = [
        // Uncomment and modify when you have real payment data
        // {
        //   id: 'pm_001',
        //   type: 'card',
        //   last4: '4242',
        //   brand: 'visa',
        //   exp_month: 12,
        //   exp_year: 2025,
        //   is_default: true,
        //   billing_address: {
        //     line1: '123 Main St',
        //     city: 'San Francisco',
        //     state: 'CA',
        //     postal_code: '94105',
        //     country: 'US'
        //   }
        // },
      ];
      
      setPaymentMethods(mockPaymentMethods);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      setPaymentMethods([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    setIsAdding(true);
    
    try {
      // TODO: Implement Stripe Elements or payment provider integration
      // This would typically open a modal or redirect to a secure payment form
      console.log('Opening payment method form...');
      
      // Mock adding a payment method
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reload payment methods after adding
      await loadPaymentMethods();
    } catch (error) {
      console.error('Failed to add payment method:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      // TODO: API call to set default payment method
      setPaymentMethods(prev => 
        prev.map(pm => ({
          ...pm,
          is_default: pm.id === paymentMethodId
        }))
      );
    } catch (error) {
      console.error('Failed to set default payment method:', error);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      // TODO: API call to delete payment method
      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
    } catch (error) {
      console.error('Failed to delete payment method:', error);
    }
  };

  const getCardIcon = (brand: string) => {
    // In a real app, you might use actual card brand icons
    return <CreditCard className="h-5 w-5 text-gray-500" />;
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-6 bg-gray-200 rounded"></div>
                    <div className="space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paymentMethods.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No payment methods</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add a payment method to upgrade your plan and make payments
          </p>
          <div className="mt-6">
            <Button 
              onClick={handleAddPaymentMethod}
              disabled={isAdding}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isAdding ? 'Adding...' : 'Add Payment Method'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {paymentMethods.map((paymentMethod) => (
            <Card key={paymentMethod.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getCardIcon(paymentMethod.brand)}
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {formatCardBrand(paymentMethod.brand)} •••• {paymentMethod.last4}
                        </span>
                        {paymentMethod.is_default && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            <Star className="mr-1 h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Expires {paymentMethod.exp_month.toString().padStart(2, '0')}/{paymentMethod.exp_year}
                      </p>
                      {paymentMethod.billing_address && (
                        <p className="text-xs text-gray-400">
                          {paymentMethod.billing_address.city}, {paymentMethod.billing_address.state}
                        </p>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!paymentMethod.is_default && (
                        <DropdownMenuItem 
                          onClick={() => handleSetDefault(paymentMethod.id)}
                        >
                          <Star className="mr-2 h-4 w-4" />
                          Set as Default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleDeletePaymentMethod(paymentMethod.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button 
            variant="outline" 
            onClick={handleAddPaymentMethod}
            disabled={isAdding}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            {isAdding ? 'Adding...' : 'Add Payment Method'}
          </Button>
        </>
      )}

      {/* Security Notice */}
      <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <Shield className="h-4 w-4 text-green-600 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-green-900">Secure Payment Processing</p>
          <p className="text-green-700">
            Your payment information is encrypted and securely processed by Stripe.
            We never store your full card details.
          </p>
        </div>
      </div>
    </div>
  );
}