const fs = require('fs');
const path = require('path');

const logDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

function writeToFile(level, message) {
  const date = new Date().toISOString().split('T')[0];
  const filePath = path.join(logDir, `${date}.log`);
  fs.appendFileSync(filePath, message + '\n');
}

const logger = {
  error(message, meta) {
    if (levels.error <= levels[currentLevel]) {
      const msg = formatMessage('error', message, meta);
      console.error(msg);
      writeToFile('error', msg);
    }
  },
  warn(message, meta) {
    if (levels.warn <= levels[currentLevel]) {
      const msg = formatMessage('warn', message, meta);
      console.warn(msg);
      writeToFile('warn', msg);
    }
  },
  info(message, meta) {
    if (levels.info <= levels[currentLevel]) {
      const msg = formatMessage('info', message, meta);
      console.log(msg);
      writeToFile('info', msg);
    }
  },
  debug(message, meta) {
    if (levels.debug <= levels[currentLevel]) {
      const msg = formatMessage('debug', message, meta);
      console.log(msg);
    }
  }
};

module.exports = logger;
