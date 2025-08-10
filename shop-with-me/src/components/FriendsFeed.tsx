import {useState, useCallback, useEffect} from 'react'
import {Button, Avatar, AvatarImage, AvatarFallback, Touchable, Card, CardContent} from '@shopify/shop-minis-react'
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
}

export function FriendsFeed({onBack, onViewUserFeed}: Props) {
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

  // Load all user profiles
  useEffect(() => {
    const loadUserProfiles = async () => {
      console.log('🔍 Loading user profiles...')
      
      try {
        const {data: profiles, error: profilesError} = await supabase
          .from('user_profiles')
          .select('*')
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
            
            if (countError) {
              console.error('❌ Error counting feed items for', profile.user_id, ':', countError)
            }

            const {data: sampleProducts, error: productError} = await supabase
              .from('user_feed_items')
              .select('product_data, source')
              .eq('user_id', profile.user_id)
              .order('added_at', {ascending: false})
              .limit(10)
            
            if (productError) {
              console.error('❌ Error getting sample product for', profile.user_id, ':', productError)
            }
            
            const randomIndex = Math.floor(Math.random() * (sampleProducts?.length || 1))
            const sampleProduct = sampleProducts?.[randomIndex]?.product_data || null
            
            console.log(`🎲 Randomly selected product ${randomIndex + 1} of ${sampleProducts?.length || 0} for ${profile.user_id}`)
            
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
  }, [refreshKey])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pt-12 pb-6">
      {/* Header */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Friends' Style
            </h2>
            <p className="text-gray-600 text-sm mt-1">Discover curated products from your friends</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleRefreshProducts} 
              variant="secondary" 
              size="sm"
              className="bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white hover:shadow-lg transition-all duration-300"
            >
              🔄 Refresh
            </Button>
            <Button 
              onClick={onBack} 
              variant="secondary" 
              size="sm"
              className="bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white hover:shadow-lg transition-all duration-300"
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
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
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
