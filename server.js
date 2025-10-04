const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const config = require("./config");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Handle favicon.ico
app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "test-map.html"));
});

app.get("/test-neshan", (req, res) => {
  res.sendFile(path.join(__dirname, "test-neshan.html"));
});

app.get("/test-simple", (req, res) => {
  res.sendFile(path.join(__dirname, "test-simple.html"));
});

// API Key endpoint
app.get("/api/config", (req, res) => {
  res.json({
    neshanApiKey: config.NESHAN_WEB_API_KEY,
  });
});

// Geocoding API endpoint
app.post("/api/geocode", async (req, res) => {
  try {
    const { locationName } = req.body;

    if (!locationName) {
      return res.status(400).json({ error: "نام لوکیشن الزامی است" });
    }

    // Try Neshan API first
    try {
      const geocodingUrl = `${
        config.NESHAN_BASE_URL
      }/v1/search?term=${encodeURIComponent(
        locationName
      )}&lat=35.7219&lng=51.3347`;

      const response = await axios.get(geocodingUrl, {
        headers: {
          "Api-Key": config.NESHAN_SERVICE_API_KEY,
        },
      });

      if (response.data.items && response.data.items.length > 0) {
        const location = response.data.items[0];
        return res.json({
          success: true,
          location: {
            name: locationName,
            lat: location.location.y,
            lng: location.location.x,
            address: location.title,
          },
        });
      }
    } catch (neshanError) {
      console.warn(
        "Neshan geocoding failed, trying OpenStreetMap:",
        neshanError.response && neshanError.response.status,
        (neshanError.response &&
          neshanError.response.data &&
          neshanError.response.data.message) ||
          neshanError.message
      );

      // If error 485, it means Search API is not enabled for this key
      if (neshanError.response && neshanError.response.status === 485) {
        console.log(
          "⚠️  سرویس Search برای این API Key فعال نیست. از OpenStreetMap استفاده می‌شود."
        );
      }
    }

    // Fallback to OpenStreetMap Nominatim
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        locationName
      )}&countrycodes=ir&limit=5&addressdetails=1`;
      const response = await axios.get(nominatimUrl, {
        headers: {
          "User-Agent": "NeshanRouteOptimizer/1.0",
        },
      });

      if (response.data && response.data.length > 0) {
        const location = response.data[0];
        console.log(`✅ Found via OpenStreetMap: ${location.display_name}`);
        return res.json({
          success: true,
          location: {
            name: locationName,
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lon),
            address: location.display_name,
          },
        });
      }
    } catch (nominatimError) {
      console.warn(
        "OpenStreetMap geocoding also failed:",
        nominatimError.message
      );
    }

    // If both failed
    res.status(404).json({ error: "لوکیشن پیدا نشد" });
  } catch (error) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: "خطا در پیدا کردن لوکیشن" });
  }
});

// Reverse geocoding API endpoint
app.post("/api/reverse-geocode", async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: "مختصات الزامی است" });
    }

    // Try Neshan API first
    try {
      const reverseUrl = `${config.NESHAN_BASE_URL}/v1/reverse?lat=${lat}&lng=${lng}`;
      const response = await axios.get(reverseUrl, {
        headers: {
          "Api-Key": config.NESHAN_SERVICE_API_KEY,
        },
      });

      if (response.data && response.data.formatted_address) {
        return res.json({
          success: true,
          location: {
            name: response.data.formatted_address,
            lat: lat,
            lng: lng,
            address: response.data.formatted_address,
          },
        });
      }
    } catch (neshanError) {
      console.warn(
        "Neshan reverse geocoding failed, trying OpenStreetMap:",
        neshanError.message
      );
    }

    // Fallback to OpenStreetMap Nominatim
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await axios.get(nominatimUrl, {
        headers: {
          "User-Agent": "NeshanRouteOptimizer/1.0",
        },
      });

      if (response.data && response.data.display_name) {
        return res.json({
          success: true,
          location: {
            name: response.data.display_name,
            lat: lat,
            lng: lng,
            address: response.data.display_name,
          },
        });
      }
    } catch (nominatimError) {
      console.warn(
        "OpenStreetMap reverse geocoding also failed:",
        nominatimError.message
      );
    }

    // Final fallback
    res.json({
      success: true,
      location: {
        name: `موقعیت فعلی (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        lat: lat,
        lng: lng,
        address: `موقعیت فعلی (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      },
    });
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    res.status(500).json({ error: "خطا در پیدا کردن آدرس" });
  }
});

// Get route between two points using Neshan Direction API
app.post("/api/get-route", async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (
      !origin ||
      !destination ||
      !origin.lat ||
      !origin.lng ||
      !destination.lat ||
      !destination.lng
    ) {
      return res.status(400).json({ error: "مبدا و مقصد الزامی است" });
    }

    try {
      // Use Neshan Direction API v4 with traffic optimization
      // Based on: https://platform.neshan.org/api/direction/
      let directionUrl = `${config.NESHAN_BASE_URL}/v4/direction?type=car&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
      
      // اضافه کردن پارامترهای ترافیک (فقط اگر ترافیک فعال باشد)
      if (config.ENABLE_TRAFFIC) {
        directionUrl += `&avoid_traffic=${config.AVOID_TRAFFIC}`;
        directionUrl += `&routing_type=${config.ROUTING_TYPE}`;
        console.log("🚦 Using traffic-aware routing");
      } else {
        console.log("📍 Using standard routing (traffic disabled)");
      }

      console.log("Calling Neshan Direction API:", directionUrl);

      const response = await axios.get(directionUrl, {
        headers: {
          "Api-Key": config.NESHAN_SERVICE_API_KEY,
        },
      });

      console.log("Neshan API Response:", response.data ? "Success" : "Failed");

      if (
        response.data &&
        response.data.routes &&
        response.data.routes.length > 0
      ) {
        const route = response.data.routes[0];

        // Extract coordinates from the route
        let coordinates = [];

        // Method 1: Try to use overview_polyline first (faster and simpler)
        if (route.overview_polyline && route.overview_polyline.points) {
          coordinates = decodePolyline(route.overview_polyline.points);
        }
        // Method 2: Fallback to steps polylines
        else if (route.legs && route.legs.length > 0) {
          route.legs.forEach((leg) => {
            if (leg.steps && leg.steps.length > 0) {
              leg.steps.forEach((step) => {
                if (step.polyline) {
                  const decodedPoints = decodePolyline(step.polyline);
                  coordinates.push(...decodedPoints);
                } else if (step.encoded_polyline) {
                  const decodedPoints = decodePolyline(step.encoded_polyline);
                  coordinates.push(...decodedPoints);
                }
              });
            }
          });
        }

        // Get distance and duration from legs
        let totalDistance = 0;
        let totalDuration = 0;
        if (route.legs && route.legs.length > 0) {
          route.legs.forEach((leg) => {
            if (leg.distance && leg.distance.value) {
              totalDistance += leg.distance.value;
            }
            if (leg.duration && leg.duration.value) {
              totalDuration += leg.duration.value;
            }
          });
        }

        // If we have coordinates, return them
        if (coordinates.length > 0) {
          console.log(`✅ Route found with ${coordinates.length} points`);
          return res.json({
            success: true,
            route: coordinates,
            distance: totalDistance / 1000, // Convert meters to kilometers
            duration: totalDuration, // Duration in seconds
          });
        }
      }
    } catch (neshanError) {
      console.warn(
        "Neshan Direction API failed:",
        neshanError.response && neshanError.response.status,
        (neshanError.response && neshanError.response.data) ||
          neshanError.message
      );
    }

    // Fallback: return straight line
    console.log("⚠️ Falling back to straight line");
    res.json({
      success: true,
      route: [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ],
      distance: calculateDistance(origin, destination),
      duration: 0,
    });
  } catch (error) {
    console.error("Get route error:", error);
    res.status(500).json({ error: "خطا در دریافت مسیر" });
  }
});

