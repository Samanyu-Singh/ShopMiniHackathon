-- Original Database Setup for Shop Mini App (Before Stories Feature)
-- Run these SQL commands in your Supabase SQL editor
-- ========================================

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  profile_pic TEXT,
  gender_affinity TEXT,
  category_affinities TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User feed items table
CREATE TABLE IF NOT EXISTS user_feed_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_data JSONB NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('recommended_products', 'recommended_shops', 'product_lists', 'followed_shops', 'saved_products')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id, source)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_handle ON user_profiles(handle);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON user_profiles(last_active DESC);

-- User feed items indexes
CREATE INDEX IF NOT EXISTS idx_user_feed_items_user_id ON user_feed_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feed_items_source ON user_feed_items(source);
CREATE INDEX IF NOT EXISTS idx_user_feed_items_added_at ON user_feed_items(added_at DESC);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feed_items ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can create their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'user_%');
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');

-- User feed items policies
CREATE POLICY "Users can view all feed items" ON user_feed_items FOR SELECT USING (true);
CREATE POLICY "Users can create their own feed items" ON user_feed_items FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'user_%');
CREATE POLICY "Users can update their own feed items" ON user_feed_items FOR UPDATE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');
CREATE POLICY "Users can delete their own feed items" ON user_feed_items FOR DELETE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');

-- ========================================
-- SAMPLE DATA (Optional)
-- ========================================

-- Insert sample user profiles (uncomment if you want sample data)
/*
INSERT INTO user_profiles (user_id, handle, display_name, created_at, last_active) VALUES 
  ('user_john_doe', 'johndoe', 'John Doe', NOW(), NOW()),
  ('user_jane_smith', 'janesmith', 'Jane Smith', NOW(), NOW()),
  ('user_bob_wilson', 'bobwilson', 'Bob Wilson', NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;
*/

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check if tables were created successfully
SELECT table_name, 
  CASE WHEN table_name IN ('user_profiles', 'user_feed_items') THEN '✅ Created' ELSE '❌ Missing' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'user_feed_items') 
ORDER BY table_name;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('user_profiles', 'user_feed_items') 
ORDER BY tablename, policyname;
