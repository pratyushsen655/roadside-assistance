const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db');
const socketHandler = require('./sockets/socketHandler');
const errorHandler = require('./middleware/errorMiddleware');
const securityHeaders = require('./middleware/securityHeaders');
const rateLimiter = require('./middleware/rateLimiter');
const apiKeyRotation = require('./middleware/apiKeyRotation');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const mongoose = require('mongoose');

// Load configurations
dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();
const server = http.createServer(app);

// Configure Socket.io
const io = socketio(server, {
  cors: {
    origin: '*', // Allow all origins for dev mobility. Lock down in production.
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization'],
    credentials: true
  }
});

// Initialize Socket.io Connection Handlers
socketHandler.initSocketServer(io);

// Global Middleware
// CORS configuration with whitelist for production
app.use(cors({ origin: '*', credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] }));

// Security middlewares
app.use(securityHeaders);
app.use(rateLimiter);
app.use(mongoSanitize());
app.use(xssClean());
app.use(apiKeyRotation);

// Body parsers with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Log incoming REST requests in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[REST Request] ${req.method} ${req.path}`);
    next();
  });
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    port: process.env.PORT,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// Import API Routers
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const mechanicRoutes = require('./routes/mechanicRoutes');
const requestRoutes = require('./routes/requestRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Mount API Routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all route handler for 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Centralized Error Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const serverInstance = server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`[API Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[Realtime WSS] Listening for WebSockets connections`);
  console.log(`==================================================\n`);
});

serverInstance.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[CRITICAL] Port ${PORT} is already in use. Run: taskkill /IM node.exe /F then restart`);
    process.exit(1);
  } else {
    console.error('[CRITICAL] Server error:', err);
    process.exit(1);
  }
});

// Graceful shutdown handling
function gracefulShutdown() {
  console.log('[API Server] Shutting down gracefully...');
  // Stop accepting new connections
  serverInstance.close(() => {
    console.log('[API Server] HTTP server closed.');
    // Close Socket.io
    if (io) io.close();
    // Close MongoDB connection
    mongoose.connection.close(false, () => {
      console.log('[API Server] MongoDB connection closed.');
      process.exit(0);
    });
  });
}

// Handle process termination signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle unexpected errors
process.on('unhandledRejection', (err) => {
  console.error(`[CRITICAL] Unhandled Rejection: ${err.message}`);
  gracefulShutdown();
});

process.on('uncaughtException', (err) => {
  console.error(`[CRITICAL] Uncaught Exception: ${err.message}`);
  gracefulShutdown();
});
