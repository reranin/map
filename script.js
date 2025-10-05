// Neshan API Key - will be loaded from server
let NESHAN_API_KEY = "web.89a6be71092e4dc1925b0f47e926e894";

// Global variables
let map;
let locations = [];
let markers = [];
let routePolyline = null;
let trafficLayer = null;
let databaseLocations = [];
let categories = [];

// آرایه رنگ‌های مختلف برای مسیرها
const routeColors = [
  "#e53e3e", // قرمز
  "#3182ce", // آبی
  "#38a169", // سبز
  "#d69e2e", // زرد
  "#805ad5", // بنفش
  "#dd6b20", // نارنجی
  "#319795", // فیروزه‌ای
  "#e53e3e", // صورتی
  "#4a5568", // خاکستری
  "#2d3748", // تیره
];

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing application...");

  // Add fullscreen class to container for full-screen map
  document.querySelector(".container").classList.add("fullscreen");

  // اضافه کردن مدیریت خطاهای عمومی
  window.addEventListener('error', function(event) {
    // نادیده گرفتن خطاهای content script
    if (event.filename && event.filename.includes('content')) {
      console.warn('Content script error ignored:', event.message);
      event.preventDefault();
      return false;
    }
  });

  // مدیریت خطاهای Promise
  window.addEventListener('unhandledrejection', function(event) {
    // نادیده گرفتن خطاهای content script
    if (event.reason && event.reason.toString().includes('content')) {
      console.warn('Content script promise error ignored:', event.reason);
      event.preventDefault();
      return false;
    }
  });

  // Load API key from server first
  loadApiKey()
    .then(() => {
      // Wait for Neshan SDK to load
      if (typeof L !== "undefined") {
        console.log("Leaflet is available, initializing map...");
        initializeMap();
        setupEventListeners();
        loadDatabaseData();
      } else {
        console.log("Leaflet not available yet, waiting...");
        // Wait for SDK to load
        const checkSDK = setInterval(() => {
          if (typeof L !== "undefined") {
            console.log("Leaflet loaded, initializing map...");
            clearInterval(checkSDK);
            initializeMap();
            setupEventListeners();
            loadDatabaseData();
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
      traffic: false, // غیرفعال کردن ترافیک به دلیل مشکل سرور
      center: [35.699756, 51.338076], // Tehran coordinates (based on official docs)
      zoom: 14,
    });

    // اضافه کردن مدیریت خطا برای تایل‌های ترافیک
    map.on('tileerror', function(error) {
      console.warn('خطا در بارگذاری تایل:', error);
    });

    // اضافه کردن لایه ترافیک دستی (جایگزین)
    addTrafficLayer();

    console.log("Neshan map created successfully");
    
    // نمایش پیام اطلاع‌رسانی درباره ترافیک
    setTimeout(() => {
      showToast("💡 نکته: ترافیک زنده از طریق API Neshan در دسترس است", "info");
    }, 2000);

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

// Menu control functions
function openMenu() {
  const menu = document.getElementById("slidingMenu");
  const trigger = document.getElementById("menuTrigger");
  const overlay = document.getElementById("menuOverlay");
  
  menu.classList.add("open");
  trigger.classList.add("hidden");
  
  // Show overlay
  if (overlay) {
    overlay.classList.add("active");
  }
  
  // Prevent body scroll
  document.body.style.overflow = "hidden";
}

function closeMenu() {
  const menu = document.getElementById("slidingMenu");
  const trigger = document.getElementById("menuTrigger");
  const overlay = document.getElementById("menuOverlay");
  
  menu.classList.remove("open");
  trigger.classList.remove("hidden");
  
  // Hide overlay
  if (overlay) {
    overlay.classList.remove("active");
  }
  
  // Restore body scroll
  document.body.style.overflow = "";
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

  // Database search functionality
  document
    .getElementById("searchBtn")
    .addEventListener("click", searchDatabaseLocations);
  document
    .getElementById("locationSearch")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        searchDatabaseLocations();
      }
    });
  document
    .getElementById("categoryFilter")
    .addEventListener("change", filterDatabaseLocations);

  // Menu controls
  document.getElementById("menuTrigger").addEventListener("click", openMenu);
  document.getElementById("menuToggleBtn").addEventListener("click", closeMenu);
  
  // Close menu when clicking outside or on overlay
  document.addEventListener("click", function(event) {
    const menu = document.getElementById("slidingMenu");
    const trigger = document.getElementById("menuTrigger");
    const overlay = document.getElementById("menuOverlay");
    
    // بررسی اینکه آیا کلیک روی دکمه‌های داخل منو بوده یا نه
    const clickedInsideMenu = menu && menu.contains(event.target);
    const clickedTrigger = trigger && trigger.contains(event.target);
    const clickedOverlay = event.target === overlay;
    
    // فقط منو را ببند اگر کلیک خارج از منو بوده است
    if (menu && menu.classList.contains("open") && !clickedInsideMenu && !clickedTrigger) {
      if (clickedOverlay) {
        closeMenu();
      }
    }
  });
  
  // Close menu with Escape key
  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  document.getElementById("zoomInBtn").addEventListener("click", function () {
    if (map) {
      map.zoomIn();
    }
  });

  document.getElementById("zoomOutBtn").addEventListener("click", function () {
    if (map) {
      map.zoomOut();
    }
  });

  document
    .getElementById("centerMapBtn")
    .addEventListener("click", function () {
      if (map && markers && markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
      } else if (map) {
        map.setView([35.699756, 51.338076], 14);
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
    isDestination: false, // اضافه کردن فیلد مقصد
  };

  locations.push(location);
  updateLocationsList();
  addMarkerToMap(location);
  showToast(`لوکیشن "${name}" اضافه شد`);
}

// Add marker to map
function addMarkerToMap(location) {
  const popupContent = `
    <div style="text-align: right; direction: rtl; min-width: 200px;">
      <div style="margin-bottom: 12px;">
        <b style="color: var(--color-accent); font-size: 16px;">${location.name}</b><br>
        <span style="color: var(--color-text-secondary); font-size: 12px;">
          ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
        </span>
      </div>
      
      <div style="display: flex; gap: 8px; justify-content: center;">
        <button class="popup-nav-btn google-maps-popup" onclick="openSingleLocationInGoogleMaps('${location.lat},${location.lng}', '${location.name}')" title="گوگل مپ">
          <i class="fab fa-google"></i>
        </button>
        <button class="popup-nav-btn waze-popup" onclick="openInWaze('${location.lat},${location.lng}', '${location.name}')" title="ویز">
          <i class="fas fa-car"></i>
        </button>
        <button class="popup-nav-btn neshan-popup" onclick="openInNeshan('${location.lat},${location.lng}', '${location.name}')" title="نشان">
          <i class="fas fa-map"></i>
        </button>
      </div>
    </div>
  `;

  const marker = L.marker([location.lat, location.lng])
    .addTo(map)
    .bindPopup(popupContent);

  markers.push(marker);
}

// Update locations list in UI
function updateLocationsList() {
  const list = document.getElementById("locationsList");
  const locationCount = document.getElementById("locationCount");
  list.innerHTML = "";

  locations.forEach((location) => {
    const li = document.createElement("li");
    
    // نمایش badge های مبدا و مقصد
    const originBadge = location.isCurrentLocation
      ? '<span style="background: var(--color-success); color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; margin-right: 8px; font-weight: 600;">مبدا</span>'
      : "";
    const destinationBadge = location.isDestination
      ? '<span style="background: var(--color-warning); color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; margin-right: 8px; font-weight: 600;">مقصد</span>'
      : "";
    
    // دکمه تنظیم مبدا (فقط اگر مبدا نباشد)
    const setOriginBtn = !location.isCurrentLocation
      ? `<button class="set-origin-btn" onclick="setAsOrigin(${location.id})" title="تنظیم به عنوان مبدا">
           <i class="fas fa-home"></i>
           <span>مبدا</span>
         </button>`
      : "";
    
    // دکمه تنظیم مقصد (فقط اگر مقصد نباشد)
    const setDestinationBtn = !location.isDestination
      ? `<button class="set-destination-btn" onclick="setAsDestination(${location.id})" title="تنظیم به عنوان مقصد">
           <i class="fas fa-flag-checkered"></i>
           <span>مقصد</span>
         </button>`
      : "";
    
    li.innerHTML = `
            <span class="location-name">
              <i class="fas fa-map-marker-alt" style="color: var(--color-accent);"></i>
              ${location.name} ${originBadge}${destinationBadge}
            </span>
            <div class="location-actions">
                ${setOriginBtn}
                ${setDestinationBtn}
                <button class="remove-btn" onclick="removeLocation(${location.id})" title="حذف">
                  <i class="fas fa-trash"></i>
                  <span>حذف</span>
                </button>
            </div>
        `;
    list.appendChild(li);
  });

  // Update location count
  locationCount.textContent = locations.length;

  // Enable/disable optimize button
  const optimizeBtn = document.getElementById("optimizeRouteBtn");
  optimizeBtn.disabled = locations.length < 2;

  if (locations.length < 2) {
    optimizeBtn.style.opacity = "0.5";
    optimizeBtn.style.cursor = "not-allowed";
  } else {
    optimizeBtn.style.opacity = "1";
    optimizeBtn.style.cursor = "pointer";
  }
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

// Set location as destination
function setAsDestination(locationId) {
  // Remove destination flag from all locations
  locations.forEach((loc) => {
    loc.isDestination = false;
  });

  // Set the selected location as destination
  const location = locations.find((loc) => loc.id === locationId);
  if (location) {
    location.isDestination = true;
    updateLocationsList();
    showToast(`"${location.name}" به عنوان مقصد تنظیم شد`);
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
  button.innerHTML =
    '<div class="spinner" style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin-left: 8px;"></div> در حال پیدا کردن...';
  button.disabled = true;

  navigator.geolocation.getCurrentPosition(
    function (position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      console.log("Current location obtained:", lat, lng);

      // Reverse geocoding to get address
      reverseGeocode(lat, lng);

      button.innerHTML =
        '<i class="fas fa-location-arrow"></i><span>موقعیت فعلی من</span>';
      button.disabled = false;
    },
    function (error) {
      console.error("Geolocation error:", error);
      
      // مدیریت خطاهای مختلف
      let errorMessage = "خطا در دریافت موقعیت فعلی";
      switch(error.code) {
        case error.TIMEOUT:
          errorMessage = "زمان دریافت موقعیت به پایان رسید";
          break;
        case error.PERMISSION_DENIED:
          errorMessage = "دسترسی به موقعیت رد شد";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "موقعیت در دسترس نیست";
          break;
      }
      
      showToast(errorMessage, "error");
      button.innerHTML =
        '<i class="fas fa-location-arrow"></i><span>موقعیت فعلی من</span>';
      button.disabled = false;
    },
    {
      enableHighAccuracy: false, // کاهش دقت برای کاهش timeout
      timeout: 15000, // افزایش timeout به 15 ثانیه
      maximumAge: 60000, // استفاده از موقعیت تا 1 دقیقه قبل
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

// Optimize route using TSP algorithm with traffic consideration
function optimizeRoute() {
  try {
    if (locations.length < 2) {
      showToast("حداقل 2 لوکیشن برای بهینه‌سازی مسیر نیاز است", "error");
      return;
    }

    const button = document.getElementById("optimizeRouteBtn");
    button.innerHTML =
      '<div class="spinner" style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin-left: 8px;"></div> در حال بهینه‌سازی...';
    button.disabled = true;

    // دریافت تنظیمات مسیریابی از رابط کاربری
    const routingType = document.querySelector('input[name="routingType"]:checked').value;
    const trafficEnabled = document.getElementById("trafficToggle").checked;

    console.log("Starting route optimization with settings:", { routingType, trafficEnabled });

    // Send request to server for route optimization with traffic settings
    fetch("/api/optimize-route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        locations,
        routingType: routingType,
        trafficEnabled: trafficEnabled
      }),
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

          // Show route info with traffic data
          showRouteInfo(
            data.optimizedRoute, 
            data.totalDistance || 0, 
            data.totalDuration || null,
            data.trafficOptimized || false,
            data.routingType || 'fastest'
          );
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
      button.innerHTML =
        '<i class="fas fa-rocket"></i><span>بهینه‌سازی مسیر</span>';
      button.disabled = false;
    });
  } catch (error) {
    handleGlobalError(error, 'optimizeRoute');
    const button = document.getElementById("optimizeRouteBtn");
    button.innerHTML =
      '<i class="fas fa-rocket"></i><span>بهینه‌سازی مسیر</span>';
    button.disabled = false;
  }
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
          // انتخاب رنگ بر اساس شماره مقصد (i + 1)
          const routeColor = routeColors[(i + 1) % routeColors.length];
          
          // Draw polyline on map
          const routeLine = L.polyline(data.route, {
            color: routeColor,
            weight: 6,
            opacity: 0.8,
          }).addTo(map);

          routeLines.push(routeLine);
        } else {
          // Fallback: draw straight line
          console.warn(
            `Could not get route from ${from.name} to ${to.name}, drawing straight line`
          );
          
          // انتخاب رنگ بر اساس شماره مقصد (i + 1)
          const routeColor = routeColors[(i + 1) % routeColors.length];
          
          const straightLine = L.polyline(
            [
              [from.lat, from.lng],
              [to.lat, to.lng],
            ],
            {
              color: routeColor,
              weight: 5,
              opacity: 0.6,
              dashArray: "10, 10",
            }
          ).addTo(map);

          routeLines.push(straightLine);
        }
      } catch (error) {
        console.error(`Error getting route segment ${i}:`, error);
        // Fallback: draw straight line
        
        // انتخاب رنگ بر اساس شماره مقصد (i + 1)
        const routeColor = routeColors[(i + 1) % routeColors.length];
        
        const straightLine = L.polyline(
          [
            [from.lat, from.lng],
            [to.lat, to.lng],
          ],
          {
            color: routeColor,
            weight: 5,
            opacity: 0.6,
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
    // انتخاب رنگ بر اساس شماره مکان (متناسب با رنگ خط مسیر)
    const markerColor = routeColors[index % routeColors.length];
    
    const markerIcon = L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          background: ${markerColor};
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

    const popupContent = `
      <div style="text-align: right; direction: rtl; min-width: 200px;">
        <div style="margin-bottom: 12px;">
          <b style="color: var(--color-accent); font-size: 16px;">توقف ${index + 1}: ${location.name}</b><br>
          <span style="color: var(--color-text-secondary); font-size: 12px;">
            ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
          </span>
        </div>
        
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button class="popup-nav-btn google-maps-popup" onclick="openSingleLocationInGoogleMaps('${location.lat},${location.lng}', '${location.name}')" title="گوگل مپ">
            <i class="fab fa-google"></i>
          </button>
          <button class="popup-nav-btn waze-popup" onclick="openInWaze('${location.lat},${location.lng}', '${location.name}')" title="ویز">
            <i class="fas fa-car"></i>
          </button>
          <button class="popup-nav-btn neshan-popup" onclick="openInNeshan('${location.lat},${location.lng}', '${location.name}')" title="نشان">
            <i class="fas fa-map"></i>
          </button>
        </div>
      </div>
    `;

    const marker = L.marker([location.lat, location.lng], { icon: markerIcon })
      .addTo(map)
      .bindPopup(popupContent);

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
  const toastContainer = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icon =
    type === "success"
      ? "fas fa-check-circle"
      : type === "error"
      ? "fas fa-exclamation-circle"
      : type === "warning"
      ? "fas fa-exclamation-triangle"
      : "fas fa-info-circle";

  toast.innerHTML = `
    <i class="${icon}" style="color: ${
    type === "success"
      ? "var(--color-success)"
      : type === "error"
      ? "var(--color-error)"
      : type === "warning"
      ? "var(--color-warning)"
      : "var(--color-accent)"
  };"></i>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Show toast
  setTimeout(() => toast.classList.add("show"), 100);

  // Hide toast after 4 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

// مدیریت خطاهای عمومی
function handleGlobalError(error, context = '') {
  console.error(`Error in ${context}:`, error);
  
  // نمایش پیام خطا به کاربر فقط برای خطاهای مهم
  if (error.message && !error.message.includes('content')) {
    showToast(`خطا در ${context}: ${error.message}`, "error");
  }
}

// ============================================
// NAVIGATION MODE
// ============================================

let navigationMode = false;
let navigationWatchId = null;
let currentRoute = null;
let currentStepIndex = 0;
let userLocationMarker = null;

// باز کردن مسیر در گوگل مپ
function openInGoogleMaps(optimizedOrder) {
  if (!optimizedOrder || optimizedOrder.length < 2) {
    showToast("حداقل 2 مکان برای مسیریابی نیاز است", "error");
    return;
  }

  try {
    // ایجاد URL گوگل مپ
    let googleMapsUrl = "https://www.google.com/maps/dir/";
    
    // اضافه کردن مختصات مکان‌ها
    optimizedOrder.forEach((location, index) => {
      googleMapsUrl += `${location.lat},${location.lng}`;
      if (index < optimizedOrder.length - 1) {
        googleMapsUrl += "/";
      }
    });
    
    // اضافه کردن پارامترهای اضافی
    googleMapsUrl += "/@35.699756,51.338076,12z";
    
    // باز کردن در تب جدید
    window.open(googleMapsUrl, "_blank");
    
    showToast("مسیر در گوگل مپ باز شد", "success");
  } catch (error) {
    console.error("خطا در باز کردن گوگل مپ:", error);
    showToast("خطا در باز کردن گوگل مپ", "error");
  }
}

// باز کردن مکان واحد در گوگل مپ
function openSingleLocationInGoogleMaps(coordinates, locationName) {
  try {
    // ایجاد URL گوگل مپ برای مکان واحد
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates}`;
    
    // باز کردن در تب جدید
    window.open(googleMapsUrl, "_blank");
    
    showToast(`"${locationName}" در گوگل مپ باز شد`, "success");
  } catch (error) {
    console.error("خطا در باز کردن گوگل مپ:", error);
    showToast("خطا در باز کردن گوگل مپ", "error");
  }
}

// باز کردن مکان در ویز
function openInWaze(coordinates, locationName) {
  try {
    // ایجاد URL ویز
    const wazeUrl = `https://waze.com/ul?ll=${coordinates}&navigate=yes`;
    
    // باز کردن در تب جدید
    window.open(wazeUrl, "_blank");
    
    showToast(`"${locationName}" در ویز باز شد`, "success");
  } catch (error) {
    console.error("خطا در باز کردن ویز:", error);
    showToast("خطا در باز کردن ویز", "error");
  }
}

// باز کردن مکان در نشان
function openInNeshan(coordinates, locationName) {
  try {
    // تقسیم مختصات
    const [lat, lng] = coordinates.split(',');
    
    // ایجاد URL برای اپلیکیشن نشان
    const neshanAppUrl = `neshan://route?dlat=${lat}&dlng=${lng}&navigation=true`;
    
    // ایجاد URL برای وب‌سایت نشان
    const neshanWebUrl = `https://neshan.org/maps/routing/car/destination/${coordinates}`;
    
    // بررسی اینکه آیا کاربر در موبایل است یا نه
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // در موبایل: ابتدا سعی کن اپلیکیشن را باز کن
      const tempLink = document.createElement('a');
      tempLink.href = neshanAppUrl;
      tempLink.style.display = 'none';
      document.body.appendChild(tempLink);
      
      // کلیک روی لینک برای باز کردن اپلیکیشن
      tempLink.click();
      
      // حذف لینک موقت
      document.body.removeChild(tempLink);
      
      // اگر اپلیکیشن باز نشد، بعد از 2 ثانیه وب‌سایت را باز کن
      setTimeout(() => {
        window.open(neshanWebUrl, "_blank");
      }, 2000);
    } else {
      // در دسکتاپ: مستقیماً وب‌سایت را باز کن
      window.open(neshanWebUrl, "_blank");
    }
    
    showToast(`"${locationName}" در نشان باز شد`, "success");
  } catch (error) {
    console.error("خطا در باز کردن نشان:", error);
    showToast("خطا در باز کردن نشان", "error");
  }
}

// Show start navigation button after route optimization
function showRouteInfo(optimizedOrder, totalDistance, totalDuration = null, trafficOptimized = false, routingType = 'fastest') {
  const routeInfo = document.getElementById("routeInfo");
  const routeDetails = document.getElementById("routeDetails");
  const startNavBtn = document.getElementById("startNavigationBtn");

  let routeText = `
    <div style="margin-bottom: 20px;">
      <h4 style="color: var(--color-accent); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-route"></i>
        ترتیب بهینه مسیر
      </h4>
      
      <!-- Traffic Status Badge -->
      <div class="traffic-status ${trafficOptimized ? '' : 'disabled'}" style="margin-bottom: 16px;">
        <i class="fas ${trafficOptimized ? 'fa-traffic-light' : 'fa-ban'}"></i>
        <span>${trafficOptimized ? 'بهینه‌سازی با ترافیک فعال' : 'بهینه‌سازی بدون ترافیک'}</span>
      </div>
      
      <ol style="margin: 0; padding-right: 20px;">
  `;

  optimizedOrder.forEach((location, index) => {
    const isOrigin = location.isCurrentLocation
      ? ' <span style="background: var(--color-success); color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-right: 4px;">مبدا</span>'
      : "";
    const isDestination = location.isDestination
      ? ' <span style="background: var(--color-warning); color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px; margin-right: 4px;">مقصد</span>'
      : "";
    routeText += `
      <li style="margin-bottom: 8px; padding: 8px 12px; background: var(--color-surface); border-radius: 8px; border-right: 3px solid var(--color-accent); display: flex; align-items: center; justify-content: space-between;">
        <span style="font-weight: 600; color: var(--color-text);">${
          index + 1
        }. ${location.name}${isOrigin}${isDestination}</span>
        <button class="google-maps-small-btn" onclick="openSingleLocationInGoogleMaps('${location.lat},${location.lng}', '${location.name}')" title="مشاهده در گوگل مپ">
          <i class="fab fa-google"></i>
        </button>
      </li>
    `;
  });

  routeText += `
      </ol>
    </div>
    
    <div style="display: grid; grid-template-columns: ${totalDuration ? '1fr 1fr 1fr' : '1fr 1fr'}; gap: 16px; margin-bottom: 20px;">
      <div style="background: var(--color-surface); padding: 16px; border-radius: 12px; text-align: center; border: 1px solid var(--color-border);">
        <div style="color: var(--color-accent); font-size: 24px; font-weight: 700; margin-bottom: 4px;">
          ${totalDistance.toFixed(1)}
        </div>
        <div style="color: var(--color-text-secondary); font-size: 14px;">
          <i class="fas fa-road" style="margin-left: 4px;"></i>
          کیلومتر
        </div>
      </div>
      
      ${totalDuration ? `
      <div style="background: var(--color-surface); padding: 16px; border-radius: 12px; text-align: center; border: 1px solid var(--color-border);">
        <div style="color: var(--color-accent); font-size: 24px; font-weight: 700; margin-bottom: 4px;">
          ${Math.round(totalDuration / 60)}
        </div>
        <div style="color: var(--color-text-secondary); font-size: 14px;">
          <i class="fas fa-clock" style="margin-left: 4px;"></i>
          دقیقه
        </div>
      </div>
      ` : ''}
      
      <div style="background: var(--color-surface); padding: 16px; border-radius: 12px; text-align: center; border: 1px solid var(--color-border);">
        <div style="color: var(--color-accent); font-size: 24px; font-weight: 700; margin-bottom: 4px;">
          ${optimizedOrder.length}
        </div>
        <div style="color: var(--color-text-secondary); font-size: 14px;">
          <i class="fas fa-map-marker-alt" style="margin-left: 4px;"></i>
          توقف
        </div>
      </div>
    </div>
    
    <!-- Routing Type Info -->
    <div style="background: var(--color-surface); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid var(--color-border); margin-bottom: 16px;">
      <div style="color: var(--color-text-secondary); font-size: 12px;">
        <i class="fas ${routingType === 'fastest' ? 'fa-tachometer-alt' : 'fa-ruler'}"></i>
        نوع مسیریابی: ${routingType === 'fastest' ? 'سریع‌ترین مسیر' : 'کوتاه‌ترین مسیر'}
      </div>
    </div>
  `;

  routeDetails.innerHTML = routeText;
  routeInfo.style.display = "block";

  // Show navigation button
  if (optimizedOrder.length >= 2) {
    startNavBtn.style.display = "flex";
    startNavBtn.onclick = startNavigation;
  }
}

// Start navigation mode
async function startNavigation() {
  if (!locations || locations.length < 2) {
    showToast("برای شروع مسیریابی حداقل 2 لوکیشن نیاز است", "error");
    return;
  }

  if (!navigator.geolocation) {
    showToast("مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند", "error");
    return;
  }

  navigationMode = true;

  // Hide menu and show navigation panel
  closeMenu();
  document.getElementById("navigationPanel").style.display = "block";

  // Get current location first
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      console.log("Navigation starting from:", userLat, userLng);

      // Find nearest location or use optimized route
      const optimizedRoute = await getOptimizedRouteFromCurrentLocation(
        userLat,
        userLng
      );

      if (optimizedRoute && optimizedRoute.length > 0) {
        currentRoute = optimizedRoute;
        currentStepIndex = 0;

        // Start tracking user location
        startLocationTracking();

        // Get and display first route
        await updateNavigationInstruction();

        showToast("مسیریابی زنده شروع شد", "success");
      } else {
        showToast("خطا در محاسبه مسیر", "error");
        stopNavigation();
      }
    },
    (error) => {
      console.error("Navigation geolocation error:", error);
      
      // مدیریت خطاهای مختلف
      let errorMessage = "خطا در دریافت موقعیت فعلی";
      switch(error.code) {
        case error.TIMEOUT:
          errorMessage = "زمان دریافت موقعیت به پایان رسید";
          break;
        case error.PERMISSION_DENIED:
          errorMessage = "دسترسی به موقعیت رد شد";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "موقعیت در دسترس نیست";
          break;
      }
      
      showToast(errorMessage, "error");
      stopNavigation();
    },
    {
      enableHighAccuracy: false, // کاهش دقت برای کاهش timeout
      timeout: 15000, // افزایش timeout به 15 ثانیه
      maximumAge: 30000, // استفاده از موقعیت تا 30 ثانیه قبل
    }
  );

  // Setup stop button
  document.getElementById("stopNavigationBtn").onclick = stopNavigation;
}

// Get optimized route from current location
async function getOptimizedRouteFromCurrentLocation(lat, lng) {
  // For simplicity, use the already optimized route
  // In a real app, you'd recalculate from current position
  return locations;
}

// Start tracking user location
function startLocationTracking() {
  if (!navigator.geolocation) {
    console.warn("Geolocation not supported");
    return;
  }

  console.log("Starting location tracking...");

  navigationWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      console.log("Location updated:", userLat, userLng);

      // Update user marker on map
      updateUserLocationMarker(userLat, userLng);

      // Update navigation instruction based on current location
      updateNavigationBasedOnLocation(userLat, userLng);

      // Center map on user location
      map.setView([userLat, userLng], 17);
    },
    (error) => {
      console.error("Location tracking error:", error);
      
      // مدیریت خطاهای مختلف
      switch(error.code) {
        case error.TIMEOUT:
          console.warn("Location request timed out");
          showToast("زمان دریافت موقعیت به پایان رسید", "warning");
          break;
        case error.PERMISSION_DENIED:
          console.warn("Location permission denied");
          showToast("دسترسی به موقعیت رد شد", "error");
          break;
        case error.POSITION_UNAVAILABLE:
          console.warn("Location unavailable");
          showToast("موقعیت در دسترس نیست", "error");
          break;
        default:
          console.warn("Unknown location error");
          showToast("خطا در دریافت موقعیت", "error");
          break;
      }
    },
    {
      enableHighAccuracy: false, // کاهش دقت برای کاهش timeout
      timeout: 15000, // افزایش timeout به 15 ثانیه
      maximumAge: 30000, // استفاده از موقعیت تا 30 ثانیه قبل
    }
  );
}

