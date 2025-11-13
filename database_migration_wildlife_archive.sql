-- Ensure required extension for UUID generation (Supabase usually has this)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create archive table for wildlife records deletions
CREATE TABLE IF NOT EXISTS wildlife_records_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id uuid,
  user_id uuid,
  species_name text,
  scientific_name text,
  speciespf_id text,
  status text,
  approval_status text,
  latitude double precision,
  longitude double precision,
  barangay text,
  municipality text,
  reporter_name text,
  contact_number text,
  reporter_contact text,
  notes text,
  photo_url text,
  has_exif_gps boolean,
  timestamp_captured timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_wra_original_id ON wildlife_records_archive (original_id);
CREATE INDEX IF NOT EXISTS idx_wra_speciespf_id ON wildlife_records_archive (speciespf_id);
CREATE INDEX IF NOT EXISTS idx_wra_deleted_at ON wildlife_records_archive (deleted_at);

-- Add foreign key relationships to keep relations visible in DB diagram
DO $$
BEGIN
  -- Clean up orphaned references before adding FKs to avoid violations
  UPDATE wildlife_records_archive a
  SET original_id = NULL
  WHERE original_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM wildlife_records r WHERE r.id = a.original_id);

  UPDATE wildlife_records_archive a
  SET user_id = NULL
  WHERE user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = a.user_id);

  -- FK to original wildlife record
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'wra_original_id_fk'
  ) THEN
    ALTER TABLE wildlife_records_archive
    ADD CONSTRAINT wra_original_id_fk
    FOREIGN KEY (original_id) REFERENCES wildlife_records(id)
    ON DELETE SET NULL
    NOT VALID;

    -- Try to validate; if it fails due to race inserts, it's still created as NOT VALID
    BEGIN
      ALTER TABLE wildlife_records_archive VALIDATE CONSTRAINT wra_original_id_fk;
    EXCEPTION WHEN others THEN
      -- leave constraint as NOT VALID; can be validated later after data fix
      RAISE NOTICE 'wra_original_id_fk left NOT VALID for later validation';
    END;
  END IF;

  -- FK to users table (owner/creator of record)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'wra_user_id_fk'
  ) THEN
    ALTER TABLE wildlife_records_archive
    ADD CONSTRAINT wra_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
    NOT VALID;

    BEGIN
      ALTER TABLE wildlife_records_archive VALIDATE CONSTRAINT wra_user_id_fk;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'wra_user_id_fk left NOT VALID for later validation';
    END;
  END IF;
END $$;
*** End Patch***  }``` />
wow
