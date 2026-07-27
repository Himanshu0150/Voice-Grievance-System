const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const imageUploadService = {
  saveImage(file) {
    if (!file) return null;
    return `/uploads/images/${file.filename}`;
  },

  saveAudio(file) {
    if (!file) return null;
    return `/uploads/audio/${file.filename}`;
  },

  deleteImage(imagePath) {
    if (!imagePath) return;
    const fullPath = path.resolve(__dirname, '..', imagePath.replace(/^\//, ''));
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch {
    }
  },

  getImageUrl(filename) {
    if (!filename) return null;
    if (filename.startsWith('/uploads/')) return filename;
    return `/uploads/images/${filename}`;
  }
};

module.exports = imageUploadService;
