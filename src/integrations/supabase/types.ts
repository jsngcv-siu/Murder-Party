export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      avatars: {
        Row: {
          created_at: string;
          emoji: string;
          id: string;
          image_url: string | null;
          label: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          emoji?: string;
          id: string;
          image_url?: string | null;
          label: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          id?: string;
          image_url?: string | null;
          label?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          author_player_id: string;
          author_pseudo: string;
          body: string;
          channel: string;
          created_at: string;
          game_id: string;
          id: string;
        };
        Insert: {
          author_player_id: string;
          author_pseudo: string;
          body: string;
          channel: string;
          created_at?: string;
          game_id: string;
          id?: string;
        };
        Update: {
          author_player_id?: string;
          author_pseudo?: string;
          body?: string;
          channel?: string;
          created_at?: string;
          game_id?: string;
          id?: string;
        };
        Relationships: [];
      };
      games: {
        Row: {
          banned_roles: string[];
          code: string;
          created_at: string;
          current_phase: Database["public"]["Enums"]["phase_t"];
          current_tour: number;
          ended_at: string | null;
          forced_frame: string | null;
          id: string;
          mj_session_id: string;
          mj_user_id: string | null;
          mode_detective_player: boolean;
          paused: boolean;
          phase_duration_free_s: number | null;
          phase_duration_gathering_s: number | null;
          phase_duration_s: number | null;
          phase_duration_vote_s: number | null;
          phase_started_at: string | null;
          pool_config: Json | null;
          set_id: string;
          started_at: string | null;
          status: string;
          variant: string | null;
        };
        Insert: {
          banned_roles?: string[];
          code: string;
          created_at?: string;
          current_phase?: Database["public"]["Enums"]["phase_t"];
          current_tour?: number;
          ended_at?: string | null;
          forced_frame?: string | null;
          id?: string;
          mj_session_id: string;
          mj_user_id?: string | null;
          mode_detective_player?: boolean;
          paused?: boolean;
          phase_duration_free_s?: number | null;
          phase_duration_gathering_s?: number | null;
          phase_duration_s?: number | null;
          phase_duration_vote_s?: number | null;
          phase_started_at?: string | null;
          pool_config?: Json | null;
          set_id?: string;
          started_at?: string | null;
          status?: string;
          variant?: string | null;
        };
        Update: {
          banned_roles?: string[];
          code?: string;
          created_at?: string;
          current_phase?: Database["public"]["Enums"]["phase_t"];
          current_tour?: number;
          ended_at?: string | null;
          forced_frame?: string | null;
          id?: string;
          mj_session_id?: string;
          mj_user_id?: string | null;
          mode_detective_player?: boolean;
          paused?: boolean;
          phase_duration_free_s?: number | null;
          phase_duration_gathering_s?: number | null;
          phase_duration_s?: number | null;
          phase_duration_vote_s?: number | null;
          phase_started_at?: string | null;
          pool_config?: Json | null;
          set_id?: string;
          started_at?: string | null;
          status?: string;
          variant?: string | null;
        };
        Relationships: [];
      };
      gathering_calls: {
        Row: {
          ended_at: string | null;
          game_id: string;
          id: string;
          reason: string | null;
          started_at: string;
          tour: number;
        };
        Insert: {
          ended_at?: string | null;
          game_id: string;
          id?: string;
          reason?: string | null;
          started_at?: string;
          tour: number;
        };
        Update: {
          ended_at?: string | null;
          game_id?: string;
          id?: string;
          reason?: string | null;
          started_at?: string;
          tour?: number;
        };
        Relationships: [
          {
            foreignKeyName: "gathering_calls_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gathering_calls_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games_public";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory: {
        Row: {
          charges: number | null;
          created_at: string;
          game_id: string;
          holder_player_id: string;
          id: string;
          item_slug: string;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          charges?: number | null;
          created_at?: string;
          game_id: string;
          holder_player_id: string;
          id?: string;
          item_slug: string;
          payload?: Json;
          updated_at?: string;
        };
        Update: {
          charges?: number | null;
          created_at?: string;
          game_id?: string;
          holder_player_id?: string;
          id?: string;
          item_slug?: string;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          game_id: string;
          id: string;
          payload: Json;
          player_id: string | null;
          read: boolean;
          title: string;
          type: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          game_id: string;
          id?: string;
          payload?: Json;
          player_id?: string | null;
          read?: boolean;
          title: string;
          type: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          game_id?: string;
          id?: string;
          payload?: Json;
          player_id?: string | null;
          read?: boolean;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players_public";
            referencedColumns: ["id"];
          },
        ];
      };
      player_statuses: {
        Row: {
          active_from_tour: number;
          active_until_tour: number | null;
          created_at: string;
          game_id: string;
          id: string;
          payload: Json;
          player_id: string;
          source: string | null;
          status_slug: string;
        };
        Insert: {
          active_from_tour: number;
          active_until_tour?: number | null;
          created_at?: string;
          game_id: string;
          id?: string;
          payload?: Json;
          player_id: string;
          source?: string | null;
          status_slug: string;
        };
        Update: {
          active_from_tour?: number;
          active_until_tour?: number | null;
          created_at?: string;
          game_id?: string;
          id?: string;
          payload?: Json;
          player_id?: string;
          source?: string | null;
          status_slug?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          game_id: string;
          id: string;
          is_alive: boolean;
          is_imprisoned: boolean;
          is_mj: boolean;
          joined_at: string;
          pseudo: string;
          role_meta: Json;
          role_slug: string | null;
          session_id: string;
          user_id: string | null;
        };
        Insert: {
          game_id: string;
          id?: string;
          is_alive?: boolean;
          is_imprisoned?: boolean;
          is_mj?: boolean;
          joined_at?: string;
          pseudo: string;
          role_meta?: Json;
          role_slug?: string | null;
          session_id: string;
          user_id?: string | null;
        };
        Update: {
          game_id?: string;
          id?: string;
          is_alive?: boolean;
          is_imprisoned?: boolean;
          is_mj?: boolean;
          joined_at?: string;
          pseudo?: string;
          role_meta?: Json;
          role_slug?: string | null;
          session_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "players_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "players_role_slug_fkey";
            columns: ["role_slug"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["slug"];
          },
        ];
      };
      role_actions: {
        Row: {
          actor_player_id: string;
          category: Database["public"]["Enums"]["action_category_t"] | null;
          created_at: string;
          game_id: string;
          id: string;
          item_id: string | null;
          layer: number | null;
          payload: Json;
          phase: Database["public"]["Enums"]["phase_t"];
          preconditions: Json;
          resolution: Json;
          resolved_at: string | null;
          result: Json;
          source: string | null;
          target_player_id: string | null;
          target_player_id_2: string | null;
          timing: Database["public"]["Enums"]["action_timing_t"] | null;
          tour: number;
        };
        Insert: {
          actor_player_id: string;
          category?: Database["public"]["Enums"]["action_category_t"] | null;
          created_at?: string;
          game_id: string;
          id?: string;
          item_id?: string | null;
          layer?: number | null;
          payload?: Json;
          phase: Database["public"]["Enums"]["phase_t"];
          preconditions?: Json;
          resolution?: Json;
          resolved_at?: string | null;
          result?: Json;
          source?: string | null;
          target_player_id?: string | null;
          target_player_id_2?: string | null;
          timing?: Database["public"]["Enums"]["action_timing_t"] | null;
          tour: number;
        };
        Update: {
          actor_player_id?: string;
          category?: Database["public"]["Enums"]["action_category_t"] | null;
          created_at?: string;
          game_id?: string;
          id?: string;
          item_id?: string | null;
          layer?: number | null;
          payload?: Json;
          phase?: Database["public"]["Enums"]["phase_t"];
          preconditions?: Json;
          resolution?: Json;
          resolved_at?: string | null;
          result?: Json;
          source?: string | null;
          target_player_id?: string | null;
          target_player_id_2?: string | null;
          timing?: Database["public"]["Enums"]["action_timing_t"] | null;
          tour?: number;
        };
        Relationships: [
          {
            foreignKeyName: "role_actions_actor_player_id_fkey";
            columns: ["actor_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_actions_actor_player_id_fkey";
            columns: ["actor_player_id"];
            isOneToOne: false;
            referencedRelation: "players_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_actions_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_actions_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_actions_target_player_id_2_fkey";
            columns: ["target_player_id_2"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_actions_target_player_id_2_fkey";
            columns: ["target_player_id_2"];
            isOneToOne: false;
            referencedRelation: "players_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_actions_target_player_id_fkey";
            columns: ["target_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_actions_target_player_id_fkey";
            columns: ["target_player_id"];
            isOneToOne: false;
            referencedRelation: "players_public";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          capacite_full_text: string;
          carte_app: string;
          compensateur_de: string | null;
          created_at: string;
          description: string | null;
          difficulte: string;
          draw_weight: number;
          emergent: boolean;
          faction: Database["public"]["Enums"]["faction_t"];
          frequency_label: string | null;
          icon: string;
          image_url: string | null;
          instruction_verb: string;
          is_disabled: boolean;
          is_special: boolean;
          min_players: number;
          name_fr: string;
          phase_activation: string;
          police_verdict: Database["public"]["Enums"]["police_verdict_t"];
          presence: Database["public"]["Enums"]["presence_t"];
          secondary_type: Database["public"]["Enums"]["role_type_t"] | null;
          set_id: string;
          slug: string;
          target_mode: string;
          trigger_emergence: string | null;
          type: Database["public"]["Enums"]["role_type_t"];
          usage_label: string;
        };
        Insert: {
          capacite_full_text: string;
          carte_app: string;
          compensateur_de?: string | null;
          created_at?: string;
          description?: string | null;
          difficulte: string;
          draw_weight?: number;
          emergent?: boolean;
          faction: Database["public"]["Enums"]["faction_t"];
          frequency_label?: string | null;
          icon: string;
          image_url?: string | null;
          instruction_verb?: string;
          is_disabled?: boolean;
          is_special?: boolean;
          min_players?: number;
          name_fr: string;
          phase_activation: string;
          police_verdict?: Database["public"]["Enums"]["police_verdict_t"];
          presence: Database["public"]["Enums"]["presence_t"];
          secondary_type?: Database["public"]["Enums"]["role_type_t"] | null;
          set_id?: string;
          slug: string;
          target_mode?: string;
          trigger_emergence?: string | null;
          type: Database["public"]["Enums"]["role_type_t"];
          usage_label?: string;
        };
        Update: {
          capacite_full_text?: string;
          carte_app?: string;
          compensateur_de?: string | null;
          created_at?: string;
          description?: string | null;
          difficulte?: string;
          draw_weight?: number;
          emergent?: boolean;
          faction?: Database["public"]["Enums"]["faction_t"];
          frequency_label?: string | null;
          icon?: string;
          image_url?: string | null;
          instruction_verb?: string;
          is_disabled?: boolean;
          is_special?: boolean;
          min_players?: number;
          name_fr?: string;
          phase_activation?: string;
          police_verdict?: Database["public"]["Enums"]["police_verdict_t"];
          presence?: Database["public"]["Enums"]["presence_t"];
          secondary_type?: Database["public"]["Enums"]["role_type_t"] | null;
          set_id?: string;
          slug?: string;
          target_mode?: string;
          trigger_emergence?: string | null;
          type?: Database["public"]["Enums"]["role_type_t"];
          usage_label?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          created_at: string;
          game_id: string;
          id: string;
          target_player_id: string;
          tour: number;
          voter_player_id: string;
        };
        Insert: {
          created_at?: string;
          game_id: string;
          id?: string;
          target_player_id: string;
          tour: number;
          voter_player_id: string;
        };
        Update: {
          created_at?: string;
          game_id?: string;
          id?: string;
          target_player_id?: string;
          tour?: number;
          voter_player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_target_player_id_fkey";
            columns: ["target_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_target_player_id_fkey";
            columns: ["target_player_id"];
            isOneToOne: false;
            referencedRelation: "players_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_voter_player_id_fkey";
            columns: ["voter_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_voter_player_id_fkey";
            columns: ["voter_player_id"];
            isOneToOne: false;
            referencedRelation: "players_public";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      games_public: {
        Row: {
          banned_roles: string[] | null;
          code: string | null;
          created_at: string | null;
          current_phase: Database["public"]["Enums"]["phase_t"] | null;
          current_tour: number | null;
          ended_at: string | null;
          forced_frame: string | null;
          id: string | null;
          mode_detective_player: boolean | null;
          paused: boolean | null;
          phase_duration_free_s: number | null;
          phase_duration_gathering_s: number | null;
          phase_duration_s: number | null;
          phase_duration_vote_s: number | null;
          phase_started_at: string | null;
          pool_config: Json | null;
          set_id: string | null;
          started_at: string | null;
          status: string | null;
          variant: string | null;
        };
        Insert: {
          banned_roles?: string[] | null;
          code?: string | null;
          created_at?: string | null;
          current_phase?: Database["public"]["Enums"]["phase_t"] | null;
          current_tour?: number | null;
          ended_at?: string | null;
          forced_frame?: string | null;
          id?: string | null;
          mode_detective_player?: boolean | null;
          paused?: boolean | null;
          phase_duration_free_s?: number | null;
          phase_duration_gathering_s?: number | null;
          phase_duration_s?: number | null;
          phase_duration_vote_s?: number | null;
          phase_started_at?: string | null;
          pool_config?: Json | null;
          set_id?: string | null;
          started_at?: string | null;
          status?: string | null;
          variant?: string | null;
        };
        Update: {
          banned_roles?: string[] | null;
          code?: string | null;
          created_at?: string | null;
          current_phase?: Database["public"]["Enums"]["phase_t"] | null;
          current_tour?: number | null;
          ended_at?: string | null;
          forced_frame?: string | null;
          id?: string | null;
          mode_detective_player?: boolean | null;
          paused?: boolean | null;
          phase_duration_free_s?: number | null;
          phase_duration_gathering_s?: number | null;
          phase_duration_s?: number | null;
          phase_duration_vote_s?: number | null;
          phase_started_at?: string | null;
          pool_config?: Json | null;
          set_id?: string | null;
          started_at?: string | null;
          status?: string | null;
          variant?: string | null;
        };
        Relationships: [];
      };
      players_public: {
        Row: {
          game_id: string | null;
          id: string | null;
          is_alive: boolean | null;
          is_imprisoned: boolean | null;
          is_mj: boolean | null;
          joined_at: string | null;
          pseudo: string | null;
          session_id: string | null;
          user_id: string | null;
        };
        Insert: {
          game_id?: string | null;
          id?: string | null;
          is_alive?: boolean | null;
          is_imprisoned?: boolean | null;
          is_mj?: boolean | null;
          joined_at?: string | null;
          pseudo?: string | null;
          session_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          game_id?: string | null;
          id?: string | null;
          is_alive?: boolean | null;
          is_imprisoned?: boolean | null;
          is_mj?: boolean | null;
          joined_at?: string | null;
          pseudo?: string | null;
          session_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "players_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games_public";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      can_access_chat_channel: {
        Args: { _channel: string; _game: string };
        Returns: boolean;
      };
      is_game_mj: { Args: { _game: string }; Returns: boolean };
      is_player_in_game: { Args: { _game: string }; Returns: boolean };
      my_player_id: { Args: { _game: string }; Returns: string };
      server_now_ms: { Args: never; Returns: number };
    };
    Enums: {
      action_category_t:
        | "ATTACK"
        | "PROTECT"
        | "CURE"
        | "INVESTIGATE"
        | "BLOCK"
        | "FALSIFY"
        | "CASCADE"
        | "TRANSFER"
        | "CONVERT"
        | "META";
      action_timing_t: "INSTANT" | "ANTICIPATED" | "DEFERRED";
      faction_t: "Civil" | "Méchant" | "Neutre";
      phase_t: "lobby" | "free" | "annonce" | "gathering" | "vote" | "ended";
      police_verdict_t: "innocent" | "suspicious" | "na";
      presence_t: "MUST" | "MUST_CONDITIONAL" | "OPTIONAL" | "EMERGENT";
      role_type_t:
        | "PROTECTEUR"
        | "TUEUR"
        | "INVESTIGATION"
        | "SUPPORT"
        | "TROMPERIE"
        | "BOULET"
        | "MAL"
        | "CHAOS"
        | "BÉNIN";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      action_category_t: [
        "ATTACK",
        "PROTECT",
        "CURE",
        "INVESTIGATE",
        "BLOCK",
        "FALSIFY",
        "CASCADE",
        "TRANSFER",
        "CONVERT",
        "META",
      ],
      action_timing_t: ["INSTANT", "ANTICIPATED", "DEFERRED"],
      faction_t: ["Civil", "Méchant", "Neutre"],
      phase_t: ["lobby", "free", "annonce", "gathering", "vote", "ended"],
      police_verdict_t: ["innocent", "suspicious", "na"],
      presence_t: ["MUST", "MUST_CONDITIONAL", "OPTIONAL", "EMERGENT"],
      role_type_t: [
        "PROTECTEUR",
        "TUEUR",
        "INVESTIGATION",
        "SUPPORT",
        "TROMPERIE",
        "BOULET",
        "MAL",
        "CHAOS",
        "BÉNIN",
      ],
    },
  },
} as const;
