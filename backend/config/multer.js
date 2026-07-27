const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, '../uploads/images'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, '../uploads/audio'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const allowedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/webm', 'audio/ogg', 'video/webm'];

function isImage(mimetype) {
  return allowedImageTypes.includes(mimetype);
}

function isAudio(mimetype) {
  return allowedAudioTypes.includes(mimetype);
}

const imageFileFilter = (req, file, cb) => {
  if (isImage(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image type. Only JPG, JPEG, PNG allowed.'), false);
  }
};

const audioFileFilter = (req, file, cb) => {
  if (isAudio(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid audio type. Only MP3, WAV, WEBM allowed.'), false);
  }
};

const IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const AUDIO_MAX_SIZE = 20 * 1024 * 1024;

const uploadImages = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: IMAGE_MAX_SIZE }
});

const uploadAudio = multer({
  storage: audioStorage,
  fileFilter: audioFileFilter,
  limits: { fileSize: AUDIO_MAX_SIZE }
});

const uploadComplaint = multer({
  storage: imageStorage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      if (isAudio(file.mimetype)) return cb(null, true);
      return cb(new Error('Invalid audio type. Only MP3, WAV, WEBM allowed.'), false);
    }
    if (isImage(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Images: JPG/JPEG/PNG, Audio: MP3/WAV/WEBM.'), false);
  },
  limits: { fileSize: IMAGE_MAX_SIZE }
}).fields([
  { name: 'images', maxCount: 5 },
  { name: 'audio', maxCount: 1 },
  { name: 'resolution_images', maxCount: 5 }
]);

module.exports = { uploadImages, uploadAudio, uploadComplaint };
