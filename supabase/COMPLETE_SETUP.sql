-- ============================================================
-- SAKURA PLATFORM — COMPLETE ONE-CLICK DATABASE SETUP
-- ============================================================
-- Paste this entire file into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oajakkpnttxccsnbdeks/sql/new
-- and click RUN.
--
-- This script sets up:
-- 1. All Enums & Database Tables
-- 2. Performance & Realtime Subscriptions
-- 3. Automatic Profile & Admin Creation Triggers
-- 4. Complete Row-Level Security (RLS) Policies
-- 5. Full Curated Seed Data (Events, Stamps, Titles, Quizzes, Feud)
-- 6. Pre-confirmed Admin Account:
--    Email:    admin@sakura.club
--    Password: SakuraAdmin2026!
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. ENUMS (Safe idempotency)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'club_admin', 'event_host', 'participant');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('draft', 'published', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM (
    'lobby', 'ready', 'question_active', 'answer_collection_ended',
    'answer_reveal', 'round_results', 'final_results', 'paused',
    'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'whos_that_character', 'spacetoon_nostalgia', 'anime_expert_exam',
    'sakura_feud', 'draw_it_guess_it'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE quiz_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM (
    'multiple_choice', 'true_false', 'image_question', 'text_clue',
    'ordered_sequence', 'multi_clue', 'audio_question'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE stamp_unlock_type AS ENUM (
    'event_attendance', 'activity_completion', 'activity_win',
    'score_threshold', 'participation_count', 'manual'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE title_unlock_type AS ENUM (
    'stamp_count', 'event_count', 'activity_win', 'manual'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE feud_round_status AS ENUM (
    'face_off', 'main_round', 'steal_opportunity', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE participant_status AS ENUM ('active', 'disconnected', 'removed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE check_in_method AS ENUM ('qr_scan', 'manual', 'pin_entry');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE language_preference AS ENUM ('en', 'ar');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 2. TABLES (gen_random_uuid used for maximum Supabase compatibility)
-- ============================================================

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname        TEXT NOT NULL,
  avatar_url      TEXT,
  preferred_language language_preference NOT NULL DEFAULT 'en',
  is_guest        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_lower_idx ON public.profiles (lower(nickname));

-- USER ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'participant',
  granted_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS user_roles_user_idx ON public.user_roles(user_id);

-- EVENTS
CREATE TABLE IF NOT EXISTS public.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  title_ar        TEXT,
  description     TEXT,
  description_ar  TEXT,
  venue           TEXT,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  status          event_status NOT NULL DEFAULT 'draft',
  banner_url      TEXT,
  check_in_open   BOOLEAN NOT NULL DEFAULT FALSE,
  check_in_code   TEXT UNIQUE,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_status_idx ON public.events(status);
CREATE INDEX IF NOT EXISTS events_starts_at_idx ON public.events(starts_at);

-- EVENT ATTENDANCE
CREATE TABLE IF NOT EXISTS public.event_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  participant_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_in_method check_in_method NOT NULL DEFAULT 'manual',
  checked_in_by   UUID REFERENCES public.profiles(id),
  UNIQUE(event_id, participant_id)
);

CREATE INDEX IF NOT EXISTS event_attendance_event_idx ON public.event_attendance(event_id);
CREATE INDEX IF NOT EXISTS event_attendance_participant_idx ON public.event_attendance(participant_id);

-- QUIZZES
CREATE TABLE IF NOT EXISTS public.quizzes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  title_ar        TEXT,
  description     TEXT,
  description_ar  TEXT,
  activity_type   activity_type NOT NULL,
  language        language_preference NOT NULL DEFAULT 'en',
  difficulty      TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')),
  status          quiz_status NOT NULL DEFAULT 'draft',
  settings        JSONB NOT NULL DEFAULT '{}',
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quizzes_activity_idx ON public.quizzes(activity_type);
CREATE INDEX IF NOT EXISTS quizzes_status_idx ON public.quizzes(status);

-- QUIZ QUESTIONS
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id             UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_type       question_type NOT NULL DEFAULT 'multiple_choice',
  question_text       TEXT NOT NULL,
  question_text_ar    TEXT,
  media_url           TEXT,
  audio_url           TEXT,
  time_limit_seconds  INTEGER NOT NULL DEFAULT 30 CHECK (time_limit_seconds BETWEEN 5 AND 300),
  base_points         INTEGER NOT NULL DEFAULT 100 CHECK (base_points >= 0),
  speed_bonus_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  explanation         TEXT,
  explanation_ar      TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  settings            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quiz_questions_quiz_idx ON public.quiz_questions(quiz_id, sort_order);

-- QUIZ ANSWERS
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  answer_text     TEXT NOT NULL,
  answer_text_ar  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quiz_answers_question_idx ON public.quiz_answers(question_id, sort_order);

-- FEUD QUESTIONS
CREATE TABLE IF NOT EXISTS public.feud_questions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id             UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text       TEXT NOT NULL,
  question_text_ar    TEXT,
  survey_source       TEXT,
  is_genuine_survey   BOOLEAN NOT NULL DEFAULT FALSE,
  strikes_allowed     INTEGER NOT NULL DEFAULT 3 CHECK (strikes_allowed BETWEEN 1 AND 5),
  round_multiplier    INTEGER NOT NULL DEFAULT 1,
  settings            JSONB NOT NULL DEFAULT '{}',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feud_questions_quiz_idx ON public.feud_questions(quiz_id, sort_order);

-- FEUD ANSWERS
CREATE TABLE IF NOT EXISTS public.feud_answers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feud_question_id  UUID NOT NULL REFERENCES public.feud_questions(id) ON DELETE CASCADE,
  answer_text       TEXT NOT NULL,
  answer_text_ar    TEXT,
  points            INTEGER NOT NULL DEFAULT 10 CHECK (points > 0),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feud_answers_question_idx ON public.feud_answers(feud_question_id, sort_order);

-- GAME SESSIONS
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID REFERENCES public.events(id),
  quiz_id               UUID REFERENCES public.quizzes(id),
  activity_type         activity_type NOT NULL,
  room_pin              TEXT NOT NULL CHECK (room_pin ~ '^\d{6}$'),
  host_id               UUID REFERENCES public.profiles(id),
  status                session_status NOT NULL DEFAULT 'lobby',
  settings              JSONB NOT NULL DEFAULT '{}',
  current_question_id   UUID REFERENCES public.quiz_questions(id),
  question_deadline     TIMESTAMPTZ,
  max_participants      INTEGER NOT NULL DEFAULT 100,
  started_at            TIMESTAMPTZ,
  ended_at              TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_sessions_host_idx ON public.game_sessions(host_id);
CREATE INDEX IF NOT EXISTS game_sessions_status_idx ON public.game_sessions(status);
CREATE INDEX IF NOT EXISTS game_sessions_room_pin_idx ON public.game_sessions(room_pin);

-- TEAMS
CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#F4A7C5',
  score       INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS teams_session_idx ON public.teams(session_id);

-- SESSION PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.session_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  participant_id  UUID REFERENCES public.profiles(id),
  guest_token     TEXT,
  nickname        TEXT NOT NULL,
  team_id         UUID REFERENCES public.teams(id),
  score           INTEGER NOT NULL DEFAULT 0,
  streak          INTEGER NOT NULL DEFAULT 0,
  answers_correct INTEGER NOT NULL DEFAULT 0,
  answers_total   INTEGER NOT NULL DEFAULT 0,
  status          participant_status NOT NULL DEFAULT 'active',
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sp_session_idx ON public.session_participants(session_id);
CREATE INDEX IF NOT EXISTS sp_participant_idx ON public.session_participants(participant_id);

-- PARTICIPANT ANSWERS
CREATE TABLE IF NOT EXISTS public.participant_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES public.quiz_questions(id),
  participant_id  UUID NOT NULL REFERENCES public.session_participants(id) ON DELETE CASCADE,
  answer_payload  JSONB NOT NULL,
  is_correct      BOOLEAN,
  points_awarded  INTEGER NOT NULL DEFAULT 0,
  response_time_ms INTEGER,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(question_id, participant_id)
);

CREATE INDEX IF NOT EXISTS pa_session_idx ON public.participant_answers(session_id);
CREATE INDEX IF NOT EXISTS pa_question_idx ON public.participant_answers(question_id);

-- FEUD ROUND STATE
CREATE TABLE IF NOT EXISTS public.feud_round_state (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  feud_question_id  UUID NOT NULL REFERENCES public.feud_questions(id),
  round_number      INTEGER NOT NULL DEFAULT 1,
  active_team_id    UUID REFERENCES public.teams(id),
  round_status      feud_round_status NOT NULL DEFAULT 'face_off',
  strikes           INTEGER NOT NULL DEFAULT 0,
  revealed_answers  UUID[] NOT NULL DEFAULT '{}',
  round_points      INTEGER NOT NULL DEFAULT 0,
  multiplier        INTEGER NOT NULL DEFAULT 1,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DRAWING ROUNDS
CREATE TABLE IF NOT EXISTS public.drawing_rounds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  drawer_id     UUID NOT NULL REFERENCES public.session_participants(id),
  prompt        TEXT NOT NULL,
  prompt_ar     TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'skipped')),
  deadline      TIMESTAMPTZ,
  round_number  INTEGER NOT NULL DEFAULT 1,
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DRAWING GUESSES
CREATE TABLE IF NOT EXISTS public.drawing_guesses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id      UUID NOT NULL REFERENCES public.drawing_rounds(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.session_participants(id),
  guess_text    TEXT NOT NULL,
  is_correct    BOOLEAN NOT NULL DEFAULT FALSE,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PASSPORT STAMPS
CREATE TABLE IF NOT EXISTS public.passport_stamps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  description     TEXT,
  description_ar  TEXT,
  icon_url        TEXT,
  rarity          TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),
  unlock_type     stamp_unlock_type NOT NULL DEFAULT 'manual',
  unlock_config   JSONB NOT NULL DEFAULT '{}',
  event_id        UUID REFERENCES public.events(id),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  release_from    TIMESTAMPTZ,
  release_to      TIMESTAMPTZ,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PARTICIPANT STAMPS
CREATE TABLE IF NOT EXISTS public.participant_stamps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stamp_id          UUID NOT NULL REFERENCES public.passport_stamps(id),
  awarded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  awarded_by        UUID REFERENCES public.profiles(id),
  source_event_id   UUID REFERENCES public.events(id),
  source_session_id UUID REFERENCES public.game_sessions(id),
  award_reason      TEXT,
  UNIQUE(participant_id, stamp_id)
);

CREATE INDEX IF NOT EXISTS ps_participant_idx ON public.participant_stamps(participant_id);

-- PASSPORT TITLES
CREATE TABLE IF NOT EXISTS public.passport_titles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  description     TEXT,
  description_ar  TEXT,
  icon_url        TEXT,
  unlock_type     title_unlock_type NOT NULL DEFAULT 'manual',
  unlock_config   JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PARTICIPANT TITLES
CREATE TABLE IF NOT EXISTS public.participant_titles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title_id        UUID NOT NULL REFERENCES public.passport_titles(id),
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id, title_id)
);

-- PARTICIPANT PROFILE SETTINGS
CREATE TABLE IF NOT EXISTS public.participant_profile_settings (
  participant_id    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  equipped_title_id UUID REFERENCES public.passport_titles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ADMIN AUDIT LOG
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES public.profiles(id),
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT,
  reason      TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. FUNCTIONS & AUTH TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'club_admin' THEN 2
    WHEN 'event_host' THEN 3
    WHEN 'participant' THEN 4
  END
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'club_admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_host_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'club_admin', 'event_host')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Trigger: Automatically create Profile and User Role on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
  v_nickname TEXT;
  v_lang public.language_preference;
BEGIN
  -- Extract nickname safely
  v_nickname := COALESCE(
    NEW.raw_user_meta_data->>'nickname',
    split_part(NEW.email, '@', 1)
  );

  -- Ensure nickname is unique (avoid unique index collision)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(nickname) = lower(v_nickname) AND id <> NEW.id) THEN
    v_nickname := substring(v_nickname, 1, 25) || '_' || substring(NEW.id::text, 1, 5);
  END IF;

  -- Determine language
  BEGIN
    v_lang := (NEW.raw_user_meta_data->>'preferred_language')::public.language_preference;
  EXCEPTION WHEN OTHERS THEN
    v_lang := 'en'::public.language_preference;
  END;

  -- Create profile
  INSERT INTO public.profiles (id, nickname, preferred_language, is_guest)
  VALUES (NEW.id, v_nickname, v_lang, FALSE)
  ON CONFLICT (id) DO UPDATE
  SET nickname = EXCLUDED.nickname, updated_at = NOW();

  -- Auto-grant super_admin if email contains admin or role is super_admin
  IF NEW.email ILIKE '%admin%' OR NEW.raw_user_meta_data->>'role' = 'super_admin' THEN
    v_role := 'super_admin'::public.user_role;
  ELSE
    v_role := 'participant'::public.user_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Initialize participant profile settings
  INSERT INTO public.participant_profile_settings (participant_id)
  VALUES (NEW.id)
  ON CONFLICT (participant_id) DO NOTHING;

  -- Award starter stamp "First Bloom"
  INSERT INTO public.participant_stamps (participant_id, stamp_id, award_reason)
  SELECT NEW.id, id, 'Welcome to Sakura Club!'
  FROM public.passport_stamps
  WHERE slug = 'stamp-first-bloom'
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Unique PIN Generator
CREATE OR REPLACE FUNCTION public.generate_room_pin()
RETURNS TEXT AS $$
DECLARE
  pin TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    pin := lpad(floor(random() * 900000 + 100000)::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.game_sessions
      WHERE room_pin = pin
        AND status NOT IN ('completed', 'cancelled')
    );
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique PIN after 100 attempts';
    END IF;
  END LOOP;
  RETURN pin;
END;
$$ LANGUAGE plpgsql;

-- Stamp eligibility checker
CREATE OR REPLACE FUNCTION public.check_stamp_eligibility(
  p_participant_id UUID,
  p_event_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
)
RETURNS SETOF UUID AS $$
DECLARE
  v_stamp public.passport_stamps%ROWTYPE;
  v_already_has BOOLEAN;
BEGIN
  FOR v_stamp IN SELECT * FROM public.passport_stamps WHERE is_active = TRUE LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.participant_stamps
      WHERE participant_id = p_participant_id AND stamp_id = v_stamp.id
    ) INTO v_already_has;
    CONTINUE WHEN v_already_has;

    IF v_stamp.slug = 'stamp-first-bloom' THEN
      INSERT INTO public.participant_stamps (participant_id, stamp_id, source_event_id, source_session_id, award_reason)
      VALUES (p_participant_id, v_stamp.id, p_event_id, p_session_id, 'auto_award')
      ON CONFLICT DO NOTHING;
      RETURN NEXT v_stamp.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. ENABLE REALTIME BROADCASTING
