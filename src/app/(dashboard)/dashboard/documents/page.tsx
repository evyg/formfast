import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
  FileText,
  Image as ImageIcon,
  Search,
  Download,
  Eye,
  Trash2,
  Upload,
  Calendar,
  Filter,
  MoreVertical,
} from 'lucide-react';
// Remove unused import

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
}

async function getUserDocuments(userId: string, page: number = 1, limit: number = 20) {
  const supabase = await createClient();
  
  try {
    const offset = (page - 1) * limit;

    // Get total count
    const { count } = await supabase
      .from('uploads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get paginated results
    const { data: uploads, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      uploads: uploads as Upload[] || [],
      total: count || 0,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error('Get user documents error:', error);
    return {
      uploads: [],
      total: 0,
      currentPage: 1,
      totalPages: 0,
    };
  }
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const page = parseInt(params.page || '1');
  const searchQuery = params.search || '';

  const { uploads, total, currentPage, totalPages } = await getUserDocuments(user.id, page);

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <ImageIcon className="h-8 w-8 text-blue-500" />;
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
          <p className="text-gray-600">
            Manage and view all your uploaded documents
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload New
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  defaultValue={searchQuery}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                Date Range
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {uploads.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Documents ({total})</CardTitle>
            <CardDescription>
              Your uploaded documents and their processing status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {getFileIcon(upload.mime_type)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {upload.original_filename}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span>{formatFileSize(upload.file_size)}</span>
                      <span>•</span>
                      <span>{formatDate(upload.created_at)}</span>
                      <span>•</span>
                      <span className="capitalize">{upload.mime_type.split('/')[1]}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    {getStatusBadge(upload.status)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {upload.status === 'completed' && (
                      <>
                        <Link href={`/dashboard/documents/${upload.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, total)} of {total} results
                </p>
                <div className="flex space-x-1">
                  {currentPage > 1 && (
                    <Link href={`/dashboard/documents?page=${currentPage - 1}${searchQuery ? `&search=${searchQuery}` : ''}`}>
                      <Button variant="outline" size="sm">
                        Previous
                      </Button>
                    </Link>
                  )}
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    const isCurrentPage = pageNum === currentPage;
                    
                    return (
                      <Link
                        key={pageNum}
                        href={`/dashboard/documents?page=${pageNum}${searchQuery ? `&search=${searchQuery}` : ''}`}
                      >
                        <Button
                          variant={isCurrentPage ? "default" : "outline"}
                          size="sm"
                        >
                          {pageNum}
                        </Button>
                      </Link>
                    );
                  })}

                  {currentPage < totalPages && (
                    <Link href={`/dashboard/documents?page=${currentPage + 1}${searchQuery ? `&search=${searchQuery}` : ''}`}>
                      <Button variant="outline" size="sm">
                        Next
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? 'No documents match your search criteria.'
                  : 'Get started by uploading your first document.'}
              </p>
              <div className="mt-6">
                <Link href="/dashboard/upload">
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Footer */}
      {uploads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">{total}</div>
              <p className="text-xs text-gray-500">Total Documents</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">
                {uploads.filter(u => u.status === 'completed').length}
              </div>
              <p className="text-xs text-gray-500">Processed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">
                {uploads.filter(u => u.status === 'processing').length}
              </div>
              <p className="text-xs text-gray-500">Processing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">
                {uploads.reduce((total, upload) => total + upload.file_size, 0) > 0
                  ? formatFileSize(uploads.reduce((total, upload) => total + upload.file_size, 0))
                  : '0 Bytes'}
              </div>
              <p className="text-xs text-gray-500">Total Size</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}