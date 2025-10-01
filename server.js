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
    neshanApiKey: config.NESHAN_API_KEY,
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
      }/search?term=${encodeURIComponent(
        locationName
      )}&lat=35.7219&lng=51.3347&api_key=${config.NESHAN_API_KEY}`;

      const response = await axios.get(geocodingUrl);

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
        neshanError.message
      );
    }

    // Fallback to OpenStreetMap Nominatim
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        locationName + " ایران"
      )}&limit=1`;
      const response = await axios.get(nominatimUrl, {
        headers: {
          "User-Agent": "NeshanRouteOptimizer/1.0",
        },
      });

      if (response.data && response.data.length > 0) {
        const location = response.data[0];
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
      const reverseUrl = `${config.NESHAN_BASE_URL}/reverse?lat=${lat}&lng=${lng}&api_key=${config.NESHAN_API_KEY}`;
      const response = await axios.get(reverseUrl);

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
      // Use Neshan Direction API
      const directionUrl = `${config.NESHAN_BASE_URL}/direction?type=car&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&api_key=${config.NESHAN_API_KEY}`;

      const response = await axios.get(directionUrl);

      if (
        response.data &&
        response.data.routes &&
        response.data.routes.length > 0
      ) {
        const route = response.data.routes[0];

        // Extract coordinates from the route
        const coordinates = [];

        if (route.legs && route.legs.length > 0) {
          route.legs.forEach((leg) => {
            if (leg.steps && leg.steps.length > 0) {
              leg.steps.forEach((step) => {
                if (step.polyline) {
                  // Decode polyline
                  const decodedPoints = decodePolyline(step.polyline);
                  coordinates.push(...decodedPoints);
                }
              });
            }
          });
        }

        // If we have coordinates, return them
        if (coordinates.length > 0) {
          return res.json({
            success: true,
            route: coordinates,
            distance: route.overview ? route.overview.distance : 0,
            duration: route.overview ? route.overview.duration : 0,
          });
        }
      }
    } catch (neshanError) {
      console.warn("Neshan Direction API failed:", neshanError.message);
    }

    // Fallback: return straight line
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

// Route optimization API endpoint
app.post("/api/optimize-route", (req, res) => {
  try {
    const { locations } = req.body;

    if (!locations || locations.length < 2) {
      return res
        .status(400)
        .json({ error: "حداقل 2 لوکیشن برای بهینه‌سازی مسیر نیاز است" });
    }

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
    });
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
