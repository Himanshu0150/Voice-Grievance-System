const router = require('express').Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, chatController.ask);

module.exports = router;
