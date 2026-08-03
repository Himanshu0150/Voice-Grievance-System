const complaintService = require('../services/complaintService');
const voiceComplaintService = require('../services/voiceComplaintService');
const speechService = require('../services/speechService');
const locationService = require('../services/locationService');
const similarityService = require('../services/similarityService');
const supportService = require('../services/supportService');
const translationService = require('../services/translationService');
const aiProvider = require('../services/aiProvider');
const roleService = require('../services/roleService');
const db = require('../config/database');
const response = require('../utils/responseHelper');
const logger = require('../utils/logger');

const complaintController = {
  create(req, res, next) {
    try {
      const data = {
        ...req.body,
        userId: req.user.id,
        speechLanguage: req.body.speechLanguage || 'hi-IN'
      };

      if (!data.category && req.body.voiceTranscript) {
        data.category = speechService.categorizeByKeywords(req.body.voiceTranscript);
      }

      const location = locationService.processLocation(req.body.latitude, req.body.longitude);
      if (location) {
        data.latitude = location.latitude;
        data.longitude = location.longitude;
      }

      const complaint = complaintService.create(data, req.files || {});
      return response.created(res, complaint, 'Complaint submitted successfully');
    } catch (err) {
      next(err);
    }
  },

  async createVoice(req, res, next) {
    try {
      const data = {
        ...req.body,
        userId: req.user.id,
        speechLanguage: req.body.speechLanguage || 'hi-IN'
      };

      const location = locationService.processLocation(req.body.latitude, req.body.longitude);
      if (location) {
        data.latitude = location.latitude;
        data.longitude = location.longitude;
      }

      const result = await voiceComplaintService.processVoiceComplaint(data, req.files || {});
      return response.created(res, result, 'Voice complaint submitted and processed successfully');
    } catch (err) {
      next(err);
    }
  },

  async checkSimilarity(req, res, next) {
    try {
      const { text, speechLanguage, includeSuggestions } = req.body;
      if (!text || !text.trim()) {
        return response.badRequest(res, 'Complaint text is required');
      }

      let englishText = text;
      let translationAvailable = false;
      const lang = (speechLanguage || 'en-IN').toLowerCase();
      if (lang !== 'en' && lang !== 'en-in') {
        const result = await translationService.translateToEnglish(text, speechLanguage || 'hi-IN');
        englishText = result.englishTranslation || text;
        translationAvailable = result.translationAvailable;
      } else {
        translationAvailable = true;
      }

      const result = await similarityService.findSimilar(englishText);

      let suggestions = null;
      if (includeSuggestions && aiProvider.isConfigured()) {
        try {
          suggestions = await aiProvider.generateSolutionSuggestions(englishText);
        } catch (err) {
          logger.warn(`[AI SUGGEST] Skipped: ${err.message}`);
        }
      }

      return response.success(res, {
        ...result,
        translatedText: englishText,
        translationAvailable,
        suggestions
      }, 'Similarity check complete');
    } catch (err) {
      next(err);
    }
  },

  async toggleSupport(req, res, next) {
    try {
      const complaint = complaintService.getById(req.params.id);
      if (complaint.userId === req.user.id) {
        return response.badRequest(res, 'You cannot support your own complaint');
      }
      const result = await supportService.toggle(req.params.id, req.user.id);
      return response.success(res, result, result.supported ? 'Complaint supported' : 'Support removed');
    } catch (err) {
      next(err);
    }
  },

  async joinComplaint(req, res, next) {
    try {
      const complaint = complaintService.getById(req.params.id);
      if (complaint.userId === req.user.id) {
        return response.badRequest(res, 'You cannot join your own complaint');
      }
      const result = await supportService.join(req.params.id, req.user.id);
      return response.success(res, result, 'You joined this complaint');
    } catch (err) {
      next(err);
    }
  },

  getTimeline(req, res, next) {
    try {
      const complaint = complaintService.getById(req.params.id);
      if (!roleService.isStaffRole(req.user.role) && complaint.userId !== req.user.id) {
        return response.forbidden(res, 'Not authorized to view this complaint');
      }
      const timeline = complaintService.getTimeline(complaint.id);
      return response.success(res, timeline);
    } catch (err) {
      next(err);
    }
  },

  getHeatmap(req, res, next) {
    try {
      const binds = [];
      let sql = `SELECT c.id, c.complaintId, c.title, c.category, c.status, c.priority,
        c.latitude, c.longitude, c.address, c.impactScore, c.createdAt, d.departmentName,
        (SELECT COUNT(*) FROM complaint_supporters s WHERE s.complaintId = c.id) as supporterCount
        FROM complaints c
        LEFT JOIN departments d ON c.departmentId = d.id
        WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL`;
      if (req.query.category) { sql += ' AND c.category = ?'; binds.push(req.query.category); }
      if (req.query.priority) { sql += ' AND c.priority = ?'; binds.push(req.query.priority); }
      if (req.query.status) { sql += ' AND c.status = ?'; binds.push(req.query.status); }
      if (req.query.departmentId) { sql += ' AND c.departmentId = ?'; binds.push(req.query.departmentId); }
      if (req.query.from) { sql += ' AND c.createdAt >= ?'; binds.push(req.query.from); }
      if (req.query.to) { sql += ' AND c.createdAt <= ?'; binds.push(req.query.to); }
      sql += ' ORDER BY c.createdAt DESC LIMIT 500';
      const complaints = db.all(sql, binds);
      return response.success(res, complaints);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const complaint = complaintService.getById(req.params.id);
      if (!roleService.isStaffRole(req.user.role) && complaint.userId !== req.user.id) {
        return response.forbidden(res, 'Not authorized to view this complaint');
      }
      complaintService.anonymizeForUser(complaint, req.user);
      const langCode = translationService.getLanguageCode(req.query.lang);
      if (langCode && langCode !== 'en' && aiProvider.isConfigured()) {
        const [title, aiSummary] = await Promise.all([
          translationService.translateText(complaint.title, langCode),
          translationService.translateText(complaint.aiSummary, langCode)
        ]);
        if (title) complaint.title = title;
        if (aiSummary) complaint.aiSummary = aiSummary;
      }
      return response.success(res, complaint);
    } catch (err) {
      next(err);
    }
  },

  getUserComplaints(req, res, next) {
    try {
      const result = complaintService.getUserComplaints(req.user.id, req.query);
      return response.success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const complaint = complaintService.getById(req.params.id);
      if (complaint.userId !== req.user.id) {
        return response.forbidden(res, 'Not authorized to edit this complaint');
      }
      if (complaint.status !== 'Pending') {
        return response.badRequest(res, 'Only pending complaints can be edited');
      }
      const { title, description, category, address, latitude, longitude } = req.body;
      const updated = complaintService.update(req.params.id, { title, description, category, address, latitude, longitude });
      return response.success(res, updated, 'Complaint updated');
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const complaint = complaintService.getById(req.params.id);
      if (complaint.userId !== req.user.id) {
        return response.forbidden(res, 'Not authorized to delete this complaint');
      }
      if (complaint.status !== 'Pending') {
        return response.badRequest(res, 'Only pending complaints can be deleted');
      }
      complaintService.remove(req.params.id);
      return response.success(res, null, 'Complaint deleted');
    } catch (err) {
      next(err);
    }
  },

  getStats(req, res, next) {
    try {
      const stats = complaintService.getStats(req.user.id);
      return response.success(res, stats);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = complaintController;
