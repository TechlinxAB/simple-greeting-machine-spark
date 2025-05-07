export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          city: string | null
          client_number: string | null
          county: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          organization_number: string | null
          postal_code: string | null
          telephone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_number?: string | null
          county?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          organization_number?: string | null
          postal_code?: string | null
          telephone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_number?: string | null
          county?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          organization_number?: string | null
          postal_code?: string | null
          telephone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          product_id: string
          quantity: number
          time_entry_id: string | null
          total_amount: number
          unit_price: number
          vat_percentage: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          product_id: string
          quantity: number
          time_entry_id?: string | null
          total_amount: number
          unit_price: number
          vat_percentage: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          product_id?: string
          quantity?: number
          time_entry_id?: string | null
          total_amount?: number
          unit_price?: number
          vat_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string | null
          due_date: string
          exported_to_fortnox: boolean | null
          fortnox_invoice_id: string | null
          id: string
          invoice_number: string
          issue_date: string
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          due_date: string
          exported_to_fortnox?: boolean | null
          fortnox_invoice_id?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          due_date?: string
          exported_to_fortnox?: boolean | null
          fortnox_invoice_id?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          id: string
          image_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          account_number: string | null
          article_number: string | null
          created_at: string | null
          id: string
          name: string
          price: number
          type: string
          updated_at: string | null
          vat_percentage: number | null
        }
        Insert: {
          account_number?: string | null
          article_number?: string | null
          created_at?: string | null
          id?: string
          name: string
          price?: number
          type: string
          updated_at?: string | null
          vat_percentage?: number | null
        }
        Update: {
          account_number?: string | null
          article_number?: string | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number
          type?: string
          updated_at?: string | null
          vat_percentage?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          id: string
          name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          id: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          id?: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          id: string
          settings: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          settings?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          settings?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          client_id: string
          created_at: string | null
          custom_price: number | null
          description: string | null
          end_time: string | null
          id: string
          invoice_id: string | null
          invoiced: boolean | null
          original_end_time: string | null
          original_start_time: string | null
          product_id: string | null
          quantity: number | null
          rounded_duration_minutes: number | null
          start_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          custom_price?: number | null
          description?: string | null
          end_time?: string | null
          id?: string
          invoice_id?: string | null
          invoiced?: boolean | null
          original_end_time?: string | null
          original_start_time?: string | null
          product_id?: string | null
          quantity?: number | null
          rounded_duration_minutes?: number | null
          start_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          custom_price?: number | null
          description?: string | null
          end_time?: string | null
          id?: string
          invoice_id?: string | null
          invoiced?: boolean | null
          original_end_time?: string | null
          original_start_time?: string | null
          product_id?: string | null
          quantity?: number | null
          rounded_duration_minutes?: number | null
          start_time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      token_refresh_logs: {
        Row: {
          created_at: string
          id: string
          message: string | null
          session_id: string | null
          success: boolean
          token_length: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          session_id?: string | null
          success: boolean
          token_length?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          session_id?: string | null
          success?: boolean
          token_length?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_timers: {
        Row: {
          client_id: string
          created_at: string | null
          custom_price: number | null
          description: string | null
          end_time: string | null
          id: string
          product_id: string | null
          start_time: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          custom_price?: number | null
          description?: string | null
          end_time?: string | null
          id?: string
          product_id?: string | null
          start_time?: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          custom_price?: number | null
          description?: string | null
          end_time?: string | null
          id?: string
          product_id?: string | null
          start_time?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_timers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_timers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_username: {
        Args: { user_id: string }
        Returns: string
      }
      is_admin_or_manager: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_user_role: {
        Args: { user_id: string; new_role: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