// Update user location marker
function updateUserLocationMarker(lat, lng) {
  // Remove old marker
  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
  }

  // Create custom user location icon
  const userIcon = L.divIcon({
    className: "user-location-marker",
    html: '<div style="width: 20px; height: 20px; background: #667eea; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(102, 126, 234, 0.6);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // Add new marker
  userLocationMarker = L.marker([lat, lng], { icon: userIcon })
    .addTo(map)
    .bindPopup("<b>موقعیت فعلی شما</b>");
}

// Update navigation instruction
async function updateNavigationInstruction() {
  if (!currentRoute || currentStepIndex >= currentRoute.length) {
    // Reached destination
    showToast("به مقصد رسیدید! 🎉", "success");
    stopNavigation();
    return;
  }

  const currentDestination = currentRoute[currentStepIndex];
  
  // بررسی صحت داده‌ها
  if (!currentDestination || !currentDestination.lat || !currentDestination.lng) {
    console.error("Invalid destination data:", currentDestination);
    showToast("خطا در داده‌های مقصد", "error");
    return;
  }

  // تعیین مبدا با بررسی صحت داده‌ها
  let origin;
  if (currentStepIndex === 0 && userLocationMarker) {
    try {
      const userLatLng = userLocationMarker.getLatLng();
      origin = {
        lat: userLatLng.lat,
        lng: userLatLng.lng,
      };
    } catch (error) {
      console.warn("Error getting user location:", error);
      // استفاده از اولین لوکیشن در مسیر
      origin = {
        lat: currentRoute[0].lat,
        lng: currentRoute[0].lng,
      };
    }
  } else if (currentStepIndex > 0 && currentRoute[currentStepIndex - 1]) {
    origin = {
      lat: currentRoute[currentStepIndex - 1].lat,
      lng: currentRoute[currentStepIndex - 1].lng,
    };
  } else {
    // fallback به اولین لوکیشن
    origin = {
      lat: currentRoute[0].lat,
      lng: currentRoute[0].lng,
    };
  }

  // Get route to current destination
  const response = await fetch("/api/get-route", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      origin: origin,
      destination: { lat: currentDestination.lat, lng: currentDestination.lng },
    }),
  });

  const data = await response.json();

  if (data.success && data.route) {
    // Update stats
    document.getElementById(
      "remainingDistance"
    ).textContent = `${data.distance.toFixed(1)} کیلومتر`;
    document.getElementById("remainingTime").textContent = `${Math.round(
      data.duration / 60
    )} دقیقه`;

    // Update instruction
    document.getElementById(
      "instructionText"
    ).textContent = `به سمت ${currentDestination.name} حرکت کنید`;
    document.getElementById("instructionIcon").textContent = "→";

    // Show next step if available
    if (currentStepIndex + 1 < currentRoute.length) {
      document.getElementById("nextStep").style.display = "block";
      document.getElementById("nextStepText").textContent =
        currentRoute[currentStepIndex + 1].name;
    } else {
      document.getElementById("nextStep").style.display = "none";
    }
  }
}

