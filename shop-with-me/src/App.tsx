import {useState, useCallback, useEffect} from 'react'
import {Button, Avatar, AvatarImage, AvatarFallback, Touchable, Card, CardContent} from '@shopify/shop-minis-react'
import {Collector} from './components/Collector'
import {UserFeed} from './components/UserFeed'
import {supabase} from './lib/supa'


type View = 'main' | 'feed'

type FeedView = {
  userId: string
  handle: string
}

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

export function App() {
  const [view, setView] = useState<View>('main')
  const [feedView, setFeedView] = useState<FeedView | null>(null)
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0) // Add refresh key for randomization






  const handleViewFeed = (userId: string, handle: string) => {
    setFeedView({userId, handle})
    setView('feed')
  }

  const handleBack = () => {
    setView('main')
    setFeedView(null)
  }

  const handleInviteFriends = useCallback(() => {
    console.log('Invite friends clicked')
  }, [])

  const handleRefreshProducts = useCallback(() => {
    console.log('🔄 Refreshing products for new randomization...')
    setRefreshKey(prev => prev + 1)
  }, [])



  const handleUserCardTap = useCallback((userId: string) => {
    const user = userProfiles.find(u => u.user_id === userId)
    if (user) {
      handleViewFeed(userId, user.handle)
    }
  }, [userProfiles])

  const handleViewMyProfile = useCallback(() => {
    // Find current user's profile
    const currentUser = userProfiles.find(u => u.user_id === `user_${(localStorage.getItem('currentUser') || 'unknown').toLowerCase().replace(/\s+/g, '_')}`)
    if (currentUser) {
      handleViewFeed(currentUser.user_id, currentUser.handle)
    } else {
      console.log('Current user profile not found')
    }
  }, [userProfiles])

  // Load all user profiles
  useEffect(() => {
    const loadUserProfiles = async () => {
      console.log('🔍 Loading user profiles...')
      
      try {
        // Get all user profiles with feed item counts and sample products
        const {data: profiles, error: profilesError} = await supabase
          .from('user_profiles')
          .select('*')
          .order('last_active', {ascending: false})
        
        console.log('🔍 Raw profiles from database:', profiles)
        
        // Check what's in the feed items table
        const {data: allFeedItems, error: feedError} = await supabase
          .from('user_feed_items')
          .select('user_id, product_data, source, added_at')
          .order('added_at', {ascending: false})
          .limit(10)
        
        console.log('🔍 Recent feed items from database:', allFeedItems)
        
        if (profilesError) {
          console.error('❌ Error loading profiles:', profilesError)
          setLoading(false)
          return
        }

        // Get feed item counts and sample products for each user
        const profilesWithCounts = await Promise.all(
          (profiles || []).map(async (profile) => {
            // Get feed item count
            const {count, error: countError} = await supabase
              .from('user_feed_items')
              .select('*', {count: 'exact', head: true})
              .eq('user_id', profile.user_id)
            
            if (countError) {
              console.error('❌ Error counting feed items for', profile.user_id, ':', countError)
            }

            // Get sample product for preview - get multiple products and randomly select one
            const {data: sampleProducts, error: productError} = await supabase
              .from('user_feed_items')
              .select('product_data, source')
              .eq('user_id', profile.user_id)
              .order('added_at', {ascending: false})
              .limit(10) // Get up to 10 recent products
            
            if (productError) {
              console.error('❌ Error getting sample product for', profile.user_id, ':', productError)
            }
            
            // Randomly select one product from the recent products
            const randomIndex = Math.floor(Math.random() * (sampleProducts?.length || 1))
            const sampleProduct = sampleProducts?.[randomIndex]?.product_data || null
            
            console.log(`🎲 Randomly selected product ${randomIndex + 1} of ${sampleProducts?.length || 0} for ${profile.user_id}`)
            
            console.log(`🔍 Sample product for ${profile.user_id}:`, sampleProduct)
            
            // Debug: Show what's actually in the database
            if (sampleProduct) {
              console.log(`🔍 Real product data for ${profile.user_id}:`, {
                id: sampleProduct.id,
                title: sampleProduct.title,
                hasImages: sampleProduct.images?.length > 0,
                imageUrls: sampleProduct.images?.map((img: any) => img.url),
                source: sampleProducts?.[0]?.source
              })
            }
            
            return {
              ...profile,
              feed_item_count: count || 0,
              sample_product: sampleProduct
            }
          })
        )
        
        console.log('📊 Loaded profiles with sample products:', profilesWithCounts)
        console.log('🔍 Number of users found:', profilesWithCounts.length)
        
        // Debug: Show all users and their product counts
        profilesWithCounts.forEach(profile => {
          console.log(`👤 User: ${profile.display_name} (${profile.user_id})`)
          console.log(`   Products: ${profile.feed_item_count}`)
          console.log(`   Sample product: ${profile.sample_product?.title || 'None'}`)
          console.log(`   Sample product images: ${profile.sample_product?.images?.length || 0}`)
        })
        setUserProfiles(profilesWithCounts)
        setLoading(false)
      } catch (error) {
        console.error('❌ Error loading user data:', error)
        setLoading(false)
      }
    }
    
    loadUserProfiles()
  }, [refreshKey]) // Re-run when refreshKey changes

  if (view === 'feed' && feedView) {
    return (
      <div className="pt-12 px-4 pb-6">
        <UserFeed
          userId={feedView.userId}
          handle={feedView.handle}
          onBack={handleBack}
        />
      </div>
    )
  }

  return (
    <div className="pt-12 pb-6">
      {/* Automatic data collector - runs when app opens */}
      <Collector />

      {/* User Cards Section - Vertical Scrolling */}
      <div className="px-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Friends' Style</h2>
          <div className="flex gap-2">
            <Button onClick={handleRefreshProducts} variant="secondary" size="sm">
              🔄 Refresh
            </Button>
            <Button onClick={handleViewMyProfile} variant="secondary" size="sm">
              View My Profile
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="w-full">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse mb-2"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="w-full">
                    <div className="aspect-square bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {userProfiles.map((user) => (
              <Touchable key={user.user_id} onClick={() => handleUserCardTap(user.user_id)}>
                <Card className="w-full hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-4">
                    {/* Profile Section */}
                    <div className="flex flex-col items-center mb-4">
                      <Avatar className="w-16 h-16 mb-2">
                        <AvatarImage 
                          src={user.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.handle)}&background=random&color=fff&size=150`} 
                          alt={user.display_name || user.handle} 
                        />
                        <AvatarFallback>{(user.display_name || user.handle).charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-32 text-center">
                        {user.display_name || user.handle}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.feed_item_count} products
                      </p>
                    </div>

                    {/* Single Product Preview */}
                    <div className="w-full">
                      {user.sample_product?.images?.[0] ? (
                        <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                          <img 
                            src={user.sample_product.images[0].url} 
                            alt={user.sample_product.title || 'Product'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : user.sample_product ? (
                        <div className="aspect-square bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-xs text-gray-600 font-medium">{user.sample_product.title}</div>
                            <div className="text-xs text-gray-400">No image available</div>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                          <span className="text-xs text-gray-400">No products yet</span>
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

      {/* Main Content */}
      <div className="px-4">
        <h1 className="text-2xl font-bold mb-2 text-center">Friends' Products</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Connect with friends to see products they choose to share.
        </p>

        {/* Empty state for friend feed before integration */}
        <div className="text-center text-gray-600 mt-6">
          <p className="mb-3">No friends connected yet.</p>
          <p className="text-sm mb-6">
            When friends opt in, their shared saved/recent products will appear here.
          </p>
          <div className="max-w-xs mx-auto">
            <Button onClick={handleInviteFriends}>Invite friends</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
