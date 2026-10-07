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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _auth_migration_backup: {
        Row: {
          detail: Json
          id: number
          kind: string
          object_name: string | null
          schema_name: string | null
          taken_at: string
        }
        Insert: {
          detail: Json
          id?: number
          kind: string
          object_name?: string | null
          schema_name?: string | null
          taken_at?: string
        }
        Update: {
          detail?: Json
          id?: number
          kind?: string
          object_name?: string | null
          schema_name?: string | null
          taken_at?: string
        }
        Relationships: []
      }
      _company_mode_backup: {
        Row: {
          company_code: string | null
          id: number
          taken_at: string
          user_id: string
        }
        Insert: {
          company_code?: string | null
          id?: number
          taken_at?: string
          user_id: string
        }
        Update: {
          company_code?: string | null
          id?: number
          taken_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_reward_log: {
        Row: {
          id: string
          reward_date: string
          reward_points: number
          rewarded_at: string
          source: string | null
          user_id: string
        }
        Insert: {
          id?: string
          reward_date?: string
          reward_points: number
          rewarded_at?: string
          source?: string | null
          user_id?: string
        }
        Update: {
          id?: string
          reward_date?: string
          reward_points?: number
          rewarded_at?: string
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      attendance_config: {
        Row: {
          company_code: string
          created_at: string
          display_time: string
          qr_value: string
          timezone: string
          updated_at: string
          window_end: string
          window_start: string
        }
        Insert: {
          company_code: string
          created_at?: string
          display_time?: string
          qr_value: string
          timezone?: string
          updated_at?: string
          window_end?: string
          window_start?: string
        }
        Update: {
          company_code?: string
          created_at?: string
          display_time?: string
          qr_value?: string
          timezone?: string
          updated_at?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          check_in_at: string
          company_code: string | null
          created_at: string
          entry_date: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          check_in_at?: string
          company_code?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          status: string
          user_id?: string
        }
        Update: {
          check_in_at?: string
          company_code?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      backups: {
        Row: {
          backup_data: Json
          backup_type: string
          created_at: string
          created_by: string | null
          file_size_bytes: number | null
          id: string
        }
        Insert: {
          backup_data: Json
          backup_type?: string
          created_at?: string
          created_by?: string | null
          file_size_bytes?: number | null
          id?: string
        }
        Update: {
          backup_data?: Json
          backup_type?: string
          created_at?: string
          created_by?: string | null
          file_size_bytes?: number | null
          id?: string
        }
        Relationships: []
      }
      boss_damage: {
        Row: {
          attacks_count: number
          boss_fight_id: string
          created_at: string
          damage_dealt: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attacks_count?: number
          boss_fight_id: string
          created_at?: string
          damage_dealt?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          attacks_count?: number
          boss_fight_id?: string
          created_at?: string
          damage_dealt?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boss_damage_boss_fight_id_fkey"
            columns: ["boss_fight_id"]
            isOneToOne: false
            referencedRelation: "boss_fights"
            referencedColumns: ["id"]
          },
        ]
      }
      boss_fights: {
        Row: {
          boss_emoji: string
          boss_name: string
          boss_name_ar: string
          created_at: string
          current_hp: number
          defeated_at: string | null
          id: string
          is_defeated: boolean
          max_hp: number
          week_end: string
          week_start: string
        }
        Insert: {
          boss_emoji?: string
          boss_name: string
          boss_name_ar: string
          created_at?: string
          current_hp?: number
          defeated_at?: string | null
          id?: string
          is_defeated?: boolean
          max_hp?: number
          week_end: string
          week_start: string
        }
        Update: {
          boss_emoji?: string
          boss_name?: string
          boss_name_ar?: string
          created_at?: string
          current_hp?: number
          defeated_at?: string | null
          id?: string
          is_defeated?: boolean
          max_hp?: number
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          best_streak: number
          completed_days: Json
          created_at: string
          current_day: number
          current_streak: number
          id: string
          is_active: boolean
          last_weekly_reset: string | null
          stage_level: number | null
          start_date: string
          streak_freezes: number
          tasks_state: Json
          total_points: number
          updated_at: string
          user_id: string
          weekly_points: number
        }
        Insert: {
          best_streak?: number
          completed_days?: Json
          created_at?: string
          current_day?: number
          current_streak?: number
          id?: string
          is_active?: boolean
          last_weekly_reset?: string | null
          stage_level?: number | null
          start_date?: string
          streak_freezes?: number
          tasks_state?: Json
          total_points?: number
          updated_at?: string
          user_id?: string
          weekly_points?: number
        }
        Update: {
          best_streak?: number
          completed_days?: Json
          created_at?: string
          current_day?: number
          current_streak?: number
          id?: string
          is_active?: boolean
          last_weekly_reset?: string | null
          stage_level?: number | null
          start_date?: string
          streak_freezes?: number
          tasks_state?: Json
          total_points?: number
          updated_at?: string
          user_id?: string
          weekly_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      cosmetic_items: {
        Row: {
          asset_url: string | null
          created_at: string
          css_class: string | null
          id: string
          is_active: boolean
          name: string
          name_ar: string
          rarity: Database["public"]["Enums"]["cosmetic_rarity"]
          type: Database["public"]["Enums"]["cosmetic_type"]
        }
        Insert: {
          asset_url?: string | null
          created_at?: string
          css_class?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_ar: string
          rarity?: Database["public"]["Enums"]["cosmetic_rarity"]
          type: Database["public"]["Enums"]["cosmetic_type"]
        }
        Update: {
          asset_url?: string | null
          created_at?: string
          css_class?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string
          rarity?: Database["public"]["Enums"]["cosmetic_rarity"]
          type?: Database["public"]["Enums"]["cosmetic_type"]
        }
        Relationships: []
      }
      custom_tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          points: number
          tag_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          points?: number
          tag_id?: string | null
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          points?: number
          tag_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_tasks_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "life_area_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          name_ar: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          name_ar?: string | null
          user_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          category_id: string | null
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          points_earned: number | null
          started_at: string
          task_id: string | null
          user_id: string
          was_completed: boolean | null
        }
        Insert: {
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          points_earned?: number | null
          started_at: string
          task_id?: string | null
          user_id?: string
          was_completed?: boolean | null
        }
        Update: {
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          points_earned?: number | null
          started_at?: string
          task_id?: string | null
          user_id?: string
          was_completed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "focus_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "focus_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_settings: {
        Row: {
          auto_start_breaks: boolean | null
          auto_start_pomodoros: boolean | null
          created_at: string
          focus_duration: number | null
          id: string
          long_break_duration: number | null
          pomodoros_until_long_break: number | null
          short_break_duration: number | null
          strict_mode: boolean | null
          strict_mode_timeout: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_start_breaks?: boolean | null
          auto_start_pomodoros?: boolean | null
          created_at?: string
          focus_duration?: number | null
          id?: string
          long_break_duration?: number | null
          pomodoros_until_long_break?: number | null
          short_break_duration?: number | null
          strict_mode?: boolean | null
          strict_mode_timeout?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          auto_start_breaks?: boolean | null
          auto_start_pomodoros?: boolean | null
          created_at?: string
          focus_duration?: number | null
          id?: string
          long_break_duration?: number | null
          pomodoros_until_long_break?: number | null
          short_break_duration?: number | null
          strict_mode?: boolean | null
          strict_mode_timeout?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_subtasks: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean | null
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean | null
          task_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean | null
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "focus_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_tasks: {
        Row: {
          category_id: string | null
          completed_pomodoros: number | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_pomodoros: number | null
          id: string
          is_completed: boolean | null
          priority: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          completed_pomodoros?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_pomodoros?: number | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category_id?: string | null
          completed_pomodoros?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_pomodoros?: number | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "focus_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      level_up_reward_claims: {
        Row: {
          claimed_at: string
          level: number
          user_id: string
        }
        Insert: {
          claimed_at?: string
          level: number
          user_id: string
        }
        Update: {
          claimed_at?: string
          level?: number
          user_id?: string
        }
        Relationships: []
      }
      life_area_tags: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          name_ar: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon: string
          id?: string
          name: string
          name_ar: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          name_ar?: string
        }
        Relationships: []
      }
      mood_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          mood: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date?: string
          id?: string
          mood: string
          reason?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          mood?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nass_progress: {
        Row: {
          best_streak: number
          completed_days: Json
          created_at: string
          current_day: number
          current_streak: number
          start_date: string
          tasks_state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          completed_days?: Json
          created_at?: string
          current_day?: number
          current_streak?: number
          start_date?: string
          tasks_state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          completed_days?: Json
          created_at?: string
          current_day?: number
          current_streak?: number
          start_date?: string
          tasks_state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          reset_token: string | null
          used: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          reset_token?: string | null
          used?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          reset_token?: string | null
          used?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_id: string | null
          avatar_url: string | null
          company_code: string | null
          created_at: string
          equipped_badge_id: string | null
          equipped_frame_id: string | null
          equipped_theme_id: string | null
          gender: string | null
          id: string
          is_lifetime: boolean
          is_premium: boolean
          last_loot_box_streak: number
          level: number
          loot_boxes: number
          onboarding_completed_at: string | null
          premium_until: string | null
          referral_code: string | null
          referred_by: string | null
          total_referrals: number | null
          username: string
          xp: number
        }
        Insert: {
          age?: number | null
          avatar_id?: string | null
          avatar_url?: string | null
          company_code?: string | null
          created_at?: string
          equipped_badge_id?: string | null
          equipped_frame_id?: string | null
          equipped_theme_id?: string | null
          gender?: string | null
          id: string
          is_lifetime?: boolean
          is_premium?: boolean
          last_loot_box_streak?: number
          level?: number
          loot_boxes?: number
          onboarding_completed_at?: string | null
          premium_until?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_referrals?: number | null
          username: string
          xp?: number
        }
        Update: {
          age?: number | null
          avatar_id?: string | null
          avatar_url?: string | null
          company_code?: string | null
          created_at?: string
          equipped_badge_id?: string | null
          equipped_frame_id?: string | null
          equipped_theme_id?: string | null
          gender?: string | null
          id?: string
          is_lifetime?: boolean
          is_premium?: boolean
          last_loot_box_streak?: number
          level?: number
          loot_boxes?: number
          onboarding_completed_at?: string | null
          premium_until?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_referrals?: number | null
          username?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_equipped_badge_id_fkey"
            columns: ["equipped_badge_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_equipped_frame_id_fkey"
            columns: ["equipped_frame_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_equipped_theme_id_fkey"
            columns: ["equipped_theme_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_paid: string | null
          coins_granted: number | null
          created_at: string
          id: string
          kind: string
          premium_days: number | null
          provider: string
          provider_ref: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_paid?: string | null
          coins_granted?: number | null
          created_at?: string
          id?: string
          kind: string
          premium_days?: number | null
          provider?: string
          provider_ref?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_paid?: string | null
          coins_granted?: number | null
          created_at?: string
          id?: string
          kind?: string
          premium_days?: number | null
          provider?: string
          provider_ref?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          points_awarded: number
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_awarded?: number
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points_awarded?: number
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      store_products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          name_ar: string
          price: number
          sizes: string[] | null
          stock: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          name_ar: string
          price?: number
          sizes?: string[] | null
          stock?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          name_ar?: string
          price?: number
          sizes?: string[] | null
          stock?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          completed_at: string
          id: string
          points_earned: number
          tag_id: string | null
          task_key: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          points_earned?: number
          tag_id?: string | null
          task_key: string
          user_id?: string
        }
        Update: {
          completed_at?: string
          id?: string
          points_earned?: number
          tag_id?: string | null
          task_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "life_area_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reminders: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          reminder_time: string
          task_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          reminder_time: string
          task_id: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          reminder_time?: string
          task_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      themes: {
        Row: {
          colors: Json
          created_at: string
          description: string | null
          description_ar: string | null
          id: string
          is_default: boolean
          name: string
          name_ar: string
          preview_image: string | null
          price: number
        }
        Insert: {
          colors?: Json
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          is_default?: boolean
          name: string
          name_ar: string
          preview_image?: string | null
          price?: number
        }
        Update: {
          colors?: Json
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          is_default?: boolean
          name?: string
          name_ar?: string
          preview_image?: string | null
          price?: number
        }
        Relationships: []
      }
      user_inventory: {
        Row: {
          id: string
          item_id: string
          obtained_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          obtained_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          item_id?: string
          obtained_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_themes: {
        Row: {
          id: string
          is_active: boolean
          purchased_at: string
          theme_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          purchased_at?: string
          theme_id: string
          user_id?: string
        }
        Update: {
          id?: string
          is_active?: boolean
          purchased_at?: string
          theme_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_themes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_boss_claims: {
        Row: {
          claim_date: string
          created_at: string
          outcome: string
          user_id: string
        }
        Insert: {
          claim_date: string
          created_at?: string
          outcome: string
          user_id: string
        }
        Update: {
          claim_date?: string
          created_at?: string
          outcome?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_champions: {
        Row: {
          created_at: string
          featured_until: string
          id: string
          total_points: number
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          featured_until: string
          id?: string
          total_points?: number
          user_id?: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          featured_until?: string
          id?: string
          total_points?: number
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _challenge_max_days: {
        Args: { p_mode: string; p_stage: number }
        Returns: number
      }
      _check_loot_box_streak: {
        Args: { p_mode: string; p_uid: string }
        Returns: boolean
      }
      _check_mode: {
        Args: { p_mode: string; p_uid: string }
        Returns: undefined
      }
      _cosmetic_json: {
        Args: { v: Database["public"]["Tables"]["cosmetic_items"]["Row"] }
        Returns: Json
      }
      _evaluate_progress: {
        Args: { p_mode: string; p_uid: string }
        Returns: Json
      }
      _grant_xp: { Args: { p_amount: number; p_uid: string }; Returns: Json }
      _pick_cosmetic: {
        Args: {
          p_allow_owned?: boolean
          p_rarity?: string
          p_types?: string[]
          p_uid: string
          p_weighted?: boolean
        }
        Returns: {
          asset_url: string | null
          created_at: string
          css_class: string | null
          id: string
          is_active: boolean
          name: string
          name_ar: string
          rarity: Database["public"]["Enums"]["cosmetic_rarity"]
          type: Database["public"]["Enums"]["cosmetic_type"]
        }
        SetofOptions: {
          from: "*"
          to: "cosmetic_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _progress_json: { Args: { p_mode: string; p_uid: string }; Returns: Json }
      _require_uid: { Args: never; Returns: string }
      _required_tasks: {
        Args: { p_mode: string; p_stage: number }
        Returns: Json
      }
      _streak_bonus: { Args: { p_streak: number }; Returns: number }
      _task_life_area: { Args: { p_title: string }; Returns: string }
      activate_lifetime: {
        Args: { p_amount?: string; p_provider_ref: string; p_user_id: string }
        Returns: boolean
      }
      activate_premium: {
        Args: {
          p_amount?: string
          p_days: number
          p_provider_ref: string
          p_user_id: string
        }
        Returns: boolean
      }
      add_xp: {
        Args: { p_amount: number; p_user_id: string }
        Returns: {
          leveled_up: boolean
          new_level: number
          new_xp: number
        }[]
      }
      apply_weekly_boss_penalty: { Args: never; Returns: Json }
      baghdad_today: { Args: never; Returns: string }
      buy_streak_freeze: { Args: never; Returns: Json }
      buy_theme: { Args: { p_theme_id: string }; Returns: Json }
      calculate_weekly_champion: { Args: never; Returns: undefined }
      can_advance_to_next_path: { Args: never; Returns: boolean }
      challenge_day_for: {
        Args: { p_max: number; p_start: string }
        Returns: number
      }
      challenge_stage_days: { Args: { p_stage: number }; Returns: number }
      claim_level_up_reward: { Args: { p_level: number }; Returns: Json }
      claim_weekly_boss_chest: { Args: never; Returns: Json }
      complete_custom_task: {
        Args: { p_mode?: string; p_task_id: string }
        Returns: Json
      }
      complete_day: { Args: { p_mode?: string }; Returns: Json }
      complete_onboarding: {
        Args: { p_age: number; p_gender: string }
        Returns: string
      }
      complete_task: {
        Args: { p_mode?: string; p_task_id: number }
        Returns: Json
      }
      deal_boss_damage: {
        Args: { p_damage: number; p_user_id: string }
        Returns: {
          is_defeated: boolean
          new_hp: number
          xp_earned: number
        }[]
      }
      ensure_my_profile: {
        Args: {
          p_avatar_url?: string
          p_company_code?: string
          p_username?: string
        }
        Returns: {
          is_new: boolean
          profile_id: string
          profile_username: string
        }[]
      }
      evaluate_missed_days: { Args: { p_mode?: string }; Returns: Json }
      get_attendance_window: {
        Args: never
        Returns: {
          display_time: string
          timezone: string
          window_end: string
          window_start: string
        }[]
      }
      get_current_champion: {
        Args: { p_board?: string }
        Returns: {
          featured_until: string
          total_points: number
          user_id: string
          username: string
          avatar_id: string | null
          gender: string | null
        }[]
      }
      get_leaderboard: {
        Args: never
        Returns: {
          best_streak: number
          current_day: number
          current_streak: number
          is_premium: boolean
          stage_level: number
          total_points: number
          user_id: string
          username: string
          weekly_points: number
          avatar_id: string | null
          gender: string | null
        }[]
      }
      get_or_create_weekly_boss: { Args: never; Returns: string }
      get_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          role: string
          username: string
        }[]
      }
      grant_ad_reward: {
        Args: { p_source?: string }
        Returns: {
          message: string
          remaining_today: number
          reward: number
          success: boolean
        }[]
      }
      grant_coins: {
        Args: {
          p_amount?: string
          p_coins: number
          p_provider_ref: string
          p_user_id: string
        }
        Returns: boolean
      }
      has_company_access: { Args: { p_user_id?: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_premium_active: { Args: { p_user_id?: string }; Returns: boolean }
      open_chest: { Args: never; Returns: Json }
      open_loot_box: { Args: never; Returns: Json }
      process_referral: {
        Args: { p_new_user_id: string; p_referral_code: string }
        Returns: undefined
      }
      record_attendance: {
        Args: { p_scanned_value: string }
        Returns: {
          checked_in_at: string
          message: string
          status: string
          success: boolean
        }[]
      }
      redeem_nass_reward: { Args: { p_reward_id: string }; Returns: Json }
      requesting_user_id: { Args: never; Returns: string }
      set_company_code: { Args: { p_code: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      cosmetic_rarity: "common" | "rare" | "epic" | "legendary"
      cosmetic_type: "frame" | "badge" | "theme"
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
      app_role: ["admin", "moderator", "user"],
      cosmetic_rarity: ["common", "rare", "epic", "legendary"],
      cosmetic_type: ["frame", "badge", "theme"],
    },
  },
} as const
