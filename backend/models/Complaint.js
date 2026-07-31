const db = require('../config/database');

const Complaint = {
  create(data) {
    const complaintId = db.generateComplaintId();
    db.run(`INSERT INTO complaints (complaintId, userId, title, category, departmentId, description, voiceTranscript, speechLanguage, audioFile, latitude, longitude, address, priority, isAnonymous, estimatedResolutionDays, impactScore, prioritySource)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [complaintId, data.userId, data.title, data.category, data.departmentId || null, data.description || null,
       data.voiceTranscript || null, data.speechLanguage || 'hi-IN', data.audioFile || null, data.latitude || null, data.longitude || null,
       data.address || null, data.priority || 'Medium', data.isAnonymous ? 1 : 0,
       data.estimatedResolutionDays || null, data.impactScore || null, data.prioritySource || 'ai']
    );
    const id = db.lastInsertId();
    db.saveDatabase();
    return this.findById(id);
  },

  createVoice(data) {
    const complaintId = db.generateComplaintId();
    db.run(`INSERT INTO complaints (
      complaintId, userId, title, category, departmentId, description,
      voiceTranscript, speechLanguage, audioFile, latitude, longitude, address, priority,
      originalLanguage, originalText, englishTranslation, aiSummary,
      detectedCategory, aiConfidence, aiKeywords, aiProcessed,
      needsManualReview, suggestedAction, officerRecommendation,
      estimatedResolutionDays, impactScore, prioritySource, isAnonymous, similarComplaintId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [complaintId, data.userId, data.title, data.category, data.departmentId || null, data.description || null,
       data.voiceTranscript || null, data.speechLanguage || 'hi-IN', data.audioFile || null,
       data.latitude || null, data.longitude || null, data.address || null, data.priority || 'Medium',
       data.originalLanguage || null, data.originalText || null, data.englishTranslation || null,
       data.aiSummary || null, data.detectedCategory || null, data.aiConfidence || null,
       data.aiKeywords || null, data.aiProcessed || 0, data.needsManualReview || 0,
       data.suggestedAction || null, data.officerRecommendation || null,
       data.estimatedResolutionDays || null, data.impactScore || null, data.prioritySource || 'ai',
       data.isAnonymous ? 1 : 0, data.similarComplaintId || null]
    );
    const id = db.lastInsertId();
    db.saveDatabase();
    return this.findById(id);
  },

  updateAudio(id, audioPath) {
    db.run("UPDATE complaints SET audioFile = ?, updatedAt = datetime('now','localtime') WHERE id = ?", [audioPath, id]);
    db.saveDatabase();
  },

  findById(id) {
    const sql = `SELECT c.*, u.fullName as userName, u.village, u.taluka, u.district, d.departmentName,
      (SELECT COUNT(*) FROM complaint_supporters s WHERE s.complaintId = c.id) as supporterCount
      FROM complaints c
      LEFT JOIN users u ON c.userId = u.id
      LEFT JOIN departments d ON c.departmentId = d.id
      WHERE c.id = ?`;
    const row = db.get(sql, [id]);
    if (row) {
      row.images = this.getImages(id);
    }
    return row;
  },

  findByComplaintId(complaintId) {
    const sql = `SELECT c.*, u.fullName as userName, u.village, u.taluka, u.district, d.departmentName,
      (SELECT COUNT(*) FROM complaint_supporters s WHERE s.complaintId = c.id) as supporterCount
      FROM complaints c
      LEFT JOIN users u ON c.userId = u.id
      LEFT JOIN departments d ON c.departmentId = d.id
      WHERE c.complaintId = ?`;
    const row = db.get(sql, [complaintId]);
    if (row) row.images = this.getImages(row.id);
    return row;
  },

  findAll(params = {}) {
    let sql = `SELECT c.*, u.fullName as userName, u.village, u.taluka, u.district, d.departmentName,
      (SELECT COUNT(*) FROM complaint_supporters s WHERE s.complaintId = c.id) as supporterCount
      FROM complaints c
      LEFT JOIN users u ON c.userId = u.id
      LEFT JOIN departments d ON c.departmentId = d.id
      WHERE 1=1`;
    const binds = [];

    if (params.search) {
      sql += ' AND (c.title LIKE ? OR c.description LIKE ? OR c.complaintId LIKE ?)';
      const s = `%${params.search}%`;
      binds.push(s, s, s);
    }
    if (params.status) { sql += ' AND c.status = ?'; binds.push(params.status); }
    if (params.category) { sql += ' AND c.category = ?'; binds.push(params.category); }
    if (params.userId) { sql += ' AND c.userId = ?'; binds.push(params.userId); }
    if (params.departmentId) { sql += ' AND c.departmentId = ?'; binds.push(params.departmentId); }
    if (params.priority) { sql += ' AND c.priority = ?'; binds.push(params.priority); }
    if (params.village) { sql += ' AND u.village = ?'; binds.push(params.village); }
    if (params.from) { sql += ' AND c.createdAt >= ?'; binds.push(params.from); }
    if (params.to) { sql += ' AND c.createdAt <= ?'; binds.push(params.to); }

    const countBinds = [...binds];
    const countSql = 'SELECT COUNT(*) as count FROM complaints c ' +
      'LEFT JOIN users u ON c.userId = u.id ' +
      'LEFT JOIN departments d ON c.departmentId = d.id WHERE 1=1' +
      (params.search ? ' AND (c.title LIKE ? OR c.description LIKE ? OR c.complaintId LIKE ?)' : '') +
      (params.status ? ' AND c.status = ?' : '') +
      (params.category ? ' AND c.category = ?' : '') +
      (params.userId ? ' AND c.userId = ?' : '') +
      (params.departmentId ? ' AND c.departmentId = ?' : '') +
      (params.priority ? ' AND c.priority = ?' : '') +
      (params.village ? ' AND u.village = ?' : '') +
      (params.from ? ' AND c.createdAt >= ?' : '') +
      (params.to ? ' AND c.createdAt <= ?' : '');
    const total = db.count(countSql, countBinds);

    if (params.sort === 'oldest') {
      sql += ' ORDER BY c.createdAt ASC';
    } else if (params.sort === 'alpha') {
      sql += ' ORDER BY c.title ASC';
    } else if (params.sort === 'priority') {
      sql += " ORDER BY CASE c.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 END, c.createdAt DESC";
    } else {
      sql += ' ORDER BY c.createdAt DESC';
    }
    if (params.limit) { sql += ' LIMIT ?'; binds.push(params.limit); }
    if (params.offset) { sql += ' OFFSET ?'; binds.push(params.offset); }

    return { complaints: db.all(sql, binds), total };
  },

  updateStatus(id, status, remark = null, priority = null, departmentId = null) {
    const binds = [status];
    let sql = "UPDATE complaints SET status = ?, updatedAt = datetime('now','localtime')";
    if (remark !== null) { sql += ', resolutionRemark = ?'; binds.push(remark); }
    if (priority !== null) { sql += ', priority = ?'; binds.push(priority); }
    if (departmentId !== undefined) { sql += ', departmentId = ?'; binds.push(departmentId); }
    if (status === 'Resolved') {
      sql += ", resolvedAt = datetime('now','localtime')";
    }
    sql += ' WHERE id = ?';
    binds.push(id);
    db.run(sql, binds);
    db.saveDatabase();
    return this.findById(id);
  },

  getSupporters(complaintId) {
    return db.all(
      `SELECT s.id, s.userId, u.fullName, u.village, u.district, s.createdAt
       FROM complaint_supporters s
       LEFT JOIN users u ON s.userId = u.id
       WHERE s.complaintId = ? ORDER BY s.createdAt DESC`,
      [complaintId]
    );
  },

  addResolutionImage(id, imagePath) {
    db.run("UPDATE complaints SET resolvedImage = ?, updatedAt = datetime('now','localtime') WHERE id = ?", [imagePath, id]);
    db.saveDatabase();
  },

  getImages(complaintPk) {
    return db.all('SELECT * FROM complaint_images WHERE complaintId = ?', [complaintPk]);
  },

  addImage(complaintPk, imagePath) {
    db.run('INSERT INTO complaint_images (complaintId, imagePath) VALUES (?, ?)', [complaintPk, imagePath]);
    db.saveDatabase();
  },

  getStatsByUser(userId) {
    const row = db.get(`SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) as pending,
      COALESCE(SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END), 0) as inProgress,
      COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) as resolved,
      COALESCE(SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END), 0) as rejected,
      COALESCE(SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END), 0) as critical,
      COALESCE(AVG(impactScore), 0) as avgImpact,
      COALESCE(AVG(estimatedResolutionDays), 0) as avgResolutionDays
      FROM complaints WHERE userId = ?`, [userId]);
    return row || { total: 0, pending: 0, inProgress: 0, resolved: 0, rejected: 0, critical: 0, avgImpact: 0, avgResolutionDays: 0 };
  },

  getOverallStats() {
    const row = db.get(`SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) as pending,
      COALESCE(SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END), 0) as inProgress,
      COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) as resolved,
      COALESCE(SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END), 0) as rejected,
      COALESCE(SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END), 0) as critical,
      COALESCE(AVG(impactScore), 0) as avgImpact,
      COALESCE(AVG(estimatedResolutionDays), 0) as avgResolutionDays
      FROM complaints`);
    return row || { total: 0, pending: 0, inProgress: 0, resolved: 0, rejected: 0, critical: 0, avgImpact: 0, avgResolutionDays: 0 };
  },

  getMonthlyStats() {
    const result = db.exec("SELECT strftime('%Y-%m', createdAt) as month, COUNT(*) as count FROM complaints GROUP BY month ORDER BY month DESC LIMIT 12");
    return result.map(r => ({ label: r.values[0], value: r.values[1] })).reverse();
  },

  getDepartmentStats() {
    const result = db.exec('SELECT d.departmentName, COUNT(*) as count FROM complaints c LEFT JOIN departments d ON c.departmentId = d.id GROUP BY d.departmentName ORDER BY count DESC');
    return result.map(r => ({ label: r.values[0] || 'Unassigned', value: r.values[1] }));
  },

  getCategoryStats() {
    const result = db.exec('SELECT category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC');
    return result.map(r => ({ label: r.values[0], value: r.values[1] }));
  },

  getVillageStats() {
    const result = db.exec(`SELECT u.village, COUNT(*) as count FROM complaints c JOIN users u ON c.userId = u.id WHERE u.village IS NOT NULL GROUP BY u.village ORDER BY count DESC LIMIT 10`);
    return result.map(r => ({ label: r.values[0], value: r.values[1] }));
  },

  getLatest(limit = 5) {
    return db.all(`SELECT c.*, u.fullName as userName, u.village FROM complaints c LEFT JOIN users u ON c.userId = u.id ORDER BY c.createdAt DESC LIMIT ?`, [limit]);
  },

  update(id, data) {
    const fields = [];
    const binds = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && !['id','complaintId','userId','createdAt','status'].includes(key)) {
        fields.push(`${key} = ?`);
        binds.push(value);
      }
    }
    if (!fields.length) return this.findById(id);
    fields.push("updatedAt = datetime('now','localtime')");
    binds.push(id);
    db.run(`UPDATE complaints SET ${fields.join(', ')} WHERE id = ?`, binds);
    db.saveDatabase();
    return this.findById(id);
  },

  delete(id) {
    db.run('DELETE FROM complaints WHERE id = ?', [id]);
    db.saveDatabase();
  }
};

module.exports = Complaint;
