import { z } from 'zod';

// Bounding box for field coordinates
export const BoundingBoxSchema = z.object({
  page: z.number().int().min(1),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(0),
  height: z.number().min(0),
});

// Field types that can be detected
export const FieldTypeSchema = z.enum([
  'text',
  'checkbox',
  'radio',
  'select',
  'date',
  'signature',
  'number',
  'email',
  'phone',
  'address',
]);

// Raw OCR candidate field (before AI classification)
export const OCRCandidateSchema = z.object({
  id: z.string(),
  raw_text: z.string(),
  confidence: z.number().min(0).max(1),
  bbox: BoundingBoxSchema,
  nearby_text: z.array(z.string()).default([]),
});

// Classified field (after AI processing)
export const ClassifiedFieldSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  type: FieldTypeSchema,
  required: z.boolean().default(false),
  confidence: z.number().min(0).max(1),
  bbox: BoundingBoxSchema,
  raw_text: z.string(),
  suggestions: z.array(z.string()).default([]),
  save_to_profile: z.boolean().default(false),
});

// Field mapping for auto-fill
export const FieldMappingSchema = z.object({
  field_id: z.string(),
  value: z.any(),
  source: z.enum(['profile', 'household_member', 'saved_date', 'manual']),
  source_id: z.string().nullable(),
  confidence: z.number().min(0).max(1).default(1),
});

// Complete OCR result
export const OCRResultSchema = z.object({
  upload_id: z.string().uuid(),
  total_pages: z.number().int().min(1),
  candidates: z.array(OCRCandidateSchema),
  classified_fields: z.array(ClassifiedFieldSchema),
  processing_time_ms: z.number().int(),
  created_at: z.string().datetime(),
});

// AWS Textract response types
export const TextractBlockTypeSchema = z.enum([
  'PAGE',
  'LINE',
  'WORD',
  'SELECTION_ELEMENT',
  'KEY_VALUE_SET',
  'TABLE',
  'CELL',
]);

export const TextractGeometrySchema = z.object({
  BoundingBox: z.object({
    Width: z.number(),
    Height: z.number(),
    Left: z.number(),
    Top: z.number(),
  }),
  Polygon: z.array(z.object({
    X: z.number(),
    Y: z.number(),
  })),
});

export const TextractBlockSchema = z.object({
  Id: z.string(),
  BlockType: TextractBlockTypeSchema,
  Confidence: z.number().optional(),
  Text: z.string().optional(),
  Geometry: TextractGeometrySchema.optional(),
  Relationships: z.array(z.object({
    Type: z.string(),
    Ids: z.array(z.string()),
  })).optional(),
});

export const TextractResponseSchema = z.object({
  Blocks: z.array(TextractBlockSchema),
  DocumentMetadata: z.object({
    Pages: z.number(),
  }),
});

// Tesseract.js response types
export const TesseractWordSchema = z.object({
  text: z.string(),
  confidence: z.number(),
  bbox: z.object({
    x0: z.number(),
    y0: z.number(),
    x1: z.number(),
    y1: z.number(),
  }),
});

export const TesseractLineSchema = z.object({
  text: z.string(),
  confidence: z.number(),
  bbox: z.object({
    x0: z.number(),
    y0: z.number(),
    x1: z.number(),
    y1: z.number(),
  }),
  words: z.array(TesseractWordSchema),
});

export const TesseractResponseSchema = z.object({
  text: z.string(),
  confidence: z.number(),
  lines: z.array(TesseractLineSchema),
});

// API request/response types
export const ProcessOCRRequestSchema = z.object({
  upload_id: z.string().uuid(),
  use_textract: z.boolean().default(true),
});

export const ProcessOCRResponseSchema = z.object({
  success: z.boolean(),
  upload_id: z.string().uuid(),
  candidates: z.array(OCRCandidateSchema),
  processing_time_ms: z.number().int(),
  error: z.string().optional(),
});

export const ClassifyFieldsRequestSchema = z.object({
  upload_id: z.string().uuid(),
  candidates: z.array(OCRCandidateSchema),
});

export const ClassifyFieldsResponseSchema = z.object({
  success: z.boolean(),
  upload_id: z.string().uuid(),
  classified_fields: z.array(ClassifiedFieldSchema),
  processing_time_ms: z.number().int(),
  error: z.string().optional(),
});

// Type exports
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;
export type FieldType = z.infer<typeof FieldTypeSchema>;
export type OCRCandidate = z.infer<typeof OCRCandidateSchema>;
export type ClassifiedField = z.infer<typeof ClassifiedFieldSchema>;
export type FieldMapping = z.infer<typeof FieldMappingSchema>;
export type OCRResult = z.infer<typeof OCRResultSchema>;

export type TextractResponse = z.infer<typeof TextractResponseSchema>;
export type TextractBlock = z.infer<typeof TextractBlockSchema>;
export type TextractGeometry = z.infer<typeof TextractGeometrySchema>;

export type TesseractResponse = z.infer<typeof TesseractResponseSchema>;
export type TesseractLine = z.infer<typeof TesseractLineSchema>;
export type TesseractWord = z.infer<typeof TesseractWordSchema>;

export type ProcessOCRRequest = z.infer<typeof ProcessOCRRequestSchema>;
export type ProcessOCRResponse = z.infer<typeof ProcessOCRResponseSchema>;
export type ClassifyFieldsRequest = z.infer<typeof ClassifyFieldsRequestSchema>;
export type ClassifyFieldsResponse = z.infer<typeof ClassifyFieldsResponseSchema>;