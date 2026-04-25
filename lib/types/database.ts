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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      fill_ups: {
        Row: {
          address: string | null
          city: string | null
          country: string
          created_at: string
          created_by: string
          currency: string
          date: string
          id: string
          is_baseline: boolean
          is_full_tank: boolean
          is_highway: boolean
          latitude: number | null
          liters: number | null
          longitude: number | null
          note: string | null
          odometer_km: number
          odometer_photo_path: string | null
          receipt_photo_path: string | null
          region: string | null
          station_brand: string | null
          total_price: number | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by: string
          currency?: string
          date: string
          id?: string
          is_baseline?: boolean
          is_full_tank?: boolean
          is_highway?: boolean
          latitude?: number | null
          liters?: number | null
          longitude?: number | null
          note?: string | null
          odometer_km: number
          odometer_photo_path?: string | null
          receipt_photo_path?: string | null
          region?: string | null
          station_brand?: string | null
          total_price?: number | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string
          currency?: string
          date?: string
          id?: string
          is_baseline?: boolean
          is_full_tank?: boolean
          is_highway?: boolean
          latitude?: number | null
          liters?: number | null
          longitude?: number | null
          note?: string | null
          odometer_km?: number
          odometer_photo_path?: string | null
          receipt_photo_path?: string | null
          region?: string | null
          station_brand?: string | null
          total_price?: number | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fill_ups_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_rates: {
        Row: {
          rate_date: string
          currency: string
          czk_per_unit: number
          fetched_at: string
        }
        Insert: {
          rate_date: string
          currency: string
          czk_per_unit: number
          fetched_at?: string
        }
        Update: {
          rate_date?: string
          currency?: string
          czk_per_unit?: number
          fetched_at?: string
        }
        Relationships: []
      }
      garage_user_settings: {
        Row: {
          user_id: string
          garage_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          user_id: string
          garage_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          garage_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      garage_members: {
        Row: {
          garage_id: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          garage_id: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          garage_id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_members_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
      garages: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_entries: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string
          currency: string
          date: string
          id: string
          kind: Database["public"]["Enums"]["maintenance_kind"]
          next_due_date: string | null
          next_due_km: number | null
          note: string | null
          odometer_km: number | null
          title: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by: string
          currency?: string
          date: string
          id?: string
          kind?: Database["public"]["Enums"]["maintenance_kind"]
          next_due_date?: string | null
          next_due_km?: number | null
          note?: string | null
          odometer_km?: number | null
          title?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string
          currency?: string
          date?: string
          id?: string
          kind?: Database["public"]["Enums"]["maintenance_kind"]
          next_due_date?: string | null
          next_due_km?: number | null
          note?: string | null
          odometer_km?: number | null
          title?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_entries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          garage_id: string | null
          id: string
          invited_by: string
          invited_email: string
          role: Database["public"]["Enums"]["member_role"]
          token: string
          vehicle_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          garage_id?: string | null
          id?: string
          invited_by: string
          invited_email: string
          role: Database["public"]["Enums"]["member_role"]
          token?: string
          vehicle_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          garage_id?: string | null
          id?: string
          invited_by?: string
          invited_email?: string
          role?: Database["public"]["Enums"]["member_role"]
          token?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_invites_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invites_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_key_last4: string | null
          ai_provider: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_admin: boolean
          updated_at: string
        }
        Insert: {
          ai_key_last4?: string | null
          ai_provider?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_admin?: boolean
          updated_at?: string
        }
        Update: {
          ai_key_last4?: string | null
          ai_provider?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_ai_keys: {
        Row: {
          api_key: string
          created_at: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_members: {
        Row: {
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
          vehicle_id: string
        }
        Insert: {
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
          vehicle_id: string
        }
        Update: {
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_members_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          forward_receipts_to_email: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          garage_id: string | null
          id: string
          license_plate: string | null
          make: string | null
          model: string | null
          name: string
          photo_path: string | null
          archived_at: string | null
          tank_capacity_liters: number | null
          updated_at: string
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          forward_receipts_to_email?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          garage_id?: string | null
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name: string
          photo_path?: string | null
          archived_at?: string | null
          tank_capacity_liters?: number | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          forward_receipts_to_email?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          garage_id?: string | null
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
          photo_path?: string | null
          archived_at?: string | null
          tank_capacity_liters?: number | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vehicle_date_range_v: {
        Row: {
          vehicle_id: string | null
          first_date: string | null
          last_date: string | null
          first_year: number | null
          last_year: number | null
          fill_up_count: number | null
          current_odometer: number | null
        }
        Relationships: []
      }
      fill_up_stats_v: {
        Row: {
          address: string | null
          city: string | null
          consumption_l_per_100km: number | null
          country: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          date: string | null
          days_since_last: number | null
          id: string | null
          is_baseline: boolean | null
          is_full_tank: boolean | null
          is_highway: boolean | null
          km_since_last: number | null
          latitude: number | null
          liters: number | null
          longitude: number | null
          note: string | null
          odometer_km: number | null
          odometer_photo_path: string | null
          price_per_liter: number | null
          price_per_liter_czk: number | null
          receipt_photo_path: string | null
          region: string | null
          station_brand: string | null
          total_price: number | null
          total_price_czk: number | null
          vehicle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fill_ups_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _get_ai_key_for_user: {
        Args: { p_user_id: string }
        Returns: {
          api_key: string
          provider: string
        }[]
      }
      accept_pending_invites: { Args: Record<string, never>; Returns: Json }
      add_garage_member: {
        Args: {
          p_email: string
          p_garage_id: string
          p_role: Database["public"]["Enums"]["member_role"]
        }
        Returns: Json
      }
      add_vehicle_member: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["member_role"]
          p_vehicle_id: string
        }
        Returns: Json
      }
      admin_delete_fill_up: {
        Args: { p_fill_up_id: string }
        Returns: undefined
      }
      admin_delete_garage: { Args: { p_garage_id: string }; Returns: undefined }
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_delete_vehicle: {
        Args: { p_vehicle_id: string }
        Returns: undefined
      }
      admin_list_fill_ups: {
        Args: { p_limit?: number; p_vehicle_id?: string | null }
        Returns: {
          city: string
          country: string
          created_at: string
          created_by: string
          created_by_email: string
          currency: string
          date: string
          id: string
          is_baseline: boolean
          is_full_tank: boolean
          is_highway: boolean
          liters: number
          note: string
          odometer_km: number
          station_brand: string
          total_price: number
          vehicle_id: string
          vehicle_name: string
        }[]
      }
      admin_list_garages: {
        Args: Record<string, never>
        Returns: {
          created_at: string
          created_by: string
          description: string
          id: string
          member_count: number
          name: string
          owner_email: string
          updated_at: string
          vehicle_count: number
        }[]
      }
      admin_list_users: {
        Args: Record<string, never>
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          email: string
          fill_up_count: number
          garage_count: number
          id: string
          is_admin: boolean
          vehicle_count: number
        }[]
      }
      admin_list_vehicles: {
        Args: Record<string, never>
        Returns: {
          color: string
          created_at: string
          created_by: string
          fill_up_count: number
          forward_receipts_to_email: string
          fuel_type: string
          garage_id: string
          garage_name: string
          id: string
          last_fill_up_at: string
          license_plate: string
          make: string
          model: string
          name: string
          owner_email: string
          updated_at: string
          year: number
        }[]
      }
      admin_set_user_admin: {
        Args: { p_is_admin: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_update_fill_up: {
        Args: {
          p_date: string
          p_fill_up_id: string
          p_liters: number
          p_note: string
          p_odometer_km: number
          p_station_brand: string
          p_total_price: number
        }
        Returns: undefined
      }
      admin_update_garage: {
        Args: { p_description: string; p_garage_id: string; p_name: string }
        Returns: undefined
      }
      admin_update_profile: {
        Args: {
          p_avatar_url: string
          p_display_name: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_update_vehicle:
        | {
            Args: {
              p_color: string
              p_garage_id: string
              p_license_plate: string
              p_make: string
              p_model: string
              p_name: string
              p_vehicle_id: string
              p_year: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_color: string
              p_forward_receipts_to_email?: string
              p_garage_id: string
              p_license_plate: string
              p_make: string
              p_model: string
              p_name: string
              p_vehicle_id: string
              p_year: number
            }
            Returns: undefined
          }
      can_use_garage: { Args: { g_id: string; u_id: string }; Returns: boolean }
      can_write_vehicle: {
        Args: { u_id: string; v_id: string }
        Returns: boolean
      }
      cancel_pending_invite: { Args: { p_invite_id: string }; Returns: Json }
      clear_ai_key: { Args: Record<string, never>; Returns: undefined }
      get_forward_receipt_context: {
        Args: { p_fill_up_id: string }
        Returns: {
          address: string
          city: string
          currency: string
          fill_up_date: string
          forward_to: string
          liters: number
          receipt_photo_path: string
          station_brand: string
          total_price: number
          vehicle_name: string
          vehicle_plate: string
        }[]
      }
      get_invite_context: {
        Args: { p_invite_id: string }
        Returns: {
          expires_at: string
          garage_id: string
          garage_name: string
          invite_id: string
          invited_email: string
          inviter_display_name: string
          inviter_email: string
          inviter_id: string
          role: Database["public"]["Enums"]["member_role"]
          token: string
          vehicle_id: string
          vehicle_name: string
          vehicle_plate: string
        }[]
      }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      is_garage_member: {
        Args: { g_id: string; u_id: string }
        Returns: boolean
      }
      is_garage_owner: {
        Args: { g_id: string; u_id: string }
        Returns: boolean
      }
      is_vehicle_member: {
        Args: { u_id: string; v_id: string }
        Returns: boolean
      }
      list_garage_members: {
        Args: { p_garage_id: string }
        Returns: {
          display_name: string
          email: string
          invited_by: string
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }[]
      }
      list_pending_garage_invites: {
        Args: { p_garage_id: string }
        Returns: {
          created_at: string
          expires_at: string
          invite_id: string
          invited_email: string
          role: Database["public"]["Enums"]["member_role"]
        }[]
      }
      list_pending_vehicle_invites: {
        Args: { p_vehicle_id: string }
        Returns: {
          created_at: string
          expires_at: string
          invite_id: string
          invited_email: string
          role: Database["public"]["Enums"]["member_role"]
        }[]
      }
      list_vehicle_members: {
        Args: { p_vehicle_id: string }
        Returns: {
          display_name: string
          email: string
          invited_by: string
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }[]
      }
      remove_garage_member: {
        Args: { p_garage_id: string; p_user_id: string }
        Returns: undefined
      }
      remove_vehicle_member: {
        Args: { p_user_id: string; p_vehicle_id: string }
        Returns: undefined
      }
      set_ai_key: {
        Args: { p_api_key: string; p_provider: string }
        Returns: undefined
      }
      set_garage_member_role: {
        Args: {
          p_garage_id: string
          p_role: Database["public"]["Enums"]["member_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      set_vehicle_member_role: {
        Args: {
          p_role: Database["public"]["Enums"]["member_role"]
          p_user_id: string
          p_vehicle_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      fuel_type: "gasoline" | "diesel" | "lpg" | "electric" | "hybrid"
      maintenance_kind:
        | "oil_change"
        | "tires_change"
        | "stk"
        | "emise"
        | "service"
        | "repair"
        | "insurance"
        | "highway_sticker"
        | "other"
      member_role: "owner" | "editor" | "viewer"
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
      fuel_type: ["gasoline", "diesel", "lpg", "electric", "hybrid"],
      maintenance_kind: [
        "oil_change",
        "tires_change",
        "stk",
        "emise",
        "service",
        "repair",
        "insurance",
        "highway_sticker",
        "other",
      ],
      member_role: ["owner", "editor", "viewer"],
    },
  },
} as const