-- ============================================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.participant_answers;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.feud_round_state;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.drawing_rounds;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.drawing_guesses;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.participant_stamps;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feud_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feud_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feud_round_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_guesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_profile_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- PROFILES
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_all" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid() OR is_admin());

-- USER ROLES
CREATE POLICY "user_roles_select_all" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "user_roles_manage_admin" ON public.user_roles FOR ALL USING (is_admin());

-- EVENTS
CREATE POLICY "events_select_all" ON public.events FOR SELECT USING (true);
CREATE POLICY "events_insert_admin" ON public.events FOR INSERT WITH CHECK (is_host_or_admin() OR auth.role() = 'authenticated');
CREATE POLICY "events_update_admin" ON public.events FOR UPDATE USING (is_host_or_admin() OR created_by = auth.uid());
CREATE POLICY "events_delete_admin" ON public.events FOR DELETE USING (is_admin());

-- EVENT ATTENDANCE
CREATE POLICY "attendance_select_all" ON public.event_attendance FOR SELECT USING (true);
CREATE POLICY "attendance_insert_own" ON public.event_attendance FOR INSERT WITH CHECK (participant_id = auth.uid() OR is_host_or_admin());

-- QUIZZES & QUESTIONS
CREATE POLICY "quizzes_select_all" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "quizzes_manage_admin" ON public.quizzes FOR ALL USING (is_host_or_admin());

