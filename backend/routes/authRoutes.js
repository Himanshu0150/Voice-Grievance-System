const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { registerValidation, sendOtpValidation, verifyOtpValidation, adminLoginValidation, adminPasswordResetValidation } = require('../middleware/validation');

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 15 minutes.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', registerValidation, authController.register);
router.post('/send-otp', otpLimiter, sendOtpValidation, authController.sendOtp);
router.post('/verify-otp', verifyOtpValidation, authController.verifyOtp);
router.post('/admin/login', adminLoginValidation, authController.loginAdmin);
router.get('/me', authenticate, authController.getProfile);
router.post('/logout', authenticate, authController.logout);
router.get('/login-history', authenticate, authController.getLoginHistory);
router.put('/admin/reset-password/:id', authenticate, authorizeAdmin, adminPasswordResetValidation, authController.adminResetPassword);

module.exports = router;
