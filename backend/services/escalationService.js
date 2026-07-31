const db = require('../config/database');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const timelineService = require('./timelineService');
const impactService = require('./impactService');
const Settings = require('../models/Settings');
const logger = require('../utils/logger');

const LEVELS = [
  { level: 1, role: 'senior officer', minDays: 3 },
  { level: 2, role: 'commissioner', minDays: 7 },
  { level: 3, role: 'collector', minDays: 15 }
];

function getConfig() {
  try {
    const stored = Settings.get('escalation_days');
    if (stored) return { ...JSON.parse(stored) };
  } catch (err) {
    logger.warn(`[ESCALATION] Failed to parse escalation config: ${err.message}`);
  }
  return { senior: 3, commissioner: 7, collector: 15 };
}

function ageInDays(complaint) {
  if (!complaint.createdAt) return 0;
  const created = new Date(complaint.createdAt.replace(' ', 'T')).getTime();
  return Math.max(0, (Date.now() - created) / 86400000);
}

const escalationService = {
  LEVELS,

  getLevelForAge(days) {
    const config = getConfig();
    if (days >= config.collector) return 3;
    if (days >= config.commissioner) return 2;
    if (days >= config.senior) return 1;
    return 0;
  },

  highestOpenLevel(complaintId) {
    const row = db.get(
      'SELECT MAX(level) as level FROM complaint_escalations WHERE complaintId = ? AND status = ?',
      [complaintId, 'Open']
    );
    return row?.level || 0;
  },

  async escalate(complaintId, reason = null) {
    const complaint = Complaint.findById(complaintId);
    if (!complaint) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      throw err;
    }
    if (complaint.status === 'Resolved' || complaint.status === 'Rejected') {
      const err = new Error('Resolved or rejected complaints cannot be escalated');
      err.statusCode = 400;
      throw err;
    }

    const days = ageInDays(complaint);
    const targetLevel = this.getLevelForAge(days);
    const currentLevel = this.highestOpenLevel(complaintId);
    const nextLevel = currentLevel + 1;

    if (targetLevel <= currentLevel) {
      return { escalated: false, message: 'Complaint is already at the maximum escalation level', currentLevel };
    }

    const level = Math.max(nextLevel, Math.min(targetLevel || nextLevel, 3));
    const levelInfo = LEVELS[level - 1];
    const escalatedReason = reason || `Complaint pending for more than ${levelInfo.minDays} days without resolution`;

    db.run(
      'INSERT INTO complaint_escalations (complaintId, level, escalatedToRole, reason, status) VALUES (?, ?, ?, ?, ?)',
      [complaintId, level, levelInfo.role, escalatedReason, 'Open']
    );
    db.saveDatabase();

    timelineService.add(complaintId, 'Escalated', `Escalated to ${levelInfo.role}: ${escalatedReason}`, null, 'system');

    Notification.create({
      userId: null,
      title: `Complaint Escalated (Level ${level})`,
      message: `Complaint "${complaint.title}" (${complaint.complaintId}) escalated to ${levelInfo.role}. Reason: ${escalatedReason}`,
      type: 'warning'
    });

    Notification.create({
      userId: complaint.userId,
      title: 'Complaint Escalated',
      message: `Your complaint "${complaint.title}" has been escalated to the ${levelInfo.role}.`,
      type: 'warning'
    });

    const supporterCount = db.count('SELECT COUNT(*) as count FROM complaint_supporters WHERE complaintId = ?', [complaintId]);
    const impact = impactService.calculate(complaint, supporterCount);
    Complaint.update(complaintId, { impactScore: impact.score, priority: impact.priority, prioritySource: 'system' });

    logger.info(`[ESCALATION] Complaint ${complaint.complaintId} escalated to ${levelInfo.role} (level ${level})`);
    return {
      escalated: true,
      level,
      escalatedToRole: levelInfo.role,
      reason: escalatedReason,
      escalatedAt: new Date().toISOString()
    };
  },

  resolveEscalations(complaintId) {
    db.run('UPDATE complaint_escalations SET status = ?, resolvedAt = datetime(\'now\',\'localtime\') WHERE complaintId = ? AND status = ?', ['Resolved', complaintId, 'Open']);
    db.saveDatabase();
  },

  getAll(filter = {}) {
    const binds = [];
    let sql = `SELECT e.*, c.complaintId as complaintRef, c.title as complaintTitle, d.departmentName
      FROM complaint_escalations e
      LEFT JOIN complaints c ON e.complaintId = c.id
      LEFT JOIN departments d ON c.departmentId = d.id
      WHERE 1=1`;
    if (filter.status) { sql += ' AND e.status = ?'; binds.push(filter.status); }
    sql += ' ORDER BY e.createdAt DESC';
    if (filter.limit) { sql += ' LIMIT ?'; binds.push(filter.limit); }
    return db.all(sql, binds);
  },

  async runAutoEscalation() {
    logger.info('[ESCALATION] Running automatic escalation check');
    const complaints = db.all(
      `SELECT id, complaintId, title, status, createdAt, category, priority
       FROM complaints
       WHERE status NOT IN ('Resolved', 'Rejected')`
    );
    let escalatedCount = 0;
    for (const complaint of complaints) {
      const days = ageInDays(complaint);
      const target = this.getLevelForAge(days);
      const current = this.highestOpenLevel(complaint.id);
      if (target > current) {
        try {
          const result = await this.escalate(complaint.id);
          if (result.escalated) escalatedCount++;
        } catch (err) {
          logger.error(`[ESCALATION] Failed to escalate complaint ${complaint.id}: ${err.message}`);
        }
      }
    }
    if (escalatedCount > 0) {
      logger.info(`[ESCALATION] Auto-escalated ${escalatedCount} complaint(s)`);
    }
    return escalatedCount;
  }
};

module.exports = escalationService;