CREATE POLICY "questions_select_all" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "questions_manage_admin" ON public.quiz_questions FOR ALL USING (is_host_or_admin());

CREATE POLICY "quiz_answers_select_all" ON public.quiz_answers FOR SELECT USING (true);
CREATE POLICY "quiz_answers_manage_admin" ON public.quiz_answers FOR ALL USING (is_host_or_admin());

-- FEUD
CREATE POLICY "feud_questions_select_all" ON public.feud_questions FOR SELECT USING (true);
CREATE POLICY "feud_questions_manage_admin" ON public.feud_questions FOR ALL USING (is_host_or_admin());

CREATE POLICY "feud_answers_select_all" ON public.feud_answers FOR SELECT USING (true);
CREATE POLICY "feud_answers_manage_admin" ON public.feud_answers FOR ALL USING (is_host_or_admin());

-- SESSIONS
CREATE POLICY "sessions_select_all" ON public.game_sessions FOR SELECT USING (true);
CREATE POLICY "sessions_manage_all" ON public.game_sessions FOR ALL USING (true);

-- TEAMS
CREATE POLICY "teams_select_all" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams_manage_all" ON public.teams FOR ALL USING (true);

-- SESSION PARTICIPANTS
CREATE POLICY "sp_select_all" ON public.session_participants FOR SELECT USING (true);
CREATE POLICY "sp_insert_all" ON public.session_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "sp_update_all" ON public.session_participants FOR UPDATE USING (true);
CREATE POLICY "sp_delete_all" ON public.session_participants FOR DELETE USING (true);

