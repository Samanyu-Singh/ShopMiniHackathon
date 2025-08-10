import {useEffect, useState} from 'react'
import {Button, ProductCard} from '@shopify/shop-minis-react'
import {supabase} from '../lib/supa'

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

type FeedItem = {
  id: number
  user_id: string
  product_id: string
  product_data: ProductData
  shop_id?: string
  source: 'recommended_products' | 'recommended_shops' | 'product_lists' | 'followed_shops' | 'saved_products'
  added_at: string
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
}

export function UserFeed({userId, handle, onBack}: Props) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [feedItems, setFeedItems] = useState<FeedItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUserFeed = async () => {
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

        // Load user's feed items with product data
        const {data: items, error: itemsError} = await supabase
          .from('user_feed_items')
          .select('*')
          .eq('user_id', userId)
          .order('added_at', {ascending: false})

        if (itemsError) {
          setError(itemsError.message)
          setLoading(false)
          return
        }
        
        console.log('📊 Loaded feed items with product data:', items)
        
        // Debug: Check first few items
        if (items && items.length > 0) {
          console.log('🔍 First 3 feed items:', items.slice(0, 3).map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_data: item.product_data,
            has_product_data: !!item.product_data,
            product_data_id: item.product_data?.id
          })))
        }
        
        setFeedItems(items as FeedItem[])
        setLoading(false)
      } catch (err) {
        setError('Failed to load user feed')
        setLoading(false)
      }
    }
    
    loadUserFeed()
  }, [userId])

  const handleFavoriteToggled = (isFavorited: boolean) => {
    console.log('Favorite toggled, isFavorited:', isFavorited)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p>Loading {handle}'s curated products...</p>
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
        <p>{userProfile.display_name || userProfile.handle} hasn't curated any products yet.</p>
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
          <h1 className="text-xl font-bold">{userProfile.display_name || userProfile.handle}'s Curated Products</h1>
                            <p className="text-sm text-gray-600">
                    {feedItems.length} products
                  </p>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-4">
        {feedItems.map((item) => {
          const product = item.product_data
          
          if (!product || !product.id) {
            console.log('❌ Invalid product data:', product)
            return (
              <div key={item.id} className="p-3 border rounded-lg bg-gray-50">
                <div className="text-sm text-gray-600">Product data missing or invalid</div>
                <div className="text-xs text-gray-500">Source: {item.source.replace('_', ' ')}</div>
              </div>
            )
          }

          // Ensure product has required fields for ProductCard
          const productForCard = {
            id: product.id || `product-${item.id}`,
            title: product.title || 'Untitled Product',
            description: product.description || '',
            price: product.price || { amount: '0.00', currencyCode: 'USD' },
            // Ensure images have the correct structure for ProductCard
            images: (product.images || []).length > 0 
              ? (product.images || []).map(img => ({
                  url: img.url,
                  altText: img.altText || product.title || 'Product Image'
                }))
              : [{
                  // Use a consistent product-like image
                  url: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=${product.id}`,
                  altText: product.title || 'Product Image'
                }],
            shop: { 
              id: product.shop?.id || 'shop-1', 
              name: product.shop?.name || 'Unknown Shop' 
            },
            reviewAnalytics: product.reviewAnalytics || {},
            defaultVariantId: product.defaultVariantId || product.id || `product-${item.id}`,
            isFavorited: false,
            // Add any missing required fields that ProductCard might expect
            featuredImage: (product.images || []).length > 0 
              ? {
                  url: (product.images || [])[0].url,
                  altText: (product.images || [])[0].altText || product.title || 'Product Image'
                }
              : {
                  url: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=${product.id}`,
                  altText: product.title || 'Product Image'
                }
          }

          console.log('🔍 Rendering product:', {
            id: productForCard.id,
            title: productForCard.title,
            hasImages: productForCard.images?.length > 0,
            imageUrls: productForCard.images?.map(img => img.url),
            price: productForCard.price,
            featuredImage: productForCard.featuredImage,
            fullProduct: productForCard
          })

                            return (
                    <div key={item.id} className="relative">
                      <ProductCard
                        product={productForCard as any}
                        onFavoriteToggled={handleFavoriteToggled}
                      />
                      {/* Source badge */}
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded opacity-75">
                        {item.source.replace('_', ' ')}
                      </div>
                    </div>
                  )
        })}
      </div>
    </div>
  )
}
