const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const db = require('../config/database');

const analyticsService = {
  getDashboardStats() {
    const stats = Complaint.getOverallStats();
    const aiPendingReview = db.count("SELECT COUNT(*) as count FROM complaints WHERE needsManualReview = 1 AND status = 'Pending'");
    const highPriority = db.count("SELECT COUNT(*) as count FROM complaints WHERE priority = 'High' AND status != 'Resolved'");
    const avgConfidence = db.get("SELECT COALESCE(AVG(aiConfidence), 0) as avg FROM complaints WHERE aiConfidence IS NOT NULL");
    return {
      totalUsers: User.countByRole('user'),
      totalComplaints: stats.total,
      pending: stats.pending,
      inProgress: stats.inProgress,
      resolved: stats.resolved,
      rejected: stats.rejected,
      resolutionRate: stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : 0,
      aiPendingReview,
      highPriority,
      avgConfidence: avgConfidence?.avg || 0
    };
  },

  getFullAnalytics() {
    const stats = Complaint.getOverallStats();
    return {
      total: stats.total,
      pending: stats.pending,
      inProgress: stats.inProgress,
      resolved: stats.resolved,
      rejected: stats.rejected,
      monthlyStats: Complaint.getMonthlyStats(),
      departmentStats: Complaint.getDepartmentStats(),
      categoryStats: Complaint.getCategoryStats(),
      villageStats: Complaint.getVillageStats(),
      averageRating: Feedback.getAverageRating().average || 0,
      totalFeedbacks: Feedback.getAverageRating().total || 0,
      aiPendingReview: db.count("SELECT COUNT(*) as count FROM complaints WHERE needsManualReview = 1 AND status = 'Pending'"),
      highPriority: db.count("SELECT COUNT(*) as count FROM complaints WHERE priority = 'High' AND status != 'Resolved'"),
      avgConfidence: db.get("SELECT COALESCE(AVG(aiConfidence), 0) as avg FROM complaints WHERE aiConfidence IS NOT NULL")?.avg || 0
    };
  }
};

module.exports = analyticsService;
