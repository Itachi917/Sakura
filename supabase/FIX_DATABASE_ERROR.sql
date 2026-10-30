-- ============================================================
-- SAKURA PLATFORM — FIX "Database error querying schema"
-- ============================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oajakkpnttxccsnbdeks/sql/new
--
-- Why this happens:
-- 1. Direct SQL inserts into auth.users leave token columns as NULL.
--    GoTrue expects empty strings ('') and crashes with:
--    "converting NULL to string is unsupported" (status 500).
-- 2. Direct inserts lack an auth.identities record required for password login.
-- 3. The auth trigger needs explicit search_path and exception safety.
-- ============================================================

-- 1. Fix NULL token columns in auth.users (fixes GoTrue scanning crash)
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  recovery_token = COALESCE(recovery_token, '')
WHERE 
  confirmation_token IS NULL 
  OR email_change IS NULL 
  OR email_change_token_new IS NULL 
  OR recovery_token IS NULL;

-- 2. Link admin@sakura.club into auth.identities
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@sakura.club';
  
  IF v_admin_id IS NOT NULL THEN
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
  END IF;
END $$;

-- 3. Make handle_new_user() completely bulletproof with explicit search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_role public.user_role;
  v_nickname TEXT;
  v_lang public.language_preference;
BEGIN
  -- Safe nickname extraction
  v_nickname := COALESCE(
    NEW.raw_user_meta_data->>'nickname',
    split_part(NEW.email, '@', 1),
    'Member'
  );

  -- Sanitize nickname characters
  v_nickname := regexp_replace(v_nickname, '[^a-zA-Z0-9_\u0600-\u06FF \-]', '', 'g');
  IF length(v_nickname) < 2 THEN
    v_nickname := 'Sakura_' || substring(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;

  -- Ensure uniqueness
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(nickname) = lower(v_nickname) AND id <> NEW.id) THEN
    v_nickname := substring(v_nickname, 1, 22) || '_' || substring(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;

  -- Safe language fallback
  BEGIN
    v_lang := (NEW.raw_user_meta_data->>'preferred_language')::public.language_preference;
  EXCEPTION WHEN OTHERS THEN
    v_lang := 'en'::public.language_preference;
  END;

  -- Insert profile
  INSERT INTO public.profiles (id, nickname, preferred_language, is_guest)
  VALUES (NEW.id, v_nickname, v_lang, FALSE)
  ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname;

  -- Assign role
  IF NEW.email ILIKE '%admin%' OR NEW.raw_user_meta_data->>'role' = 'super_admin' THEN
    v_role := 'super_admin'::public.user_role;
  ELSE
    v_role := 'participant'::public.user_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Profile settings
  INSERT INTO public.participant_profile_settings (participant_id)
  VALUES (NEW.id)
  ON CONFLICT (participant_id) DO NOTHING;

  -- Award starter stamp
  BEGIN
    INSERT INTO public.participant_stamps (participant_id, stamp_id, award_reason)
    SELECT NEW.id, id, 'Welcome to Sakura Club!'
    FROM public.passport_stamps
    WHERE slug = 'stamp-first-bloom'
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN null;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never fail the auth transaction
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 4. Ensure admin account and roles are intact
INSERT INTO public.profiles (id, nickname, preferred_language, is_guest)
SELECT id, 'SakuraAdmin', 'en'::public.language_preference, FALSE
FROM auth.users
WHERE email = 'admin@sakura.club'
ON CONFLICT (id) DO UPDATE SET nickname = 'SakuraAdmin';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.user_role
FROM auth.users
WHERE email = 'admin@sakura.club'
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Verification output
SELECT
  u.email,
  u.email_confirmed_at IS NOT NULL as confirmed,
  (u.confirmation_token = '' OR u.confirmation_token IS NOT NULL) as tokens_clean,
  EXISTS(SELECT 1 FROM auth.identities i WHERE i.user_id = u.id) as identity_linked,
  p.nickname,
  r.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE u.email = 'admin@sakura.club';
