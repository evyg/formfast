'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  Share2,
  Trash2,
  MoreVertical,
  RefreshCw,
  ExternalLink,
  Copy,
} from 'lucide-react';
// Remove UploadService import since we'll use API calls
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/services/logger';

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

interface DocumentActionsProps {
  document: Upload;
  signedUrl: string | null;
}

export function DocumentActions({ document: documentData, signedUrl }: DocumentActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDownload = () => {
    if (!signedUrl) return;
    
    const link = window.document.createElement('a');
    link.href = signedUrl;
    link.download = documentData.original_filename;
    link.click();
    
    logger.userAction('document_downloaded', {
      document_id: documentData.id,
      filename: documentData.original_filename,
    });
  };

  const handleCopyLink = async () => {
    if (!signedUrl) return;
    
    try {
      await navigator.clipboard.writeText(signedUrl);
      logger.userAction('document_link_copied', {
        document_id: documentData.id,
      });
      // TODO: Add toast notification
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShare = () => {
    if (!signedUrl) return;
    
    if (navigator.share) {
      navigator.share({
        title: documentData.original_filename,
        url: signedUrl,
      });
    } else {
      handleCopyLink();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Use API to delete document
      const response = await fetch(`/api/upload/${documentData.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      const success = result.success;
      
      if (success) {
        logger.userAction('document_deleted', {
          document_id: documentData.id,
          filename: documentData.original_filename,
        });
        router.push('/dashboard/documents');
      } else {
        throw new Error('Failed to delete document');
      }
    } catch (error: any) {
      logger.error('document_delete_error', {
        document_id: documentData.id,
        error: error.message,
      });
      // TODO: Add toast notification
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetryProcessing = async () => {
    setIsProcessing(true);
    
    try {
      // TODO: Implement retry processing logic
      // This would typically call an API endpoint to reprocess the document
      logger.userAction('document_retry_processing', {
        document_id: documentData.id,
      });
      
      // Refresh the page to show updated status
      router.refresh();
    } catch (error: any) {
      logger.error('document_retry_error', {
        document_id: documentData.id,
        error: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportData = () => {
    if (!documentData.ocr_json) return;
    
    const dataStr = JSON.stringify(documentData.ocr_json, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${documentData.original_filename}_data.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    logger.userAction('document_data_exported', {
      document_id: documentData.id,
    });
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Primary Actions */}
      {signedUrl && (
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      )}

      {documentData.status === 'completed' && documentData.ocr_json && (
        <Button variant="outline" onClick={handleExportData}>
          Export Data
        </Button>
      )}

      {documentData.status === 'failed' && (
        <Button 
          variant="outline" 
          onClick={handleRetryProcessing}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Retry
        </Button>
      )}

      {/* More Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {signedUrl && (
            <>
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          <DropdownMenuItem onClick={() => window.open(signedUrl || '#', '_blank')}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in New Tab
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}