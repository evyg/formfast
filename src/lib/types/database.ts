import { z } from 'zod';

// Base schemas for common fields
export const UUIDSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();

// Profile schema
export const ProfileSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  full_name: z.string().nullable(),
  date_of_birth: z.string().date().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.record(z.any()).nullable(),
  custom_fields: z.record(z.any()).default({}),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export const CreateProfileSchema = ProfileSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
});

export const UpdateProfileSchema = CreateProfileSchema.partial();

// Household member schema
export const HouseholdMemberSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  name: z.string(),
  date_of_birth: z.string().date().nullable(),
  relationship: z.string().nullable(),
  custom_fields: z.record(z.any()).default({}),
  created_at: TimestampSchema,
});

export const CreateHouseholdMemberSchema = HouseholdMemberSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
});

// Signature schema
export const SignatureSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  label: z.string().default('default'),
  image_path: z.string(),
  created_at: TimestampSchema,
});

export const CreateSignatureSchema = SignatureSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
});

// Saved date schema
export const SavedDateSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  label: z.string(),
  value: z.string().date(),
  created_at: TimestampSchema,
});

export const CreateSavedDateSchema = SavedDateSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
});

// Upload schema
export const UploadStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export const UploadSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  file_path: z.string(),
  original_filename: z.string(),
  mime_type: z.string(),
  file_size: z.number().int().nullable(),
  ocr_json: z.record(z.any()).nullable(),
  status: UploadStatusSchema.default('pending'),
  created_at: TimestampSchema,
});

export const CreateUploadSchema = UploadSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
});

// Form fill schema
export const FormFillStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export const FormFillSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  upload_id: UUIDSchema,
  mapping: z.record(z.any()),
  output_pdf_path: z.string().nullable(),
  credits_spent: z.number().int().default(1),
  status: FormFillStatusSchema.default('pending'),
  created_at: TimestampSchema,
});

export const CreateFormFillSchema = FormFillSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
});

// Billing customer schema
export const PlanTypeSchema = z.enum(['free', 'individual', 'family', 'payg']);

export const BillingCustomerSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  stripe_customer_id: z.string().nullable(),
  plan: PlanTypeSchema.default('free'),
  credits: z.number().int().default(1),
  subscription_status: z.string().nullable(),
  subscription_id: z.string().nullable(),
  trial_ends_at: TimestampSchema.nullable(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export const UpdateBillingCustomerSchema = BillingCustomerSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
}).partial();

// Audit log schema
export const AuditLogSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  action: z.string(),
  resource_type: z.string().nullable(),
  resource_id: UUIDSchema.nullable(),
  metadata: z.record(z.any()).default({}),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  created_at: TimestampSchema,
});

export const CreateAuditLogSchema = AuditLogSchema.omit({
  id: true,
  created_at: true,
});

// Type exports
export type Profile = z.infer<typeof ProfileSchema>;
export type CreateProfile = z.infer<typeof CreateProfileSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;

export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;
export type CreateHouseholdMember = z.infer<typeof CreateHouseholdMemberSchema>;

export type Signature = z.infer<typeof SignatureSchema>;
export type CreateSignature = z.infer<typeof CreateSignatureSchema>;

export type SavedDate = z.infer<typeof SavedDateSchema>;
export type CreateSavedDate = z.infer<typeof CreateSavedDateSchema>;

export type Upload = z.infer<typeof UploadSchema>;
export type CreateUpload = z.infer<typeof CreateUploadSchema>;
export type UploadStatus = z.infer<typeof UploadStatusSchema>;

export type FormFill = z.infer<typeof FormFillSchema>;
export type CreateFormFill = z.infer<typeof CreateFormFillSchema>;
export type FormFillStatus = z.infer<typeof FormFillStatusSchema>;

export type BillingCustomer = z.infer<typeof BillingCustomerSchema>;
export type UpdateBillingCustomer = z.infer<typeof UpdateBillingCustomerSchema>;
export type PlanType = z.infer<typeof PlanTypeSchema>;

export type AuditLog = z.infer<typeof AuditLogSchema>;
export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>;