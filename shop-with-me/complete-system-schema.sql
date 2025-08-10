-- Complete System Schema
-- This includes both voting tables and follower system
-- Safe to run multiple times - uses IF NOT EXISTS throughout

-- ========================================
-- VOTING SYSTEM TABLES
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

-- Enable RLS on voting tables
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

-- ========================================
-- FOLLOWER SYSTEM TABLES
-- ========================================

-- Add bio column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'bio') THEN
    ALTER TABLE user_profiles ADD COLUMN bio TEXT;
  END IF;
END $$;

-- Add followers table for one-way follow system
CREATE TABLE IF NOT EXISTS followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Add follow requests table for pending requests
CREATE TABLE IF NOT EXISTS follow_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for follower tables
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_followed_at ON followers(followed_at DESC);

CREATE INDEX IF NOT EXISTS idx_follow_requests_requester_id ON follow_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_recipient_id ON follow_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_status ON follow_requests(status);
CREATE INDEX IF NOT EXISTS idx_follow_requests_created_at ON follow_requests(created_at DESC);

-- Enable RLS on follower tables
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;

-- Add policies for follower tables only (using IF NOT EXISTS)
DO $$
BEGIN
  -- Followers policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'followers' AND policyname = 'Users can view all followers') THEN
    CREATE POLICY "Users can view all followers" ON followers FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'followers' AND policyname = 'Users can create their own follows') THEN
    CREATE POLICY "Users can create their own follows" ON followers FOR INSERT WITH CHECK (
      auth.uid()::text = follower_id OR 
      follower_id LIKE 'user_%'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'followers' AND policyname = 'Users can delete their own follows') THEN
    CREATE POLICY "Users can delete their own follows" ON followers FOR DELETE USING (
      auth.uid()::text = follower_id OR 
      follower_id LIKE 'user_%'
    );
  END IF;
  
  -- Follow requests policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_requests' AND policyname = 'Users can view their own follow requests') THEN
    CREATE POLICY "Users can view their own follow requests" ON follow_requests FOR SELECT USING (
      auth.uid()::text = requester_id OR 
      auth.uid()::text = recipient_id OR 
      requester_id LIKE 'user_%' OR 
      recipient_id LIKE 'user_%'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_requests' AND policyname = 'Users can create their own follow requests') THEN
    CREATE POLICY "Users can create their own follow requests" ON follow_requests FOR INSERT WITH CHECK (
      auth.uid()::text = requester_id OR 
      requester_id LIKE 'user_%'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_requests' AND policyname = 'Users can update their own follow requests') THEN
    CREATE POLICY "Users can update their own follow requests" ON follow_requests FOR UPDATE USING (
      auth.uid()::text = requester_id OR 
      auth.uid()::text = recipient_id OR 
      requester_id LIKE 'user_%' OR 
      recipient_id LIKE 'user_%'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_requests' AND policyname = 'Users can delete their own follow requests') THEN
    CREATE POLICY "Users can delete their own follow requests" ON follow_requests FOR DELETE USING (
      auth.uid()::text = requester_id OR 
      auth.uid()::text = recipient_id OR 
      requester_id LIKE 'user_%' OR 
      recipient_id LIKE 'user_%'
    );
  END IF;
END $$;

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get user's followers
CREATE OR REPLACE FUNCTION get_user_followers(user_id_param TEXT)
RETURNS TABLE (
  follower_id TEXT,
  follower_display_name TEXT,
  follower_handle TEXT,
  follower_profile_pic TEXT,
  followed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.follower_id,
    up.display_name,
    up.handle,
    up.profile_pic,
    f.followed_at
  FROM followers f
  JOIN user_profiles up ON f.follower_id = up.user_id
  WHERE f.following_id = user_id_param
  ORDER BY f.followed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users that a user is following
CREATE OR REPLACE FUNCTION get_user_following(user_id_param TEXT)
RETURNS TABLE (
  following_id TEXT,
  following_display_name TEXT,
  following_handle TEXT,
  following_profile_pic TEXT,
  followed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.following_id,
    up.display_name,
    up.handle,
    up.profile_pic,
    f.followed_at
  FROM followers f
  JOIN user_profiles up ON f.following_id = up.user_id
  WHERE f.follower_id = user_id_param
  ORDER BY f.followed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending follow requests for a user
CREATE OR REPLACE FUNCTION get_pending_follow_requests(user_id_param TEXT)
RETURNS TABLE (
  request_id UUID,
  requester_id TEXT,
  requester_display_name TEXT,
  requester_handle TEXT,
  requester_profile_pic TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fr.id,
    fr.requester_id,
    up.display_name,
    up.handle,
    up.profile_pic,
    fr.message,
    fr.created_at
  FROM follow_requests fr
  JOIN user_profiles up ON fr.requester_id = up.user_id
  WHERE fr.recipient_id = user_id_param AND fr.status = 'pending'
  ORDER BY fr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check if all tables were created successfully
SELECT table_name, 
  CASE WHEN table_name IN ('shared_items', 'item_votes', 'followers', 'follow_requests') THEN '✅ Created' ELSE '❌ Missing' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('shared_items', 'item_votes', 'followers', 'follow_requests') 
ORDER BY table_name;

-- Check RLS policies for all new tables
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('shared_items', 'item_votes', 'followers', 'follow_requests') 
ORDER BY tablename, policyname;
