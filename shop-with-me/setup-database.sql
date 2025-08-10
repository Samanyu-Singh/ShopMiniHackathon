-- ========================================
-- SHOP WITH ME - COMPLETE DATABASE SETUP
-- ========================================
-- Run this in your Supabase SQL Editor to set up the complete database

-- ========================================
-- CORE USER PROFILES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  profile_pic TEXT,
  bio TEXT,
  gender_affinity TEXT,
  category_affinities TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_handle ON user_profiles(handle);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON user_profiles(last_active DESC);

-- ========================================
-- FOLLOWERS SYSTEM
-- ========================================

CREATE TABLE IF NOT EXISTS followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS follow_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);

-- Add indexes for followers
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_followed_at ON followers(followed_at DESC);

CREATE INDEX IF NOT EXISTS idx_follow_requests_requester_id ON follow_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_recipient_id ON follow_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_status ON follow_requests(status);
CREATE INDEX IF NOT EXISTS idx_follow_requests_created_at ON follow_requests(created_at DESC);

-- ========================================
-- USER FEED SYSTEM
-- ========================================

CREATE TABLE IF NOT EXISTS user_feed_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_data JSONB NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('saved', 'liked', 'shared', 'browsed', 'recommended')),
  source TEXT,
  interaction_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS user_shop_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  shop_id TEXT NOT NULL,
  shop_data JSONB NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('followed', 'browsed', 'purchased', 'saved')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, shop_id, interaction_type)
);

