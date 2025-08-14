'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Loader2 } from 'lucide-react';
import { showToast } from '@/lib/toast';

export function BillingPortal() {
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenPortal = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success && result.data?.url) {
        // Open in new tab to avoid losing the current session
        window.open(result.data.url, '_blank');
        showToast.info('Billing portal opened', 'Manage your subscription in the new tab');
      } else {
        throw new Error(result.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      showToast.error('Portal unavailable', 'Please try again or contact support');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Management</CardTitle>
        <CardDescription>
          Manage your subscription, payment methods, and billing history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use the customer portal to:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Update payment methods</li>
            <li>• Download invoices and receipts</li>
            <li>• Change or cancel your subscription</li>
            <li>• Update billing information</li>
          </ul>
          
          <Button 
            onClick={handleOpenPortal} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Opening Portal...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Billing Portal
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}