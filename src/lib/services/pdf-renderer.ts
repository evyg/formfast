import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
// pdfjs-dist not needed here - using pdf-lib for PDF manipulation
import { supabaseServer } from '../supabase/server';
import {
  ClassifiedField,
  FieldMapping,
  BoundingBox,
  RenderPDFRequest,
  RenderPDFResponse,
} from '../types';
import { UploadService } from './upload';

export interface SignaturePlacement {
  signatureId: string;
  fieldId: string;
  bbox: BoundingBox;
  width: number;
  height: number;
}

export interface DatePlacement {
  fieldId: string;
  value: string;
  bbox: BoundingBox;
}

export class PDFRendererService {
  private static readonly DEFAULT_FONT_SIZE = 12;
  private static readonly SIGNATURE_MAX_WIDTH = 200;
  private static readonly SIGNATURE_MAX_HEIGHT = 50;

  /**
   * Render PDF with filled form data
   */
  static async renderPDF(
    uploadId: string,
    mappings: FieldMapping[],
    signatureId: string,
    dateSelections: Record<string, string>,
    userId: string
  ): Promise<RenderPDFResponse> {
    const startTime = Date.now();

    try {
      // Get the original upload
      const upload = await UploadService.getUpload(uploadId, userId);
      if (!upload) {
        return {
          success: false,
          error: 'Upload not found',
        };
      }

      // Get the original file buffer
      const fileBuffer = await UploadService.getFileBuffer(upload.file_path);
      if (!fileBuffer) {
        return {
          success: false,
          error: 'Could not load original file',
        };
      }

      // Get classified fields from OCR data
      const classifiedFields = upload.ocr_json?.classified_fields || [];

      // Render the PDF based on file type
      let pdfBytes: Uint8Array;
      if (upload.mime_type === 'application/pdf') {
        pdfBytes = await this.renderPDFDocument(
          fileBuffer,
          mappings,
          classifiedFields,
          signatureId,
          dateSelections,
          userId
        );
      } else {
        // For images, create a new PDF with the image as background
        pdfBytes = await this.renderImageAsPDF(
          fileBuffer,
          upload.mime_type,
          mappings,
          classifiedFields,
          signatureId,
          dateSelections,
          userId
        );
      }

      // Save the rendered PDF to storage
      const outputPath = `${userId}/completed/${uploadId}-${Date.now()}.pdf`;
      const { error: uploadError } = await supabaseServer.storage
        .from('completed-forms')
        .upload(outputPath, pdfBytes, {
          contentType: 'application/pdf',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('PDF upload error:', uploadError);
        return {
          success: false,
          error: 'Failed to save completed PDF',
        };
      }

      // Create form fill record
      const { data: formFill, error: dbError } = await supabaseServer
        .from('form_fills')
        .insert({
          user_id: userId,
          upload_id: uploadId,
          mapping: mappings,
          output_pdf_path: outputPath,
          credits_spent: 1,
          status: 'completed',
        })
        .select()
        .single();

      if (dbError || !formFill) {
        console.error('Form fill creation error:', dbError);
        return {
          success: false,
          error: 'Failed to create form fill record',
        };
      }

      // Generate signed download URL
      const { data: signedUrl } = await supabaseServer.storage
        .from('completed-forms')
        .createSignedUrl(outputPath, 3600); // 1 hour expiry

      if (!signedUrl) {
        return {
          success: false,
          error: 'Failed to generate download URL',
        };
      }

      // Consume user credit
      await this.consumeUserCredit(userId);

      return {
        success: true,
        data: {
          form_fill_id: formFill.id,
          download_url: signedUrl.signedUrl,
          file_size: pdfBytes.length,
          pages: await this.getPDFPageCount(pdfBytes),
          credits_spent: 1,
        },
      };
    } catch (error) {
      console.error('PDF rendering error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF rendering failed',
      };
    }
  }

  /**
   * Render existing PDF document with form data
   */
  private static async renderPDFDocument(
    fileBuffer: ArrayBuffer,
    mappings: FieldMapping[],
    classifiedFields: ClassifiedField[],
    signatureId: string,
    dateSelections: Record<string, string>,
    userId: string
  ): Promise<Uint8Array> {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const pages = pdfDoc.getPages();
    
    // Get signature image if provided
    let signatureImageBytes: Uint8Array | null = null;
    if (signatureId) {
      signatureImageBytes = await this.getSignatureImage(signatureId, userId);
    }

    // Embed font for text fields
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Process each mapping
    for (const mapping of mappings) {
      if (!mapping.value) continue;

      const field = classifiedFields.find(f => f.id === mapping.field_id);
      if (!field) continue;

      const page = pages[field.bbox.page - 1];
      if (!page) continue;

      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Convert normalized coordinates to PDF coordinates
      const x = field.bbox.x * pageWidth;
      const y = pageHeight - (field.bbox.y * pageHeight) - (field.bbox.height * pageHeight);
      const fieldWidth = field.bbox.width * pageWidth;
      const fieldHeight = field.bbox.height * pageHeight;

      await this.renderFieldOnPage(
        page,
        field,
        mapping.value,
        x,
        y,
        fieldWidth,
        fieldHeight,
        font,
        signatureImageBytes
      );
    }

    // Add signatures if provided
    if (signatureImageBytes) {
      await this.addSignaturesToPDF(
        pdfDoc,
        classifiedFields,
        signatureImageBytes
      );
    }

    // Add dates
    await this.addDatesToPDF(
      pdfDoc,
      classifiedFields,
      dateSelections,
      font
    );

    return await pdfDoc.save();
  }

  /**
   * Render image as PDF with form data overlay
   */
  private static async renderImageAsPDF(
    imageBuffer: ArrayBuffer,
    mimeType: string,
    mappings: FieldMapping[],
    classifiedFields: ClassifiedField[],
    signatureId: string,
    dateSelections: Record<string, string>,
    userId: string
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    
    // Embed the image
    let image;
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      image = await pdfDoc.embedJpg(imageBuffer);
    } else if (mimeType === 'image/png') {
      image = await pdfDoc.embedPng(imageBuffer);
    } else {
      throw new Error(`Unsupported image type: ${mimeType}`);
    }

    // Create a page with the image dimensions
    const page = pdfDoc.addPage([image.width, image.height]);
    
    // Draw the image as background
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    // Get font for text
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Get signature if provided
    let signatureImageBytes: Uint8Array | null = null;
    if (signatureId) {
      signatureImageBytes = await this.getSignatureImage(signatureId, userId);
    }

    // Render form fields on top
    for (const mapping of mappings) {
      if (!mapping.value) continue;

      const field = classifiedFields.find(f => f.id === mapping.field_id);
      if (!field) continue;

      // Convert normalized coordinates to image coordinates
      const x = field.bbox.x * image.width;
      const y = image.height - (field.bbox.y * image.height) - (field.bbox.height * image.height);
      const fieldWidth = field.bbox.width * image.width;
      const fieldHeight = field.bbox.height * image.height;

      await this.renderFieldOnPage(
        page,
        field,
        mapping.value,
        x,
        y,
        fieldWidth,
        fieldHeight,
        font,
        signatureImageBytes
      );
    }

    return await pdfDoc.save();
  }