// Decode polyline (Google's polyline encoding format)
function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

// Route optimization API endpoint with traffic consideration
app.post("/api/optimize-route", async (req, res) => {
  try {
    const { locations, routingType, trafficEnabled } = req.body;

    if (!locations || locations.length < 2) {
      return res
        .status(400)
        .json({ error: "حداقل 2 لوکیشن برای بهینه‌سازی مسیر نیاز است" });
    }

    // تنظیمات موقت برای این درخواست
    const tempConfig = {
      ...config,
      ENABLE_TRAFFIC: trafficEnabled !== undefined ? trafficEnabled : config.ENABLE_TRAFFIC,
      ROUTING_TYPE: routingType || config.ROUTING_TYPE
    };

    console.log(`🚦 Route optimization request: Traffic=${tempConfig.ENABLE_TRAFFIC}, Type=${tempConfig.ROUTING_TYPE}`);

    // اگر ترافیک فعال است، از الگوریتم پیشرفته استفاده کن
    if (tempConfig.ENABLE_TRAFFIC && locations.length <= 8) {
      const optimizedOrder = await solveTSPWithTraffic(locations, tempConfig);
      
      // محاسبه زمان و مسافت کل با در نظر گیری ترافیک
      const routeStats = await calculateRouteStatsWithTraffic(optimizedOrder, tempConfig);
      
      res.json({
        success: true,
        optimizedRoute: optimizedOrder,
        totalDistance: routeStats.totalDistance,
        totalDuration: routeStats.totalDuration,
        totalStops: optimizedOrder.length,
        trafficOptimized: true,
        routingType: tempConfig.ROUTING_TYPE,
      });
    } else {
      // برای تعداد زیاد لوکیشن یا زمانی که ترافیک غیرفعال است، از الگوریتم ساده استفاده کن
      const optimizedOrder = solveTSP(locations);

      // Calculate total distance
      let totalDistance = 0;
      for (let i = 0; i < optimizedOrder.length - 1; i++) {
        totalDistance += calculateDistance(
          optimizedOrder[i],
          optimizedOrder[i + 1]
        );
      }

      res.json({
        success: true,
        optimizedRoute: optimizedOrder,
        totalDistance: totalDistance,
        totalStops: optimizedOrder.length,
        trafficOptimized: false,
      });
    }
  } catch (error) {
    console.error("Route optimization error:", error);
    res.status(500).json({ error: "خطا در بهینه‌سازی مسیر" });
  }
});

