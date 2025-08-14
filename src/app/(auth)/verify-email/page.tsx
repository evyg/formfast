'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { Mail, CheckCircle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/services/logger';

function VerifyEmailContent() {
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleResendVerification = async () => {
    if (!email) return;

    setIsResending(true);
    setResendStatus('idle');
    logger.userAction('resend_verification_attempt', { email });

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        throw error;
      }

      setResendStatus('success');
      logger.userAction('resend_verification_success', { email });
    } catch (error: any) {
      logger.error('resend_verification_error', { email, error: error.message });
      setResendStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="mb-6">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Check Your Email
        </h2>
        <p className="text-gray-600">
          We&apos;ve sent a verification link to{' '}
          {email && (
            <span className="font-medium text-gray-900">{email}</span>
          )}
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-start space-x-3 text-left">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Click the verification link
            </p>
            <p className="text-sm text-gray-600">
              Check your inbox and click the link to verify your account
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3 text-left">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Return to FormFast
            </p>
            <p className="text-sm text-gray-600">
              Once verified, you&apos;ll be automatically signed in
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Didn&apos;t receive the email? Check your spam folder or try again.
        </p>

        {resendStatus === 'success' && (
          <div className="p-3 rounded-md bg-green-50 border border-green-200">
            <p className="text-sm text-green-600">
              Verification email sent! Please check your inbox.
            </p>
          </div>
        )}

        {resendStatus === 'error' && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">
              Failed to send verification email. Please try again.
            </p>
          </div>
        )}

        <Button
          onClick={handleResendVerification}
          disabled={isResending || !email}
          variant="outline"
          className="w-full"
        >
          {isResending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Resend Verification Email'
          )}
        </Button>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Wrong email address?{' '}
            <Link 
              href="/signup" 
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign up again
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Loading...
          </h2>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}