import { toast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export const showToast = {
  success: (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'success',
    });
  },

  error: (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'destructive',
    });
  },

  warning: (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'warning',
    });
  },

  info: (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'default',
    });
  },

  // Common use cases for FormFast
  fileUploadSuccess: (filename: string) => {
    toast({
      title: 'File uploaded successfully',
      description: `${filename} is ready for processing`,
      variant: 'success',
    });
  },

  fileUploadError: (error: string) => {
    toast({
      title: 'Upload failed',
      description: error,
      variant: 'destructive',
    });
  },

  ocrComplete: (fieldsFound: number) => {
    toast({
      title: 'Document processed',
      description: `Found ${fieldsFound} form fields ready for auto-fill`,
      variant: 'success',
    });
  },

  ocrError: (error: string) => {
    toast({
      title: 'Processing failed',
      description: error,
      variant: 'destructive',
    });
  },

  autofillComplete: (filledFields: number) => {
    toast({
      title: 'Form auto-filled',
      description: `Successfully filled ${filledFields} fields with your information`,
      variant: 'success',
    });
  },

  pdfGenerated: () => {
    toast({
      title: 'PDF ready',
      description: 'Your completed form is ready for download',
      variant: 'success',
    });
  },

  profileUpdated: () => {
    toast({
      title: 'Profile updated',
      description: 'Your information has been saved successfully',
      variant: 'success',
    });
  },

  settingsSaved: () => {
    toast({
      title: 'Settings saved',
      description: 'Your preferences have been updated',
      variant: 'success',
    });
  },
};