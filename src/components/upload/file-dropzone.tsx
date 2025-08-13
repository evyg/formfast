'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  isUploading?: boolean;
  uploadProgress?: number;
  selectedFile?: File | null;
  error?: string;
  className?: string;
}

const DEFAULT_ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export function FileDropzone({
  onFileSelect,
  onFileRemove,
  accept = DEFAULT_ACCEPT,
  maxSize = 50 * 1024 * 1024, // 50MB
  isUploading = false,
  uploadProgress = 0,
  selectedFile,
  error,
  className,
}: FileDropzoneProps) {
  const [dragError, setDragError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setDragError(null);
      
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors?.length > 0) {
          const error = rejection.errors[0];
          if (error.code === 'file-too-large') {
            setDragError(`File is too large. Maximum size is ${formatBytes(maxSize)}`);
          } else if (error.code === 'file-invalid-type') {
            setDragError('Invalid file type. Please upload a PDF or image file.');
          } else {
            setDragError('Invalid file. Please try again.');
          }
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: isUploading,
  });

  const displayError = error || dragError;

  if (selectedFile && !isUploading) {
    return (
      <div className={cn('rounded-lg border border-dashed border-gray-300 p-6', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <File className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatBytes(selectedFile.size)}</p>
            </div>
          </div>
          {onFileRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFileRemove}
              className="text-gray-500 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (isUploading) {
    return (
      <div className={cn('rounded-lg border border-dashed border-gray-300 p-6', className)}>
        <div className="text-center">
          <Upload className="mx-auto h-8 w-8 text-blue-600 animate-pulse" />
          <p className="mt-2 text-sm font-medium text-gray-900">Uploading...</p>
          <p className="text-xs text-gray-500">{selectedFile?.name}</p>
          <div className="mt-4">
            <Progress value={uploadProgress} className="w-full" />
            <p className="mt-1 text-xs text-gray-500">{Math.round(uploadProgress)}%</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors',
        {
          'border-blue-400 bg-blue-50': isDragActive && !isDragReject,
          'border-red-400 bg-red-50': isDragReject || displayError,
          'opacity-50 cursor-not-allowed': isUploading,
        },
        className
      )}
    >
      <input {...getInputProps()} />
      
      <div className="space-y-3">
        {displayError ? (
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        ) : (
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
        )}
        
        <div className="space-y-2">
          {displayError ? (
            <div>
              <p className="text-sm font-medium text-red-600">Upload Error</p>
              <p className="text-xs text-red-500">{displayError}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isDragActive ? 'Drop your file here' : 'Drop files to upload, or click to browse'}
              </p>
              <p className="text-xs text-gray-500">
                PDF, JPG, PNG, WebP up to {formatBytes(maxSize)}
              </p>
            </div>
          )}
        </div>
        
        {!displayError && (
          <Button variant="outline" size="sm" className="mx-auto" disabled={isUploading}>
            Choose File
          </Button>
        )}
      </div>
    </div>
  );
}