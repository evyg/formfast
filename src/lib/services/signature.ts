import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';

const CreateSignatureSchema = z.object({
  name: z.string().min(1, 'Signature name is required'),
  data: z.string().min(1, 'Signature data is required'),
  type: z.enum(['draw', 'type', 'upload']),
  is_default: z.boolean().default(false),
});

const UpdateSignatureSchema = z.object({
  name: z.string().optional(),
  is_default: z.boolean().optional(),
});

export interface Signature {
  id: string;
  name: string;
  data: string; // Base64 image data
  type: 'draw' | 'type' | 'upload';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export class SignatureService {
  private static supabase = createClient();

  /**
   * Get all signatures for the current user
   */
  static async getSignatures(): Promise<Signature[]> {
    const { data, error } = await this.supabase
      .from('signatures')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      console.error('Error fetching signatures:', error);
      throw new Error('Failed to fetch signatures');
    }

    return data || [];
  }

  /**
   * Get a signature by ID
   */
  static async getSignature(id: string): Promise<Signature | null> {
    const { data, error } = await this.supabase
      .from('signatures')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching signature:', error);
      throw new Error('Failed to fetch signature');
    }

    return data;
  }

  /**
   * Get the default signature for the current user
   */
  static async getDefaultSignature(): Promise<Signature | null> {
    const { data, error } = await this.supabase
      .from('signatures')
      .select('*')
      .eq('is_default', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching default signature:', error);
      throw new Error('Failed to fetch default signature');
    }

    return data;
  }

  /**
   * Create a new signature
   */
  static async createSignature(signatureData: z.infer<typeof CreateSignatureSchema>): Promise<Signature> {
    const validatedData = CreateSignatureSchema.parse(signatureData);

    // If this is being set as default, unset other defaults first
    if (validatedData.is_default) {
      await this.unsetAllDefaults();
    }

    const { data, error } = await this.supabase
      .from('signatures')
      .insert([validatedData])
      .select()
      .single();

    if (error) {
      console.error('Error creating signature:', error);
      throw new Error('Failed to create signature');
    }

    return data;
  }

  /**
   * Update a signature
   */
  static async updateSignature(
    id: string,
    updates: z.infer<typeof UpdateSignatureSchema>
  ): Promise<Signature> {
    const validatedData = UpdateSignatureSchema.parse(updates);

    // If setting as default, unset other defaults first
    if (validatedData.is_default) {
      await this.unsetAllDefaults();
    }

    const { data, error } = await this.supabase
      .from('signatures')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating signature:', error);
      throw new Error('Failed to update signature');
    }

    return data;
  }

  /**
   * Delete a signature
   */
  static async deleteSignature(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('signatures')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting signature:', error);
      throw new Error('Failed to delete signature');
    }
  }

  /**
   * Set a signature as the default
   */
  static async setAsDefault(id: string): Promise<Signature> {
    // First unset all defaults
    await this.unsetAllDefaults();

    // Then set this one as default
    return await this.updateSignature(id, { is_default: true });
  }

  /**
   * Unset all default signatures
   */
  private static async unsetAllDefaults(): Promise<void> {
    const { error } = await this.supabase
      .from('signatures')
      .update({ is_default: false })
      .eq('is_default', true);

    if (error) {
      console.error('Error unsetting defaults:', error);
      throw new Error('Failed to unset default signatures');
    }
  }

  /**
   * Upload signature image to storage
   */
  static async uploadSignatureImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `signature-${Date.now()}.${fileExt}`;
    const filePath = `signatures/${fileName}`;

    const { data, error } = await this.supabase.storage
      .from('signatures')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading signature:', error);
      throw new Error('Failed to upload signature image');
    }

    // Get public URL
    const { data: publicUrlData } = this.supabase.storage
      .from('signatures')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }

  /**
   * Convert canvas to data URL for storage
   */
  static canvasToDataUrl(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/png');
  }

  /**
   * Resize signature data to standard size
   */
  static resizeSignatureData(dataUrl: string, maxWidth: number = 400, maxHeight: number = 200): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        const newWidth = img.width * ratio;
        const newHeight = img.height * ratio;

        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw resized image
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, newWidth, newHeight);
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    });
  }
}