// Update navigation based on user location
function updateNavigationBasedOnLocation(userLat, userLng) {
  if (!currentRoute || currentStepIndex >= currentRoute.length) return;

  const currentDestination = currentRoute[currentStepIndex];
  const distance = calculateDistanceInMeters(
    userLat,
    userLng,
    currentDestination.lat,
    currentDestination.lng
  );

  // If within 50 meters of destination, move to next waypoint
  if (distance < 50) {
    currentStepIndex++;

    if (currentStepIndex < currentRoute.length) {
      showToast(`رسیدید به ${currentDestination.name}`, "success");
      updateNavigationInstruction();
    } else {
      showToast("به مقصد نهایی رسیدید! 🎉", "success");
      stopNavigation();
    }
  } else {
    // Update remaining distance
    document.getElementById("remainingDistance").textContent = `${(
      distance / 1000
    ).toFixed(1)} کیلومتر`;
  }
}

// Calculate distance in meters
function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Stop navigation mode
function stopNavigation() {
  navigationMode = false;

  // Stop location tracking
  if (navigationWatchId) {
    navigator.geolocation.clearWatch(navigationWatchId);
    navigationWatchId = null;
  }

  // Remove user location marker
  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
    userLocationMarker = null;
  }

  // Show menu trigger and hide navigation panel
  document.getElementById("menuTrigger").classList.remove("hidden");
  document.getElementById("navigationPanel").style.display = "none";

  // Reset zoom
  if (markers && markers.length > 0) {
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
  }

  currentRoute = null;
  currentStepIndex = 0;
}

