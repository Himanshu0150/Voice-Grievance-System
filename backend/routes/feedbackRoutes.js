const router = require('express').Router();
const userController = require('../controllers/userController');
const { authenticate, authorizeUser } = require('../middleware/auth');
const { feedbackValidation } = require('../middleware/validation');

router.get('/', authenticate, authorizeUser, userController.getFeedback);
router.post('/', authenticate, authorizeUser, feedbackValidation, userController.submitFeedback);

module.exports = router;
