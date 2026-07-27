const db = require('../config/database');

const Settings = {
  get(key) {
    const row = db.get('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : null;
  },

  set(key, value) {
    const existing = db.get('SELECT id FROM settings WHERE key = ?', [key]);
    if (existing) {
      db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
    } else {
      db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [value, key]);
    }
    db.saveDatabase();
  },

  getAll() {
    const rows = db.all('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    return settings;
  },

  updateAll(data) {
    for (const [key, value] of Object.entries(data)) {
      this.set(key, value);
    }
  }
};

module.exports = Settings;
