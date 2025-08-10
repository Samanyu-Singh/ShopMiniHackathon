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
  activity_type: 'recommended' | 'saved' | 'liked' | 'shared' | 'browsed'
  source: string
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

  // Collect ONLY real recommended products (no mock data)
  const recommendedProducts = useRecommendedProducts({first: 50})

  // Log all collected data to console
  useEffect(() => {
    console.log('🔍 === COLLECTOR DEBUG ===')
    console.log('🔍 Current User:', currentUser)
    console.log('🔍 Buyer Attributes:', buyerAttributes)
    console.log('🔍 Recommended Products:', recommendedProducts.products ?? [])
    console.log('🔍 === END COLLECTOR DEBUG ===')
  }, [
    currentUser, 
    buyerAttributes,
    recommendedProducts.products
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
        activity_type: ProductEvent['activity_type'],
        source: string
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
          activity_type,
          source,
          added_at: new Date().toISOString(),
        }
      }

      // Process ONLY real recommended products (no mock data)
      const recommendedProductEvents = (recommendedProducts.products ?? [])
        .filter(product => {
          // Filter out products with $0.00 price (mock data)
          if (!product?.id) return false
          
          const price = product.price?.amount || '0.00'
          const isFree = price === '0.00' || price === '0' || parseFloat(price) === 0
          
          if (isFree) {
            console.log('🚫 Filtering out free/mock product:', product.title, 'Price:', price)
            return false
          }
          
          console.log('✅ Including real product:', product.title, 'Price:', price)
          return true
        })
        .map(p => toProductEvent(p, 'recommended', 'recommended_products'))
        .filter(Boolean) as ProductEvent[]

      // Only use real recommended products, skip other sources that might have mock data
      const allEvents = [...recommendedProductEvents]

      console.log('📊 Collected events:', {
        recommendedProducts: recommendedProductEvents.length,
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
      }

      if (allEvents.length === 0) {
        console.log('⚠️ No events to save')
        return
      }

      try {
        // Extract profile picture and user info from currentUser
        console.log('🔍 Current User Object:', currentUser)
        
        // Try to get profile picture from various possible locations (match Profile.tsx logic)
        let profilePic = null as string | null
        const user = currentUser as any
        
        if (user?.avatarImage?.url) {
          profilePic = user.avatarImage.url
        } else if (user?.profileImage?.url) {
          profilePic = user.profileImage.url
        } else if (user?.avatar?.url) {
          profilePic = user.avatar.url
        } else if (user?.imageUrl) {
          profilePic = user.imageUrl
        } else if (user?.image?.url) {
          profilePic = user.image.url
        } else if (user?.picture) {
          profilePic = user.picture
        } else if (user?.photoURL) {
          profilePic = user.photoURL
        } else {
          // Fallback to a generated avatar based on user info
          profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}&background=random&color=fff&size=150`
        }

        console.log('🔍 Using profile picture:', profilePic)

        // Upsert user profile with buyer attributes
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: userId,
            handle: displayName?.toLowerCase().replace(/\s+/g, '_') || `user-${userId.slice(-6)}`,
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
              activity_type: event.activity_type,
              source: event.source,
              interaction_data: {},
              is_active: true,
              created_at: event.added_at,
            }, {
              onConflict: 'user_id,product_id'
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
    buyerAttributes,
    recommendedProducts.products
  ])

  return null
}


