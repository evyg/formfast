import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
// Remove UploadService import since we'll use server-side supabase
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Eye,
  Copy,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { DocumentViewer } from '@/components/documents/document-viewer';
import { DocumentActions } from '@/components/documents/document-actions';
import { DocumentProcessor } from '@/components/documents/document-processor';

interface Upload {
  id: string;
  original_filename: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  ocr_json: any;
  created_at: string;
  updated_at: string;
  user_id: string;
}

async function getDocument(documentId: string, userId: string): Promise<Upload | null> {
  const supabase = await createClient();
  
  try {
    const { data: upload, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (error || !upload) {
      return null;
    }

    return upload as Upload;
  } catch (error) {
    console.error('Get document error:', error);
    return null;
  }
}

async function getSignedUrl(filePath: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from('uploads')
      .createSignedUrl(filePath, 3600);

    if (error || !data) {
      console.error('Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Get signed URL error:', error);
    return null;
  }
}

export default async function DocumentViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    notFound();
  }

  const document = await getDocument(id, user.id);
  
  if (!document) {
    notFound();
  }

  const signedUrl = await getSignedUrl(document.file_path);

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') {
      return <FileText className="h-6 w-6 text-red-500" />;
    }
    return <ImageIcon className="h-6 w-6 text-blue-500" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'failed':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Link href="/dashboard/documents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Documents
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              {getFileIcon(document.mime_type)}
              <h1 className="text-2xl font-bold text-gray-900">
                {document.original_filename}
              </h1>
              {getStatusBadge(document.status)}
            </div>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span>{formatFileSize(document.file_size)}</span>
              <span>•</span>
              <span>Uploaded {formatDate(document.created_at)}</span>
              <span>•</span>
              <span className="capitalize">{document.mime_type.split('/')[1]}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <DocumentActions document={document} signedUrl={signedUrl} />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Viewer */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Document Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {signedUrl ? (
                <DocumentViewer
                  fileUrl={signedUrl}
                  mimeType={document.mime_type}
                  filename={document.original_filename}
                />
              ) : (
                <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      Preview not available
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Unable to load document preview
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Document Processing */}
        <div>
          <DocumentProcessor 
            uploadId={document.id}
            initialOcrData={document.ocr_json}
          />
        </div>
      </div>

      {/* Document Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Info */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  {getStatusBadge(document.status)}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">File Name</label>
                <p className="mt-1 text-sm text-gray-900">{document.original_filename}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">File Size</label>
                <p className="mt-1 text-sm text-gray-900">{formatFileSize(document.file_size)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <p className="mt-1 text-sm text-gray-900">{document.mime_type}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Uploaded</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(document.created_at)}</p>
              </div>
              
              {document.updated_at !== document.created_at && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(document.updated_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Processing Status */}
        <div>
          {document.status === 'processing' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Processing</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Your document is being processed. This may take a few minutes depending on the file size and complexity.
                </p>
              </CardContent>
            </Card>
          )}

          {document.status === 'failed' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Processing Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  There was an error processing your document. You can try uploading it again or contact support if the issue persists.
                </p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Processing
                  </Button>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* OCR Results Summary */}
        <div>
          {document.status === 'completed' && document.ocr_json && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Results</CardTitle>
                <CardDescription>
                  Summary of extracted data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Text Elements:</span>
                    <span className="font-medium">
                      {document.ocr_json.candidates?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Form Fields:</span>
                    <span className="font-medium">
                      {document.ocr_json.classified_fields?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Processing Time:</span>
                    <span className="font-medium">
                      {document.ocr_json.processing_time_ms 
                        ? `${Math.round(document.ocr_json.processing_time_ms / 1000)}s`
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}