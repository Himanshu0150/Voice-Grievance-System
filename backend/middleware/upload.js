const { uploadComplaint } = require('../config/multer');

function handleUpload(req, res, next) {
  uploadComplaint(req, res, (err) => {
    if (err) {
      return next(err);
    }
    next();
  });
}

module.exports = { handleUpload };
