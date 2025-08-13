import { z } from 'zod';
import { ClassifiedField, FieldMapping } from './ocr';

// Common API response wrapper
export const APIResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

// File upload types
export const UploadFileRequestSchema = z.object({
  file: z.any(), // File object
  filename: z.string(),
});

export const UploadFileResponseSchema = APIResponseSchema(
  z.object({
    upload_id: z.string().uuid(),
    file_path: z.string(),
    original_filename: z.string(),
    mime_type: z.string(),
    file_size: z.number(),
  })
);

// Auto-fill types
export const AutoFillRequestSchema = z.object({
  upload_id: z.string().uuid(),
  household_member_id: z.string().uuid().optional(),
  fields: z.array(z.any()), // ClassifiedField array
});

export const AutoFillResponseSchema = APIResponseSchema(
  z.object({
    upload_id: z.string().uuid(),
    mappings: z.array(z.any()), // FieldMapping array
    auto_filled_count: z.number().int(),
    total_fields: z.number().int(),
  })
);

// PDF rendering types
export const RenderPDFRequestSchema = z.object({
  upload_id: z.string().uuid(),
  mappings: z.array(z.any()), // FieldMapping array
  signature_id: z.string().uuid(),
  date_selections: z.record(z.string()),
  options: z.object({
    flatten: z.boolean().default(true),
    quality: z.enum(['low', 'medium', 'high']).default('medium'),
  }).optional(),
});

export const RenderPDFResponseSchema = APIResponseSchema(
  z.object({
    form_fill_id: z.string().uuid(),
    download_url: z.string().url(),
    file_size: z.number().int(),
    pages: z.number().int(),
    credits_spent: z.number().int(),
  })
);

// Stripe checkout types
export const CreateCheckoutRequestSchema = z.object({
  plan_type: z.enum(['individual', 'family', 'credits']),
  credits_amount: z.number().int().min(1).optional(),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});

export const CreateCheckoutResponseSchema = APIResponseSchema(
  z.object({
    checkout_url: z.string().url(),
    session_id: z.string(),
  })
);

// Webhook types
export const StripeWebhookRequestSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.record(z.any()),
  }),
  id: z.string(),
  created: z.number(),
});

// User profile update types
export const UpdateProfileRequestSchema = z.object({
  full_name: z.string().optional(),
  date_of_birth: z.string().date().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.record(z.any()).optional(),
  custom_fields: z.record(z.any()).optional(),
});

export const UpdateProfileResponseSchema = APIResponseSchema(
  z.object({
    profile: z.record(z.any()), // Profile type
    updated_fields: z.array(z.string()),
  })
);

// Dashboard data types
export const DashboardStatsSchema = z.object({
  total_uploads: z.number().int(),
  total_completed_forms: z.number().int(),
  credits_remaining: z.number().int(),
  current_plan: z.string(),
  usage_this_month: z.number().int(),
  last_activity: z.string().datetime().optional(),
});

export const DashboardDataResponseSchema = APIResponseSchema(
  z.object({
    stats: DashboardStatsSchema,
    recent_uploads: z.array(z.record(z.any())),
    recent_form_fills: z.array(z.record(z.any())),
  })
);

// Error types
export const APIErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  timestamp: z.string().datetime(),
});

export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
});

export const ValidationErrorsResponseSchema = APIResponseSchema(
  z.object({
    validation_errors: z.array(ValidationErrorSchema),
  })
);

// Pagination types
export const PaginationRequestSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const PaginationResponseSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  total_pages: z.number().int(),
  has_next: z.boolean(),
  has_prev: z.boolean(),
});

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.boolean(),
    data: z.array(itemSchema),
    pagination: PaginationResponseSchema,
    error: z.string().optional(),
  });

// Search types
export const SearchRequestSchema = z.object({
  query: z.string().min(1),
  filters: z.record(z.any()).optional(),
  ...PaginationRequestSchema.shape,
});

// Type exports
export type UploadFileRequest = z.infer<typeof UploadFileRequestSchema>;
export type UploadFileResponse = z.infer<typeof UploadFileResponseSchema>;

export type AutoFillRequest = z.infer<typeof AutoFillRequestSchema>;
export type AutoFillResponse = z.infer<typeof AutoFillResponseSchema>;

export type RenderPDFRequest = z.infer<typeof RenderPDFRequestSchema>;
export type RenderPDFResponse = z.infer<typeof RenderPDFResponseSchema>;

export type CreateCheckoutRequest = z.infer<typeof CreateCheckoutRequestSchema>;
export type CreateCheckoutResponse = z.infer<typeof CreateCheckoutResponseSchema>;

export type StripeWebhookRequest = z.infer<typeof StripeWebhookRequestSchema>;

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type DashboardDataResponse = z.infer<typeof DashboardDataResponseSchema>;

export type APIError = z.infer<typeof APIErrorSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ValidationErrorsResponse = z.infer<typeof ValidationErrorsResponseSchema>;

export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;
export type PaginationResponse = z.infer<typeof PaginationResponseSchema>;
export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export type APIResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  success: boolean;
  data: T[];
  pagination: PaginationResponse;
  error?: string;
};