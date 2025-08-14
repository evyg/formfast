'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';

interface DocumentViewerProps {
  fileUrl: string;
  mimeType: string;
  filename: string;
}

export function DocumentViewer({ fileUrl, mimeType, filename }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    link.click();
  };

  if (mimeType === 'application/pdf') {
    return (
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{zoom}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>

        {/* PDF Viewer */}
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <iframe
            src={`${fileUrl}#zoom=${zoom}`}
            className="w-full h-96"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center'
            }}
            title={filename}
          />
        </div>
      </div>
    );
  }

  // Image viewer
  if (mimeType.startsWith('image/')) {
    return (
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{zoom}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>

        {/* Image Viewer */}
        <div className="border border-gray-200 rounded-md overflow-hidden bg-gray-50 p-4">
          <div className="flex justify-center">
            <img
              src={fileUrl}
              alt={filename}
              className="max-w-full h-auto"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center',
                maxHeight: '500px'
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Preview not supported for this file type
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download File
        </Button>
      </div>
    </div>
  );
}