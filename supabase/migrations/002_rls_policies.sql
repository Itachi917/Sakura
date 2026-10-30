-- ============================================================
-- SAKURA PLATFORM — ROW LEVEL SECURITY POLICIES
-- ============================================================
-- Run AFTER 001_initial_schema.sql

-- ============================================================
-- Helper function: get current user's role
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'club_admin' THEN 2
    WHEN 'event_host' THEN 3
    WHEN 'participant' THEN 4
  END
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'club_admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_host_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'club_admin', 'event_host')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- Enable RLS on all tables
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feud_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feud_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feud_round_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_guesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE passport_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE passport_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_profile_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES policies
-- ============================================================

-- Anyone authenticated can read profiles (for leaderboards)
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profile creation handled by trigger (service role)
CREATE POLICY "profiles_insert_trigger"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- USER ROLES policies
-- ============================================================

-- Everyone can see their own roles
CREATE POLICY "user_roles_select_own"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- Only super_admins can manage roles
CREATE POLICY "user_roles_manage_super_admin"
  ON user_roles FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================
-- EVENTS policies
-- ============================================================

-- Public can see published/active events
CREATE POLICY "events_select_published"
  ON events FOR SELECT
  USING (
    status IN ('published', 'active', 'completed')
    OR (auth.uid() IS NOT NULL AND is_host_or_admin())
    OR created_by = auth.uid()
  );

-- Admins and event hosts can create events
CREATE POLICY "events_insert_admin"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (is_host_or_admin());

-- Admins can update any event; hosts can update their own
CREATE POLICY "events_update_admin"
  ON events FOR UPDATE
  TO authenticated
  USING (is_admin() OR created_by = auth.uid())
  WITH CHECK (is_admin() OR created_by = auth.uid());

CREATE POLICY "events_delete_admin"
  ON events FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================
-- EVENT ATTENDANCE policies
-- ============================================================

CREATE POLICY "attendance_select"
  ON event_attendance FOR SELECT
  TO authenticated
  USING (participant_id = auth.uid() OR is_host_or_admin());

CREATE POLICY "attendance_insert"
  ON event_attendance FOR INSERT
  TO authenticated
  WITH CHECK (participant_id = auth.uid() OR is_host_or_admin());

CREATE POLICY "attendance_admin_all"
  ON event_attendance FOR ALL
  TO authenticated
  USING (is_admin());

-- ============================================================
-- QUIZZES policies
-- ============================================================

CREATE POLICY "quizzes_select"
  ON quizzes FOR SELECT
  TO authenticated
  USING (
    status = 'published' OR is_host_or_admin() OR created_by = auth.uid()
  );

CREATE POLICY "quizzes_insert"
  ON quizzes FOR INSERT
  TO authenticated
  WITH CHECK (is_host_or_admin());

CREATE POLICY "quizzes_update"
  ON quizzes FOR UPDATE
  TO authenticated
  USING (is_admin() OR created_by = auth.uid())
  WITH CHECK (is_admin() OR created_by = auth.uid());

CREATE POLICY "quizzes_delete"
  ON quizzes FOR DELETE
  TO authenticated
  USING (is_admin() OR created_by = auth.uid());

-- ============================================================
-- QUIZ QUESTIONS policies
-- ============================================================

CREATE POLICY "quiz_questions_select"
  ON quiz_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_id
        AND (q.status = 'published' OR is_host_or_admin() OR q.created_by = auth.uid())
    )
  );

CREATE POLICY "quiz_questions_manage"
  ON quiz_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_id AND (is_admin() OR q.created_by = auth.uid())
    )
  );

-- ============================================================
-- QUIZ ANSWERS policies — CRITICAL: hide is_correct from participants
-- ============================================================

-- Hosts/admins see all answer data (including is_correct)
CREATE POLICY "quiz_answers_admin_select"
  ON quiz_answers FOR SELECT
  TO authenticated
  USING (
    is_host_or_admin()
    OR EXISTS (
      SELECT 1 FROM quizzes q
      JOIN quiz_questions qq ON qq.quiz_id = q.id
      WHERE qq.id = question_id AND q.created_by = auth.uid()
    )
  );

-- Participants see answers but NOT is_correct (via a view - see below)
-- Direct table access restricted to admins/hosts only
-- Participants must use the quiz_answers_public view

