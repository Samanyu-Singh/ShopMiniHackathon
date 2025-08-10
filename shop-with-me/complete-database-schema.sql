-- Complete Database Schema for Shop Mini App with Voting Feature
-- Run this ENTIRE SQL in your Supabase SQL editor
-- This includes both original functionality and new voting feature
-- ========================================

-- ========================================
-- ORIGINAL TABLES (User Profiles & Feeds)
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
-- NEW VOTING FEATURE TABLES
-- ========================================

-- Shared items table (items users explicitly share for voting)
CREATE TABLE IF NOT EXISTS shared_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_data JSONB NOT NULL,
  share_message TEXT, -- Optional message when sharing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Votes table (user votes on shared items)
CREATE TABLE IF NOT EXISTS item_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_item_id UUID NOT NULL REFERENCES shared_items(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shared_item_id, voter_id) -- One vote per user per item
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

-- Shared items indexes
CREATE INDEX IF NOT EXISTS idx_shared_items_user_id ON shared_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_items_created_at ON shared_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_items_is_active ON shared_items(is_active);
CREATE INDEX IF NOT EXISTS idx_shared_items_product_id ON shared_items(product_id);

-- Item votes indexes
CREATE INDEX IF NOT EXISTS idx_item_votes_shared_item_id ON item_votes(shared_item_id);
CREATE INDEX IF NOT EXISTS idx_item_votes_voter_id ON item_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_item_votes_vote_type ON item_votes(vote_type);
CREATE INDEX IF NOT EXISTS idx_item_votes_created_at ON item_votes(created_at DESC);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_votes ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can create their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'user_%');
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');

-- User feed items policies
CREATE POLICY "Users can view all feed items" ON user_feed_items FOR SELECT USING (true);
CREATE POLICY "Users can create their own feed items" ON user_feed_items FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'user_%');
CREATE POLICY "Users can update their own feed items" ON user_feed_items FOR UPDATE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');
CREATE POLICY "Users can delete their own feed items" ON user_feed_items FOR DELETE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');

-- Shared items policies
CREATE POLICY "Users can view all shared items" ON shared_items FOR SELECT USING (true);
CREATE POLICY "Users can create their own shared items" ON shared_items FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'user_%');
CREATE POLICY "Users can update their own shared items" ON shared_items FOR UPDATE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');
CREATE POLICY "Users can delete their own shared items" ON shared_items FOR DELETE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');

-- Item votes policies
CREATE POLICY "Users can view all votes" ON item_votes FOR SELECT USING (true);
CREATE POLICY "Users can create their own votes" ON item_votes FOR INSERT WITH CHECK (auth.uid()::text = voter_id OR voter_id LIKE 'user_%');
CREATE POLICY "Users can update their own votes" ON item_votes FOR UPDATE USING (auth.uid()::text = voter_id OR voter_id LIKE 'user_%');
CREATE POLICY "Users can delete their own votes" ON item_votes FOR DELETE USING (auth.uid()::text = voter_id OR voter_id LIKE 'user_%');

-- ========================================
-- SAMPLE DATA (Optional - for testing)
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

-- Check if all tables were created successfully
SELECT table_name, 
  CASE 
    WHEN table_name IN ('user_profiles', 'user_feed_items') THEN '✅ Original'
    WHEN table_name IN ('shared_items', 'item_votes') THEN '✅ Voting Feature'
    ELSE '❌ Unknown'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'user_feed_items', 'shared_items', 'item_votes') 
ORDER BY table_name;

-- Check RLS policies for all tables
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('user_profiles', 'user_feed_items', 'shared_items', 'item_votes') 
ORDER BY tablename, policyname;

-- Summary of what was created
SELECT 
  'Database Setup Complete!' as message,
  'Original Features: User profiles, feed items' as original_features,
  'New Features: Shared items, voting system' as new_features;
