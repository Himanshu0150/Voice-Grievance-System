const https = require('https');
const logger = require('../utils/logger');

const VALID_CATEGORIES = [
  'Road', 'Water Supply', 'Drainage', 'Street Light', 'Electricity',
  'Garbage', 'Sanitation', 'Health', 'Education', 'Agriculture',
  'Public Property', 'Government Office', 'Traffic', 'Environment', 'Others'
];

const EMOTION_VALUES = ['Calm', 'Neutral', 'Concerned', 'Angry', 'Fear', 'Distress', 'Panic'];

const GEMINI_ENDPOINT = process.env.GEMINI_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

let _connected = false;
let _connectionError = null;

function httpsRequest(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function geminiApiKey() {
  return process.env.GEMINI_API_KEY || '';
}

function geminiHeaders() {
  return { 'x-goog-api-key': geminiApiKey() };
}

function buildRequestBody(systemPrompt, userPrompt, options = {}) {
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      temperature: options.temperature || 0.1,
      maxOutputTokens: options.maxTokens || 1024
    }
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  return body;
}

function extractTextFromResponse(res) {
  const parts = res?.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) return '';
  return parts.map(p => p.text || '').join('').trim();
}

function extractJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); } catch { /* fall through to brace matching */ }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(cleaned.substring(start, end + 1)); } catch { return null; }
  }
  return null;
}

