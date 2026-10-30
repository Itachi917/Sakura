// ============================================================
// SAKURA PLATFORM — DATABASE TYPE DEFINITIONS
// Auto-generated from schema — do not edit table types manually
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types matching PostgreSQL enums
export type UserRole = 'super_admin' | 'club_admin' | 'event_host' | 'participant'
export type EventStatus = 'draft' | 'published' | 'active' | 'completed' | 'cancelled'
export type SessionStatus =
  | 'lobby'
  | 'ready'
  | 'question_active'
  | 'answer_collection_ended'
  | 'answer_reveal'
  | 'round_results'
  | 'final_results'
  | 'paused'
  | 'completed'
  | 'cancelled'
export type ActivityType =
  | 'whos_that_character'
  | 'spacetoon_nostalgia'
  | 'anime_expert_exam'
  | 'sakura_feud'
  | 'draw_it_guess_it'
  | 'zoom_guess'
export type QuizStatus = 'draft' | 'published' | 'archived'
export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'image_question'
  | 'text_clue'
  | 'ordered_sequence'
  | 'multi_clue'
  | 'audio_question'
export type StampUnlockType =
  | 'event_attendance'
  | 'activity_completion'
  | 'activity_win'
  | 'score_threshold'
  | 'participation_count'
  | 'manual'
