const CACHE_NAME = "ruchi-icecream-cache-v4"; 
const urlsToCache = [
    "/frontend/",       
    "/frontend/index.html",
  "/frontend/styles.css",
  "/frontend/addOrder.html",
  "/frontend/pendingOrders.html",
  "/frontend/pendingPayment.html",
  "/frontend/orderHistory.html",
  "/frontend/firebase-config.js",
  "/frontend/pendingOrders.js",
  "/frontend/manifest.json",
    "/frontend/icons/icon-192x192.png",  
    "/frontend/icons/icon-512x512.png",
    "/frontend/images/1.webp",
    "/frontend/images/2.png",
    "/frontend/images/3.webp",
    "/frontend/images/4.avif",
    "/frontend/images/5.webp",
    "/frontend/images/logo.png"
  ];
  

// Install event - Cache files
self.addEventListener("install", (event) => {
  self.skipWaiting(); // activate new SW immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});


// Activate event - Delete old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      )
    )
  );
  self.clients.claim(); // start controlling pages without reload
});


// Fetch Event Handling
self.addEventListener("fetch", (event) => {
    // If request is for Firebase Firestore, try cache first
    if (event.request.url.includes("firestore.googleapis.com")) {
      event.respondWith(
        caches.match(event.request).then((response) => {
          return response || fetch(event.request);
        })
      );
      return;
    }
  
    // If request is for backend API, return a custom offline response
    if (event.request.url.includes("localhost:5000/get-orders")) {
      event.respondWith(
        new Response(JSON.stringify({ error: "Offline mode: No data available" }), {
          headers: { "Content-Type": "application/json" },
        })
      );
      return;
    }
  
    // Default Cache Strategy (For Static Files)
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      }).catch(() => {
        return new Response("You are offline. This resource is not available.", {
          status: 503,
          statusText: "Service Unavailable",
        });
      })
    );
  });