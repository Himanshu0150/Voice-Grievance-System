const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const authService = require('../services/authService');
const response = require('../utils/responseHelper');

const userController = {
  getProfile(req, res, next) {
    try {
      const user = User.findById(req.user.id);
      if (!user) return response.notFound(res, 'User not found');
      const { password, ...userData } = user;
      return response.success(res, userData);
    } catch (err) {
      next(err);
    }
  },

  updateProfile(req, res, next) {
    try {
      const { fullName, phone, village, taluka, district, state, pincode } = req.body;
      const updated = User.update(req.user.id, { fullName, phone, village, taluka, district, state, pincode });
      if (!updated) return response.notFound(res, 'User not found');
      return response.success(res, updated, 'Profile updated');
    } catch (err) {
      next(err);
    }
  },

  uploadProfileImage(req, res, next) {
    try {
      if (!req.file) return response.badRequest(res, 'No image uploaded');
      const imagePath = `/uploads/images/${req.file.filename}`;
      const updated = User.update(req.user.id, { profileImage: imagePath });
      return response.success(res, updated, 'Profile image updated');
    } catch (err) {
      next(err);
    }
  },

  dashboard(req, res, next) {
    try {
      const stats = Complaint.getStatsByUser(req.user.id);
      const latestComplaints = Complaint.findAll({ userId: req.user.id, limit: 5 });
      const unreadNotifications = Notification.getUnreadCount(req.user.id);
      return response.success(res, {
        stats,
        latestComplaints: latestComplaints.complaints,
        unreadNotifications
      });
    } catch (err) {
      next(err);
    }
  },

  submitFeedback(req, res, next) {
    try {
      const feedback = Feedback.create({
        userId: req.user.id,
        rating: req.body.rating,
        comment: req.body.comment || null
      });
      return response.created(res, feedback, 'Feedback submitted');
    } catch (err) {
      next(err);
    }
  },

  getFeedback(req, res, next) {
    try {
      const result = Feedback.findAll({ userId: req.user.id });
      return response.success(res, result);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = userController;
