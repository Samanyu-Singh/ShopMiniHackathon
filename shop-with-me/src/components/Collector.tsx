import {useEffect, useMemo} from 'react'
import {
  useCurrentUser,
} from '@shopify/shop-minis-react'
import {supabase} from '../lib/supa'

export function Collector() {
  const {currentUser} = useCurrentUser()
  
  // Generate stable user ID from displayName
  const userId = useMemo(() => {
    if (!currentUser?.displayName) return null
    return `user_${currentUser.displayName.toLowerCase().replace(/\s+/g, '_')}`
  }, [currentUser?.displayName])
  
  const displayName = currentUser?.displayName

  // Log current user for debugging
  useEffect(() => {
    console.log('🔍 === COLLECTOR DEBUG ===')
    console.log('🔍 Current User:', currentUser?.displayName)
    console.log('🔍 User ID:', userId)
    console.log('🔍 === END COLLECTOR DEBUG ===')
  }, [currentUser, userId])

  // Simple user profile creation
  useEffect(() => {
    if (!userId || !displayName) return
    
    // Skip mock users like "John Doe"
    if (displayName === "John Doe" || displayName === "Mock User" || displayName?.toLowerCase().includes('mock')) {
      console.log('🚫 Skipping mock user:', displayName)
      return
    }

    const createUserProfile = async () => {
      console.log('💾 Creating user profile for:', userId)

      try {
        // Create or update user profile
        const {data: profile, error: profileError} = await supabase
          .from('user_profiles')
          .upsert({
            user_id: userId,
            handle: displayName.toLowerCase().replace(/\s+/g, ''),
            display_name: displayName,
            last_active: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single()

        if (profileError) {
          console.error('❌ Error creating/updating user profile:', profileError)
          return
        }

        console.log('✅ User profile created/updated:', profile)
      } catch (error) {
        console.error('❌ Error creating user profile:', error)
      }
    }

    createUserProfile()
  }, [userId, displayName])

  // Return null since this is just a background component
  return null
}


