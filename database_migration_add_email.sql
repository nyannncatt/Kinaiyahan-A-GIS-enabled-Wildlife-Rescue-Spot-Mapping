-- Add email column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add a comment to the column
COMMENT ON COLUMN users.email IS 'User email address';

