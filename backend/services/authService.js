const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const LoginHistory = require('../models/LoginHistory');
const smsService = require('./smsService');
const db = require('../config/database');
const jwtConfig = require('../config/jwt');
const logger = require('../utils/logger');

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_WINDOW = 15 * 60 * 1000;
const MAX_REQUESTS = 3;

const authService = {
  generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
  },

  async hashOtp(otp) {
    return bcrypt.hash(otp, 10);
  },

  cleanupExpiredOtps(phone) {
    db.run('DELETE FROM otp_verifications WHERE phone_number = ? AND expires_at <= datetime(\'now\', \'localtime\')', [phone]);
    db.saveDatabase();
  },

  countRecentRequests(phone) {
    const cutoff = new Date(Date.now() - MAX_REQUESTS_WINDOW).toISOString();
    return db.count(
      'SELECT COUNT(*) as count FROM otp_verifications WHERE phone_number = ? AND created_at >= ?',
      [phone, cutoff]
    );
  },

  async sendOtp(phone, meta = {}) {
    const user = User.findByPhone(phone);
    if (!user) {
      const err = new Error('Mobile number not registered');
      err.statusCode = 401;
      throw err;
    }
    if (user.role === 'admin') {
      const err = new Error('Administrator account detected. Please log in through the Admin Portal.');
      err.statusCode = 403;
      throw err;
    }
    if (!user.isActive) {
      const err = new Error('Account is deactivated. Contact administrator.');
      err.statusCode = 403;
      throw err;
    }

    this.cleanupExpiredOtps(phone);

    const recentCount = this.countRecentRequests(phone);
    if (recentCount >= MAX_REQUESTS) {
      const err = new Error('Too many OTP requests. Please try again after 15 minutes.');
      err.statusCode = 429;
      throw err;
    }

    const otp = this.generateOtp();
    const otpHash = await this.hashOtp(otp);

    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    db.run('DELETE FROM otp_verifications WHERE phone_number = ?', [phone]);
    db.run(
      'INSERT INTO otp_verifications (phone_number, otp_hash, expires_at, attempts) VALUES (?, ?, ?, 0)',
      [phone, otpHash, expiresAt]
    );
    db.saveDatabase();

    const maskedPhone = phone.slice(0, 2) + '****' + phone.slice(-2);

    const isLogProvider = process.env.SMS_PROVIDER === 'log';
    if (process.env.NODE_ENV === 'development' || isLogProvider) {
      logger.info(`[DEV OTP] OTP for +91${phone}: ${otp}`);
      return { maskedPhone, otp };
    }

    await smsService.sendOtp(phone, otp);
    return { maskedPhone };
  },

  async sendAdminOtp(phone, meta = {}) {
    const user = User.findByPhone(phone);
    if (!user) {
      const err = new Error('Admin not found with this mobile number');
      err.statusCode = 401;
      throw err;
    }
    if (user.role !== 'admin') {
      const err = new Error('Access denied. This portal is only for authorized administrators.');
      err.statusCode = 403;
      throw err;
    }
    if (!user.isActive) {
      const err = new Error('Admin account is deactivated');
      err.statusCode = 403;
      throw err;
    }

    this.cleanupExpiredOtps(phone);

    const recentCount = this.countRecentRequests(phone);
    if (recentCount >= MAX_REQUESTS) {
      const err = new Error('Too many OTP requests. Please try again after 15 minutes.');
      err.statusCode = 429;
      throw err;
    }

    const otp = this.generateOtp();
    const otpHash = await this.hashOtp(otp);

    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    db.run('DELETE FROM otp_verifications WHERE phone_number = ?', [phone]);
    db.run(
      'INSERT INTO otp_verifications (phone_number, otp_hash, expires_at, attempts) VALUES (?, ?, ?, 0)',
      [phone, otpHash, expiresAt]
    );
    db.saveDatabase();

    const maskedPhone = phone.slice(0, 2) + '****' + phone.slice(-2);

    const isLogProvider = process.env.SMS_PROVIDER === 'log';
    if (process.env.NODE_ENV === 'development' || isLogProvider) {
      logger.info(`[DEV OTP] Admin OTP for +91${phone}: ${otp}`);
      return { maskedPhone, otp };
    }

    await smsService.sendOtp(phone, otp);
    return { maskedPhone };
  },

  async verifyOtp(phone, otp, meta = {}) {
    this.cleanupExpiredOtps(phone);

    const otpRecord = db.get(
      'SELECT * FROM otp_verifications WHERE phone_number = ? ORDER BY created_at DESC LIMIT 1',
      [phone]
    );
    if (!otpRecord) {
      const err = new Error('No OTP found. Please request a new OTP.');
      err.statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    if (otpRecord.expires_at < now) {
      db.run('DELETE FROM otp_verifications WHERE id = ?', [otpRecord.id]);
      db.saveDatabase();
      const err = new Error('OTP has expired. Please request a new OTP.');
      err.statusCode = 410;
      throw err;
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      db.run('DELETE FROM otp_verifications WHERE id = ?', [otpRecord.id]);
      db.saveDatabase();
      const err = new Error('Maximum OTP verification attempts exceeded. Please request a new OTP.');
      err.statusCode = 429;
      throw err;
    }

    db.run('DELETE FROM otp_verifications WHERE id = ?', [otpRecord.id]);
    db.saveDatabase();

    const isMatch = await bcrypt.compare(otp, otpRecord.otp_hash);
    if (!isMatch) {
      const err = new Error('Invalid OTP. Please request a new OTP.');
      err.statusCode = 401;
      throw err;
    }

    const user = User.findByPhone(phone);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    LoginHistory.create({
      userId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    const token = this.generateToken(user);
    const { password: _, ...userData } = user;
    return { user: userData, token };
  },

  generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email || null, phone: user.phone, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
  },

  getProfile(userId) {
    const user = User.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    const { password, ...userData } = user;
    return userData;
  },

  async adminResetPassword(userId, newPassword) {
    const user = User.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    User.updatePassword(userId, hashedPassword);
    return 'Password reset successfully';
  },

  async loginAdmin(email, password, meta = {}) {
    const user = User.findByEmail(email);
    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }
    if (user.role !== 'admin') {
      const err = new Error('Access denied. Admin access required.');
      err.statusCode = 403;
      throw err;
    }
    if (!user.isActive) {
      const err = new Error('Account is deactivated. Contact administrator.');
      err.statusCode = 403;
      throw err;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    LoginHistory.create({
      userId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    const token = this.generateToken(user);
    const { password: _, ...userData } = user;
    return { user: userData, token };
  },

  getLoginHistory(userId) {
    return LoginHistory.findByUser(userId);
  },

  async register(data) {
    if (User.findByPhone(data.phone)) {
      const err = new Error('Phone number already registered');
      err.statusCode = 409;
      throw err;
    }

    const user = User.create({
      fullName: data.fullName,
      phone: data.phone,
      village: data.village,
      taluka: data.taluka || null,
      district: data.district || null,
      state: data.state || null,
      pincode: data.pincode || null
    });

    const token = this.generateToken(user);
    return { user, token };
  },

  logout(userId) {
    LoginHistory.updateLogout(userId);
  }
};

module.exports = authService;
