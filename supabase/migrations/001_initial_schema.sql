-- ============================================================
-- SAKURA PLATFORM — INITIAL SCHEMA MIGRATION
-- ============================================================
-- Run this in the Supabase SQL editor or via supabase db push

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'club_admin', 'event_host', 'participant');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'active', 'completed', 'cancelled');
CREATE TYPE session_status AS ENUM (
  'lobby', 'ready', 'question_active', 'answer_collection_ended',
  'answer_reveal', 'round_results', 'final_results', 'paused',
  'completed', 'cancelled'
);
CREATE TYPE activity_type AS ENUM (
  'whos_that_character', 'spacetoon_nostalgia', 'anime_expert_exam',
  'sakura_feud', 'draw_it_guess_it'
);
CREATE TYPE quiz_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE question_type AS ENUM (
  'multiple_choice', 'true_false', 'image_question', 'text_clue',
  'ordered_sequence', 'multi_clue', 'audio_question'
);
CREATE TYPE stamp_unlock_type AS ENUM (
  'event_attendance', 'activity_completion', 'activity_win',
  'score_threshold', 'participation_count', 'manual'
);
CREATE TYPE title_unlock_type AS ENUM (
  'stamp_count', 'event_count', 'activity_win', 'manual'
);
CREATE TYPE feud_round_status AS ENUM (
  'face_off', 'main_round', 'steal_opportunity', 'completed'
);
CREATE TYPE participant_status AS ENUM ('active', 'disconnected', 'removed');
CREATE TYPE check_in_method AS ENUM ('qr_scan', 'manual', 'pin_entry');
CREATE TYPE language_preference AS ENUM ('en', 'ar');

-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname        TEXT NOT NULL CHECK (
                    length(nickname) BETWEEN 2 AND 32
                    AND nickname ~ '^[a-zA-Z0-9\u0600-\u06FF _\-\.]+$'
                  ),
  avatar_url      TEXT,
  preferred_language language_preference NOT NULL DEFAULT 'en',
  is_guest        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX profiles_nickname_lower_idx ON profiles (lower(nickname));

-- ============================================================
-- USER ROLES
-- ============================================================

CREATE TABLE user_roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'participant',
  granted_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE INDEX user_roles_user_idx ON user_roles(user_id);

-- ============================================================
-- EVENTS
-- ============================================================

CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX events_status_idx ON events(status);
CREATE INDEX events_starts_at_idx ON events(starts_at);

-- ============================================================
-- EVENT ATTENDANCE
-- ============================================================

CREATE TABLE event_attendance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_in_method check_in_method NOT NULL DEFAULT 'manual',
  checked_in_by   UUID REFERENCES profiles(id),
  UNIQUE(event_id, participant_id)
);

CREATE INDEX event_attendance_event_idx ON event_attendance(event_id);
CREATE INDEX event_attendance_participant_idx ON event_attendance(participant_id);

-- ============================================================
-- QUIZZES
-- ============================================================

CREATE TABLE quizzes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  title_ar        TEXT,
  description     TEXT,
  description_ar  TEXT,
  activity_type   activity_type NOT NULL,
  language        language_preference NOT NULL DEFAULT 'en',
  difficulty      TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')),
  status          quiz_status NOT NULL DEFAULT 'draft',
  settings        JSONB NOT NULL DEFAULT '{}',
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX quizzes_activity_idx ON quizzes(activity_type);
CREATE INDEX quizzes_status_idx ON quizzes(status);

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================

CREATE TABLE quiz_questions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id             UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
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

CREATE INDEX quiz_questions_quiz_idx ON quiz_questions(quiz_id, sort_order);

-- ============================================================
-- QUIZ ANSWERS (protected — RLS will restrict is_correct)
-- ============================================================

CREATE TABLE quiz_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id     UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer_text     TEXT NOT NULL,
  answer_text_ar  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX quiz_answers_question_idx ON quiz_answers(question_id, sort_order);

-- ============================================================
-- FEUD QUESTIONS
-- ============================================================

