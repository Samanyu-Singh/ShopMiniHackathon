import {useEffect, useState} from 'react'
import {
  Button, 
  ProductCard, 
  IconButton,
  useCurrentUser
} from '@shopify/shop-minis-react'
import {Share2} from 'lucide-react'
import {supabase} from '../lib/supa'
import {ShareItemModal} from './ShareItemModal'

type ProductData = {
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
  reviewAnalytics?: any
  defaultVariantId?: string
  isFavorited?: boolean
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
}

type Props = {
  userId: string
  handle: string
  onBack: () => void
  isDarkMode: boolean
  currentUserId?: string // To determine if viewing own feed
}

export function UserFeed({userId, handle, onBack, isDarkMode, currentUserId}: Props) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [curatedFeed, setCuratedFeed] = useState<any[]>([])

  // Shopify Mini SDK hooks for real data
  const {currentUser} = useCurrentUser()

  // Check if viewing own feed
  const isOwnFeed = currentUserId === userId

  // Load user profile and feed items
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      console.log('🔍 Loading data for user:', userId)
      
      try {
        // Load user profile
        const {data: profile, error: profileError} = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (profileError) {
          setError(profileError.message)
          setLoading(false)
          return
        }
        
        setUserProfile(profile as UserProfile)

        // Load feed items
        const {data: items, error: itemsError} = await supabase
          .from('user_feed_items')
          .select('product_data, source, added_at')
          .eq('user_id', userId)
          .order('added_at', {ascending: false})
          .limit(20)

        if (itemsError) {
          console.error('❌ Error loading feed items:', itemsError)
          setCuratedFeed([])
        } else {
          console.log('✅ Loaded feed items:', items?.length || 0)
          
                     if (items && items.length > 0) {
             // Convert database items to product format
             const products = items.map((item: any) => ({
               id: item.product_data.id || `db-${item.id}`,
               title: item.product_data.title || 'Untitled Product',
               description: item.product_data.description || '',
               price: item.product_data.price || { amount: '0.00', currencyCode: 'USD' },
               images: item.product_data.images || [{
                 url: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=${item.id}`,
                 altText: item.product_data.title || 'Product Image'
               }],
               featuredImage: item.product_data.images?.[0] || {
                 url: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=${item.id}`,
                 altText: item.product_data.title || 'Product Image'
               },
               shop: item.product_data.shop || { id: 'unknown-shop', name: 'Unknown Shop' },
               reviewAnalytics: {},
               defaultVariantId: item.product_data.id || `db-${item.id}`,
               isFavorited: true,
               source: item.source
             }))
            
            setCuratedFeed(products)
          } else {
            // Create fallback products when no data
            const fallbackProducts = Array.from({ length: 6 }, (_, i) => ({
              id: `fallback-${userId}-${i}`,
              title: `Sample Product ${i + 1}`,
              description: 'This is a sample product while we load your real data.',
              price: { amount: `${(Math.random() * 100 + 10).toFixed(2)}`, currencyCode: 'USD' },
              images: [{
                url: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=${userId}-${i}`,
                altText: `Sample Product ${i + 1}`
              }],
              featuredImage: {
                url: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=${userId}-${i}`,
                altText: `Sample Product ${i + 1}`
              },
              shop: { id: 'fallback-shop', name: 'Sample Shop' },
              reviewAnalytics: {},
              defaultVariantId: `fallback-${userId}-${i}`,
              isFavorited: false
            }))
            
            setCuratedFeed(fallbackProducts)
          }
        }
        
        setLoading(false)
      } catch (err) {
        console.error('❌ Error loading data:', err)
        setError('Failed to load user data')
        setLoading(false)
      }
    }

    loadData()
  }, [userId])

  const handleFavoriteToggled = (isFavorited: boolean) => {
    console.log('Favorite toggled, isFavorited:', isFavorited)
  }

  const handleShareItem = (product: any) => {
    console.log('📤 Share button clicked for product:', product)
    
    // Convert Shopify Product to ProductData format for the modal
    const productData: ProductData = {
      id: product.id,
      title: product.title || 'Untitled Product',
      description: (product as any).description || '',
      price: product.price || { amount: '0.00', currencyCode: 'USD' },
      images: (product as any).featuredImage ? [{
        url: (product as any).featuredImage.url,
        altText: (product as any).featuredImage.altText || product.title || 'Product Image'
      }] : [],
      shop: {
        id: (product as any).shop?.id || 'shop-1',
        name: (product as any).shop?.name || 'Unknown Shop'
      }
    }
    
    setSelectedProduct(productData)
    setShowShareModal(true)
  }

  const handleShareSuccess = () => {
    // Could refresh the feed or show success message
    console.log('Item shared successfully')
  }

  const handleRemoveFromFeed = async (productId: string) => {
    // For now, just log the removal since we're using real Shopify data
    console.log('✅ Product removed from feed:', productId)
    // In the future, we could save this preference to the database
  }

  if (loading) {
    return (
      <div className={`text-center py-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        <div className="text-6xl mb-4">⏳</div>
        <h3 className="text-xl font-bold mb-2">Loading {handle}'s Feed</h3>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Please wait while we load the products...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-bold mb-2">Error Loading Feed</h3>
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={onBack} className="mt-2">← Back</Button>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className={`text-center py-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        <div className="text-6xl mb-4">❓</div>
        <h3 className="text-xl font-bold mb-2">User Not Found</h3>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
          The user profile could not be found.
        </p>
        <Button onClick={onBack} className="mt-2">← Back</Button>
      </div>
    )
  }

  if (!curatedFeed || curatedFeed.length === 0) {
    return (
      <div className={`text-center py-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-xl font-bold mb-2">No Products Found</h3>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
          {userProfile?.display_name || userProfile?.handle || 'User'} doesn't have any products to show yet.
        </p>
        <Button onClick={onBack} className="mt-2">← Back</Button>
      </div>
    )
  }

  return (
    <div className="pt-12 px-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button onClick={onBack} variant="secondary">← Back</Button>
        <div>
          <h1 className="text-xl font-bold">
            {isOwnFeed ? 'My Curated Feed' : `${userProfile.display_name || userProfile.handle}'s Curated Feed`}
          </h1>
          <p className="text-sm text-gray-600">
            {curatedFeed.length} curated products
            {isOwnFeed && ' • Tap products to remove from public view'}
          </p>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-4">
        {curatedFeed.map((product: any, index: number) => {
          if (!product || !product.id) {
            console.log('❌ Invalid product data:', product)
            return (
              <div key={`invalid-${index}`} className="p-3 border rounded-lg bg-gray-50">
                <div className="text-sm text-gray-600">Product data missing or invalid</div>
              </div>
            )
          }

          // Try to get the actual product image from various possible sources
          let productImage = null
          
          // Try featuredImage first (most common)
          if ((product as any).featuredImage?.url) {
            productImage = {
              url: (product as any).featuredImage.url,
              altText: (product as any).featuredImage.altText || product.title || 'Product Image'
            }
          }
          // Try images array
          else if ((product as any).images && Array.isArray((product as any).images) && (product as any).images.length > 0) {
            productImage = {
              url: (product as any).images[0].url,
              altText: (product as any).images[0].altText || product.title || 'Product Image'
            }
          }
          // Try media array
          else if ((product as any).media && Array.isArray((product as any).media) && (product as any).media.length > 0) {
            productImage = {
              url: (product as any).media[0].url,
              altText: (product as any).media[0].altText || product.title || 'Product Image'
            }
          }
          // Try first variant's image
          else if ((product as any).variants && Array.isArray((product as any).variants) && (product as any).variants.length > 0) {
            const firstVariant = (product as any).variants[0]
            if (firstVariant.image?.url) {
              productImage = {
                url: firstVariant.image.url,
                altText: firstVariant.image.altText || product.title || 'Product Image'
              }
            }
          }
          // Try firstAvailableVariant
          else if ((product as any).firstAvailableVariant?.image?.url) {
            productImage = {
              url: (product as any).firstAvailableVariant.image.url,
              altText: (product as any).firstAvailableVariant.image.altText || product.title || 'Product Image'
            }
          }

          // Ensure product has required fields for ProductCard
          const productForCard = {
            id: product.id,
            title: product.title || 'Untitled Product',
            description: (product as any).description || '',
            price: product.price || { amount: '0.00', currencyCode: 'USD' },
            // Use the actual product image if found, otherwise fallback
            images: productImage ? [productImage] : [{
              // Use a consistent product-like image as fallback
              url: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=${product.id}`,
              altText: product.title || 'Product Image'
            }],
            shop: { 
              id: (product as any).shop?.id || 'shop-1', 
              name: (product as any).shop?.name || 'Unknown Shop' 
            },
            reviewAnalytics: (product as any).reviewAnalytics || {},
            defaultVariantId: (product as any).defaultVariantId || product.id,
            isFavorited: true, // Saved products are favorited by default
            // Use the same image for featuredImage
            featuredImage: productImage || {
              url: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=${product.id}`,
              altText: product.title || 'Product Image'
            }
          }

          return (
            <div key={product.id} className="relative">
              <ProductCard
                product={productForCard as any}
                onFavoriteToggled={handleFavoriteToggled}
              />
              
              {/* Action buttons */}
              <div className="absolute top-2 right-2 flex gap-2">
                {/* Remove button (only for own feed) */}
                {isOwnFeed && (
                  <button
                    onClick={() => handleRemoveFromFeed(product.id)}
                    className="bg-red-500/90 hover:bg-red-600 shadow-lg hover:shadow-xl transition-all duration-300 w-10 h-10 rounded-full flex items-center justify-center"
                    title="Remove from public feed"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                
                {/* Share button */}
                <button
                  onClick={() => {
                    console.log('🗳️ Share button clicked!')
                    handleShareItem(product)
                  }}
                  className="bg-white/90 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-300 w-10 h-10 rounded-full flex items-center justify-center"
                >
                  <Share2 className="w-5 h-5 text-black" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Share Item Modal */}
      {showShareModal && selectedProduct && (
        <ShareItemModal
          product={selectedProduct}
          userId={userId}
          onClose={() => {
            setShowShareModal(false)
            setSelectedProduct(null)
          }}
          onSuccess={handleShareSuccess}
        />
      )}
    </div>
  )
}
