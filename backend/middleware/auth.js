const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const roleService = require('../services/roleService');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}

function authorizeAdmin(req, res, next) {
  if (!req.user || !roleService.isAdminRole(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}

function authorizeStaff(req, res, next) {
  if (!req.user || !roleService.isStaffRole(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Staff access required'
    });
  }
  next();
}

function authorizeUser(req, res, next) {
  if (!req.user || req.user.role !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'User access required'
    });
  }
  next();
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this role'
      });
    }
    next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    if (!roleService.hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        message: `Missing permission: ${permission}`
      });
    }
    next();
  };
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, jwtConfig.secret);
      req.user = decoded;
    } catch {
    }
  }
  next();
}

module.exports = { authenticate, authorizeAdmin, authorizeStaff, authorizeUser, authorizeRoles, requirePermission, optionalAuth };
