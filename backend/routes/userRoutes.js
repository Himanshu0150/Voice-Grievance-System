const router = require('express').Router();
const userController = require('../controllers/userController');
const { authenticate, authorizeUser } = require('../middleware/auth');
const { feedbackValidation, profileUpdateValidation } = require('../middleware/validation');
const { uploadImages } = require('../config/multer');

router.get('/profile', authenticate, authorizeUser, userController.getProfile);
router.put('/profile', authenticate, authorizeUser, profileUpdateValidation, userController.updateProfile);
router.post('/profile/image', authenticate, authorizeUser, uploadImages.single('profileImage'), userController.uploadProfileImage);
router.get('/dashboard', authenticate, authorizeUser, userController.dashboard);
router.post('/feedback', authenticate, authorizeUser, feedbackValidation, userController.submitFeedback);
router.get('/feedback', authenticate, authorizeUser, userController.getFeedback);

module.exports = router;
