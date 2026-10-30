-- ============================================================
-- SAKURA PLATFORM — FIX ADMIN LOGIN (auth.identities)
-- ============================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oajakkpnttxccsnbdeks/sql/new
--
-- This links the admin@sakura.club credentials into GoTrue's
-- auth.identities table so you can sign in immediately with:
-- Email:    admin@sakura.club
-- Password: SakuraAdmin2026!
-- ============================================================

DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- 1. Ensure user exists in auth.users
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@sakura.club';
  
  IF v_admin_id IS NULL THEN
    v_admin_id := 'a0000000-0000-0000-0000-000000000001';
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

  -- 2. Link into auth.identities for GoTrue authentication
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

  -- 3. Ensure profile exists
  INSERT INTO public.profiles (id, nickname, preferred_language, is_guest)
  VALUES (v_admin_id, 'SakuraAdmin', 'en'::public.language_preference, FALSE)
  ON CONFLICT (id) DO UPDATE SET nickname = 'SakuraAdmin';

  -- 4. Ensure super_admin role exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin_id, 'super_admin'::public.user_role)
  ON CONFLICT (user_id, role) DO NOTHING;

END $$;

-- Verify admin account is ready
SELECT
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as is_confirmed,
  p.nickname,
  r.role,
  EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id) as has_identity
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE u.email = 'admin@sakura.club';