// اضافه کردن لایه ترافیک جایگزین
function addTrafficLayer() {
  try {
    // ایجاد لایه ترافیک با استفاده از OpenStreetMap یا سرویس جایگزین
    const trafficUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    
    trafficLayer = L.tileLayer(trafficUrl, {
      attribution: 'ترافیک زنده از طریق Neshan API',
      opacity: 0.3,
      zIndex: 1000
    });

    // اضافه کردن کنترل ترافیک
    addTrafficControl();
    
    console.log("✅ لایه ترافیک جایگزین اضافه شد");
  } catch (error) {
    console.warn("خطا در اضافه کردن لایه ترافیک:", error);
  }
}

// اضافه کردن کنترل ترافیک
function addTrafficControl() {
  // ایجاد کنترل ترافیک دستی
  const trafficControl = L.control({ position: 'topright' });
  
  trafficControl.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'traffic-control');
    div.innerHTML = `
      <button id="trafficToggleBtn" class="traffic-btn" title="نمایش/مخفی کردن ترافیک">
        <i class="fas fa-traffic-light"></i>
        <span>ترافیک</span>
      </button>
    `;
    
    // اضافه کردن استایل
    div.style.cssText = `
      background: rgba(255, 255, 255, 0.9);
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      cursor: pointer;
    `;
    
    // اضافه کردن رویداد کلیک
    L.DomEvent.on(div, 'click', function() {
      toggleTrafficLayer();
    });
    
    L.DomEvent.disableClickPropagation(div);
    
    return div;
  };
  
  trafficControl.addTo(map);
}

