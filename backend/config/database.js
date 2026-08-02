const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const bcrypt = require('bcrypt');

let db = null;

async function getDatabase() {
  if (db) return db;
  const SQL = await initSqlJs();
  const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './database/grievance.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');
  return db;
}

function saveDatabase() {
  if (!db) return;
  const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './database/grievance.db');
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.run();
  stmt.free();
}

function get(sql, params = []) {
  if (!db) return null;
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  if (!db) return [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function count(sql, params = []) {
  if (!db) return 0;
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row.count || row['COUNT(*)'] || 0;
  }
  stmt.free();
  return 0;
}

function exec(sql) {
  if (!db) return [];
  return db.exec(sql);
}

function lastInsertId() {
  if (!db) return 0;
  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0]?.values[0][0] || 0;
}

async function initializeDatabase() {
  const SQL = await initSqlJs();
  const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './database/grievance.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');

  db.run(`CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    departmentName TEXT UNIQUE NOT NULL,
    description TEXT,
    createdAt TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT UNIQUE,
    fullName TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE NOT NULL,
    password TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
    departmentId INTEGER,
    village TEXT,
    taluka TEXT,
    district TEXT,
    state TEXT,
    pincode TEXT,
    profileImage TEXT,
    isActive INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now','localtime')),
    updatedAt TEXT DEFAULT (datetime('now','localtime'))
  )`);

  const userTableCols = db.exec("PRAGMA table_info(users)")[0]?.values || [];
  const emailCol = userTableCols.find(c => c[1] === 'email');
  if (emailCol && emailCol[3] === 1) {
    db.run("CREATE TABLE users_migrated (id INTEGER PRIMARY KEY AUTOINCREMENT, userId TEXT UNIQUE, fullName TEXT NOT NULL, email TEXT UNIQUE, phone TEXT UNIQUE NOT NULL, password TEXT, role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')), village TEXT, taluka TEXT, district TEXT, state TEXT, pincode TEXT, profileImage TEXT, isActive INTEGER NOT NULL DEFAULT 1, createdAt TEXT DEFAULT (datetime('now','localtime')), updatedAt TEXT DEFAULT (datetime('now','localtime')))");
    db.run("INSERT INTO users_migrated (id, userId, fullName, email, phone, password, role, village, taluka, district, state, pincode, profileImage, isActive, createdAt, updatedAt) SELECT id, userId, fullName, email, phone, password, role, village, taluka, district, state, pincode, profileImage, isActive, createdAt, updatedAt FROM users");
    db.run("DROP TABLE users");
    db.run("ALTER TABLE users_migrated RENAME TO users");
    db.exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)");
    console.log('[DB] Migrated users table: email and password are now nullable');
  }

  const userCols = db.exec("PRAGMA table_info(users)")[0]?.values || [];
  const hasDeptCol = userCols.some(c => c[1] === 'departmentId');
  if (!hasDeptCol) {
    db.run(`CREATE TABLE users_migrated_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT UNIQUE,
      fullName TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE NOT NULL,
      password TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin','superadmin','department_admin','officer')),
      departmentId INTEGER,
      village TEXT,
      taluka TEXT,
      district TEXT,
      state TEXT,
      pincode TEXT,
      profileImage TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now','localtime')),
      updatedAt TEXT DEFAULT (datetime('now','localtime'))
    )`);
    db.run("INSERT INTO users_migrated_v2 (id, userId, fullName, email, phone, password, role, departmentId, village, taluka, district, state, pincode, profileImage, isActive, createdAt, updatedAt) SELECT id, userId, fullName, email, phone, password, role, NULL, village, taluka, district, state, pincode, profileImage, isActive, createdAt, updatedAt FROM users");
    db.run("DROP TABLE users");
    db.run("ALTER TABLE users_migrated_v2 RENAME TO users");
    db.exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)");
    console.log('[DB] Migrated users table v2: extended roles (superadmin, department_admin, officer) and added departmentId');
  }

  db.run(`CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaintId TEXT UNIQUE NOT NULL,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    departmentId INTEGER,
    description TEXT,
    voiceTranscript TEXT,
    speechLanguage TEXT DEFAULT 'hi-IN',
    audioFile TEXT,
    latitude REAL,
    longitude REAL,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','In Progress','Resolved','Rejected')),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('Low','Medium','High')),
    resolutionRemark TEXT,
    resolvedImage TEXT,
    resolvedAt TEXT,
    createdAt TEXT DEFAULT (datetime('now','localtime')),
    updatedAt TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE SET NULL
  )`);

  const complaintCols = db.exec("PRAGMA table_info(complaints)")[0]?.values || [];
  const hasSpeechLang = complaintCols.some(c => c[1] === 'speechLanguage');
  if (!hasSpeechLang) {
    db.run("ALTER TABLE complaints ADD COLUMN speechLanguage TEXT DEFAULT 'hi-IN'");
    console.log('[DB] Migrated complaints table: added speechLanguage column');
  }
  const hasAiProcessed = complaintCols.some(c => c[1] === 'aiProcessed');
  if (!hasAiProcessed) {
    db.run("ALTER TABLE complaints ADD COLUMN originalLanguage TEXT");
    db.run("ALTER TABLE complaints ADD COLUMN originalText TEXT");
    db.run("ALTER TABLE complaints ADD COLUMN englishTranslation TEXT");
    db.run("ALTER TABLE complaints ADD COLUMN aiSummary TEXT");
    db.run("ALTER TABLE complaints ADD COLUMN detectedCategory TEXT");
    db.run("ALTER TABLE complaints ADD COLUMN aiConfidence REAL");
    db.run("ALTER TABLE complaints ADD COLUMN aiKeywords TEXT");
    db.run("ALTER TABLE complaints ADD COLUMN aiProcessed INTEGER DEFAULT 0");
    db.run("ALTER TABLE complaints ADD COLUMN needsManualReview INTEGER DEFAULT 0");
    db.run("ALTER TABLE complaints ADD COLUMN suggestedAction TEXT");
    console.log('[DB] Migrated complaints table: added AI columns');
  }

  const complaintColsV3 = db.exec("PRAGMA table_info(complaints)")[0]?.values || [];
  const hasIsAnonymous = complaintColsV3.some(c => c[1] === 'isAnonymous');
  if (!hasIsAnonymous) {
    db.run(`CREATE TABLE complaints_migrated_v3 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaintId TEXT UNIQUE NOT NULL,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      departmentId INTEGER,
      description TEXT,
      voiceTranscript TEXT,
      speechLanguage TEXT DEFAULT 'hi-IN',
      audioFile TEXT,
      latitude REAL,
      longitude REAL,
      address TEXT,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Assigned','Accepted','Work Started','Inspection','In Progress','Resolved','Rejected')),
      priority TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('Critical','High','Medium','Low')),
      resolutionRemark TEXT,
      resolvedImage TEXT,
      resolvedAt TEXT,
      originalLanguage TEXT,
      originalText TEXT,
      englishTranslation TEXT,
      aiSummary TEXT,
      detectedCategory TEXT,
      aiConfidence REAL,
      aiKeywords TEXT,
      aiProcessed INTEGER DEFAULT 0,
      needsManualReview INTEGER DEFAULT 0,
      suggestedAction TEXT,
      officerRecommendation TEXT,
      estimatedResolutionDays INTEGER,
      impactScore REAL,
      prioritySource TEXT DEFAULT 'ai',
      isAnonymous INTEGER DEFAULT 0,
      similarComplaintId INTEGER,
      createdAt TEXT DEFAULT (datetime('now','localtime')),
      updatedAt TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE SET NULL
    )`);
    db.run(`INSERT INTO complaints_migrated_v3 (
      id, complaintId, userId, title, category, departmentId, description,
      voiceTranscript, speechLanguage, audioFile, latitude, longitude, address,
      status, priority, resolutionRemark, resolvedImage, resolvedAt,
      originalLanguage, originalText, englishTranslation, aiSummary,
      detectedCategory, aiConfidence, aiKeywords, aiProcessed, needsManualReview, suggestedAction,
      createdAt, updatedAt
    ) SELECT
      id, complaintId, userId, title, category, departmentId, description,
      voiceTranscript, speechLanguage, audioFile, latitude, longitude, address,
      status, priority, resolutionRemark, resolvedImage, resolvedAt,
      originalLanguage, originalText, englishTranslation, aiSummary,
      detectedCategory, aiConfidence, aiKeywords, aiProcessed, needsManualReview, suggestedAction,
      createdAt, updatedAt
    FROM complaints`);
    db.run("DROP TABLE complaints");
    db.run("ALTER TABLE complaints_migrated_v3 RENAME TO complaints");
    db.exec("CREATE INDEX IF NOT EXISTS idx_complaints_complaintId ON complaints(complaintId)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_complaints_userId ON complaints(userId)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_complaints_departmentId ON complaints(departmentId)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority)");
    console.log('[DB] Migrated complaints table v3: Critical priority, extended statuses, anonymous, ETA, impact score, officer recommendation');
  }

  const complaintColsV4 = db.exec("PRAGMA table_info(complaints)")[0]?.values || [];
  const hasEmotion = complaintColsV4.some(c => c[1] === 'emotion');
  if (!hasEmotion) {
    db.run("ALTER TABLE complaints ADD COLUMN emotion TEXT");
    db.run("ALTER TABLE complaints ADD COLUMN emotionConfidence REAL");
    db.run("ALTER TABLE complaints ADD COLUMN emotionReason TEXT");
    db.exec("CREATE INDEX IF NOT EXISTS idx_complaints_emotion ON complaints(emotion)");
    console.log('[DB] Migrated complaints table v4: added emotion detection columns');
  }

  db.run(`CREATE TABLE IF NOT EXISTS complaint_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaintId INTEGER NOT NULL,
    imagePath TEXT NOT NULL,
    phash TEXT,
    uploadedAt TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (complaintId) REFERENCES complaints(id) ON DELETE CASCADE
  )`);

  const imgCols = db.exec("PRAGMA table_info(complaint_images)")[0]?.values || [];
  const hasPhash = imgCols.some(c => c[1] === 'phash');
  if (!hasPhash) {
    db.run("ALTER TABLE complaint_images ADD COLUMN phash TEXT");
    console.log('[DB] Migrated complaint_images: added phash column for duplicate image detection');
  }

  db.run(`CREATE TABLE IF NOT EXISTS image_hashes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL,
    imagePath TEXT,
    complaintId INTEGER,
    createdAt TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.exec('CREATE INDEX IF NOT EXISTS idx_image_hashes_hash ON image_hashes(hash)');

  db.run(`CREATE TABLE IF NOT EXISTS complaint_supporters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaintId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    createdAt TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE (complaintId, userId),
    FOREIGN KEY (complaintId) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.exec('CREATE INDEX IF NOT EXISTS idx_supporters_complaint ON complaint_supporters(complaintId)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_supporters_user ON complaint_supporters(userId)');

  db.run(`CREATE TABLE IF NOT EXISTS complaint_timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaintId INTEGER NOT NULL,
    event TEXT NOT NULL,
    description TEXT,
    actorId INTEGER,
    actorRole TEXT,
    createdAt TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (complaintId) REFERENCES complaints(id) ON DELETE CASCADE
  )`);

  db.exec('CREATE INDEX IF NOT EXISTS idx_timeline_complaint ON complaint_timeline(complaintId)');

  db.run(`CREATE TABLE IF NOT EXISTS complaint_escalations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaintId INTEGER NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    escalatedToRole TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    createdAt TEXT DEFAULT (datetime('now','localtime')),
    resolvedAt TEXT,
    FOREIGN KEY (complaintId) REFERENCES complaints(id) ON DELETE CASCADE
  )`);

  db.exec('CREATE INDEX IF NOT EXISTS idx_escalations_complaint ON complaint_escalations(complaintId)');

  db.run(`CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    createdAt TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    permission TEXT NOT NULL,
    UNIQUE (role, permission)
  )`);

  const rolesCount = count('SELECT COUNT(*) as count FROM roles');
  if (!rolesCount) {
    const roleStmt = db.prepare('INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)');
    const roles = [
      ['superadmin', 'Full system access including role and permission management'],
      ['admin', 'Full administrative access to complaints, users and analytics'],
      ['department_admin', 'Administrative access scoped to a specific department'],
      ['officer', 'Field officer who updates and resolves complaints'],
      ['user', 'Citizen who submits and tracks complaints']
    ];
    roles.forEach(r => roleStmt.run(r));
    roleStmt.free();

    const permStmt = db.prepare('INSERT OR IGNORE INTO role_permissions (role, permission) VALUES (?, ?)');
    const permMap = {
      superadmin: ['dashboard.view', 'complaint.read', 'complaint.update', 'complaint.resolve', 'complaint.manage', 'users.manage', 'roles.manage', 'departments.manage', 'analytics.view', 'heatmap.view', 'escalation.manage', 'settings.manage', 'feedback.view', 'chat.use', 'officer.manage'],
      admin: ['dashboard.view', 'complaint.read', 'complaint.update', 'complaint.resolve', 'complaint.manage', 'users.manage', 'officer.manage', 'departments.manage', 'analytics.view', 'heatmap.view', 'escalation.manage', 'settings.manage', 'feedback.view', 'chat.use'],
      department_admin: ['dashboard.view', 'complaint.read', 'complaint.update', 'complaint.resolve', 'heatmap.view', 'analytics.view', 'escalation.manage', 'chat.use'],
      officer: ['dashboard.view', 'complaint.read', 'complaint.update', 'complaint.resolve', 'chat.use'],
      user: ['complaint.read', 'chat.use']
    };
    Object.entries(permMap).forEach(([role, perms]) => {
      perms.forEach(p => permStmt.run(role, p));
    });
    permStmt.free();
  }

  const officerManageStmt = db.prepare('INSERT OR IGNORE INTO role_permissions (role, permission) VALUES (?, ?)');
  officerManageStmt.run(['admin', 'officer.manage']);
  officerManageStmt.free();

  db.run(`CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    loginTime TEXT DEFAULT (datetime('now','localtime')),
    logoutTime TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    createdAt TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS otp_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.exec('CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone_number)');

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    title TEXT,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    isRead INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_complaints_complaintId ON complaints(complaintId)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_complaints_userId ON complaints(userId)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_complaints_departmentId ON complaints(departmentId)');
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_feedback_userId ON feedback(userId)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_login_history_userId ON login_history(userId)');

  const deptCount = count('SELECT COUNT(*) as count FROM departments');
  if (!deptCount) {
    const deptStmt = db.prepare('INSERT OR IGNORE INTO departments (departmentName, description) VALUES (?, ?)');
    const departments = [
      ['Water Supply', 'Water supply and pipeline management'],
      ['Roads', 'Road construction and maintenance'],
      ['Electricity', 'Power supply and electrical infrastructure'],
      ['Health', 'Public health and medical facilities'],
      ['Education', 'Schools and educational institutions'],
      ['Agriculture', 'Farming and agricultural support'],
      ['Sanitation', 'Waste management and cleanliness'],
      ['Others', 'Other miscellaneous departments']
    ];
    departments.forEach(d => deptStmt.run(d));
    deptStmt.free();
  }

  const aiDeptStmt = db.prepare('INSERT OR IGNORE INTO departments (departmentName, description) VALUES (?, ?)');
  const aiDepartments = [
    ['Public Works Department', 'Road construction and maintenance (AI routed)'],
    ['Water Department', 'Water supply and pipeline management (AI routed)'],
    ['Sanitation Department', 'Waste management, garbage and drainage (AI routed)'],
    ['Electrical Department', 'Power supply, street lights and electrical infrastructure (AI routed)'],
    ['Health Department', 'Public health and medical facilities (AI routed)'],
    ['Education Department', 'Schools and educational institutions (AI routed)'],
    ['Agriculture Department', 'Farming and agricultural support (AI routed)'],
    ['Municipal Department', 'Public property and municipal services (AI routed)'],
    ['Administrative Department', 'Government offices and schemes (AI routed)'],
    ['Traffic Department', 'Traffic management and road safety (AI routed)'],
    ['Environment Department', 'Environment and pollution (AI routed)'],
    ['General Department', 'General and miscellaneous complaints (AI routed)']
  ];
  aiDepartments.forEach(d => aiDeptStmt.run(d));
  aiDeptStmt.free();
  console.log('[DB] AI-routable departments ensured');

  const settingsCount = count("SELECT COUNT(*) as count FROM settings");
  if (!settingsCount) {
    const defaults = [
      ['app_name', 'Voice-Based Grievance System'],
      ['panchayat_name', 'Gram Panchayat'],
      ['address', ''],
      ['phone', ''],
      ['email', ''],
      ['website', ''],
      ['facebook', ''],
      ['twitter', ''],
      ['logo_url', ''],
      ['default_resolution_days', '30'],
      ['auto_assign', 'false'],
      ['language', 'en'],
      ['similarity_threshold', '0.75'],
      ['resolution_estimates', JSON.stringify({
        'Road': 3, 'Water Supply': 1, 'Garbage': 2, 'Drainage': 2, 'Street Light': 2,
        'Electricity': 2, 'Sanitation': 2, 'Health': 2, 'Education': 4, 'Agriculture': 5,
        'Public Property': 5, 'Government Office': 7, 'Traffic': 3, 'Environment': 4, 'Others': 7
      })],
      ['escalation_days', JSON.stringify({ senior: 3, commissioner: 7, collector: 15 })]
    ];
    const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    defaults.forEach(d => stmt.run(d));
    stmt.free();
  }

  const adminCount = count("SELECT COUNT(*) as count FROM users WHERE role='admin'");
  if (!adminCount) {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@panchayat.gov.in';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const stmt = db.prepare('INSERT OR IGNORE INTO users (userId, fullName, email, phone, password, role, state, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(['ADMIN-001', 'System Admin', adminEmail, '9999999999', hashedPassword, 'admin', 'India', 1]);
    stmt.free();
  }

  const backupDir = path.resolve(__dirname, '../database/backup');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  saveDatabase();
  console.log('[DB] Database initialized successfully');
  return db;
}

function backupDatabase() {
  const backupDir = path.resolve(__dirname, '../database/backup');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `grievance-backup-${timestamp}.db`);
  const data = db.export();
  fs.writeFileSync(backupPath, Buffer.from(data));
  return backupPath;
}

function resetDatabase() {
  if (db) db.close();
  const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './database/grievance.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  db = null;
}

function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

function generateComplaintId() {
  const year = new Date().getFullYear();
  const result = exec('SELECT COUNT(*) as count FROM complaints');
  const count = result[0]?.values[0][0] || 0;
  const next = (count + 1).toString().padStart(6, '0');
  return `CMP-${year}-${next}`;
}

module.exports = {
  getDatabase, saveDatabase, initializeDatabase,
  run, get, all, count, exec, lastInsertId,
  backupDatabase, resetDatabase, closeDatabase,
  generateComplaintId
};
