const response = require('../utils/responseHelper');

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
  }
};

module.exports = uploadController;
