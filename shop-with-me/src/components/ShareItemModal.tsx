import {useState, useCallback} from 'react'
import {Button, Card, CardContent, Input, Toaster, Touchable, useCurrentUser} from '@shopify/shop-minis-react'
import {X, Share2, MessageCircle} from 'lucide-react'
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
}

type Props = {
  product: ProductData
  userId: string // Add userId prop
  onClose: () => void
  onSuccess: () => void
}

export function ShareItemModal({product, userId, onClose, onSuccess}: Props) {
  const [shareMessage, setShareMessage] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const {currentUser} = useCurrentUser()

  // Haptic feedback function
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }, [])

  const handleShare = useCallback(async () => {
    console.log('📤 Starting share process...')
    console.log('📦 Product data:', product)
    
    if (!product?.id) {
      console.error('❌ No product ID found')
      return
    }
    
    triggerHaptic()
    setIsSharing(true)
    
    try {
      console.log('👤 User info:', { userId })
      // Ensure the user's profile has an up-to-date profile picture like Profile page
      try {
        const user = currentUser as any
        let profilePicUrl: string | null = null
        if (user?.avatarImage?.url) {
          profilePicUrl = user.avatarImage.url
        } else if (user?.profileImage?.url) {
          profilePicUrl = user.profileImage.url
        } else if (user?.avatar?.url) {
          profilePicUrl = user.avatar.url
        } else if (user?.imageUrl) {
          profilePicUrl = user.imageUrl
        } else if (user?.image?.url) {
          profilePicUrl = user.image.url
        } else if (user?.picture) {
          profilePicUrl = user.picture
        } else if (user?.photoURL) {
          profilePicUrl = user.photoURL
        } else {
          profilePicUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'User')}&background=random&color=fff&size=150`
        }

        const handle = (currentUser?.displayName || 'user')
          .toLowerCase()
          .replace(/\s+/g, '_')

        await supabase
          .from('user_profiles')
          .upsert({
            user_id: userId,
            display_name: currentUser?.displayName || 'User',
            handle,
            profile_pic: profilePicUrl,
            last_active: new Date().toISOString()
          }, { onConflict: 'user_id' })
      } catch (e) {
        console.warn('⚠️ Failed to upsert user profile before sharing:', e)
      }
      
      // Check if user already shared this product
      const {data: existingShares, error: checkError} = await supabase
        .from('shared_items')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', product.id)
        .eq('is_active', true)
      
      if (checkError) {
        console.error('❌ Error checking existing shares:', checkError)
      }
      
      const existingShare = existingShares?.[0] // Get first match if any
      
      if (existingShare) {
        console.log('You have already shared this item!')
        setIsSharing(false)
        return
      }
      
      // Share the item
      const shareData = {
        user_id: userId,
        product_id: product.id,
        product_data: product,
        share_message: shareMessage.trim() || null,
        is_active: true
      }
      
      console.log('📤 Inserting share data:', shareData)
      
      const {error: shareError} = await supabase
        .from('shared_items')
        .insert(shareData)
      
      if (shareError) {
        console.error('❌ Error sharing item:', shareError)
        console.log('Failed to share item')
        setIsSharing(false)
        return
      }
      
      console.log('Item shared successfully!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('❌ Error sharing item:', error)
      console.log('Failed to share item')
    } finally {
      setIsSharing(false)
    }
  }, [product, shareMessage, onSuccess, onClose, triggerHaptic])

  const handleClose = useCallback(() => {
    triggerHaptic()
    onClose()
  }, [onClose, triggerHaptic])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="backdrop-blur-md rounded-3xl p-6 w-full max-w-md shadow-2xl border bg-white/95 border-white/20 animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Share for Voting</h2>
              <p className="text-sm text-gray-600">Let the community vote on this item</p>
            </div>
          </div>
          <Touchable onClick={handleClose}>
            <div className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200">
              <X className="w-4 h-4 text-gray-600" />
            </div>
          </Touchable>
        </div>

        {/* Product Preview */}
        <Card className="mb-6 bg-gray-50/50 border border-gray-200">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Product Image */}
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                {product.images?.[0] ? (
                  <img 
                    src={product.images[0].url} 
                    alt={product.title || 'Product'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-2xl">📦</div>
                  </div>
                )}
              </div>
              
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                  {product.title || 'Untitled Product'}
                </h3>
                {product.price && (
                  <p className="text-lg font-bold text-green-600">
                    ${product.price.amount} {product.price.currencyCode}
                  </p>
                )}
                {product.shop?.name && (
                  <p className="text-xs text-gray-500 mt-1">
                    from {product.shop.name}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share Message Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Optional Message
            </div>
          </label>
          <Input
            placeholder="Why should others vote on this item? (optional)"
            value={shareMessage}
            onChange={(e) => setShareMessage(e.target.value)}
            className="w-full"
            maxLength={200}
          />
          <p className="text-xs text-gray-500 mt-1">
            {shareMessage.length}/200 characters
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={handleClose}
            variant="secondary"
            className="flex-1"
            disabled={isSharing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleShare}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg transition-all duration-300"
            disabled={isSharing}
          >
            {isSharing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sharing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share Item
              </div>
            )}
          </Button>
        </div>
      </div>
      
      <Toaster />
    </div>
  )
}