CREATE POLICY "quiz_answers_manage"
  ON quiz_answers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN quiz_questions qq ON qq.quiz_id = q.id
      WHERE qq.id = question_id AND (is_admin() OR q.created_by = auth.uid())
    )
  );

-- ============================================================
-- PUBLIC VIEW: quiz answers without correct answer flag
-- ============================================================

CREATE OR REPLACE VIEW quiz_answers_public AS
  SELECT id, question_id, answer_text, answer_text_ar, sort_order
  FROM quiz_answers;

-- ============================================================
-- FEUD QUESTIONS & ANSWERS policies
-- ============================================================

CREATE POLICY "feud_questions_select"
  ON feud_questions FOR SELECT
  TO authenticated
  USING (is_host_or_admin() OR EXISTS (
    SELECT 1 FROM quizzes q WHERE q.id = quiz_id AND q.created_by = auth.uid()
  ));

CREATE POLICY "feud_questions_manage"
  ON feud_questions FOR ALL
  TO authenticated
  USING (is_host_or_admin());

-- Feud answers are NEVER directly visible to participants (revealed via host action)
CREATE POLICY "feud_answers_host_only"
  ON feud_answers FOR SELECT
  TO authenticated
  USING (is_host_or_admin());

CREATE POLICY "feud_answers_manage"
  ON feud_answers FOR ALL
  TO authenticated
  USING (is_host_or_admin());

-- ============================================================
-- GAME SESSIONS policies
-- ============================================================

-- Anyone can see a session if they know the PIN (join flow)
CREATE POLICY "sessions_select_public"
  ON game_sessions FOR SELECT
  USING (
    status NOT IN ('cancelled')
    AND (
      status IN ('lobby', 'ready', 'question_active', 'answer_collection_ended',
                 'answer_reveal', 'round_results', 'final_results')
      OR host_id = auth.uid()
      OR is_host_or_admin()
    )
  );

CREATE POLICY "sessions_insert_host"
  ON game_sessions FOR INSERT
  TO authenticated
  WITH CHECK (is_host_or_admin() AND host_id = auth.uid());

-- Only the host or admins can update session state
CREATE POLICY "sessions_update_host"
  ON game_sessions FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid() OR is_admin())
  WITH CHECK (host_id = auth.uid() OR is_admin());

CREATE POLICY "sessions_delete_admin"
  ON game_sessions FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================
-- TEAMS policies
-- ============================================================

CREATE POLICY "teams_select"
  ON teams FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM game_sessions gs WHERE gs.id = session_id
    AND gs.status NOT IN ('cancelled')
  ));

CREATE POLICY "teams_manage_host"
  ON teams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = session_id AND (gs.host_id = auth.uid() OR is_admin())
    )
  );

-- ============================================================
-- SESSION PARTICIPANTS policies
-- ============================================================

CREATE POLICY "sp_select"
  ON session_participants FOR SELECT
  USING (
    participant_id = auth.uid()
    OR is_host_or_admin()
    OR EXISTS (
      SELECT 1 FROM game_sessions gs WHERE gs.id = session_id
      AND gs.status NOT IN ('lobby', 'cancelled')
    )
  );

CREATE POLICY "sp_insert_self"
  ON session_participants FOR INSERT
  TO authenticated
  WITH CHECK (participant_id = auth.uid());

CREATE POLICY "sp_insert_guest"
  ON session_participants FOR INSERT
  USING (participant_id IS NULL AND guest_token IS NOT NULL);

CREATE POLICY "sp_update_self"
  ON session_participants FOR UPDATE
  TO authenticated
  USING (participant_id = auth.uid() OR is_host_or_admin());

CREATE POLICY "sp_host_manage"
  ON session_participants FOR ALL
  TO authenticated
  USING (
    is_host_or_admin()
    OR EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = session_id AND gs.host_id = auth.uid()
    )
  );

-- ============================================================
-- PARTICIPANT ANSWERS policies
-- ============================================================

-- Participants can insert their own answers (via submit_answer function)
-- but cannot update/delete or view others' payloads
CREATE POLICY "pa_select_own"
  ON participant_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.id = participant_id AND sp.participant_id = auth.uid()
    )
    OR is_host_or_admin()
  );

