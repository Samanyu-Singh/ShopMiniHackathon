import {useEffect, useState} from 'react'
import {Button} from '@shopify/shop-minis-react'
import {supabase} from '../lib/supa'

type FeedItem = {
  id: number
  user_id: string
  product_id: string
  shop_id?: string
  source: 'recommended_products' | 'recommended_shops' | 'product_lists'
  added_at: string
}

type UserProfile = {
  user_id: string
  handle: string
  display_name: string
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

        // Load user's feed items
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
        
        console.log('📊 Loaded feed items:', items)
        setFeedItems(items as FeedItem[])
        setLoading(false)
      } catch (err) {
        setError('Failed to load user feed')
        setLoading(false)
      }
    }
    
    loadUserFeed()
  }, [userId])

  if (loading) {
    return (
      <div className="text-center">
        <p>Loading {handle}'s feed...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        <p>Error: {error}</p>
        <Button onClick={onBack} className="mt-2">Back</Button>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="text-center">
        <p>User not found.</p>
        <Button onClick={onBack} className="mt-2">Back</Button>
      </div>
    )
  }

  if (!feedItems || feedItems.length === 0) {
    return (
      <div className="text-center">
        <p>{userProfile.display_name || userProfile.handle} hasn't discovered any products yet.</p>
        <Button onClick={onBack} className="mt-2">Back</Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={onBack} variant="secondary">← Back</Button>
        <h2 className="text-lg font-semibold">{userProfile.display_name || userProfile.handle}'s Discoveries</h2>
      </div>

      <div className="space-y-2">
        {feedItems.map((item) => (
          <div key={item.id} className="p-3 border rounded-lg">
            <div className="text-sm text-gray-600">Product: {item.product_id}</div>
            <div className="text-xs text-gray-500">Source: {item.source.replace('_', ' ')}</div>
            {item.shop_id && (
              <div className="text-xs text-gray-500">Shop: {item.shop_id}</div>
            )}
            <div className="text-xs text-gray-400">Added: {new Date(item.added_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
