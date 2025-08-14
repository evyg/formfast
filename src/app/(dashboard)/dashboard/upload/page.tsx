'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertCircle, 
  X,
  ArrowRight
} from 'lucide-react';
import { logger } from '@/lib/services/logger';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/toast';

interface UploadedFile {
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  uploadId?: string;
  error?: string;
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
    onDrop: (acceptedFiles, rejectedFiles) => {
      // Handle rejected files
      rejectedFiles.forEach((rejection) => {
        const error = rejection.errors[0];
        const errorMsg = error.code === 'file-too-large' 
          ? 'File is too large. Maximum size is 50MB.'
          : error.code === 'file-invalid-type'
          ? 'Invalid file type. Please upload a PDF or image file.'
          : 'Invalid file. Please try again.';
        
        showToast.fileUploadError(`${rejection.file.name}: ${errorMsg}`);
        
        logger.error('file_rejected', {
          filename: rejection.file.name,
          error: error.message,
        });
      });

      // Add accepted files to upload queue
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        file,
        status: 'pending',
        progress: 0,
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);
      
      // Start uploading immediately
      handleUpload(newFiles);
    },
  });

  const handleUpload = async (filesToUpload: UploadedFile[]) => {
    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Upload files one by one
      for (let i = 0; i < filesToUpload.length; i++) {
        const fileUpload = filesToUpload[i];
        
        // Update status to uploading
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.file === fileUpload.file
              ? { ...f, status: 'uploading', progress: 0 }
              : f
          )
        );

        try {
          // Create form data
          const formData = new FormData();
          formData.append('file', fileUpload.file);

          // Upload file using fetch with progress tracking
          const xhr = new XMLHttpRequest();
          
          const uploadPromise = new Promise((resolve, reject) => {
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const percentage = Math.round((e.loaded / e.total) * 100);
                setUploadedFiles((prev) =>
                  prev.map((f) =>
                    f.file === fileUpload.file
                      ? { ...f, progress: percentage }
                      : f
                  )
                );
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status === 200) {
                try {
                  const result = JSON.parse(xhr.responseText);
                  resolve(result);
                } catch (e) {
                  reject(new Error('Invalid response format'));
                }
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            });

            xhr.addEventListener('error', () => {
              reject(new Error('Network error during upload'));
            });

            xhr.open('POST', '/api/upload');
            xhr.send(formData);
          });

          const result = await uploadPromise as any;

          if (result.success && result.data) {
            // Update status to completed
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.file === fileUpload.file
                  ? { 
                      ...f, 
                      status: 'completed', 
                      progress: 100,
                      uploadId: result.data.upload_id 
                    }
                  : f
              )
            );

            showToast.fileUploadSuccess(fileUpload.file.name);

            logger.userAction('file_uploaded_success', {
              filename: fileUpload.file.name,
              upload_id: result.data.upload_id,
            });
          } else {
            throw new Error(result.error || 'Upload failed');
          }
        } catch (error: any) {
          // Update status to error
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.file === fileUpload.file
                ? { 
                    ...f, 
                    status: 'error', 
                    error: error.message 
                  }
                : f
            )
          );

          showToast.fileUploadError(`${fileUpload.file.name}: ${error.message}`);

          logger.error('file_upload_error', {
            filename: fileUpload.file.name,
            error: error.message,
          });
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setUploadedFiles((prev) => prev.filter((f) => f.file !== fileToRemove));
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <ImageIcon className="h-8 w-8 text-blue-500" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'uploading':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Uploading</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'error':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const completedUploads = uploadedFiles.filter((f) => f.status === 'completed');
  const hasUploads = uploadedFiles.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
          <p className="text-gray-600">
            Upload PDF files or images to extract and process data
          </p>
        </div>
        {completedUploads.length > 0 && (
          <Button
            onClick={() => router.push('/dashboard/documents')}
            variant="outline"
          >
            View Documents
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Drop files here</CardTitle>
          <CardDescription>
            Supported formats: PDF, JPG, PNG, WebP (max 50MB each)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium text-blue-600">
                Drop the files here...
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">
                  Drag &apos;n&apos; drop files here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  PDF, JPG, PNG, WebP files up to 50MB
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {hasUploads && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
            <CardDescription>
              Track the status of your file uploads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadedFiles.map((fileUpload, index) => (
                <div
                  key={`${fileUpload.file.name}-${index}`}
                  className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {getFileIcon(fileUpload.file)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {fileUpload.file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(fileUpload.file.size)}
                    </p>
                    
                    {/* Progress Bar */}
                    {fileUpload.status === 'uploading' && (
                      <div className="mt-2">
                        <Progress value={fileUpload.progress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.round(fileUpload.progress)}% uploaded
                        </p>
                      </div>
                    )}

                    {/* Error Message */}
                    {fileUpload.status === 'error' && fileUpload.error && (
                      <p className="text-sm text-red-600 mt-1">
                        {fileUpload.error}
                      </p>
                    )}
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(fileUpload.status)}
                    {getStatusBadge(fileUpload.status)}
                    
                    {/* Remove button */}
                    {fileUpload.status !== 'uploading' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileUpload.file)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            {completedUploads.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {completedUploads.length} file(s) uploaded successfully
                  </p>
                  <Button
                    onClick={() => router.push('/dashboard/documents')}
                  >
                    View All Documents
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <Upload className="mx-auto h-8 w-8 text-blue-500 mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">1. Upload</h3>
              <p className="text-sm text-gray-600">
                Drag and drop or select your PDF or image files
              </p>
            </div>
            <div className="text-center">
              <FileText className="mx-auto h-8 w-8 text-green-500 mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">2. Process</h3>
              <p className="text-sm text-gray-600">
                Our AI extracts text and data from your documents
              </p>
            </div>
            <div className="text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-purple-500 mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">3. Use</h3>
              <p className="text-sm text-gray-600">
                Download processed data or use our form autofill
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}