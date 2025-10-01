// Neshan API Key - will be loaded from server
let NESHAN_API_KEY = "web.89a6be71092e4dc1925b0f47e926e894";

// Global variables
let map;
let locations = [];
let markers = [];
let routePolyline = null;

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing application...");

  // Load API key from server first
  loadApiKey()
    .then(() => {
      // Wait for Neshan SDK to load
      if (typeof L !== "undefined") {
        console.log("Leaflet is available, initializing map...");
        initializeMap();
        setupEventListeners();
      } else {
        console.log("Leaflet not available yet, waiting...");
        // Wait for SDK to load
        const checkSDK = setInterval(() => {
          if (typeof L !== "undefined") {
            console.log("Leaflet loaded, initializing map...");
            clearInterval(checkSDK);
            initializeMap();
            setupEventListeners();
          }
        }, 100);

        // Timeout after 15 seconds
        setTimeout(() => {
          if (typeof L === "undefined") {
            clearInterval(checkSDK);
            console.error("Neshan SDK failed to load after 15 seconds");
            document.getElementById("map").innerHTML =
              '<div style="padding: 20px; text-align: center; color: #e53e3e;">خطا در بارگذاری نقشه Neshan. لطفاً اتصال اینترنت خود را بررسی کنید.</div>';
          }
        }, 15000);
      }
    })
    .catch((error) => {
      console.error("Failed to load API key:", error);
      document.getElementById("map").innerHTML =
        '<div style="padding: 20px; text-align: center; color: #e53e3e;">خطا در بارگذاری تنظیمات. لطفاً صفحه را رفرش کنید.</div>';
    });
});

// Load API key from server
async function loadApiKey() {
  try {
    const response = await fetch("/api/config");
    const data = await response.json();
    NESHAN_API_KEY = data.neshanApiKey;
    console.log("API key loaded from server");
  } catch (error) {
    console.error("Failed to load API key from server, using default:", error);
    // Keep the default API key
  }
}

// Initialize Map (Neshan SDK)
function initializeMap() {
  try {
    console.log("Initializing Neshan map...");
    console.log("API Key:", NESHAN_API_KEY);

    // Create Neshan map using official SDK
    map = new L.Map("map", {
      key: NESHAN_API_KEY,
      maptype: "neshan",
      poi: true,
      traffic: false,
      center: [35.699756, 51.338076], // Tehran coordinates (based on official docs)
      zoom: 14,
    });

    console.log("Neshan map created successfully");

    // Add click event to map for adding locations
    map.on("click", function (e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      // Show prompt for location name
      const locationName = prompt("نام این لوکیشن را وارد کنید:");
      if (locationName && locationName.trim()) {
        addLocation(locationName.trim(), lat, lng);
      }
    });

    console.log("Map initialization completed");
  } catch (error) {
    console.error("Error initializing map:", error);
    document.getElementById("map").innerHTML =
      '<div style="padding: 20px; text-align: center; color: #e53e3e;">خطا در ایجاد نقشه: ' +
      error.message +
      "</div>";
  }
}

// Setup event listeners
function setupEventListeners() {
  document
    .getElementById("addLocationBtn")
    .addEventListener("click", addLocationFromInput);
  document
    .getElementById("getCurrentLocationBtn")
    .addEventListener("click", getCurrentLocation);
  document
    .getElementById("optimizeRouteBtn")
    .addEventListener("click", optimizeRoute);
  document
    .getElementById("clearAllBtn")
    .addEventListener("click", clearAllLocations);

  // Toggle between search and manual mode
  document
    .getElementById("searchModeBtn")
    .addEventListener("click", switchToSearchMode);
  document
    .getElementById("manualModeBtn")
    .addEventListener("click", switchToManualMode);

  // Manual location input
  document
    .getElementById("addManualLocationBtn")
    .addEventListener("click", addManualLocation);

  // Enter key support for location input
  document
    .getElementById("locationName")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        addLocationFromInput();
      }
    });

  // Enter key support for manual coordinates
  document
    .getElementById("manualLocationName")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        addManualLocation();
      }
    });
  document
    .getElementById("manualLat")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        addManualLocation();
      }
    });
  document
    .getElementById("manualLng")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        addManualLocation();
      }
    });
}

// Switch to search mode
function switchToSearchMode() {
  document.getElementById("searchMode").style.display = "block";
  document.getElementById("manualMode").style.display = "none";
  document.getElementById("searchModeBtn").classList.add("active");
  document.getElementById("manualModeBtn").classList.remove("active");
}