-- Insertion is done only via submit_answer() SECURITY DEFINER function
-- Direct inserts from participants are blocked
CREATE POLICY "pa_insert_denied"
  ON participant_answers FOR INSERT
  TO authenticated
  WITH CHECK (false); -- All inserts go through submit_answer()

-- ============================================================
-- FEUD ROUND STATE policies
-- ============================================================

CREATE POLICY "feud_round_select"
  ON feud_round_state FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM game_sessions gs
    WHERE gs.id = session_id AND gs.status NOT IN ('cancelled')
  ));

CREATE POLICY "feud_round_manage_host"
  ON feud_round_state FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = session_id AND (gs.host_id = auth.uid() OR is_admin())
    )
  );

-- ============================================================
-- DRAWING ROUNDS policies
-- ============================================================

-- Drawer's prompt is hidden from all except the drawer and host
CREATE POLICY "drawing_rounds_select"
  ON drawing_rounds FOR SELECT
  USING (
    is_host_or_admin()
    OR drawer_id IN (
      SELECT id FROM session_participants WHERE participant_id = auth.uid()
    )
    OR status IN ('completed', 'skipped') -- prompt visible after round ends
  );

CREATE POLICY "drawing_rounds_manage_host"
  ON drawing_rounds FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = session_id AND (gs.host_id = auth.uid() OR is_admin())
    )
  );

-- ============================================================
-- DRAWING GUESSES policies
-- ============================================================

CREATE POLICY "drawing_guesses_select"
  ON drawing_guesses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM drawing_rounds dr
    JOIN game_sessions gs ON gs.id = dr.session_id
    WHERE dr.id = round_id AND gs.status NOT IN ('cancelled')
  ));

CREATE POLICY "drawing_guesses_insert"
  ON drawing_guesses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.id = participant_id AND sp.participant_id = auth.uid()
    )
  );

-- ============================================================
-- PASSPORT STAMPS policies
-- ============================================================

-- Everyone can see active stamps (for the passport display)
CREATE POLICY "stamps_select_active"
  ON passport_stamps FOR SELECT
  USING (is_active = TRUE OR is_admin());

CREATE POLICY "stamps_manage_admin"
  ON passport_stamps FOR ALL
  TO authenticated
  USING (is_admin());

-- ============================================================
-- PARTICIPANT STAMPS policies
-- ============================================================

CREATE POLICY "participant_stamps_select"
  ON participant_stamps FOR SELECT
  TO authenticated
  USING (participant_id = auth.uid() OR is_host_or_admin());

-- Stamps can only be awarded via award_stamp() SECURITY DEFINER function
CREATE POLICY "participant_stamps_insert_denied"
  ON participant_stamps FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "participant_stamps_delete_admin"
  ON participant_stamps FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================
-- PASSPORT TITLES policies
-- ============================================================

CREATE POLICY "titles_select"
  ON passport_titles FOR SELECT
  USING (is_active = TRUE OR is_admin());

CREATE POLICY "titles_manage_admin"
  ON passport_titles FOR ALL
  TO authenticated
  USING (is_admin());

-- ============================================================
-- PARTICIPANT TITLES policies
-- ============================================================

CREATE POLICY "participant_titles_select"
  ON participant_titles FOR SELECT
  TO authenticated
  USING (participant_id = auth.uid() OR is_host_or_admin());

CREATE POLICY "participant_titles_manage_admin"
  ON participant_titles FOR ALL
  TO authenticated
  USING (is_admin());

-- ============================================================
-- PARTICIPANT PROFILE SETTINGS policies
-- ============================================================

CREATE POLICY "profile_settings_select_own"
  ON participant_profile_settings FOR SELECT
  TO authenticated
  USING (participant_id = auth.uid() OR is_admin());

CREATE POLICY "profile_settings_manage_own"
  ON participant_profile_settings FOR ALL
  TO authenticated
  USING (participant_id = auth.uid());

-- ============================================================
-- ADMIN AUDIT LOG policies
-- ============================================================

-- Only admins can view audit logs
CREATE POLICY "audit_log_admin_only"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (is_admin());

-- Audit log writes done via SECURITY DEFINER functions only
CREATE POLICY "audit_log_insert_denied"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (false);
