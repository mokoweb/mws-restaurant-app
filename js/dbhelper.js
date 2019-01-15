/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/`;
  }

  static get RESTAURANTS_URL() {
    return `${this.DATABASE_URL}restaurants/`;
  }


  static dbPromise() {
    return idb.open('db', 2, function (upgradeDb) {
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore('restaurants', {
            keyPath: 'id'
          });
        case 1:
          const reviewsStore = upgradeDb.createObjectStore('reviews', {
            keyPath: 'id'
          });
          reviewsStore.createIndex('restaurant', 'restaurant_id');
         case 2:
         upgradeDb.createObjectStore('offlineReviews', { autoIncrement: true });
      }
    });
  }

  static fetchRestaurants() {
    return this.dbPromise()
      .then(db => {
        const tx = db.transaction('restaurants');
        const restaurantStore = tx.objectStore('restaurants');
        return restaurantStore.getAll();
      })
      .then(restaurants => {
        if (restaurants.length !== 0) {
          return Promise.resolve(restaurants);
        } else {
          return this.fetchAndCacheRestaurants();
        };
      })
  }

  static fetchAndCacheRestaurants() {
    return fetch(DBHelper.RESTAURANTS_URL)
      .then(response => response.json())
      .then(restaurants => {
        return this.dbPromise()
          .then(db => {
            const tx = db.transaction('restaurants', 'readwrite');
            const restaurantStore = tx.objectStore('restaurants');
            restaurants.forEach(restaurant => restaurantStore.put(restaurant));

            return tx.complete
              .then(() => Promise.resolve(restaurants));
          });
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    return DBHelper.fetchRestaurants()
      .then(restaurants => restaurants.find(r => r.id === id));
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine) {
    return DBHelper.fetchRestaurants()
      .then(restaurants => restaurants.filter(r => r.cuisine_type === cuisine));
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood) {
    return DBHelper.fetchRestaurants()
      .then(restaurants => restaurants.filter(r => r.neighborhood === neighborhood));
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        let results = restaurants;
        if (cuisine !== 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood !== 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        return results;
      });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        return uniqueNeighborhoods;
      });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines() {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        return uniqueCuisines;
      });
  }
  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if (restaurant.photograph === undefined) {
      return (`/img/${restaurant['id']}.jpg`);
    }
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng], {
      title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
    })
    marker.addTo(map);
    return marker;
  }


  /**
   * Add offline review.
   */
  static addOfflineReview(review) {
        return this.dbPromise()
      .then(db => {
        if (!db) return;
        const tx = db.transaction('offlineReviews', 'readwrite');
        const store = tx.objectStore('offlineReviews');
        store.put(review);
        return tx.complete;
         });


  
}
  static postReview(review) {
    let offline_obj = {
      name: 'addReview',
      data: review,
      object_type: 'review'
    };

    let reviewSend = {
      "name": review.name,
      "rating": parseInt(review.rating),
      "comments": review.comments,
      "restaurant_id": parseInt(review.restaurant_id)
    };

    // Check if online
    if (!navigator.onLine && (offline_obj.name === 'addReview')) {
      DBHelper.addOfflineReview(reviewSend).then(
      DBHelper.processQueue())
      .catch(err=> console.error(err, 'error adding offline review'));
      return;
    }
    
    console.log('Sending review: ', reviewSend);
    var fetch_options = {
      method: 'POST',
      body: JSON.stringify(reviewSend),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    };
    fetch(`http://localhost:1337/reviews`, fetch_options).then((response) => {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
          return response.json();
        } else {
          return 'API call successfull'
        }
      })
      .then((data) => {
        console.log(`Fetch successful!`)
      })
      .catch(error => console.log('error:', error));
  }

  static processQueue() {
    window.addEventListener('online', (event) => {
  console.log('Open offline queue & return cursor');
    return this.dbPromise()
      .then(db => {
      if (!db) return;
      const tx = db.transaction(['offlineReviews'], 'readwrite');
      const store = tx.objectStore('offlineReviews');
      return store.openCursor();
    })
      .then(function nextRequest (cursor) {
        if (!cursor) {
          console.log('cursor done.');
          return;
        }
        // console.log('cursor', cursor.value.data.name, cursor.value.data);
        console.log('cursor.value', cursor.value);

        const offline_key = cursor.key;
       
        const data = cursor.value.data;
        const review_key = cursor.value.review_key;
        // const body = data ? JSON.stringify(data) : '';
        const body = data;

        
       // Setup the request
 
    
        var headers = new Headers();
        // Set some Headers
        headers.set('Accept', 'application/json');
          

        fetch(`${DBHelper.DATABASE_URL}reviews`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
          .then(data => {
            // data is the returned record
            console.log('Received updated record from DB Server', data);

            // 1. Delete http request record from offline store
            dbPromise.then(db => {
              const tx = db.transaction(['offlineReviews'], 'readwrite');
              tx.objectStore('offlineReviews').delete(offline_key);
              return tx.complete;
            })
              .then(() => console.log('offline rec delete success!'))
              .catch(err => console.log('offline store error', err));
            
          }).catch(err => {
            console.log('fetch error.');
            console.log(err);
            return;
          });
        return cursor.continue().then(nextRequest);
      })
      .then(() => console.log('Done cursoring'))
      .catch(err => console.log('Error opening cursor', err));
 }); }

 //functions to mark and Unmark Favorite button
  static setFavorite(id) { 
  fetch(`${DBHelper.DATABASE_URL}restaurants/${id}/?is_favorite=true`, {
    method: 'PUT'
  });
}


// http://localhost:1337/restaurants/<restaurant_id>/?is_favorite=false
static unSetFavorite(id) { 
  fetch(`${DBHelper.DATABASE_URL}restaurants/${id}/?is_favorite=false`, {
    method: 'PUT'
  });
}


  /**
   * Fetch all reviews.
   */

  static storeInIndexedDB(table, objects) {
    this.dbPromise.then(db => {
      if (!db) return;

      let tx = db.transaction(table, 'readwrite');
      const store = tx.objectStore(table);
      if (Array.isArray(objects)) {
        objects.forEach(object => {
          store.put(object);
        });
      } else {
        store.put(objects);
      }
    });
  }

  static getStoredObjectById(table, idx, id) {
    return this.dbPromise()
      .then(db => {
        if (!db) return;

        const store = db.transaction(table).objectStore(table);
        const indexId = store.index(idx);
        return indexId.getAll(id);
      });
  }

  static fetchReviewsByRestId(id) {
    return fetch(`${DBHelper.DATABASE_URL}reviews/?restaurant_id=${id}`)
      .then(response => response.json())
      .then(reviews => {
        this.dbPromise()
          .then(db => {
            if (!db) return;

            let tx = db.transaction('reviews', 'readwrite');
            const store = tx.objectStore('reviews');
            if (Array.isArray(reviews)) {
              reviews.forEach(review => {
                store.put(review);
              });
            } else {
              store.put(reviews);
            }
          });

        return Promise.resolve(reviews);
      })
      .catch(error => {
        return DBHelper.getStoredObjectById('reviews', 'restaurant', id)
          .then((storedReviews) => {
            return Promise.resolve(storedReviews);
          })
      });
  }

}