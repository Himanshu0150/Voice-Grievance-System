const fs = require('fs');
const path = require('path');

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getFileUrl(filename, subdir = 'images') {
  if (!filename) return null;
  return `/uploads/${subdir}/${filename}`;
}

function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch {
  }
  return false;
}

function getUploadPath(subdir = 'images') {
  return path.resolve(__dirname, '../uploads', subdir);
}

module.exports = { ensureDirectory, getFileUrl, deleteFile, getUploadPath };
