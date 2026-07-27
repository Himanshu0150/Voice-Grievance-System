const db = require('../config/database');

const LoginHistory = {
  create(data) {
    db.run('INSERT INTO login_history (userId, ipAddress, userAgent) VALUES (?, ?, ?)',
      [data.userId, data.ipAddress || null, data.userAgent || null]
    );
    db.saveDatabase();
  },

  findByUser(userId, limit = 10) {
    return db.all('SELECT * FROM login_history WHERE userId = ? ORDER BY loginTime DESC LIMIT ?', [userId, limit]);
  },

  updateLogout(userId) {
    const latest = db.get('SELECT id FROM login_history WHERE userId = ? AND logoutTime IS NULL ORDER BY loginTime DESC LIMIT 1', [userId]);
    if (latest) {
      db.run("UPDATE login_history SET logoutTime = datetime('now','localtime') WHERE id = ?", [latest.id]);
      db.saveDatabase();
    }
  }
};

module.exports = LoginHistory;
