const db = require('../config/database');

const ADMIN_ROLES = ['admin', 'superadmin', 'department_admin'];
const OFFICER_ROLES = ['officer'];

const DEFAULT_PERMISSIONS = {
  superadmin: ['dashboard.view', 'complaint.read', 'complaint.update', 'complaint.resolve', 'complaint.manage', 'users.manage', 'roles.manage', 'departments.manage', 'analytics.view', 'heatmap.view', 'escalation.manage', 'settings.manage', 'feedback.view', 'chat.use', 'officer.manage'],
  admin: ['dashboard.view', 'complaint.read', 'complaint.update', 'complaint.resolve', 'complaint.manage', 'users.manage', 'departments.manage', 'analytics.view', 'heatmap.view', 'escalation.manage', 'settings.manage', 'feedback.view', 'chat.use'],
  department_admin: ['dashboard.view', 'complaint.read', 'complaint.update', 'complaint.resolve', 'heatmap.view', 'analytics.view', 'escalation.manage', 'chat.use'],
  officer: ['dashboard.view', 'complaint.read', 'complaint.update', 'complaint.resolve', 'chat.use'],
  user: ['complaint.read', 'chat.use']
};

const roleService = {
  ADMIN_ROLES,
  OFFICER_ROLES,

  isAdminRole(role) {
    return ADMIN_ROLES.includes(role);
  },

  isStaffRole(role) {
    return ADMIN_ROLES.includes(role) || OFFICER_ROLES.includes(role);
  },

  getAllRoles() {
    const roles = db.all('SELECT * FROM roles ORDER BY id');
    return roles.map(r => ({
      ...r,
      permissions: this.getPermissions(r.name)
    }));
  },

  getPermissions(role) {
    const rows = db.all('SELECT permission FROM role_permissions WHERE role = ?', [role]);
    return rows.map(r => r.permission);
  },

  hasPermission(role, permission) {
    if (role === 'superadmin') return true;
    return this.getPermissions(role).includes(permission);
  },

  setPermissions(role, permissions) {
    db.run('DELETE FROM role_permissions WHERE role = ?', [role]);
    const stmt = db.prepare('INSERT OR IGNORE INTO role_permissions (role, permission) VALUES (?, ?)');
    (permissions || []).forEach(p => stmt.run(role, p));
    stmt.free();
    db.saveDatabase();
    return this.getPermissions(role);
  },

  updateUserRole(userId, role, departmentId = null) {
    const user = db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    const validRoles = Object.keys(DEFAULT_PERMISSIONS);
    if (!validRoles.includes(role)) {
      const err = new Error('Invalid role');
      err.statusCode = 400;
      throw err;
    }
    const fields = ['role = ?'];
    const binds = [role];
    if (departmentId !== null && departmentId !== undefined) {
      fields.push('departmentId = ?');
      binds.push(departmentId || null);
    }
    binds.push(userId);
    db.run(`UPDATE users SET ${fields.join(', ')}, updatedAt = datetime('now','localtime') WHERE id = ?`, binds);
    db.saveDatabase();
    return db.get('SELECT id, userId, fullName, email, phone, role, departmentId, isActive, createdAt FROM users WHERE id = ?', [userId]);
  },

  getAllPermissionsList() {
    return [
      { key: 'dashboard.view', label: 'View Dashboard' },
      { key: 'complaint.read', label: 'Read Complaints' },
      { key: 'complaint.update', label: 'Update Complaint Status' },
      { key: 'complaint.resolve', label: 'Resolve Complaints' },
      { key: 'complaint.manage', label: 'Manage Complaints (delete, reassign)' },
      { key: 'users.manage', label: 'Manage Users' },
      { key: 'roles.manage', label: 'Manage Roles & Permissions' },
      { key: 'departments.manage', label: 'Manage Departments' },
      { key: 'analytics.view', label: 'View Analytics' },
      { key: 'heatmap.view', label: 'View Heatmap' },
      { key: 'escalation.manage', label: 'Manage Escalations' },
      { key: 'settings.manage', label: 'Manage Settings' },
      { key: 'feedback.view', label: 'View Feedback' },
      { key: 'chat.use', label: 'Use AI Chat Assistant' },
      { key: 'officer.manage', label: 'Manage Officers' }
    ];
  }
};

module.exports = roleService;