// تغییر وضعیت لایه ترافیک
function toggleTrafficLayer() {
  if (trafficLayer) {
    if (map.hasLayer(trafficLayer)) {
      map.removeLayer(trafficLayer);
      document.getElementById('trafficToggleBtn').style.opacity = '0.5';
      console.log("ترافیک مخفی شد");
    } else {
      map.addLayer(trafficLayer);
      document.getElementById('trafficToggleBtn').style.opacity = '1';
      console.log("ترافیک نمایش داده شد");
    }
  }
}

// ============================================
// DATABASE MANAGEMENT
// ============================================

// بارگذاری داده‌های دیتابیس
async function loadDatabaseData() {
  try {
    console.log("🔄 در حال بارگذاری داده‌های دیتابیس...");
    
    // بارگذاری دسته‌بندی‌ها
    await loadCategories();
    
    // بارگذاری موقعیت‌ها
    await loadDatabaseLocations();
    
    console.log("✅ داده‌های دیتابیس بارگذاری شدند");
  } catch (error) {
    console.error("خطا در بارگذاری داده‌های دیتابیس:", error);
    showToast("خطا در بارگذاری موقعیت‌های دیتابیس", "error");
  }
}

// بارگذاری دسته‌بندی‌ها
async function loadCategories() {
  try {
    const response = await fetch("/api/categories");
    const data = await response.json();
    
    if (data.success) {
      categories = data.categories;
      populateCategoryFilter();
      console.log(`✅ ${categories.length} دسته‌بندی بارگذاری شد`);
    }
  } catch (error) {
    console.error("خطا در بارگذاری دسته‌بندی‌ها:", error);
  }
}

