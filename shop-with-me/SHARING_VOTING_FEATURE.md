# Sharing & Voting Feature

This feature allows users to share items from their saved collection and let other users vote on them.

## Features

### 🗳️ Community Voting Feed
- View items shared by other users
- Vote with like/dislike buttons
- Filter by "All", "Trending", or "Recent"
- Real-time vote count updates
- User profiles and timestamps

### 📤 Share Items
- Share button on each product in UserFeed
- Optional message when sharing
- Prevents duplicate shares
- Success/error notifications

### 🎯 User Experience
- Haptic feedback on interactions
- Smooth animations and transitions
- Loading states and skeleton screens
- Responsive design matching existing theme

## Components

### `SharedItemsFeed.tsx`
Main voting interface that displays:
- Shared items from all users
- User avatars and names
- Product images and details
- Like/dislike voting buttons
- Filter tabs (All/Trending/Recent)
- Empty state with call-to-action

### `ShareItemModal.tsx`
Modal for sharing items:
- Product preview
- Optional message input (200 char limit)
- Share/Cancel buttons
- Loading states
- Duplicate share prevention

### Modified Components
- `UserFeed.tsx` - Added share buttons to product cards
- `App.tsx` - Added voting route and floating bubble

## Database Schema

### `shared_items` table
```sql
- id (UUID, Primary Key)
- user_id (TEXT, Foreign Key to user_profiles)
- product_id (TEXT)
- product_data (JSONB)
- share_message (TEXT, optional)
- created_at (TIMESTAMP)
- is_active (BOOLEAN)
```

### `item_votes` table
```sql
- id (UUID, Primary Key)
- shared_item_id (UUID, Foreign Key to shared_items)
- voter_id (TEXT, Foreign Key to user_profiles)
- vote_type (TEXT, 'like' or 'dislike')
- created_at (TIMESTAMP)
- UNIQUE(shared_item_id, voter_id)
```

## User Flow

### Sharing an Item
1. User navigates to their saved products (UserFeed)
2. Clicks share button (📤) on any product card
3. Modal opens with product preview and message field
4. User adds optional message and clicks "Share Item"
5. Item appears in community voting feed

### Voting on Items
1. User clicks voting bubble (🗳️) on home screen
2. Sees feed of shared items from other users
3. Can filter by "Trending" or "Recent"
4. Clicks like/dislike buttons to vote
5. Vote counts update in real-time

## Technical Implementation

### State Management
- React state for UI interactions
- Optimistic updates for better UX
- Real-time database queries for vote counts

### Security
- Row Level Security (RLS) policies
- Users can only vote once per item
- Users can only delete their own shares
- Input validation and sanitization

### Performance
- Efficient database queries with indexes
- Lazy loading of images
- Debounced vote submissions
- Pagination ready for large datasets

## Setup Instructions

1. **Run Database Schema**
   ```sql
   -- Execute the SQL in shared-items-schema.sql
   ```

2. **Install Dependencies**
   ```bash
   npm install lucide-react
   ```

3. **Test the Feature**
   - Share items from your saved products
   - Vote on shared items
   - Test filtering and sorting

## Future Enhancements

- Comments on shared items
- Follow specific users' shares
- Share to external platforms
- Advanced analytics and insights
- Push notifications for trending items
- Batch sharing multiple items

## Integration with Existing Features

- Uses existing user authentication system
- Leverages current product data structure
- Maintains consistent theming and UX
- Integrates with haptic feedback system
- Follows existing component patterns
