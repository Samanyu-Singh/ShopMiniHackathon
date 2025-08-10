import {useEffect, useState, useMemo} from 'react'
import {Button} from '@shopify/shop-minis-react'
import {supabase} from '../lib/supa'
import {useCurrentUser} from '@shopify/shop-minis-react'

type UserProfile = {
  user_id: string
  handle: string
  display_name: string
  created_at: string
  last_active: string
  feed_item_count: number
}

type Props = {
  onViewFeed: (userId: string, handle: string) => void
}

export function UserList({onViewFeed}: Props) {
  const {currentUser} = useCurrentUser()
  const currentUserId = useMemo(() => {
    if (!currentUser?.displayName) return null
    return `user_${currentUser.displayName.toLowerCase().replace(/\s+/g, '_')}`
  }, [currentUser?.displayName])
  
  const [userProfiles, setUserProfiles] = useState<UserProfile[] | null>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Load all user profiles with feed item counts
  useEffect(() => {
    const loadUserProfiles = async () => {
      console.log('🔍 Loading user profiles...')
      
      // Get all user profiles with feed item counts
      const {data: profiles, error: profilesError} = await supabase
        .from('user_profiles')
        .select('*')
        .order('last_active', {ascending: false})
      
      if (profilesError) {
        console.error('❌ Error loading profiles:', profilesError)
        setLoading(false)
        return
      }

      // Get feed item counts for each user
      const profilesWithCounts = await Promise.all(
        (profiles || []).map(async (profile) => {
          const {count, error: countError} = await supabase
            .from('user_feed_items')
            .select('*', {count: 'exact', head: true})
            .eq('user_id', profile.user_id)
          
          if (countError) {
            console.error('❌ Error counting feed items for', profile.user_id, ':', countError)
          }
          
          return {
            ...profile,
            feed_item_count: count || 0
          }
        })
      )
      
      console.log('📊 Loaded profiles:', profilesWithCounts)
      setUserProfiles(profilesWithCounts)
      setLoading(false)
    }
    
    loadUserProfiles()
  }, [])

  // Load current user's following relationships
  useEffect(() => {
    if (!currentUserId) return
    
    const loadFollowing = async () => {
      const {data, error} = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
      
      if (error) {
        console.error('❌ Error loading following:', error)
        return
      }
      
      const followingSet = new Set((data ?? []).map(f => f.following_id))
      setFollowing(followingSet)
    }
    
    loadFollowing()
  }, [currentUserId])

  const toggleFollow = async (followingId: string) => {
    if (!currentUserId) return

    if (following.has(followingId)) {
      // Unfollow
      const {error} = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', followingId)
      
      if (error) {
        console.error('❌ Error unfollowing:', error)
        return
      }
      
      setFollowing(prev => {
        const next = new Set(prev)
        next.delete(followingId)
        return next
      })
    } else {
      // Follow
      const {error} = await supabase
        .from('user_follows')
        .insert({
          follower_id: currentUserId,
          following_id: followingId,
        })
      
      if (error) {
        console.error('❌ Error following:', error)
        return
      }
      
      setFollowing(prev => new Set(prev).add(followingId))
    }
  }

  if (loading) {
    return <div className="text-center">Loading users...</div>
  }

  if (!userProfiles || userProfiles.length === 0) {
    return <div className="text-center">No users found.</div>
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Users Using This App</h2>
      {userProfiles.map(userProfile => (
        <div key={userProfile.user_id} className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <div className="font-medium">{userProfile.display_name || userProfile.handle}</div>
            <div className="text-sm text-gray-500">
              {userProfile.feed_item_count} products • Last active: {new Date(userProfile.last_active).toLocaleDateString()}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => onViewFeed(userProfile.user_id, userProfile.handle)}
              variant="secondary"
            >
              View Feed
            </Button>
            {currentUserId && currentUserId !== userProfile.user_id && (
              <Button
                onClick={() => toggleFollow(userProfile.user_id)}
                variant={following.has(userProfile.user_id) ? 'destructive' : 'default'}
              >
                {following.has(userProfile.user_id) ? 'Unfollow' : 'Follow'}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
