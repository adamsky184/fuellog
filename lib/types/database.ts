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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
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
          created_at: string
          created_by: string
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id: string
          license_plate: string | null
          make: string | null
          model: string | null
          name: string
          tank_capacity_liters: number | null
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name: string
          tank_capacity_liters?: number | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
          tank_capacity_liters?: number | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
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
          receipt_photo_path: string | null
          region: string | null
          station_brand: string | null
          total_price: number | null
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
      can_write_vehicle: {
        Args: { u_id: string; v_id: string }
        Returns: boolean
      }
      is_vehicle_member: {
        Args: { u_id: string; v_id: string }
        Returns: boolean
      }
    }
    Enums: {
      fuel_type: "gasoline" | "diesel" | "lpg" | "electric" | "hybrid"
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
      member_role: ["owner", "editor", "viewer"],
    },
  },
} as const
