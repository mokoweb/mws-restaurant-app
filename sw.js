const cacheName = "mws-restaurant-project";
const offlineUrl = "index.html";

 const urlsToCache = [
   offlineUrl,
    '/',
   "/restaurant.html",
   "/css/all.min.css",
   "/css/styles.css",
   "/js/dbhelper.js",
   "/js/idb.js",
   "/js/main.js",    
   "/js/restaurant_info.js",
    'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
'restaurant.html?id=1', 'restaurant.html?id=2', 'restaurant.html?id=3', 'restaurant.html?id=4', 'restaurant.html?id=5', 'restaurant.html?id=6', 'restaurant.html?id=7', 'restaurant.html?id=8', 'restaurant.html?id=9', 'restaurant.html?id=10' ]; 


self.addEventListener('install', event => {
  console.log('[SERVICE WORKER] Installing service worker');
  event.waitUntil(
    caches.open(cacheName)
    .then(cache => {
      cache.addAll(urlsToCache);
    })
    .catch(err => console.log(err))
  )
});

self.addEventListener('activate', event => {
  console.log('[SERVICE WORKER] Activating service worker');
  const currentCaches = [cacheName];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const storageUrl = event.request.url.split(/[?#]/)[0];
  if (event.request.method.toLowerCase() === 'get') {
    event.respondWith(
      caches.open(cacheName)
      .then(cache => {
        return cache.match(event.request)
          .then(response => {
            const fetchPromise = fetch(event.request)
              .then(networkResponse => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
              })
            return response || fetchPromise;
          })
      })
      .catch(err => console.log(err))
    );
  }
});
 

