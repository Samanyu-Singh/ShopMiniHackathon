-- Add Voting Tables Only - Safe for existing database
-- This ONLY adds the new voting feature tables
-- Run this in your Supabase SQL editor
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
-- INDEXES FOR NEW TABLES ONLY
-- ========================================

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
-- RLS FOR NEW TABLES ONLY
-- ========================================

-- Enable RLS on new tables only
ALTER TABLE shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_votes ENABLE ROW LEVEL SECURITY;

-- Shared items policies (only for new table)
CREATE POLICY IF NOT EXISTS "Users can view all shared items" ON shared_items FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can create their own shared items" ON shared_items FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'user_%');
CREATE POLICY IF NOT EXISTS "Users can update their own shared items" ON shared_items FOR UPDATE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');
CREATE POLICY IF NOT EXISTS "Users can delete their own shared items" ON shared_items FOR DELETE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');

-- Item votes policies (only for new table)
CREATE POLICY IF NOT EXISTS "Users can view all votes" ON item_votes FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can create their own votes" ON item_votes FOR INSERT WITH CHECK (auth.uid()::text = voter_id OR voter_id LIKE 'user_%');
CREATE POLICY IF NOT EXISTS "Users can update their own votes" ON item_votes FOR UPDATE USING (auth.uid()::text = voter_id OR voter_id LIKE 'user_%');
CREATE POLICY IF NOT EXISTS "Users can delete their own votes" ON item_votes FOR DELETE USING (auth.uid()::text = voter_id OR voter_id LIKE 'user_%');

-- ========================================
-- VERIFICATION
-- ========================================

-- Check if new tables were created successfully
SELECT table_name, 
  CASE WHEN table_name IN ('shared_items', 'item_votes') THEN '✅ Created' ELSE '❌ Missing' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('shared_items', 'item_votes') 
ORDER BY table_name;

-- Check RLS policies for new tables only
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('shared_items', 'item_votes') 
ORDER BY tablename, policyname;

-- Verify existing tables are still intact
SELECT table_name, 
  CASE WHEN table_name IN ('user_profiles', 'user_feed_items') THEN '✅ Existing' ELSE '❌ Missing' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'user_feed_items') 
ORDER BY table_name;

-- Success message
SELECT 'Voting tables added successfully!' as message;