// TSP solver using nearest neighbor algorithm
function solveTSP(locations) {
  if (locations.length <= 2) return locations;

  const visited = new Set();
  const result = [];

  // Find current location (origin) if exists, otherwise use first location
  let startLocation =
    locations.find((loc) => loc.isCurrentLocation === true) || locations[0];

  console.log("🔍 TSP Debug:");
  console.log(
    "All locations:",
    locations.map((l) => ({
      name: l.name,
      isCurrentLocation: l.isCurrentLocation,
    }))
  );
  console.log("Start location:", {
    name: startLocation.name,
    isCurrentLocation: startLocation.isCurrentLocation,
  });

  // Start with current location (origin)
  let current = startLocation;
  result.push(current);
  visited.add(current.id);

  // Find nearest unvisited location iteratively
  while (visited.size < locations.length) {
    let nearest = null;
    let minDistance = Infinity;

    for (const location of locations) {
      if (!visited.has(location.id)) {
        const distance = calculateDistance(current, location);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = location;
        }
      }
    }

    if (nearest) {
      result.push(nearest);
      visited.add(nearest.id);
      current = nearest;
    }
  }

  console.log(
    "Optimized route:",
    result.map((l) => l.name)
  );

  return result;
}

// TSP solver with traffic consideration
async function solveTSPWithTraffic(locations, tempConfig = config) {
  if (locations.length <= 2) return locations;

  console.log("🚦 Solving TSP with traffic optimization...");
  
  // محاسبه ماتریس هزینه با در نظر گیری ترافیک
  const costMatrix = await calculateTrafficCostMatrix(locations, tempConfig);
  
  // استفاده از الگوریتم nearest neighbor با ماتریس هزینه ترافیک
  const visited = new Set();
  const result = [];

  // پیدا کردن مبدا (موقعیت فعلی یا اولین لوکیشن)
  let startLocation = locations.find((loc) => loc.isCurrentLocation === true) || locations[0];
  
  let current = startLocation;
  result.push(current);
  visited.add(current.id);

  // پیدا کردن نزدیک‌ترین لوکیشن غیر بازدید شده بر اساس هزینه ترافیک
  while (visited.size < locations.length) {
    let nearest = null;
    let minCost = Infinity;

    for (const location of locations) {
      if (!visited.has(location.id)) {
        const cost = costMatrix[current.id][location.id];
        if (cost < minCost) {
          minCost = cost;
          nearest = location;
        }
      }
    }

    if (nearest) {
      result.push(nearest);
      visited.add(nearest.id);
      current = nearest;
    }
  }

  console.log("✅ TSP with traffic optimization completed");
  return result;
}

