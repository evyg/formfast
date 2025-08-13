import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { OCRService, UploadService } from '@/lib/services';
import { ProcessOCRRequestSchema } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const { supabase, user } = await createClient(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ProcessOCRRequestSchema.parse(body);

    // Get the upload record
    const upload = await UploadService.getUpload(validatedData.upload_id, user.id);
    if (!upload) {
      return NextResponse.json(
        { success: false, error: 'Upload not found' },
        { status: 404 }
      );
    }

    // Check if OCR has already been processed
    if (upload.status === 'completed' && upload.ocr_json) {
      return NextResponse.json({
        success: true,
        upload_id: validatedData.upload_id,
        candidates: upload.ocr_json.candidates || [],
        processing_time_ms: 0,
      });
    }

    // Update upload status to processing
    await UploadService.updateUploadStatus(validatedData.upload_id, 'processing');

    // Get file buffer from storage
    const fileBuffer = await UploadService.getFileBuffer(upload.file_path);
    if (!fileBuffer) {
      await UploadService.updateUploadStatus(validatedData.upload_id, 'failed');
      return NextResponse.json(
        { success: false, error: 'Could not load file for processing' },
        { status: 500 }
      );
    }

    // Process OCR
    const ocrResult = await OCRService.processFile(
      fileBuffer,
      upload.original_filename,
      upload.mime_type
    );

    if (!ocrResult.success) {
      await UploadService.updateUploadStatus(validatedData.upload_id, 'failed');
      return NextResponse.json(ocrResult);
    }

    // Group nearby candidates for better field detection
    const groupedCandidates = OCRService.groupNearbyCandidates(ocrResult.candidates);

    // Update upload with OCR results
    const ocrData = {
      candidates: groupedCandidates,
      processing_time_ms: ocrResult.processing_time_ms,
      processed_at: new Date().toISOString(),
    };

    await UploadService.updateUploadStatus(validatedData.upload_id, 'completed', ocrData);

    return NextResponse.json({
      success: true,
      upload_id: validatedData.upload_id,
      candidates: groupedCandidates,
      processing_time_ms: ocrResult.processing_time_ms,
    });

  } catch (error) {
    console.error('OCR API error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}