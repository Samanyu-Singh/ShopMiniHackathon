# Database Setup Guide

## 🚀 Quick Setup

### Step 1: Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run the Database Schema
1. Copy the entire contents of `setup-database.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute the script

### Step 3: Verify Setup
After running the script, you should see:
- ✅ Database setup completed successfully!
- 📊 Tables created: user_profiles, followers, follow_requests, user_feed_items, user_shop_interactions, user_category_affinities, shared_items, item_votes
- 🔧 Functions created: get_user_followers, get_user_following, get_pending_follow_requests, get_user_curated_feed, get_user_top_categories, update_user_category_affinity
- 👥 Sample data inserted for testing
- 🔒 Row Level Security enabled on all tables

## 📋 What Gets Created

### Core Tables
- **user_profiles** - User profile information
- **followers** - Following relationships
- **follow_requests** - Follow request management
- **user_feed_items** - Curated feed items for each user
- **user_shop_interactions** - Shop interaction tracking
- **user_category_affinities** - User category preferences
- **shared_items** - Shared product items
- **item_votes** - Voting system for shared items

### Database Functions
- **get_user_curated_feed()** - Returns curated feed for a user
- **get_user_top_categories()** - Returns user's top categories
- **update_user_category_affinity()** - Updates category preferences
- **get_user_followers()** - Returns user's followers
- **get_user_following()** - Returns users being followed
- **get_pending_follow_requests()** - Returns pending follow requests

### Sample Data
- 3 test users: Samanyu, Revant, Alex
- Sample followers relationships
- Sample feed items with different activity types
- Sample category affinities

## 🔧 How the Feed System Works

### When a User Logs In:
1. **useUserFeedSync** hook automatically triggers
2. **Shopify hooks** load user's data:
   - `useRecommendedProducts()` - Gets recommended products
   - `useSavedProducts()` - Gets saved products  
   - `useFollowedShops()` - Gets followed shops
3. **UserFeedService** syncs data to database:
   - Creates/updates user profile
   - Adds recommended products to feed
   - Adds saved products to feed
   - Adds followed shops to interactions
4. **Category affinities** are updated based on interactions

### When Viewing a Friend's Feed:
1. **UserFeed component** loads specific user's profile
2. **UserFeedService.getCuratedFeed()** fetches their curated products
3. **Products are displayed** with activity type indicators:
   - 🟢 Saved products
   - 🔵 Shared products
   - 🟣 Liked products
   - 🟠 Recommended products
   - ⚫ Browsed products

## 🎯 Activity Types & Weights

The system prioritizes feed items by activity type:
1. **Shared** (weight: 0.3) - Highest priority
2. **Saved** (weight: 0.2) - High priority
3. **Liked** (weight: 0.15) - Medium priority
4. **Recommended** (weight: 0.1) - Lower priority
5. **Browsed** (weight: 0.05) - Lowest priority

## 🔒 Security

- **Row Level Security (RLS)** enabled on all tables
- **Policies** allow users to view all data but only manage their own
- **User ID format**: `user_{displayName.toLowerCase().replace(/\s+/g, '_')}`

## 🧪 Testing

After setup, you can test with the sample users:
- **Samanyu** (`user_samanyu`) - Has 3 feed items
- **Revant** (`user_revant`) - Has 2 feed items  
- **Alex** (`user_alex`) - Has 0 feed items

## 🚨 Troubleshooting

### If you get errors:
1. **Check Supabase connection** - Ensure your project is active
2. **Verify environment variables** - Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
3. **Check console logs** - Look for database connection errors
4. **Verify RLS policies** - Ensure policies are created correctly

### Common Issues:
- **"relation does not exist"** - Tables weren't created, re-run the script
- **"permission denied"** - RLS policies not set up correctly
- **"function does not exist"** - Functions weren't created, re-run the script

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all tables exist in Supabase Table Editor
3. Test the functions in Supabase SQL Editor
4. Ensure your environment variables are set correctly