// Switch to manual coordinates mode
function switchToManualMode() {
  document.getElementById("searchMode").style.display = "none";
  document.getElementById("manualMode").style.display = "block";
  document.getElementById("searchModeBtn").classList.remove("active");
  document.getElementById("manualModeBtn").classList.add("active");
}

// Add location manually with coordinates
function addManualLocation() {
  const locationName = document
    .getElementById("manualLocationName")
    .value.trim();
  const lat = parseFloat(document.getElementById("manualLat").value);
  const lng = parseFloat(document.getElementById("manualLng").value);

  // Validation
  if (!locationName) {
    showToast("لطفاً نام لوکیشن را وارد کنید", "error");
    return;
  }

  if (isNaN(lat) || isNaN(lng)) {
    showToast("لطفاً مختصات صحیح وارد کنید", "error");
    return;
  }

  // Validate latitude range (-90 to 90)
  if (lat < -90 || lat > 90) {
    showToast("Latitude باید بین -90 تا 90 باشد", "error");
    return;
  }

  // Validate longitude range (-180 to 180)
  if (lng < -180 || lng > 180) {
    showToast("Longitude باید بین -180 تا 180 باشد", "error");
    return;
  }

  // Add location
  addLocation(locationName, lat, lng);

  // Clear inputs
  document.getElementById("manualLocationName").value = "";
  document.getElementById("manualLat").value = "";
  document.getElementById("manualLng").value = "";

  // Center map on the new location
  map.setView([lat, lng], 14);
}

// Add location from input field
function addLocationFromInput() {
  const locationName = document.getElementById("locationName").value.trim();
  if (!locationName) {
    showToast("لطفاً نام لوکیشن را وارد کنید", "error");
    return;
  }

  // Use geocoding to find coordinates
  geocodeLocation(locationName);
}

// Geocode location name to coordinates
function geocodeLocation(locationName) {
  fetch("/api/geocode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ locationName }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        addLocation(data.location.name, data.location.lat, data.location.lng);
        document.getElementById("locationName").value = "";
      } else {
        showToast(
          data.error || "لوکیشن پیدا نشد. لطفاً نام دقیق‌تری وارد کنید",
          "error"
        );
      }
    })
    .catch((error) => {
      console.error("Geocoding error:", error);
      showToast("خطا در پیدا کردن لوکیشن", "error");
    });
}

// Add location to the list
function addLocation(name, lat, lng, isCurrentLocation = false) {
  const location = {
    id: Date.now(),
    name: name,
    lat: lat,
    lng: lng,
    isCurrentLocation: isCurrentLocation,
  };

  locations.push(location);
  updateLocationsList();
  addMarkerToMap(location);
  showToast(`لوکیشن "${name}" اضافه شد`);
}

// Add marker to map
function addMarkerToMap(location) {
  const marker = L.marker([location.lat, location.lng])
    .addTo(map)
    .bindPopup(
      `<b>${location.name}</b><br>${location.lat.toFixed(
        6
      )}, ${location.lng.toFixed(6)}`
    );

  markers.push(marker);
}

// Update locations list in UI
function updateLocationsList() {
  const list = document.getElementById("locationsList");
  list.innerHTML = "";

  locations.forEach((location) => {
    const li = document.createElement("li");
    const originBadge = location.isCurrentLocation
      ? '<span style="background: #48bb78; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-right: 5px;">مبدا</span>'
      : "";
    const setOriginBtn = !location.isCurrentLocation
      ? `<button class="set-origin-btn" onclick="setAsOrigin(${location.id})" title="تنظیم به عنوان مبدا">📍</button>`
      : "";
    li.innerHTML = `
            <span class="location-name">${location.name} ${originBadge}</span>
            <div class="location-actions">
                ${setOriginBtn}
                <button class="remove-btn" onclick="removeLocation(${location.id})">حذف</button>
            </div>
        `;
    list.appendChild(li);
  });

  // Enable/disable optimize button
  document.getElementById("optimizeRouteBtn").disabled = locations.length < 2;
}

// Set location as origin
function setAsOrigin(locationId) {
  // Remove origin flag from all locations
  locations.forEach((loc) => {
    loc.isCurrentLocation = false;
  });

  // Set the selected location as origin
  const location = locations.find((loc) => loc.id === locationId);
  if (location) {
    location.isCurrentLocation = true;
    updateLocationsList();
    showToast(`"${location.name}" به عنوان مبدا تنظیم شد`);
  }
}

