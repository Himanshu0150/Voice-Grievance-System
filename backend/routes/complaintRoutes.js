const router = require('express').Router();
const complaintController = require('../controllers/complaintController');
const { authenticate, authorizeUser } = require('../middleware/auth');
const { complaintValidation, complaintEditValidation } = require('../middleware/validation');
const { handleUpload } = require('../middleware/upload');

router.get('/stats', authenticate, authorizeUser, complaintController.getStats);
router.get('/heatmap', authenticate, complaintController.getHeatmap);
router.post('/similarity', authenticate, authorizeUser, complaintController.checkSimilarity);
router.post('/:id/support', authenticate, authorizeUser, complaintController.toggleSupport);
router.post('/:id/join', authenticate, authorizeUser, complaintController.joinComplaint);
router.get('/:id/timeline', authenticate, complaintController.getTimeline);
router.get('/', authenticate, authorizeUser, complaintController.getUserComplaints);
router.post('/', authenticate, authorizeUser, handleUpload, complaintValidation, complaintController.create);
router.post('/voice', authenticate, authorizeUser, handleUpload, complaintController.createVoice);
router.get('/:id', authenticate, complaintController.getById);
router.put('/:id', authenticate, authorizeUser, complaintEditValidation, complaintController.update);
router.delete('/:id', authenticate, authorizeUser, complaintController.remove);

module.exports = router;