const aiProvider = {
  isConfigured() {
    return !!geminiApiKey();
  },

  getStatus() {
    const configured = this.isConfigured();
    return {
      provider: 'gemini',
      configured,
      connected: configured && _connected,
      connectionError: _connectionError,
      model: GEMINI_MODEL,
      translationEnabled: configured && _connected,
      classificationEnabled: configured && _connected,
      visionEnabled: configured && _connected
    };
  },

  async verifyConnection() {
    const apiKey = geminiApiKey();
    if (!apiKey) {
      _connected = false;
      _connectionError = 'No API key configured';
      return { connected: false, error: _connectionError };
    }

    try {
      const url = `${GEMINI_ENDPOINT}/models/${GEMINI_MODEL}:generateContent`;
      const body = buildRequestBody(
        '',
        'Reply with exactly one word: OK',
        { maxTokens: 100 }
      );
      const res = await httpsRequest(url, 'POST', geminiHeaders(), body);
      const text = extractTextFromResponse(res.data);
      if (res.status === 200 && text) {
        _connected = true;
        _connectionError = null;
        logger.info(`[AI] Gemini connected successfully (model: ${GEMINI_MODEL})`);
        return { connected: true, model: GEMINI_MODEL };
      }
      const msg = res.data?.error?.message || `HTTP ${res.status}`;
      _connected = false;
      _connectionError = msg;
      logger.error(`[AI] Gemini connection failed: ${msg}`);
      return { connected: false, error: msg };
    } catch (err) {
      _connected = false;
      _connectionError = err.message;
      logger.error(`[AI] Gemini connection failed: ${err.message}`);
      return { connected: false, error: err.message };
    }
  },

  async classify(englishText, imageAnalysisText = '') {
    const apiKey = geminiApiKey();
    if (!apiKey) {
      logger.warn('[AI CLASSIFY] No API key configured, using mock classification');
      return this._mockClassify(englishText, imageAnalysisText);
    }

    const categoriesStr = VALID_CATEGORIES.map(c => `"${c}"`).join(', ');
    const systemPrompt = `You are a Panchayat Grievance Classification AI. Analyze the citizen complaint and return ONLY valid JSON with these fields:
{
  "category": One of ${categoriesStr},
  "department": "Appropriate department name based on category",
  "priority": "Critical, High, Medium, or Low - Critical for life-safety emergencies like gas leaks, fires, collapsed structures, major flooding, or accidents; determine otherwise based on urgency and severity",
  "confidence": 0.0-1.0,
  "summary": "One-line summary of the complaint in English",
  "keywords": ["keyword1", "keyword2"],
  "suggestedAction": "Brief suggested action for the department"
}`;

    const userPrompt = `Complaint: ${englishText}\n${imageAnalysisText ? `Image Analysis: ${imageAnalysisText}\n` : ''}Respond with JSON only.`;

    try {
      logger.info('[AI CLASSIFY] Sending to Gemini for classification');
      const result = await this._callGeminiClassify(systemPrompt, userPrompt);
      logger.info(`[AI CLASSIFY] Result: ${result.category} (${result.priority}) confidence: ${result.confidence}`);
      return result;
    } catch (err) {
      logger.error(`[AI CLASSIFY] Gemini call failed: ${err.message}`);
      logger.warn('[AI CLASSIFY] Falling back to mock classification');
      return this._mockClassify(englishText, imageAnalysisText);
    }
  },

  async translate(text, sourceLanguage, targetLanguage = 'en') {
    if (targetLanguage === 'en' && sourceLanguage === 'en') return text;
    if (!text || text.trim().length === 0) return text;

    logger.info(`[AI TRANSLATE] Starting ${sourceLanguage} -> ${targetLanguage}`);
    logger.info(`[AI TRANSLATE] Input: "${text.substring(0, 150)}..."`);

    const apiKey = geminiApiKey();
    if (!apiKey) {
      logger.warn('[AI TRANSLATE] No API key configured, returning original text');
      return text;
    }

    const systemPrompt = `You are a translator for an Indian Panchayat grievance system. Translate the following text from ${sourceLanguage} to ${targetLanguage}. Preserve all details and context. Return ONLY the translated text, no explanations, no prefixes, no quotes.`;
    const userPrompt = `Translate from ${sourceLanguage} to ${targetLanguage}: ${text}`;

    try {
      logger.info('[AI TRANSLATE] Sending to Gemini for translation');
      const result = await this._callGeminiText(systemPrompt, userPrompt);
      logger.info(`[AI TRANSLATE] Output: "${result.substring(0, 150)}..."`);
      return result;
    } catch (err) {
      logger.error(`[AI TRANSLATE] Gemini call failed: ${err.message}`);
      logger.warn('[AI TRANSLATE] Falling back to original text');
      return text;
    }
  },

  async analyzeImage(imageBase64, mimeType) {
    const apiKey = geminiApiKey();
    if (!apiKey) {
      logger.warn('[AI VISION] No API key configured, using mock analysis');
      return this._mockImageAnalysis();
    }

    const systemPrompt = `You are an image analyst for a Panchayat grievance system. Analyze the image and detect infrastructure or public issues.
Return ONLY valid JSON with these fields:
{
  "detected": "One of: potholes, broken road, garbage, water leakage, flooding, street light, electric pole, tree fall, drain blockage, animal hazard, construction, fire, or unknown",
  "confidence": 0.0-1.0,
  "description": "One line description of what the image shows"
}`;

    try {
      const url = `${GEMINI_ENDPOINT}/models/${GEMINI_MODEL}:generateContent`;
      const body = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Analyze this image and return JSON only.' },
              { inline_data: { mime_type: mimeType, data: imageBase64 } }
            ]
          }
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
      };
      const res = await httpsRequest(url, 'POST', geminiHeaders(), body);
      if (res.status !== 200) {
        logger.error(`[AI VISION] Gemini vision call failed: ${res.status} ${JSON.stringify(res.data).substring(0, 300)}`);
        return this._mockImageAnalysis();
      }
      const text = extractTextFromResponse(res.data);
      const parsed = extractJson(text) || {};
      const result = {
        detected: parsed.detected || 'unknown',
        confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
        description: parsed.description || ''
      };
      logger.info(`[AI VISION] Detected: ${result.detected} (${(result.confidence * 100).toFixed(0)}%)`);
      return result;
    } catch (err) {
      logger.error(`[AI VISION] Vision analysis failed: ${err.message}`);
      return this._mockImageAnalysis();
    }
  },

  async detectEmotion(text) {
    const apiKey = geminiApiKey();
    if (!apiKey) {
      logger.warn('[AI EMOTION] No API key configured, using neutral fallback');
      return { emotion: 'Neutral', confidence: 0.5, reason: 'AI provider not configured' };
    }
    if (!text || !text.trim()) {
      return { emotion: 'Neutral', confidence: 0.5, reason: 'No complaint text available' };
    }

    const systemPrompt = `You are an emotion detection AI for an Indian Panchayat grievance system.
Analyze the emotional tone of the citizen's complaint and return ONLY valid JSON:
{
  "emotion": "One of: Calm, Neutral, Concerned, Angry, Fear, Distress, Panic",
  "confidence": 0.0-1.0,
  "reason": "One-line explanation of why this emotion was detected"
}`;
    const userPrompt = `Complaint text: ${text}\nRespond with JSON only.`;

    try {
      logger.info('[AI EMOTION] Sending to Gemini for emotion detection');
      const result = await this._callGeminiClassify(systemPrompt, userPrompt, { maxTokens: 2048 });
      const emotion = EMOTION_VALUES.includes(result.emotion) ? result.emotion : 'Neutral';
      return {
        emotion,
        confidence: typeof result.confidence === 'number' ? Math.min(1, Math.max(0, result.confidence)) : 0.5,
        reason: result.reason || ''
      };
    } catch (err) {
      logger.error(`[AI EMOTION] Gemini call failed: ${err.message}`);
      return { emotion: 'Neutral', confidence: 0.5, reason: 'Emotion detection failed' };
    }
  },

  async chat(systemPrompt, userPrompt, options = {}) {
    const apiKey = geminiApiKey();
    if (!apiKey) {
      logger.warn('[AI CHAT] No API key configured');
      const err = new Error('AI provider not configured');
      err.statusCode = 503;
      throw err;
    }
    const url = `${GEMINI_ENDPOINT}/models/${GEMINI_MODEL}:generateContent`;
    const body = buildRequestBody(systemPrompt, userPrompt, {
      temperature: options.temperature || 0.2,
      maxTokens: options.maxTokens || 1024
    });
    const res = await httpsRequest(url, 'POST', geminiHeaders(), body);
    if (res.status !== 200) {
      throw new Error(`Gemini API error (${res.status}): ${res.data?.error?.message || JSON.stringify(res.data).substring(0, 200)}`);
    }
    return extractTextFromResponse(res.data);
  },

  async generateRecommendation(englishText, category, keywords = [], imageAnalysisText = '') {
    const systemPrompt = `You are an officer recommendation engine for a Panchayat grievance system.
Based on the complaint details, generate:
1. "summary": A 2-line summary of the complaint
2. "keywords": Top 5 keywords
3. "suggestedAction": A brief suggested action for the department
4. "officerRecommendation": A specific recommendation for the officer handling this complaint (what to check, what to do, safety notes if any)
Return ONLY valid JSON.`;

    const userPrompt = `Complaint text: ${englishText}
Category: ${category}
Keywords: ${JSON.stringify(keywords || [])}
${imageAnalysisText ? `Image analysis: ${imageAnalysisText}` : ''}
Respond with JSON only.`;

    if (!this.isConfigured()) {
      return {
        summary: englishText ? englishText.substring(0, 200) : 'Complaint received',
        keywords: (keywords || []).slice(0, 5),
        suggestedAction: `Assign to ${category} department for review and resolution.`,
        officerRecommendation: 'Verify the complaint details at the location, document the findings, and take appropriate action within the estimated resolution time.'
      };
    }

    try {
      const result = await this._callGeminiClassify(systemPrompt, userPrompt);
      return {
        summary: result.summary || englishText.substring(0, 200),
        keywords: Array.isArray(result.keywords) ? result.keywords.slice(0, 5) : (keywords || []).slice(0, 5),
        suggestedAction: result.suggestedAction || `Assign to ${category} department.`,
        officerRecommendation: result.officerRecommendation || 'Verify the complaint details at the location and document findings.'
      };
    } catch (err) {
      logger.warn(`[AI RECOMMENDATION] Failed: ${err.message}`);
      return {
        summary: englishText ? englishText.substring(0, 200) : 'Complaint received',
        keywords: (keywords || []).slice(0, 5),
        suggestedAction: `Assign to ${category} department for review and resolution.`,
        officerRecommendation: 'Verify the complaint details at the location, document the findings, and take appropriate action within the estimated resolution time.'
      };
    }
  },

  async _callGeminiClassify(systemPrompt, userPrompt, options = {}) {
    const url = `${GEMINI_ENDPOINT}/models/${GEMINI_MODEL}:generateContent`;
    const body = buildRequestBody(systemPrompt, userPrompt, { temperature: 0.1, maxTokens: options.maxTokens || 2048 });
    const res = await httpsRequest(url, 'POST', geminiHeaders(), body);
    if (res.status !== 200) {
      const fullError = JSON.stringify(res.data);
      logger.error(`[GEMINI API ERROR] classify failed. Status: ${res.status}. Response: ${fullError}`);
      throw new Error(`Gemini API error (${res.status}): ${res.data?.error?.message || fullError}`);
    }
    const text = extractTextFromResponse(res.data);
    const parsed = extractJson(text);
    if (!parsed) {
      throw new Error(`Gemini response parse failed: ${text.substring(0, 200)}`);
    }
    return parsed;
  },

  async _callGeminiText(systemPrompt, userPrompt) {
    const url = `${GEMINI_ENDPOINT}/models/${GEMINI_MODEL}:generateContent`;
    const body = buildRequestBody(systemPrompt, userPrompt, { temperature: 0.1, maxTokens: 4096 });
    const res = await httpsRequest(url, 'POST', geminiHeaders(), body);
    if (res.status !== 200) {
      const fullError = JSON.stringify(res.data);
      logger.error(`[GEMINI API ERROR] translate failed. Status: ${res.status}. Response: ${fullError}`);
      throw new Error(`Gemini API error (${res.status}): ${res.data?.error?.message || fullError}`);
    }
    return extractTextFromResponse(res.data) || userPrompt;
  },

  _mockClassify(text, imageText = '') {
    const lower = (text || '').toLowerCase() + ' ' + (imageText || '').toLowerCase();
    let category = 'Others';
    let department = 'General Department';
    let priority = 'Medium';
    const keywords = [];
    if (lower.includes('road') || lower.includes('pothole') || lower.includes('street')) { category = 'Road'; department = 'Public Works Department'; }
    else if (lower.includes('water') || lower.includes('drinking') || lower.includes('pipeline') || lower.includes('supply')) { category = 'Water Supply'; department = 'Water Department'; }
    else if (lower.includes('drain') || lower.includes('sewage') || lower.includes('overflow') || lower.includes('blockage')) { category = 'Drainage'; department = 'Sanitation Department'; }
    else if (lower.includes('street light') || lower.includes('lamp') || lower.includes('light not working')) { category = 'Street Light'; department = 'Electrical Department'; }
    else if (lower.includes('electric') || lower.includes('power') || lower.includes('voltage') || lower.includes('transformer')) { category = 'Electricity'; department = 'Electrical Department'; }
    else if (lower.includes('garbage') || lower.includes('waste') || lower.includes('trash')) { category = 'Garbage'; department = 'Sanitation Department'; }
    else if (lower.includes('health') || lower.includes('hospital') || lower.includes('clinic') || lower.includes('medicine')) { category = 'Health'; department = 'Health Department'; }
    else if (lower.includes('school') || lower.includes('education') || lower.includes('teacher') || lower.includes('college')) { category = 'Education'; department = 'Education Department'; }
    else if (lower.includes('farm') || lower.includes('crop') || lower.includes('agriculture') || lower.includes('irrigation')) { category = 'Agriculture'; department = 'Agriculture Department'; }
    else if (lower.includes('tree') || lower.includes('park') || lower.includes('public property')) { category = 'Public Property'; department = 'Municipal Department'; }
    else if (lower.includes('traffic') || lower.includes('road safety')) { category = 'Traffic'; department = 'Traffic Department'; }
    else if (lower.includes('environment') || lower.includes('pollution') || lower.includes('air')) { category = 'Environment'; department = 'Environment Department'; }
    else if (lower.includes('government') || lower.includes('office') || lower.includes('scheme')) { category = 'Government Office'; department = 'Administrative Department'; }
    if (lower.includes('urgent') || lower.includes('immediate') || lower.includes('danger') || lower.includes('emergency') || lower.includes('overflow') || lower.includes('accident')) { priority = 'High'; }
    else if (lower.includes('minor') || lower.includes('small') || lower.includes('suggestion')) { priority = 'Low'; }
    if (lower.includes('gas leak') || lower.includes('fire') || lower.includes('collapsed') || lower.includes('collapse') || lower.includes('burst') || lower.includes('major flood') || lower.includes('electrocution') || lower.includes('open wire')) { priority = 'Critical'; }
    const words = (text || '').split(/\s+/).filter(w => w.length > 3).slice(0, 8);
    keywords.push(...words.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean));
    return {
      category, department, priority,
      confidence: category === 'Others' ? 0.4 : 0.75,
      summary: text ? text.substring(0, 120) : 'Complaint received',
      keywords: [...new Set(keywords)].slice(0, 8),
      suggestedAction: `Assign to ${department} for review and resolution.`
    };
  },

  _mockImageAnalysis() {
    return { detected: 'unknown', confidence: 0.5, description: 'Image analysis is not available with the current AI provider.' };
  }
};

module.exports = aiProvider;
