const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const db = require('../config/database');

function round(value, digits = 1) {
  return Math.round((value || 0) * Math.pow(10, digits)) / Math.pow(10, digits);
}

const analyticsService = {
  getDashboardStats() {
    const stats = Complaint.getOverallStats();
    const aiPendingReview = db.count("SELECT COUNT(*) as count FROM complaints WHERE needsManualReview = 1 AND status = 'Pending'");
    const highPriority = db.count("SELECT COUNT(*) as count FROM complaints WHERE priority IN ('High','Critical') AND status != 'Resolved'");
    const critical = db.count("SELECT COUNT(*) as count FROM complaints WHERE priority = 'Critical' AND status != 'Resolved'");
    const avgConfidence = db.get("SELECT COALESCE(AVG(aiConfidence), 0) as avg FROM complaints WHERE aiConfidence IS NOT NULL");
    const avgResolutionDays = db.get(
      `SELECT COALESCE(AVG(julianday(resolvedAt) - julianday(createdAt)), 0) as avg
       FROM complaints WHERE status = 'Resolved' AND resolvedAt IS NOT NULL`
    );
    const openEscalations = db.count("SELECT COUNT(*) as count FROM complaint_escalations WHERE status = 'Open'");
    const totalSupporters = db.count("SELECT COUNT(*) as count FROM complaint_supporters");
    const avgImpact = db.get("SELECT COALESCE(AVG(impactScore), 0) as avg FROM complaints WHERE impactScore IS NOT NULL");
    const distressCount = db.count("SELECT COUNT(*) as count FROM complaints WHERE emotion = 'Distress'");
    const panicCount = db.count("SELECT COUNT(*) as count FROM complaints WHERE emotion = 'Panic'");

    return {
      totalUsers: User.countByRole('user'),
      totalComplaints: stats.total,
      pending: stats.pending,
      inProgress: stats.inProgress,
      resolved: stats.resolved,
      rejected: stats.rejected,
      resolutionRate: stats.total > 0 ? round((stats.resolved / stats.total) * 100) : 0,
      aiPendingReview,
      highPriority,
      critical,
      avgConfidence: round(avgConfidence?.avg || 0),
      avgResolutionDays: round(avgResolutionDays?.avg || 0, 1),
      openEscalations,
      totalSupporters,
      avgImpact: round(avgImpact?.avg || 0),
      emotionDistribution: this.getEmotionDistribution(),
      mostCommonEmotion: this.getMostCommonEmotion(),
      distressCount,
      panicCount
    };
  },

  getEmotionDistribution() {
    const rows = db.exec("SELECT emotion, COUNT(*) as count FROM complaints WHERE emotion IS NOT NULL GROUP BY emotion");
    const map = { Calm: 0, Neutral: 0, Concerned: 0, Angry: 0, Fear: 0, Distress: 0, Panic: 0 };
    rows.forEach(r => { map[r.values[0]] = r.values[1]; });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  },

  getMostCommonEmotion() {
    const row = db.get(
      "SELECT emotion, COUNT(*) as count FROM complaints WHERE emotion IS NOT NULL GROUP BY emotion ORDER BY count DESC LIMIT 1"
    );
    return row ? { emotion: row.emotion, count: row.count } : null;
  },

  getOfficerPerformance() {
    const performance = db.all(`
      SELECT
        u.id as userId,
        u.fullName,
        u.role,
        d.departmentName,
        COUNT(c.id) as totalAssigned,
        COALESCE(SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END), 0) as resolved,
        COALESCE(SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END), 0) as pending,
        COALESCE(SUM(CASE WHEN c.status NOT IN ('Resolved','Rejected') THEN 1 ELSE 0 END), 0) as open,
        COALESCE(AVG(CASE WHEN c.status = 'Resolved' AND c.resolvedAt IS NOT NULL
          THEN julianday(c.resolvedAt) - julianday(c.createdAt) END), 0) as avgResolutionDays,
        COALESCE(SUM(CASE WHEN c.impactScore >= 70 THEN 1 ELSE 0 END), 0) as highImpactResolved
      FROM users u
      LEFT JOIN departments d ON u.departmentId = d.id
      LEFT JOIN complaints c ON c.departmentId = d.id OR c.departmentId = u.departmentId
      WHERE u.role IN ('officer', 'department_admin', 'admin', 'superadmin')
      GROUP BY u.id
      HAVING totalAssigned > 0 OR u.role IN ('officer')
      ORDER BY resolved DESC
    `).map(row => ({
      userId: row.userId,
      fullName: row.fullName,
      role: row.role,
      departmentName: row.departmentName || 'Unassigned',
      totalAssigned: row.totalAssigned || 0,
      resolved: row.resolved || 0,
      pending: row.pending || 0,
      open: row.open || 0,
      avgResolutionDays: round(row.avgResolutionDays, 1),
      resolutionRate: row.totalAssigned ? round((row.resolved / row.totalAssigned) * 100) : 0,
      satisfaction: round(Feedback.getAverageRating().average || 0, 1)
    }));

    return {
      officers: performance,
      averageResolutionTime: round(db.get(
        `SELECT COALESCE(AVG(julianday(resolvedAt) - julianday(createdAt)), 0) as avg
         FROM complaints WHERE status = 'Resolved' AND resolvedAt IS NOT NULL`
      )?.avg || 0, 1),
      complaintsSolved: db.count("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved'"),
      pendingComplaints: db.count("SELECT COUNT(*) as count FROM complaints WHERE status = 'Pending'"),
      citizenSatisfaction: round(Feedback.getAverageRating().average || 0, 1)
    };
  },

  getDepartmentRanking() {
    return db.all(`
      SELECT
        d.id,
        d.departmentName,
        COUNT(c.id) as total,
        COALESCE(SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END), 0) as resolved,
        COALESCE(SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END), 0) as pending,
        COALESCE(AVG(CASE WHEN c.status = 'Resolved' AND c.resolvedAt IS NOT NULL
          THEN julianday(c.resolvedAt) - julianday(c.createdAt) END), 0) as avgResolutionDays,
        COALESCE(SUM(c.impactScore), 0) as totalImpact,
        COALESCE(SUM((SELECT COUNT(*) FROM complaint_supporters s WHERE s.complaintId = c.id)), 0) as totalSupporters
      FROM departments d
      LEFT JOIN complaints c ON c.departmentId = d.id
      GROUP BY d.id
      ORDER BY resolved DESC, avgResolutionDays ASC
    `).map(row => ({
      id: row.id,
      departmentName: row.departmentName,
      total: row.total || 0,
      resolved: row.resolved || 0,
      pending: row.pending || 0,
      avgResolutionDays: round(row.avgResolutionDays, 1),
      resolutionRate: row.total ? round((row.resolved / row.total) * 100) : 0,
      totalImpact: round(row.totalImpact || 0),
      totalSupporters: row.totalSupporters || 0
    }));
  },

  getMonthlyTrend(months = 12) {
    const rows = db.all(`
      SELECT strftime('%Y-%m', createdAt) as month,
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) as resolved,
        COALESCE(SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END), 0) as rejected,
        COALESCE(SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END), 0) as critical
      FROM complaints
      WHERE createdAt >= datetime('now', 'localtime', '-' || ? || ' months')
      GROUP BY month ORDER BY month ASC
    `, [Math.max(1, months)]);
    return rows.map(r => ({
      month: r.month,
      total: r.total || 0,
      resolved: r.resolved || 0,
      rejected: r.rejected || 0,
      critical: r.critical || 0
    }));
  },

  getAiAccuracy() {
    const total = db.count('SELECT COUNT(*) as count FROM complaints WHERE aiProcessed = 1');
    const noManualReview = db.count('SELECT COUNT(*) as count FROM complaints WHERE aiProcessed = 1 AND needsManualReview = 0');
    const confidence = db.get('SELECT COALESCE(AVG(aiConfidence), 0) as avg FROM complaints WHERE aiConfidence IS NOT NULL')?.avg || 0;
    return {
      totalProcessed: total,
      accuracyRate: total > 0 ? round((noManualReview / total) * 100) : 0,
      avgConfidence: round(confidence),
      needsReview: total - noManualReview
    };
  },

  getPriorityDistribution() {
    const rows = db.exec("SELECT priority, COUNT(*) as count FROM complaints GROUP BY priority");
    const map = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    rows.forEach(r => { map[r.values[0]] = r.values[1]; });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  },

  getEscalationTrend() {
    const rows = db.all(`
      SELECT strftime('%Y-%m', createdAt) as month, COUNT(*) as total
      FROM complaint_escalations
      WHERE createdAt >= datetime('now', 'localtime', '-6 months')
      GROUP BY month ORDER BY month ASC
    `);
    return rows.map(r => ({ month: r.month, total: r.total || 0 }));
  },

  getFullAnalytics() {
    const stats = Complaint.getOverallStats();
    return {
      ...this.getDashboardStats(),
      monthlyStats: Complaint.getMonthlyStats(),
      departmentStats: Complaint.getDepartmentStats(),
      categoryStats: Complaint.getCategoryStats(),
      villageStats: Complaint.getVillageStats(),
      averageRating: round(Feedback.getAverageRating().average || 0),
      totalFeedbacks: Feedback.getAverageRating().total || 0,
      officerPerformance: this.getOfficerPerformance(),
      departmentRanking: this.getDepartmentRanking(),
      monthlyTrend: this.getMonthlyTrend(12),
      aiAccuracy: this.getAiAccuracy(),
      priorityDistribution: this.getPriorityDistribution(),
      escalationTrend: this.getEscalationTrend(),
      emotionAnalytics: {
        distribution: this.getEmotionDistribution(),
        mostCommon: this.getMostCommonEmotion(),
        distress: db.count("SELECT COUNT(*) as count FROM complaints WHERE emotion = 'Distress'"),
        panic: db.count("SELECT COUNT(*) as count FROM complaints WHERE emotion = 'Panic'")
      },
      supporterStats: {
        total: db.count('SELECT COUNT(*) as count FROM complaint_supporters'),
        avgPerComplaint: round(db.get('SELECT COALESCE(AVG(cnt), 0) as avg FROM (SELECT COUNT(*) as cnt FROM complaint_supporters GROUP BY complaintId)')?.avg || 0, 1)
      }
    };
  }
};

module.exports = analyticsService;
