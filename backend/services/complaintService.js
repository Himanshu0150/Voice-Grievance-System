const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const { getPaginationParams } = require('../utils/paginationHelper');
const logger = require('../utils/logger');
const timelineService = require('./timelineService');
const impactService = require('./impactService');
const estimateService = require('./estimateService');
const escalationService = require('./escalationService');
const Department = require('../models/Department');

const complaintService = {
  create(data, files = {}) {
    const toBool = (v) => v === true || v === 'true' || v === '1' || v === 1;
    const complaintData = {
      userId: data.userId,
      category: data.category,
      title: data.title,
      description: data.description || null,
      voiceTranscript: data.voiceTranscript || null,
      speechLanguage: data.speechLanguage || 'hi-IN',
      address: data.address || null,
      priority: data.priority || 'Medium',
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      departmentId: data.departmentId || null,
      isAnonymous: toBool(data.isAnonymous) ? 1 : 0,
      estimatedResolutionDays: data.estimatedResolutionDays || null,
      impactScore: data.impactScore || null,
      prioritySource: data.prioritySource || 'ai'
    };

    if (files.audio && files.audio[0]) {
      complaintData.audioFile = `/uploads/audio/${files.audio[0].filename}`;
    }

    const complaint = Complaint.create(complaintData);

    if (files.images) {
      files.images.forEach(file => {
        Complaint.addImage(complaint.id, `/uploads/images/${file.filename}`);
      });
    }

    const supporterCount = 0;
    const impact = impactService.calculate(complaint, supporterCount);
    const eta = estimateService.estimateComplaint(complaint);
    Complaint.update(complaint.id, { impactScore: impact.score, priority: impact.priority, estimatedResolutionDays: eta });

    timelineService.add(complaint.id, 'Submitted', `Complaint ${complaint.complaintId} submitted by citizen`, data.userId, 'user');

    Notification.create({
      userId: data.userId,
      title: 'Complaint Submitted',
      message: `Your complaint "${data.title}" has been submitted successfully. Reference: ${complaint.complaintId}`,
      type: 'info'
    });

    Notification.create({
      userId,
      title: 'Complaint Submitted Successfully',
      message: `Your complaint has been registered. Reference: ${complaint.complaintId}. Category: ${complaintData.category}. Priority: ${complaintData.priority}.`,
      type: 'info'
    });

    if (complaintData.priority === 'Critical' || complaintData.priority === 'High') {
      Notification.create({
        userId: null,
        title: `${complaintData.priority} Priority Complaint`,
        message: `${complaintData.priority} priority complaint received: "${complaintData.title}" (${complaint.complaintId})`,
        type: 'warning'
      });
    }

    return this.formatComplaint(Complaint.findById(complaint.id));
  },

  getById(id) {
    const complaint = Complaint.findById(id) || Complaint.findByComplaintId(id);
    if (!complaint) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      throw err;
    }
    return this.formatComplaint(complaint);
  },

  anonymize(complaint) {
    if (!complaint) return complaint;
    if (complaint.isAnonymous) {
      complaint.userName = 'Anonymous Citizen';
      complaint.fullName = 'Anonymous Citizen';
      delete complaint.userPhone;
      delete complaint.userEmail;
      if (complaint.village) complaint.village = 'Not disclosed';
      if (complaint.taluka) complaint.taluka = 'Not disclosed';
    }
    return complaint;
  },

  anonymizeForUser(complaint, user) {
    if (!complaint || !complaint.isAnonymous) return complaint;
    if (!user) return this.anonymize(complaint);
    if (user.role === 'admin' || user.role === 'superadmin') return complaint;
    if (String(complaint.userId) === String(user.id)) return complaint;
    return this.anonymize(complaint);
  },

  getUserComplaints(userId, query) {
    const { page, limit, offset } = getPaginationParams(query);
    const result = Complaint.findAll({
      userId,
      search: query.search,
      status: query.status,
      category: query.category,
      sort: query.sort,
      limit,
      offset
    });
    return {
      complaints: result.complaints.map(c => this.formatComplaint(c)),
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    };
  },

  getAll(query) {
    const { page, limit, offset } = getPaginationParams(query);
    const result = Complaint.findAll({
      search: query.search,
      status: query.status,
      category: query.category,
      departmentId: query.departmentId,
      priority: query.priority,
      from: query.from,
      to: query.to,
      limit,
      offset
    });
    return {
      complaints: result.complaints.map(c => this.formatComplaint(c)),
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    };
  },

  getTimeline(id) {
    const complaint = Complaint.findById(id) || Complaint.findByComplaintId(id);
    if (!complaint) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      throw err;
    }
    timelineService.addStatusEvents(complaint);
    return timelineService.getByComplaint(complaint.id);
  },

  updateStatus(id, status, remark = null, priority = null, departmentId = undefined) {
    const complaint = Complaint.findById(id);
    if (!complaint) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      throw err;
    }
    const updated = Complaint.updateStatus(id, status, remark, priority, departmentId);

    const statusNotifications = {
      'Assigned': { title: 'Complaint Assigned', type: 'info' },
      'Accepted': { title: 'Complaint Accepted', type: 'info' },
      'Work Started': { title: 'Work Started', type: 'info' },
      'Inspection': { title: 'Inspection Scheduled', type: 'info' },
      'In Progress': { title: 'Status Updated', type: 'info' },
      'Resolved': { title: 'Complaint Resolved', type: 'success' },
      'Rejected': { title: 'Complaint Rejected', type: 'warning' }
    };

    const notif = statusNotifications[status] || { title: 'Status Updated', type: 'info' };
    Notification.create({
      userId: complaint.userId,
      title: notif.title,
      message: `Your complaint "${complaint.title}" status updated to ${status}.${remark ? ` Remarks: ${remark}` : ''}`,
      type: notif.type
    });

    const updatedWithDept = Complaint.findById(id);
    timelineService.addStatusEvents(updatedWithDept, null, 'admin');
    if (status === 'Resolved') escalationService.resolveEscalations(id);

    return this.formatComplaint(updated);
  },

  resolve(id, data, files) {
    const complaint = Complaint.findById(id);
    if (!complaint) {
      const err = new Error('Complaint not found');
      err.statusCode = 404;
      throw err;
    }
    const updated = Complaint.updateStatus(id, 'Resolved', data.remarks || null);
    if (files.resolution_images) {
      files.resolution_images.forEach(file => {
        Complaint.addResolutionImage(id, `/uploads/images/${file.filename}`);
      });
    }
    escalationService.resolveEscalations(id);
    const updatedWithDept = Complaint.findById(id);
    timelineService.addStatusEvents(updatedWithDept, null, 'admin');
    Notification.create({
      userId: complaint.userId,
      title: 'Complaint Resolved',
      message: `Your complaint "${complaint.title}" has been resolved.`,
      type: 'success'
    });
    return this.formatComplaint(Complaint.findById(id));
  },

  update(id, data) {
    const complaint = Complaint.update(id, data);
    return this.formatComplaint(complaint);
  },

  remove(id) {
    Complaint.delete(id);
  },

  getStats(userId) {
    return Complaint.getStatsByUser(userId);
  },

  getOverallStats() {
    return Complaint.getOverallStats();
  },

  createVoiceComplaint(data, files = {}) {
    const complaintData = {
      userId: data.userId,
      category: data.category || data.detectedCategory,
      title: data.title || 'Voice Complaint',
      description: data.description || data.englishTranslation || null,
      voiceTranscript: data.voiceTranscript || data.originalText || null,
      speechLanguage: data.speechLanguage || 'hi-IN',
      address: data.address || null,
      priority: data.priority || 'Medium',
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      departmentId: data.departmentId || null,
      originalLanguage: data.originalLanguage || data.speechLanguage,
      originalText: data.originalText || data.voiceTranscript,
      englishTranslation: data.englishTranslation,
      aiSummary: data.aiSummary,
      detectedCategory: data.detectedCategory || data.category,
      aiConfidence: data.aiConfidence,
      aiKeywords: data.aiKeywords,
      aiProcessed: data.aiProcessed || 0,
      needsManualReview: data.needsManualReview || 0,
      suggestedAction: data.suggestedAction || null,
      officerRecommendation: data.officerRecommendation || null,
      estimatedResolutionDays: data.estimatedResolutionDays || null,
      impactScore: data.impactScore || null,
      prioritySource: data.prioritySource || 'ai',
      isAnonymous: data.isAnonymous ? 1 : 0,
      similarComplaintId: data.similarComplaintId || null
    };

    const complaint = Complaint.createVoice(complaintData);

    if (files.images) {
      files.images.forEach(file => {
        Complaint.addImage(complaint.id, `/uploads/images/${file.filename}`);
      });
    }

    if (files.audio && files.audio[0]) {
      Complaint.updateAudio(complaint.id, `/uploads/audio/${files.audio[0].filename}`);
    }

    const supporterCount = 0;
    const impact = impactService.calculate(complaint, supporterCount);
    const eta = estimateService.estimateComplaint(complaint, complaintData.priority);
    Complaint.update(complaint.id, { impactScore: impact.score, priority: impact.priority, estimatedResolutionDays: eta });

    timelineService.add(complaint.id, 'Submitted', `Complaint ${complaint.complaintId} submitted by citizen`, data.userId, 'user');
    if (complaintData.aiProcessed) {
      timelineService.add(complaint.id, 'AI Processed', `AI classified as ${complaintData.category} (${complaintData.priority}) with ${Math.round((complaintData.aiConfidence || 0) * 100)}% confidence`, null, 'ai');
    }

    logger.info(`Voice complaint created: ${complaint.complaintId}, category: ${complaintData.category}, confidence: ${complaintData.aiConfidence}`);
    return this.formatComplaint(Complaint.findById(complaint.id));
  },

  formatComplaint(complaint) {
    if (!complaint) return null;
    if (complaint.images) {
      complaint.images = complaint.images.map(img => img.imagePath);
    }
    if (complaint.latitude && complaint.longitude) {
      complaint.location = { latitude: complaint.latitude, longitude: complaint.longitude };
    }

    // Ensure AI fields always have safe defaults for old complaints
    if (complaint.aiKeywords != null) {
      if (typeof complaint.aiKeywords === 'string') {
        try { complaint.aiKeywords = JSON.parse(complaint.aiKeywords); }
        catch { complaint.aiKeywords = []; }
      } else if (!Array.isArray(complaint.aiKeywords)) {
        complaint.aiKeywords = [];
      }
    } else {
      complaint.aiKeywords = [];
    }

    complaint.aiProcessed = complaint.aiProcessed || 0;
    complaint.needsManualReview = complaint.needsManualReview || 0;
    complaint.aiConfidence = complaint.aiConfidence != null ? complaint.aiConfidence : null;
    complaint.aiSummary = complaint.aiSummary || null;
    complaint.detectedCategory = complaint.detectedCategory || null;
    complaint.originalLanguage = complaint.originalLanguage || complaint.speechLanguage || null;
    complaint.suggestedAction = complaint.suggestedAction || null;
    complaint.officerRecommendation = complaint.officerRecommendation || null;
    complaint.estimatedResolutionDays = complaint.estimatedResolutionDays != null ? complaint.estimatedResolutionDays : estimateService.estimateForCategory(complaint.category);
    complaint.impactScore = complaint.impactScore != null ? complaint.impactScore : null;
    complaint.supporterCount = complaint.supporterCount || 0;
    complaint.isAnonymous = !!complaint.isAnonymous;
    complaint.estimatedCompletionDate = complaint.createdAt && complaint.estimatedResolutionDays
      ? (() => {
          const d = new Date(complaint.createdAt.replace(' ', 'T'));
          d.setDate(d.getDate() + complaint.estimatedResolutionDays);
          return d.toISOString().slice(0, 10);
        })()
      : null;

    complaint.ageInDays = complaint.createdAt
      ? Math.max(0, Math.floor((Date.now() - new Date(complaint.createdAt.replace(' ', 'T')).getTime()) / 86400000))
      : 0;

    // Compute whether translation was actually performed
    if (complaint.aiProcessed) {
      const lang = (complaint.originalLanguage || complaint.speechLanguage || '').toLowerCase();
      const isEnglish = lang === 'en' || lang === 'en-in';
      const hasDifferentEnglish = complaint.englishTranslation &&
        complaint.originalText &&
        complaint.englishTranslation !== complaint.originalText;
      complaint.translationAvailable = isEnglish || !!hasDifferentEnglish;
    } else {
      complaint.translationAvailable = true;
    }

    return complaint;
  }
};

module.exports = complaintService;