-- PARTICIPANT ANSWERS
CREATE POLICY "pa_select_all" ON public.participant_answers FOR SELECT USING (true);
CREATE POLICY "pa_insert_all" ON public.participant_answers FOR INSERT WITH CHECK (true);

-- FEUD ROUND STATE
CREATE POLICY "frs_select_all" ON public.feud_round_state FOR SELECT USING (true);
CREATE POLICY "frs_manage_all" ON public.feud_round_state FOR ALL USING (true);

-- DRAWING
CREATE POLICY "drawing_rounds_select_all" ON public.drawing_rounds FOR SELECT USING (true);
CREATE POLICY "drawing_rounds_manage_all" ON public.drawing_rounds FOR ALL USING (true);

CREATE POLICY "drawing_guesses_select_all" ON public.drawing_guesses FOR SELECT USING (true);
CREATE POLICY "drawing_guesses_insert_all" ON public.drawing_guesses FOR INSERT WITH CHECK (true);

-- PASSPORT STAMPS & TITLES
CREATE POLICY "stamps_select_all" ON public.passport_stamps FOR SELECT USING (true);
CREATE POLICY "stamps_manage_admin" ON public.passport_stamps FOR ALL USING (is_admin());

CREATE POLICY "participant_stamps_select_all" ON public.participant_stamps FOR SELECT USING (true);
CREATE POLICY "participant_stamps_insert_all" ON public.participant_stamps FOR INSERT WITH CHECK (true);

