import {useState, useCallback, useEffect} from 'react'
import {Button, Avatar, AvatarImage, AvatarFallback, Touchable, Card, CardContent} from '@shopify/shop-minis-react'
import {ThemeToggle} from './ThemeToggle'
import {supabase} from '../lib/supa'

type UserProfile = {
  user_id: string
  handle: string
  display_name: string
  profile_pic?: string
  gender_affinity?: string
  category_affinities?: string[]
  created_at: string
  last_active: string
  feed_item_count: number
  sample_product?: {
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
  } | null
}

type Props = {
  onBack: () => void
  onViewUserFeed: (userId: string, handle: string) => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
  currentUserId: string
}

export function FriendsFeed({onBack, onViewUserFeed, isDarkMode, onToggleDarkMode, currentUserId}: Props) {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Haptic feedback function
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }, [])

  const handleRefreshProducts = useCallback(() => {
    triggerHaptic()
    console.log('🔄 Refreshing products for new randomization...')
    setRefreshKey(prev => prev + 1)
  }, [triggerHaptic])

  const handleUserCardTap = useCallback((userId: string) => {
    triggerHaptic()
    const user = userProfiles.find(u => u.user_id === userId)
    if (user) {
      onViewUserFeed(userId, user.handle)
    }
  }, [userProfiles, onViewUserFeed, triggerHaptic])

  // Load only users that the current user is following
  useEffect(() => {
    const loadUserProfiles = async () => {
      console.log('🔍 Loading followed users for:', currentUserId)
      
      try {
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
        console.log('🔍 Following IDs:', followingIds)

        if (followingIds.length === 0) {
          console.log('🔍 No users being followed')
          setUserProfiles([])
          setLoading(false)
          return
        }

        // Get profiles of users being followed
        const {data: profiles, error: profilesError} = await supabase
          .from('user_profiles')
          .select('*')
          .in('user_id', followingIds)
          .order('last_active', {ascending: false})
        
        if (profilesError) {
          console.error('❌ Error loading profiles:', profilesError)
          setLoading(false)
          return
        }

        const profilesWithCounts = await Promise.all(
          (profiles || []).map(async (profile) => {
            const {count, error: countError} = await supabase
              .from('user_feed_items')
              .select('*', {count: 'exact', head: true})
              .eq('user_id', profile.user_id)
              .eq('is_active', true)
            
            if (countError) {
              console.error('❌ Error counting feed items for', profile.user_id, ':', countError)
            }

            const {data: sampleItems, error: itemError} = await supabase
              .from('user_feed_items')
              .select('product_data, activity_type, source, created_at')
              .eq('user_id', profile.user_id)
              .eq('is_active', true)
              .order('created_at', {ascending: false})
              .limit(10)
            
            if (itemError) {
              console.error('❌ Error getting sample feed items for', profile.user_id, ':', itemError)
            }
            
            const randomIndex = Math.floor(Math.random() * (sampleItems?.length || 1))
            const sampleProduct = sampleItems?.[randomIndex]?.product_data || null
            
            console.log(`🎲 Randomly selected feed item ${randomIndex + 1} of ${sampleItems?.length || 0} for ${profile.user_id}`)
            
            return {
              ...profile,
              feed_item_count: count || 0,
              sample_product: sampleProduct
            }
          })
        )
        
        setUserProfiles(profilesWithCounts)
        setLoading(false)
      } catch (error) {
        console.error('❌ Error loading user data:', error)
        setLoading(false)
      }
    }
    
    loadUserProfiles()
  }, [refreshKey, currentUserId])

  return (
    <div className={`min-h-screen ${
      isDarkMode
        ? 'bg-gradient-to-b from-purple-900 via-black to-black text-white'
        : 'bg-gradient-to-b from-purple-100 via-purple-200 to-purple-300 text-gray-900'
    } pt-12 pb-6`}>
      {/* Header */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'}`}>
              Friends' Style
            </h2>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm mt-1`}>Discover curated products from people you follow</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleRefreshProducts} 
              variant="secondary" 
              size="sm"
              className={`${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' : 'bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white hover:shadow-lg text-black'} transition-all duration-300`}
            >
              🔄 Refresh
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
      </div>

      {/* User Cards Grid */}
      <div className="px-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="w-full bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse mb-3"></div>
                    <div className="w-32 h-4 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full animate-pulse"></div>
                  </div>
                  <div className="w-full">
                    <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : userProfiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-bold mb-2">No one to follow yet</h3>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
              Start following people to see their curated products here!
            </p>
            <Button 
              onClick={onBack}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg transition-all duration-300"
            >
              Go to Friends
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {userProfiles.map((user) => (
              <Touchable key={user.user_id} onClick={() => handleUserCardTap(user.user_id)}>
                <Card className="group w-full bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] hover:-rotate-1">
                  <CardContent className="p-6">
                    {/* Profile Section */}
                    <div className="flex flex-col items-center mb-6">
                      <div className="relative mb-3">
                        <Avatar className="w-20 h-20 ring-4 ring-white/50 shadow-lg">
                          <AvatarImage 
                            src={user.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.handle)}&background=random&color=fff&size=150`} 
                            alt={user.display_name || user.handle} 
                          />
                          <AvatarFallback className="text-xl font-bold">{(user.display_name || user.handle).charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {/* Removed online status indicator */}
                      </div>
                      <p className="text-lg font-bold text-gray-900 truncate max-w-40 text-center mb-1">
                        {user.display_name || user.handle}
                      </p>
                      <p className="text-sm text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-full">
                        {user.feed_item_count} products
                      </p>
                    </div>

                    {/* Single Product Preview */}
                    <div className="w-full">
                      {user.sample_product?.images?.[0] ? (
                        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <img 
                            src={user.sample_product.images[0].url} 
                            alt={user.sample_product.title || 'Product'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : user.sample_product ? (
                        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg">
                          <div className="text-center p-4">
                            <div className="text-sm text-gray-700 font-semibold mb-2">{user.sample_product.title}</div>
                            <div className="text-xs text-gray-500 bg-white/80 px-3 py-1 rounded-full">No image available</div>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg">
                          <div className="text-center">
                            <div className="text-4xl mb-2">📦</div>
                            <span className="text-sm text-gray-500 font-medium">No products yet</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Touchable>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 
