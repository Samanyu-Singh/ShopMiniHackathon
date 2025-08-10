import {useState, useCallback, useEffect, useMemo} from 'react'
import {Button, Avatar, AvatarImage, AvatarFallback, Touchable, Card, CardContent, Toaster, useCurrentUser} from '@shopify/shop-minis-react'
import {Heart, ThumbsDown, Share2, TrendingUp, Clock, Trash2} from 'lucide-react'
import {ThemeToggle} from './ThemeToggle'
import {supabase} from '../lib/supa'

type SharedItem = {
  id: string
  user_id: string
  product_id: string
  product_data: {
    id: string
    title: string
    description?: string
    price?: {
      amount: string
      currencyCode: string
    }
    images?: Array<{
      url: string
      altText?: string
    }>
    shop?: {
      id: string
      name?: string
    }
  }
  share_message?: string
  created_at: string
  like_count: number
  dislike_count: number
  user_vote?: 'like' | 'dislike' | null
  user_profile?: {
    display_name: string
    profile_pic?: string
    handle: string
  }
}

type FilterType = 'all' | 'trending' | 'recent'

type Props = {
  onBack: () => void
  onShareItem: () => void
  currentUserId: string
  isDarkMode: boolean
  onToggleDarkMode: () => void
}

export function SharedItemsFeed({onBack, onShareItem, currentUserId, isDarkMode, onToggleDarkMode}: Props) {
  const {currentUser} = useCurrentUser()
  console.log('🎯 SharedItemsFeed component rendered!')
  console.log('Props:', { onBack, onShareItem, currentUserId })
  
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  // Haptic feedback function
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }, [])

  // Delete shared item function
  const handleDeleteItem = useCallback(async (itemId: string) => {
    console.log('🗑️ Delete attempt:', { itemId, currentUserId })

    if (!currentUserId) {
      console.error('❌ No current user ID available for deletion')
      return
    }

    triggerHaptic()

    try {
      // Check if the item belongs to the current user
      const item = sharedItems.find(i => i.id === itemId)
      if (!item) {
        console.error('❌ Item not found for deletion:', itemId)
        return
      }

      if (item.user_id !== currentUserId) {
        console.error('❌ User can only delete their own items')
        return
      }

      // Optimistic update - remove from UI immediately
      setSharedItems(prev => prev.filter(i => i.id !== itemId))

      // Delete from database
      console.log('🗑️ Deleting item from database...')
      const { error: deleteError } = await supabase
        .from('shared_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', currentUserId)

      if (deleteError) {
        console.error('❌ Error deleting item:', deleteError)
        // Revert optimistic update on error
        setSharedItems(prev => [...prev, item])
        throw deleteError
      }

      console.log('✅ Successfully deleted item:', itemId)

    } catch (error) {
      console.error('❌ Error deleting item:', error)
    }
  }, [currentUserId, sharedItems, triggerHaptic])

  // Load shared items from database
  useEffect(() => {
    const loadSharedItems = async () => {
      console.log('🔍 Loading shared items for current user and followed users...')
      setLoading(true)
      
      try {
        console.log('👤 Using currentUserId from props:', currentUserId)

        // First, get the list of users that the current user is following
        const {data: followingData, error: followingError} = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', currentUserId)
        
        if (followingError) {
          console.error('❌ Error loading following list:', followingError)
          setLoading(false)
          return
        }

        const followingIds = followingData?.map(f => f.following_id) || []
        const allowedUserIds = [currentUserId, ...followingIds]
        
        console.log('🔍 Allowed user IDs (current user + following):', allowedUserIds)

        // Load shared items only from current user and followed users
        const {data: items, error: itemsError} = await supabase
          .from('shared_items')
          .select(`
            *,
            user_profiles!shared_items_user_id_fkey (
              display_name,
              profile_pic,
              handle
            )
          `)
          .eq('is_active', true)
          .in('user_id', allowedUserIds)
          .order('created_at', {ascending: false})
        
        if (itemsError) {
          console.error('❌ Error loading shared items:', itemsError)
          
          // Check if this is a table doesn't exist error
          if (itemsError.message?.includes('relation "shared_items" does not exist')) {
            console.log('⚠️ Shared items table does not exist. Please run the shared-items-schema.sql in Supabase.')
            setSharedItems([])
            setLoading(false)
            return
          }
          
          setLoading(false)
          return
        }

        console.log('📦 Raw items from database:', items)
        console.log('📦 Number of items found:', items?.length || 0)

        // Load vote counts and user's votes
        const itemsWithVotes = await Promise.all(
          (items || []).map(async (item) => {
            console.log('🔍 Loading votes for item:', item.id)
            
            // Get vote counts
            const {count: likeCount, error: likeError} = await supabase
              .from('item_votes')
              .select('*', {count: 'exact', head: true})
              .eq('shared_item_id', item.id)
              .eq('vote_type', 'like')
            
            const {count: dislikeCount, error: dislikeError} = await supabase
              .from('item_votes')
              .select('*', {count: 'exact', head: true})
              .eq('shared_item_id', item.id)
              .eq('vote_type', 'dislike')
            
            // Get current user's vote
            const {data: userVote, error: userVoteError} = await supabase
              .from('item_votes')
              .select('vote_type')
              .eq('shared_item_id', item.id)
              .eq('voter_id', currentUserId)
              .single()
            
            if (likeError) console.error('❌ Error loading like count:', likeError)
            if (dislikeError) console.error('❌ Error loading dislike count:', dislikeError)
            if (userVoteError && userVoteError.code !== 'PGRST116') console.error('❌ Error loading user vote:', userVoteError)
            
            console.log('🗳️ Vote data for item:', {
              itemId: item.id,
              likeCount,
              dislikeCount,
              userVote: userVote?.vote_type,
              currentUserId
            })
            
            return {
              ...item,
              like_count: likeCount || 0,
              dislike_count: dislikeCount || 0,
              user_vote: userVote?.vote_type || null,
              user_profile: item.user_profiles
            }
          })
        )
        
        setSharedItems(itemsWithVotes)
        setLoading(false)
        console.log('✅ Real data loaded successfully')
        
      } catch (error) {
        console.error('❌ Error loading shared items:', error)
        setLoading(false)
      }
    }
    
    loadSharedItems()
  }, [])

  // Handle voting
  const handleVote = useCallback(async (itemId: string, voteType: 'like' | 'dislike') => {
    console.log('🗳️ Vote attempt:', { itemId, voteType, currentUserId })
    
    if (!currentUserId) {
      console.error('❌ No current user ID available for voting')
      return
    }
    
    triggerHaptic()
    
    try {
      const item = sharedItems.find(i => i.id === itemId)
      if (!item) {
        console.error('❌ Item not found for voting:', itemId)
        return
      }
      
      console.log('🗳️ Current item state:', {
        id: item.id,
        currentVote: item.user_vote,
        likeCount: item.like_count,
        dislikeCount: item.dislike_count
      })
      
      // Optimistic update
      setSharedItems(prev => prev.map(i => {
        if (i.id === itemId) {
          const currentVote = i.user_vote
          let newLikeCount = i.like_count
          let newDislikeCount = i.dislike_count
          let newUserVote: 'like' | 'dislike' | null = voteType
          
          // Handle vote changes
          if (currentVote === voteType) {
            // Remove vote
            if (voteType === 'like') newLikeCount--
            else newDislikeCount--
            newUserVote = null
          } else {
            // Change vote or add new vote
            if (currentVote === 'like') newLikeCount--
            else if (currentVote === 'dislike') newDislikeCount--
            
            if (voteType === 'like') newLikeCount++
            else newDislikeCount++
          }
          
          console.log('🗳️ Updated vote counts:', {
            newLikeCount,
            newDislikeCount,
            newUserVote
          })
          
          return {
            ...i,
            like_count: newLikeCount,
            dislike_count: newDislikeCount,
            user_vote: newUserVote
          }
        }
        return i
      }))
      
      // Save to database
      console.log('🗳️ Saving vote to database...')
      console.log('🗳️ Database operation details:', {
        itemId,
        currentUserId,
        voteType,
        currentVote: item.user_vote,
        operation: item.user_vote === voteType ? 'DELETE' : 'UPSERT'
      })
      
      if (item.user_vote === voteType) {
        // Remove vote
        console.log('🗳️ Attempting to delete vote...')
        const { error: deleteError } = await supabase
          .from('item_votes')
          .delete()
          .eq('shared_item_id', itemId)
          .eq('voter_id', currentUserId)
        
        if (deleteError) {
          console.error('❌ Error deleting vote:', deleteError)
          throw deleteError
        }
        
        console.log('🗳️ Vote removed from database successfully')
      } else {
        // Upsert vote
        console.log('🗳️ Attempting to upsert vote...')
        const voteData = {
          shared_item_id: itemId,
          voter_id: currentUserId,
          vote_type: voteType
        }
        console.log('🗳️ Vote data to insert:', voteData)
        
        const { error: upsertError } = await supabase
          .from('item_votes')
          .upsert(voteData, {
            onConflict: 'shared_item_id,voter_id'
          })
        
        if (upsertError) {
          console.error('❌ Error upserting vote:', upsertError)
          throw upsertError
        }
        
        console.log('🗳️ Vote saved to database successfully')
      }
      
      console.log(`✅ Successfully voted ${voteType} on item ${itemId}`)
      
      // Refresh the vote data to ensure UI is in sync with database
      try {
        // Get updated vote counts
        const {count: likeCount} = await supabase
          .from('item_votes')
          .select('*', {count: 'exact', head: true})
          .eq('shared_item_id', itemId)
          .eq('vote_type', 'like')
        
        const {count: dislikeCount} = await supabase
          .from('item_votes')
          .select('*', {count: 'exact', head: true})
          .eq('shared_item_id', itemId)
          .eq('vote_type', 'dislike')
        
        // Get current user's vote
        const {data: userVote} = await supabase
          .from('item_votes')
          .select('vote_type')
          .eq('shared_item_id', itemId)
          .eq('voter_id', currentUserId)
          .single()
        
        // Update the item with fresh data
        setSharedItems(prev => prev.map(item => 
          item.id === itemId 
            ? {
                ...item,
                like_count: likeCount || 0,
                dislike_count: dislikeCount || 0,
                user_vote: userVote?.vote_type || null
              }
            : item
        ))
        
        console.log('🔄 Refreshed vote data for item:', itemId)
      } catch (error) {
        console.error('❌ Error refreshing vote data:', error)
      }
      
    } catch (error) {
      console.error('❌ Error voting:', error)
      
      // Revert optimistic update on error
      console.log('🔄 Reverting optimistic update due to error...')
      // You could add logic here to revert the optimistic update
    }
  }, [currentUserId, sharedItems, triggerHaptic])

  // Filter items based on selected filter
  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'trending':
        return [...sharedItems].sort((a, b) => (b.like_count - b.dislike_count) - (a.like_count - a.dislike_count))
      case 'recent':
        return [...sharedItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      default:
        return sharedItems
    }
  }, [sharedItems, filter])

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return `${Math.floor(diffInHours / 168)}w ago`
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-purple-100 text-gray-900'} pt-12 pb-6`}>
      {/* Header */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'}`}>
              Community Votes
            </h2>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm mt-1`}>Vote on items shared by you and people you follow</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={onShareItem} 
              variant="secondary" 
              size="sm"
              className={`${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' : 'bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white hover:shadow-lg text-black'} transition-all duration-300`}
            >
              <Share2 className={`w-4 h-4 mr-2 ${isDarkMode ? 'text-white' : 'text-black'}`} />
              Share Item
            </Button>
            <Button 
              onClick={onBack} 
              variant="secondary" 
              size="sm"
              className={`${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' : 'bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white hover:shadow-lg text-black'} transition-all duration-300`}
            >
              ← Back
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => {
              triggerHaptic()
              setFilter('all')
            }}
            variant={filter === 'all' ? 'default' : 'secondary'}
            size="sm"
            className="flex items-center gap-2"
          >
            All
          </Button>
          <Button
            onClick={() => {
              triggerHaptic()
              setFilter('trending')
            }}
            variant={filter === 'trending' ? 'default' : 'secondary'}
            size="sm"
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Trending
          </Button>
          <Button
            onClick={() => {
              triggerHaptic()
              setFilter('recent')
            }}
            variant={filter === 'recent' ? 'default' : 'secondary'}
            size="sm"
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Recent
          </Button>
        </div>
      </div>

      {/* Shared Items Grid */}
      <div className="px-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="w-full bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse mr-3"></div>
                    <div className="flex-1">
                      <div className="w-24 h-4 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full animate-pulse mb-2"></div>
                      <div className="w-16 h-3 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl animate-pulse mb-4"></div>
                  <div className="flex gap-2">
                    <div className="w-16 h-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full animate-pulse"></div>
                    <div className="w-16 h-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🗳️</div>
            <h3 className="text-xl font-bold mb-2">No shared items yet</h3>
            <p className="text-gray-600 mb-6">
              Share an item or follow people to see their shared items for community voting! 
              {sharedItems.length === 0 && (
                <span className="block mt-2 text-sm text-orange-600">
                  💡 Make sure you've run the shared-items-schema.sql in your Supabase database
                </span>
              )}
            </p>
            <Button 
              onClick={() => {
                console.log('🗳️ Share Your First Item button clicked!')
                triggerHaptic()
                onShareItem()
              }} 
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg transition-all duration-300"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Your First Item
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredItems.map((item) => (
              <Card key={item.id} className="w-full bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 relative">
                <CardContent className="p-6">
                  {/* User Info */}
                  <div className="flex items-center mb-4">
                    <Avatar className="w-12 h-12 ring-2 ring-white/50 shadow-lg mr-3">
                      <AvatarImage 
                        src={(() => {
                          // If this is the current user's post, resolve from live currentUser (like Profile)
                          if (item.user_id === currentUserId) {
                            const user: any = currentUser
                            const livePic = user?.avatarImage?.url
                              || user?.profileImage?.url
                              || user?.avatar?.url
                              || user?.imageUrl
                              || user?.image?.url
                              || user?.picture
                              || user?.photoURL
                            if (livePic) return livePic
                          }
                          // Otherwise use stored profile_pic or fallback initials avatar
                          return item.user_profile?.profile_pic 
                            || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user_profile?.display_name || 'User')}&background=random&color=fff&size=150`
                        })()} 
                        alt={item.user_profile?.display_name || 'User'} 
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback className="text-sm font-bold">
                        {(item.user_profile?.display_name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {item.user_profile?.display_name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                  {/* Delete button - only show for current user's posts */}
                  {item.user_id === currentUserId && (
                    <div className="absolute top-6 right-6">
                      <Touchable onClick={() => handleDeleteItem(item.id)}>
                        <div className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all duration-300">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </div>
                      </Touchable>
                    </div>
                  )}

                  {/* Product Image */}
                  <div className="w-full mb-4">
                    {(() => {
                      const resolvedUrl = item.product_data.images?.[0]?.url ||
                        `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=800&fit=crop&auto=format&random=${item.product_id || item.id}`
                      return (
                        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-lg">
                          <img
                            src={resolvedUrl}
                            alt={item.product_data.title || 'Product'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )
                    })()}
                  </div>

                  {/* Product Info */}
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.product_data.title}</h3>
                    {item.product_data.price && (
                      <p className="text-lg font-bold text-green-600">
                        ${item.product_data.price.amount} {item.product_data.price.currencyCode}
                      </p>
                    )}
                    {item.share_message && (
                      <p className="text-sm text-gray-600 mt-2 italic">"{item.share_message}"</p>
                    )}
                  </div>

                  {/* Voting Buttons */}
                  <div className="flex gap-3">
                    <Touchable onClick={() => handleVote(item.id, 'like')}>
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                        item.user_vote === 'like' 
                          ? 'bg-red-500 text-white shadow-lg' 
                          : 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600'
                      }`}>
                        <Heart className={`w-4 h-4 ${item.user_vote === 'like' ? 'fill-current' : ''}`} />
                        <span className="font-medium">{item.like_count}</span>
                      </div>
                    </Touchable>
                    
                    <Touchable onClick={() => handleVote(item.id, 'dislike')}>
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                        item.user_vote === 'dislike' 
                          ? 'bg-gray-700 text-white shadow-lg' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}>
                        <ThumbsDown className={`w-4 h-4 ${item.user_vote === 'dislike' ? 'fill-current' : ''}`} />
                        <span className="font-medium">{item.dislike_count}</span>
                      </div>
                    </Touchable>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <Toaster />
    </div>
  )
}
