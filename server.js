/**
 * Hostinger Node.js Application Startup File
 * Compatible with Hostinger hPanel Node.js Selector, Passenger, PM2, and Docker.
 */

// Ensure production environment if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

// Require compiled backend code from dist/index.js
const appModule = require("./dist/index.js");

// Export application instance for Passenger/Serverless if needed
module.exports = appModule.default || appModule;
