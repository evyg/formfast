'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar, DollarSign, FileText } from 'lucide-react';

interface BillingHistoryProps {
  userId: string;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  invoice_url?: string;
}

export function BillingHistory({ userId }: BillingHistoryProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBillingHistory();
  }, [userId]);

  const loadBillingHistory = async () => {
    setIsLoading(true);
    
    try {
      // TODO: Replace with actual API call to fetch billing history
      // const response = await fetch(`/api/billing/history?userId=${userId}`);
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockInvoices: Invoice[] = [
        // Uncomment and modify when you have real billing data
        // {
        //   id: 'inv_001',
        //   date: '2024-01-15',
        //   amount: 29.00,
        //   currency: 'USD',
        //   status: 'paid',
        //   description: 'Pro Plan - January 2024',
        //   invoice_url: '/invoices/inv_001.pdf'
        // },
      ];
      
      setInvoices(mockInvoices);
    } catch (error) {
      console.error('Failed to load billing history:', error);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    if (invoice.invoice_url) {
      // In a real app, this would download the invoice PDF
      window.open(invoice.invoice_url, '_blank');
    } else {
      // Generate invoice on demand
      console.log(`Generating invoice for ${invoice.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-48"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No billing history</h3>
        <p className="mt-1 text-sm text-gray-500">
          Your invoices and billing history will appear here once you have transactions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">{invoice.description}</h4>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(invoice.date)}</span>
                </div>
                <span>#{invoice.id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-medium text-gray-900">
                {formatCurrency(invoice.amount, invoice.currency)}
              </p>
              {getStatusBadge(invoice.status)}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownloadInvoice(invoice)}
              disabled={invoice.status !== 'paid'}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      {/* Show more button if there are many invoices */}
      {invoices.length >= 10 && (
        <div className="text-center pt-4">
          <Button variant="outline" size="sm">
            Load More Invoices
          </Button>
        </div>
      )}
    </div>
  );
}