// Remove location
function removeLocation(locationId) {
  const index = locations.findIndex((loc) => loc.id === locationId);
  if (index !== -1) {
    locations.splice(index, 1);

    // Remove marker from map
    if (markers[index]) {
      map.removeLayer(markers[index]);
      markers.splice(index, 1);
    }

    updateLocationsList();
    clearRoute();
    showToast("لوکیشن حذف شد");
  }
}

// Get current location
function getCurrentLocation() {
  if (!navigator.geolocation) {
    showToast("مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند", "error");
    return;
  }

  const button = document.getElementById("getCurrentLocationBtn");
  button.innerHTML = '<span class="loading"></span> در حال پیدا کردن...';
  button.disabled = true;

  navigator.geolocation.getCurrentPosition(
    function (position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Reverse geocoding to get address
      reverseGeocode(lat, lng);

      button.innerHTML = "📍 موقعیت فعلی من";
      button.disabled = false;
    },
    function (error) {
      showToast("خطا در دریافت موقعیت فعلی", "error");
      button.innerHTML = "📍 موقعیت فعلی من";
      button.disabled = false;
    }
  );
}

// Reverse geocoding
function reverseGeocode(lat, lng) {
  fetch("/api/reverse-geocode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lat, lng }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        addLocation(
          data.location.name,
          data.location.lat,
          data.location.lng,
          true
        );
      } else {
        const locationName = `موقعیت فعلی (${lat.toFixed(4)}, ${lng.toFixed(
          4
        )})`;
        addLocation(locationName, lat, lng, true);
      }
    })
    .catch((error) => {
      console.error("Reverse geocoding error:", error);
      const locationName = `موقعیت فعلی (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      addLocation(locationName, lat, lng, true);
    });
}

// Optimize route using TSP algorithm
function optimizeRoute() {
  if (locations.length < 2) {
    showToast("حداقل 2 لوکیشن برای بهینه‌سازی مسیر نیاز است", "error");
    return;
  }

  const button = document.getElementById("optimizeRouteBtn");
  button.innerHTML = '<span class="loading"></span> در حال بهینه‌سازی...';
  button.disabled = true;

  // Send request to server for route optimization
  fetch("/api/optimize-route", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ locations }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Route optimization response:", data);

      if (data.success && data.optimizedRoute) {
        // Validate optimized route data
        if (
          Array.isArray(data.optimizedRoute) &&
          data.optimizedRoute.length >= 2
        ) {
          // Draw route
          drawRoute(data.optimizedRoute);

          // Show route info
          showRouteInfo(data.optimizedRoute, data.totalDistance || 0);
        } else {
          console.error("Invalid optimized route data:", data.optimizedRoute);
          showToast("داده‌های مسیر بهینه نامعتبر است", "error");
        }
      } else {
        showToast(data.error || "خطا در بهینه‌سازی مسیر", "error");
      }
    })
    .catch((error) => {
      console.error("Route optimization error:", error);
      showToast("خطا در بهینه‌سازی مسیر: " + error.message, "error");
    })
    .finally(() => {
      button.innerHTML = "🚀 بهینه‌سازی مسیر";
      button.disabled = false;
    });
}

// Note: TSP solving is now handled by the server

// Draw route using Neshan Direction API
async function drawRoute(optimizedOrder) {
  try {
    // Clear existing route
    clearRoute();

    // Validate optimizedOrder
    if (
      !optimizedOrder ||
      !Array.isArray(optimizedOrder) ||
      optimizedOrder.length < 2
    ) {
      console.error("Invalid optimized order:", optimizedOrder);
      return;
    }

    console.log("Drawing route using Neshan Direction API");

    // Draw routes between consecutive locations
    const routeLines = [];

    for (let i = 0; i < optimizedOrder.length - 1; i++) {
      const from = optimizedOrder[i];
      const to = optimizedOrder[i + 1];

      try {
        // Get route from server (which uses Neshan Direction API)
        const response = await fetch("/api/get-route", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            origin: { lat: from.lat, lng: from.lng },
            destination: { lat: to.lat, lng: to.lng },
          }),
        });

        const data = await response.json();

        if (data.success && data.route) {
          // Draw polyline on map
          const routeLine = L.polyline(data.route, {
            color: "#667eea",
            weight: 5,
            opacity: 0.7,
          }).addTo(map);

          routeLines.push(routeLine);
        } else {
          // Fallback: draw straight line
          console.warn(
            `Could not get route from ${from.name} to ${to.name}, drawing straight line`
          );
          const straightLine = L.polyline(
            [
              [from.lat, from.lng],
              [to.lat, to.lng],
            ],
            {
              color: "#667eea",
              weight: 5,
              opacity: 0.5,
              dashArray: "10, 10",
            }
          ).addTo(map);

          routeLines.push(straightLine);
        }
      } catch (error) {
        console.error(`Error getting route segment ${i}:`, error);
        // Fallback: draw straight line
        const straightLine = L.polyline(
          [
            [from.lat, from.lng],
            [to.lat, to.lng],
          ],
          {
            color: "#667eea",
            weight: 5,
            opacity: 0.5,
            dashArray: "10, 10",
          }
        ).addTo(map);

        routeLines.push(straightLine);
      }
    }

    // Store route lines for clearing later
    routePolyline = routeLines;

    // Update marker icons with numbers
    updateMarkerNumbers(optimizedOrder);

    // Fit map to show all locations
    try {
      if (markers && markers.length > 0) {
        const group = new L.featureGroup(markers);
        if (group.getBounds && typeof group.getBounds === "function") {
          map.fitBounds(group.getBounds().pad(0.1));
        }
      }
    } catch (boundsError) {
      console.warn("Error fitting map bounds:", boundsError);
    }

    console.log("Route drawing completed successfully");
  } catch (error) {
    console.error("Error in drawRoute:", error);
  }
}

// Update marker icons with route numbers
function updateMarkerNumbers(optimizedOrder) {
  // Remove existing markers
  markers.forEach((marker) => map.removeLayer(marker));
  markers = [];

  // Add new markers with numbers
  optimizedOrder.forEach((location, index) => {
    const markerIcon = L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          background: #667eea;
          color: white;
          border: 3px solid white;
          border-radius: 50%;
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">${index + 1}</div>
      `,
      iconSize: [35, 35],
      iconAnchor: [17, 17],
    });

    const marker = L.marker([location.lat, location.lng], { icon: markerIcon })
      .addTo(map)
      .bindPopup(
        `<div style="text-align: right; direction: rtl;">
          <b>توقف ${index + 1}: ${location.name}</b><br>
          مختصات: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
        </div>`
      );

    markers.push(marker);
  });
}

