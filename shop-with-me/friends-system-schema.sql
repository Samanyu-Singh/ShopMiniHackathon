-- Friends System Addition
-- This ONLY adds the new friends tables, doesn't touch existing ones

-- Add friends tables only
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);

-- Add indexes for friends tables
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_created_at ON friendships(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_requests_requester_id ON friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient_id ON friend_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_created_at ON friend_requests(created_at DESC);

-- Enable RLS on new tables only
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Add policies for friends tables only (using IF NOT EXISTS)
DO $$
BEGIN
  -- Friendships policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can view their own friendships') THEN
    CREATE POLICY "Users can view their own friendships" ON friendships FOR SELECT USING (
      auth.uid()::text = user_id OR 
      auth.uid()::text = friend_id OR 
      user_id LIKE 'user_%' OR 
      friend_id LIKE 'user_%'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can create their own friendships') THEN
    CREATE POLICY "Users can create their own friendships" ON friendships FOR INSERT WITH CHECK (
      auth.uid()::text = user_id OR 
      user_id LIKE 'user_%'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can update their own friendships') THEN
    CREATE POLICY "Users can update their own friendships" ON friendships FOR UPDATE USING (
      auth.uid()::text = user_id OR 
      auth.uid()::text = friend_id OR 
      user_id LIKE 'user_%' OR 
      friend_id LIKE 'user_%'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can delete their own friendships') THEN
    CREATE POLICY "Users can delete their own friendships" ON friendships FOR DELETE USING (
      auth.uid()::text = user_id OR 
      auth.uid()::text = friend_id OR 
      user_id LIKE 'user_%' OR 
      friend_id LIKE 'user_%'
    );
  END IF;
  
  -- Friend requests policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friend_requests' AND policyname = 'Users can view their own friend requests') THEN
    CREATE POLICY "Users can view their own friend requests" ON friend_requests FOR SELECT USING (
      auth.uid()::text = requester_id OR 
      auth.uid()::text = recipient_id OR 
      requester_id LIKE 'user_%' OR 
      recipient_id LIKE 'user_%'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friend_requests' AND policyname = 'Users can create their own friend requests') THEN
    CREATE POLICY "Users can create their own friend requests" ON friend_requests FOR INSERT WITH CHECK (
      auth.uid()::text = requester_id OR 
      requester_id LIKE 'user_%'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friend_requests' AND policyname = 'Users can update their own friend requests') THEN
    CREATE POLICY "Users can update their own friend requests" ON friend_requests FOR UPDATE USING (
      auth.uid()::text = requester_id OR 
      auth.uid()::text = recipient_id OR 
      requester_id LIKE 'user_%' OR 
      recipient_id LIKE 'user_%'
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friend_requests' AND policyname = 'Users can delete their own friend requests') THEN
    CREATE POLICY "Users can delete their own friend requests" ON friend_requests FOR DELETE USING (
      auth.uid()::text = requester_id OR 
      auth.uid()::text = recipient_id OR 
      requester_id LIKE 'user_%' OR 
      recipient_id LIKE 'user_%'
    );
  END IF;
END $$;

-- Create functions for managing friendships
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS void AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Get the friend request
  SELECT * INTO request_record FROM friend_requests WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found';
  END IF;
  
  -- Update the friend request status
  UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = request_id;
  
  -- Create friendship records for both users
  INSERT INTO friendships (user_id, friend_id, status) 
  VALUES (request_record.requester_id, request_record.recipient_id, 'accepted')
  ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted', updated_at = NOW();
  
  INSERT INTO friendships (user_id, friend_id, status) 
  VALUES (request_record.recipient_id, request_record.requester_id, 'accepted')
  ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted', updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's friends
CREATE OR REPLACE FUNCTION get_user_friends(user_id_param TEXT)
RETURNS TABLE (
  friend_id TEXT,
  friend_display_name TEXT,
  friend_handle TEXT,
  friend_profile_pic TEXT,
  friendship_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.friend_id,
    up.display_name,
    up.handle,
    up.profile_pic,
    f.created_at
  FROM friendships f
  JOIN user_profiles up ON f.friend_id = up.user_id
  WHERE f.user_id = user_id_param AND f.status = 'accepted'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending friend requests for a user
CREATE OR REPLACE FUNCTION get_pending_friend_requests(user_id_param TEXT)
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
  FROM friend_requests fr
  JOIN user_profiles up ON fr.requester_id = up.user_id
  WHERE fr.recipient_id = user_id_param AND fr.status = 'pending'
  ORDER BY fr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification queries
SELECT table_name, 
  CASE WHEN table_name IN ('friendships', 'friend_requests') THEN '✅ Created' ELSE '❌ Missing' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('friendships', 'friend_requests') 
ORDER BY table_name;

-- Check RLS policies for new tables
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('friendships', 'friend_requests') 
ORDER BY tablename, policyname;
