const db = require('../config/database');

const EVENT_ORDER = [
  'Submitted',
  'AI Processed',
  'Assigned',
  'Accepted',
  'Work Started',
  'Inspection',
  'In Progress',
  'Completed',
  'Rejected',
  'Escalated'
];

const timelineService = {
  add(complaintId, event, description = '', actorId = null, actorRole = null) {
    if (!complaintId) return null;
    db.run(
      'INSERT INTO complaint_timeline (complaintId, event, description, actorId, actorRole) VALUES (?, ?, ?, ?, ?)',
      [complaintId, event, description, actorId || null, actorRole || null]
    );
    db.saveDatabase();
    return db.get('SELECT * FROM complaint_timeline WHERE id = ?', [db.lastInsertId()]);
  },

  getByComplaint(complaintId) {
    return db.all(
      'SELECT * FROM complaint_timeline WHERE complaintId = ? ORDER BY createdAt ASC, id ASC',
      [complaintId]
    );
  },

  getByComplaintReversed(complaintId) {
    return db.all(
      'SELECT * FROM complaint_timeline WHERE complaintId = ? ORDER BY createdAt DESC, id DESC',
      [complaintId]
    );
  },

  getEventOrder() {
    return [...EVENT_ORDER];
  },

  addStatusEvents(complaint, actorId = null, actorRole = null) {
    if (!complaint) return;
    const timeline = this.getByComplaint(complaint.id);
    if (timeline.length === 0) {
      this.add(complaint.id, 'Submitted', `Complaint ${complaint.complaintId} submitted by citizen`, complaint.userId, 'user');
    }
    const existing = timeline.map(t => t.event);
    if (complaint.aiProcessed && !existing.includes('AI Processed')) {
      this.add(complaint.id, 'AI Processed', `AI classified as ${complaint.category} (${complaint.priority}) with ${Math.round((complaint.aiConfidence || 0) * 100)}% confidence`, null, 'ai');
    }
    if (complaint.status === 'Assigned' && !existing.includes('Assigned')) {
      this.add(complaint.id, 'Assigned', `Complaint assigned to ${complaint.departmentName || 'department'}`, actorId, actorRole);
    }
    if (complaint.status === 'Accepted' && !existing.includes('Accepted')) {
      this.add(complaint.id, 'Accepted', 'Complaint accepted by department', actorId, actorRole);
    }
    if (complaint.status === 'Work Started' && !existing.includes('Work Started')) {
      this.add(complaint.id, 'Work Started', 'Work has started on this complaint', actorId, actorRole);
    }
    if (complaint.status === 'Inspection' && !existing.includes('Inspection')) {
      this.add(complaint.id, 'Inspection', 'Inspection in progress', actorId, actorRole);
    }
    if (complaint.status === 'In Progress' && !existing.includes('In Progress')) {
      this.add(complaint.id, 'In Progress', 'Complaint is being processed', actorId, actorRole);
    }
    if (complaint.status === 'Resolved' && !existing.includes('Completed')) {
      this.add(complaint.id, 'Completed', 'Complaint has been resolved', actorId, actorRole);
    }
    if (complaint.status === 'Rejected' && !existing.includes('Rejected')) {
      this.add(complaint.id, 'Rejected', complaint.resolutionRemark || 'Complaint rejected', actorId, actorRole);
    }
  }
};

module.exports = timelineService;