CREATE TABLE feud_questions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id             UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
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

CREATE INDEX feud_questions_quiz_idx ON feud_questions(quiz_id, sort_order);

-- ============================================================
-- FEUD ANSWERS (hidden until revealed by host)
-- ============================================================

CREATE TABLE feud_answers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feud_question_id  UUID NOT NULL REFERENCES feud_questions(id) ON DELETE CASCADE,
  answer_text       TEXT NOT NULL,
  answer_text_ar    TEXT,
  points            INTEGER NOT NULL DEFAULT 10 CHECK (points > 0),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX feud_answers_question_idx ON feud_answers(feud_question_id, sort_order);

-- ============================================================
-- GAME SESSIONS
-- ============================================================

CREATE TABLE game_sessions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id              UUID REFERENCES events(id),
  quiz_id               UUID REFERENCES quizzes(id),
  activity_type         activity_type NOT NULL,
  room_pin              TEXT NOT NULL CHECK (room_pin ~ '^\d{6}$'),
  host_id               UUID NOT NULL REFERENCES profiles(id),
  status                session_status NOT NULL DEFAULT 'lobby',
  settings              JSONB NOT NULL DEFAULT '{}',
  current_question_id   UUID REFERENCES quiz_questions(id),
  question_deadline     TIMESTAMPTZ,
  max_participants      INTEGER NOT NULL DEFAULT 100,
  started_at            TIMESTAMPTZ,
  ended_at              TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique active PIN constraint
CREATE UNIQUE INDEX game_sessions_active_pin_idx
  ON game_sessions(room_pin)
  WHERE status NOT IN ('completed', 'cancelled');

CREATE INDEX game_sessions_host_idx ON game_sessions(host_id);
CREATE INDEX game_sessions_status_idx ON game_sessions(status);
CREATE INDEX game_sessions_event_idx ON game_sessions(event_id);

-- ============================================================
-- TEAMS
-- ============================================================

CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#F4A7C5',
  score       INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX teams_session_idx ON teams(session_id);

-- ============================================================
-- SESSION PARTICIPANTS
-- ============================================================

CREATE TABLE session_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  participant_id  UUID REFERENCES profiles(id),
  guest_token     TEXT,
  nickname        TEXT NOT NULL,
  team_id         UUID REFERENCES teams(id),
  score           INTEGER NOT NULL DEFAULT 0,
  streak          INTEGER NOT NULL DEFAULT 0,
  answers_correct INTEGER NOT NULL DEFAULT 0,
  answers_total   INTEGER NOT NULL DEFAULT 0,
  status          participant_status NOT NULL DEFAULT 'active',
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT participant_identity CHECK (
    participant_id IS NOT NULL OR guest_token IS NOT NULL
  ),
  UNIQUE(session_id, participant_id),
  UNIQUE(session_id, guest_token)
);

CREATE INDEX sp_session_idx ON session_participants(session_id);
CREATE INDEX sp_participant_idx ON session_participants(participant_id);

-- ============================================================
-- PARTICIPANT ANSWERS
-- ============================================================

CREATE TABLE participant_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES quiz_questions(id),
  participant_id  UUID NOT NULL REFERENCES session_participants(id),
  answer_payload  JSONB NOT NULL,
  is_correct      BOOLEAN,
  points_awarded  INTEGER NOT NULL DEFAULT 0,
  response_time_ms INTEGER,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(question_id, participant_id)
);

CREATE INDEX pa_session_idx ON participant_answers(session_id);
CREATE INDEX pa_question_idx ON participant_answers(question_id);
CREATE INDEX pa_participant_idx ON participant_answers(participant_id);

-- ============================================================
-- FEUD ROUND STATE
-- ============================================================

