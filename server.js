const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { initializeDatabase } = require('./database');
const contactRoutes = require('./routes/contact');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'application/xml' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Serve static files from assets directory
app.use('/drupal-coder/assets', express.static(path.join(__dirname, 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// API Routes
app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the main HTML file for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера',
    details: err.message
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database tables
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API endpoints:`);
      console.log(`  POST /api/contact/submit - Submit contact form`);
      console.log(`  GET  /api/contact/submissions - Get user submissions`);
      console.log(`  PUT  /api/contact/submissions/:id - Update submission`);
      console.log(`  DELETE /api/contact/submissions/:id - Delete submission`);
      console.log(`  POST /api/auth/login - Login`);
      console.log(`  POST /api/auth/logout - Logout`);
      console.log(`  GET  /api/auth/me - Get current user`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
