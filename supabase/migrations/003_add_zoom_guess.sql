-- ============================================================
-- SAKURA PLATFORM — ADD ZOOM & GUESS ACTIVITY TYPE
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'zoom_guess'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type')
  ) THEN
    ALTER TYPE activity_type ADD VALUE 'zoom_guess';
  END IF;
END $$;
