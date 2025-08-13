export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          date_of_birth: string | null;
          email: string | null;
          phone: string | null;
          address: Record<string, any> | null;
          custom_fields: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: Record<string, any> | null;
          custom_fields?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: Record<string, any> | null;
          custom_fields?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      household_members: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          date_of_birth: string | null;
          relationship: string | null;
          custom_fields: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          date_of_birth?: string | null;
          relationship?: string | null;
          custom_fields?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          date_of_birth?: string | null;
          relationship?: string | null;
          custom_fields?: Record<string, any>;
          created_at?: string;
        };
      };
      signatures: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          image_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          image_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          image_path?: string;
          created_at?: string;
        };
      };
      uploads: {
        Row: {
          id: string;
          user_id: string;
          file_path: string;
          original_filename: string;
          mime_type: string;
          file_size: number | null;
          ocr_json: Record<string, any> | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_path: string;
          original_filename: string;
          mime_type: string;
          file_size?: number | null;
          ocr_json?: Record<string, any> | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_path?: string;
          original_filename?: string;
          mime_type?: string;
          file_size?: number | null;
          ocr_json?: Record<string, any> | null;
          status?: string;
          created_at?: string;
        };
      };
      form_fills: {
        Row: {
          id: string;
          user_id: string;
          upload_id: string;
          mapping: Record<string, any>;
          output_pdf_path: string | null;
          credits_spent: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          upload_id: string;
          mapping: Record<string, any>;
          output_pdf_path?: string | null;
          credits_spent?: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          upload_id?: string;
          mapping?: Record<string, any>;
          output_pdf_path?: string | null;
          credits_spent?: number;
          status?: string;
          created_at?: string;
        };
      };
      billing_customers: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          plan: string;
          credits: number;
          subscription_status: string | null;
          subscription_id: string | null;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          plan?: string;
          credits?: number;
          subscription_status?: string | null;
          subscription_id?: string | null;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string | null;
          plan?: string;
          credits?: number;
          subscription_status?: string | null;
          subscription_id?: string | null;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      check_user_credits: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      consume_credit: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      log_user_action: {
        Args: {
          p_user_id: string;
          p_action: string;
          p_resource_type?: string;
          p_resource_id?: string;
          p_metadata?: Record<string, any>;
        };
        Returns: void;
      };
    };
    Enums: {};
  };
}