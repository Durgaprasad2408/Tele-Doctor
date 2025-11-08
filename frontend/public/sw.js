// Service Worker for TeleMed PWA
const CACHE_NAME = 'telemed-v1.0.0'
const STATIC_CACHE_NAME = 'telemed-static-v1.0.0'
const DYNAMIC_CACHE_NAME = 'telemed-dynamic-v1.0.0'

// Files to cache immediately
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/call-sound.mp3',
  // Add other critical assets
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/users\/profile$/,
  /^\/api\/appointments$/,
  /^\/api\/notifications/,
  /^\/api\/users\/doctors/
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('Service Worker: Static assets cached')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker: Activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle static assets and pages
  event.respondWith(handleStaticRequest(request))
})

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url)
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // Only cache successful 200 responses (ignore 206 partial content)
    if (networkResponse.status === 200 && shouldCacheApiResponse(url.pathname)) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for API request')
    
    // Try cache if network fails
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for critical endpoints
    if (shouldReturnOfflineResponse(url.pathname)) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'You are currently offline. Some features may not be available.',
          cached: true
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    throw error
  }
}

// Handle static requests with network-first strategy for HTML
async function handleStaticRequest(request) {
  // For HTML pages, use network-first strategy
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    try {
      // Try network first for HTML
      const networkResponse = await fetch(request)
      if (networkResponse.status === 200) {
        return networkResponse
      }
    } catch {
      console.log('Service Worker: Network failed for HTML request, trying cache')
    }

    // Fallback to cache for HTML
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
  }

  // For other assets, use cache-first strategy
  try {
    // Try cache first
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Try network
    const networkResponse = await fetch(request)

    // Only cache successful 200 responses (avoid 206, 304, etc.)
    if (networkResponse.status === 200 && networkResponse.headers.get('Content-Type')?.includes('text')) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('Service Worker: Failed to fetch', request.url)

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/')
      if (offlineResponse) {
        return offlineResponse
      }
    }

    throw error
  }
}

// Check if API response should be cached
function shouldCacheApiResponse(pathname) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(pathname))
}

// Check if offline response should be returned
function shouldReturnOfflineResponse(pathname) {
  const offlineEndpoints = [
    '/api/users/profile',
    '/api/appointments',
    '/api/notifications'
  ]
  return offlineEndpoints.some(endpoint => pathname.startsWith(endpoint))
}

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

// Background sync function
async function doBackgroundSync() {
  try {
    // Sync offline actions when back online
    console.log('Service Worker: Performing background sync')
    
    // You can implement offline queue sync here
    // For example, sync offline messages, appointment updates, etc.
    
  } catch (error) {
    console.error('Service Worker: Background sync failed', error)
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received')
  
  const options = {
    body: 'You have a new notification from TeleMed',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/xmark.png'
      }
    ]
  }
  
  if (event.data) {
    const data = event.data.json()
    options.body = data.body || options.body
    options.title = data.title || 'TeleMed'
  }
  
  event.waitUntil(
    self.registration.showNotification('TeleMed', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked')
  
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      self.clients.openWindow('/notifications')
    )
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the app
    event.waitUntil(
      self.clients.openWindow('/')
    )
  }
})

// Handle message from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
    // Force all clients to refresh
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ type: 'REFRESH_PAGE' }))
    })
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }
})