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

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
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
app.use('/api/v1/chat', require('./routes/chatRoutes'));

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
      startScheduledJobs();
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

const ESCALATION_CHECK_INTERVAL = 6 * 60 * 60 * 1000;

function startScheduledJobs() {
  const escalationService = require('./services/escalationService');
  escalationService.runAutoEscalation().catch(err => {
    logger.error('[SCHEDULER] Initial escalation check failed', err);
  });
  const interval = setInterval(() => {
    escalationService.runAutoEscalation().catch(err => {
      logger.error('[SCHEDULER] Auto escalation failed', err);
    });
  }, ESCALATION_CHECK_INTERVAL);
  interval.unref();
  logger.info('[SCHEDULER] Auto-escalation job scheduled (every 6 hours)');
}

startServer();
