// Configuration file for Neshan Route Optimizer
require("dotenv").config();

module.exports = {
  NESHAN_API_KEY:
    process.env.NESHAN_API_KEY || "web.89a6be71092e4dc1925b0f47e926e894",
  PORT: process.env.PORT || 3000,
  NESHAN_BASE_URL: process.env.NESHAN_BASE_URL || "https://api.neshan.org/v1",
};