// پر کردن فیلتر دسته‌بندی
function populateCategoryFilter() {
  const categoryFilter = document.getElementById("categoryFilter");
  categoryFilter.innerHTML = '<option value="">همه دسته‌بندی‌ها</option>';
  
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    categoryFilter.appendChild(option);
  });
}

// بارگذاری موقعیت‌های دیتابیس
async function loadDatabaseLocations(categoryId = null, searchTerm = null) {
  try {
    showLoadingState();
    
    let url = "/api/locations";
    const params = new URLSearchParams();
    
    if (categoryId) {
      params.append("category_id", categoryId);
    }
    if (searchTerm) {
      params.append("search", searchTerm);
    }
    
    if (params.toString()) {
      url += "?" + params.toString();
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      databaseLocations = data.locations;
      renderDatabaseLocations();
      console.log(`✅ ${databaseLocations.length} موقعیت بارگذاری شد`);
    }
  } catch (error) {
    console.error("خطا در بارگذاری موقعیت‌ها:", error);
    showErrorState();
  }
}

// جستجوی موقعیت‌ها
async function searchDatabaseLocations() {
  const searchTerm = document.getElementById("locationSearch").value.trim();
  const categoryId = document.getElementById("categoryFilter").value;
  
  await loadDatabaseLocations(categoryId, searchTerm);
}

