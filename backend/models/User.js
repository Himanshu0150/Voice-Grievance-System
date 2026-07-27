const db = require('../config/database');

function sanitize(row) {
  if (!row) return null;
  const { password, ...user } = row;
  return user;
}

const User = {
  generateUserId() {
    const result = db.exec('SELECT COUNT(*) as count FROM users');
    const count = result[0]?.values[0][0] || 0;
    const next = (count + 1).toString().padStart(6, '0');
    return `USR-${next}`;
  },

  create(data) {
    const userId = this.generateUserId();
    db.run(`INSERT INTO users (userId, fullName, email, phone, password, role, village, taluka, district, state, pincode, profileImage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, data.fullName, data.email || null, data.phone, data.password || null, 'user',
       data.village || null, data.taluka || null, data.district || null, data.state || null,
       data.pincode || null, data.profileImage || null]
    );
    const id = db.lastInsertId();
    db.saveDatabase();
    return sanitize(this.findById(id));
  },

  findById(id) {
    return db.get('SELECT * FROM users WHERE id = ?', [id]);
  },

  findByEmail(email) {
    return db.get('SELECT * FROM users WHERE email = ?', [email]);
  },

  findByPhone(phone) {
    return db.get('SELECT * FROM users WHERE phone = ?', [phone]);
  },

  findAll(params = {}) {
    let sql = `SELECT u.*, (SELECT COUNT(*) FROM complaints c WHERE c.userId = u.id) as complaintCount
      FROM users u WHERE 1=1`;
    const binds = [];

    if (params.search) {
      sql += ' AND (u.fullName LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const s = `%${params.search}%`;
      binds.push(s, s, s);
    }
    if (params.role) { sql += ' AND u.role = ?'; binds.push(params.role); }
    if (params.isActive !== undefined) { sql += ' AND u.isActive = ?'; binds.push(params.isActive ? 1 : 0); }

    let countSql = 'SELECT COUNT(*) as count FROM users u WHERE 1=1';
    const countBinds = [];
    if (params.search) {
      countSql += ' AND (u.fullName LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const s = `%${params.search}%`;
      countBinds.push(s, s, s);
    }
    if (params.role) { countSql += ' AND u.role = ?'; countBinds.push(params.role); }
    if (params.isActive !== undefined) { countSql += ' AND u.isActive = ?'; countBinds.push(params.isActive ? 1 : 0); }
    const total = db.count(countSql, countBinds);

    sql += ' ORDER BY u.createdAt DESC';
    if (params.limit) { sql += ' LIMIT ?'; binds.push(params.limit); }
    if (params.offset) { sql += ' OFFSET ?'; binds.push(params.offset); }

    const rows = db.all(sql, binds);
    return { users: rows.map(sanitize), total };
  },

  update(id, data) {
    const fields = [];
    const binds = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && !['id','userId','role','createdAt','password'].includes(key)) {
        fields.push(`${key} = ?`);
        binds.push(value);
      }
    }
    if (!fields.length) return sanitize(this.findById(id));
    fields.push("updatedAt = datetime('now','localtime')");
    binds.push(id);
    db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, binds);
    db.saveDatabase();
    return sanitize(this.findById(id));
  },

  updatePassword(id, hashedPassword) {
    db.run("UPDATE users SET password = ?, updatedAt = datetime('now','localtime') WHERE id = ?", [hashedPassword, id]);
    db.saveDatabase();
  },

  toggleStatus(id) {
    db.run("UPDATE users SET isActive = CASE WHEN isActive = 1 THEN 0 ELSE 1 END, updatedAt = datetime('now','localtime') WHERE id = ?", [id]);
    db.saveDatabase();
    return sanitize(this.findById(id));
  },

  delete(id) {
    db.run('DELETE FROM users WHERE id = ?', [id]);
    db.saveDatabase();
  },

  count() {
    return db.count('SELECT COUNT(*) as count FROM users');
  },

  countByRole(role) {
    return db.count('SELECT COUNT(*) as count FROM users WHERE role = ?', [role]);
  }
};

module.exports = User;
