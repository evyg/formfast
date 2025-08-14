'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Save, Loader2 } from 'lucide-react';
import { logger } from '@/lib/services/logger';

interface ProfileSettingsProps {
  user: User;
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState(
    user.user_metadata?.full_name || 
    user.user_metadata?.name || 
    user.email?.split('@')[0] || ''
  );
  const [displayName, setDisplayName] = useState(
    user.user_metadata?.display_name || 
    user.user_metadata?.full_name || 
    user.email?.split('@')[0] || ''
  );
  const [phoneNumber, setPhoneNumber] = useState(
    user.user_metadata?.phone || ''
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const getUserInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null;

    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Avatar upload error:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let avatarUrl = user.user_metadata?.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      const updates = {
        data: {
          full_name: fullName,
          display_name: displayName,
          phone: phoneNumber,
          avatar_url: avatarUrl,
        },
      };

      const { error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      logger.userAction('profile_updated', {
        user_id: user.id,
        updated_fields: ['full_name', 'display_name', 'phone', 'avatar_url'],
      });

      // Refresh the page to show updated data
      router.refresh();
      
      // TODO: Add success toast notification
    } catch (error: any) {
      logger.error('profile_update_error', {
        user_id: user.id,
        error: error.message,
      });
      // TODO: Add error toast notification
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center space-x-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src={avatarPreview || user.user_metadata?.avatar_url} />
          <AvatarFallback className="bg-blue-500 text-white text-lg">
            {getUserInitials(user.email || 'U')}
          </AvatarFallback>
        </Avatar>
        
        <div className="space-y-2">
          <Label htmlFor="avatar" className="text-sm font-medium">
            Profile Picture
          </Label>
          <div className="flex items-center space-x-2">
            <Input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('avatar')?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose Image
            </Button>
            <p className="text-xs text-gray-500">JPG, PNG or GIF (max. 5MB)</p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={user.email || ''}
            disabled
            className="bg-gray-50"
          />
          <p className="text-xs text-gray-500">
            Email cannot be changed. Contact support if needed.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How others see your name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      {/* Account Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Statistics</CardTitle>
          <CardDescription>
            Your account activity and usage summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">-</p>
              <p className="text-sm text-gray-600">Documents Processed</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">-</p>
              <p className="text-sm text-gray-600">Credits Used</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {user.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : '-'}
              </p>
              <p className="text-sm text-gray-600">Days Active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}