CREATE TABLE feud_round_state (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  feud_question_id  UUID NOT NULL REFERENCES feud_questions(id),
  round_number      INTEGER NOT NULL DEFAULT 1,
  active_team_id    UUID REFERENCES teams(id),
  round_status      feud_round_status NOT NULL DEFAULT 'face_off',
  strikes           INTEGER NOT NULL DEFAULT 0,
  revealed_answers  UUID[] NOT NULL DEFAULT '{}',
  round_points      INTEGER NOT NULL DEFAULT 0,
  multiplier        INTEGER NOT NULL DEFAULT 1,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX feud_round_session_q_idx ON feud_round_state(session_id, feud_question_id);

-- ============================================================
-- DRAWING ROUNDS
-- ============================================================

CREATE TABLE drawing_rounds (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  drawer_id     UUID NOT NULL REFERENCES session_participants(id),
  prompt        TEXT NOT NULL,
  prompt_ar     TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'skipped')),
  deadline      TIMESTAMPTZ,
  round_number  INTEGER NOT NULL DEFAULT 1,
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX drawing_rounds_session_idx ON drawing_rounds(session_id);

-- Guesses (stored in DB, strokes are broadcast-only via Realtime)
CREATE TABLE drawing_guesses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id      UUID NOT NULL REFERENCES drawing_rounds(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES session_participants(id),
  guess_text    TEXT NOT NULL,
  is_correct    BOOLEAN NOT NULL DEFAULT FALSE,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX drawing_guesses_round_idx ON drawing_guesses(round_id);

-- ============================================================
-- PASSPORT STAMPS
-- ============================================================

CREATE TABLE passport_stamps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  name_ar         TEXT,
  description     TEXT,
  description_ar  TEXT,
  icon_url        TEXT,
  rarity          TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),
  unlock_type     stamp_unlock_type NOT NULL DEFAULT 'manual',
  unlock_config   JSONB NOT NULL DEFAULT '{}',
  event_id        UUID REFERENCES events(id),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  release_from    TIMESTAMPTZ,
  release_to      TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX stamps_active_idx ON passport_stamps(is_active, sort_order);

-- ============================================================
-- PARTICIPANT STAMPS
-- ============================================================

CREATE TABLE participant_stamps (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stamp_id          UUID NOT NULL REFERENCES passport_stamps(id),
  awarded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  awarded_by        UUID REFERENCES profiles(id),
  source_event_id   UUID REFERENCES events(id),
  source_session_id UUID REFERENCES game_sessions(id),
  award_reason      TEXT,
  UNIQUE(participant_id, stamp_id)
);

CREATE INDEX ps_participant_idx ON participant_stamps(participant_id);
CREATE INDEX ps_stamp_idx ON participant_stamps(stamp_id);

-- ============================================================
-- PASSPORT TITLES
-- ============================================================

CREATE TABLE passport_titles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  name_ar         TEXT,
  description     TEXT,
  description_ar  TEXT,
  icon_url        TEXT,
  unlock_type     title_unlock_type NOT NULL DEFAULT 'manual',
  unlock_config   JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PARTICIPANT TITLES
-- ============================================================

CREATE TABLE participant_titles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title_id        UUID NOT NULL REFERENCES passport_titles(id),
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id, title_id)
);

CREATE INDEX pt_participant_idx ON participant_titles(participant_id);

-- ============================================================
-- PARTICIPANT PROFILE SETTINGS
-- ============================================================

CREATE TABLE participant_profile_settings (
  participant_id    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  equipped_title_id UUID REFERENCES passport_titles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ADMIN AUDIT LOG
-- ============================================================

CREATE TABLE admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES profiles(id),
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT,
  reason      TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_admin_idx ON admin_audit_log(admin_id);
CREATE INDEX audit_target_idx ON admin_audit_log(target_type, target_id);
CREATE INDEX audit_created_idx ON admin_audit_log(created_at);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER quizzes_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER game_sessions_updated_at BEFORE UPDATE ON game_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER passport_stamps_updated_at BEFORE UPDATE ON passport_stamps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION: Create profile on user signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, preferred_language)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nickname',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      (NEW.raw_user_meta_data->>'preferred_language')::language_preference,
      'en'
    )
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'participant');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCTION: Generate unique 6-digit PIN
-- ============================================================

