import {useState, useCallback, useEffect} from 'react'
import {Button, Avatar, AvatarImage, AvatarFallback, Touchable, Card, CardContent, useCurrentUser} from '@shopify/shop-minis-react'
import {Edit3, Save, X} from 'lucide-react'
import {supabase} from '../lib/supa'

type Props = {
  onBack: () => void
  onViewSaved: () => void
  isDarkMode: boolean
}

export function Profile({onBack, onViewSaved, isDarkMode}: Props) {
  const {currentUser} = useCurrentUser()
  const [bio, setBio] = useState('')
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [editBioText, setEditBioText] = useState('')
  const [loading, setLoading] = useState(false)
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [followersList, setFollowersList] = useState<any[]>([])
  const [followingList, setFollowingList] = useState<any[]>([])

  // Debug user data
  console.log('👤 Profile - useCurrentUser data:', currentUser)
  console.log('👤 Profile - currentUser keys:', currentUser ? Object.keys(currentUser) : 'No currentUser')
  console.log('👤 Profile - currentUser.displayName:', currentUser?.displayName)
  console.log('👤 Profile - currentUser.imageUrl:', currentUser?.imageUrl)
  console.log('👤 Profile - currentUser.profileImage:', currentUser?.profileImage)
  console.log('👤 Profile - currentUser.avatar:', currentUser?.avatar)
  console.log('👤 Profile - currentUser.picture:', currentUser?.picture)
  console.log('👤 Profile - currentUser.photoURL:', currentUser?.photoURL)

  // Haptic feedback function
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }, [])

  // Load user bio from database
  const loadUserBio = useCallback(async () => {
    if (!currentUser?.displayName) {
      console.log('👤 Profile - No displayName available')
      return
    }

    const userId = `user_${currentUser.displayName.toLowerCase().replace(/\s+/g, '_')}`
    console.log('👤 Profile - Loading bio for user ID:', userId)

    try {
      const {data, error} = await supabase
        .from('user_profiles')
        .select('bio, display_name, handle')
        .eq('user_id', userId)
        .single()

      console.log('👤 Profile - Database response:', {data, error})

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error loading user bio:', error)
        return
      }

      if (data?.bio) {
        console.log('👤 Profile - Found bio in database:', data.bio)
        setBio(data.bio)
        setEditBioText(data.bio)
      } else {
        // Set default bio if none exists
        const defaultBio = ""
        console.log('👤 Profile - No bio found, setting default:', defaultBio)
        setBio(defaultBio)
        setEditBioText(defaultBio)
      }
    } catch (error) {
      console.error('Error loading user bio:', error)
    }
  }, [currentUser?.displayName])

  // Save bio to database
  const saveBio = useCallback(async () => {
    if (!currentUser?.displayName) {
      console.log('👤 Profile - No displayName available for saving')
      return
    }

    const userId = `user_${currentUser.displayName.toLowerCase().replace(/\s+/g, '_')}`
    console.log('👤 Profile - Saving bio for user ID:', userId)
    console.log('👤 Profile - Bio text to save:', editBioText)
    
    setLoading(true)
    try {
      const {data, error} = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          bio: editBioText,
          display_name: currentUser.displayName || 'User',
          handle: currentUser.displayName?.toLowerCase().replace(/\s+/g, '_') || 'user',
          last_active: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      console.log('👤 Profile - Save response:', {data, error})

      if (error) {
        console.error('Error saving bio:', error)
        return
      }

      setBio(editBioText)
      setIsEditingBio(false)
      console.log('👤 Profile - Bio saved successfully')
      
      // Reload bio to confirm it was saved
      setTimeout(() => {
        loadUserBio()
      }, 500)
    } catch (error) {
      console.error('Error saving bio:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.displayName, editBioText, loadUserBio])

  // Load followers count and list
  const loadFollowers = useCallback(async () => {
    if (!currentUser?.displayName) return

    const userId = `user_${currentUser.displayName.toLowerCase().replace(/\s+/g, '_')}`
    console.log('👤 Profile - Loading followers for user ID:', userId)

    try {
      const {data, error} = await supabase
        .from('followers')
        .select(`
          follower_id,
          followed_at,
          user_profiles!followers_follower_id_fkey (
            display_name,
            handle,
            profile_pic
          )
        `)
        .eq('following_id', userId)
        .order('followed_at', {ascending: false})

      if (error) {
        console.error('Error loading followers:', error)
        return
      }

      const followersData = (data || []).map(item => ({
        id: item.follower_id,
        display_name: item.user_profiles?.display_name || 'Unknown',
        handle: item.user_profiles?.handle || 'unknown',
        profile_pic: item.user_profiles?.profile_pic,
        followed_at: item.followed_at
      }))

      console.log('👤 Profile - Followers data:', followersData)
      setFollowers(followersData.length)
      setFollowersList(followersData)
    } catch (error) {
      console.error('Error loading followers:', error)
    }
  }, [currentUser?.displayName])

  // Load following count and list
  const loadFollowing = useCallback(async () => {
    if (!currentUser?.displayName) return

    const userId = `user_${currentUser.displayName.toLowerCase().replace(/\s+/g, '_')}`
    console.log('👤 Profile - Loading following for user ID:', userId)

    try {
      const {data, error} = await supabase
        .from('followers')
        .select(`
          following_id,
          followed_at,
          user_profiles!followers_following_id_fkey (
            display_name,
            handle,
            profile_pic
          )
        `)
        .eq('follower_id', userId)
        .order('followed_at', {ascending: false})

      if (error) {
        console.error('Error loading following:', error)
        return
      }

      const followingData = (data || []).map(item => ({
        id: item.following_id,
        display_name: item.user_profiles?.display_name || 'Unknown',
        handle: item.user_profiles?.handle || 'unknown',
        profile_pic: item.user_profiles?.profile_pic,
        followed_at: item.followed_at
      }))

      console.log('👤 Profile - Following data:', followingData)
      setFollowing(followingData.length)
      setFollowingList(followingData)
    } catch (error) {
      console.error('Error loading following:', error)
    }
  }, [currentUser?.displayName])

  // Load bio and follower data on component mount
  useEffect(() => {
    loadUserBio()
    loadFollowers()
    loadFollowing()
  }, [loadUserBio, loadFollowers, loadFollowing])

  // Handle edit bio button click
  const handleEditBio = useCallback(() => {
    triggerHaptic()
    setEditBioText(bio)
    setIsEditingBio(true)
  }, [bio, triggerHaptic])

  // Handle save bio
  const handleSaveBio = useCallback(() => {
    triggerHaptic()
    saveBio()
  }, [saveBio, triggerHaptic])

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    triggerHaptic()
    setIsEditingBio(false)
    setEditBioText(bio)
  }, [bio, triggerHaptic])

  // Handle view saved
  const handleViewSaved = useCallback(() => {
    triggerHaptic()
    onViewSaved()
  }, [onViewSaved, triggerHaptic])



  // Get user display name and profile pic
  const displayName = currentUser?.displayName || 'User'
  
  // Try to get profile picture from various possible locations (same logic as Collector)
  let profilePicUrl = ''
  if (currentUser?.avatarImage?.url) {
    profilePicUrl = currentUser.avatarImage.url
  } else if (currentUser?.profileImage?.url) {
    profilePicUrl = currentUser.profileImage.url
  } else if (currentUser?.avatar?.url) {
    profilePicUrl = currentUser.avatar.url
  } else if (currentUser?.imageUrl) {
    profilePicUrl = currentUser.imageUrl
  } else if (currentUser?.picture) {
    profilePicUrl = currentUser.picture
  } else if (currentUser?.photoURL) {
    profilePicUrl = currentUser.photoURL
  } else {
    // Fallback to a generated avatar based on user info
    profilePicUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}&background=random&color=fff&size=150`
  }
  
  console.log('👤 Profile - Display name:', displayName)
  console.log('👤 Profile - Profile pic URL:', profilePicUrl)

  return (
    <div className={`min-h-screen ${
      isDarkMode
        ? 'bg-gradient-to-b from-purple-900 via-black to-black text-white'
        : 'bg-gradient-to-b from-purple-100 via-purple-200 to-purple-300 text-gray-900'
    } pt-12 pb-6`}>
      {/* Header */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'}`}>
              Profile
            </h2>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-sm mt-1`}>
              Manage your profile and view your stats
            </p>
          </div>
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

      {/* Main Content - Centered like the example */}
      <div className="max-w-[420px] mx-auto px-6">
        {/* Header: centered profile picture with name and bio */}
        <div className="text-center mb-8">
          {/* Circular profile photo */}
          <div className="mb-3">
            <Avatar className="w-20 h-20 mx-auto">
              <AvatarImage 
                src={profilePicUrl} 
                alt={displayName}
              />
              <AvatarFallback 
                className={`text-3xl font-bold ${
                  isDarkMode 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-200 text-purple-800'
                }`}
              >
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="text-lg font-semibold mb-2">{displayName}</div>
          
          <div className={`text-sm leading-relaxed max-w-[280px] mx-auto ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {bio}
          </div>
          
          {/* Edit Bio Button */}
          <Button
            onClick={handleEditBio}
            variant="ghost"
            size="sm"
            className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Edit3 className="w-3 h-3 mr-1" />
            Edit bio
          </Button>
        </div>

        {/* Followers and Following counts side by side - Clickable */}
        <div className="flex justify-center gap-12 mb-6">
          <Touchable onClick={() => {
            triggerHaptic()
            setShowFollowersModal(true)
          }}>
            <div className="text-center cursor-pointer w-full">
              <div className="text-4xl font-bold tracking-tight text-center w-full">{followers}</div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-center w-full`}>
                followers
              </div>
            </div>
          </Touchable>
          <Touchable onClick={() => {
            triggerHaptic()
            setShowFollowingModal(true)
          }}>
            <div className="text-center cursor-pointer w-full">
              <div className="text-4xl font-bold tracking-tight text-center w-full">{following}</div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-center w-full`}>
                following
              </div>
            </div>
          </Touchable>
        </div>


      </div>

      {/* Bio Edit Modal */}
      {isEditingBio && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className={`backdrop-blur-md rounded-3xl p-6 w-full max-w-md shadow-2xl border animate-in slide-in-from-bottom-4 duration-300 ${
            isDarkMode 
              ? 'bg-gray-900/95 border-gray-800' 
              : 'bg-white/95 border-white/20'
          }`}>
            <div className="mb-4">
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Edit Bio
              </h3>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={editBioText}
                onChange={(e) => setEditBioText(e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={200}
                className={`w-full px-4 py-3 border-2 rounded-2xl focus:outline-none focus:ring-4 transition-all duration-300 resize-none ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-500' 
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
                rows={4}
                autoFocus
              />
              
              <div className={`text-xs text-right ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {editBioText.length}/200
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleCancelEdit}
                  variant="secondary"
                  className={`flex-1 rounded-2xl py-3 font-semibold border-2 transition-all duration-300 ${
                    isDarkMode 
                      ? 'border-gray-700 hover:border-gray-600 bg-gray-800 text-gray-200' 
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveBio}
                  disabled={loading}
                  className="flex-1 rounded-2xl py-3 font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-all duration-300"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Followers Modal */}
      {showFollowersModal && (
        <FollowersModal
          followers={followersList}
          isDarkMode={isDarkMode}
          onClose={() => setShowFollowersModal(false)}
          onViewProfile={(userId) => {
            console.log('Navigate to follower profile:', userId)
            // TODO: Navigate to user profile
            setShowFollowersModal(false)
          }}
        />
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <FollowingModal
          following={followingList}
          isDarkMode={isDarkMode}
          onClose={() => setShowFollowingModal(false)}
          onViewProfile={(userId) => {
            console.log('Navigate to following profile:', userId)
            // TODO: Navigate to user profile
            setShowFollowingModal(false)
          }}
        />
      )}
    </div>
  )
}

// Followers Modal Component
type FollowersModalProps = {
  followers: any[]
  isDarkMode: boolean
  onClose: () => void
  onViewProfile: (userId: string) => void
}

function FollowersModal({followers, isDarkMode, onClose, onViewProfile}: FollowersModalProps) {
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className={`backdrop-blur-md rounded-3xl p-6 w-full max-w-md shadow-2xl border animate-in slide-in-from-bottom-4 duration-300 ${
        isDarkMode 
          ? 'bg-gray-900/95 border-gray-800' 
          : 'bg-white/95 border-white/20'
      }`}>
        <div className="mb-4 flex justify-between items-center">
          <div className="flex-1"></div>
          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Followers
          </h3>
          <div className="flex-1 flex justify-end">
            <Button 
              onClick={onClose}
              variant="ghost"
              size="sm"
              className={isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="max-h-64 overflow-y-auto space-y-2">
          {followers.length === 0 ? (
            <div className="text-center py-8">
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>No followers yet</p>
            </div>
          ) : (
            followers.map((follower) => (
              <Touchable key={follower.id} onClick={() => {
                triggerHaptic()
                onViewProfile(follower.id)
              }}>
                <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                  isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                }`}>
                    <Avatar className="w-10 h-10">
                      <AvatarImage 
                        src={(follower.profile_pic && follower.profile_pic !== 'null' && follower.profile_pic !== 'undefined')
                          ? follower.profile_pic
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(follower.display_name)}&background=random&color=fff&size=150`}
                        alt={follower.display_name}
                        referrerPolicy="no-referrer"
                      />
                    <AvatarFallback className="text-sm font-bold">
                      {follower.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{follower.display_name}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      @{follower.handle}
                    </p>
                  </div>
                </div>
              </Touchable>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Following Modal Component
type FollowingModalProps = {
  following: any[]
  isDarkMode: boolean
  onClose: () => void
  onViewProfile: (userId: string) => void
}

function FollowingModal({following, isDarkMode, onClose, onViewProfile}: FollowingModalProps) {
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className={`backdrop-blur-md rounded-3xl p-6 w-full max-w-md shadow-2xl border animate-in slide-in-from-bottom-4 duration-300 ${
        isDarkMode 
          ? 'bg-gray-900/95 border-gray-800' 
          : 'bg-white/95 border-white/20'
      }`}>
        <div className="mb-4 flex justify-between items-center">
          <div className="flex-1"></div>
          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Following
          </h3>
          <div className="flex-1 flex justify-end">
            <Button 
              onClick={onClose}
              variant="ghost"
              size="sm"
              className={isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="max-h-64 overflow-y-auto space-y-2">
          {following.length === 0 ? (
            <div className="text-center py-8">
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Not following anyone yet</p>
            </div>
          ) : (
            following.map((followed) => (
              <Touchable key={followed.id} onClick={() => {
                triggerHaptic()
                onViewProfile(followed.id)
              }}>
                <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                  isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                }`}>
                    <Avatar className="w-10 h-10">
                      <AvatarImage 
                        src={(followed.profile_pic && followed.profile_pic !== 'null' && followed.profile_pic !== 'undefined')
                          ? followed.profile_pic
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(followed.display_name)}&background=random&color=fff&size=150`}
                        alt={followed.display_name}
                        referrerPolicy="no-referrer"
                      />
                    <AvatarFallback className="text-sm font-bold">
                      {followed.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{followed.display_name}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      @{followed.handle}
                    </p>
                  </div>
                </div>
              </Touchable>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