// محاسبه ماتریس هزینه با در نظر گیری ترافیک
async function calculateTrafficCostMatrix(locations, tempConfig = config) {
  const matrix = {};
  
  for (let i = 0; i < locations.length; i++) {
    matrix[locations[i].id] = {};
    
    for (let j = 0; j < locations.length; j++) {
      if (i === j) {
        matrix[locations[i].id][locations[j].id] = 0;
      } else {
        try {
          // دریافت اطلاعات مسیر با ترافیک از Neshan API
          const routeData = await getRouteWithTraffic(locations[i], locations[j], tempConfig);
          
          // محاسبه هزینه بر اساس نوع مسیریابی
          let cost;
          if (tempConfig.ROUTING_TYPE === 'fastest') {
            // برای سریع‌ترین مسیر، زمان مهم‌تر است
            cost = routeData.duration * tempConfig.TRAFFIC_WEIGHT + routeData.distance;
          } else {
            // برای کوتاه‌ترین مسیر، فاصله مهم‌تر است
            cost = routeData.distance * tempConfig.TRAFFIC_WEIGHT + routeData.duration;
          }
          
          matrix[locations[i].id][locations[j].id] = cost;
        } catch (error) {
          console.warn(`خطا در محاسبه هزینه بین ${locations[i].name} و ${locations[j].name}:`, error.message);
          // fallback به محاسبه فاصله مستقیم
          matrix[locations[i].id][locations[j].id] = calculateDistance(locations[i], locations[j]) * 10;
        }
      }
    }
  }
  
  return matrix;
}

// دریافت اطلاعات مسیر با ترافیک
async function getRouteWithTraffic(origin, destination, tempConfig = config) {
  try {
    let directionUrl = `${tempConfig.NESHAN_BASE_URL}/v4/direction?type=car&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
    
    if (tempConfig.ENABLE_TRAFFIC) {
      directionUrl += `&avoid_traffic=${tempConfig.AVOID_TRAFFIC}`;
      directionUrl += `&routing_type=${tempConfig.ROUTING_TYPE}`;
    }

    const response = await axios.get(directionUrl, {
      headers: {
        "Api-Key": config.NESHAN_SERVICE_API_KEY,
      },
    });

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      
      let totalDistance = 0;
      let totalDuration = 0;
      
      if (route.legs && route.legs.length > 0) {
        route.legs.forEach((leg) => {
          if (leg.distance && leg.distance.value) {
            totalDistance += leg.distance.value;
          }
          if (leg.duration && leg.duration.value) {
            totalDuration += leg.duration.value;
          }
        });
      }

      return {
        distance: totalDistance / 1000, // تبدیل به کیلومتر
        duration: totalDuration, // زمان بر حسب ثانیه
      };
    }
  } catch (error) {
    console.warn("خطا در دریافت مسیر با ترافیک:", error.message);
  }
  
  // fallback به محاسبه فاصله مستقیم
  const distance = calculateDistance(origin, destination);
  return {
    distance: distance,
    duration: distance * 60, // فرض: 60 ثانیه به ازای هر کیلومتر
  };
}

// محاسبه آمار مسیر با در نظر گیری ترافیک
async function calculateRouteStatsWithTraffic(optimizedOrder, tempConfig = config) {
  let totalDistance = 0;
  let totalDuration = 0;

  for (let i = 0; i < optimizedOrder.length - 1; i++) {
    const routeData = await getRouteWithTraffic(optimizedOrder[i], optimizedOrder[i + 1], tempConfig);
    totalDistance += routeData.distance;
    totalDuration += routeData.duration;
  }

  return {
    totalDistance: totalDistance,
    totalDuration: totalDuration,
  };
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Start server
app.listen(config.PORT, () => {
  console.log(`🚀 سرور در پورت ${config.PORT} در حال اجرا است`);
  console.log(`🌐 آدرس: http://localhost:${config.PORT}`);
});