// Clear route from map
function clearRoute() {
  // Remove CSS overlay
  const overlay = document.getElementById("route-overlay");
  if (overlay) {
    overlay.remove();
  }

  // Clear Leaflet layers if any
  if (routePolyline) {
    try {
      if (Array.isArray(routePolyline)) {
        routePolyline.forEach((layer) => {
          try {
            map.removeLayer(layer);
          } catch (error) {
            console.warn("Error removing route layer:", error);
          }
        });
      } else if (routePolyline.remove) {
        // It's a Leaflet layer
        map.removeLayer(routePolyline);
      }
    } catch (error) {
      console.warn("Error clearing route:", error);
    }
    routePolyline = null;
  }

  document.getElementById("routeInfo").style.display = "none";
}

// Show route information
function showRouteInfo(optimizedOrder, totalDistance) {
  const routeInfo = document.getElementById("routeInfo");
  const routeDetails = document.getElementById("routeDetails");

  let routeText = "<strong>ترتیب بهینه مسیر:</strong><br><ol>";

  optimizedOrder.forEach((location, index) => {
    routeText += `<li>${location.name}</li>`;
  });

  routeText += "</ol>";
  routeText += `<br><strong>مسافت کل:</strong> ${totalDistance.toFixed(
    2
  )} کیلومتر`;
  routeText += `<br><strong>تعداد توقف‌ها:</strong> ${optimizedOrder.length}`;

  routeDetails.innerHTML = routeText;
  routeInfo.style.display = "block";
}

// Clear all locations
function clearAllLocations() {
  if (locations.length === 0) {
    showToast("هیچ لوکیشنی برای حذف وجود ندارد", "error");
    return;
  }

  if (confirm("آیا مطمئن هستید که می‌خواهید همه لوکیشن‌ها را حذف کنید؟")) {
    locations = [];

    // Remove all markers
    markers.forEach((marker) => map.removeLayer(marker));
    markers = [];

    clearRoute();
    updateLocationsList();
    showToast("همه لوکیشن‌ها حذف شدند");
  }
}

// Show toast notification
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Show toast
  setTimeout(() => toast.classList.add("show"), 100);

  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}