export type TitleUnlockType = 'stamp_count' | 'event_count' | 'activity_win' | 'manual'
export type FeudRoundStatus = 'face_off' | 'main_round' | 'steal_opportunity' | 'completed'
export type ParticipantStatus = 'active' | 'disconnected' | 'removed'
export type CheckInMethod = 'qr_scan' | 'manual' | 'pin_entry'
export type LanguagePreference = 'en' | 'ar'
export type StampRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nickname: string
          avatar_url: string | null
          preferred_language: LanguagePreference
          is_guest: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nickname: string
          avatar_url?: string | null
          preferred_language?: LanguagePreference
          is_guest?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nickname?: string
          avatar_url?: string | null
          preferred_language?: LanguagePreference
          is_guest?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: UserRole
          granted_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: UserRole
          granted_by?: string | null
          created_at?: string
        }
        Update: {
          role?: UserRole
          granted_by?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          title: string
          title_ar: string | null
          description: string | null
          description_ar: string | null
          venue: string | null
          starts_at: string | null
          ends_at: string | null
          status: EventStatus
          banner_url: string | null
          check_in_open: boolean
          check_in_code: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          title_ar?: string | null
          description?: string | null
          description_ar?: string | null
          venue?: string | null
          starts_at?: string | null
          ends_at?: string | null
          status?: EventStatus
          banner_url?: string | null
          check_in_open?: boolean
          check_in_code?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          title_ar?: string | null
          description?: string | null
          description_ar?: string | null
          venue?: string | null
          starts_at?: string | null
          ends_at?: string | null
          status?: EventStatus
          banner_url?: string | null
          check_in_open?: boolean
          check_in_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      event_attendance: {
        Row: {
          id: string
          event_id: string
          participant_id: string
          checked_in_at: string
          check_in_method: CheckInMethod
          checked_in_by: string | null
        }
        Insert: {
          id?: string
          event_id: string
          participant_id: string
          checked_in_at?: string
          check_in_method?: CheckInMethod
          checked_in_by?: string | null
        }
        Update: {
          check_in_method?: CheckInMethod
          checked_in_by?: string | null
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          id: string
          title: string
          title_ar: string | null
          description: string | null
          description_ar: string | null
          activity_type: ActivityType
          language: LanguagePreference
          difficulty: 'easy' | 'medium' | 'hard' | 'mixed' | null
          status: QuizStatus
          settings: Json
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          title_ar?: string | null
          description?: string | null
          description_ar?: string | null
          activity_type: ActivityType
          language?: LanguagePreference
          difficulty?: 'easy' | 'medium' | 'hard' | 'mixed' | null
          status?: QuizStatus
          settings?: Json
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          title_ar?: string | null
          description?: string | null
          description_ar?: string | null
          activity_type?: ActivityType
          language?: LanguagePreference
          difficulty?: 'easy' | 'medium' | 'hard' | 'mixed' | null
          status?: QuizStatus
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          id: string
          quiz_id: string
          question_type: QuestionType
          question_text: string
          question_text_ar: string | null
          media_url: string | null
          audio_url: string | null
          time_limit_seconds: number
          base_points: number
          speed_bonus_enabled: boolean
          explanation: string | null
          explanation_ar: string | null
          sort_order: number
          settings: Json
          created_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          question_type?: QuestionType
          question_text: string
          question_text_ar?: string | null
          media_url?: string | null
          audio_url?: string | null
          time_limit_seconds?: number
          base_points?: number
          speed_bonus_enabled?: boolean
          explanation?: string | null
          explanation_ar?: string | null
          sort_order?: number
          settings?: Json
          created_at?: string
        }
        Update: {
          question_type?: QuestionType
          question_text?: string
          question_text_ar?: string | null
          media_url?: string | null
          audio_url?: string | null
          time_limit_seconds?: number
          base_points?: number
          speed_bonus_enabled?: boolean
          explanation?: string | null
          explanation_ar?: string | null
          sort_order?: number
          settings?: Json
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          id: string
          question_id: string
          answer_text: string
          answer_text_ar: string | null
          sort_order: number
          is_correct: boolean
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          answer_text: string
          answer_text_ar?: string | null
          sort_order?: number
          is_correct?: boolean
          created_at?: string
        }
        Update: {
          answer_text?: string
          answer_text_ar?: string | null
          sort_order?: number
          is_correct?: boolean
        }
        Relationships: []
      }
      feud_questions: {
        Row: {
          id: string
          quiz_id: string
          question_text: string
          question_text_ar: string | null
          survey_source: string | null
          is_genuine_survey: boolean
          strikes_allowed: number
          round_multiplier: number
          settings: Json
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          question_text: string
          question_text_ar?: string | null
          survey_source?: string | null
          is_genuine_survey?: boolean
          strikes_allowed?: number
          round_multiplier?: number
          settings?: Json
          sort_order?: number
          created_at?: string
        }
        Update: {
          question_text?: string
          question_text_ar?: string | null
          survey_source?: string | null
          is_genuine_survey?: boolean
          strikes_allowed?: number
          round_multiplier?: number
          settings?: Json
          sort_order?: number
        }
        Relationships: []
      }
      feud_answers: {
        Row: {
          id: string
          feud_question_id: string
          answer_text: string
          answer_text_ar: string | null
          points: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          feud_question_id: string
          answer_text: string
          answer_text_ar?: string | null
          points?: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          answer_text?: string
          answer_text_ar?: string | null
          points?: number
          sort_order?: number
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          id: string
          event_id: string | null
          quiz_id: string | null
          activity_type: ActivityType
          room_pin: string
          host_id: string
          status: SessionStatus
          settings: Json
          current_question_id: string | null
          question_deadline: string | null
          max_participants: number
          started_at: string | null
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id?: string | null
          quiz_id?: string | null
          activity_type: ActivityType
          room_pin: string
          host_id: string
          status?: SessionStatus
          settings?: Json
          current_question_id?: string | null
          question_deadline?: string | null
          max_participants?: number
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          event_id?: string | null
          quiz_id?: string | null
          activity_type?: ActivityType
          room_pin?: string
          status?: SessionStatus
          settings?: Json
          current_question_id?: string | null
          question_deadline?: string | null
          max_participants?: number
          started_at?: string | null
          ended_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          session_id: string
          name: string
          color: string
          score: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          name: string
          color?: string
          score?: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          name?: string
          color?: string
          score?: number
          sort_order?: number
        }
        Relationships: []
      }
      session_participants: {
        Row: {
          id: string
          session_id: string
          participant_id: string | null
          guest_token: string | null
          nickname: string
          team_id: string | null
          score: number
          streak: number
          answers_correct: number
          answers_total: number
          status: ParticipantStatus
          joined_at: string
          last_seen_at: string
        }
        Insert: {
          id?: string
          session_id: string
          participant_id?: string | null
          guest_token?: string | null
          nickname: string
          team_id?: string | null
          score?: number
          streak?: number
          answers_correct?: number
          answers_total?: number
          status?: ParticipantStatus
          joined_at?: string
          last_seen_at?: string
        }
        Update: {
          guest_token?: string | null
          nickname?: string
          team_id?: string | null
          score?: number
          streak?: number
          answers_correct?: number
          answers_total?: number
          status?: ParticipantStatus
          last_seen_at?: string
        }
        Relationships: []
      }
      participant_answers: {
        Row: {
          id: string
          session_id: string
          question_id: string
          participant_id: string
          answer_payload: Json
          is_correct: boolean | null
          points_awarded: number
          response_time_ms: number | null
          submitted_at: string
        }
        Insert: {
          id?: string
          session_id: string
          question_id: string
          participant_id: string
          answer_payload: Json
          is_correct?: boolean | null
          points_awarded?: number
          response_time_ms?: number | null
          submitted_at?: string
        }
        Update: {
          is_correct?: boolean | null
          points_awarded?: number
        }
        Relationships: []
      }
      feud_round_state: {
        Row: {
          id: string
          session_id: string
          feud_question_id: string
          round_number: number
          active_team_id: string | null
          round_status: FeudRoundStatus
          strikes: number
          revealed_answers: string[]
          round_points: number
          multiplier: number
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          feud_question_id: string
          round_number?: number
          active_team_id?: string | null
          round_status?: FeudRoundStatus
          strikes?: number
          revealed_answers?: string[]
          round_points?: number
          multiplier?: number
          updated_at?: string
        }
        Update: {
          active_team_id?: string | null
          round_status?: FeudRoundStatus
          strikes?: number
          revealed_answers?: string[]
          round_points?: number
          multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      drawing_rounds: {
        Row: {
          id: string
          session_id: string
          drawer_id: string
          prompt: string
          prompt_ar: string | null
          status: 'active' | 'completed' | 'skipped'
          deadline: string | null
          round_number: number
          settings: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          drawer_id: string
          prompt: string
          prompt_ar?: string | null
          status?: 'active' | 'completed' | 'skipped'
          deadline?: string | null
          round_number?: number
          settings?: Json
          created_at?: string
        }
        Update: {
          status?: 'active' | 'completed' | 'skipped'
          deadline?: string | null
          settings?: Json
        }
        Relationships: []
      }
      drawing_guesses: {
        Row: {
          id: string
          round_id: string
          participant_id: string
          guess_text: string
          is_correct: boolean
          points_awarded: number
          submitted_at: string
        }
        Insert: {
          id?: string
          round_id: string
          participant_id: string
          guess_text: string
          is_correct?: boolean
          points_awarded?: number
          submitted_at?: string
        }
        Update: {
          is_correct?: boolean
          points_awarded?: number
        }
        Relationships: []
      }
      passport_stamps: {
        Row: {
          id: string
          name: string
          name_ar: string | null
          description: string | null
          description_ar: string | null
          icon_url: string | null
          rarity: StampRarity | null
          unlock_type: StampUnlockType
          unlock_config: Json
          event_id: string | null
          is_active: boolean
          sort_order: number
          release_from: string | null
          release_to: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_ar?: string | null
          description?: string | null
          description_ar?: string | null
          icon_url?: string | null
          rarity?: StampRarity | null
          unlock_type?: StampUnlockType
          unlock_config?: Json
          event_id?: string | null
          is_active?: boolean
          sort_order?: number
          release_from?: string | null
          release_to?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          name_ar?: string | null
          description?: string | null
          description_ar?: string | null
          icon_url?: string | null
          rarity?: StampRarity | null
          unlock_type?: StampUnlockType
          unlock_config?: Json
          event_id?: string | null
          is_active?: boolean
          sort_order?: number
          release_from?: string | null
          release_to?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      participant_stamps: {
        Row: {
          id: string
          participant_id: string
          stamp_id: string
          awarded_at: string
          awarded_by: string | null
          source_event_id: string | null
          source_session_id: string | null
          award_reason: string | null
        }
        Insert: {
          id?: string
          participant_id: string
          stamp_id: string
          awarded_at?: string
          awarded_by?: string | null
          source_event_id?: string | null
          source_session_id?: string | null
          award_reason?: string | null
        }
        Update: never
        Relationships: []
      }
      passport_titles: {
        Row: {
          id: string
          name: string
          name_ar: string | null
          description: string | null
          description_ar: string | null
          icon_url: string | null
          unlock_type: TitleUnlockType
          unlock_config: Json
          is_active: boolean
          sort_order: number
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          name_ar?: string | null
          description?: string | null
          description_ar?: string | null
          icon_url?: string | null
          unlock_type?: TitleUnlockType
          unlock_config?: Json
          is_active?: boolean
          sort_order?: number
          created_by: string
          created_at?: string
        }
        Update: {
          name?: string
          name_ar?: string | null
          description?: string | null
          description_ar?: string | null
          icon_url?: string | null
          unlock_type?: TitleUnlockType
          unlock_config?: Json
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      participant_titles: {
        Row: {
          id: string
          participant_id: string
          title_id: string
          unlocked_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          title_id: string
          unlocked_at?: string
        }
        Update: never
        Relationships: []
      }
      participant_profile_settings: {
        Row: {
          participant_id: string
          equipped_title_id: string | null
          updated_at: string
        }
        Insert: {
          participant_id: string
          equipped_title_id?: string | null
          updated_at?: string
        }
        Update: {
          equipped_title_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_type: string
          target_id: string | null
          reason: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_type: string
          target_id?: string | null
          reason?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: {
      quiz_answers_public: {
        Row: {
          id: string
          question_id: string
          answer_text: string
          answer_text_ar: string | null
          sort_order: number
        }
        Relationships: []
      }
    }
    Functions: {
      generate_room_pin: {
        Args: Record<string, never>
        Returns: string
      }
      submit_answer: {
        Args: {
          p_session_id: string
          p_question_id: string
          p_participant_id: string
          p_answer_payload: Json
        }
        Returns: Json
      }
      award_stamp: {
        Args: {
          p_participant_id: string
          p_stamp_id: string
          p_awarded_by: string
          p_source_event_id?: string
          p_source_session_id?: string
          p_reason?: string
        }
        Returns: Json
      }
      check_stamp_eligibility: {
        Args: {
          p_participant_id: string
          p_event_id?: string
          p_session_id?: string
        }
        Returns: string[]
      }
      get_my_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_host_or_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      event_status: EventStatus
      session_status: SessionStatus
      activity_type: ActivityType
      quiz_status: QuizStatus
      question_type: QuestionType
      stamp_unlock_type: StampUnlockType
      title_unlock_type: TitleUnlockType
      feud_round_status: FeudRoundStatus
      participant_status: ParticipantStatus
      check_in_method: CheckInMethod
      language_preference: LanguagePreference
    }
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserRoleRow = Database['public']['Tables']['user_roles']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type EventAttendance = Database['public']['Tables']['event_attendance']['Row']
export type Quiz = Database['public']['Tables']['quizzes']['Row']
export type QuizQuestion = Database['public']['Tables']['quiz_questions']['Row']
export type QuizAnswer = Database['public']['Tables']['quiz_answers']['Row']
export type FeudQuestion = Database['public']['Tables']['feud_questions']['Row']
export type FeudAnswer = Database['public']['Tables']['feud_answers']['Row']
export type GameSession = Database['public']['Tables']['game_sessions']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type SessionParticipant = Database['public']['Tables']['session_participants']['Row']
export type ParticipantAnswer = Database['public']['Tables']['participant_answers']['Row']
export type FeudRoundState = Database['public']['Tables']['feud_round_state']['Row']
export type DrawingRound = Database['public']['Tables']['drawing_rounds']['Row']
export type DrawingGuess = Database['public']['Tables']['drawing_guesses']['Row']
export type PassportStamp = Database['public']['Tables']['passport_stamps']['Row']
export type ParticipantStamp = Database['public']['Tables']['participant_stamps']['Row']
export type PassportTitle = Database['public']['Tables']['passport_titles']['Row']
export type ParticipantTitle = Database['public']['Tables']['participant_titles']['Row']
export type ParticipantProfileSettings = Database['public']['Tables']['participant_profile_settings']['Row']
export type AdminAuditLog = Database['public']['Tables']['admin_audit_log']['Row']
export type QuizAnswerPublic = Database['public']['Views']['quiz_answers_public']['Row']
