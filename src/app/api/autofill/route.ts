import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { AutoFillService, UploadService } from '@/lib/services';
import { AutoFillRequestSchema } from '@/lib/types';

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
    const validatedData = AutoFillRequestSchema.parse(body);

    // Verify user owns the upload
    const upload = await UploadService.getUpload(validatedData.upload_id, user.id);
    if (!upload) {
      return NextResponse.json(
        { success: false, error: 'Upload not found' },
        { status: 404 }
      );
    }

    // Check if we have classified fields
    if (!validatedData.fields || validatedData.fields.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          upload_id: validatedData.upload_id,
          mappings: [],
          auto_filled_count: 0,
          total_fields: 0,
        },
      });
    }

    // Perform auto-fill
    const autoFillResult = await AutoFillService.autoFillFields(
      validatedData.fields,
      user.id,
      validatedData.household_member_id
    );

    if (!autoFillResult.success || !autoFillResult.data) {
      return NextResponse.json(autoFillResult);
    }

    // Update the response with the correct upload_id
    autoFillResult.data.upload_id = validatedData.upload_id;

    return NextResponse.json(autoFillResult);

  } catch (error) {
    console.error('Auto-fill API error:', error);

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

// Update field mapping endpoint
export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await createClient(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { upload_id, field_id, value, save_to_profile } = body;

    // Verify user owns the upload
    const upload = await UploadService.getUpload(upload_id, user.id);
    if (!upload) {
      return NextResponse.json(
        { success: false, error: 'Upload not found' },
        { status: 404 }
      );
    }

    // Update the field mapping
    const success = await AutoFillService.updateFieldMapping(
      upload_id,
      field_id,
      value,
      save_to_profile,
      user.id
    );

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update field mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Field mapping updated successfully',
    });

  } catch (error) {
    console.error('Update field mapping API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}