import {useEffect, useState} from 'react'
import {Button, ProductCard, IconButton} from '@shopify/shop-minis-react'
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

type FeedItem = {
  id: string
  user_id: string
  product_id: string
  product_data: ProductData
  activity_type: string
  source: string
  created_at: string
}

type Props = {
  userId: string
  handle: string
  onBack: () => void
  isDarkMode: boolean
}

export function UserFeed({userId, handle, onBack, isDarkMode}: Props) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true)
      console.log('🔍 Loading feed for user:', userId)
      
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

        // Load user's feed items
        const {data: items, error: itemsError} = await supabase
          .from('user_feed_items')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', {ascending: false})

        if (itemsError) {
          console.error('Error loading feed items:', itemsError)
          setError('Failed to load feed items')
          setLoading(false)
          return
        }

        setFeedItems(items || [])
        setLoading(false)
        console.log('✅ Loaded', items?.length || 0, 'feed items for user:', userId)
      } catch (err) {
        setError('Failed to load user data')
        setLoading(false)
      }
    }
    
    loadUserData()
  }, [userId])

  const handleFavoriteToggled = (isFavorited: boolean) => {
    console.log('Favorite toggled, isFavorited:', isFavorited)
  }

  const handleShareItem = (product: any) => {
    console.log('📤 Share button clicked for product:', product)
    
    // Convert Shopify Product to ProductData format for the modal
    // Find the best available product image, falling back to a stable placeholder
    let productImage: { url: string; altText?: string } | null = null
    if ((product as any).featuredImage?.url) {
      productImage = {
        url: (product as any).featuredImage.url,
        altText: (product as any).featuredImage.altText || product.title || 'Product Image'
      }
    } else if ((product as any).images && Array.isArray((product as any).images) && (product as any).images.length > 0) {
      productImage = {
        url: (product as any).images[0].url,
        altText: (product as any).images[0].altText || product.title || 'Product Image'
      }
    } else if ((product as any).media && Array.isArray((product as any).media) && (product as any).media.length > 0) {
      productImage = {
        url: (product as any).media[0].url,
        altText: (product as any).media[0].altText || product.title || 'Product Image'
      }
    } else if ((product as any).variants && Array.isArray((product as any).variants) && (product as any).variants.length > 0) {
      const firstVariant = (product as any).variants[0]
      if (firstVariant.image?.url) {
        productImage = {
          url: firstVariant.image.url,
          altText: firstVariant.image.altText || product.title || 'Product Image'
        }
      }
    } else if ((product as any).firstAvailableVariant?.image?.url) {
      productImage = {
        url: (product as any).firstAvailableVariant.image.url,
        altText: (product as any).firstAvailableVariant.image.altText || product.title || 'Product Image'
      }
    }

    // Always have at least one image available for shared items
    const ensuredImage = productImage || {
      url: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&auto=format&random=${product.id}`,
      altText: product.title || 'Product Image'
    }

    const productData: ProductData = {
      id: product.id,
      title: product.title || 'Untitled Product',
      description: (product as any).description || '',
      price: product.price || { amount: '0.00', currencyCode: 'USD' },
      images: [ensuredImage],
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

  if (loading) {
    return (
      <div className="text-center py-8">
        <p>Loading {handle}'s feed...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        <p>Error: {error}</p>
        <Button onClick={onBack} className="mt-2">Back</Button>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="text-center py-8">
        <p>User not found.</p>
        <Button onClick={onBack} className="mt-2">Back</Button>
      </div>
    )
  }

  if (!feedItems || feedItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p>{userProfile.display_name || userProfile.handle} hasn't added any products to their feed yet.</p>
        <Button onClick={onBack} className="mt-2">Back</Button>
      </div>
    )
  }

  return (
    <div className="pt-12 px-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button onClick={onBack} variant="secondary">← Back</Button>
        <div>
          <h1 className="text-xl font-bold">{userProfile.display_name || userProfile.handle}'s Feed</h1>
          <p className="text-sm text-gray-600">
            {feedItems.length} products
          </p>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-4">
        {feedItems.map((feedItem, index) => {
          const product = feedItem.product_data
          if (!product || !product.id) {
            console.log('❌ Invalid product data:', product)
            return (
              <div key={`invalid-${index}`} className="p-3 border rounded-lg bg-gray-50">
                <div className="text-sm text-gray-600">Product data missing or invalid</div>
              </div>
            )
          }

          // Debug: Log the actual product structure to understand available properties
          console.log('🔍 Raw product from useSavedProducts:', {
            id: product.id,
            title: product.title,
            price: product.price,
            // Log all available properties
            allProps: Object.keys(product),
            // Try different possible image properties
            featuredImage: (product as any).featuredImage,
            images: (product as any).images,
            media: (product as any).media,
            variants: (product as any).variants,
            firstAvailableVariant: (product as any).firstAvailableVariant
          })

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

          console.log('🔍 Rendering saved product:', {
            id: productForCard.id,
            title: productForCard.title,
            hasImages: productForCard.images?.length > 0,
            imageUrls: productForCard.images?.map((img: any) => img.url),
            price: productForCard.price,
            featuredImage: productForCard.featuredImage
          })

          return (
            <div key={product.id} className={`relative ${isDarkMode ? 'smr-dark-card' : ''}`}>
              <ProductCard
                product={productForCard as any}
                onFavoriteToggled={handleFavoriteToggled}
              />
              {/* Share button */}
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => {
                    console.log('🗳️ Share button clicked!')
                    handleShareItem(product)
                  }}
                  className="bg-white/90 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-300 w-10 h-10 rounded-full flex items-center justify-center"
                >
                  <Share2 className={'w-5 h-5 text-black'} />
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
