import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { UploadService } from '@/lib/services';
import { UploadFileRequestSchema } from '@/lib/types';
import { z } from 'zod';

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

    // Check if user can upload (has credits or subscription)
    const canUpload = await UploadService.canUserUpload(user.id);
    if (!canUpload) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient credits. Please upgrade your plan or purchase credits.' 
        },
        { status: 402 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = UploadService.validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Upload the file
    const uploadResult = await UploadService.uploadFile(file, user.id);

    if (!uploadResult.success || !uploadResult.data) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || 'Upload failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: uploadResult.data,
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const { uploads, total } = await UploadService.getUserUploads(user.id, page, limit);

    return NextResponse.json({
      success: true,
      data: uploads,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1,
      },
    });

  } catch (error) {
    console.error('Get uploads API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}