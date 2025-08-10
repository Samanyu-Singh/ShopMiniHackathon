import {useState, useCallback, useEffect} from 'react'
import {Button, Avatar, AvatarImage, AvatarFallback, Touchable, Card, CardContent} from '@shopify/shop-minis-react'
import {UserPlus, Users, UserCheck, Clock} from 'lucide-react'
import {supabase} from '../lib/supa'

type Follower = {
  follower_id: string
  follower_display_name: string
  follower_handle: string
  follower_profile_pic?: string
  followed_at: string
}

type Following = {
  following_id: string
  following_display_name: string
  following_handle: string
  following_profile_pic?: string
  followed_at: string
}

type FollowRequest = {
  request_id: string
  requester_id: string
  requester_display_name: string
  requester_handle: string
  requester_profile_pic?: string
  message?: string
  created_at: string
}

type UserProfile = {
  user_id: string
  display_name: string
  handle: string
  profile_pic?: string
}

type TabType = 'followers' | 'following' | 'requests' | 'discover'

type Props = {
  onBack: () => void
  currentUserId: string
  isDarkMode: boolean
}

export function Friends({onBack, currentUserId, isDarkMode}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('followers')
  const [followers, setFollowers] = useState<Follower[]>([])
  const [following, setFollowing] = useState<Following[]>([])
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([])
  const [discoverUsers, setDiscoverUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [pendingFollows, setPendingFollows] = useState<{[key: string]: boolean}>({})
  
  // Search states for followers and following tabs
  const [followersSearchQuery, setFollowersSearchQuery] = useState('')
  const [followingSearchQuery, setFollowingSearchQuery] = useState('')
  const [filteredFollowers, setFilteredFollowers] = useState<Follower[]>([])
  const [filteredFollowing, setFilteredFollowing] = useState<Following[]>([])

  // Haptic feedback function
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }, [])

  // Load followers (people who are friends with current user)
  const loadFollowers = useCallback(async () => {
    try {
      console.log('🔍 Loading followers for:', currentUserId)
      
      const {data, error} = await supabase
        .from('friendships')
        .select(`
          user_id,
          created_at,
          user_profiles!friendships_user_id_fkey (
            display_name,
            handle,
            profile_pic
          )
        `)
        .eq('friend_id', currentUserId)
        .eq('status', 'accepted')
        .order('created_at', {ascending: false})
      
      console.log('🔍 Followers raw data:', data)
      
      if (error) {
        console.error('Error loading followers:', error)
        setFollowers([])
        return
      }

      const followersData = (data || []).map(item => ({
        follower_id: item.user_id,
        follower_display_name: item.user_profiles?.display_name || 'Unknown',
        follower_handle: item.user_profiles?.handle || 'unknown',
        follower_profile_pic: item.user_profiles?.profile_pic,
        followed_at: item.created_at
      }))

      console.log('🔍 Processed followers data:', followersData)
      setFollowers(followersData)
    } catch (error) {
      console.error('Error loading followers:', error)
      setFollowers([])
    }
  }, [currentUserId])

  // Load following (people the current user is friends with)
  const loadFollowing = useCallback(async () => {
    try {
      console.log('🔍 Loading following for:', currentUserId)
      
      const {data, error} = await supabase
        .from('friendships')
        .select(`
          friend_id,
          created_at,
          user_profiles!friendships_friend_id_fkey (
            display_name,
            handle,
            profile_pic
          )
        `)
        .eq('user_id', currentUserId)
        .eq('status', 'accepted')
        .order('created_at', {ascending: false})
      
      console.log('🔍 Following raw data:', data)
      
      if (error) {
        console.error('Error loading following:', error)
        setFollowing([])
        return
      }

      const followingData = (data || []).map(item => ({
        following_id: item.friend_id,
        following_display_name: item.user_profiles?.display_name || 'Unknown',
        following_handle: item.user_profiles?.handle || 'unknown',
        following_profile_pic: item.user_profiles?.profile_pic,
        followed_at: item.created_at
      }))

      console.log('🔍 Processed following data:', followingData)
      setFollowing(followingData)
    } catch (error) {
      console.error('Error loading following:', error)
      setFollowing([])
    }
  }, [currentUserId])

  // Load follow requests
  const loadFollowRequests = useCallback(async () => {
    try {
      console.log('🔍 Loading follow requests for:', currentUserId)
      
      const {data, error} = await supabase
        .from('follow_requests')
        .select(`
          id,
          requester_id,
          message,
          created_at,
          user_profiles!follow_requests_requester_id_fkey (
            display_name,
            handle,
            profile_pic
          )
        `)
        .eq('recipient_id', currentUserId)
        .eq('status', 'pending')
        .order('created_at', {ascending: false})
      
      console.log('🔍 Follow requests raw data:', data)
      
      if (error) {
        console.error('Error loading follow requests:', error)
        setFollowRequests([])
        return
      }

      const requestsData = (data || []).map(item => ({
        request_id: item.id,
        requester_id: item.requester_id,
        requester_display_name: item.user_profiles?.display_name || 'Unknown',
        requester_handle: item.user_profiles?.handle || 'unknown',
        requester_profile_pic: item.user_profiles?.profile_pic,
        message: item.message,
        created_at: item.created_at
      }))

      console.log('🔍 Processed follow requests data:', requestsData)
      setFollowRequests(requestsData)
    } catch (error) {
      console.error('Error loading follow requests:', error)
      setFollowRequests([])
    }
  }, [currentUserId])

  // Load discover users (users who are not being followed)
  const loadDiscoverUsers = useCallback(async () => {
    try {
      console.log('🔍 Loading discover users for:', currentUserId)
      
      // Get all user profiles
      const {data: allUsers, error: allUsersError} = await supabase
        .from('user_profiles')
        .select('user_id, display_name, handle, profile_pic')
        .neq('user_id', currentUserId)
      
      console.log('🔍 All users found:', allUsers)
      
      if (allUsersError) {
        console.error('Error loading all users:', allUsersError)
        return
      }

      // Get current user's following list (friendships where user_id = currentUserId)
      const {data: userFollowing, error: followingError} = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', currentUserId)
        .eq('status', 'accepted')
      
      console.log('🔍 User following list:', userFollowing)
      
      // Get current user's pending follow requests
      const {data: userRequests, error: requestsError} = await supabase
        .from('friend_requests')
        .select('recipient_id')
        .eq('requester_id', currentUserId)
        .eq('status', 'pending')
      
      console.log('🔍 User pending requests:', userRequests)
      
      if (followingError) {
        console.error('Error loading user following:', followingError)
        // If friendships table doesn't exist, just show all users
        console.log('🔍 Showing all users since friendships table error')
        setDiscoverUsers(allUsers || [])
        return
      }

      // Filter out users who are already being followed or have pending requests
      const followingIds = new Set((userFollowing || []).map(f => f.friend_id))
      const requestIds = new Set((userRequests || []).map(r => r.recipient_id))
      const discoverUsers = (allUsers || []).filter(user => 
        !followingIds.has(user.user_id) && !requestIds.has(user.user_id)
      )
      
      console.log('🔍 Discover users after filtering:', discoverUsers)
      setDiscoverUsers(discoverUsers)
    } catch (error) {
      console.error('Error loading discover users:', error)
    }
  }, [currentUserId])

  // Load data based on active tab
  useEffect(() => {
    setLoading(true)
    
    const loadData = async () => {
      switch (activeTab) {
        case 'followers':
          // Always load following data first for followers tab
          await loadFollowing()
          await loadFollowers()
          break
        case 'following':
          await loadFollowing()
          break
        case 'requests':
          await loadFollowRequests()
          break
        case 'discover':
          await loadFollowing() // Need following data for discover filtering
          await loadDiscoverUsers()
          break
      }
      setLoading(false)
    }

    loadData()
  }, [activeTab, loadFollowers, loadFollowing, loadFollowRequests, loadDiscoverUsers])

  // Send follow request
  const sendFollowRequest = useCallback(async (userIdToFollow: string) => {
    try {
      triggerHaptic()
      
      // Optimistic update
      setPendingFollows(prev => ({...prev, [userIdToFollow]: true}))

      const {error} = await supabase
        .from('friend_requests')
        .insert({
          requester_id: currentUserId,
          recipient_id: userIdToFollow,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error sending follow request:', error)
        // Revert optimistic update
        setPendingFollows(prev => ({...prev, [userIdToFollow]: false}))
        return
      }

      console.log('Follow request sent successfully')
      
      // Keep the button as "Request Sent" - don't refresh data
      // This allows the button to stay in the "Request Sent" state

    } catch (error) {
      console.error('Error sending follow request:', error)
      setPendingFollows(prev => ({...prev, [userIdToFollow]: false}))
    }
  }, [currentUserId, triggerHaptic])

  // Unfollow user
  const unfollowUser = useCallback(async (userIdToUnfollow: string) => {
    try {
      triggerHaptic()
      
      // Delete both sides of the friendship
      const {error: error1} = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', currentUserId)
        .eq('friend_id', userIdToUnfollow)

      const {error: error2} = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', userIdToUnfollow)
        .eq('friend_id', currentUserId)

      if (error1 || error2) {
        console.error('Error unfollowing user:', error1 || error2)
        return
      }

      console.log('User unfollowed successfully')
      
      // Refresh following list
      loadFollowing()

    } catch (error) {
      console.error('Error unfollowing user:', error)
    }
  }, [currentUserId, triggerHaptic, loadFollowing])

  // Accept follow request
  const acceptFollowRequest = useCallback(async (requestId: string, requesterId: string) => {
    try {
      triggerHaptic()
      
      // Update request status to accepted
      const {error: updateError} = await supabase
        .from('friend_requests')
        .update({status: 'accepted'})
        .eq('id', requestId)

      if (updateError) {
        console.error('Error accepting follow request:', updateError)
        return
      }

      // Create the friendship relationship in both directions
      const {error: followError1} = await supabase
        .from('friendships')
        .insert({
          user_id: requesterId,
          friend_id: currentUserId,
          status: 'accepted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      const {error: followError2} = await supabase
        .from('friendships')
        .insert({
          user_id: currentUserId,
          friend_id: requesterId,
          status: 'accepted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (followError1 || followError2) {
        console.error('Error creating friendship relationship:', followError1 || followError2)
        return
      }

      console.log('Follow request accepted successfully')
      
      // Refresh data
      loadFollowRequests()
      loadFollowers()

    } catch (error) {
      console.error('Error accepting follow request:', error)
    }
  }, [currentUserId, triggerHaptic, loadFollowRequests, loadFollowers])

  // Decline follow request
  const declineFollowRequest = useCallback(async (requestId: string) => {
    try {
      triggerHaptic()
      
      const {error} = await supabase
        .from('friend_requests')
        .update({status: 'declined'})
        .eq('id', requestId)

      if (error) {
        console.error('Error declining follow request:', error)
        return
      }

      console.log('Follow request declined successfully')
      
      // Refresh requests
      loadFollowRequests()

    } catch (error) {
      console.error('Error declining follow request:', error)
    }
  }, [triggerHaptic, loadFollowRequests])

  // Filter followers based on search query
  useEffect(() => {
    if (!followersSearchQuery.trim()) {
      setFilteredFollowers(followers)
    } else {
      const filtered = followers.filter(follower => {
        const query = followersSearchQuery.toLowerCase()
        const name = follower.follower_display_name.toLowerCase()
        const handle = follower.follower_handle.toLowerCase()
        return name.includes(query) || handle.includes(query)
      })
      setFilteredFollowers(filtered)
    }
  }, [followers, followersSearchQuery])

  // Filter following based on search query
  useEffect(() => {
    if (!followingSearchQuery.trim()) {
      setFilteredFollowing(following)
    } else {
      const filtered = following.filter(followed => {
        const query = followingSearchQuery.toLowerCase()
        const name = followed.following_display_name.toLowerCase()
        const handle = followed.following_handle.toLowerCase()
        return name.includes(query) || handle.includes(query)
      })
      setFilteredFollowing(filtered)
    }
  }, [following, followingSearchQuery])

  const formatRelativeTime = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return `${Math.floor(diffInHours / 168)}w ago`
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-purple-100 text-gray-900'} pt-12 pb-6`}>
      {/* Header */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'}`}>
              Followers
            </h2>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm mt-1`}>
              {activeTab === 'followers' && `${followers.length} followers`}
              {activeTab === 'following' && `${following.length} following`}
              {activeTab === 'requests' && `${followRequests.length} pending requests`}
              {activeTab === 'discover' && 'Find new people to follow'}
            </p>
          </div>
          <div className="flex gap-3">
            {activeTab === 'discover' && (
              <Button 
                onClick={() => {
                  triggerHaptic()
                  setShowAddFriendModal(true)
                }}
                variant="secondary" 
                size="sm"
                className={`${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' : 'bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white hover:shadow-lg text-black'} transition-all duration-300`}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Friend
              </Button>
            )}
            <Button 
              onClick={onBack} 
              variant="secondary" 
              size="sm"
              className={`${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' : 'bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white hover:shadow-lg text-black'} transition-all duration-300`}
            >
              ← Back
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="flex flex-col gap-1">
            <Button
              onClick={() => {
                triggerHaptic()
                setActiveTab('followers')
              }}
              variant={activeTab === 'followers' ? 'default' : 'secondary'}
              size="sm"
              className="flex items-center gap-1 whitespace-nowrap text-xs px-3"
            >
              <Users className="w-3 h-3" />
              Followers
            </Button>
            <Button
              onClick={() => {
                triggerHaptic()
                setActiveTab('following')
              }}
              variant={activeTab === 'following' ? 'default' : 'secondary'}
              size="sm"
              className="flex items-center gap-1 whitespace-nowrap text-xs px-3"
            >
              <UserCheck className="w-3 h-3" />
              Following
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              onClick={() => {
                triggerHaptic()
                setActiveTab('requests')
              }}
              variant={activeTab === 'requests' ? 'default' : 'secondary'}
              size="sm"
              className="flex items-center gap-1 whitespace-nowrap text-xs px-3"
            >
              <Clock className="w-3 h-3" />
              Requests
            </Button>
            <Button
              onClick={() => {
                triggerHaptic()
                setActiveTab('discover')
              }}
              variant={activeTab === 'discover' ? 'default' : 'secondary'}
              size="sm"
              className="flex items-center gap-1 whitespace-nowrap text-xs px-3"
            >
              <UserPlus className="w-3 h-3" />
              Discover
            </Button>
          </div>
        </div>
      </div>

      {/* Search Inputs */}
      {activeTab === 'followers' && (
        <div className="px-6 mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search followers..."
              className={`w-full px-4 py-2 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 text-sm ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-blue-500/20 focus:border-blue-500'
              }`}
              value={followersSearchQuery}
              onChange={(e) => setFollowersSearchQuery(e.target.value)}
            />
            <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-400'
            }`}>
              🔍
            </div>
          </div>
        </div>
      )}

      {activeTab === 'following' && (
        <div className="px-6 mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search following..."
              className={`w-full px-4 py-2 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 text-sm ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-blue-500/20 focus:border-blue-500'
              }`}
              value={followingSearchQuery}
              onChange={(e) => setFollowingSearchQuery(e.target.value)}
            />
            <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-400'
            }`}>
              🔍
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="flex-1">
                  <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
                        {/* Followers Tab */}
            {activeTab === 'followers' && (
              <div className="space-y-2">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                        <div className="flex-1">
                          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                          <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredFollowers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-bold mb-2">
                      {followersSearchQuery ? 'No followers found' : 'No followers yet'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {followersSearchQuery ? 'Try searching with different keywords' : 'Share your profile to get followers!'}
                    </p>
                  </div>
                ) : (
                  filteredFollowers.map((follower) => {
                    // Check if current user is following this follower back
                    const isFollowingBack = following.some(f => f.following_id === follower.follower_id)
                    
                    return (
                      <div key={follower.follower_id} className={`flex items-center gap-3 p-3 rounded-lg ${
                        isDarkMode ? 'bg-gray-800' : 'bg-white/80'
                      }`}>
                        <Touchable onClick={() => {
                          triggerHaptic()
                          // TODO: Navigate to follower's profile
                          console.log('Navigate to follower profile:', follower.follower_id)
                        }}>
                          <Avatar className="w-10 h-10">
                            <AvatarImage 
                              src={follower.follower_profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(follower.follower_display_name)}&background=random&color=fff&size=150`} 
                              alt={follower.follower_display_name} 
                            />
                            <AvatarFallback className="text-sm font-bold">
                              {follower.follower_display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Touchable>
                        <Touchable onClick={() => {
                          triggerHaptic()
                          // TODO: Navigate to follower's profile
                          console.log('Navigate to follower profile:', follower.follower_id)
                        }}>
                          <div className="flex-1">
                            <p className="font-semibold">{follower.follower_display_name}</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              @{follower.follower_handle}
                            </p>
                          </div>
                        </Touchable>
                        <div className="ml-auto">
                          {isFollowingBack ? (
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Following
                            </span>
                          ) : (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                sendFollowRequest(follower.follower_id)
                              }}
                              disabled={pendingFollows[follower.follower_id]}
                              size="sm"
                              className={`${
                                pendingFollows[follower.follower_id] 
                                  ? 'bg-gray-400 text-white' 
                                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                            >
                              {pendingFollows[follower.follower_id] ? 'Request Sent' : 'Follow Back'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-2">
                {followRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📨</div>
                    <h3 className="text-xl font-bold mb-2">No pending requests</h3>
                    <p className="text-gray-600">You're all caught up!</p>
                  </div>
                ) : (
                  followRequests.map((request) => (
                    <div key={request.request_id} className={`flex items-center gap-3 p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-white/80'
                    }`}>
                      <Avatar className="w-10 h-10">
                        <AvatarImage 
                          src={request.requester_profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.requester_display_name)}&background=random&color=fff&size=150`} 
                          alt={request.requester_display_name} 
                        />
                        <AvatarFallback className="text-sm font-bold">
                          {request.requester_display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{request.requester_display_name}</p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1`}>
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(request.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => acceptFollowRequest(request.request_id, request.requester_id)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          Accept
                        </Button>
                        <Button
                          onClick={() => declineFollowRequest(request.request_id)}
                          variant="secondary"
                          size="sm"
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Following Tab */}
            {activeTab === 'following' && (
              <div className="space-y-2">
                {filteredFollowing.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-bold mb-2">
                      {followingSearchQuery ? 'No following found' : 'Not following anyone yet'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {followingSearchQuery ? 'Try searching with different keywords' : 'Start following people to see their content!'}
                    </p>
                    {!followingSearchQuery && (
                      <Button 
                        onClick={() => {
                          triggerHaptic()
                          setActiveTab('discover')
                        }}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg transition-all duration-300"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Find People to Follow
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredFollowing.map((followed) => (
                    <div key={followed.following_id} className={`flex items-center gap-3 p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-white/80'
                    }`}>
                      <Touchable onClick={() => {
                        triggerHaptic()
                        // TODO: Navigate to followed user's profile
                        console.log('Navigate to followed user profile:', followed.following_id)
                      }}>
                        <Avatar className="w-10 h-10">
                          <AvatarImage 
                            src={followed.following_profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(followed.following_display_name)}&background=random&color=fff&size=150`} 
                            alt={followed.following_display_name} 
                          />
                          <AvatarFallback className="text-sm font-bold">
                            {followed.following_display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Touchable>
                      <Touchable onClick={() => {
                        triggerHaptic()
                        // TODO: Navigate to followed user's profile
                        console.log('Navigate to followed user profile:', followed.following_id)
                      }}>
                        <div className="flex-1">
                          <p className="font-semibold">{followed.following_display_name}</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            @{followed.following_handle}
                          </p>
                        </div>
                      </Touchable>
                      <Button
                        onClick={() => unfollowUser(followed.following_id)}
                        size="sm"
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        Unfollow
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Discover Tab */}
            {activeTab === 'discover' && (
              <div className="space-y-2">
                {discoverUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-xl font-bold mb-2">No more users to discover</h3>
                    <p className="text-gray-600">You're following everyone!</p>
                  </div>
                ) : (
                  discoverUsers.map((user) => (
                    <div key={user.user_id} className={`flex items-center gap-3 p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-white/80'
                    }`}>
                      <Touchable onClick={() => {
                        triggerHaptic()
                        // TODO: Navigate to user's profile
                        console.log('Navigate to user profile:', user.user_id)
                      }}>
                        <Avatar className="w-10 h-10">
                          <AvatarImage 
                            src={user.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name)}&background=random&color=fff&size=150`} 
                            alt={user.display_name} 
                          />
                          <AvatarFallback className="text-sm font-bold">
                            {user.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Touchable>
                      <Touchable onClick={() => {
                        triggerHaptic()
                        // TODO: Navigate to user's profile
                        console.log('Navigate to user profile:', user.user_id)
                      }}>
                        <div className="flex-1">
                          <p className="font-semibold">{user.display_name}</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            @{user.handle}
                          </p>
                        </div>
                      </Touchable>
                      <Button
                        onClick={() => sendFollowRequest(user.user_id)}
                        disabled={pendingFollows[user.user_id]}
                        size="sm"
                        className={`${
                          pendingFollows[user.user_id] 
                            ? 'bg-gray-400 text-white' 
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        {pendingFollows[user.user_id] ? 'Request Sent' : 'Follow'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <AddFriendModal
          currentUserId={currentUserId}
          isDarkMode={isDarkMode}
          onClose={() => setShowAddFriendModal(false)}
          onSuccess={() => {
            setShowAddFriendModal(false)
            loadDiscoverUsers()
          }}
        />
      )}
    </div>
  )
}

// Add Friend Modal Component
type AddFriendModalProps = {
  currentUserId: string
  isDarkMode: boolean
  onClose: () => void
  onSuccess: () => void
}

function AddFriendModal({currentUserId, isDarkMode, onClose, onSuccess}: AddFriendModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<{[key: string]: boolean}>({})

  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }, [])

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const {data, error} = await supabase
        .from('user_profiles')
        .select('user_id, display_name, handle, profile_pic')
        .or(`display_name.ilike.%${query}%,handle.ilike.%${query}%`)
        .neq('user_id', currentUserId)
        .limit(10)

      if (error) {
        console.error('Error searching users:', error)
        return
      }

      // Filter out users who are already being followed
      const {data: userFollowing} = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', currentUserId)
        .eq('status', 'accepted')
      
      const followingIds = new Set((userFollowing || []).map(f => f.friend_id))
      const filteredResults = (data || []).filter(user => !followingIds.has(user.user_id))
      
      setSearchResults(filteredResults)
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setSearching(false)
    }
  }, [currentUserId])

  const followUser = useCallback(async (userIdToFollow: string) => {
    try {
      triggerHaptic()
      
      setPendingRequests(prev => ({...prev, [userIdToFollow]: true}))

      // Create friendship in both directions
      const {error: error1} = await supabase
        .from('friendships')
        .insert({
          user_id: currentUserId,
          friend_id: userIdToFollow,
          status: 'accepted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      const {error: error2} = await supabase
        .from('friendships')
        .insert({
          user_id: userIdToFollow,
          friend_id: currentUserId,
          status: 'accepted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error1 || error2) {
        console.error('Error following user:', error1 || error2)
        setPendingRequests(prev => ({...prev, [userIdToFollow]: false}))
        return
      }

      console.log('User followed successfully')
      onSuccess()
      
    } catch (error) {
      console.error('Error following user:', error)
      setPendingRequests(prev => ({...prev, [userIdToFollow]: false}))
    }
  }, [currentUserId, triggerHaptic, onSuccess])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchUsers])

  return (
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
            Add Friend
          </h2>
        </div>
        
        <div className="space-y-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or handle..."
              className={`w-full px-6 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 transition-all duration-300 text-lg ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-blue-500/20 focus:border-blue-500'
              }`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <div className={`absolute right-4 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-400'
            }`}>
              🔍
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {searching ? (
              <div className="text-center py-4">
                <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Searching...</p>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div key={user.user_id} className={`flex items-center gap-3 p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                }`}>
                  <Avatar className="w-10 h-10">
                    <AvatarImage 
                      src={user.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name)}&background=random&color=fff&size=150`} 
                      alt={user.display_name} 
                    />
                    <AvatarFallback className="text-sm font-bold">
                      {user.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{user.display_name}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      @{user.handle}
                    </p>
                  </div>
                  <Button
                    onClick={() => followUser(user.user_id)}
                    disabled={pendingRequests[user.user_id]}
                    size="sm"
                    className={`${
                      pendingRequests[user.user_id] 
                        ? 'bg-gray-400 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {pendingRequests[user.user_id] ? 'Following' : 'Follow'}
                  </Button>
                </div>
              ))
            ) : searchQuery ? (
              <div className="text-center py-4">
                <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>No users found</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Start typing to search for users</p>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={onClose}
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
  )
}
