-- Add bio column to user_profiles table
-- Run this in your Supabase SQL editor

-- Add bio column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'bio') THEN
    ALTER TABLE user_profiles ADD COLUMN bio TEXT;
    RAISE NOTICE 'Bio column added to user_profiles table';
  ELSE
    RAISE NOTICE 'Bio column already exists in user_profiles table';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name = 'bio';
