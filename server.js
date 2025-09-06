const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// =============================================
// MIDDLEWARE SETUP
// =============================================
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// =============================================
// DATABASE CONNECTION
// =============================================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// =============================================
// ROUTES IMPORT
// =============================================
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// =============================================
// BASIC ROUTES
// =============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: '🛍️ Welcome to E-commerce API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      products: '/api/products',
      users: '/api/users',
      orders: '/api/orders',
      analytics: '/api/analytics/dashboard'
    }
  });
});

// =============================================
// API ROUTES
// =============================================
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);

// =============================================
// ERROR HANDLING
// =============================================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: {
      'GET /': 'API information',
      'GET /health': 'Health check',
      'GET /api/products': 'List products',
      'POST /api/products': 'Create product',
      'GET /api/products/:id': 'Get product by ID',
      'GET /api/users': 'List users',
      'POST /api/users': 'Create user',
      'GET /api/orders': 'List orders',
      'POST /api/orders': 'Create order',
      'GET /api/analytics/dashboard': 'Analytics dashboard'
    }
  });
});

app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// =============================================
// SERVER STARTUP
// =============================================
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🛍️ Products: http://localhost:${PORT}/api/products`);
    console.log(`👥 Users: http://localhost:${PORT}/api/users`);
    console.log(`📦 Orders: http://localhost:${PORT}/api/orders`);
    console.log(`📈 Analytics: http://localhost:${PORT}/api/analytics/dashboard`);
  });
};

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

startServer().catch(console.error);

module.exports = app;