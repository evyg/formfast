import AWS from 'aws-sdk';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  OCRCandidate, 
  TextractResponse, 
  TesseractResponse, 
  BoundingBox,
  ProcessOCRRequest,
  ProcessOCRResponse
} from '../types';

// Configure AWS
const textract = new AWS.Textract({
  region: process.env.AWS_TEXTRACT_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export class OCRService {
  private static readonly DEV_MODE = process.env.DEV_MODE_OCR === 'true';
  private static readonly MAX_FILE_SIZE_TEXTRACT = 10 * 1024 * 1024; // 10MB
  private static readonly SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  /**
   * Main OCR processing function
   */
  static async processFile(
    fileBuffer: ArrayBuffer,
    fileName: string,
    mimeType: string
  ): Promise<ProcessOCRResponse> {
    const startTime = Date.now();

    try {
      let candidates: OCRCandidate[] = [];

      if (mimeType === 'application/pdf') {
        candidates = await this.processPDF(fileBuffer);
      } else if (this.SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
        candidates = await this.processImage(fileBuffer, mimeType);
      } else {
        return {
          success: false,
          upload_id: '', // This will be set by the caller
          candidates: [],
          processing_time_ms: Date.now() - startTime,
          error: 'Unsupported file type',
        };
      }

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
   * Process PDF file
   */
  private static async processPDF(fileBuffer: ArrayBuffer): Promise<OCRCandidate[]> {
    const candidates: OCRCandidate[] = [];
    
    try {
      // Load PDF with pdf.js
      const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
      const numPages = pdf.numPages;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        
        // Get text content from PDF
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        // Extract text items with positions
        for (const item of textContent.items) {
          if ('str' in item && item.str.trim()) {
            const bbox: BoundingBox = {
              page: pageNum,
              x: item.transform[4] / viewport.width,
              y: 1 - (item.transform[5] + item.height) / viewport.height, // Convert to top-left origin
              width: item.width / viewport.width,
              height: item.height / viewport.height,
            };

            candidates.push({
              id: `pdf-${pageNum}-${item.transform[4]}-${item.transform[5]}`,
              raw_text: item.str.trim(),
              confidence: 0.95, // PDF text has high confidence
              bbox,
              nearby_text: [],
            });
          }
        }

        // Try to extract form fields if they exist
        const annotations = await page.getAnnotations();
        for (const annotation of annotations) {
          if (annotation.subtype === 'Widget' && annotation.fieldName) {
            const rect = annotation.rect;
            const bbox: BoundingBox = {
              page: pageNum,
              x: rect[0] / viewport.width,
              y: 1 - rect[3] / viewport.height,
              width: (rect[2] - rect[0]) / viewport.width,
              height: (rect[3] - rect[1]) / viewport.height,
            };

            candidates.push({
              id: `field-${pageNum}-${annotation.fieldName}`,
              raw_text: annotation.fieldName,
              confidence: 1.0,
              bbox,
              nearby_text: [],
            });
          }
        }
      }

      // If no text found, try OCR on rendered pages
      if (candidates.length === 0) {
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          const viewport = page.getViewport({ scale: 2.0 });
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ canvasContext: context, viewport }).promise;
          
          const imageData = canvas.toDataURL('image/png');
          const pageBuffer = this.dataUrlToArrayBuffer(imageData);
          
          const pageCandidates = await this.processImage(pageBuffer, 'image/png', pageNum);
          candidates.push(...pageCandidates);
        }
      }

    } catch (error) {
      console.error('PDF processing error:', error);
      throw new Error('Failed to process PDF');
    }

    return candidates;
  }

  /**
   * Process image file
   */
  private static async processImage(
    fileBuffer: ArrayBuffer,
    mimeType: string,
    pageNumber: number = 1
  ): Promise<OCRCandidate[]> {
    // Use AWS Textract if not in dev mode and file size is acceptable
    if (!this.DEV_MODE && fileBuffer.byteLength <= this.MAX_FILE_SIZE_TEXTRACT) {
      try {
        return await this.processWithTextract(fileBuffer);
      } catch (error) {
        console.warn('Textract failed, falling back to Tesseract:', error);
      }
    }

    // Fallback to Tesseract.js
    return await this.processWithTesseract(fileBuffer, pageNumber);
  }

  /**
   * Process with AWS Textract
   */
  private static async processWithTextract(fileBuffer: ArrayBuffer): Promise<OCRCandidate[]> {
    const params = {
      Document: {
        Bytes: Buffer.from(fileBuffer),
      },
      FeatureTypes: ['FORMS', 'TABLES'],
    };

    try {
      const result = await textract.analyzeDocument(params).promise();
      return this.parseTextractResponse(result);
    } catch (error) {
      console.error('Textract error:', error);
      throw new Error('AWS Textract processing failed');
    }
  }

  /**
   * Process with Tesseract.js
   */
  private static async processWithTesseract(
    fileBuffer: ArrayBuffer,
    pageNumber: number = 1
  ): Promise<OCRCandidate[]> {
    const worker = await createWorker();
    
    try {
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,:-()[]/',
        preserve_interword_spaces: '1',
      });

      const { data } = await worker.recognize(Buffer.from(fileBuffer));
      await worker.terminate();

      return this.parseTesseractResponse(data, pageNumber);
    } catch (error) {
      console.error('Tesseract error:', error);
      throw new Error('Tesseract processing failed');
    }
  }

  /**
   * Parse AWS Textract response
   */
  private static parseTextractResponse(response: any): OCRCandidate[] {
    const candidates: OCRCandidate[] = [];
    
    if (!response.Blocks) {
      return candidates;
    }

    // Process LINE blocks for text content
    const lineBlocks = response.Blocks.filter((block: any) => block.BlockType === 'LINE');
    
    for (const block of lineBlocks) {
      if (block.Text && block.Text.trim() && block.Geometry?.BoundingBox) {
        const bbox = block.Geometry.BoundingBox;
        
        candidates.push({
          id: `textract-${block.Id}`,
          raw_text: block.Text.trim(),
          confidence: (block.Confidence || 0) / 100,
          bbox: {
            page: 1,
            x: bbox.Left,
            y: bbox.Top,
            width: bbox.Width,
            height: bbox.Height,
          },
          nearby_text: [],
        });
      }
    }

    // Process KEY_VALUE_SET blocks for form fields
    const keyValueBlocks = response.Blocks.filter((block: any) => 
      block.BlockType === 'KEY_VALUE_SET'
    );

    for (const block of keyValueBlocks) {
      if (block.EntityTypes?.includes('KEY') && block.Geometry?.BoundingBox) {
        const bbox = block.Geometry.BoundingBox;
        const keyText = this.extractTextFromBlock(block, response.Blocks);
        
        if (keyText) {
          candidates.push({
            id: `textract-key-${block.Id}`,
            raw_text: keyText,
            confidence: (block.Confidence || 0) / 100,
            bbox: {
              page: 1,
              x: bbox.Left,
              y: bbox.Top,
              width: bbox.Width,
              height: bbox.Height,
            },
            nearby_text: [],
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Parse Tesseract response
   */
  private static parseTesseractResponse(
    data: any,
    pageNumber: number
  ): OCRCandidate[] {
    const candidates: OCRCandidate[] = [];

    if (!data.words) {
      return candidates;
    }

    for (const word of data.words) {
      if (word.text.trim() && word.confidence > 30) { // Filter low confidence
        candidates.push({
          id: `tesseract-${pageNumber}-${word.bbox.x0}-${word.bbox.y0}`,
          raw_text: word.text.trim(),
          confidence: word.confidence / 100,
          bbox: {
            page: pageNumber,
            x: word.bbox.x0 / (data.width || 1),
            y: word.bbox.y0 / (data.height || 1),
            width: (word.bbox.x1 - word.bbox.x0) / (data.width || 1),
            height: (word.bbox.y1 - word.bbox.y0) / (data.height || 1),
          },
          nearby_text: [],
        });
      }
    }

    return candidates;
  }

  /**
   * Extract text from Textract block relationships
   */
  private static extractTextFromBlock(block: any, allBlocks: any[]): string {
    if (!block.Relationships) {
      return '';
    }

    const childIds = block.Relationships
      .filter((rel: any) => rel.Type === 'CHILD')
      .flatMap((rel: any) => rel.Ids);

    const childBlocks = allBlocks.filter(b => childIds.includes(b.Id));
    const words = childBlocks
      .filter(b => b.BlockType === 'WORD')
      .map(b => b.Text)
      .join(' ');

    return words.trim();
  }

  /**
   * Convert data URL to ArrayBuffer
   */
  private static dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
    const base64 = dataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  }

  /**
   * Group nearby candidates (for better field detection)
   */
  static groupNearbyCandidates(candidates: OCRCandidate[]): OCRCandidate[] {
    const grouped = [...candidates];
    
    // Find nearby text for each candidate
    for (const candidate of grouped) {
      const nearby: string[] = [];
      
      for (const other of candidates) {
        if (other.id !== candidate.id && other.bbox.page === candidate.bbox.page) {
          const distance = this.calculateDistance(candidate.bbox, other.bbox);
          if (distance < 0.1) { // Within 10% of page size
            nearby.push(other.raw_text);
          }
        }
      }
      
      candidate.nearby_text = nearby;
    }

    return grouped;
  }

  /**
   * Calculate distance between two bounding boxes
   */
  private static calculateDistance(bbox1: BoundingBox, bbox2: BoundingBox): number {
    const centerX1 = bbox1.x + bbox1.width / 2;
    const centerY1 = bbox1.y + bbox1.height / 2;
    const centerX2 = bbox2.x + bbox2.width / 2;
    const centerY2 = bbox2.y + bbox2.height / 2;
    
    return Math.sqrt(
      Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2)
    );
  }
}