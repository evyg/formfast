'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Eye, 
  Edit3, 
  Wand2, 
  Download, 
  Save, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Zap,
  Loader2
} from 'lucide-react';

interface OCRCandidate {
  id: string;
  raw_text: string;
  confidence: number;
  bbox: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  nearby_text: string[];
}

interface ClassifiedField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'checkbox' | 'signature' | 'address';
  required: boolean;
  confidence: number;
  bbox: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  raw_text: string;
  suggestions: string[];
  save_to_profile: boolean;
}

interface FieldMapping {
  field_id: string;
  value: any;
  source: 'profile' | 'manual' | 'saved_date' | 'household_member';
  source_id: string | null;
  confidence: number;
}

interface DocumentProcessorProps {
  uploadId: string;
  initialOcrData?: any;
}

export function DocumentProcessor({ uploadId, initialOcrData }: DocumentProcessorProps) {
  const [ocrCandidates, setOcrCandidates] = useState<OCRCandidate[]>([]);
  const [classifiedFields, setClassifiedFields] = useState<ClassifiedField[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('process');
  
  const supabase = createClient();

  useEffect(() => {
    if (initialOcrData?.candidates) {
      setOcrCandidates(initialOcrData.candidates);
      setActiveTab('ocr');
    }
    if (initialOcrData?.classified_fields) {
      setClassifiedFields(initialOcrData.classified_fields);
      setActiveTab('fields');
    }
  }, [initialOcrData]);

  const processOCR = async () => {
    try {
      setProcessing(true);
      setError(null);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_id: uploadId }),
      });

      const result = await response.json();

      if (result.success) {
        setOcrCandidates(result.candidates || []);
        setActiveTab('ocr');
      } else {
        setError(result.error || 'OCR processing failed');
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError('Failed to process OCR');
    } finally {
      setProcessing(false);
    }
  };

  const classifyFields = async () => {
    if (!ocrCandidates.length) return;
    
    try {
      setProcessing(true);
      setError(null);

      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id: uploadId,
          candidates: ocrCandidates,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setClassifiedFields(result.classified_fields || []);
        setActiveTab('fields');
      } else {
        setError(result.error || 'Field classification failed');
      }
    } catch (err) {
      console.error('Classification error:', err);
      setError('Failed to classify fields');
    } finally {
      setProcessing(false);
    }
  };

  const autoFillFields = async () => {
    if (!classifiedFields.length) return;
    
    try {
      setProcessing(true);
      setError(null);

      const response = await fetch('/api/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id: uploadId,
          fields: classifiedFields,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setFieldMappings(result.data.mappings || []);
        setActiveTab('autofill');
      } else {
        setError(result.error || 'Auto-fill failed');
      }
    } catch (err) {
      console.error('Auto-fill error:', err);
      setError('Failed to auto-fill fields');
    } finally {
      setProcessing(false);
    }
  };

  const updateFieldValue = (fieldId: string, value: any) => {
    setFieldMappings(prev => {
      const existing = prev.find(m => m.field_id === fieldId);
      if (existing) {
        return prev.map(m => 
          m.field_id === fieldId 
            ? { ...m, value, source: 'manual' as const }
            : m
        );
      } else {
        return [...prev, {
          field_id: fieldId,
          value,
          source: 'manual' as const,
          source_id: null,
          confidence: 1.0,
        }];
      }
    });
  };

  const getFieldValue = (fieldId: string) => {
    const mapping = fieldMappings.find(m => m.field_id === fieldId);
    return mapping?.value || '';
  };

  const saveFieldMapping = async (fieldId: string, value: any, saveToProfile: boolean) => {
    try {
      const response = await fetch('/api/autofill', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id: uploadId,
          field_id: fieldId,
          value,
          save_to_profile: saveToProfile,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('Failed to save field mapping:', result.error);
      }
    } catch (error) {
      console.error('Error saving field mapping:', error);
    }
  };

  const generatePDF = async () => {
    try {
      setProcessing(true);
      setError(null);

      const response = await fetch('/api/render-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id: uploadId,
          mappings: fieldMappings,
          signature_id: '', // TODO: Add signature selection
          date_selections: {}, // TODO: Add date selections
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Open the generated PDF in a new tab
        window.open(result.data.download_url, '_blank');
      } else {
        setError(result.error || 'PDF generation failed');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      setError('Failed to generate PDF');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Processing Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <span>AI Document Processing</span>
          </CardTitle>
          <CardDescription>
            Extract text, identify form fields, and auto-fill with your saved information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={processOCR} 
              disabled={processing}
              variant={ocrCandidates.length > 0 ? "outline" : "default"}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {ocrCandidates.length > 0 ? 'Re-process OCR' : 'Extract Text'}
            </Button>
            
            <Button 
              onClick={classifyFields} 
              disabled={processing || !ocrCandidates.length}
              variant={classifiedFields.length > 0 ? "outline" : "default"}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Edit3 className="h-4 w-4 mr-2" />
              )}
              {classifiedFields.length > 0 ? 'Re-classify Fields' : 'Identify Fields'}
            </Button>
            
            <Button 
              onClick={autoFillFields} 
              disabled={processing || !classifiedFields.length}
              variant={fieldMappings.length > 0 ? "outline" : "default"}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Auto-Fill Fields
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {(ocrCandidates.length > 0 || classifiedFields.length > 0 || fieldMappings.length > 0) && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="process">Processing</TabsTrigger>
            <TabsTrigger value="ocr" disabled={!ocrCandidates.length}>
              OCR Text ({ocrCandidates.length})
            </TabsTrigger>
            <TabsTrigger value="fields" disabled={!classifiedFields.length}>
              Form Fields ({classifiedFields.length})
            </TabsTrigger>
            <TabsTrigger value="autofill" disabled={!fieldMappings.length}>
              Auto-fill ({fieldMappings.filter(m => m.value).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="process" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Processing Steps</CardTitle>
                <CardDescription>Follow these steps to extract and fill form data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    {ocrCandidates.length > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <div>
                      <p className="font-medium">1. Extract Text (OCR)</p>
                      <p className="text-sm text-gray-500">
                        {ocrCandidates.length > 0 
                          ? `Found ${ocrCandidates.length} text elements`
                          : 'Extract text from your document using OCR'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {classifiedFields.length > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <div>
                      <p className="font-medium">2. Identify Form Fields</p>
                      <p className="text-sm text-gray-500">
                        {classifiedFields.length > 0 
                          ? `Classified ${classifiedFields.length} form fields`
                          : 'AI identifies and classifies form fields from extracted text'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {fieldMappings.filter(m => m.value).length > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <div>
                      <p className="font-medium">3. Auto-fill Data</p>
                      <p className="text-sm text-gray-500">
                        {fieldMappings.filter(m => m.value).length > 0 
                          ? `Auto-filled ${fieldMappings.filter(m => m.value).length} fields`
                          : 'Automatically fill fields using your saved profile information'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ocr" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Extracted Text Elements</CardTitle>
                <CardDescription>
                  Text detected from the document with confidence scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {ocrCandidates.map((candidate, index) => (
                    <div key={candidate.id} className="p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">&quot;{candidate.raw_text}&quot;</p>
                          <div className="mt-1 text-xs text-gray-500">
                            Confidence: {Math.round(candidate.confidence * 100)}% • 
                            Page {candidate.bbox.page} • 
                            Position: ({candidate.bbox.x.toFixed(3)}, {candidate.bbox.y.toFixed(3)})
                          </div>
                          {candidate.nearby_text.length > 0 && (
                            <div className="mt-2 text-xs text-gray-600">
                              Nearby: {candidate.nearby_text.slice(0, 3).join(', ')}
                              {candidate.nearby_text.length > 3 && '...'}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {Math.round(candidate.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Identified Form Fields</CardTitle>
                <CardDescription>
                  AI-classified form fields ready for auto-filling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {classifiedFields.map((field) => (
                    <div key={field.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Label className="font-medium">{field.label}</Label>
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                          {field.required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                        </div>
                        <Badge variant="outline">
                          {Math.round(field.confidence * 100)}%
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        Original: &quot;{field.raw_text}&quot;
                      </p>
                      
                      <div className="text-xs text-gray-500">
                        Key: {field.key} • Page {field.bbox.page}
                      </div>
                      
                      {field.suggestions.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {field.suggestions.slice(0, 5).map((suggestion, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {suggestion}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="autofill" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Auto-filled Form</CardTitle>
                <CardDescription>
                  Review and edit the auto-filled values, then generate your completed form
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {classifiedFields.map((field) => {
                    const value = getFieldValue(field.id);
                    const mapping = fieldMappings.find(m => m.field_id === field.id);
                    
                    return (
                      <div key={field.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={field.id} className="font-medium">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {mapping && mapping.source !== 'manual' && (
                            <Badge variant="outline" className="text-xs">
                              From {mapping.source.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        
                        {field.raw_text.length > 50 ? (
                          <Textarea
                            id={field.id}
                            value={value}
                            onChange={(e) => updateFieldValue(field.id, e.target.value)}
                            onBlur={(e) => saveFieldMapping(field.id, e.target.value, field.save_to_profile)}
                            placeholder={field.label}
                            className="min-h-[60px]"
                          />
                        ) : (
                          <Input
                            id={field.id}
                            type={field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                            value={value}
                            onChange={(e) => updateFieldValue(field.id, e.target.value)}
                            onBlur={(e) => saveFieldMapping(field.id, e.target.value, field.save_to_profile)}
                            placeholder={field.label}
                          />
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {mapping 
                              ? `Confidence: ${Math.round(mapping.confidence * 100)}%` 
                              : 'Not auto-filled'
                            }
                          </span>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`save-${field.id}`}
                              defaultChecked={field.save_to_profile}
                            />
                            <Label htmlFor={`save-${field.id}`} className="text-xs">
                              Save to profile
                            </Label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {classifiedFields.length > 0 && (
                  <div className="pt-4 border-t">
                    <Button 
                      className="w-full" 
                      size="lg" 
                      onClick={generatePDF}
                      disabled={processing}
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Generate Completed PDF
                    </Button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Create a filled PDF with all your data
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}