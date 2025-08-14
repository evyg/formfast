import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface ProcessingSkeletonProps {
  title: string;
  description?: string;
  progress?: number;
  showProgress?: boolean;
}

export function ProcessingSkeleton({ 
  title, 
  description, 
  progress, 
  showProgress = false 
}: ProcessingSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span>{title}</span>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {showProgress && progress !== undefined ? (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{progress}% complete</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OCRProcessingSkeleton() {
  return (
    <ProcessingSkeleton 
      title="Processing document..."
      description="Extracting text and identifying form fields"
    />
  );
}

export function ClassificationSkeleton() {
  return (
    <ProcessingSkeleton 
      title="Classifying fields..."
      description="AI is analyzing form fields and their types"
    />
  );
}

export function AutofillSkeleton() {
  return (
    <ProcessingSkeleton 
      title="Auto-filling form..."
      description="Matching your saved information to form fields"
    />
  );
}

export function PDFGenerationSkeleton() {
  return (
    <ProcessingSkeleton 
      title="Generating PDF..."
      description="Creating your completed form document"
    />
  );
}