const Notification = require('../models/Notification');
const { getPaginationParams } = require('../utils/paginationHelper');

const notificationService = {
  getByUser(userId, query) {
    const { page, limit, offset } = getPaginationParams(query);
    const result = Notification.findByUser(userId, { limit, offset });
    return {
      notifications: result.notifications,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    };
  },

  markRead(id, userId) {
    const notification = Notification.findById(id);
    if (!notification) {
      const err = new Error('Notification not found');
      err.statusCode = 404;
      throw err;
    }
    if (notification.user_id && notification.user_id !== userId) {
      const err = new Error('Not authorized');
      err.statusCode = 403;
      throw err;
    }
    return Notification.markRead(id);
  },

  markAllRead(userId) {
    Notification.markAllRead(userId);
    return { message: 'All notifications marked as read' };
  },

  getUnreadCount(userId) {
    return { count: Notification.getUnreadCount(userId) };
  },

  create(userId, type, message) {
    return Notification.create({ user_id: userId, type, message });
  }
};

module.exports = notificationService;
