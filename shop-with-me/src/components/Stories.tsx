import {useState, useEffect, useCallback} from 'react'
import {Button, Card, CardContent, Touchable, Avatar, AvatarImage, AvatarFallback, useSavedProducts} from '@shopify/shop-minis-react'
import {supabase} from '../lib/supa'

// Types for stories functionality
type Story = {
  id: string
  user_id: string
  user_handle: string
  user_display_name: string
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
  caption?: string
  created_at: string
  reactions: StoryReaction[]
}

type StoryReaction = {
  id: string
  story_id: string
  user_id: string
  user_handle: string
  user_display_name: string
  reaction_type: 'yes' | 'no' | 'maybe' | 'love' | 'fire'
  comment?: string
  created_at: string
}

type StoryView = 'create' | 'browse' | 'view'

export function Stories({onBack}: {onBack: () => void}) {
  const [view, setView] = useState<StoryView>('browse')
  const [stories, setStories] = useState<Story[]>([])
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedProducts, setSavedProducts] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [caption, setCaption] = useState('')
  const [posting, setPosting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Get saved products from Shopify Mini using the correct hook pattern
  const {products: shopifySavedProducts, fetchMore} = useSavedProducts({first: 50})

  // Haptic feedback function
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }, [])

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      const displayName = localStorage.getItem('currentUser') || 'Unknown User'
      const userId = `user_${displayName.toLowerCase().replace(/\s+/g, '_')}`
      
      // Get or create user profile
      const {data: profile, error} = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create profile
        const {data: newProfile} = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            handle: displayName.toLowerCase().replace(/\s+/g, ''),
            display_name: displayName,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString()
          })
          .select()
          .single()
        
        setCurrentUser(newProfile)
      } else if (profile) {
        setCurrentUser(profile)
      }
    }

    loadCurrentUser()
  }, [])

  // Load saved products from database and Shopify
  useEffect(() => {
    const loadSavedProducts = async () => {
      if (!currentUser) return

      // Get saved products from database
      const {data: dbProducts} = await supabase
        .from('user_feed_items')
        .select('product_data')
        .eq('user_id', currentUser.user_id)
        .eq('source', 'saved_products')

      // Combine with Shopify saved products
      const allProducts = [
        ...(dbProducts?.map(p => p.product_data) || []),
        ...(shopifySavedProducts || [])
      ]

      // Remove duplicates based on product ID
      const uniqueProducts = allProducts.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      )

      setSavedProducts(uniqueProducts)
    }

    loadSavedProducts()
  }, [currentUser, shopifySavedProducts])

  // Load stories
  useEffect(() => {
    const loadStories = async () => {
      setLoading(true)
      try {
        // Get all stories with reactions
        const {data: storiesData, error} = await supabase
          .from('stories')
          .select(`
            *,
            reactions:story_reactions(*)
          `)
          .order('created_at', {ascending: false})

        if (error) {
          console.error('Error loading stories:', error)
          return
        }

        setStories(storiesData || [])
      } catch (error) {
        console.error('Error loading stories:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStories()
  }, [])

  // Create a new story
  const handleCreateStory = async () => {
    if (!selectedProduct || !currentUser) return

    setPosting(true)
    try {
      const {data, error} = await supabase
        .from('stories')
        .insert({
          user_id: currentUser.user_id,
          user_handle: currentUser.handle,
          user_display_name: currentUser.display_name,
          product_data: selectedProduct,
          caption: caption.trim() || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating story:', error)
        return
      }

      // Add to local state
      setStories(prev => [data, ...prev])
      
      // Reset form
      setSelectedProduct(null)
      setCaption('')
      setView('browse')
    } catch (error) {
      console.error('Error creating story:', error)
    } finally {
      setPosting(false)
    }
  }

  // Add reaction to story
  const handleAddReaction = async (storyId: string, reactionType: StoryReaction['reaction_type'], comment?: string) => {
    if (!currentUser) return

    triggerHaptic()
    
    try {
      const {data, error} = await supabase
        .from('story_reactions')
        .insert({
          story_id: storyId,
          user_id: currentUser.user_id,
          user_handle: currentUser.handle,
          user_display_name: currentUser.display_name,
          reaction_type: reactionType,
          comment: comment?.trim() || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding reaction:', error)
        return
      }

      // Update local state
      setStories(prev => prev.map(story => 
        story.id === storyId 
          ? {...story, reactions: [...story.reactions, data]}
          : story
      ))

      if (selectedStory?.id === storyId) {
        setSelectedStory(prev => prev ? {...prev, reactions: [...prev.reactions, data]} : null)
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  // Create story view
  if (view === 'create') {
    return (
      <div className="pt-12 px-4 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <Button onClick={() => setView('browse')} variant="secondary">← Back</Button>
          <h1 className="text-xl font-bold">Create Story</h1>
        </div>

        {!selectedProduct ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Choose a product from your saved items:</h2>
            <div className="grid grid-cols-2 gap-4">
              {savedProducts.map((product) => (
                <Touchable 
                  key={product.id} 
                  onClick={() => setSelectedProduct(product)}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        {product.images?.[0]?.url ? (
                          <img 
                            src={product.images[0].url} 
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-gray-400 text-4xl">📦</div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-sm truncate">{product.title}</h3>
                        {product.price && (
                          <p className="text-sm text-gray-600">
                            ${product.price.amount}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Touchable>
              ))}
            </div>
            
            {/* Load more saved products button */}
            <div className="text-center mt-4">
              <Button onClick={fetchMore} variant="secondary">
                Load More Saved Products
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-4">Help me decide!</h2>
              <Card>
                <CardContent className="p-4">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                    {selectedProduct.images?.[0]?.url ? (
                      <img 
                        src={selectedProduct.images[0].url} 
                        alt={selectedProduct.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-gray-400 text-6xl">📦</div>
                    )}
                  </div>
                  <h3 className="font-semibold mb-2">{selectedProduct.title}</h3>
                  {selectedProduct.price && (
                    <p className="text-lg font-bold text-green-600 mb-2">
                      ${selectedProduct.price.amount}
                    </p>
                  )}
                  {selectedProduct.description && (
                    <p className="text-sm text-gray-600 mb-4">
                      {selectedProduct.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium">Add a caption (optional):</span>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Tell your friends why you're considering this..."
                  className="w-full mt-1 p-3 border rounded-lg resize-none"
                  rows={3}
                />
              </label>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setSelectedProduct(null)}
                  variant="secondary"
                  className="flex-1"
                >
                  Choose Different Product
                </Button>
                <Button 
                  onClick={handleCreateStory}
                  disabled={posting}
                  className="flex-1"
                >
                  {posting ? 'Posting...' : 'Post Story'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // View individual story
  if (view === 'view' && selectedStory) {
    const myReaction = selectedStory.reactions.find(r => r.user_id === currentUser?.user_id)
    
    return (
      <div className="pt-12 px-4 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <Button onClick={() => setView('browse')} variant="secondary">← Back</Button>
          <h1 className="text-xl font-bold">Story</h1>
        </div>

        <div className="space-y-6">
          {/* Story content */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Avatar>
                  <AvatarFallback>
                    {selectedStory.user_display_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedStory.user_display_name}</h3>
                  <p className="text-sm text-gray-600">@{selectedStory.user_handle}</p>
                </div>
              </div>

              <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                {selectedStory.product_data.images?.[0]?.url ? (
                  <img 
                    src={selectedStory.product_data.images[0].url} 
                    alt={selectedStory.product_data.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-gray-400 text-6xl">📦</div>
                )}
              </div>

              <h3 className="font-semibold text-lg mb-2">{selectedStory.product_data.title}</h3>
              {selectedStory.product_data.price && (
                <p className="text-xl font-bold text-green-600 mb-2">
                  ${selectedStory.product_data.price.amount}
                </p>
              )}
              {selectedStory.caption && (
                <p className="text-gray-700 mb-4">{selectedStory.caption}</p>
              )}
            </CardContent>
          </Card>

          {/* Reactions */}
          <div className="space-y-4">
            <h3 className="font-semibold">What do you think?</h3>
            
            {!myReaction ? (
              <div className="grid grid-cols-3 gap-3">
                <Touchable onClick={() => handleAddReaction(selectedStory.id, 'yes')}>
                  <div className="p-4 bg-green-100 rounded-lg text-center">
                    <div className="text-2xl mb-1">👍</div>
                    <div className="text-sm font-medium">Yes!</div>
                  </div>
                </Touchable>
                <Touchable onClick={() => handleAddReaction(selectedStory.id, 'no')}>
                  <div className="p-4 bg-red-100 rounded-lg text-center">
                    <div className="text-2xl mb-1">👎</div>
                    <div className="text-sm font-medium">No</div>
                  </div>
                </Touchable>
                <Touchable onClick={() => handleAddReaction(selectedStory.id, 'maybe')}>
                  <div className="p-4 bg-yellow-100 rounded-lg text-center">
                    <div className="text-2xl mb-1">🤔</div>
                    <div className="text-sm font-medium">Maybe</div>
                  </div>
                </Touchable>
                <Touchable onClick={() => handleAddReaction(selectedStory.id, 'love')}>
                  <div className="p-4 bg-pink-100 rounded-lg text-center">
                    <div className="text-2xl mb-1">❤️</div>
                    <div className="text-sm font-medium">Love it!</div>
                  </div>
                </Touchable>
                <Touchable onClick={() => handleAddReaction(selectedStory.id, 'fire')}>
                  <div className="p-4 bg-orange-100 rounded-lg text-center">
                    <div className="text-2xl mb-1">🔥</div>
                    <div className="text-sm font-medium">Fire!</div>
                  </div>
                </Touchable>
              </div>
            ) : (
              <div className="p-4 bg-gray-100 rounded-lg text-center">
                <div className="text-2xl mb-2">
                  {myReaction.reaction_type === 'yes' && '👍'}
                  {myReaction.reaction_type === 'no' && '👎'}
                  {myReaction.reaction_type === 'maybe' && '🤔'}
                  {myReaction.reaction_type === 'love' && '❤️'}
                  {myReaction.reaction_type === 'fire' && '🔥'}
                </div>
                <p className="font-medium">You reacted: {myReaction.reaction_type}</p>
                {myReaction.comment && (
                  <p className="text-sm text-gray-600 mt-1">"{myReaction.comment}"</p>
                )}
              </div>
            )}

            {/* All reactions */}
            {selectedStory.reactions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">All reactions ({selectedStory.reactions.length})</h4>
                {selectedStory.reactions.map((reaction) => (
                  <div key={reaction.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xl">
                      {reaction.reaction_type === 'yes' && '👍'}
                      {reaction.reaction_type === 'no' && '👎'}
                      {reaction.reaction_type === 'maybe' && '🤔'}
                      {reaction.reaction_type === 'love' && '❤️'}
                      {reaction.reaction_type === 'fire' && '🔥'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{reaction.user_display_name}</p>
                      {reaction.comment && (
                        <p className="text-sm text-gray-600">"{reaction.comment}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Browse stories view
  return (
    <div className="pt-12 px-4 pb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button onClick={onBack} variant="secondary">← Back</Button>
          <h1 className="text-xl font-bold">Stories</h1>
        </div>
        <Button onClick={() => setView('create')}>
          Create Story
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⏳</div>
          <p>Loading stories...</p>
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-2xl font-bold mb-2">No stories yet</h2>
          <p className="text-gray-600 mb-6">Be the first to share a product and get opinions from friends!</p>
          <Button onClick={() => setView('create')}>
            Create Your First Story
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => (
            <Touchable 
              key={story.id} 
              onClick={() => {
                setSelectedStory(story)
                setView('view')
              }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar>
                      <AvatarFallback>
                        {story.user_display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{story.user_display_name}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(story.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{story.reactions.length} reactions</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {story.product_data.images?.[0]?.url ? (
                        <img 
                          src={story.product_data.images[0].url} 
                          alt={story.product_data.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-gray-400 text-xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{story.product_data.title}</h4>
                      {story.product_data.price && (
                        <p className="text-sm text-green-600 font-medium">
                          ${story.product_data.price.amount}
                        </p>
                      )}
                      {story.caption && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {story.caption}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Touchable>
          ))}
        </div>
      )}
    </div>
  )
}
