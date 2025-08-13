import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { FieldClassificationService, UploadService } from '@/lib/services';
import { ClassifyFieldsRequestSchema } from '@/lib/types';

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
    const validatedData = ClassifyFieldsRequestSchema.parse(body);

    // Verify user owns the upload
    const upload = await UploadService.getUpload(validatedData.upload_id, user.id);
    if (!upload) {
      return NextResponse.json(
        { success: false, error: 'Upload not found' },
        { status: 404 }
      );
    }

    // Check if we have OCR candidates
    if (!validatedData.candidates || validatedData.candidates.length === 0) {
      return NextResponse.json({
        success: true,
        upload_id: validatedData.upload_id,
        classified_fields: [],
        processing_time_ms: 0,
      });
    }

    // Pre-process candidates to improve classification
    const processedCandidates = FieldClassificationService.preprocessCandidates(
      validatedData.candidates
    );

    // Classify fields using OpenAI
    const classificationResult = await FieldClassificationService.classifyFields(
      processedCandidates
    );

    if (!classificationResult.success) {
      return NextResponse.json(classificationResult);
    }

    // Update upload with classified fields
    const existingOcrData = upload.ocr_json || {};
    const updatedOcrData = {
      ...existingOcrData,
      classified_fields: classificationResult.classified_fields,
      classification_time_ms: classificationResult.processing_time_ms,
      classified_at: new Date().toISOString(),
    };

    await UploadService.updateUploadStatus(
      validatedData.upload_id,
      'completed',
      updatedOcrData
    );

    return NextResponse.json({
      success: true,
      upload_id: validatedData.upload_id,
      classified_fields: classificationResult.classified_fields,
      processing_time_ms: classificationResult.processing_time_ms,
    });

  } catch (error) {
    console.error('Classification API error:', error);

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