  /**
   * Render a single field on a PDF page
   */
  private static async renderFieldOnPage(
    page: any,
    field: ClassifiedField,
    value: any,
    x: number,
    y: number,
    width: number,
    height: number,
    font: any,
    signatureImage: Uint8Array | null
  ): Promise<void> {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        await this.renderTextField(page, String(value), x, y, width, height, font);
        break;
        
      case 'date':
        await this.renderTextField(page, String(value), x, y, width, height, font);
        break;
        
      case 'checkbox':
        await this.renderCheckbox(page, Boolean(value), x, y, width, height);
        break;
        
      case 'signature':
        if (signatureImage) {
          await this.renderSignature(page, signatureImage, x, y, width, height);
        }
        break;
        
      default:
        // Fallback to text rendering
        await this.renderTextField(page, String(value), x, y, width, height, font);
    }
  }

  /**
   * Render text field
   */
  private static async renderTextField(
    page: any,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    font: any
  ): Promise<void> {
    const fontSize = Math.min(this.DEFAULT_FONT_SIZE, height * 0.7);
    
    page.drawText(text, {
      x: x + 2, // Small padding
      y: y + (height - fontSize) / 2, // Vertically center
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
      maxWidth: width - 4, // Account for padding
    });
  }

  /**
   * Render checkbox
   */
  private static async renderCheckbox(
    page: any,
    checked: boolean,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    if (checked) {
      // Draw a checkmark
      const checkSize = Math.min(width, height) * 0.6;
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      
      page.drawText('✓', {
        x: centerX - checkSize / 2,
        y: centerY - checkSize / 2,
        size: checkSize,
        color: rgb(0, 0, 0),
      });
    }
  }

  /**
   * Render signature
   */
  private static async renderSignature(
    page: any,
    signatureBytes: Uint8Array,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    try {
      const pdfDoc = page.doc;
      const signatureImage = await pdfDoc.embedPng(signatureBytes);
      
      // Calculate aspect ratio preserving dimensions
      const aspectRatio = signatureImage.width / signatureImage.height;
      let drawWidth = width;
      let drawHeight = height;
      
      if (width / height > aspectRatio) {
        drawWidth = height * aspectRatio;
      } else {
        drawHeight = width / aspectRatio;
      }
      
      // Center the signature in the field
      const offsetX = (width - drawWidth) / 2;
      const offsetY = (height - drawHeight) / 2;
      
      page.drawImage(signatureImage, {
        x: x + offsetX,
        y: y + offsetY,
        width: drawWidth,
        height: drawHeight,
      });
    } catch (error) {
      console.error('Error rendering signature:', error);
    }
  }

  /**
   * Add signatures to PDF
   */
  private static async addSignaturesToPDF(
    pdfDoc: any,
    fields: ClassifiedField[],
    signatureBytes: Uint8Array
  ): Promise<void> {
    const signatureFields = fields.filter(f => f.type === 'signature');
    if (signatureFields.length === 0) return;

    const signatureImage = await pdfDoc.embedPng(signatureBytes);
    const pages = pdfDoc.getPages();

    for (const field of signatureFields) {
      const page = pages[field.bbox.page - 1];
      if (!page) continue;

      const { width: pageWidth, height: pageHeight } = page.getSize();
      const x = field.bbox.x * pageWidth;
      const y = pageHeight - (field.bbox.y * pageHeight) - (field.bbox.height * pageHeight);
      const fieldWidth = field.bbox.width * pageWidth;
      const fieldHeight = field.bbox.height * pageHeight;

      await this.renderSignature(page, signatureBytes, x, y, fieldWidth, fieldHeight);
    }
  }

  /**
   * Add dates to PDF
   */
  private static async addDatesToPDF(
    pdfDoc: any,
    fields: ClassifiedField[],
    dateSelections: Record<string, string>,
    font: any
  ): Promise<void> {
    const dateFields = fields.filter(f => f.type === 'date');
    const pages = pdfDoc.getPages();

    for (const field of dateFields) {
      const dateValue = dateSelections[field.id] || dateSelections[field.key];
      if (!dateValue) continue;

      const page = pages[field.bbox.page - 1];
      if (!page) continue;

      const { width: pageWidth, height: pageHeight } = page.getSize();
      const x = field.bbox.x * pageWidth;
      const y = pageHeight - (field.bbox.y * pageHeight) - (field.bbox.height * pageHeight);
      const fieldWidth = field.bbox.width * pageWidth;
      const fieldHeight = field.bbox.height * pageHeight;

      await this.renderTextField(page, dateValue, x, y, fieldWidth, fieldHeight, font);
    }
  }

  /**
   * Get signature image from storage
   */
  private static async getSignatureImage(
    signatureId: string,
    userId: string
  ): Promise<Uint8Array | null> {
    try {
      // Get signature record
      const { data: signature } = await supabaseServer
        .from('signatures')
        .select('image_path')
        .eq('id', signatureId)
        .eq('user_id', userId)
        .single();

      if (!signature) {
        return null;
      }

      // Download image from storage
      const { data, error } = await supabaseServer.storage
        .from('signatures')
        .download(signature.image_path);

      if (error || !data) {
        console.error('Signature download error:', error);
        return null;
      }

      return new Uint8Array(await data.arrayBuffer());
    } catch (error) {
      console.error('Get signature image error:', error);
      return null;
    }
  }

  /**
   * Get PDF page count
   */
  private static async getPDFPageCount(pdfBytes: Uint8Array): Promise<number> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      return pdfDoc.getPageCount();
    } catch (error) {
      console.error('Error getting PDF page count:', error);
      return 1;
    }
  }

  /**
   * Consume user credit
   */
  private static async consumeUserCredit(userId: string): Promise<void> {
    try {
      await supabaseServer.rpc('consume_credit', {
        p_user_id: userId,
      });
    } catch (error) {
      console.error('Error consuming credit:', error);
    }
  }

  /**
   * Preview PDF rendering (for UI preview)
   */
  static async previewPDFRender(
    uploadId: string,
    mappings: FieldMapping[],
    signatureId?: string,
    userId?: string
  ): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
    try {
      // This would generate a preview without consuming credits
      // Implementation similar to renderPDF but with preview-specific logic
      return {
        success: true,
        previewUrl: 'data:application/pdf;base64,...', // Base64 encoded preview
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Preview generation failed',
      };
    }
  }
}