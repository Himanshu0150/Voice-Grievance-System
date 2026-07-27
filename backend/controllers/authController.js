const authService = require('../services/authService');
const response = require('../utils/responseHelper');

const authController = {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return response.created(res, result, 'Registration successful');
    } catch (err) {
      next(err);
    }
  },

  async sendOtp(req, res, next) {
    try {
      const result = await authService.sendOtp(req.body.phone, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      return response.success(res, result, 'OTP sent successfully');
    } catch (err) {
      next(err);
    }
  },

  async loginAdmin(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.loginAdmin(email, password, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      return response.success(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  async verifyOtp(req, res, next) {
    try {
      const { phone, otp } = req.body;
      const result = await authService.verifyOtp(phone, otp, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      return response.success(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  async getProfile(req, res, next) {
    try {
      const profile = authService.getProfile(req.user.id);
      return response.success(res, profile);
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      authService.logout(req.user.id);
      return response.success(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      const message = await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
      return response.success(res, null, message);
    } catch (err) {
      next(err);
    }
  },

  async adminResetPassword(req, res, next) {
    try {
      const result = await authService.adminResetPassword(req.params.id, req.body.newPassword);
      return response.success(res, null, result);
    } catch (err) {
      next(err);
    }
  },

  async getLoginHistory(req, res, next) {
    try {
      const history = authService.getLoginHistory(req.user.id);
      return response.success(res, history);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
