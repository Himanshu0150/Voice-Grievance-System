const db = require('../config/database');

const PRIORITY_WEIGHTS = { 'Critical': 35, 'High': 28, 'Medium': 18, 'Low': 10 };

function priorityBoostFromSupporters(count) {
  if (count >= 50) return { bump: true, to: 'Critical' };
  if (count >= 20) return { bump: true, to: 'High' };
  if (count >= 8) return { bump: true, to: 'High' };
  if (count >= 3) return { bump: true, to: 'Medium' };
  return { bump: false };
}

const impactService = {
  calculate(complaint, supporterCount) {
    const priority = complaint.priority || 'Medium';
    let score = PRIORITY_WEIGHTS[priority] || 18;

    score += Math.min(30, (supporterCount || 0) * 2.5);

    const category = complaint.category || 'Others';
    const days = complaint.createdAt
      ? Math.max(0, Math.floor((Date.now() - new Date(complaint.createdAt.replace(' ', 'T')).getTime()) / 86400000))
      : 0;
    const frequency = db.count(
      `SELECT COUNT(*) as count FROM complaints
       WHERE category = ? AND id != ? AND createdAt >= datetime('now', '-30 days')`,
      [category, complaint.id || -1]
    );
    score += Math.min(15, frequency * 2);

    const escalationLevel = db.count(
      'SELECT COUNT(*) as count FROM complaint_escalations WHERE complaintId = ? AND status = ?',
      [complaint.id || -1, 'Open']
    );
    score += Math.min(15, escalationLevel * 5);

    score += Math.min(10, days * 0.5);

    const location = complaint.latitude && complaint.longitude ? 2 : 0;
    score += location;

    const finalScore = Math.min(100, Math.round(score));
    const finalPriority = this.priorityFor(priority, supporterCount || 0);

    return {
      score: finalScore,
      priority: finalPriority,
      components: {
        priorityBase: PRIORITY_WEIGHTS[priority],
        supporters: Math.min(30, (supporterCount || 0) * 2.5),
        frequency: Math.min(15, frequency * 2),
        escalation: Math.min(15, escalationLevel * 5),
        age: Math.min(10, days * 0.5),
        location
      }
    };
  },

  priorityFor(currentPriority, supporterCount) {
    const boost = priorityBoostFromSupporters(supporterCount);
    if (!boost.bump) return currentPriority;
    const order = ['Low', 'Medium', 'High', 'Critical'];
    const currentIndex = order.indexOf(currentPriority);
    const targetIndex = order.indexOf(boost.to);
    return currentIndex >= targetIndex ? currentPriority : boost.to;
  },

  compute(complaintId) {
    const complaint = db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) return null;
    const supporterCount = db.count(
      'SELECT COUNT(*) as count FROM complaint_supporters WHERE complaintId = ?',
      [complaintId]
    );
    return this.calculate(complaint, supporterCount);
  }
};

module.exports = impactService;
