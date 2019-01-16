let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL()
    .then((restaurant) => {
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
    })
    .catch(error => console.error(error));
}


/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fetchRestaurantFromURL = () => {
  if (self.restaurant) { // restaurant already fetched!
    return Promise.resolve(self.restaurant);
  }
  const id = parseInt(getParameterByName('id'));
  if (!id || id === NaN) { // no id found in URL
    return Promise.reject('No restaurant id in URL')
  } else {
    return DBHelper.fetchRestaurantById(id)
      .then(restaurant => {
        if (!restaurant) {
          return Promise.reject(`Restaurant with ID ${id} was not found`)
        }
        self.restaurant = restaurant;
        fillRestaurantHTML();
        return restaurant;
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
  // Create favorite icon
  const favBtn = document.createElement('button');
  favBtn.className = 'fas fa-heart';
  favBtn.setAttribute('aria-label', 'favorite'); 


   if ((/true/i).test(restaurant.is_favorite)) {
    favBtn.classList.add('active');
    favBtn.setAttribute('aria-pressed', 'true'); 
    favBtn.title = `Click To Remove ${restaurant.name} as a Favorite`;
  } else {
    favBtn.setAttribute('aria-pressed', 'false'); 
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
  DBHelper.fetchReviewsByRestId(restaurant.id)
    .then(reviews => fillReviewsHTML(reviews));
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
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const ul = document.getElementById('reviews-list');
  const title = document.createElement('h3');
  title.className = 'reviews-title'
  title.innerHTML = 'Reviews';
  container.insertBefore(title, ul);

  // Add review button
  const addReview = document.createElement('button');
  addReview.textContent = 'Add review';
  addReview.setAttribute('type', 'button');
  addReview.setAttribute('class', 'btn');
  addReview.setAttribute('id', 'add-review');
  addReview.onclick = (event) => openModal();
  container.appendChild(addReview);
  // TODO: test with no reviews.
  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.textContent = 'No reviews yet!';
    ul.append(noReviews);
    return;
  }

  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/append
 * https://developer.mozilla.org/en-US/docs/Web/API/Node/appendChild
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
  date.innerHTML = `<span style="float: right;">  | ${updatedDate} </span>`; 
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


/**
 * Add review.
 */

// Form validation & submission
addReview = () => {
  event.preventDefault();
  // Getting the data from the modal form
  const restaurantId = self.restaurant.id;
  let reviewAuthor = document.getElementById('name').value;
  let reviewRating = document.querySelector('#rating option:checked').value;
  let reviewComment = document.getElementById('comment').value;

  // Close Modal
  closeModal();

  // Add data to DOM
  const ReviewObject = {
    "restaurant_id": parseInt(restaurantId),
    "name": reviewAuthor,
    "rating": parseInt(reviewRating),
    "comments": reviewComment,
    "createdAt": (new Date()).getTime()
  };
  // post review
  DBHelper.postReview(ReviewObject);
  addReviewHTML(ReviewObject);
  document.getElementById('review-form').reset();
}

addReviewHTML = (review) => {
  if (document.getElementById('no-review')) {
    document.getElementById('no-review').remove();
  }
  const container = document.getElementById('reviews-container');
  const ul = document.getElementById('reviews-list');

  //insert the new review on top
  ul.insertBefore(createReviewHTML(review), ul.firstChild);
  container.appendChild(ul);
}

/**
 * Handle modal actions.
 */
const modal = document.getElementById('reviewModal');
const closeModalBtn = document.getElementById('closeBtn');

closeModalBtn.addEventListener('click', closeModal);
window.addEventListener('click', close);

function openModal() {
  modal.style.display = 'block';
  document.getElementById('addReview').addEventListener('click', addReview);
}

function closeModal() {
  modal.style.display = 'none';
}

function close(ev) {
  if (ev.target == modal) {
    closeModal();
  }
}