const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');
const Department = require('../models/Department');
const Settings = require('../models/Settings');
const analyticsService = require('../services/analyticsService');
const complaintService = require('../services/complaintService');
const reportService = require('../services/reportService');
const response = require('../utils/responseHelper');
const { getPaginationParams } = require('../utils/paginationHelper');
const { sanitizeString } = require('../utils/validationHelper');

const adminController = {
  getDashboard(req, res, next) {
    try {
      const stats = analyticsService.getDashboardStats();
      const latestComplaints = Complaint.getLatest(5);
      const monthlyStats = Complaint.getMonthlyStats();
      const departmentStats = Complaint.getDepartmentStats();
      return response.success(res, { ...stats, latestComplaints, monthlyStats, departmentStats });
    } catch (err) {
      next(err);
    }
  },

  getUsers(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const search = req.query.search ? sanitizeString(req.query.search) : null;
      const result = User.findAll({ search, limit, offset });
      return response.paginated(res, result.users, result.total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  getUserById(req, res, next) {
    try {
      const user = User.findById(req.params.id);
      if (!user) return response.notFound(res, 'User not found');
      const { password, ...userData } = user;
      const stats = Complaint.getStatsByUser(req.params.id);
      return response.success(res, { ...userData, stats });
    } catch (err) {
      next(err);
    }
  },

  toggleUserStatus(req, res, next) {
    try {
      const user = User.toggleStatus(req.params.id);
      if (!user) return response.notFound(res, 'User not found');
      return response.success(res, user, 'User status updated');
    } catch (err) {
      next(err);
    }
  },

  deleteUser(req, res, next) {
    try {
      const user = User.findById(req.params.id);
      if (!user) return response.notFound(res, 'User not found');
      User.delete(req.params.id);
      return response.success(res, null, 'User deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  getComplaints(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const result = Complaint.findAll({
        search: req.query.search,
        status: req.query.status,
        category: req.query.category,
        departmentId: req.query.departmentId,
        village: req.query.village,
        priority: req.query.priority,
        userId: req.query.userId,
        from: req.query.from,
        to: req.query.to,
        sort: req.query.sort,
        limit,
        offset
      });
      return response.paginated(res, result.complaints, result.total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  getComplaintById(req, res, next) {
    try {
      const complaint = complaintService.getById(req.params.id);
      return response.success(res, complaint);
    } catch (err) {
      next(err);
    }
  },

  updateComplaintStatus(req, res, next) {
    try {
      const complaint = complaintService.updateStatus(req.params.id, req.body.status, req.body.remarks, req.body.priority, req.body.departmentId);
      return response.success(res, complaint, 'Status updated');
    } catch (err) {
      next(err);
    }
  },

  assignDepartment(req, res, next) {
    try {
      const complaint = complaintService.getById(req.params.id);
      const dept = Department.findById(req.body.departmentId);
      if (!dept) return response.notFound(res, 'Department not found');
      const updated = complaintService.updateStatus(req.params.id, undefined, null, null, req.body.departmentId);
      return response.success(res, updated, 'Department assigned');
    } catch (err) {
      next(err);
    }
  },

  updatePriority(req, res, next) {
    try {
      if (!['Low', 'Medium', 'High'].includes(req.body.priority)) {
        return response.badRequest(res, 'Priority must be Low, Medium, or High');
      }
      const updated = complaintService.updateStatus(req.params.id, undefined, null, req.body.priority);
      return response.success(res, updated, 'Priority updated');
    } catch (err) {
      next(err);
    }
  },

  addRemarks(req, res, next) {
    try {
      if (!req.body.remarks || !req.body.remarks.trim()) {
        return response.badRequest(res, 'Remarks are required');
      }
      const updated = complaintService.updateStatus(req.params.id, undefined, req.body.remarks);
      return response.success(res, updated, 'Remarks added');
    } catch (err) {
      next(err);
    }
  },

  uploadResolutionImage(req, res, next) {
    try {
      if (!req.file) return response.badRequest(res, 'No image uploaded');
      const imagePath = `/uploads/images/${req.file.filename}`;
      Complaint.addResolutionImage(req.params.id, imagePath);
      return response.success(res, { path: imagePath }, 'Resolution image uploaded');
    } catch (err) {
      next(err);
    }
  },

  resolveComplaint(req, res, next) {
    try {
      const complaint = complaintService.resolve(req.params.id, req.body, req.files || {});
      return response.success(res, complaint, 'Complaint resolved');
    } catch (err) {
      next(err);
    }
  },

  updateAiPrediction(req, res, next) {
    try {
      const { category, department, priority, confidence } = req.body;
      const complaint = Complaint.findById(req.params.id);
      if (!complaint) return response.notFound(res, 'Complaint not found');
      const updated = Complaint.update(req.params.id, {
        detectedCategory: category || complaint.detectedCategory,
        category: category || complaint.category,
        aiConfidence: confidence !== undefined ? confidence : complaint.aiConfidence,
        priority: priority || complaint.priority,
        needsManualReview: 0
      });
      const complaintWithDept = Complaint.findById(req.params.id);
      if (department && department !== (complaintWithDept.departmentName || '')) {
        const dept = Department.findByName(department);
        if (dept) {
          Complaint.update(req.params.id, { departmentId: dept.id });
        }
      }
      return response.success(res, Complaint.findById(req.params.id), 'AI prediction updated');
    } catch (err) {
      next(err);
    }
  },

  getAnalytics(req, res, next) {
    try {
      const analytics = analyticsService.getFullAnalytics();
      return response.success(res, analytics);
    } catch (err) {
      next(err);
    }
  },

  getMonthlyAnalytics(req, res, next) {
    try {
      return response.success(res, Complaint.getMonthlyStats());
    } catch (err) {
      next(err);
    }
  },

  getCategoryAnalytics(req, res, next) {
    try {
      return response.success(res, Complaint.getCategoryStats());
    } catch (err) {
      next(err);
    }
  },

  getStatusAnalytics(req, res, next) {
    try {
      return response.success(res, Complaint.getOverallStats());
    } catch (err) {
      next(err);
    }
  },

  getDepartmentAnalytics(req, res, next) {
    try {
      return response.success(res, Complaint.getDepartmentStats());
    } catch (err) {
      next(err);
    }
  },

  getDailyReport(req, res, next) {
    try {
      const report = reportService.getDailyReport();
      return response.success(res, report);
    } catch (err) {
      next(err);
    }
  },

  getWeeklyReport(req, res, next) {
    try {
      const report = reportService.getWeeklyReport();
      return response.success(res, report);
    } catch (err) {
      next(err);
    }
  },

  getMonthlyReport(req, res, next) {
    try {
      const report = reportService.getMonthlyReport();
      return response.success(res, report);
    } catch (err) {
      next(err);
    }
  },

  getYearlyReport(req, res, next) {
    try {
      const report = reportService.getYearlyReport();
      return response.success(res, report);
    } catch (err) {
      next(err);
    }
  },

  exportCSV(req, res, next) {
    try {
      const csv = reportService.exportCSV(req.query);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=grievance-report-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },

  exportExcel(req, res, next) {
    try {
      const buffer = reportService.exportExcel(req.query);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=grievance-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  search(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { keyword, category, status, departmentId, village, priority } = req.query;
      const result = Complaint.findAll({
        search: keyword || sanitizeString(req.query.search),
        category,
        status: status || undefined,
        departmentId: departmentId || undefined,
        village,
        priority: priority || undefined,
        limit,
        offset
      });
      return response.paginated(res, result.complaints, result.total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  getFeedback(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const result = Feedback.findAll({ limit, offset });
      return response.paginated(res, result.feedbacks, result.total, page, limit);
    } catch (err) {
      next(err);
    }
  },

  getSettings(req, res, next) {
    try {
      const settings = Settings.getAll();
      return response.success(res, settings);
    } catch (err) {
      next(err);
    }
  },

  updateSettings(req, res, next) {
    try {
      Settings.updateAll(req.body);
      const settings = Settings.getAll();
      return response.success(res, settings, 'Settings updated');
    } catch (err) {
      next(err);
    }
  },

  getDepartments(req, res, next) {
    try {
      const departments = Department.findAll();
      return response.success(res, departments);
    } catch (err) {
      next(err);
    }
  },

  createDepartment(req, res, next) {
    try {
      const existing = Department.findByName(req.body.departmentName);
      if (existing) return response.conflict(res, 'Department already exists');
      const dept = Department.create(req.body);
      return response.created(res, dept, 'Department created');
    } catch (err) {
      next(err);
    }
  },

  updateDepartment(req, res, next) {
    try {
      const dept = Department.findById(req.params.id);
      if (!dept) return response.notFound(res, 'Department not found');
      if (req.body.departmentName) {
        const existing = Department.findByName(req.body.departmentName);
        if (existing && existing.id !== parseInt(req.params.id)) return response.conflict(res, 'Department name already taken');
      }
      const updated = Department.update(req.params.id, req.body);
      return response.success(res, updated, 'Department updated');
    } catch (err) {
      next(err);
    }
  },

  deleteDepartment(req, res, next) {
    try {
      const dept = Department.findById(req.params.id);
      if (!dept) return response.notFound(res, 'Department not found');
      Department.delete(req.params.id);
      return response.success(res, null, 'Department deleted');
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminController;
