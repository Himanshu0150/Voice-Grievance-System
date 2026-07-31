const db = require('../config/database');
const Settings = require('../models/Settings');
const aiProvider = require('./aiProvider');
const logger = require('../utils/logger');

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'in', 'on', 'at', 'to', 'of', 'for', 'with', 'from', 'by', 'my', 'our', 'your',
  'this', 'that', 'these', 'those', 'it', 'its', 'has', 'have', 'had', 'do', 'does',
  'did', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'not', 'no',
  'there', 'here', 'please', 'kindly', 'very', 'also', 'one', 'two', 'i', 'me', 'we',
  'us', 'you', 'he', 'she', 'they', 'them', 'so', 'as', 'if', 'then', 'than', 'too'
]);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function jaccard(a, b) {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let common = 0;
  setA.forEach(t => { if (setB.has(t)) common++; });
  const union = new Set([...setA, ...setB]).size;
  return union ? common / union : 0;
}

function tfidfCosine(a, b, idf) {
  const setA = new Set(a);
  const setB = new Set(b);
  let dot = 0, normA = 0, normB = 0;
  setA.forEach(t => {
    const w = idf.get(t) || 1;
    normA += w * w;
  });
  setB.forEach(t => {
    const w = idf.get(t) || 1;
    normB += w * w;
  });
  setA.forEach(t => {
    if (setB.has(t)) dot += (idf.get(t) || 1) * (idf.get(t) || 1);
  });
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function buildIdf(docs) {
  const df = new Map();
  docs.forEach(doc => {
    new Set(doc).forEach(t => df.set(t, (df.get(t) || 0) + 1));
  });
  const idf = new Map();
  df.forEach((count, term) => {
    idf.set(term, Math.log((docs.length + 1) / (count + 1)) + 1);
  });
  return idf;
}

function localScore(queryText, complaint) {
  const queryTokens = tokenize(queryText);
  const titleTokens = tokenize(complaint.title);
  const descTokens = tokenize(complaint.description);
  const kwTokens = tokenize((complaint.aiKeywords || '').toString());

  const docs = [titleTokens, descTokens, kwTokens, queryTokens];
  const idf = buildIdf(docs);

  const titleScore = tfidfCosine(queryTokens, titleTokens, idf) * 0.45;
  const descScore = tfidfCosine(queryTokens, descTokens, idf) * 0.35;
  const kwScore = tfidfCosine(queryTokens, kwTokens, idf) * 0.2;
  const jac = jaccard(queryTokens, [...titleTokens, ...descTokens]) * 0.1;

  return Math.min(1, titleScore + descScore + kwScore + jac);
}

const similarityService = {
  async findSimilar(text, options = {}) {
    const threshold = parseFloat(options.threshold || Settings.get('similarity_threshold') || '0.75');
    if (!text || !text.trim()) {
      return { similar: [], threshold, checked: false };
    }

    const queryTokens = tokenize(text);
    const candidates = db.all(
      `SELECT c.*, d.departmentName,
        (SELECT COUNT(*) FROM complaint_supporters s WHERE s.complaintId = c.id) as supporterCount
       FROM complaints c
       LEFT JOIN departments d ON c.departmentId = d.id
       WHERE c.status != 'Rejected'
       ORDER BY c.createdAt DESC LIMIT 200`
    );

    if (!candidates.length) {
      return { similar: [], threshold, checked: true };
    }

    const scored = candidates
      .map(c => ({ complaint: c, score: localScore(text, c) }))
      .filter(item => item.score > 0.12)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    if (!scored.length) {
      return { similar: [], threshold, checked: true };
    }

    let aiScored = scored;
    if (aiProvider.isConfigured() && scored.length > 0) {
      aiScored = await this._aiScore(text, scored);
    }

    const similar = aiScored
      .filter(item => item.score >= threshold)
      .map(item => ({
        id: item.complaint.id,
        complaintId: item.complaint.complaintId,
        title: item.complaint.title,
        category: item.complaint.category,
        department: item.complaint.departmentName || 'Unassigned',
        status: item.complaint.status,
        priority: item.complaint.priority,
        supporterCount: item.complaint.supporterCount || 0,
        createdAt: item.complaint.createdAt,
        similarity: Math.round(item.score * 1000) / 1000
      }))
      .slice(0, 5);

    return { similar, threshold, checked: true };
  },

  async _aiScore(text, scored) {
    try {
      const candidatesJson = JSON.stringify(scored.map(s => ({
        id: s.complaint.id,
        title: s.complaint.title,
        description: (s.complaint.description || '').substring(0, 500)
      })));

      const systemPrompt = `You are a duplicate grievance detection AI for a government complaint system.
Analyze the new complaint text against the existing complaint candidates.
Return ONLY valid JSON: an array of objects with "id" and "similarity" (0.0 to 1.0).
Similarity 1.0 means it is clearly the same issue at the same place, 0.0 means unrelated.
Be conservative: only score above 0.8 when the issue type AND location clearly match.
Candidates: ${candidatesJson}`;

      const userPrompt = `New complaint text: ${text.substring(0, 2000)}\nReturn JSON array only.`;

      const result = await aiProvider.chat(systemPrompt, userPrompt, { temperature: 0.1, maxTokens: 512 });
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      if (!Array.isArray(parsed)) return scored;

      const idToScore = new Map(parsed.map(p => [p.id, parseFloat(p.similarity)]));
      return scored
        .map(item => {
          const aiSim = idToScore.get(item.complaint.id);
          if (aiSim !== undefined) {
            item.score = Math.min(1, Math.max(0, item.score * 0.3 + aiSim * 0.7));
            item.aiScore = aiSim;
          }
          return item;
        })
        .sort((a, b) => b.score - a.score);
    } catch (err) {
      logger.warn(`[SIMILARITY] AI scoring failed, using local scores: ${err.message}`);
      return scored;
    }
  }
};

module.exports = similarityService;
