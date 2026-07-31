const db = require('../config/database');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const impactService = require('./impactService');
const timelineService = require('./timelineService');

const supportService = {
  isSupported(complaintId, userId) {
    return db.count(
      'SELECT COUNT(*) as count FROM complaint_supporters WHERE complaintId = ? AND userId = ?',
      [complaintId, userId]
    ) > 0;
  },

  countForComplaint(complaintId) {
    return db.count('SELECT COUNT(*) as count FROM complaint_supporters WHERE complaintId = ?', [complaintId]);
  },

  supportersForComplaint(complaintId) {
    return db.all(
      `SELECT s.id, s.createdAt, u.id as userId, u.fullName, u.village, u.district
       FROM complaint_supporters s
       JOIN users u ON s.userId = u.id
       WHERE s.complaintId = ? ORDER BY s.createdAt DESC`,
      [complaintId]
    );
  },

  async toggle(complaintId, userId) {
    const complaint = Complaint.findById(complaintId);
    if (!complaint) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      throw err;
    }
    if (complaint.userId === userId) {
      const err = new Error('You cannot support your own complaint');
      err.statusCode = 400;
      throw err;
    }

    const exists = this.isSupported(complaintId, userId);
    let supported = false;
    if (exists) {
      db.run('DELETE FROM complaint_supporters WHERE complaintId = ? AND userId = ?', [complaintId, userId]);
      db.saveDatabase();
    } else {
      db.run('INSERT INTO complaint_supporters (complaintId, userId) VALUES (?, ?)', [complaintId, userId]);
      db.saveDatabase();
      supported = true;
      timelineService.add(complaintId, 'In Progress', 'A citizen supported this complaint', userId, 'user');
      Notification.create({
        userId: complaint.userId,
        title: 'New Support',
        message: `A citizen supported your complaint "${complaint.title}". Total supporters: ${this.countForComplaint(complaintId)}.`,
        type: 'info'
      });
    }

    const supporterCount = this.countForComplaint(complaintId);
    const impact = impactService.calculate(complaint, supporterCount);
    Complaint.update(complaintId, { impactScore: impact.score, priority: impact.priority, prioritySource: 'system' });

    return {
      supported,
      supporterCount,
      impactScore: impact.score,
      priority: impact.priority
    };
  },

  async join(complaintId, userId) {
    const complaint = Complaint.findById(complaintId);
    if (!complaint) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      throw err;
    }
    if (complaint.userId === userId) {
      const err = new Error('You cannot join your own complaint');
      err.statusCode = 400;
      throw err;
    }

    const exists = this.isSupported(complaintId, userId);
    if (!exists) {
      db.run('INSERT INTO complaint_supporters (complaintId, userId) VALUES (?, ?)', [complaintId, userId]);
      db.saveDatabase();
    }

    timelineService.add(complaintId, 'In Progress', 'Citizen joined this existing complaint', userId, 'user');

    Notification.create({
      userId: complaint.userId,
      title: 'Citizen Joined Complaint',
      message: `A citizen joined your complaint "${complaint.title}". Total supporters: ${this.countForComplaint(complaintId)}.`,
      type: 'info'
    });

    const supporterCount = this.countForComplaint(complaintId);
    const impact = impactService.calculate(complaint, supporterCount);
    Complaint.update(complaintId, { impactScore: impact.score, priority: impact.priority, prioritySource: 'system' });

    return {
      joined: true,
      complaintId,
      supporterCount,
      impactScore: impact.score,
      priority: impact.priority
    };
  }
};

module.exports = supportService;