CREATE TABLE IF NOT EXISTS user_category_affinities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  affinity_score DECIMAL(3,2) DEFAULT 0.0,
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Add indexes for user feed system
CREATE INDEX IF NOT EXISTS idx_user_feed_items_user_id ON user_feed_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feed_items_activity_type ON user_feed_items(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_feed_items_created_at ON user_feed_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feed_items_is_active ON user_feed_items(is_active);

CREATE INDEX IF NOT EXISTS idx_user_shop_interactions_user_id ON user_shop_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shop_interactions_interaction_type ON user_shop_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_shop_interactions_created_at ON user_shop_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_category_affinities_user_id ON user_category_affinities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_affinities_affinity_score ON user_category_affinities(affinity_score DESC);

-- ========================================
-- SHARING & VOTING SYSTEM
-- ========================================

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

-- Add indexes for sharing & voting
CREATE INDEX IF NOT EXISTS idx_shared_items_user_id ON shared_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_items_created_at ON shared_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_items_is_active ON shared_items(is_active);
CREATE INDEX IF NOT EXISTS idx_shared_items_product_id ON shared_items(product_id);

CREATE INDEX IF NOT EXISTS idx_item_votes_shared_item_id ON item_votes(shared_item_id);
CREATE INDEX IF NOT EXISTS idx_item_votes_voter_id ON item_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_item_votes_vote_type ON item_votes(vote_type);
CREATE INDEX IF NOT EXISTS idx_item_votes_created_at ON item_votes(created_at DESC);

-- ========================================
-- DATABASE FUNCTIONS
-- ========================================

-- Get user followers
CREATE OR REPLACE FUNCTION get_user_followers(user_id_param TEXT)
RETURNS TABLE (
  follower_id TEXT,
  display_name TEXT,
  handle TEXT,
  profile_pic TEXT,
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
$$ LANGUAGE plpgsql;

-- Get user following
CREATE OR REPLACE FUNCTION get_user_following(user_id_param TEXT)
RETURNS TABLE (
  following_id TEXT,
  display_name TEXT,
  handle TEXT,
  profile_pic TEXT,
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
$$ LANGUAGE plpgsql;

-- Get pending follow requests
CREATE OR REPLACE FUNCTION get_pending_follow_requests(user_id_param TEXT)
RETURNS TABLE (
  requester_id TEXT,
  display_name TEXT,
  handle TEXT,
  profile_pic TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fr.requester_id,
    up.display_name,
    up.handle,
    up.profile_pic,
    fr.created_at
  FROM follow_requests fr
  JOIN user_profiles up ON fr.requester_id = up.user_id
  WHERE fr.recipient_id = user_id_param
    AND fr.status = 'pending'
  ORDER BY fr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Get user curated feed
CREATE OR REPLACE FUNCTION get_user_curated_feed(user_id_param TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  product_id TEXT,
  product_data JSONB,
  activity_type TEXT,
  source TEXT,
  interaction_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ufi.id,
    ufi.user_id,
    ufi.product_id,
    ufi.product_data,
    ufi.activity_type,
    ufi.source,
    ufi.interaction_data,
    ufi.created_at
  FROM user_feed_items ufi
  WHERE ufi.user_id = user_id_param
    AND ufi.is_active = true
  ORDER BY 
    CASE ufi.activity_type
      WHEN 'shared' THEN 1
      WHEN 'saved' THEN 2
      WHEN 'liked' THEN 3
      WHEN 'recommended' THEN 4
      WHEN 'browsed' THEN 5
      ELSE 6
    END,
    ufi.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get user top categories
CREATE OR REPLACE FUNCTION get_user_top_categories(user_id_param TEXT, limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  category TEXT,
  affinity_score DECIMAL(3,2),
  interaction_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uca.category,
    uca.affinity_score,
    uca.interaction_count
  FROM user_category_affinities uca
  WHERE uca.user_id = user_id_param
  ORDER BY uca.affinity_score DESC, uca.interaction_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Update user category affinity
CREATE OR REPLACE FUNCTION update_user_category_affinity(
  user_id_param TEXT,
  category_param TEXT,
  interaction_weight DECIMAL(3,2) DEFAULT 0.1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_category_affinities (user_id, category, affinity_score, interaction_count, last_interaction)
  VALUES (user_id_param, category_param, interaction_weight, 1, NOW())
  ON CONFLICT (user_id, category)
  DO UPDATE SET
    affinity_score = user_category_affinities.affinity_score + interaction_weight,
    interaction_count = user_category_affinities.interaction_count + 1,
    last_interaction = NOW();
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Insert sample users
INSERT INTO user_profiles (user_id, display_name, handle, bio) VALUES
('user_samanyu', 'Samanyu', 'samanyu', 'Fashion enthusiast and style curator'),
('user_revant', 'Revant', 'revant', 'Tech lover and shopping expert'),
('user_alex', 'Alex', 'alex', 'Minimalist fashion lover')
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample followers
INSERT INTO followers (follower_id, following_id) VALUES
('user_revant', 'user_samanyu'),
('user_alex', 'user_samanyu'),
('user_samanyu', 'user_revant')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Insert sample feed items
INSERT INTO user_feed_items (user_id, product_id, product_data, activity_type, source) VALUES
('user_samanyu', 'prod_1', '{"title": "Y29 Ultra Heavy Org", "price": {"amount": "39.00", "currencyCode": "USD"}, "images": [{"url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=1"}]}', 'saved', 'manual_save'),
('user_samanyu', 'prod_2', '{"title": "Parfums de Marly La", "price": {"amount": "9.79", "currencyCode": "USD"}, "images": [{"url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=2"}]}', 'saved', 'manual_save'),
('user_samanyu', 'prod_3', '{"title": "INFANTRY TEE (HEA", "price": {"amount": "28.00", "currencyCode": "USD"}, "images": [{"url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=3"}]}', 'liked', 'shopify_like'),
('user_revant', 'prod_4', '{"title": "Tech Gadget Pro", "price": {"amount": "199.99", "currencyCode": "USD"}, "images": [{"url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=4"}]}', 'saved', 'manual_save'),
('user_revant', 'prod_5', '{"title": "Wireless Headphones", "price": {"amount": "89.99", "currencyCode": "USD"}, "images": [{"url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=5"}]}', 'recommended', 'shopify_recommendations')
ON CONFLICT (user_id, product_id) DO NOTHING;

-- Insert sample category affinities
INSERT INTO user_category_affinities (user_id, category, affinity_score, interaction_count) VALUES
('user_samanyu', 'Fashion', 0.8, 15),
('user_samanyu', 'Beauty', 0.6, 8),
('user_revant', 'Electronics', 0.9, 20),
('user_revant', 'Technology', 0.7, 12),
('user_alex', 'Minimalist', 0.8, 10)
ON CONFLICT (user_id, category) DO NOTHING;

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shop_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_category_affinities ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_votes ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can manage their own profile" ON user_profiles FOR ALL USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');

-- Create policies for followers
CREATE POLICY "Users can view all followers" ON followers FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON followers FOR ALL USING (auth.uid()::text = follower_id OR follower_id LIKE 'user_%');

-- Create policies for follow_requests
CREATE POLICY "Users can view their own requests" ON follow_requests FOR SELECT USING (auth.uid()::text = requester_id OR auth.uid()::text = recipient_id OR requester_id LIKE 'user_%' OR recipient_id LIKE 'user_%');
CREATE POLICY "Users can manage their own requests" ON follow_requests FOR ALL USING (auth.uid()::text = requester_id OR requester_id LIKE 'user_%');

-- Create policies for user_feed_items
CREATE POLICY "Users can view all feed items" ON user_feed_items FOR SELECT USING (true);
CREATE POLICY "Users can manage their own feed items" ON user_feed_items FOR ALL USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');

-- Create policies for user_shop_interactions
CREATE POLICY "Users can view all shop interactions" ON user_shop_interactions FOR SELECT USING (true);
CREATE POLICY "Users can manage their own shop interactions" ON user_shop_interactions FOR ALL USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');

-- Create policies for user_category_affinities
CREATE POLICY "Users can view all category affinities" ON user_category_affinities FOR SELECT USING (true);
CREATE POLICY "Users can manage their own category affinities" ON user_category_affinities FOR ALL USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');

-- Create policies for shared_items
CREATE POLICY "Users can view all shared items" ON shared_items FOR SELECT USING (true);
CREATE POLICY "Users can manage their own shared items" ON shared_items FOR ALL USING (auth.uid()::text = user_id OR user_id LIKE 'user_%');

-- Create policies for item_votes
CREATE POLICY "Users can view all votes" ON item_votes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own votes" ON item_votes FOR ALL USING (auth.uid()::text = voter_id OR voter_id LIKE 'user_%');

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

-- This will show when the script completes successfully
DO $$
BEGIN
  RAISE NOTICE '✅ Database setup completed successfully!';
  RAISE NOTICE '📊 Tables created: user_profiles, followers, follow_requests, user_feed_items, user_shop_interactions, user_category_affinities, shared_items, item_votes';
  RAISE NOTICE '🔧 Functions created: get_user_followers, get_user_following, get_pending_follow_requests, get_user_curated_feed, get_user_top_categories, update_user_category_affinity';
  RAISE NOTICE '👥 Sample data inserted for testing';
  RAISE NOTICE '🔒 Row Level Security enabled on all tables';
END $$;
