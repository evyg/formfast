'use client';

import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'signature_pad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Pen, Type, Upload, RotateCcw, Check } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (signature: string | null) => void;
  className?: string;
  width?: number;
  height?: number;
}

type SignatureMode = 'draw' | 'type' | 'upload';

const FONTS = [
  { name: 'Cursive', style: 'font-["Dancing_Script"]' },
  { name: 'Script', style: 'font-["Great_Vibes"]' },
  { name: 'Elegant', style: 'font-["Allura"]' },
];

export function SignaturePad({
  onSignatureChange,
  className,
  width = 400,
  height = 200,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePad = useRef<SignatureCanvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<SignatureMode>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [selectedFont, setSelectedFont] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (canvasRef.current && mode === 'draw') {
      signaturePad.current = new SignatureCanvas(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
        minWidth: 1,
        maxWidth: 3,
      });

      const handleChange = () => {
        const isCurrentlyEmpty = signaturePad.current?.isEmpty() ?? true;
        setIsEmpty(isCurrentlyEmpty);
        
        if (!isCurrentlyEmpty) {
          const dataURL = signaturePad.current?.toDataURL('image/png');
          onSignatureChange(dataURL || null);
        } else {
          onSignatureChange(null);
        }
      };

      signaturePad.current.addEventListener('endStroke', handleChange);

      return () => {
        if (signaturePad.current) {
          signaturePad.current.off();
        }
      };
    }
  }, [mode, onSignatureChange]);

  const clearSignature = () => {
    if (mode === 'draw' && signaturePad.current) {
      signaturePad.current.clear();
      setIsEmpty(true);
      onSignatureChange(null);
    } else if (mode === 'type') {
      setTypedSignature('');
      onSignatureChange(null);
    } else if (mode === 'upload') {
      setUploadedImage(null);
      onSignatureChange(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const generateTypedSignature = async () => {
    if (!typedSignature.trim()) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Set background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Set font and text
    const fontSize = Math.min(width / typedSignature.length * 2, 48);
    ctx.fillStyle = 'black';
    ctx.font = `${fontSize}px "Dancing Script", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text
    ctx.fillText(typedSignature, width / 2, height / 2);

    const dataURL = canvas.toDataURL('image/png');
    onSignatureChange(dataURL);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      onSignatureChange(result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (mode === 'type' && typedSignature.trim()) {
      generateTypedSignature();
    }
  }, [typedSignature, selectedFont]);

  const renderSignatureArea = () => {
    switch (mode) {
      case 'draw':
        return (
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="border border-gray-300 rounded-lg bg-white cursor-crosshair"
            />
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-400 text-sm">Sign here</p>
              </div>
            )}
          </div>
        );

      case 'type':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="signature-text">Type your signature</Label>
              <Input
                id="signature-text"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Enter your name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Font Style</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {FONTS.map((font, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedFont(index)}
                    className={cn(
                      'p-2 border rounded-md text-center transition-colors',
                      selectedFont === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    )}
                  >
                    <div className={cn('text-lg', font.style)}>
                      {typedSignature || 'Sample'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{font.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {typedSignature && (
              <div className="border border-gray-300 rounded-lg bg-white p-4 text-center">
                <div className={cn('text-2xl', FONTS[selectedFont].style)}>
                  {typedSignature}
                </div>
              </div>
            )}
          </div>
        );

      case 'upload':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="signature-upload">Upload signature image</Label>
              <Input
                id="signature-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload a PNG or JPG image of your signature
              </p>
            </div>

            {uploadedImage && (
              <div className="border border-gray-300 rounded-lg bg-white p-4 text-center">
                <img
                  src={uploadedImage}
                  alt="Uploaded signature"
                  className="max-w-full max-h-32 mx-auto"
                />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Mode Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'draw', label: 'Draw', icon: Pen },
          { id: 'type', label: 'Type', icon: Type },
          { id: 'upload', label: 'Upload', icon: Upload },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id as SignatureMode)}
            className={cn(
              'flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors',
              mode === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Signature Area */}
      {renderSignatureArea()}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={clearSignature}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear
        </Button>
        
        <Button 
          disabled={
            (mode === 'draw' && isEmpty) ||
            (mode === 'type' && !typedSignature.trim()) ||
            (mode === 'upload' && !uploadedImage)
          }
        >
          <Check className="w-4 h-4 mr-2" />
          Use Signature
        </Button>
      </div>
    </div>
  );
}