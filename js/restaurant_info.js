let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoibW9rb3dlYiIsImEiOiJjamt0Z2Y1bGcwNHZlM3FwM3J4OTJyOThhIn0.pRWI_ms0v97Xb2Pa-Mi6aQ',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}  
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

const favBtn = document.createElement('button');
  favBtn.className = 'fas fa-heart';
  favBtn.setAttribute('aria-label', 'favorite');
  if (restaurant.is_favorite === 'true') {
    favBtn.classList.add('active');
    favBtn.setAttribute('aria-pressed', 'true');
    //favBtn.innerHTML = `Click To Remove ${restaurant.name} as a Favorite`;
    favBtn.title = `Click To Remove ${restaurant.name} as a Favorite`;
  } else {
    favBtn.setAttribute('aria-pressed', 'false');
    //favBtn.innerHTML = `Click To Add ${restaurant.name} as a Favorite`;
    favBtn.title = `Click To Add ${restaurant.name} as a favorite`;
  }

  //add a listener to the FavBtn
  favBtn.addEventListener('click', (evt) => {
    evt.preventDefault();
    if (favBtn.classList.contains('active')) {
      favBtn.setAttribute('aria-pressed', 'false');
      //favBtn.innerHTML = `Click To Add ${restaurant.name} as a favorite`;
      favBtn.title = `Click To Add ${restaurant.name} as a favorite`;
      DBHelper.unSetFavorite(restaurant.id);
    } else {
      favBtn.setAttribute('aria-pressed', 'true');
      //favBtn.innerHTML = `Click To Remove ${restaurant.name} as a favorite`;
      favBtn.title = `Click To Remove ${restaurant.name} as a favorite`;
      DBHelper.setFavorite(restaurant.id);
    }
    favBtn.classList.toggle('active');
  });

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.alt =  `image of ${restaurant.name}`;
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  //fillReviewsHTML();
  DBHelper.fetchReviewsById(restaurant.id, fillReviewsHTML);
}


/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (error, reviews) => {
  self.restaurant.reviews = reviews;

  if (error) {
    console.log('Error retrieving reviews', error);
  }

   //add review button
  //<button class="btn btn-success btn-lg btn-block" data-toggle="modal" data-target="#myModal">
  const header = document.getElementById('reviews-header');
  const addReview = document.createElement('button');
  addReview.classList.add('btn', 'btn-success');
  addReview.innerHTML = 'Add a Review'; 
  addReview.setAttribute('data-toggle', 'modal');
  addReview.setAttribute('data-target', '#myModal');
  addReview.setAttribute('aria-label', 'add review');
  addReview.title = 'Click To Add a Review';
  //addReview.addEventListener('click', modal);
  header.appendChild(addReview);
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.className = 'review-title';
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}


/*
Add Reviews Form
*/
addReviewForm = (review) => {
  const modal = document.getElementById('modal-body');

  const form = document.createElement('form');
  const name = document.createElement('input');
  name.setAttribute('class', 'name');
  name.setAttribute('type', 'text');
  name.setAttribute('placeholder', 'Input your name..');
  form.appendChild(name);

  const radioInputDiv = document.createElement('div');
  const text = document.createElement('p');
  text.innerHTML = 'Select a star rating';
  radioInputDiv.appendChild(text);

  radioInputDiv.classList.add('rating');
  for (let i = 5; i >= 1; i--) {
    const radioInput = document.createElement('input');
    radioInput.setAttribute('value', i);
    radioInput.setAttribute('id', `star${i}`);
    radioInput.setAttribute('type', 'radio');
    radioInput.setAttribute('name', 'rating');
    radioInput.setAttribute('required', true);
    radioInputDiv.appendChild(radioInput);
    const radioInputLabel = document.createElement('label');
    radioInputLabel.setAttribute('for', `star${i}`);
    radioInputDiv.appendChild(radioInputLabel);
  }
  form.appendChild(radioInputDiv);

  const reviewBody = document.createElement('textarea');
  reviewBody.setAttribute('class', 'review-body');
  reviewBody.setAttribute('type', 'text');
  reviewBody.setAttribute('placeholder', 'Input Your Review');
  form.appendChild(reviewBody);
  modal.appendChild(form);
  buttonClick = (event) => {
    event.preventDefault();
      let reviewObject = {
          "restaurant_id": self.restaurant.id,
          "name": name.value,
          "createdAt": (new Date()).getTime(),
          "updatedAt": (new Date()).getTime(),
          "rating:" : form.rating.value,
          "comments": reviewBody.value 
        }
    
    //validation
        if((reviewObject.name === "") || (reviewObject.rating === "") || 
          (reviewObject.comments === "")) {
         window.alert(`All fields are required.`);
        }else{
          //save to IDB
          //try to post to server 
          //if server if it fails, display a network error and save to offline database to be synced later
        DBHelper.postReviewToIDB(reviewObject)
        .then(response => {
          DBHelper.postReviewToServer(response, (error, review) => {
      console.log('got add callback');
      form.reset();
      if (error) {
        console.log('We are offline. Review has been saved to the queue.');
        DBHelper.addOfflineReview(reviewObject)
        .then(showMessage('offline'))
        // register a sync
        .then(navigator.serviceWorker.ready)
          .then((reg) => {
            return reg.sync.register('syncReviews');
          })
          .catch((err) => console.log(err));
      } else {
        console.log('Received updated record from DB Server', review);
           showMessage('online')
      }
       createReviewHTML(review, true);
    });
        });
   }
}

};
  

  const showMessage = (message) => { const successMessage = document.createElement('h4');
  successMessage.setAttribute("class", "heading");
  successMessage.innerHTML = message;
  successMessage.style.display = "block"
  form.appendChild(successMessage);

  setTimeout(()=>{
          successMessage.style.display = "none";
        }, 4000);

        form.reset();

  }
/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
 	const li = document.createElement('li');

 	const header = document.createElement('div');
 	header.className = 'header-review';
 	li.appendChild(header);

 	const name = document.createElement('span');
 	name.className = 'name-review';
 	name.innerHTML = review.name;
 	header.appendChild(name);
 
 	const date = document.createElement('span');
 	const updatedDate = new Date(review.updatedAt).toLocaleDateString();
  date.innerHTML = ` | ${updatedDate}`; 
 	header.appendChild(date);

 	const body = document.createElement('div');
 	body.className = 'review-body';
 	li.appendChild(body);

 	
	
	 // I got his star rating function online and customized it
  const ratings = document.createElement('div');

  for (let i = 1; i <= 5; i++) {
    const rating = document.createElement('span');
    rating.classList.add('stars-rating');
    rating.innerHTML = `★`;
    if (review.rating < i) {
      rating.innerHTML = `☆`;
    }
    ratings.appendChild(rating);
  }
 body.appendChild(ratings);
	
	

 	const comments = document.createElement('p');
 	comments.innerHTML = review.comments;
 	body.appendChild(comments);

 	return li;
};


/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
