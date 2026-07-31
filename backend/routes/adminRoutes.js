const router = require('express').Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorizeAdmin, authorizeStaff } = require('../middleware/auth');
const { statusUpdateValidation, departmentValidation } = require('../middleware/validation');
const { uploadImages } = require('../config/multer');
const { handleUpload } = require('../middleware/upload');

router.use(authenticate, authorizeStaff);

router.get('/dashboard', adminController.getDashboard);

router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/status', adminController.toggleUserStatus);
router.put('/users/:id/role', adminController.updateRole);
router.delete('/users/:id', adminController.deleteUser);

router.get('/officers', adminController.getOfficers);
router.post('/officers', adminController.createOfficer);

router.get('/complaints', adminController.getComplaints);
router.get('/complaints/:id', adminController.getComplaintById);
router.put('/complaints/:id/status', statusUpdateValidation, adminController.updateComplaintStatus);
router.put('/complaints/:id/department', adminController.assignDepartment);
router.put('/complaints/:id/priority', adminController.updatePriority);
router.put('/complaints/:id/remarks', adminController.addRemarks);
router.post('/complaints/:id/resolution-image', uploadImages.single('resolutionImage'), adminController.uploadResolutionImage);
router.put('/complaints/:id/resolve', handleUpload, adminController.resolveComplaint);
router.put('/complaints/:id/ai-prediction', adminController.updateAiPrediction);
router.post('/complaints/:id/escalate', adminController.escalateComplaint);

router.get('/escalations', adminController.getEscalations);
router.get('/performance', adminController.getPerformance);
router.get('/departments/ranking', adminController.getDepartmentRanking);

router.get('/roles', adminController.getRoles);

router.get('/departments', adminController.getDepartments);
router.post('/departments', departmentValidation, adminController.createDepartment);
router.put('/departments/:id', adminController.updateDepartment);
router.delete('/departments/:id', adminController.deleteDepartment);

router.get('/analytics', adminController.getAnalytics);
router.get('/analytics/monthly', adminController.getMonthlyAnalytics);
router.get('/analytics/category', adminController.getCategoryAnalytics);
router.get('/analytics/status', adminController.getStatusAnalytics);
router.get('/analytics/department', adminController.getDepartmentAnalytics);

router.get('/reports/daily', adminController.getDailyReport);
router.get('/reports/weekly', adminController.getWeeklyReport);
router.get('/reports/monthly', adminController.getMonthlyReport);
router.get('/reports/yearly', adminController.getYearlyReport);
router.get('/reports/export/csv', adminController.exportCSV);
router.get('/reports/export/excel', adminController.exportExcel);

router.get('/search', adminController.search);

router.get('/feedback', adminController.getFeedback);
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;
