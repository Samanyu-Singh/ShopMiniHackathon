import {useState, useCallback, useEffect, useMemo} from 'react'
import {Button, Touchable, ProductCard, useCurrentUser, useRecommendedProducts, useSavedProducts} from '@shopify/shop-minis-react'
import {Collector} from './components/Collector'
import {UserFeed} from './components/UserFeed'
import {FriendsFeed} from './components/FriendsFeed'
import {SharedItemsFeed} from './components/SharedItemsFeed'
import {Friends} from './components/Friends'
import {Profile} from './components/Profile'
import {ThemeToggle} from './components/ThemeToggle'
import {supabase} from './lib/supa'

type View = 'home' | 'feed' | 'stories' | 'search' | 'voting' | 'friends' | 'profile'

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
  const {currentUser} = useCurrentUser()
  
  // Generate stable user ID from displayName (matching Collector.tsx pattern)
  const currentUserId = useMemo(() => {
    if (!currentUser?.displayName) return 'user_unknown'
    return `user_${currentUser.displayName.toLowerCase().replace(/\s+/g, '_')}`
  }, [currentUser?.displayName])
  
  const [view, setView] = useState<View>('home')
  const [feedView, setFeedView] = useState<FeedView | null>(null)
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true) // Default to dark mode like Linear
  const [dbResults, setDbResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Product sources for search (keep UI the same; just make it functional)
  const recommendedProducts = useRecommendedProducts({first: 50})
  const savedProducts = useSavedProducts({first: 50})

  // Debug view changes
  useEffect(() => {
    console.log('🔄 View changed to:', view)
  }, [view])

  // Debug current user
  useEffect(() => {
    console.log('👤 Current user debug:', {
      currentUser: currentUser?.displayName,
      currentUserId,
      userProfilesCount: userProfiles.length,
      userProfileIds: userProfiles.map(p => p.user_id),
      availableUsers: userProfiles.map(p => ({ id: p.user_id, name: p.display_name, handle: p.handle }))
    })
  }, [userProfiles, currentUser, currentUserId])

  // Haptic feedback function
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50) // Short vibration for button press
    }
  }, [])

  const handleViewFeed = (userId: string, handle: string) => {
    triggerHaptic()
    setFeedView({userId, handle})
    setView('feed')
  }

  const handleBack = () => {
    triggerHaptic()
    setView('home')
    setFeedView(null)
  }

  const handleInviteFriends = useCallback(() => {
    triggerHaptic()
    console.log('Invite friends clicked')
  }, [triggerHaptic])

  const handleUserCardTap = useCallback((userId: string) => {
    const user = userProfiles.find(u => u.user_id === userId)
    if (user) {
      handleViewFeed(userId, user.handle)
    }
  }, [userProfiles])

  const handleViewMyProfile = useCallback(() => {
    triggerHaptic()
    const currentUser = userProfiles.find(u => u.user_id === `user_${(localStorage.getItem('currentUser') || 'unknown').toLowerCase().replace(/\s+/g, '_')}`)
    if (currentUser) {
      handleViewFeed(currentUser.user_id, currentUser.handle)
    } else {
      console.log('Current user profile not found')
    }
  }, [userProfiles, triggerHaptic])

  const handleRefreshProducts = useCallback(() => {
    triggerHaptic()
    console.log('🔄 Refreshing products for new randomization...')
    setRefreshKey(prev => prev + 1)
  }, [triggerHaptic])



  const handleSearchClick = useCallback(() => {
    triggerHaptic()
    setShowSearchModal(true)
  }, [triggerHaptic])

  const handleVotingClick = useCallback(() => {
    console.log('🗳️ Voting button clicked!')
    
    // Trigger haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
    
    // Set view immediately
    setView('voting')
    console.log('View set to voting')
  }, [])

  const handleShareItemClick = useCallback(() => {
    triggerHaptic()
    console.log('📤 Share item clicked!')
    
    // Use the first available user profile as fallback
    // In a real app, you'd get this from the Shopify Mini SDK like Collector does
    if (userProfiles.length > 0) {
      const firstUser = userProfiles[0]
      console.log('✅ Using first available user for sharing:', firstUser)
      handleViewFeed(firstUser.user_id, firstUser.handle)
    } else {
      console.log('❌ No user profiles available')
      // Show a message or handle this case
    }
  }, [userProfiles, triggerHaptic])

  const handleSearchSubmit = useCallback(async (query: string) => {
    triggerHaptic()
    const q = (query || '').trim()
    console.log('🔍 Searching for:', q)
    setSearchQuery(q)
    if (!q) {
      setDbResults([])
      return
    }
    try {
      setIsSearching(true)
      // Fetch broad sets, then filter client-side to reliably include other users' recommended items
      const [ufiRes, sharedRes] = await Promise.all([
        supabase
          .from('user_feed_items')
          .select('product_id, product_data, created_at, is_active, activity_type')
          .eq('is_active', true)
          .eq('activity_type', 'recommended')
          .order('created_at', {ascending: false})
          .limit(500),
        supabase
          .from('shared_items')
          .select('product_id, product_data, created_at, is_active')
          .eq('is_active', true)
          .order('created_at', {ascending: false})
          .limit(500)
      ])

      const rows = ([...(ufiRes.data || []), ...(sharedRes.data || [])] as any[])
        .filter(r => r && r.product_data)

      // Convert to products and filter by query and price
      const ql = q.toLowerCase()
      const cleaned = rows
        .map(r => r.product_data)
        .filter(p => {
          const amount = p?.price?.amount
          const n = amount != null ? parseFloat(String(amount)) : NaN
          if (!(Number.isFinite(n) && n > 0)) return false
          const title = (p?.title || '').toLowerCase()
          const shopName = (p?.shop?.name || '').toLowerCase()
          const desc = (p?.description || '').toLowerCase()
          return title.includes(ql) || shopName.includes(ql) || desc.includes(ql)
        })

      setDbResults(cleaned)
    } catch (err) {
      console.error('❌ Search error:', err)
      setDbResults([])
    } finally {
      setIsSearching(false)
    }
  }, [triggerHaptic])

  // Compute filtered products from recommended + saved
  const filteredProducts = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase()
    if (!q) return [] as any[]
    // Include saved products from SDK to complement DB results
    const saved = (savedProducts.products ?? []) as any[]
    return saved.filter(p => {
      const title = (p?.title || '').toLowerCase()
      const shopName = (p?.shop?.name || '').toLowerCase()
      const desc = (p?.description || '').toLowerCase()
      return title.includes(q) || shopName.includes(q) || desc.includes(q)
    })
    // Note: we exclude $0.00 saved products visually
    .filter(p => {
      const amount = p?.price?.amount
      const n = amount != null ? parseFloat(String(amount)) : NaN
      return Number.isFinite(n) && n > 0
    })
  }, [searchQuery, savedProducts.products])

  // Merge DB results with saved + recommended hook results and dedupe by id
  const mergedResults = useMemo(() => {
    const map = new Map<string, any>()
    const add = (arr: any[]) => {
      for (const p of arr) {
        const id = p?.id
        if (!id) continue
        if (!map.has(id)) map.set(id, p)
      }
    }
    add(dbResults)
    add(filteredProducts)
    // Add recommended products that match query and have price > 0
    const q = (searchQuery || '').trim().toLowerCase()
    if (q) {
      const rec = (recommendedProducts.products ?? []) as any[]
      const recFiltered = rec
        .filter(p => {
          const title = (p?.title || '').toLowerCase()
          const shopName = (p?.shop?.name || '').toLowerCase()
          const desc = (p?.description || '').toLowerCase()
          return title.includes(q) || shopName.includes(q) || desc.includes(q)
        })
        .filter(p => {
          const amount = p?.price?.amount
          const n = amount != null ? parseFloat(String(amount)) : NaN
          return Number.isFinite(n) && n > 0
        })
      add(recFiltered)
    }
    return Array.from(map.values())
  }, [dbResults, filteredProducts, recommendedProducts.products, searchQuery])

  const toggleDarkMode = useCallback(() => {
    triggerHaptic()
    setIsDarkMode(prev => !prev)
  }, [triggerHaptic])

  // Load all user profiles
  useEffect(() => {
    const loadUserProfiles = async () => {
      console.log('🔍 Loading user profiles...')
      
      try {
        const {data: profiles, error: profilesError} = await supabase
          .from('user_profiles')
          .select('*')
          .order('last_active', {ascending: false})
        
        console.log('🔍 Raw profiles from database:', profiles)
        
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
            console.log(`🔍 Sample product for ${profile.user_id}:`, sampleProduct)
            
            if (sampleProduct) {
              console.log(`🔍 Real product data for ${profile.user_id}:`, {
                id: sampleProduct.id,
                title: sampleProduct.title,
                hasImages: sampleProduct.images?.length > 0,
                imageUrls: sampleProduct.images?.map((img: any) => img.url)
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
  }, [refreshKey])

  // Feed view
  if (view === 'feed' && feedView) {
    if (feedView.userId === 'all') {
      return (
        <FriendsFeed
          onBack={handleBack}
          onViewUserFeed={handleViewFeed}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          currentUserId={currentUserId}
        />
      )
    } else {
      return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-purple-100 text-gray-900'}`}>
          <div className="pt-12 px-4 pb-6">
            <UserFeed
              userId={feedView.userId}
              handle={feedView.handle}
              onBack={handleBack}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      )
    }
  }

  // Voting view
  if (view === 'voting') {
    return (
      <SharedItemsFeed
        onBack={handleBack}
        onShareItem={handleShareItemClick}
        currentUserId={currentUserId}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />
    )
  }

  // Friends view
  if (view === 'friends') {
    return (
      <Friends
        onBack={handleBack}
        currentUserId={currentUserId}
        isDarkMode={isDarkMode}
      />
    )
  }

  // Profile view
  if (view === 'profile') {
    return (
      <Profile
        onBack={handleBack}
        onViewSaved={() => {
          // Use the first available user profile as fallback
          if (userProfiles.length > 0) {
            const firstUser = userProfiles[0]
            handleViewFeed(firstUser.user_id, firstUser.handle)
          }
        }}
        isDarkMode={isDarkMode}
      />
    )
  }

  // Stories view
  if (view === 'stories') {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-purple-100 text-gray-900'}`}>
        <div className="pt-12 px-4 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <Button onClick={handleBack} variant="secondary">← Back</Button>
            <h1 className="text-xl font-bold">Stories</h1>
          </div>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-2xl font-bold mb-2">Stories Coming Soon</h2>
            <p className="text-gray-600">Share your shopping moments with friends</p>
          </div>
        </div>
      </div>
    )
  }

  // Home view with Apple Watch-inspired design
  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${
      isDarkMode 
        ? 'bg-black text-white' 
        : 'bg-purple-100 text-gray-900'
    }`}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {isDarkMode ? (
          <>
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-full blur-3xl"></div>
          </>
        ) : (
          <>
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl"></div>
          </>
        )}
      </div>

      {/* Automatic data collector */}
      <Collector />

      {/* Main Content */}
      <div className="relative z-10 pt-20 pb-12 px-6">
        {/* Header with Theme Toggle */}
        <div className="text-center mb-12">
          <div className="flex justify-between items-center mb-8">
            <div></div> {/* Spacer */}
            <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />
          </div>
          
          <div className={`inline-block p-3 rounded-2xl shadow-lg mb-4 transition-all duration-500 ${
            isDarkMode 
              ? 'bg-gray-900/80 backdrop-blur-sm border border-gray-800' 
              : 'bg-white/80 backdrop-blur-sm'
          }`}>
            <h1 className={`text-4xl font-black transition-all duration-500 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-gray-100 via-white to-gray-200 bg-clip-text text-transparent' 
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent'
            }`}>
              Shop Together
            </h1>
          </div>
          <p className={`font-medium text-lg transition-colors duration-500 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Discover what your friends are loving
          </p>
        </div>

        {/* Floating Space Bubbles */}
        <div className="relative h-96 mb-8 overflow-hidden">
          {/* Friends Feed Bubble */}
          <Touchable onClick={() => {
            triggerHaptic()
            setView('feed')
            setFeedView({userId: 'all', handle: 'friends'})
          }}>
            <div className="group absolute top-8 left-8 w-20 h-20 rounded-full flex flex-col justify-center items-center shadow-2xl transition-all duration-700 animate-float-1 bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 hover:shadow-blue-500/50">
              <div className="text-2xl transform group-hover:scale-125 transition-transform duration-300">✨</div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap bg-black/80 text-white">
                {userProfiles.length} friends
              </div>
            </div>
          </Touchable>

          {/* Friends Bubble */}
          <Touchable onClick={() => {
            triggerHaptic()
            setView('friends')
          }}>
            <div className="group absolute top-16 right-12 w-16 h-16 rounded-full flex flex-col justify-center items-center shadow-2xl transition-all duration-700 animate-float-2 bg-gradient-to-br from-purple-400 via-purple-500 to-pink-600 hover:shadow-purple-500/50">
              <div className="text-xl transform group-hover:scale-125 transition-transform duration-300">👥</div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap bg-black/80 text-white">
                Friends
              </div>
            </div>
          </Touchable>

          {/* Search Bubble */}
          <Touchable onClick={handleSearchClick}>
            <div className="group absolute top-32 left-1/2 transform -translate-x-1/2 w-18 h-18 rounded-full flex flex-col justify-center items-center shadow-2xl transition-all duration-700 animate-float-3 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 hover:shadow-green-500/50">
              <div className="text-2xl transform group-hover:scale-125 transition-transform duration-300">🔍</div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap bg-black/80 text-white">
                Find products
              </div>
            </div>
          </Touchable>

          {/* Profile Bubble */}
          <button 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('👤 Profile button clicked!')
              triggerHaptic()
              setView('profile')
            }}
            className="group absolute bottom-16 left-16 w-14 h-14 rounded-full flex flex-col justify-center items-center shadow-2xl transition-all duration-700 animate-float-4 cursor-pointer bg-gradient-to-br from-slate-400 via-gray-500 to-zinc-600 hover:shadow-gray-500/50"
          >
            <div className="text-lg transform group-hover:scale-125 transition-transform duration-300">👤</div>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap bg-black/80 text-white">
              Profile
            </div>
          </button>

          {/* Voting Bubble */}
          <button 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('🗳️ Button clicked directly!')
              handleVotingClick()
            }}
            className="group absolute bottom-8 right-8 w-24 h-24 rounded-full flex flex-col justify-center items-center shadow-2xl transition-all duration-700 animate-float-5 cursor-pointer bg-gradient-to-br from-orange-400 via-red-500 to-pink-600 hover:shadow-red-500/50"
          >
            <div className="text-3xl transform group-hover:scale-125 transition-transform duration-300">🗳️</div>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap bg-black/80 text-white">
              Vote
            </div>
          </button>


        </div>
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-20 animate-in fade-in duration-300">
          <div className={`backdrop-blur-md rounded-3xl p-8 w-full max-w-md shadow-2xl border animate-in slide-in-from-top-4 duration-300 ${
            isDarkMode 
              ? 'bg-gray-900/95 border-gray-800' 
              : 'bg-white/95 border-white/20'
          }`}>
            <div className="mb-6 text-center">
              <h2 className={`text-2xl font-bold transition-all duration-500 ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-gray-100 via-white to-gray-200 bg-clip-text text-transparent' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'
              }`}>
                Search Products
              </h2>
            </div>
              <div className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for products..."
                  className={`w-full px-6 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 transition-all duration-300 text-lg ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-500' 
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit(searchQuery)
                    }
                  }}
                  autoFocus
                />
                <div className={`absolute right-4 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-400'
                }`}>
                  🔍
                </div>
              </div>
                {searchQuery && (
                  <div>
                    <div className="grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1">
                      {mergedResults.map((product: any) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onFavoriteToggled={() => {}}
                          onClick={() => {}}
                        />
                      ))}
                    </div>
                  </div>
                )}
              <div className="flex gap-4">
                <Button 
                  onClick={() => handleSearchSubmit(searchQuery)}
                  className={`flex-1 rounded-2xl py-4 font-bold hover:shadow-lg transition-all duration-300 transform hover:scale-105 ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-gray-700 via-gray-600 to-gray-800 text-white hover:shadow-gray-600/25' 
                      : 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white hover:shadow-blue-500/25'
                  }`}
                >
                  Search
                </Button>
                <Button 
                  onClick={() => setShowSearchModal(false)}
                  variant="secondary"
                  className={`flex-1 rounded-2xl py-4 font-semibold border-2 transition-all duration-300 ${
                    isDarkMode 
                      ? 'border-gray-700 hover:border-gray-600 bg-gray-800 text-gray-200' 
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
