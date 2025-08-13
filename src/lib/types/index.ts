// Database types
export * from './database';

// OCR and field detection types
export * from './ocr';

// API types
export * from './api';

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// UI component prop types
export interface BaseComponentProps {
  className?: string;
  id?: string;
  'data-testid'?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface UploadState extends LoadingState {
  progress?: number;
  file?: File | null;
}

export interface FormState extends LoadingState {
  isDirty?: boolean;
  isValid?: boolean;
  errors?: Record<string, string>;
}

// Route parameter types
export interface UploadPageParams {
  id: string;
}

export interface DashboardSearchParams {
  page?: string;
  limit?: string;
  sort?: string;
  filter?: string;
}

// Storage and file types
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: FileMetadata;
}

// User session types
export interface UserSession {
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
  };
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

// Feature flags and configuration
export interface AppConfig {
  features: {
    textract_enabled: boolean;
    stripe_enabled: boolean;
    family_plan_enabled: boolean;
    debug_mode: boolean;
  };
  limits: {
    max_file_size: number;
    max_pages: number;
    free_credits: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    mobile_breakpoint: number;
    animation_enabled: boolean;
  };
}