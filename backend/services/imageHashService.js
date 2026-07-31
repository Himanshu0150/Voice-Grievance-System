const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let Jimp = null;
try {
  Jimp = require('jimp').Jimp;
} catch (err) {
  logger.warn('[IMAGE HASH] jimp not available, perceptual hashing disabled');
}

const HASH_SIZE = 8;
const DUPLICATE_THRESHOLD = 10;

function hammingDistance(a, b) {
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i], 16);
    const y = parseInt(b[i], 16);
    let diff = x ^ y;
    while (diff) {
      distance += diff & 1;
      diff >>= 1;
    }
  }
  return distance;
}

const imageHashService = {
  async computePhash(filePath) {
    if (!Jimp) return null;
    try {
      const image = await Jimp.read(filePath);
      const gray = image
        .resize({ w: HASH_SIZE + 1, h: HASH_SIZE + 1 })
        .greyscale()
        .bitmap.data;

      const pixels = [];
      for (let y = 0; y < HASH_SIZE + 1; y++) {
        for (let x = 0; x < HASH_SIZE + 1; x++) {
          pixels[y * (HASH_SIZE + 1) + x] = gray[(y * (HASH_SIZE + 1) + x) * 4];
        }
      }

      const dct = this._dct2d(pixels, HASH_SIZE + 1);

      const lowFreq = [];
      for (let y = 0; y < HASH_SIZE; y++) {
        for (let x = 0; x < HASH_SIZE; x++) {
          lowFreq.push(dct[(y + 1) * (HASH_SIZE + 1) + (x + 1)]);
        }
      }

      const sorted = [...lowFreq].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      let hash = '';
      for (let i = 0; i < 64; i += 4) {
        let hex = 0;
        for (let bit = 0; bit < 4; bit++) {
          hex = (hex << 1) | (lowFreq[i + bit] > median ? 1 : 0);
        }
        hash += hex.toString(16);
      }
      return hash;
    } catch (err) {
      logger.error(`[IMAGE HASH] Failed to compute pHash for ${filePath}: ${err.message}`);
      return null;
    }
  },

  _dct2d(pixels, size) {
    const result = new Array(size * size).fill(0);
    for (let u = 0; u < size; u++) {
      for (let v = 0; v < size; v++) {
        const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
        const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
        let sum = 0;
        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            sum += pixels[x * size + y] *
              Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size)) *
              Math.cos(((2 * y + 1) * v * Math.PI) / (2 * size));
          }
        }
        result[u * size + v] = (2 / size) * cu * cv * sum;
      }
    }
    return result;
  },

  hammingDistance,

  isDuplicate(existingHash, newHash) {
    if (!existingHash || !newHash || existingHash.length !== newHash.length) return false;
    return hammingDistance(existingHash, newHash) <= DUPLICATE_THRESHOLD;
  },

  findDuplicates(newHash, excludeComplaintId = null) {
    if (!newHash) return [];
    const database = db();
    const rows = database.all(
      'SELECT hash, imagePath, complaintId FROM image_hashes WHERE hash IS NOT NULL',
      []
    );
    const matches = [];
    for (const row of rows) {
      if (excludeComplaintId && row.complaintId === excludeComplaintId) continue;
      if (this.isDuplicate(row.hash, newHash)) {
        const complaint = row.complaintId
          ? database.get('SELECT complaintId, title FROM complaints WHERE id = ?', [row.complaintId])
          : null;
        matches.push({
          imagePath: row.imagePath,
          complaintRef: complaint?.complaintId || null,
          complaintTitle: complaint?.title || null,
          distance: hammingDistance(row.hash, newHash)
        });
      }
    }
    return matches;
  },

  storeHash(hash, imagePath, complaintId = null) {
    if (!hash) return;
    const database = db();
    database.run(
      'INSERT INTO image_hashes (hash, imagePath, complaintId) VALUES (?, ?, ?)',
      [hash, imagePath, complaintId]
    );
    database.saveDatabase();
  }
};

function db() {
  return require('../config/database');
}

module.exports = imageHashService;
