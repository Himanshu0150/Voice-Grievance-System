const db = require('../config/database');

const Notification = {
  create(data) {
    db.run('INSERT INTO notifications (userId, title, message, type) VALUES (?, ?, ?, ?)',
      [data.userId || null, data.title || null, data.message, data.type || 'info']
    );
    const id = db.lastInsertId();
    db.saveDatabase();

    if (db.getDatabase()) {
      const row = db.get('SELECT * FROM notifications WHERE id = ?', [id]);
      return row;
    }
    return null;
  },

  findById(id) {
    return db.get('SELECT * FROM notifications WHERE id = ?', [id]);
  },

  findByUser(userId, params = {}) {
    const binds = [userId];
    let sql = 'SELECT * FROM notifications WHERE (userId = ? OR userId IS NULL)';
    sql += ' ORDER BY createdAt DESC';
    if (params.limit) { sql += ' LIMIT ?'; binds.push(params.limit); }
    if (params.offset) { sql += ' OFFSET ?'; binds.push(params.offset); }

    const total = db.count('SELECT COUNT(*) as count FROM notifications WHERE (userId = ? OR userId IS NULL)', [userId]);
    return { notifications: db.all(sql, binds), total };
  },

  markRead(id) {
    db.run('UPDATE notifications SET isRead = 1 WHERE id = ?', [id]);
    db.saveDatabase();
    return this.findById(id);
  },

  markAllRead(userId) {
    db.run('UPDATE notifications SET isRead = 1 WHERE (userId = ? OR userId IS NULL) AND isRead = 0', [userId]);
    db.saveDatabase();
  },

  getUnreadCount(userId) {
    return db.count('SELECT COUNT(*) as count FROM notifications WHERE (userId = ? OR userId IS NULL) AND isRead = 0', [userId]);
  }
};

module.exports = Notification;
