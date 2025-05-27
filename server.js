require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const morgan = require('morgan');
const path = require('path');
const winston = require('winston');
const SpotifyWebApi = require('spotify-web-api-node');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'spotify-migration-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// API Routes
const authRoutes = require('./routes/auth');
const migrationRoutes = require('./routes/migration');
const debugRoutes = require('./routes/debug');
const playlistTracksRoutes = require('./routes/playlist-tracks');
app.use('/api/auth', authRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/migration', playlistTracksRoutes);

// Serve static assets
// Serve files from the client/dist directory
app.use(express.static(path.join(__dirname, 'client/dist')));

// Handle all other routes by serving the index.html
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

console.log('Serving static files from:', path.join(__dirname, 'client/dist'));
console.log('Serving index.html from:', path.join(__dirname, 'client/dist', 'index.html'));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Please close the other application or use a different port.`);
    console.error(`\x1b[31mError: Port ${PORT} is already in use!\x1b[0m`);
    console.log('\x1b[33mPossible solutions:\x1b[0m');
    console.log('1. Close the application that is using port ' + PORT);
    console.log('2. Change the PORT in your .env file');
    console.log('3. Run the server with a different port: PORT=XXXX npm run dev');
  } else {
    logger.error(`Error starting server: ${err.message}`);
    console.error(`\x1b[31mError starting server: ${err.message}\x1b[0m`);
  }
});