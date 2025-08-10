-- Sample Data for Testing Friends Functionality
-- Run this in your Supabase SQL editor after running the main schema

-- Insert sample user profiles
INSERT INTO user_profiles (user_id, handle, display_name, created_at, last_active) VALUES
  ('user_revant', 'revant', 'Revant', NOW(), NOW()),
  ('user_samanyu', 'samanyu', 'Samanyu', NOW(), NOW()),
  ('user_satvik', 'satvik', 'Satvik', NOW(), NOW()),
  ('user_john', 'john', 'John Doe', NOW(), NOW()),
  ('user_jane', 'jane', 'Jane Smith', NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample friendships (assuming current user is 'user_revant')
INSERT INTO friendships (user_id, friend_id, status, created_at, updated_at) VALUES
  ('user_revant', 'user_samanyu', 'accepted', NOW(), NOW()),
  ('user_samanyu', 'user_revant', 'accepted', NOW(), NOW()),
  ('user_revant', 'user_satvik', 'accepted', NOW(), NOW()),
  ('user_satvik', 'user_revant', 'accepted', NOW(), NOW()),
  ('user_samanyu', 'user_satvik', 'accepted', NOW(), NOW()),
  ('user_satvik', 'user_samanyu', 'accepted', NOW(), NOW())
ON CONFLICT (user_id, friend_id) DO NOTHING;

-- Insert sample feed items for each user
INSERT INTO user_feed_items (user_id, product_id, product_data, source, added_at) VALUES
  ('user_samanyu', 'product_1', '{"id": "product_1", "title": "Grey Sweatpants", "price": {"amount": "29.99", "currencyCode": "USD"}, "images": [{"url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=1", "altText": "Grey Sweatpants"}]}', 'saved_products', NOW()),
  ('user_samanyu', 'product_2', '{"id": "product_2", "title": "Perfume Collection", "price": {"amount": "89.99", "currencyCode": "USD"}, "images": [{"url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=2", "altText": "Perfume Collection"}]}', 'recommended_products', NOW()),
  ('user_satvik', 'product_3', '{"id": "product_3", "title": "Wireless Headphones", "price": {"amount": "199.99", "currencyCode": "USD"}, "images": [{"url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=3", "altText": "Wireless Headphones"}]}', 'saved_products', NOW()),
  ('user_satvik', 'product_4', '{"id": "product_4", "title": "Smart Watch", "price": {"amount": "299.99", "currencyCode": "USD"}, "images": [{"url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=4", "altText": "Smart Watch"}]}', 'product_lists', NOW()),
  ('user_john', 'product_5', '{"id": "product_5", "title": "Running Shoes", "price": {"amount": "129.99", "currencyCode": "USD"}, "images": [{"url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=5", "altText": "Running Shoes"}]}', 'saved_products', NOW()),
  ('user_jane', 'product_6', '{"id": "product_6", "title": "Designer Bag", "price": {"amount": "399.99", "currencyCode": "USD"}, "images": [{"url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=6", "altText": "Designer Bag"}]}', 'recommended_products', NOW())
ON CONFLICT (user_id, product_id, source) DO NOTHING;

-- Insert sample shared items for voting
INSERT INTO shared_items (user_id, product_id, product_data, share_message, created_at, is_active) VALUES
  ('user_samanyu', 'product_1', '{"id": "product_1", "title": "Grey Sweatpants", "price": {"amount": "29.99", "currencyCode": "USD"}, "images": [{"url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=1", "altText": "Grey Sweatpants"}]}', 'Should I buy these sweatpants?', NOW(), true),
  ('user_satvik', 'product_3', '{"id": "product_3", "title": "Wireless Headphones", "price": {"amount": "199.99", "currencyCode": "USD"}, "images": [{"url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=3", "altText": "Wireless Headphones"}]}', 'Are these headphones worth it?', NOW(), true)
ON CONFLICT DO NOTHING;

-- Insert sample votes
INSERT INTO item_votes (shared_item_id, voter_id, vote_type, created_at) VALUES
  ((SELECT id FROM shared_items WHERE user_id = 'user_samanyu' LIMIT 1), 'user_revant', 'like', NOW()),
  ((SELECT id FROM shared_items WHERE user_id = 'user_satvik' LIMIT 1), 'user_revant', 'dislike', NOW())
ON CONFLICT (shared_item_id, voter_id) DO NOTHING;

-- Verification queries
SELECT 'User Profiles' as table_name, COUNT(*) as count FROM user_profiles
UNION ALL
SELECT 'Friendships' as table_name, COUNT(*) as count FROM friendships
UNION ALL
SELECT 'Feed Items' as table_name, COUNT(*) as count FROM user_feed_items
UNION ALL
SELECT 'Shared Items' as table_name, COUNT(*) as count FROM shared_items
UNION ALL
SELECT 'Votes' as table_name, COUNT(*) as count FROM item_votes;
