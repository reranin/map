// Configuration file for Neshan Route Optimizer
require("dotenv").config();

module.exports = {
  // Web SDK API Key (for displaying map in browser)
  NESHAN_WEB_API_KEY:
    process.env.NESHAN_WEB_API_KEY || "web.89a6be71092e4dc1925b0f47e926e894",

  // Service API Key (for server-side APIs like routing, search, etc.)
  // You need to get a service.* key from Neshan panel: https://platform.neshan.org/
  // Select "سرویس‌ها" > "مسیریابی" when creating the API key
  NESHAN_SERVICE_API_KEY:
    process.env.NESHAN_SERVICE_API_KEY ||
    "service.d4f0a1418842472d848563aed6228441",

  PORT: process.env.PORT || 3000,
  NESHAN_BASE_URL: process.env.NESHAN_BASE_URL || "https://api.neshan.org",
  
  // Traffic Optimization Settings
  ENABLE_TRAFFIC: process.env.ENABLE_TRAFFIC === 'true' || false, // غیرفعال به دلیل مشکل سرور
  ROUTING_TYPE: process.env.ROUTING_TYPE || 'fastest', // 'fastest' or 'shortest'
  AVOID_TRAFFIC: process.env.AVOID_TRAFFIC === 'true' || true,
  TRAFFIC_WEIGHT: parseFloat(process.env.TRAFFIC_WEIGHT) || 1.5,
};
