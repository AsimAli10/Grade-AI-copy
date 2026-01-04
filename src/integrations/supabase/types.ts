export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      daily_scan_counts: {
        Row: {
          count: number
          id: string
          scan_date: string
          user_id: string | null
        }
        Insert: {
          count?: number
          id?: string
          scan_date?: string
          user_id?: string | null
        }
        Update: {
          count?: number
          id?: string
          scan_date?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_scan_counts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          goal: string | null
          id: string
          language: string
          plan: Json
          target_weight: number | null
          timeframe_weeks: number | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          goal?: string | null
          id?: string
          language?: string
          plan: Json
          target_weight?: number | null
          timeframe_weeks?: number | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          goal?: string | null
          id?: string
          language?: string
          plan?: Json
          target_weight?: number | null
          timeframe_weeks?: number | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      free_scan_sessions: {
        Row: {
          created_at: string
          daily_limit: number | null
          daily_remaining: number | null
          id: string
          last_reset_at: string | null
          session_id: string | null
          total_limit: number | null
          total_remaining: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          daily_limit?: number | null
          daily_remaining?: number | null
          id?: string
          last_reset_at?: string | null
          session_id?: string | null
          total_limit?: number | null
          total_remaining?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          daily_limit?: number | null
          daily_remaining?: number | null
          id?: string
          last_reset_at?: string | null
          session_id?: string | null
          total_limit?: number | null
          total_remaining?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "free_scan_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
          google_classroom_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
          google_classroom_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
          google_classroom_id?: string | null
        }
        Relationships: []
      }
      scans: {
        Row: {
          analysis_data: Json | null
          calories: number | null
          carbs: number | null
          created_at: string
          dish_name: string | null
          fat: number | null
          fiber: number | null
          id: string
          image_url: string | null
          ingredients: Json | null
          protein: number | null
          scan_number: number
          serving_size: string | null
          sodium: number | null
          sugar: number | null
          user_id: string | null
        }
        Insert: {
          analysis_data?: Json | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          dish_name?: string | null
          fat?: number | null
          fiber?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          protein?: number | null
          scan_number?: number
          serving_size?: string | null
          sodium?: number | null
          sugar?: number | null
          user_id?: string | null
        }
        Update: {
          analysis_data?: Json | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          dish_name?: string | null
          fat?: number | null
          fiber?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          protein?: number | null
          scan_number?: number
          serving_size?: string | null
          sodium?: number | null
          sugar?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          created_at: string
          current_period_end: string | null
          id: string
          is_active: boolean
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_active?: boolean
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_active?: boolean
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_settings: {
        Row: {
          border_radius: string | null
          branding_visible: boolean
          created_at: string
          custom_text: string | null
          id: string
          primary_color: string | null
          updated_at: string
          user_id: string
          widget_id: string
        }
        Insert: {
          border_radius?: string | null
          branding_visible?: boolean
          created_at?: string
          custom_text?: string | null
          id?: string
          primary_color?: string | null
          updated_at?: string
          user_id: string
          widget_id: string
        }
        Update: {
          border_radius?: string | null
          branding_visible?: boolean
          created_at?: string
          custom_text?: string | null
          id?: string
          primary_color?: string | null
          updated_at?: string
          user_id?: string
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_subscriptions: {
        Row: {
          billing_cycle: string | null
          created_at: string
          current_period_end: string | null
          id: string
          is_active: boolean
          site_limit: number | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscription_type: Database["public"]["Enums"]["widget_subscription_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_active?: boolean
          site_limit?: number | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: Database["public"]["Enums"]["widget_subscription_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_active?: boolean
          site_limit?: number | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: Database["public"]["Enums"]["widget_subscription_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      google_classroom_integrations: {
        Row: {
          id: string
          user_id: string
          access_token: string
          refresh_token: string
          token_expires_at: string
          google_classroom_id: string
          sync_status: "pending" | "syncing" | "synced" | "error" | "expired"
          last_sync_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          refresh_token: string
          token_expires_at: string
          google_classroom_id: string
          sync_status?: "pending" | "syncing" | "synced" | "error" | "expired"
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token?: string
          refresh_token?: string
          token_expires_at?: string
          google_classroom_id?: string
          sync_status?: "pending" | "syncing" | "synced" | "error" | "expired"
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_classroom_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_type: "free" | "premium"
      widget_subscription_type: "free" | "plan1" | "plan2" | "plan3"
      sync_status: "pending" | "syncing" | "synced" | "error" | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      subscription_type: ["free", "premium"],
      widget_subscription_type: ["free", "plan1", "plan2", "plan3"],
      sync_status: ["pending", "syncing", "synced", "error", "expired"],
    },
  },
} as const
