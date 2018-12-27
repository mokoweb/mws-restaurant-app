const cacheName = "mws-restaurant-project";
const offlineUrl = "index.html";

self.addEventListener("install", event => {
 const urlsToCache = [
   offlineUrl,
    '/',
   "/restaurant.html",
   "/css/styles.css",
   "/data/restaurants.json",
   "/js/dbhelper.js",
   "/js/main.js",    
   "/js/restaurant_info.js",
    '/img/1.jpg',
    '/img/2.jpg',
    '/img/3.jpg',
    '/img/4.jpg',
    '/img/5.jpg',
    '/img/6.jpg',
    '/img/7.jpg',
    '/img/8.jpg',
    '/img/9.jpg',
    '/img/10.jpg',
    '/img/15.jpg',
    'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
'restaurant.html?id=1', 'restaurant.html?id=2', 'restaurant.html?id=3', 'restaurant.html?id=4', 'restaurant.html?id=5', 'restaurant.html?id=6', 'restaurant.html?id=7', 'restaurant.html?id=8', 'restaurant.html?id=9', 'restaurant.html?id=10' ]; 


 
 event.waitUntil(
   caches.open(cacheName).then(cache => cache.addAll(urlsToCache))
 );
});

self.addEventListener('activate', e =>{
    console.log('[ServiceWorker] Activated');

    e.waitUntil(

    	// Get all the cache keys (cacheName)
		caches.keys().then(cacheNames =>{
			return Promise.all(cacheNames.map(thisCacheName =>{

				// If a cached item is saved under a previous cacheName
				if (thisCacheName !== cacheName) {

					// Delete that cached file
					console.log('[ServiceWorker] Removing Cached Files from Cache - ', thisCacheName);
					return caches.delete(thisCacheName);
				}
			}));
		})
	); // end e.waitUntil

});

self.addEventListener('fetch', e =>{
	console.log('[ServiceWorker] Fetch', e.request.url);

	// e.respondWidth Responds to the fetch event
	e.respondWith(

		// Check in cache for the request being made
	 caches.match(e.request)


			.then(response =>{

				// If the request is in the cache
				if ( response ) {
					console.log("[ServiceWorker] Found in Cache", e.request.url, response);
					// Return the cached version
					return response;
				}

				// If the request is NOT in the cache, fetch and cache

				let requestClone = e.request.clone();
				return fetch(requestClone)
					.then(response =>{

						if ( !response ) return;

						let responseClone = response.clone();

						//  Open the cache
						caches.open(cacheName).then(cache =>{

							// Put the fetched response in the cache
							cache.put(e.request, responseClone);
							console.log('[ServiceWorker] New Data Cached', e.request.url);

							// Return the response
							return response;
			
				        }); // end caches.open

					})
					.catch(err =>{
						console.log('[ServiceWorker] Error Fetching & Caching New Data', err);
					});


			}) // end caches.match(e.request)
	); // end e.respondWith
});
