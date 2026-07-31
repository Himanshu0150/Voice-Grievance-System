const { body, query, param, validationResult } = require('express-validator');

function ts() {
  return new Date().toISOString();
}

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
      timestamp: ts()
    });
  }
  next();
};

const passwordRules = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a special character')
];

const registerValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit mobile number'),
  body('village').trim().notEmpty().withMessage('Village is required'),
  handleValidationErrors
];

const sendOtpValidation = [
  body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit mobile number required'),
  handleValidationErrors
];

const verifyOtpValidation = [
  body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit mobile number required'),
  body('otp').trim().matches(/^\d{6}$/).withMessage('Valid 6-digit OTP required'),
  handleValidationErrors
];

const complaintValidation = [
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('address').optional().trim(),
  body('voiceTranscript').optional().trim(),
  handleValidationErrors
];

const complaintEditValidation = [
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().trim(),
  body('address').optional().trim(),
  body('latitude').optional({ values: 'null' }).isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional({ values: 'null' }).isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  handleValidationErrors
];

const statusUpdateValidation = [
  body('status').trim().isIn(['Pending', 'Assigned', 'Accepted', 'Work Started', 'Inspection', 'In Progress', 'Resolved', 'Rejected']).withMessage('Invalid status'),
  handleValidationErrors
];

const feedbackValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  handleValidationErrors
];

const passwordChangeValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('New password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('New password must contain a number')
    .matches(/[^A-Za-z0-9]/).withMessage('New password must contain a special character'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) throw new Error('Passwords do not match');
    return true;
  }),
  handleValidationErrors
];

const adminLoginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').trim().notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const adminPasswordResetValidation = [
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a special character'),
  handleValidationErrors
];

const profileUpdateValidation = [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('phone').optional().trim().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit phone number required'),
  body('village').optional().trim(),
  body('taluka').optional().trim(),
  body('district').optional().trim(),
  body('state').optional().trim(),
  body('pincode').optional().trim().matches(/^\d{6}$/).withMessage('Valid 6-digit pincode required'),
  handleValidationErrors
];

const departmentValidation = [
  body('departmentName').trim().notEmpty().withMessage('Department name is required'),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  sendOtpValidation,
  verifyOtpValidation,
  adminLoginValidation,
  complaintValidation,
  complaintEditValidation,
  statusUpdateValidation,
  feedbackValidation,
  passwordChangeValidation,
  adminPasswordResetValidation,
  profileUpdateValidation,
  departmentValidation,
  handleValidationErrors
};
