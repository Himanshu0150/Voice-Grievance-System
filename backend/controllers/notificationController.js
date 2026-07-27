const notificationService = require('../services/notificationService');
const response = require('../utils/responseHelper');

const notificationController = {
  getAll(req, res, next) {
    try {
      const result = notificationService.getByUser(req.user.id, req.query);
      return response.success(res, result);
    } catch (err) {
      next(err);
    }
  },

  markRead(req, res, next) {
    try {
      const notification = notificationService.markRead(req.params.id, req.user.id);
      return response.success(res, notification, 'Marked as read');
    } catch (err) {
      next(err);
    }
  },

  markAllRead(req, res, next) {
    try {
      const result = notificationService.markAllRead(req.user.id);
      return response.success(res, result);
    } catch (err) {
      next(err);
    }
  },

  getUnreadCount(req, res, next) {
    try {
      const result = notificationService.getUnreadCount(req.user.id);
      return response.success(res, result);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = notificationController;
