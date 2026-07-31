const response = require('../utils/responseHelper');
const imageHashService = require('../services/imageHashService');
const logger = require('../utils/logger');

const uploadController = {
  uploadImage(req, res, next) {
    try {
      if (!req.file) return response.badRequest(res, 'No image uploaded');
      return response.success(res, {
        filename: req.file.filename,
        path: `/uploads/images/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype
      }, 'Image uploaded successfully');
    } catch (err) {
      next(err);
    }
  },

  uploadAudio(req, res, next) {
    try {
      if (!req.file) return response.badRequest(res, 'No audio file uploaded');
      return response.success(res, {
        filename: req.file.filename,
        path: `/uploads/audio/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype
      }, 'Audio uploaded successfully');
    } catch (err) {
      next(err);
    }
  },

  async checkDuplicateImage(req, res, next) {
    try {
      if (!req.file) return response.badRequest(res, 'No image uploaded');
      const fullPath = require('path').resolve(__dirname, '..', 'uploads', 'images', req.file.filename);
      const hash = await imageHashService.computePhash(fullPath);
      if (!hash) {
        return response.success(res, { isDuplicate: false, message: 'Could not compute image hash' });
      }
      const duplicates = imageHashService.findDuplicates(hash);
      const isDuplicate = duplicates.length > 0;
      imageHashService.storeHash(hash, `/uploads/images/${req.file.filename}`);
      return response.success(res, {
        isDuplicate,
        duplicateCount: duplicates.length,
        duplicates: duplicates.slice(0, 3),
        hash
      }, isDuplicate ? 'Duplicate image detected' : 'Image is unique');
    } catch (err) {
      logger.error('[UPLOAD] Duplicate check failed:', err);
      next(err);
    }
  }
};

module.exports = uploadController;

