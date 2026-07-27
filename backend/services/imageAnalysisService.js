const fs = require('fs');
const path = require('path');
const aiProvider = require('./aiProvider');
const logger = require('../utils/logger');

const DETECTABLE_ISSUES = [
  'broken road', 'garbage', 'water leakage', 'electric pole',
  'street light', 'flooding', 'drain blockage', 'potholes',
  'tree fall', 'animal hazard', 'construction', 'fire'
];

function mapDetectedToCategory(detected) {
  const map = {
    'broken road': 'Road',
    'potholes': 'Road',
    'street light': 'Street Light',
    'electric pole': 'Electricity',
    'garbage': 'Garbage',
    'water leakage': 'Water Supply',
    'drain blockage': 'Drainage',
    'flooding': 'Drainage',
    'tree fall': 'Environment',
    'animal hazard': 'Environment',
    'construction': 'Public Property',
    'fire': 'Environment'
  };
  return map[detected?.toLowerCase()] || null;
}

const imageAnalysisService = {
  async analyzeImages(imagePaths) {
    if (!imagePaths || imagePaths.length === 0) {
      return { results: [], combinedText: '', hasImages: false };
    }

    logger.info(`Analyzing ${imagePaths.length} image(s)`);
    const results = [];

    for (const imagePath of imagePaths) {
      try {
        const fullPath = path.resolve(__dirname, '..', imagePath.replace(/^\//, ''));
        if (!fs.existsSync(fullPath)) {
          logger.warn(`Image not found: ${fullPath}`);
          continue;
        }

        const mimeType = this._getMimeType(imagePath);
        const base64 = fs.readFileSync(fullPath, { encoding: 'base64' });

        const analysis = await aiProvider.analyzeImage(base64, mimeType);
        results.push({
          image: imagePath,
          detected: analysis.detected || 'unknown',
          confidence: analysis.confidence || 0,
          description: analysis.description || ''
        });
      } catch (err) {
        logger.error(`Image analysis failed for ${imagePath}`, err);
        results.push({
          image: imagePath,
          detected: 'error',
          confidence: 0,
          description: 'Analysis failed'
        });
      }
    }

    const combinedText = results
      .filter(r => r.detected && r.detected !== 'unknown' && r.detected !== 'error')
      .map(r => `${r.detected} (confidence: ${(r.confidence * 100).toFixed(0)}%)`)
      .join(', ');

    const imageCategory = results.length > 0 ? mapDetectedToCategory(results[0]?.detected) : null;

    return { results, combinedText, hasImages: results.length > 0, imageCategory };
  },

  _getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return mimeMap[ext] || 'image/jpeg';
  }
};

module.exports = imageAnalysisService;
