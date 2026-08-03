require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const attendanceRoutes = require('./routes/attendanceRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/college_tracker';

// Middleware - Allow CORS for any origin
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/attendance', attendanceRoutes);
app.use('/api/auth', authRoutes);

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'College Tracker Backend API is running',
    timestamp: new Date().toISOString(),
    mongoConnected: mongoose.connection.readyState === 1,
  });
});

// Detailed MongoDB connection logging
console.log(`[MONGO LOG] Attempting to connect to MONGO_URI: ${MONGO_URI.replace(/:([^@]+)@/, ':****@')}`);

mongoose.connection.on('connected', () => {
  console.log('✅ [MONGO CONFIRMED] Successfully connected to MongoDB Database.');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ [MONGO ERROR EVENT] MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ [MONGO DISCONNECTED] MongoDB connection disconnected.');
});

mongoose
  .connect(MONGO_URI, { dbName: 'college_tracker' })
  .then(() => {
    console.log(`✅ [MONGO INIT] Mongoose connected successfully to database '${mongoose.connection.name}'. ReadyState: ${mongoose.connection.readyState}`);
  })
  .catch((error) => {
    console.error('❌ [MONGO INIT ERROR] MongoDB connection failure:', error.name, error.message, error.stack);
  });

// Export app and optionally listen if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;
