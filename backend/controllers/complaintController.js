const complaintService = require('../services/complaintService');
const voiceComplaintService = require('../services/voiceComplaintService');
const speechService = require('../services/speechService');
const locationService = require('../services/locationService');
const response = require('../utils/responseHelper');

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

  getById(req, res, next) {
    try {
      const complaint = complaintService.getById(req.params.id);
      if (req.user.role !== 'admin' && complaint.userId !== req.user.id) {
        return response.forbidden(res, 'Not authorized to view this complaint');
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
