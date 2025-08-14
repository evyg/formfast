'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Mail, MessageSquare, Save, Loader2 } from 'lucide-react';
import { logger } from '@/lib/services/logger';

interface NotificationSettingsProps {
  user: User;
}

interface NotificationPreferences {
  email_notifications: boolean;
  processing_complete: boolean;
  processing_failed: boolean;
  weekly_summary: boolean;
  product_updates: boolean;
  security_alerts: boolean;
  marketing_emails: boolean;
}

export function NotificationSettings({ user }: NotificationSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    processing_complete: true,
    processing_failed: true,
    weekly_summary: true,
    product_updates: true,
    security_alerts: true,
    marketing_emails: false,
  });

  const supabase = createClient();

  useEffect(() => {
    loadNotificationPreferences();
  }, []);

  const loadNotificationPreferences = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data?.notification_preferences) {
        setPreferences({ ...preferences, ...data.notification_preferences });
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          notification_preferences: preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      logger.userAction('notification_preferences_updated', {
        user_id: user.id,
        preferences,
      });

      // TODO: Add success toast notification
    } catch (error: any) {
      logger.error('notification_preferences_error', {
        user_id: user.id,
        error: error.message,
      });
      // TODO: Add error toast notification
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Email Notifications</span>
          </CardTitle>
          <CardDescription>
            Configure when you receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_notifications">Enable Email Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email_notifications"
              checked={preferences.email_notifications}
              onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
            />
          </div>

          <div className="space-y-4 ml-4 border-l-2 border-gray-100 pl-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="processing_complete">Processing Complete</Label>
                <p className="text-sm text-gray-500">
                  When document processing is finished
                </p>
              </div>
              <Switch
                id="processing_complete"
                checked={preferences.processing_complete}
                onCheckedChange={(checked) => updatePreference('processing_complete', checked)}
                disabled={!preferences.email_notifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="processing_failed">Processing Failed</Label>
                <p className="text-sm text-gray-500">
                  When document processing encounters an error
                </p>
              </div>
              <Switch
                id="processing_failed"
                checked={preferences.processing_failed}
                onCheckedChange={(checked) => updatePreference('processing_failed', checked)}
                disabled={!preferences.email_notifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly_summary">Weekly Summary</Label>
                <p className="text-sm text-gray-500">
                  Weekly digest of your activity and documents
                </p>
              </div>
              <Switch
                id="weekly_summary"
                checked={preferences.weekly_summary}
                onCheckedChange={(checked) => updatePreference('weekly_summary', checked)}
                disabled={!preferences.email_notifications}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>System Notifications</span>
          </CardTitle>
          <CardDescription>
            Important updates and security alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="security_alerts">Security Alerts</Label>
              <p className="text-sm text-gray-500">
                Important security notifications (recommended)
              </p>
            </div>
            <Switch
              id="security_alerts"
              checked={preferences.security_alerts}
              onCheckedChange={(checked) => updatePreference('security_alerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="product_updates">Product Updates</Label>
              <p className="text-sm text-gray-500">
                New features and product announcements
              </p>
            </div>
            <Switch
              id="product_updates"
              checked={preferences.product_updates}
              onCheckedChange={(checked) => updatePreference('product_updates', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Marketing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Marketing Communications</span>
          </CardTitle>
          <CardDescription>
            Promotional content and tips
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing_emails">Marketing Emails</Label>
              <p className="text-sm text-gray-500">
                Tips, tutorials, and promotional content
              </p>
            </div>
            <Switch
              id="marketing_emails"
              checked={preferences.marketing_emails}
              onCheckedChange={(checked) => updatePreference('marketing_emails', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}