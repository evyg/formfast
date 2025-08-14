'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SignaturePad } from '@/components/forms/signature-pad';
import { SignatureService, type Signature } from '@/lib/services/signature';
import { showToast } from '@/lib/toast';
import { 
  Plus, 
  Trash2, 
  Star, 
  Edit, 
  Eye,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignatureManager() {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSignature, setCurrentSignature] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const [previewSignature, setPreviewSignature] = useState<Signature | null>(null);

  useEffect(() => {
    loadSignatures();
  }, []);

  const loadSignatures = async () => {
    try {
      setIsLoading(true);
      const data = await SignatureService.getSignatures();
      setSignatures(data);
    } catch (error) {
      console.error('Error loading signatures:', error);
      showToast.error('Failed to load signatures', 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSignature = async () => {
    if (!currentSignature || !signatureName.trim()) {
      showToast.error('Missing information', 'Please provide a signature and name');
      return;
    }

    setIsCreating(true);

    try {
      await SignatureService.createSignature({
        name: signatureName.trim(),
        data: currentSignature,
        type: 'draw', // For now, defaulting to draw - you can enhance this
        is_default: signatures.length === 0, // First signature becomes default
      });

      showToast.success('Signature saved', 'Your signature has been saved successfully');
      setIsDialogOpen(false);
      setSignatureName('');
      setCurrentSignature(null);
      await loadSignatures();
    } catch (error) {
      console.error('Error creating signature:', error);
      showToast.error('Failed to save signature', 'Please try again');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await SignatureService.setAsDefault(id);
      showToast.success('Default signature updated', 'This signature is now your default');
      await loadSignatures();
    } catch (error) {
      console.error('Error setting default:', error);
      showToast.error('Failed to set default', 'Please try again');
    }
  };

  const handleDeleteSignature = async (id: string) => {
    if (!confirm('Are you sure you want to delete this signature?')) {
      return;
    }

    try {
      await SignatureService.deleteSignature(id);
      showToast.success('Signature deleted', 'The signature has been removed');
      await loadSignatures();
    } catch (error) {
      console.error('Error deleting signature:', error);
      showToast.error('Failed to delete signature', 'Please try again');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading signatures...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Digital Signatures</CardTitle>
              <CardDescription>
                Manage your digital signatures for form completion
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Signature
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Signature</DialogTitle>
                  <DialogDescription>
                    Create a digital signature that will be used to sign your forms
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="signature-name">Signature Name</Label>
                    <Input
                      id="signature-name"
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      placeholder="e.g., My Primary Signature"
                      className="mt-1"
                    />
                  </div>
                  <SignaturePad
                    onSignatureChange={setCurrentSignature}
                    width={500}
                    height={200}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateSignature} 
                      disabled={!currentSignature || !signatureName.trim() || isCreating}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Signature'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {signatures.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No signatures found</p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Create your first signature</Button>
                </DialogTrigger>
              </Dialog>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {signatures.map((signature) => (
                <Card key={signature.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {signature.name}
                          {signature.is_default && (
                            <Badge variant="default" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground capitalize">
                          {signature.type} signature
                        </p>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-2 bg-white mb-3">
                      <img 
                        src={signature.data} 
                        alt={signature.name}
                        className="max-h-16 w-full object-contain"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewSignature(signature)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {!signature.is_default && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetDefault(signature.id)}
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteSignature(signature.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {previewSignature && (
        <Dialog open={!!previewSignature} onOpenChange={() => setPreviewSignature(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{previewSignature.name}</DialogTitle>
              <DialogDescription>Signature preview</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center p-4 bg-white border rounded-lg">
              <img 
                src={previewSignature.data} 
                alt={previewSignature.name}
                className="max-w-full max-h-64 object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}