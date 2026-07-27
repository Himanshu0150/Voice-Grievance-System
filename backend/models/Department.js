const db = require('../config/database');

const Department = {
  findAll() {
    const sql = `SELECT d.*, (SELECT COUNT(*) FROM complaints c WHERE c.departmentId = d.id) as complaintCount
      FROM departments d ORDER BY d.departmentName`;
    return db.all(sql);
  },

  findById(id) {
    return db.get('SELECT * FROM departments WHERE id = ?', [id]);
  },

  findByName(name) {
    return db.get('SELECT * FROM departments WHERE departmentName = ?', [name]);
  },

  create(data) {
    db.run('INSERT INTO departments (departmentName, description) VALUES (?, ?)',
      [data.departmentName, data.description || null]
    );
    const id = db.lastInsertId();
    db.saveDatabase();
    return this.findById(id);
  },

  update(id, data) {
    const fields = [];
    const binds = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = ?`);
        binds.push(value);
      }
    }
    if (!fields.length) return this.findById(id);
    binds.push(id);
    db.run(`UPDATE departments SET ${fields.join(', ')} WHERE id = ?`, binds);
    db.saveDatabase();
    return this.findById(id);
  },

  delete(id) {
    db.run('DELETE FROM departments WHERE id = ?', [id]);
    db.saveDatabase();
  }
};

module.exports = Department;
