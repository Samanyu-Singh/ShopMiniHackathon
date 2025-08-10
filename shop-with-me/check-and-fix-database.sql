-- Database Diagnostic and Fix Script
-- Run this to check what's wrong and fix it
-- ========================================

-- First, let's see what tables currently exist
SELECT 'CURRENT TABLES:' as info;
SELECT table_name, 
  CASE 
    WHEN table_name IN ('user_profiles', 'user_feed_items') THEN '✅ Original Tables'
    WHEN table_name IN ('shared_items', 'item_votes') THEN '✅ Voting Tables'
    ELSE '❓ Unknown Table'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'user_feed_items', 'shared_items', 'item_votes')
ORDER BY table_name;

-- Check if original tables exist
SELECT 'ORIGINAL TABLES STATUS:' as info;
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN '✅ user_profiles exists' ELSE '❌ user_profiles missing' END as user_profiles_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_feed_items') THEN '✅ user_feed_items exists' ELSE '❌ user_feed_items missing' END as user_feed_items_status;

-- Check RLS policies
SELECT 'RLS POLICIES:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('user_profiles', 'user_feed_items', 'shared_items', 'item_votes')
ORDER BY tablename, policyname;

-- Check if RLS is enabled on original tables
SELECT 'RLS STATUS:' as info;
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_profiles', 'user_feed_items');

-- If original tables are missing, recreate them
DO $$
BEGIN
  -- Check if user_profiles exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    RAISE NOTICE 'Creating missing user_profiles table...';
    
    CREATE TABLE user_profiles (
      user_id TEXT PRIMARY KEY,
      handle TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      profile_pic TEXT,
      gender_affinity TEXT,
      category_affinities TEXT[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX idx_user_profiles_handle ON user_profiles(handle);
    CREATE INDEX idx_user_profiles_last_active ON user_profiles(last_active DESC);
    
    -- Enable RLS
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
    CREATE POLICY "Users can create their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'user_%');
    CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');
    
    RAISE NOTICE 'user_profiles table created successfully!';
  ELSE
    RAISE NOTICE 'user_profiles table already exists.';
  END IF;
  
  -- Check if user_feed_items exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_feed_items') THEN
    RAISE NOTICE 'Creating missing user_feed_items table...';
    
    CREATE TABLE user_feed_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_data JSONB NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('recommended_products', 'recommended_shops', 'product_lists', 'followed_shops', 'saved_products')),
      added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, product_id, source)
    );
    
    -- Create indexes
    CREATE INDEX idx_user_feed_items_user_id ON user_feed_items(user_id);
    CREATE INDEX idx_user_feed_items_source ON user_feed_items(source);
    CREATE INDEX idx_user_feed_items_added_at ON user_feed_items(added_at DESC);
    
    -- Enable RLS
    ALTER TABLE user_feed_items ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view all feed items" ON user_feed_items FOR SELECT USING (true);
    CREATE POLICY "Users can create their own feed items" ON user_feed_items FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'user_%');
    CREATE POLICY "Users can update their own feed items" ON user_feed_items FOR UPDATE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');
    CREATE POLICY "Users can delete their own feed items" ON user_feed_items FOR DELETE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');
    
    RAISE NOTICE 'user_feed_items table created successfully!';
  ELSE
    RAISE NOTICE 'user_feed_items table already exists.';
  END IF;
END $$;

-- Final verification
SELECT 'FINAL VERIFICATION:' as info;
SELECT table_name, 
  CASE 
    WHEN table_name IN ('user_profiles', 'user_feed_items') THEN '✅ Original Tables'
    WHEN table_name IN ('shared_items', 'item_votes') THEN '✅ Voting Tables'
    ELSE '❓ Unknown Table'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'user_feed_items', 'shared_items', 'item_votes')
ORDER BY table_name;

-- Check if we can query the tables
SELECT 'TESTING QUERIES:' as info;
SELECT 'user_profiles count:' as test, COUNT(*) as result FROM user_profiles;
SELECT 'user_feed_items count:' as test, COUNT(*) as result FROM user_feed_items;
