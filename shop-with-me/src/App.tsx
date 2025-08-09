import {Button} from '@shopify/shop-minis-react'
import {useCallback} from 'react'

export function App() {
  // Friend-focused shell only; self-related feeds removed
  const handleInviteFriends = useCallback(() => {
    console.log('Invite friends clicked')
  }, [])

  return (
    <div className="pt-12 px-4 pb-6">
      <h1 className="text-2xl font-bold mb-2 text-center">Friends’ products</h1>
      <p className="text-sm text-gray-600 mb-6 text-center">
        Connect with friends to see products they choose to share.
      </p>

      {/* Empty state for friend feed before integration */}
      <div className="text-center text-gray-600 mt-6">
        <p className="mb-3">No friends connected yet.</p>
        <p className="text-sm mb-6">
          When friends opt in, their shared saved/recent products will appear here.
        </p>
        <div className="max-w-xs mx-auto">
          <Button onClick={handleInviteFriends}>Invite friends</Button>
        </div>
      </div>
    </div>
  )
}
