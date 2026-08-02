const Notification = require('../models/Notification');
const { getPaginationParams } = require('../utils/paginationHelper');
const translationService = require('./translationService');
const aiProvider = require('./aiProvider');

const translationCache = new Map();
const CACHE_MAX = 300;

async function localizeNotification(notification, langCode) {
  if (!notification) return notification;
  const key = `${notification.id}:${langCode}`;
  if (translationCache.has(key)) {
    const cached = translationCache.get(key);
    notification.title = cached.title;
    notification.message = cached.message;
    return notification;
  }
  const [title, message] = await Promise.all([
    translationService.translateText(notification.title || '', langCode),
    translationService.translateText(notification.message || '', langCode)
  ]);
  notification.title = title || notification.title;
  notification.message = message || notification.message;
  translationCache.set(key, { title: notification.title, message: notification.message });
  if (translationCache.size > CACHE_MAX) {
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
  return notification;
}

const notificationService = {
  async getByUser(userId, query) {
    const { page, limit, offset } = getPaginationParams(query);
    const result = Notification.findByUser(userId, { limit, offset });
    let notifications = result.notifications;
    const langCode = translationService.getLanguageCode(query.lang);
    if (langCode && langCode !== 'en' && aiProvider.isConfigured() && notifications.length > 0) {
      notifications = await Promise.all(notifications.map(n => localizeNotification(n, langCode)));
    }
    return {
      notifications,
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
    if (notification.userId && notification.userId !== userId) {
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
    return Notification.create({ userId, type, message });
  }
};

module.exports = notificationService;
