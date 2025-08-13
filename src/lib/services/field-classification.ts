import { OpenAI } from 'openai';
import {
  OCRCandidate,
  ClassifiedField,
  FieldType,
  ClassifyFieldsRequest,
  ClassifyFieldsResponse,
} from '../types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class FieldClassificationService {
  private static readonly CLASSIFICATION_MODEL = 'gpt-4';
  private static readonly MAX_CANDIDATES_PER_REQUEST = 50;

  /**
   * Classify OCR candidates into structured form fields
   */
  static async classifyFields(
    candidates: OCRCandidate[]
  ): Promise<ClassifyFieldsResponse> {
    const startTime = Date.now();

    try {
      if (candidates.length === 0) {
        return {
          success: true,
          upload_id: '',
          classified_fields: [],
          processing_time_ms: Date.now() - startTime,
        };
      }

      // Process in batches if needed
      const batches = this.createBatches(candidates, this.MAX_CANDIDATES_PER_REQUEST);
      let allClassifiedFields: ClassifiedField[] = [];

      for (const batch of batches) {
        const batchResult = await this.processBatch(batch);
        allClassifiedFields = allClassifiedFields.concat(batchResult);
      }

      // Post-process and validate results
      const validatedFields = this.validateAndEnhanceFields(allClassifiedFields);

      return {
        success: true,
        upload_id: '',
        classified_fields: validatedFields,
        processing_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Field classification error:', error);
      return {
        success: false,
        upload_id: '',
        classified_fields: [],
        processing_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Classification failed',
      };
    }
  }

  /**
   * Process a batch of candidates with OpenAI
   */
  private static async processBatch(candidates: OCRCandidate[]): Promise<ClassifiedField[]> {
    const prompt = this.buildClassificationPrompt(candidates);

    try {
      const completion = await openai.chat.completions.create({
        model: this.CLASSIFICATION_MODEL,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent results
        functions: [
          {
            name: 'classify_form_fields',
            description: 'Classify detected text into structured form fields',
            parameters: {
              type: 'object',
              properties: {
                fields: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      key: { type: 'string' },
                      label: { type: 'string' },
                      type: {
                        type: 'string',
                        enum: ['text', 'checkbox', 'radio', 'select', 'date', 'signature', 'number', 'email', 'phone', 'address'],
                      },
                      required: { type: 'boolean' },
                      confidence: { type: 'number', minimum: 0, maximum: 1 },
                      suggestions: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                    required: ['id', 'key', 'label', 'type', 'required', 'confidence'],
                  },
                },
              },
              required: ['fields'],
            },
          },
        ],
        function_call: { name: 'classify_form_fields' },
      });

      const functionCall = completion.choices[0]?.message?.function_call;
      if (!functionCall || functionCall.name !== 'classify_form_fields') {
        throw new Error('Invalid OpenAI function call response');
      }

      const result = JSON.parse(functionCall.arguments);
      return this.mapOpenAIResponse(result.fields, candidates);
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Field classification API call failed');
    }
  }

  /**
   * Build classification prompt for OpenAI
   */
  private static buildClassificationPrompt(candidates: OCRCandidate[]): string {
    const candidateList = candidates
      .map((c, idx) => `${idx + 1}. ID: ${c.id}, Text: "${c.raw_text}", Position: (${c.bbox.x.toFixed(3)}, ${c.bbox.y.toFixed(3)})${c.nearby_text.length > 0 ? `, Nearby: [${c.nearby_text.join(', ')}]` : ''}`)
      .join('\n');

    return `Analyze the following text elements extracted from a form document and classify them as form fields:

${candidateList}

Please classify each text element into appropriate form fields. Consider:
1. Context from nearby text to understand field purpose
2. Common form patterns (name, address, date, signature, etc.)
3. Position relationships between text elements
4. Whether text appears to be a label, field value, or instruction

Return structured field classifications with appropriate types, labels, and metadata.`;
  }

  /**
   * System prompt for OpenAI classification
   */
  private static getSystemPrompt(): string {
    return `You are an expert at analyzing form documents and identifying form fields. Your task is to:

1. Identify form fields from extracted text elements
2. Classify each field with the most appropriate type
3. Generate clean, standardized field keys and labels
4. Determine if fields are likely required based on context
5. Provide confidence scores based on text clarity and context

Field Types:
- text: General text input (names, addresses, descriptions)
- number: Numeric values (SSN, phone numbers, amounts)
- email: Email addresses
- phone: Phone numbers
- date: Dates (birth dates, appointment dates, etc.)
- checkbox: Yes/no or selection fields
- radio: Multiple choice selections
- select: Dropdown selections
- signature: Signature fields
- address: Full address fields

Key Guidelines:
- Generate semantic keys (e.g., "patient_name", "date_of_birth")
- Create human-readable labels (e.g., "Patient Name", "Date of Birth")
- Mark fields as required if they appear essential (name, date, signature)
- Use nearby text context to improve classification accuracy
- Assign higher confidence to clear, unambiguous text
- Group related fields logically

Prioritize accuracy and consistency in your classifications.`;
  }

  /**
   * Map OpenAI response to ClassifiedField objects
   */
  private static mapOpenAIResponse(
    aiFields: any[],
    candidates: OCRCandidate[]
  ): ClassifiedField[] {
    const classifiedFields: ClassifiedField[] = [];

    for (const aiField of aiFields) {
      // Find matching candidate
      const candidate = candidates.find(c => c.id === aiField.id);
      if (!candidate) continue;

      const classifiedField: ClassifiedField = {
        id: candidate.id,
        key: this.normalizeKey(aiField.key),
        label: aiField.label,
        type: aiField.type as FieldType,
        required: aiField.required || false,
        confidence: Math.min(candidate.confidence, aiField.confidence || 0.5),
        bbox: candidate.bbox,
        raw_text: candidate.raw_text,
        suggestions: aiField.suggestions || [],
        save_to_profile: this.shouldSaveToProfile(aiField.type, aiField.key),
      };

      classifiedFields.push(classifiedField);
    }

    return classifiedFields;
  }

  /**
   * Normalize field key to consistent format
   */
  private static normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Determine if field should be saved to profile by default
   */
  private static shouldSaveToProfile(type: FieldType, key: string): boolean {
    const commonProfileFields = [
      'name', 'first_name', 'last_name', 'full_name',
      'email', 'phone', 'address', 'date_of_birth',
      'ssn', 'social_security', 'emergency_contact'
    ];

    return commonProfileFields.some(field => 
      key.includes(field) || field.includes(key)
    );
  }

  /**
   * Validate and enhance classified fields
   */
  private static validateAndEnhanceFields(fields: ClassifiedField[]): ClassifiedField[] {
    const validated: ClassifiedField[] = [];
    const seenKeys = new Set<string>();

    for (const field of fields) {
      // Skip duplicates
      if (seenKeys.has(field.key)) {
        continue;
      }
      seenKeys.add(field.key);

      // Validate field type matches content
      const enhancedField = this.enhanceFieldType(field);
      
      // Add field-specific suggestions
      enhancedField.suggestions = this.generateSuggestions(enhancedField);

      validated.push(enhancedField);
    }

    return validated.sort((a, b) => {
      // Sort by page, then by vertical position
      if (a.bbox.page !== b.bbox.page) {
        return a.bbox.page - b.bbox.page;
      }
      return a.bbox.y - b.bbox.y;
    });
  }

  /**
   * Enhance field type based on content analysis
   */
  private static enhanceFieldType(field: ClassifiedField): ClassifiedField {
    const text = field.raw_text.toLowerCase();
    
    // Email detection
    if (field.type === 'text' && /@/.test(field.raw_text)) {
      field.type = 'email';
    }
    
    // Phone number detection
    if (field.type === 'text' && /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(field.raw_text)) {
      field.type = 'phone';
    }
    
    // Date detection
    if (field.type === 'text' && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(field.raw_text)) {
      field.type = 'date';
    }
    
    // Number detection
    if (field.type === 'text' && /^\d+$/.test(field.raw_text.replace(/[\s-]/g, ''))) {
      field.type = 'number';
    }
    
    // Signature field detection
    if (text.includes('sign') || text.includes('signature')) {
      field.type = 'signature';
      field.required = true;
    }

    return field;
  }

  /**
   * Generate field-specific suggestions
   */
  private static generateSuggestions(field: ClassifiedField): string[] {
    const suggestions: string[] = [];
    
    switch (field.type) {
      case 'date':
        suggestions.push('MM/DD/YYYY', 'Today', 'Date of Birth');
        break;
      case 'phone':
        suggestions.push('(555) 123-4567', 'Primary Phone', 'Emergency Contact');
        break;
      case 'email':
        suggestions.push('user@example.com', 'Primary Email', 'Work Email');
        break;
      case 'signature':
        suggestions.push('Digital Signature', 'Print Name', 'Date Signed');
        break;
      case 'address':
        suggestions.push('Street Address', 'City, State ZIP', 'Mailing Address');
        break;
      default:
        if (field.key.includes('name')) {
          suggestions.push('Full Name', 'First Name', 'Last Name');
        }
    }
    
    return suggestions;
  }

  /**
   * Create batches for processing
   */
  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Pre-process candidates to improve classification
   */
  static preprocessCandidates(candidates: OCRCandidate[]): OCRCandidate[] {
    // Filter out noise and low-confidence candidates
    const filtered = candidates.filter(c => 
      c.confidence >= 0.3 && 
      c.raw_text.trim().length > 0 &&
      !/^[^\w\s]*$/.test(c.raw_text) // Skip special characters only
    );

    // Merge nearby candidates that likely belong together
    const merged = this.mergeNearbyText(filtered);

    // Sort by reading order (top to bottom, left to right)
    return merged.sort((a, b) => {
      if (a.bbox.page !== b.bbox.page) {
        return a.bbox.page - b.bbox.page;
      }
      if (Math.abs(a.bbox.y - b.bbox.y) > 0.02) { // Different lines
        return a.bbox.y - b.bbox.y;
      }
      return a.bbox.x - b.bbox.x; // Same line, left to right
    });
  }

  /**
   * Merge nearby text that should be grouped together
   */
  private static mergeNearbyText(candidates: OCRCandidate[]): OCRCandidate[] {
    const merged: OCRCandidate[] = [];
    const processed = new Set<string>();

    for (const candidate of candidates) {
      if (processed.has(candidate.id)) continue;

      // Find nearby candidates on the same line
      const nearbyOnSameLine = candidates.filter(c => 
        c.id !== candidate.id &&
        !processed.has(c.id) &&
        c.bbox.page === candidate.bbox.page &&
        Math.abs(c.bbox.y - candidate.bbox.y) < 0.01 && // Same line
        Math.abs(c.bbox.x - (candidate.bbox.x + candidate.bbox.width)) < 0.03 // Adjacent
      );

      if (nearbyOnSameLine.length > 0) {
        // Merge with nearby text
        const allCandidates = [candidate, ...nearbyOnSameLine]
          .sort((a, b) => a.bbox.x - b.bbox.x);

        const mergedText = allCandidates.map(c => c.raw_text).join(' ');
        const firstCandidate = allCandidates[0];
        const lastCandidate = allCandidates[allCandidates.length - 1];

        const mergedCandidate: OCRCandidate = {
          id: `merged-${firstCandidate.id}`,
          raw_text: mergedText,
          confidence: Math.min(...allCandidates.map(c => c.confidence)),
          bbox: {
            page: firstCandidate.bbox.page,
            x: firstCandidate.bbox.x,
            y: firstCandidate.bbox.y,
            width: (lastCandidate.bbox.x + lastCandidate.bbox.width) - firstCandidate.bbox.x,
            height: Math.max(...allCandidates.map(c => c.bbox.height)),
          },
          nearby_text: candidate.nearby_text,
        };

        merged.push(mergedCandidate);
        allCandidates.forEach(c => processed.add(c.id));
      } else {
        merged.push(candidate);
        processed.add(candidate.id);
      }
    }

    return merged;
  }
}