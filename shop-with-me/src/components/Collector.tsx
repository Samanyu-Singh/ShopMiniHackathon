import {useEffect, useMemo} from 'react'
import {
  useCurrentUser,
  useRecommendedProducts,
  useRecommendedShops,
  useProductLists,
  useBuyerAttributes,
  useFollowedShops,
  useSavedProducts,
} from '@shopify/shop-minis-react'
import {supabase} from '../lib/supa'
import {debug} from '../lib/debug'

type ProductEvent = {
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
  source: 'recommended_products' | 'recommended_shops' | 'product_lists' | 'followed_shops' | 'saved_products'
  added_at: string
}

export function Collector() {
  const {currentUser} = useCurrentUser()
  const {buyerAttributes} = useBuyerAttributes()
  
  // Generate stable user ID from displayName
  const userId = useMemo(() => {
    if (!currentUser?.displayName) return null
    return `user_${currentUser.displayName.toLowerCase().replace(/\s+/g, '_')}`
  }, [currentUser?.displayName])
  
  const displayName = currentUser?.displayName

  // Collect data from all hooks automatically
  const recommendedProducts = useRecommendedProducts({first: 50})
  const recommendedShops = useRecommendedShops({first: 20})
  const productLists = useProductLists({first: 5})
  const followedShops = useFollowedShops({first: 20})
  const savedProducts = useSavedProducts({first: 50})

  // Log all collected data to console
  useEffect(() => {
    console.log('🔍 === COLLECTOR DEBUG ===')
    debug.user(currentUser)
    console.log('🔍 Buyer Attributes:', buyerAttributes)
    debug.products('Recommended Products', recommendedProducts.products ?? [])
    debug.products('Recommended Shops', recommendedShops.shops ?? [])
    debug.products('Product Lists', productLists.productLists ?? [])
    debug.products('Followed Shops', followedShops.shops ?? [])
    debug.products('Saved Products', savedProducts.products ?? [])
    console.log('🔍 === END COLLECTOR DEBUG ===')
  }, [
    currentUser, 
    buyerAttributes,
    recommendedProducts.products, 
    recommendedShops.shops, 
    productLists.productLists,
    followedShops.shops,
    savedProducts.products
  ])

  // Automatically save to database when data is available
  useEffect(() => {
    if (!userId || !displayName) return
    
    // Skip mock users like "John Doe"
    if (displayName === "John Doe" || displayName === "Mock User" || displayName?.toLowerCase().includes('mock')) {
      console.log('🚫 Skipping mock user:', displayName)
      return
    }

    const saveUserFeed = async () => {
      console.log('💾 Saving user feed for:', userId)

      // Create product events from all sources with full product data
      const toProductEvent = (
        item: any,
        source: ProductEvent['source']
      ): ProductEvent | null => {
        if (!item?.id) return null
        
        return {
          product_id: item.id,
          product_data: {
            id: item.id,
            title: item.title || `Product ${item.id}`,
            description: item.description,
            price: item.price ? {
              amount: item.price.amount || '0.00',
              currencyCode: item.price.currencyCode || 'USD'
            } : undefined,
            images: item.images ? item.images.map((img: any) => ({
              url: img.url || img.src,
              altText: img.altText || img.alt
            })) : item.featuredImage ? [{
              url: item.featuredImage.url,
              altText: item.featuredImage.altText || item.title || 'Product Image'
            }] : item.image ? [{
              url: item.image.url || item.image.src,
              altText: item.image.altText || item.image.alt
            }] : [{
              // Use a consistent product-like image instead of random
              url: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&random=${item.id}`,
              altText: item.title || 'Product Image'
            }],
            shop: item.shop ? {
              id: item.shop.id,
              name: item.shop.name
            } : undefined
          },
          source,
          added_at: new Date().toISOString(),
        }
      }

      // Process recommended products
      const recommendedProductEvents = (recommendedProducts.products ?? [])
        .map(p => toProductEvent(p, 'recommended_products'))
        .filter(Boolean) as ProductEvent[]

      // Process recommended shops (extract products from shops)
      const recommendedShopEvents = (recommendedShops.shops ?? [])
        .flatMap((shop: any) => {
          // Handle shop products if they exist, otherwise just log the shop
          if (shop.products && Array.isArray(shop.products)) {
            return shop.products.map((p: any) => toProductEvent(p, 'recommended_shops'))
          }
          // If no products, create a shop-level event
          return [toProductEvent(shop, 'recommended_shops')]
        })
        .filter(Boolean) as ProductEvent[]

      // Process product lists
      const productListEvents = (productLists.productLists ?? [])
        .flatMap(list => (list.products ?? []).map(p => toProductEvent(p, 'product_lists')))
        .filter(Boolean) as ProductEvent[]

      // Process followed shops (extract products from followed shops)
      const followedShopEvents = (followedShops.shops ?? [])
        .flatMap((shop: any) => {
          if (shop.products && Array.isArray(shop.products)) {
            return shop.products.map((p: any) => toProductEvent(p, 'followed_shops'))
          }
          return [toProductEvent(shop, 'followed_shops')]
        })
        .filter(Boolean) as ProductEvent[]

      // Process saved products
      const savedProductEvents = (savedProducts.products ?? [])
        .map(p => toProductEvent(p, 'saved_products'))
        .filter(Boolean) as ProductEvent[]

      const allEvents = [
        ...recommendedProductEvents, 
        ...recommendedShopEvents, 
        ...productListEvents,
        ...followedShopEvents,
        ...savedProductEvents
      ]

      console.log('📊 Collected events:', {
        recommendedProducts: recommendedProductEvents.length,
        recommendedShops: recommendedShopEvents.length,
        productLists: productListEvents.length,
        followedShops: followedShopEvents.length,
        savedProducts: savedProductEvents.length,
        total: allEvents.length,
        events: allEvents
      })

      // Debug: Show sample product data
      if (allEvents.length > 0) {
        const firstProduct = allEvents[0].product_data
        console.log('🔍 Sample product data:', {
          firstProduct: firstProduct,
          hasImages: (firstProduct.images?.length || 0) > 0,
          imageUrls: firstProduct.images?.map(img => img.url) || [],
          originalItem: allEvents[0].product_id
        })
        
        // Debug: Check what the original item looked like
        console.log('🔍 Original item structure:', {
          recommendedProducts: recommendedProducts.products?.[0],
          recommendedShops: recommendedShops.shops?.[0],
          productLists: productLists.productLists?.[0]?.products?.[0],
          savedProducts: savedProducts.products?.[0]
        })
        
        // Debug: Check image structures
        if (recommendedProducts.products?.[0]) {
          const sampleRec = recommendedProducts.products[0] as any
          console.log('🔍 Sample recommended product image structure:', {
            hasImages: !!sampleRec.images,
            hasFeaturedImage: !!sampleRec.featuredImage,
            hasImage: !!sampleRec.image,
            images: sampleRec.images,
            featuredImage: sampleRec.featuredImage,
            image: sampleRec.image
          })
        }
      }

      if (allEvents.length === 0) {
        console.log('⚠️ No events to save')
        return
      }

      try {
        // Extract profile picture and user info from currentUser
        console.log('🔍 Current User Object:', currentUser)
        
        // Try to get profile picture from various possible locations
        let profilePic = null
        const user = currentUser as any
        
        if (user?.profileImage?.url) {
          profilePic = user.profileImage.url
        } else if (user?.avatar?.url) {
          profilePic = user.avatar.url
        } else if (user?.image?.url) {
          profilePic = user.image.url
        } else if (user?.picture) {
          profilePic = user.picture
        } else {
          // Fallback to a generated avatar based on user info
          const userInitial = displayName?.charAt(0)?.toUpperCase() || 'U'
          profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}&background=random&color=fff&size=150`
        }

        console.log('🔍 Using profile picture:', profilePic)

        // Upsert user profile with buyer attributes
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: userId,
            handle: displayName || `user-${userId.slice(-6)}`,
            display_name: displayName,
            profile_pic: profilePic,
            gender_affinity: buyerAttributes?.genderAffinity,
            category_affinities: buyerAttributes?.categoryAffinities,
            last_active: new Date().toISOString(),
          })

        // Insert feed items with full product data (with duplicate prevention)
        for (const event of allEvents) {
          await supabase
            .from('user_feed_items')
            .upsert({
              user_id: userId,
              product_id: event.product_id,
              product_data: event.product_data, // Store full product data
              shop_id: event.product_data.shop?.id,
              source: event.source,
              added_at: event.added_at,
            }, {
              onConflict: 'user_id,product_id,source'
            })
        }

        console.log('✅ Successfully saved', allEvents.length, 'feed items with full product data for user:', userId)
        console.log('✅ Updated user profile with buyer attributes:', {
          genderAffinity: buyerAttributes?.genderAffinity,
          categoryAffinities: buyerAttributes?.categoryAffinities
        })
      } catch (error) {
        console.error('❌ Error saving feed:', error)
      }
    }

    // Save when any data changes
    saveUserFeed()
  }, [
    userId, 
    displayName,
    // Profile image not available in currentUser type
    buyerAttributes,
    recommendedProducts.products, 
    recommendedShops.shops, 
    productLists.productLists,
    followedShops.shops,
    savedProducts.products
  ])

  return null
}


