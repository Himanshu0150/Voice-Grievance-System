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

  db.run(`CREATE TABLE IF NOT EXISTS complaint_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaintId INTEGER NOT NULL,
    imagePath TEXT NOT NULL,
    uploadedAt TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (complaintId) REFERENCES complaints(id) ON DELETE CASCADE
  )`);

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
      ['language', 'en']
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
