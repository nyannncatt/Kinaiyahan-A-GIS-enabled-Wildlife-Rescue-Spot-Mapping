-- Add has_exif_gps column to wildlife_records table
-- This column tracks whether a record has EXIF GPS data from the photo

ALTER TABLE wildlife_records 
ADD COLUMN has_exif_gps BOOLEAN DEFAULT false;

-- Update existing records to have has_exif_gps = true for records that have valid coordinates
-- (assuming existing records with coordinates came from GPS data)
UPDATE wildlife_records 
SET has_exif_gps = true 
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND latitude != 0 
  AND longitude != 0;

-- Make the column NOT NULL after setting default values
ALTER TABLE wildlife_records 
ALTER COLUMN has_exif_gps SET NOT NULL;
