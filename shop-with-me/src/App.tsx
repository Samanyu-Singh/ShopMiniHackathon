import {useState} from 'react'
import {Collector} from './components/Collector'
import {UserList} from './components/UserList'
import {UserFeed} from './components/UserFeed'

type View = 'main' | 'feed'

type FeedView = {
  userId: string
  handle: string
}

export function App() {
  const [view, setView] = useState<View>('main')
  const [feedView, setFeedView] = useState<FeedView | null>(null)

  const handleViewFeed = (userId: string, handle: string) => {
    setFeedView({userId, handle})
    setView('feed')
  }

  const handleBack = () => {
    setView('main')
    setFeedView(null)
  }

  if (view === 'feed' && feedView) {
    return (
      <div className="pt-12 px-4 pb-6">
        <UserFeed
          userId={feedView.userId}
          handle={feedView.handle}
          onBack={handleBack}
        />
      </div>
    )
  }

  return (
    <div className="pt-12 px-4 pb-6">
      <h1 className="text-2xl font-bold mb-2 text-center">Shop With Friends</h1>
      <p className="text-sm text-gray-600 mb-6 text-center">
        See what products your friends are discovering
      </p>

      {/* Automatic data collector - runs when app opens */}
      <Collector />

      {/* User list - shows all users using the app */}
      <div className="mb-6">
        <UserList onViewFeed={handleViewFeed} />
      </div>
    </div>
  )
}
