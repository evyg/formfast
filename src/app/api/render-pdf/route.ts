import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { PDFRendererService, UploadService } from '@/lib/services';
import { RenderPDFRequestSchema } from '@/lib/types';

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

    // Check if user has credits or subscription
    const canRender = await UploadService.canUserUpload(user.id);
    if (!canRender) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient credits. Please upgrade your plan or purchase credits.' 
        },
        { status: 402 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = RenderPDFRequestSchema.parse(body);

    // Verify user owns the upload
    const upload = await UploadService.getUpload(validatedData.upload_id, user.id);
    if (!upload) {
      return NextResponse.json(
        { success: false, error: 'Upload not found' },
        { status: 404 }
      );
    }

    // Check if upload has been processed
    if (upload.status !== 'completed' || !upload.ocr_json) {
      return NextResponse.json(
        { success: false, error: 'Upload has not been processed yet' },
        { status: 400 }
      );
    }

    // Render the PDF
    const renderResult = await PDFRendererService.renderPDF(
      validatedData.upload_id,
      validatedData.mappings,
      validatedData.signature_id,
      validatedData.date_selections,
      user.id
    );

    if (!renderResult.success) {
      return NextResponse.json(renderResult, { status: 500 });
    }

    return NextResponse.json(renderResult);

  } catch (error) {
    console.error('PDF render API error:', error);

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

// Preview endpoint (doesn't consume credits)
export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await createClient(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('upload_id');
    const signatureId = searchParams.get('signature_id');

    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'upload_id is required' },
        { status: 400 }
      );
    }

    // Verify user owns the upload
    const upload = await UploadService.getUpload(uploadId, user.id);
    if (!upload) {
      return NextResponse.json(
        { success: false, error: 'Upload not found' },
        { status: 404 }
      );
    }

    // Generate preview (this is a placeholder - implement based on needs)
    const previewResult = await PDFRendererService.previewPDFRender(
      uploadId,
      [], // Empty mappings for preview
      signatureId || undefined,
      user.id
    );

    return NextResponse.json(previewResult);

  } catch (error) {
    console.error('PDF preview API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}