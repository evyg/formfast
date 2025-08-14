import { OCRCandidate, ProcessOCRResponse } from '../types';

export class SimpleOCRService {
  /**
   * Simplified OCR service for testing - generates mock OCR results
   */
  static async processFile(
    fileBuffer: ArrayBuffer,
    fileName: string,
    mimeType: string
  ): Promise<ProcessOCRResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`Processing file: ${fileName} (${mimeType})`);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock OCR candidates based on file type
      const candidates = this.generateMockCandidates(fileName, mimeType);
      
      return {
        success: true,
        upload_id: '', // This will be set by the caller
        candidates,
        processing_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      return {
        success: false,
        upload_id: '',
        candidates: [],
        processing_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'OCR processing failed',
      };
    }
  }

  /**
   * Generate mock OCR candidates for testing
   */
  private static generateMockCandidates(fileName: string, mimeType: string): OCRCandidate[] {
    const candidates: OCRCandidate[] = [];

    // Generate different mock data based on filename patterns
    if (fileName.toLowerCase().includes('form') || fileName.toLowerCase().includes('application')) {
      // Mock form fields
      candidates.push(
        {
          id: 'field_1',
          raw_text: 'Name:',
          confidence: 0.95,
          bbox: { page: 1, x: 0.1, y: 0.2, width: 0.08, height: 0.03 },
          nearby_text: ['First', 'Last']
        },
        {
          id: 'field_2',
          raw_text: 'Email:',
          confidence: 0.93,
          bbox: { page: 1, x: 0.1, y: 0.3, width: 0.08, height: 0.03 },
          nearby_text: ['@', 'Address']
        },
        {
          id: 'field_3', 
          raw_text: 'Date:',
          confidence: 0.92,
          bbox: { page: 1, x: 0.1, y: 0.4, width: 0.08, height: 0.03 },
          nearby_text: ['MM/DD/YYYY']
        },
        {
          id: 'field_4',
          raw_text: 'Phone:',
          confidence: 0.94,
          bbox: { page: 1, x: 0.1, y: 0.5, width: 0.08, height: 0.03 },
          nearby_text: ['(', ')', '-']
        },
        {
          id: 'field_5',
          raw_text: 'Address:',
          confidence: 0.91,
          bbox: { page: 1, x: 0.1, y: 0.6, width: 0.08, height: 0.03 },
          nearby_text: ['Street', 'City', 'State']
        },
        {
          id: 'field_6',
          raw_text: 'Signature:',
          confidence: 0.89,
          bbox: { page: 1, x: 0.1, y: 0.8, width: 0.12, height: 0.03 },
          nearby_text: ['X', 'Sign', 'here']
        }
      );
    } else {
      // Generic document text
      candidates.push(
        {
          id: 'text_1',
          raw_text: 'DOCUMENT TITLE',
          confidence: 0.97,
          bbox: { page: 1, x: 0.2, y: 0.1, width: 0.6, height: 0.05 },
          nearby_text: []
        },
        {
          id: 'text_2',
          raw_text: 'Lorem ipsum dolor sit amet',
          confidence: 0.94,
          bbox: { page: 1, x: 0.1, y: 0.3, width: 0.8, height: 0.03 },
          nearby_text: ['consectetur', 'adipiscing', 'elit']
        },
        {
          id: 'text_3',
          raw_text: 'Sample text content',
          confidence: 0.96,
          bbox: { page: 1, x: 0.1, y: 0.4, width: 0.5, height: 0.03 },
          nearby_text: ['extracted', 'from', 'document']
        }
      );
    }

    // Add some checkbox-like elements
    candidates.push({
      id: 'checkbox_1',
      raw_text: '☐',
      confidence: 0.85,
      bbox: { page: 1, x: 0.1, y: 0.7, width: 0.02, height: 0.02 },
      nearby_text: ['Yes', 'No', 'N/A']
    });

    return candidates;
  }

  /**
   * Group nearby candidates for better field detection
   */
  static groupNearbyCandidates(candidates: OCRCandidate[]): OCRCandidate[] {
    // For now, just return the candidates as-is
    // In a real implementation, this would group nearby text elements
    return candidates.map(candidate => ({
      ...candidate,
      nearby_text: candidates
        .filter(other => 
          other.id !== candidate.id &&
          other.bbox.page === candidate.bbox.page &&
          Math.abs(other.bbox.y - candidate.bbox.y) < 0.05 && // Same row
          Math.abs(other.bbox.x - candidate.bbox.x) < 0.3 // Nearby horizontally
        )
        .map(other => other.raw_text)
        .slice(0, 3) // Limit to 3 nearby items
    }));
  }
}