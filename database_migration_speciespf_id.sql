-- Add speciespf_id column to wildlife_records if it doesn't exist
ALTER TABLE wildlife_records
ADD COLUMN IF NOT EXISTS speciespf_id text;

-- Create an index on speciespf_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_wildlife_records_speciespf_id
ON wildlife_records (speciespf_id);

-- Optional: backfill existing rows with a generated value based on created_at
-- Note: Adjust the timestamp source if you prefer timestamp_captured
DO $$
BEGIN
  -- Only backfill where speciespf_id is NULL
  UPDATE wildlife_records
  SET speciespf_id = 'MF'
    || to_char(COALESCE(timestamp_captured, created_at), 'MMDDYYYYHH24MI')
  WHERE speciespf_id IS NULL;
END $$;
*** End Patch``` }}/>

