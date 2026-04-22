export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          color: string | null
          created_at: string
          created_by: string
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          garage_id: string | null
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
          color?: string | null
          created_at?: string
          created_by: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          garage_id?: string | null
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
          color?: string | null
          created_at?: string
          created_by?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          garage_id?: string | null
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
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
      can_use_garage: { Args: { g_id: string; u_id: string }; Returns: boolean }
      can_write_vehicle: {
        Args: { u_id: string; v_id: string }
        Returns: boolean
      }
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