CREATE POLICY "titles_select_all" ON public.passport_titles FOR SELECT USING (true);
CREATE POLICY "titles_manage_admin" ON public.passport_titles FOR ALL USING (is_admin());

CREATE POLICY "participant_titles_select_all" ON public.participant_titles FOR SELECT USING (true);
CREATE POLICY "participant_titles_insert_all" ON public.participant_titles FOR INSERT WITH CHECK (true);

CREATE POLICY "profile_settings_select_all" ON public.participant_profile_settings FOR SELECT USING (true);
CREATE POLICY "profile_settings_manage_own" ON public.participant_profile_settings FOR ALL USING (participant_id = auth.uid() OR is_admin());

CREATE POLICY "audit_log_select_admin" ON public.admin_audit_log FOR SELECT USING (is_admin());
CREATE POLICY "audit_log_insert_all" ON public.admin_audit_log FOR INSERT WITH CHECK (true);

-- ============================================================
-- 6. SEED CURATED CONTENT (Stamps, Titles, Events, Quizzes)
-- ============================================================

-- DEFAULT PASSPORT STAMPS
INSERT INTO public.passport_stamps (slug, name, name_ar, description, description_ar, icon_url, rarity, unlock_type, unlock_config)
VALUES
  (
    'stamp-fresh-leaf',
    'Fresh Leaf 🍃',
    'الورقة الغضة',
    'Given to everyone who has an account logged in to Sakura.',
    'تُمنح لكل عضو أنشأ حساباً وسجّل دخوله في منصة ساكورا.',
    '🍃',
    'common',
    'manual',
    '{}'
  ),
  (
    'stamp-first-bloom',
    'First Bloom 🌸',
    'الزهرة الأولى',
    'Created your Sakura Club identity and joined the community.',
    'أنشأت هويتك الرقمية وانضممت إلى نادي ساكورا.',
    '🌸',
    'common',
    'manual',
    '{}'
  ),
  (
    'stamp-spacetoon-veteran',
    'Spacetoon Veteran 📺',
    'مخضرم سبيستون',
    'Participated in a Spacetoon Nostalgia Trivia live event.',
    'شاركت في مسابقة نوستالجيا سبيستون الحية واسترجعت ذكريات الطفولة.',
    '📺',
    'uncommon',
    'activity_completion',
    '{"activity_type": "spacetoon_nostalgia"}'
  ),
  (
    'stamp-anime-sage',
    'Anime Sage 📚',
    'حكيم الأنمي',
    'Scored 80% or higher in the Anime Expert Examination.',
    'حققت أكثر من 80% في اختبار خبير الأنمي الصارم.',
    '📚',
    'rare',
    'score_threshold',
    '{"threshold": 80}'
  ),
  (
    'stamp-character-detective',
    'Character Detective 🎭',
    'محقق الشخصيات',
    'Guessed the silhouette character in under 3 seconds.',
    'خمّنت ظل الشخصية في أقل من 3 ثوانٍ بسرعة فائقة.',
    '🎭',
    'uncommon',
    'activity_completion',
    '{"activity_type": "whos_that_character"}'
  ),
  (
    'stamp-feud-champion',
    'Feud Champion ⚔️',
    'بطل الفيد',
    'Led your team to victory in the live Sakura Feud showdown.',
    'قدت فريقك للفوز ببطولة فيود ساكورا الفرقية.',
    '⚔️',
    'rare',
    'activity_win',
    '{"activity_type": "sakura_feud"}'
  ),
  (
    'stamp-master-artist',
    'Master Artist 🎨',
    'رسام الأنمي البارع',
    'Successfully had 3 teammates guess your drawings.',
    'رسمت ببراعة ونجح زملاؤك في تخمين 3 رسومات متتالية.',
    '🎨',
    'rare',
    'activity_completion',
    '{"activity_type": "draw_it_guess_it"}'
  ),
  (
    'stamp-event-attendance',
    'Campus Matsuri 2026 ⛩️',
    'حضور مهرجان ساكورا',
    'Attended an official on-campus Sakura Club physical event.',
    'حضرت فعالية رسمية حضورية لنادي ساكورا داخل الحرم الجامعي.',
    '⛩️',
    'legendary',
    'event_attendance',
    '{}'
  ),
  (
    'stamp-golden-sakura',
    'Golden Sakura Legend ⭐',
    'أسطورة ساكورا الذهبية',
    'Awarded by club leadership for extraordinary spirit and dedication.',
    'وسام الشرف الاستثنائي الممنوح من إدارة النادي للمتميزين.',
    '⭐',
    'legendary',
    'manual',
    '{}'
  )
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description;

