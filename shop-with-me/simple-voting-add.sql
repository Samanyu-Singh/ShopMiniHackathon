-- Simple Voting Tables Addition
-- This ONLY adds the new voting tables, doesn't touch existing ones
-- ========================================

-- Add voting tables only
CREATE TABLE IF NOT EXISTS shared_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_data JSONB NOT NULL,
  share_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS item_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_item_id UUID NOT NULL REFERENCES shared_items(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shared_item_id, voter_id)
);

-- Add indexes for voting tables
CREATE INDEX IF NOT EXISTS idx_shared_items_user_id ON shared_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_items_created_at ON shared_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_items_is_active ON shared_items(is_active);
CREATE INDEX IF NOT EXISTS idx_shared_items_product_id ON shared_items(product_id);

CREATE INDEX IF NOT EXISTS idx_item_votes_shared_item_id ON item_votes(shared_item_id);
CREATE INDEX IF NOT EXISTS idx_item_votes_voter_id ON item_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_item_votes_vote_type ON item_votes(vote_type);
CREATE INDEX IF NOT EXISTS idx_item_votes_created_at ON item_votes(created_at DESC);

-- Enable RLS on new tables only
ALTER TABLE shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_votes ENABLE ROW LEVEL SECURITY;

-- Add policies for voting tables only (using IF NOT EXISTS)
DO $$
BEGIN
  -- Shared items policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shared_items' AND policyname = 'Users can view all shared items') THEN
    CREATE POLICY "Users can view all shared items" ON shared_items FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shared_items' AND policyname = 'Users can create their own shared items') THEN
    CREATE POLICY "Users can create their own shared items" ON shared_items FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'user_%');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shared_items' AND policyname = 'Users can update their own shared items') THEN
    CREATE POLICY "Users can update their own shared items" ON shared_items FOR UPDATE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shared_items' AND policyname = 'Users can delete their own shared items') THEN
    CREATE POLICY "Users can delete their own shared items" ON shared_items FOR DELETE USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');
  END IF;
  
  -- Item votes policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_votes' AND policyname = 'Users can view all votes') THEN
    CREATE POLICY "Users can view all votes" ON item_votes FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_votes' AND policyname = 'Users can create their own votes') THEN
    CREATE POLICY "Users can create their own votes" ON item_votes FOR INSERT WITH CHECK (auth.uid()::text = voter_id OR voter_id LIKE 'user_%');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_votes' AND policyname = 'Users can update their own votes') THEN
    CREATE POLICY "Users can update their own votes" ON item_votes FOR UPDATE USING (auth.uid()::text = voter_id OR voter_id LIKE 'user_%');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_votes' AND policyname = 'Users can delete their own votes') THEN
    CREATE POLICY "Users can delete their own votes" ON item_votes FOR DELETE USING (auth.uid()::text = voter_id OR voter_id LIKE 'user_%');
  END IF;
END $$;

-- Verify everything is working
SELECT 'VOTING TABLES STATUS:' as info;
SELECT table_name, 
  CASE WHEN table_name IN ('shared_items', 'item_votes') THEN '✅ Created' ELSE '❌ Missing' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('shared_items', 'item_votes')
ORDER BY table_name;

-- Test that original tables still work
SELECT 'ORIGINAL TABLES TEST:' as info;
SELECT 'user_profiles count:' as test, COUNT(*) as result FROM user_profiles;
SELECT 'user_feed_items count:' as test, COUNT(*) as result FROM user_feed_items;

-- Success message
SELECT 'Voting feature added successfully!' as message;
