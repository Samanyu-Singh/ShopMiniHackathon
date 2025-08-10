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
  shop_id?: string
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

      // Create product events from all sources
      const toProductEvent = (
        item: any,
        source: ProductEvent['source']
      ): ProductEvent | null => {
        if (!item?.id) return null
        return {
          product_id: item.id,
          shop_id: item.shop?.id,
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

        // Insert feed items (with duplicate prevention)
        for (const event of allEvents) {
          await supabase
            .from('user_feed_items')
            .upsert({
              user_id: userId,
              product_id: event.product_id,
              shop_id: event.shop_id,
              source: event.source,
              added_at: event.added_at,
            }, {
              onConflict: 'user_id,product_id,source'
            })
        }

        console.log('✅ Successfully saved', allEvents.length, 'feed items for user:', userId)
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


