import app from './app.js';
import { initDb, pool } from './db.js';

const PORT = process.env.PORT || 5000;
let server;

// Centralized env validation
const REQUIRED_ENV = ['JWT_SECRET', 'ENCRYPTION_KEY', 'DATABASE_URL'];
const OPTIONAL_ENV = ['REFRESH_JWT_SECRET', 'CORS_ORIGINS', 'RESEND_API_KEY', 'LINE_CHANNEL_SECRET', 'LINE_CHANNEL_ACCESS_TOKEN', 'FB_APP_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];

function validateEnv() {
  const missing = [];
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) missing.push(key);
  }
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    if (process.env.NODE_ENV === 'production') {
      console.error('Cannot start in production mode without required environment variables.');
      process.exit(1);
    }
  }
  const empty = [];
  for (const key of OPTIONAL_ENV) {
    if (!process.env[key]) empty.push(key);
  }
  if (empty.length > 0) {
    console.warn(`Unset optional environment variables: ${empty.join(', ')}`);
  }
}

validateEnv();

async function startServer() {
  try {
    await initDb();
    server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      pool.end().then(() => {
        console.log('Database pool closed.');
        process.exit(0);
      }).catch((err) => {
        console.error('Error closing database pool:', err);
        process.exit(1);
      });
    });
  } else {
    process.exit(0);
  }
  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
