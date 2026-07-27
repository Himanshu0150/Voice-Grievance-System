const router = require('express').Router();
const uploadController = require('../controllers/uploadController');
const { authenticate, authorizeUser } = require('../middleware/auth');
const { uploadImages, uploadAudio } = require('../config/multer');

router.post('/image', authenticate, authorizeUser, uploadImages.single('image'), uploadController.uploadImage);
router.post('/audio', authenticate, authorizeUser, uploadAudio.single('audio'), uploadController.uploadAudio);

module.exports = router;
