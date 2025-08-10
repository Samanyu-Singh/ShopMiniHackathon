import {useEffect, useMemo} from 'react'
import {
  useCurrentUser,
  useRecommendedProducts,
  useRecommendedShops,
  useProductLists,
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
  source: 'recommended_products' | 'recommended_shops' | 'product_lists'
  added_at: string
}

export function Collector() {
  const {currentUser} = useCurrentUser()
  
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

  // Log all collected data to console
  useEffect(() => {
    console.log('🔍 === COLLECTOR DEBUG ===')
    debug.user(currentUser)
    debug.products('Recommended Products', recommendedProducts.products ?? [])
    debug.products('Recommended Shops', recommendedShops.shops ?? [])
    debug.products('Product Lists', productLists.productLists ?? [])
    console.log('🔍 === END COLLECTOR DEBUG ===')
  }, [currentUser, recommendedProducts.products, recommendedShops.shops, productLists.productLists])

  // Automatically save to database when data is available
  useEffect(() => {
    if (!userId || !displayName) return

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
            })) : undefined,
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

      const allEvents = [...recommendedProductEvents, ...recommendedShopEvents, ...productListEvents]

      console.log('📊 Collected events:', {
        recommendedProducts: recommendedProductEvents.length,
        recommendedShops: recommendedShopEvents.length,
        productLists: productListEvents.length,
        total: allEvents.length,
        events: allEvents
      })

      if (allEvents.length === 0) {
        console.log('⚠️ No events to save')
        return
      }

      try {
        // Upsert user profile
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: userId,
            handle: displayName || `user-${userId.slice(-6)}`,
            display_name: displayName,
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
      } catch (error) {
        console.error('❌ Error saving feed:', error)
      }
    }

    // Save when any data changes
    saveUserFeed()
  }, [
    userId, 
    displayName, 
    recommendedProducts.products, 
    recommendedShops.shops, 
    productLists.productLists
  ])

  return null
}


