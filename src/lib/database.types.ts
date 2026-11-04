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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      checkins: {
        Row: {
          created_at: string
          id: string
          passage: string | null
          plan_day: number | null
          plan_id: string | null
          read_text: string | null
          reading_date: string
          reflect_text: string | null
          respond_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          passage?: string | null
          plan_day?: number | null
          plan_id?: string | null
          read_text?: string | null
          reading_date: string
          reflect_text?: string | null
          respond_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          passage?: string | null
          plan_day?: number | null
          plan_id?: string | null
          read_text?: string | null
          reading_date?: string
          reflect_text?: string | null
          respond_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      encouragements: {
        Row: {
          created_at: string
          id: string
          kind: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          sent_on: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          sent_on?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          sent_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "encouragements_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encouragements_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          accepted_at: string | null
          addressee_id: string
          created_at: string
          requester_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          addressee_id: string
          created_at?: string
          requester_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          addressee_id?: string
          created_at?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          join_code: string
          name: string
          overseer_id: string
          type: Database["public"]["Enums"]["group_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          join_code: string
          name: string
          overseer_id: string
          type?: Database["public"]["Enums"]["group_type"]
        }
        Update: {
          created_at?: string
          id?: string
          join_code?: string
          name?: string
          overseer_id?: string
          type?: Database["public"]["Enums"]["group_type"]
        }
        Relationships: [
          {
            foreignKeyName: "groups_overseer_id_fkey"
            columns: ["overseer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          color: string
          created_at: string
          id: string
          note: string | null
          user_id: string
          verse_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          note?: string | null
          user_id: string
          verse_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          note?: string | null
          user_id?: string
          verse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      keep_alive: {
        Row: {
          id: number
          pinged_at: string | null
        }
        Insert: {
          id: number
          pinged_at?: string | null
        }
        Update: {
          id?: number
          pinged_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          friend_code: string
          full_name: string
          id: string
          mode: Database["public"]["Enums"]["checkin_mode"]
          overseer_id: string | null
          push_token: string | null
          reminder_time: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          friend_code?: string
          full_name: string
          id: string
          mode?: Database["public"]["Enums"]["checkin_mode"]
          overseer_id?: string | null
          push_token?: string | null
          reminder_time?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          friend_code?: string
          full_name?: string
          id?: string
          mode?: Database["public"]["Enums"]["checkin_mode"]
          overseer_id?: string | null
          push_token?: string | null
          reminder_time?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_overseer_id_fkey"
            columns: ["overseer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_adjustments: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          reading_date: string
          reason: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          reading_date: string
          reason: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          reading_date?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_adjustments_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streak_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plans: {
        Row: {
          completed_at: string | null
          current_day: number
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_day?: number
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_day?: number
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
      admin_delete_checkin: {
        Args: { p_reading_date: string; p_user_id: string }
        Returns: undefined
      }
      admin_list_feedback: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
          resolved_at: string
          user_id: string
        }[]
      }
      admin_list_people: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_checkin: string
          mode: Database["public"]["Enums"]["checkin_mode"]
          overseer_id: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      admin_monthly_report: {
        Args: { p_month: string }
        Returns: {
          current_streak: number
          days_read: number
          email: string
          full_name: string
          groups: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      admin_set_group_overseer: {
        Args: { p_group_id: string; p_overseer_id: string }
        Returns: undefined
      }
      admin_update_profile: {
        Args: {
          p_mode: Database["public"]["Enums"]["checkin_mode"]
          p_overseer_id: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      are_friends: { Args: { p_a: string; p_b: string }; Returns: boolean }
      can_view_progress: { Args: { p_user_id: string }; Returns: boolean }
      complete_plan_day: {
        Args: { p_day: number; p_plan_id: string; p_total_days: number }
        Returns: {
          completed_at: string | null
          current_day: number
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      compute_streak: {
        Args: { p_user_id: string }
        Returns: Record<string, unknown>
      }
      delete_my_account: { Args: never; Returns: undefined }
      get_streak: {
        Args: { p_user_id: string }
        Returns: {
          grace_used_this_week: boolean
          streak: number
        }[]
      }
      is_group_member: { Args: { p_group_id: string }; Returns: boolean }
      join_group: { Args: { p_code: string }; Returns: string }
      leader_history: {
        Args: { p_days: number; p_user_id: string }
        Returns: {
          is_adjustment: boolean
          passage: string
          reading_date: string
        }[]
      }
      manila_today: { Args: never; Returns: string }
      mark_encouragements_read: { Args: never; Returns: undefined }
      my_encouragements: {
        Args: never
        Returns: {
          created_at: string
          id: string
          kind: string
          read_at: string
          sender_name: string
        }[]
      }
      my_friends: {
        Args: never
        Returns: {
          checked_in_today: boolean
          friend_id: string
          full_name: string
          relation: string
          since: string
          streak: number
        }[]
      }
      my_leaders_today: {
        Args: never
        Returns: {
          checked_in_today: boolean
          full_name: string
          grace_used_this_week: boolean
          last_read_date: string
          mode: Database["public"]["Enums"]["checkin_mode"]
          streak: number
          user_id: string
        }[]
      }
      my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      new_friend_code: { Args: never; Returns: string }
      overseer_set_mode: {
        Args: {
          p_mode: Database["public"]["Enums"]["checkin_mode"]
          p_user_id: string
        }
        Returns: undefined
      }
      oversees: { Args: { p_user_id: string }; Returns: boolean }
      read_on: { Args: { p_day: string; p_user_id: string }; Returns: boolean }
      remove_friend: { Args: { p_friend: string }; Returns: undefined }
      require_admin: { Args: never; Returns: undefined }
      respond_friend_request: {
        Args: { p_accept: boolean; p_requester: string }
        Returns: undefined
      }
      send_encouragement: {
        Args: { p_kind: string; p_to: string }
        Returns: undefined
      }
      send_friend_request: {
        Args: { p_code: string }
        Returns: {
          friend_name: string
          status: string
        }[]
      }
      start_plan: {
        Args: { p_plan_id: string }
        Returns: {
          completed_at: string | null
          current_day: number
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      checkin_mode: "guided" | "simple"
      group_type: "cell_group" | "ministry"
      user_role: "leader" | "overseer" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      checkin_mode: ["guided", "simple"],
      group_type: ["cell_group", "ministry"],
      user_role: ["leader", "overseer", "admin"],
    },
  },
} as const
