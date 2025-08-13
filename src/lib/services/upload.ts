import { supabase } from '../supabase/client';
import { supabaseServer } from '../supabase/server';
import { CreateUpload, Upload, UploadFileRequest, UploadFileResponse } from '../types';
import { z } from 'zod';

// File validation schema
const FileValidationSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().min(1).max(50 * 1024 * 1024), // 50MB max
  type: z.enum([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ]),
});

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class UploadService {
  private static readonly UPLOAD_BUCKET = 'uploads';
  private static readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Validate file before upload
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    try {
      FileValidationSchema.parse({
        name: file.name,
        size: file.size,
        type: file.type,
      });
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issue = error.issues[0];
        if (issue.path.includes('type')) {
          return {
            valid: false,
            error: 'Invalid file type. Please upload a PDF or image file.',
          };
        }
        if (issue.path.includes('size')) {
          return {
            valid: false,
            error: 'File too large. Maximum size is 50MB.',
          };
        }
        return {
          valid: false,
          error: 'Invalid file. Please check the file and try again.',
        };
      }
      return { valid: false, error: 'File validation failed.' };
    }
  }

  /**
   * Generate unique file path for storage
   */
  private static generateFilePath(userId: string, filename: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = filename.split('.').pop();
    return `${userId}/${timestamp}-${randomId}.${extension}`;
  }

  /**
   * Upload file to Supabase Storage
   */
  static async uploadFile(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadFileResponse> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Generate file path
      const filePath = this.generateFilePath(userId, file.name);

      // Upload to storage
      const { data, error: uploadError } = await supabase.storage
        .from(this.UPLOAD_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return {
          success: false,
          error: 'Failed to upload file to storage.',
        };
      }

      // Create database record
      const uploadData: CreateUpload = {
        file_path: filePath,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        status: 'pending',
      };

      const { data: dbData, error: dbError } = await supabase
        .from('uploads')
        .insert([uploadData])
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Clean up storage file if database fails
        await supabase.storage
          .from(this.UPLOAD_BUCKET)
          .remove([filePath]);
        
        return {
          success: false,
          error: 'Failed to save upload record.',
        };
      }

      // Log upload action
      await this.logUploadAction(userId, 'file_uploaded', dbData.id);

      return {
        success: true,
        data: {
          upload_id: dbData.id,
          file_path: filePath,
          original_filename: file.name,
          mime_type: file.type,
          file_size: file.size,
        },
      };
    } catch (error) {
      console.error('Upload service error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during upload.',
      };
    }
  }

  /**
   * Get upload by ID (server-side)
   */
  static async getUpload(uploadId: string, userId: string): Promise<Upload | null> {
    try {
      const { data, error } = await supabaseServer
        .from('uploads')
        .select('*')
        .eq('id', uploadId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as Upload;
    } catch (error) {
      console.error('Get upload error:', error);
      return null;
    }
  }

  /**
   * Get signed URL for file download
   */
  static async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.UPLOAD_BUCKET)
        .createSignedUrl(filePath, expiresIn);

      if (error || !data) {
        console.error('Signed URL error:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Signed URL service error:', error);
      return null;
    }
  }

  /**
   * Delete upload and associated file
   */
  static async deleteUpload(uploadId: string, userId: string): Promise<boolean> {
    try {
      // Get upload record
      const upload = await this.getUpload(uploadId, userId);
      if (!upload) {
        return false;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.UPLOAD_BUCKET)
        .remove([upload.file_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabaseServer
        .from('uploads')
        .delete()
        .eq('id', uploadId)
        .eq('user_id', userId);

      if (dbError) {
        console.error('Database delete error:', dbError);
        return false;
      }

      // Log delete action
      await this.logUploadAction(userId, 'file_deleted', uploadId);

      return true;
    } catch (error) {
      console.error('Delete upload error:', error);
      return false;
    }
  }

  /**
   * Update upload status
   */
  static async updateUploadStatus(
    uploadId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    ocrJson?: Record<string, any>
  ): Promise<boolean> {
    try {
      const updates: any = { status };
      if (ocrJson) {
        updates.ocr_json = ocrJson;
      }

      const { error } = await supabaseServer
        .from('uploads')
        .update(updates)
        .eq('id', uploadId);

      if (error) {
        console.error('Update status error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Update upload status error:', error);
      return false;
    }
  }

  /**
   * Get user uploads with pagination
   */
  static async getUserUploads(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ uploads: Upload[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const { count } = await supabase
        .from('uploads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get paginated results
      const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Get user uploads error:', error);
        return { uploads: [], total: 0 };
      }

      return {
        uploads: data as Upload[],
        total: count || 0,
      };
    } catch (error) {
      console.error('Get user uploads service error:', error);
      return { uploads: [], total: 0 };
    }
  }

  /**
   * Get file buffer from storage (server-side only)
   */
  static async getFileBuffer(filePath: string): Promise<ArrayBuffer | null> {
    try {
      const { data, error } = await supabaseServer.storage
        .from(this.UPLOAD_BUCKET)
        .download(filePath);

      if (error || !data) {
        console.error('File download error:', error);
        return null;
      }

      return await data.arrayBuffer();
    } catch (error) {
      console.error('Get file buffer error:', error);
      return null;
    }
  }

  /**
   * Log upload-related actions
   */
  private static async logUploadAction(
    userId: string,
    action: string,
    resourceId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await supabaseServer.rpc('log_user_action', {
        p_user_id: userId,
        p_action: action,
        p_resource_type: 'upload',
        p_resource_id: resourceId,
        p_metadata: metadata,
      });
    } catch (error) {
      console.error('Log upload action error:', error);
    }
  }

  /**
   * Check if user can upload (credit/plan validation)
   */
  static async canUserUpload(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseServer.rpc('check_user_credits', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Check user credits error:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Can user upload error:', error);
      return false;
    }
  }
}