CREATE OR REPLACE FUNCTION generate_room_pin()
RETURNS TEXT AS $$
DECLARE
  pin TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    pin := lpad(floor(random() * 900000 + 100000)::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM game_sessions
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

-- ============================================================
-- FUNCTION: Validate and submit an answer (server-authoritative)
-- ============================================================

CREATE OR REPLACE FUNCTION submit_answer(
  p_session_id    UUID,
  p_question_id   UUID,
  p_participant_id UUID,
  p_answer_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_session       game_sessions%ROWTYPE;
  v_question      quiz_questions%ROWTYPE;
  v_sp            session_participants%ROWTYPE;
  v_correct_answer quiz_answers%ROWTYPE;
  v_is_correct    BOOLEAN := FALSE;
  v_points        INTEGER := 0;
  v_time_ms       INTEGER;
  v_speed_factor  FLOAT;
  v_existing      participant_answers%ROWTYPE;
BEGIN
  -- Load session and validate state
  SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id;
  IF NOT FOUND OR v_session.status != 'question_active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Question not active');
  END IF;

  -- Check deadline
  IF v_session.question_deadline IS NOT NULL AND NOW() > v_session.question_deadline THEN
    RETURN jsonb_build_object('success', false, 'error', 'Time expired');
  END IF;

  -- Validate this is the current question
  IF v_session.current_question_id != p_question_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid question');
  END IF;

  -- Load session participant
  SELECT * INTO v_sp FROM session_participants
  WHERE id = p_participant_id AND session_id = p_session_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;

  -- Check for duplicate submission
  SELECT * INTO v_existing FROM participant_answers
  WHERE question_id = p_question_id AND participant_id = p_participant_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already submitted');
  END IF;

  -- Load question
  SELECT * INTO v_question FROM quiz_questions WHERE id = p_question_id;

  -- Validate answer against correct answers
  SELECT * INTO v_correct_answer FROM quiz_answers
  WHERE question_id = p_question_id AND is_correct = TRUE
  LIMIT 1;

  IF v_correct_answer IS NOT NULL THEN
    v_is_correct := (p_answer_payload->>'answer_id' = v_correct_answer.id::TEXT)
                 OR (p_answer_payload->>'answer_text' ILIKE v_correct_answer.answer_text);
  END IF;

  -- Calculate points
  IF v_is_correct THEN
    v_points := v_question.base_points;
    -- Speed bonus
    IF v_question.speed_bonus_enabled AND v_session.question_deadline IS NOT NULL THEN
      v_time_ms := EXTRACT(EPOCH FROM (v_session.question_deadline - NOW())) * 1000;
      v_time_ms := GREATEST(0, (v_question.time_limit_seconds * 1000) - v_time_ms);
      v_speed_factor := 1.0 - (v_time_ms::FLOAT / (v_question.time_limit_seconds * 1000.0));
      v_points := v_points + FLOOR(v_points * 0.5 * GREATEST(0, v_speed_factor))::INTEGER;
    END IF;
  END IF;

  -- Insert answer record (not allowing client to set is_correct or points)
  INSERT INTO participant_answers (
    session_id, question_id, participant_id,
    answer_payload, is_correct, points_awarded,
    response_time_ms, submitted_at
  ) VALUES (
    p_session_id, p_question_id, p_participant_id,
    p_answer_payload, v_is_correct, v_points,
    (p_answer_payload->>'response_time_ms')::INTEGER,
    NOW()
  );

  -- Update participant score and streak
  UPDATE session_participants SET
    score = score + v_points,
    streak = CASE WHEN v_is_correct THEN streak + 1 ELSE 0 END,
    answers_correct = answers_correct + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
    answers_total = answers_total + 1
  WHERE id = p_participant_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_correct', v_is_correct,
    'points_awarded', v_points,
    'submitted_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Award passport stamp (server-validated)
-- ============================================================

CREATE OR REPLACE FUNCTION award_stamp(
  p_participant_id  UUID,
  p_stamp_id        UUID,
  p_awarded_by      UUID,
  p_source_event_id UUID DEFAULT NULL,
  p_source_session_id UUID DEFAULT NULL,
  p_reason          TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_stamp passport_stamps%ROWTYPE;
  v_existing participant_stamps%ROWTYPE;
BEGIN
  -- Load stamp
  SELECT * INTO v_stamp FROM passport_stamps WHERE id = p_stamp_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stamp not found or inactive');
  END IF;

  -- Check release window
  IF v_stamp.release_from IS NOT NULL AND NOW() < v_stamp.release_from THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stamp not yet available');
  END IF;

  -- Check duplicate
  SELECT * INTO v_existing FROM participant_stamps
  WHERE participant_id = p_participant_id AND stamp_id = p_stamp_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already awarded');
  END IF;

  -- Insert award
  INSERT INTO participant_stamps (
    participant_id, stamp_id, awarded_by,
    source_event_id, source_session_id, award_reason
  ) VALUES (
    p_participant_id, p_stamp_id, p_awarded_by,
    p_source_event_id, p_source_session_id, p_reason
  );

  -- Audit log
  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, reason)
  VALUES (p_awarded_by, 'award_stamp', 'participant', p_participant_id::TEXT, p_reason);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Check and auto-award eligible stamps
-- ============================================================

CREATE OR REPLACE FUNCTION check_stamp_eligibility(p_participant_id UUID, p_event_id UUID DEFAULT NULL, p_session_id UUID DEFAULT NULL)
RETURNS SETOF UUID AS $$
DECLARE
  v_stamp passport_stamps%ROWTYPE;
  v_already_has BOOLEAN;
  v_eligible BOOLEAN;
  v_count INTEGER;
BEGIN
  FOR v_stamp IN SELECT * FROM passport_stamps WHERE is_active = TRUE LOOP
    -- Skip if already awarded
    SELECT EXISTS(
      SELECT 1 FROM participant_stamps
      WHERE participant_id = p_participant_id AND stamp_id = v_stamp.id
    ) INTO v_already_has;
    CONTINUE WHEN v_already_has;

    v_eligible := FALSE;

    -- Check unlock conditions
    CASE v_stamp.unlock_type
      WHEN 'event_attendance' THEN
        IF p_event_id IS NOT NULL AND (
          v_stamp.event_id IS NULL OR v_stamp.event_id = p_event_id
        ) THEN
          SELECT EXISTS(
            SELECT 1 FROM event_attendance
            WHERE participant_id = p_participant_id
              AND (v_stamp.event_id IS NULL OR event_id = v_stamp.event_id)
          ) INTO v_eligible;
        END IF;

      WHEN 'activity_completion' THEN
        IF p_session_id IS NOT NULL THEN
          SELECT EXISTS(
            SELECT 1 FROM session_participants sp
            JOIN game_sessions gs ON gs.id = sp.session_id
            WHERE sp.participant_id = p_participant_id
              AND gs.status = 'completed'
              AND (
                v_stamp.unlock_config->>'activity_type' IS NULL
                OR gs.activity_type::TEXT = v_stamp.unlock_config->>'activity_type'
              )
          ) INTO v_eligible;
        END IF;

      WHEN 'participation_count' THEN
        SELECT COUNT(*) INTO v_count
        FROM session_participants sp
        JOIN game_sessions gs ON gs.id = sp.session_id
        WHERE sp.participant_id = p_participant_id AND gs.status = 'completed';
        v_eligible := v_count >= COALESCE((v_stamp.unlock_config->>'count')::INTEGER, 1);

      ELSE
        v_eligible := FALSE;
    END CASE;

    IF v_eligible THEN
      INSERT INTO participant_stamps (participant_id, stamp_id, source_event_id, source_session_id, award_reason)
      VALUES (p_participant_id, v_stamp.id, p_event_id, p_session_id, 'auto_award')
      ON CONFLICT DO NOTHING;
      RETURN NEXT v_stamp.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