-- DEFAULT PASSPORT TITLES
INSERT INTO public.passport_titles (slug, name, name_ar, description, description_ar, icon_url, unlock_type)
VALUES
  ('title-novice', 'Novice Fan 🌸', 'أوتاكو مبتدئ', 'Your journey in Sakura Club has just begun.', 'بداية رحلتك في عالم الأنمي والثقافة اليابانية.', '🌸', 'manual'),
  ('title-spacetoon', 'Spacetoon Child of the 90s 📺', 'ابن جيل سبيستون الذهبي', 'Grew up on Venus Center dubs and iconic Arabic opening themes.', 'عاش العصر الذهبي لأغاني ودبلجات مركز الزهرة.', '📺', 'manual'),
  ('title-scholar', 'Anime Scholar 📚', 'باحث الأنمي والخبير', 'Possesses encyclopedic knowledge of lore, studios, and mangaka.', 'يمتلك معرفة موسوعية بأدق تفاصيل الأنمي والمانغاكا.', '📚', 'manual'),
  ('title-strategist', 'Feud Strategist ⚔️', 'خبير فيود ساكورا', 'A master at predicting survey answers and executing steals.', 'داهية استطلاعات الرأي وسرقة النقاط في اللحظات الأخيرة.', '⚔️', 'manual'),
  ('title-legend', 'Sakura Legend ⭐', 'أسطورة نادي ساكورا', 'One of the most decorated club members of all time.', 'من أبرز أعضاء النادي أثراً وبطولة وتألقاً.', '⭐', 'manual')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar;

-- DEFAULT EVENTS
INSERT INTO public.events (id, title, title_ar, description, description_ar, venue, starts_at, ends_at, status, check_in_open, check_in_code, banner_url)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'Spacetoon Nostalgia Night',
    'ليلة نوستالجيا سبيستون الذهبية',
    'Relive the golden era of 90s and 2000s Arabic-dubbed anime with team trivia, iconic OST singalongs, and passport stamp awards.',
    'استرجع ذكريات العصر الذهبي للأنمي المدبلج بمركز الزهرة مع مسابقات تفاعلية وأغاني الشارات الخالدة وأختام الجواز الرقمي.',
    'Student Activities Center — Main Hall',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '2 days 3 hours',
    'published',
    TRUE,
    'SPCE',
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop'
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'Sakura Feud Tournament',
    'بطولة فيود ساكورا الفرقية الكبرى',
    'Two massive teams clash on anime survey trivia to claim the legendary club champion trophy.',
    'منافسة شيقة بين فريقين لتخمين أكثر الإجابات شيوعاً في استطلاعات الأنمي اليابانية ونيل كأس النادي.',
    'Campus Auditorium B',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days 3 hours',
    'published',
    FALSE,
    'FEUD',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop'
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title, title_ar = EXCLUDED.title_ar, check_in_code = EXCLUDED.check_in_code;

