require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initializeDatabase } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const logger = require('./utils/logger');
const aiProvider = require('./services/aiProvider');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

app.get('/api/v1/health', (req, res) => {
  const aiStatus = aiProvider.getStatus();
  res.json({
    success: true,
    message: 'Server is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      ai: aiStatus
    }
  });
});

app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/complaints', require('./routes/complaintRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));
app.use('/api/v1/notifications', require('./routes/notificationRoutes'));
app.use('/api/v1/upload', require('./routes/uploadRoutes'));
app.use('/api/v1/feedback', require('./routes/feedbackRoutes'));

app.use(notFoundHandler);
app.use(errorHandler);

function logAIBanner(status) {
  const line = '='.repeat(50);
  logger.info(line);
  logger.info('AI PROVIDER STATUS');
  logger.info(line);
  logger.info(`AI Provider : ${status.provider.toUpperCase()}`);
  logger.info(`Connected   : ${status.connected ? 'Yes' : 'No'}`);
  logger.info(`Translation : ${status.translationEnabled ? 'Enabled' : 'Disabled'}`);
  logger.info(`Classification : ${status.classificationEnabled ? 'Enabled' : 'Disabled'}`);
  logger.info(line);
}

async function startServer() {
  try {
    await initializeDatabase();

    if (aiProvider.isConfigured()) {
      logger.info('[AI] Verifying AI provider connection...');
      await aiProvider.verifyConnection();
    } else {
      logger.warn('[AI] No API key configured - AI features will use development fallback');
    }

    logAIBanner(aiProvider.getStatus());

    const server = app.listen(PORT);
    server.on('error', (err) => {
      logger.error('Failed to start server', err);
      setTimeout(() => process.exit(1), 100);
    });
    server.on('listening', () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/api/v1/health`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

startServer();
