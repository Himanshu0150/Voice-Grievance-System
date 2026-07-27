const db = require('../config/database');

const Feedback = {
  create(data) {
    db.run('INSERT INTO feedback (userId, rating, comment) VALUES (?, ?, ?)',
      [data.userId, data.rating, data.comment || null]
    );
    const id = db.lastInsertId();
    db.saveDatabase();
    return this.findById(id);
  },

  findById(id) {
    return db.get('SELECT f.*, u.fullName as userName FROM feedback f JOIN users u ON f.userId = u.id WHERE f.id = ?', [id]);
  },

  findAll(params = {}) {
    let sql = 'SELECT f.*, u.fullName as userName FROM feedback f JOIN users u ON f.userId = u.id WHERE 1=1';
    const binds = [];
    const countBinds = [];
    if (params.userId) { sql += ' AND f.userId = ?'; binds.push(params.userId); countBinds.push(params.userId); }
    const total = db.count('SELECT COUNT(*) as count FROM feedback f WHERE 1=1' + (params.userId ? ' AND f.userId = ?' : ''), countBinds);
    sql += ' ORDER BY f.createdAt DESC';
    if (params.limit) { sql += ' LIMIT ?'; binds.push(params.limit); }
    if (params.offset) { sql += ' OFFSET ?'; binds.push(params.offset); }
    return { feedbacks: db.all(sql, binds), total };
  },

  getAverageRating() {
    const result = db.get("SELECT COALESCE(ROUND(AVG(rating), 1), 0) as average, COUNT(*) as total FROM feedback");
    return result || { average: 0, total: 0 };
  }
};

module.exports = Feedback;
