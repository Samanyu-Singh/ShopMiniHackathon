import {supabase} from './supa'

// Debug utility to see what data is being returned
export const debugData = {
  // Log current user data
  logCurrentUser: (currentUser: any) => {
    console.log('🔍 Current User Data:', {
      displayName: currentUser?.displayName,
      id: currentUser?.id,
      username: currentUser?.username,
      email: currentUser?.email,
      fullObject: currentUser,
    })
  },

  // Log product data from hooks
  logProducts: (source: string, products: any[]) => {
    console.log(`🔍 ${source} Products:`, {
      count: products?.length || 0,
      sample: products?.slice(0, 2).map(p => ({
        id: p.id,
        title: p.title,
        shop: p.shop?.id,
        price: p.price?.amount,
      })),
      fullData: products,
    })
  },

  // Log user feeds from database
  logUserFeeds: async () => {
    const {data, error} = await supabase
      .from('user_feeds')
      .select('*')
    
    console.log('🔍 User Feeds from DB:', {
      count: data?.length || 0,
      error: error?.message,
      data: data,
    })
  },

  // Log user friends from database
  logUserFriends: async () => {
    const {data, error} = await supabase
      .from('user_friends')
      .select('*')
    
    console.log('🔍 User Friends from DB:', {
      count: data?.length || 0,
      error: error?.message,
      data: data,
    })
  },

  // Log all database tables
  logAllTables: async () => {
    console.log('🔍 Checking all tables...')
    
    // Check user_feeds
    const {data: feeds, error: feedsError} = await supabase
      .from('user_feeds')
      .select('count')
    
    // Check user_friends
    const {data: friends, error: friendsError} = await supabase
      .from('user_friends')
      .select('count')
    
    console.log('🔍 Database Summary:', {
      user_feeds: {
        count: feeds?.length || 0,
        error: feedsError?.message,
      },
      user_friends: {
        count: friends?.length || 0,
        error: friendsError?.message,
      },
    })
  },

  // Log what's being sent to database
  logDatabaseWrite: (table: string, data: any) => {
    console.log(`🔍 Writing to ${table}:`, {
      table,
      data,
      timestamp: new Date().toISOString(),
    })
  },
}

// Export debug functions for use in components
export const debug = {
  // Quick debug all
  all: async () => {
    console.log('🔍 === DEBUG ALL ===')
    await debugData.logAllTables()
    console.log('🔍 === END DEBUG ===')
  },

  // Debug specific table
  table: async (tableName: string) => {
    const {data, error} = await supabase
      .from(tableName)
      .select('*')
    
    console.log(`🔍 Table ${tableName}:`, {
      count: data?.length || 0,
      error: error?.message,
      data: data,
    })
  },

  // Debug current user
  user: (currentUser: any) => {
    debugData.logCurrentUser(currentUser)
  },

  // Debug products
  products: (source: string, products: any[]) => {
    debugData.logProducts(source, products)
  },
}