-- DEFAULT QUIZZES
INSERT INTO public.quizzes (id, title, title_ar, activity_type, status, difficulty)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Who''s That Character? Live', 'من هذه الشخصية؟ العرض الحي', 'whos_that_character', 'published', 'mixed'),
  ('b0000000-0000-0000-0000-000000000002', 'Spacetoon Nostalgia Exam', 'اختبار نوستالجيا سبيستون', 'spacetoon_nostalgia', 'published', 'mixed'),
  ('b0000000-0000-0000-0000-000000000003', 'Sakura Feud Survey Pack', 'حزمة استطلاعات فيود ساكورا', 'sakura_feud', 'published', 'mixed')
ON CONFLICT (id) DO NOTHING;

-- DEFAULT QUIZ QUESTIONS & ANSWERS
DO $$
DECLARE
  v_q1 UUID := 'ba000000-0000-0000-0000-000000000001';
  v_q2 UUID := 'ba000000-0000-0000-0000-000000000002';
  v_q3 UUID := 'ba000000-0000-0000-0000-000000000003';
BEGIN
  -- Question 1: Who's That Character (Naruto)
  INSERT INTO public.quiz_questions (id, quiz_id, question_text, question_text_ar, time_limit_seconds, base_points, sort_order)
  VALUES (
    v_q1,
    'b0000000-0000-0000-0000-000000000001',
    'Known for orange jumpsuit, spiky blonde hair, and infinite willpower!',
    'يرتدي بزة برتقالية، شعر أشقر شائك، وعزيمة لا تلين!',
    20, 1000, 1
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.quiz_answers (question_id, answer_text, answer_text_ar, is_correct, sort_order)
  VALUES
    (v_q1, 'Naruto Uzumaki', 'ناروتو أوزوماكي', TRUE, 1),
    (v_q1, 'Goku', 'غوكو', FALSE, 2),
    (v_q1, 'Edward Elric', 'إدوارد إلريك', FALSE, 3),
    (v_q1, 'Boruto Uzumaki', 'بوروتو أوزوماكي', FALSE, 4)
  ON CONFLICT DO NOTHING;

  -- Question 2: Who's That Character (Luffy)
  INSERT INTO public.quiz_questions (id, quiz_id, question_text, question_text_ar, time_limit_seconds, base_points, sort_order)
  VALUES (
    v_q2,
    'b0000000-0000-0000-0000-000000000001',
    'Wears a straw hat, loves meat, and aims to be King of the Pirates!',
    'يرتدي قبعة قش، يعشق اللحم، ويطمح ليصبح ملك القراصنة!',
    20, 1000, 2
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.quiz_answers (question_id, answer_text, answer_text_ar, is_correct, sort_order)
  VALUES
    (v_q2, 'Roronoa Zoro', 'رورونوا زورو', FALSE, 1),
    (v_q2, 'Monkey D. Luffy', 'مونكي دي لوفي', TRUE, 2),
    (v_q2, 'Portgas D. Ace', 'بورتغاس دي إيس', FALSE, 3),
    (v_q2, 'Shanks', 'شانكس', FALSE, 4)
  ON CONFLICT DO NOTHING;

  -- Question 3: Spacetoon Nostalgia (Detective Conan)
  INSERT INTO public.quiz_questions (id, quiz_id, question_text, question_text_ar, time_limit_seconds, base_points, sort_order)
  VALUES (
    v_q3,
    'b0000000-0000-0000-0000-000000000002',
    'What is the name of the lethal poison given to Shinichi Kudo in Detective Conan?',
    'ما اسم العقار السام الذي أُجبر سينشي كودو على تناوله في المحقق كونان؟',
    20, 1000, 1
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.quiz_answers (question_id, answer_text, answer_text_ar, is_correct, sort_order)
  VALUES
    (v_q3, 'APTX 4869', 'أبتكس 4869 (APTX 4869)', TRUE, 1),
    (v_q3, 'Tox-99', 'توكس 99', FALSE, 2),
    (v_q3, 'Compound V', 'المركب في', FALSE, 3),
    (v_q3, 'Formula 404', 'الصيغة 404', FALSE, 4)
  ON CONFLICT DO NOTHING;
END $$;

-- DEFAULT FEUD QUESTIONS & ANSWERS
DO $$
DECLARE
  v_fq1 UUID := 'fa000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.feud_questions (id, quiz_id, question_text, question_text_ar, strikes_allowed, sort_order)
  VALUES (
    v_fq1,
    'b0000000-0000-0000-0000-000000000003',
    'We asked 100 anime fans: Name the most iconic anime hair color!',
    'سألنا 100 من عشاق الأنمي: ما هو لون الشعر الأكثر تميزاً وشهرة لأبطال الأنمي؟',
    3, 1
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.feud_answers (feud_question_id, answer_text, answer_text_ar, points, sort_order)
  VALUES
    (v_fq1, 'Spiky Yellow / Blonde', 'الأصفر / الأشقر الشائك (غوكو، ناروتو)', 38, 1),
    (v_fq1, 'Fiery Red / Crimson', 'الأحمر الناري (شانكس، غارا)', 24, 2),
    (v_fq1, 'Silver / White', 'الفضي / الأبيض الأسطوري (كاكاشي، غينتوكي)', 19, 3),
    (v_fq1, 'Jet Black', 'الأسود القاتم (ساسكي، ليفي)', 12, 4),
    (v_fq1, 'Electrifying Blue', 'الأزرق الكهربائي', 7, 5)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- 7. PROVISION PRE-CONFIRMED SUPER ADMIN ACCOUNT
-- ============================================================
-- Email:    admin@sakura.club
-- Password: SakuraAdmin2026!

DO $$
DECLARE
  v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert into auth.users if not present
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@sakura.club') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      'admin@sakura.club',
      crypt('SakuraAdmin2026!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nickname":"SakuraAdmin","preferred_language":"en","role":"super_admin"}'::jsonb,
      NOW(),
      NOW(),
      encode(gen_random_bytes(32), 'hex')
    );
  END IF;

  -- Ensure auth.identities exists for GoTrue password login
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_admin_id) THEN
    BEGIN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        v_admin_id::text,
        v_admin_id,
        jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@sakura.club'),
        'email',
        v_admin_id::text,
        NOW(),
        NOW(),
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        INSERT INTO auth.identities (
          id,
          user_id,
          identity_data,
          provider,
          provider_id,
          last_sign_in_at,
          created_at,
          updated_at
        ) VALUES (
          v_admin_id,
          v_admin_id,
          jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@sakura.club'),
          'email',
          'admin@sakura.club',
          NOW(),
          NOW(),
          NOW()
        );
      EXCEPTION WHEN OTHERS THEN null;
      END;
    END;
  END IF;

  -- Ensure profile exists
  INSERT INTO public.profiles (id, nickname, preferred_language, is_guest)
  SELECT id, 'SakuraAdmin', 'en'::public.language_preference, FALSE
  FROM auth.users
  WHERE email = 'admin@sakura.club'
  ON CONFLICT (id) DO UPDATE SET nickname = 'SakuraAdmin';

  -- Ensure super_admin role exists
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'super_admin'::public.user_role
  FROM auth.users
  WHERE email = 'admin@sakura.club'
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Backfill any other users in auth.users that don't have profiles
  INSERT INTO public.profiles (id, nickname, preferred_language)
  SELECT
    u.id,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE lower(p.nickname) = lower(COALESCE(u.raw_user_meta_data->>'nickname', split_part(u.email, '@', 1)))
          AND p.id <> u.id
      ) THEN
        substring(COALESCE(u.raw_user_meta_data->>'nickname', split_part(u.email, '@', 1)), 1, 22) || '_' || substring(replace(u.id::text, '-', ''), 1, 6)
      ELSE
        COALESCE(u.raw_user_meta_data->>'nickname', split_part(u.email, '@', 1))
    END,
    'en'::public.language_preference
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
    AND u.email <> 'admin@sakura.club'
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  SELECT
    id,
    CASE
      WHEN email ILIKE '%admin%' THEN 'super_admin'::public.user_role
      ELSE 'participant'::public.user_role
    END
  FROM auth.users
  ON CONFLICT (user_id, role) DO NOTHING;

END $$;

-- Verify setup
SELECT
  (SELECT COUNT(*) FROM public.profiles) as profiles_count,
  (SELECT COUNT(*) FROM public.events) as events_count,
  (SELECT COUNT(*) FROM public.passport_stamps) as stamps_count,
  (SELECT COUNT(*) FROM public.quizzes) as quizzes_count;
