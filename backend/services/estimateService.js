const Settings = require('../models/Settings');
const logger = require('../utils/logger');

const DEFAULT_ESTIMATES = {
  'Road': 3, 'Water Supply': 1, 'Garbage': 2, 'Drainage': 2, 'Street Light': 2,
  'Electricity': 2, 'Sanitation': 2, 'Health': 2, 'Education': 4, 'Agriculture': 5,
  'Public Property': 5, 'Government Office': 7, 'Traffic': 3, 'Environment': 4, 'Others': 7
};

const estimateService = {
  getEstimates() {
    try {
      const stored = Settings.get('resolution_estimates');
      if (stored) return { ...DEFAULT_ESTIMATES, ...JSON.parse(stored) };
    } catch (err) {
      logger.warn(`[ESTIMATE] Failed to parse stored estimates: ${err.message}`);
    }
    return { ...DEFAULT_ESTIMATES };
  },

  estimateForCategory(category) {
    const estimates = this.getEstimates();
    return estimates[category] || estimates['Others'] || 7;
  },

  estimateComplaint(complaint, priority = null) {
    let days = this.estimateForCategory(complaint.category || 'Others');
    const p = (priority || complaint.priority || 'Medium').toLowerCase();
    if (p === 'critical' || p === 'high') days = Math.max(1, Math.round(days * 0.7));
    if (p === 'low') days = Math.round(days * 1.2);
    return days;
  },

  estimateCompletionDate(complaint) {
    const days = this.estimateComplaint(complaint);
    const base = complaint.createdAt
      ? new Date(complaint.createdAt.replace(' ', 'T'))
      : new Date();
    base.setDate(base.getDate() + days);
    return base.toISOString().slice(0, 10);
  },

  updateEstimates(estimates) {
    Settings.set('resolution_estimates', JSON.stringify(estimates));
    return this.getEstimates();
  }
};

module.exports = estimateService;