// فیلتر کردن موقعیت‌ها بر اساس دسته‌بندی
async function filterDatabaseLocations() {
  const categoryId = document.getElementById("categoryFilter").value;
  const searchTerm = document.getElementById("locationSearch").value.trim();
  
  await loadDatabaseLocations(categoryId, searchTerm);
}

// نمایش حالت بارگذاری
function showLoadingState() {
  const container = document.getElementById("databaseLocations");
  container.innerHTML = `
    <div class="locations-loading">
      <i class="fas fa-spinner fa-spin" style="margin-left: 8px;"></i>
      در حال بارگذاری موقعیت‌ها...
    </div>
  `;
}

// نمایش حالت خطا
function showErrorState() {
  const container = document.getElementById("databaseLocations");
  container.innerHTML = `
    <div class="locations-empty">
      <i class="fas fa-exclamation-triangle"></i>
      <p>خطا در بارگذاری موقعیت‌ها</p>
    </div>
  `;
}

// رندر کردن موقعیت‌های دیتابیس
function renderDatabaseLocations() {
  const container = document.getElementById("databaseLocations");
  
  if (databaseLocations.length === 0) {
    container.innerHTML = `
      <div class="locations-empty">
        <i class="fas fa-map-marker-alt"></i>
        <p>هیچ موقعیتی پیدا نشد</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = databaseLocations.map(location => `
    <div class="location-card" data-location-id="${location.id}">
      <div class="location-card-header">
        <div class="location-icon" style="background-color: ${location.color}">
          <i class="${location.icon}"></i>
        </div>
        <div>
          <h4 class="location-name">${location.name}</h4>
          <p class="location-category">${location.category_name}</p>
        </div>
      </div>
      
      <p class="location-description">${location.description || 'توضیحی موجود نیست'}</p>
      
      <div class="location-address">
        <i class="fas fa-map-marker-alt"></i>
        <span>${location.address || 'آدرس موجود نیست'}</span>
      </div>
      
      ${location.rating > 0 ? `
        <div class="location-rating">
          <i class="fas fa-star"></i>
          <span>${location.rating.toFixed(1)}</span>
        </div>
      ` : ''}
      
      <div class="location-actions">
        ${isLocationAdded(location.id) ? `
          <button class="remove-location-btn" onclick="removeLocationFromDatabase(${location.id})">
            <i class="fas fa-trash"></i>
            <span>حذف</span>
          </button>
        ` : `
          <button class="add-location-btn" onclick="addLocationFromDatabase(${location.id})">
            <i class="fas fa-plus"></i>
            <span>اضافه کردن</span>
          </button>
        `}
        <button class="view-details-btn" onclick="viewLocationDetails(${location.id})">
          <i class="fas fa-info"></i>
          <span>جزئیات</span>
        </button>
      </div>
    </div>
  `).join('');
}

// بررسی وجود مکان در آرایه locations
function isLocationAdded(locationId) {
  return locations.some(loc => loc.databaseId === locationId);
}

// اضافه کردن موقعیت از دیتابیس
function addLocationFromDatabase(locationId, event) {
  // جلوگیری از انتشار event به والدین
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  const location = databaseLocations.find(loc => loc.id === locationId);
  
  if (location) {
    const newLocation = {
      id: Date.now(),
      databaseId: locationId, // ذخیره ID دیتابیس برای شناسایی
      name: location.name,
      lat: location.latitude,
      lng: location.longitude,
      isCurrentLocation: false,
      isDestination: false, // اضافه کردن فیلد مقصد
    };
    
    locations.push(newLocation);
    updateLocationsList();
    addMarkerToMap(newLocation);
    showToast(`لوکیشن "${location.name}" اضافه شد`);
    
    // بروزرسانی فقط دکمه کلیک شده
    updateLocationButton(locationId, true);
  }
}

// حذف موقعیت از آرایه locations
function removeLocationFromDatabase(locationId, event) {
  // جلوگیری از انتشار event به والدین
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  const index = locations.findIndex(loc => loc.databaseId === locationId);
  
  if (index !== -1) {
    const location = locations[index];
    locations.splice(index, 1);
    
    // حذف marker از نقشه
    if (markers[index]) {
      map.removeLayer(markers[index]);
      markers.splice(index, 1);
    }
    
    updateLocationsList();
    clearRoute();
    showToast(`لوکیشن "${location.name}" حذف شد`);
    
    // بروزرسانی فقط دکمه کلیک شده
    updateLocationButton(locationId, false);
  }
}

// بروزرسانی دکمه مکان بدون رندر مجدد
function updateLocationButton(locationId, isAdded) {
  const locationCard = document.querySelector(`.location-card[data-location-id="${locationId}"]`);
  if (!locationCard) return;
  
  const actionsDiv = locationCard.querySelector('.location-actions');
  if (!actionsDiv) return;
  
  // پیدا کردن دکمه فعلی
  const currentBtn = actionsDiv.querySelector('.add-location-btn, .remove-location-btn');
  if (!currentBtn) return;
  
  // ایجاد دکمه جدید
  const newBtn = document.createElement('button');
  
  if (isAdded) {
    // تبدیل به دکمه حذف
    newBtn.className = 'remove-location-btn';
    newBtn.onclick = (event) => removeLocationFromDatabase(locationId, event);
    newBtn.innerHTML = `
      <i class="fas fa-trash"></i>
      <span>حذف</span>
    `;
  } else {
    // تبدیل به دکمه اضافه کردن
    newBtn.className = 'add-location-btn';
    newBtn.onclick = (event) => addLocationFromDatabase(locationId, event);
    newBtn.innerHTML = `
      <i class="fas fa-plus"></i>
      <span>اضافه کردن</span>
    `;
  }
  
  // جایگزینی دکمه
  currentBtn.replaceWith(newBtn);
}

// نمایش جزئیات موقعیت
function viewLocationDetails(locationId) {
  const location = databaseLocations.find(loc => loc.id === locationId);
  
  if (location) {
    const details = `
      <div style="text-align: right; direction: rtl;">
        <h3 style="color: var(--color-accent); margin-bottom: 16px;">${location.name}</h3>
        
        <div style="margin-bottom: 12px;">
          <strong>دسته‌بندی:</strong> ${location.category_name}
        </div>
        
        <div style="margin-bottom: 12px;">
          <strong>توضیحات:</strong><br>
          ${location.description || 'توضیحی موجود نیست'}
        </div>
        
        <div style="margin-bottom: 12px;">
          <strong>آدرس:</strong><br>
          ${location.address || 'آدرس موجود نیست'}
        </div>
        
        <div style="margin-bottom: 12px;">
          <strong>مختصات:</strong><br>
          عرض: ${location.latitude.toFixed(6)}<br>
          طول: ${location.longitude.toFixed(6)}
        </div>
        
        ${location.rating > 0 ? `
          <div style="margin-bottom: 12px;">
            <strong>امتیاز:</strong> ${location.rating.toFixed(1)} ⭐
          </div>
        ` : ''}
        
        ${location.phone ? `
          <div style="margin-bottom: 12px;">
            <strong>تلفن:</strong> ${location.phone}
          </div>
        ` : ''}
        
        ${location.website ? `
          <div style="margin-bottom: 12px;">
            <strong>وب‌سایت:</strong> <a href="${location.website}" target="_blank">${location.website}</a>
          </div>
        ` : ''}
      </div>
    `;
    
    // نمایش جزئیات در popup
    if (map) {
      const marker = L.marker([location.latitude, location.longitude])
        .addTo(map)
        .bindPopup(details)
        .openPopup();
      
      map.setView([location.latitude, location.longitude], 16);
    }
  }
}
