const https = require('https');
const logger = require('../utils/logger');

const VALID_CATEGORIES = [
  'Road', 'Water Supply', 'Drainage', 'Street Light', 'Electricity',
  'Garbage', 'Sanitation', 'Health', 'Education', 'Agriculture',
  'Public Property', 'Government Office', 'Traffic', 'Environment', 'Others'
];

const GROQ_MODEL = process.env.AI_GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_ENDPOINT = process.env.AI_GROQ_ENDPOINT || 'https://api.groq.com/openai/v1';

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

function groqApiKey() {
  return process.env.AI_API_KEY || '';
}

const aiProvider = {
  isConfigured() {
    return !!groqApiKey();
  },

  getStatus() {
    const configured = this.isConfigured();
    return {
      provider: 'groq',
      configured,
      connected: configured && _connected,
      connectionError: _connectionError,
      model: GROQ_MODEL,
      translationEnabled: configured && _connected,
      classificationEnabled: configured && _connected,
      visionEnabled: false
    };
  },

  async verifyConnection() {
    const apiKey = groqApiKey();
    if (!apiKey) {
      _connected = false;
      _connectionError = 'No API key configured';
      return { connected: false, error: _connectionError };
    }

    try {
      const url = `${GROQ_ENDPOINT}/chat/completions`;
      const body = {
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: 'Reply with exactly one word: OK' }],
        max_tokens: 10
      };
      const headers = { Authorization: `Bearer ${apiKey}` };
      const res = await httpsRequest(url, 'POST', headers, body);
      if (res.status === 200 && res.data?.choices?.[0]?.message?.content) {
        _connected = true;
        _connectionError = null;
        logger.info(`[AI] Groq connected successfully (model: ${GROQ_MODEL})`);
        return { connected: true, model: GROQ_MODEL };
      }
      const msg = res.data?.error?.message || `HTTP ${res.status}`;
      _connected = false;
      _connectionError = msg;
      logger.error(`[AI] Groq connection failed: ${msg}`);
      return { connected: false, error: msg };
    } catch (err) {
      _connected = false;
      _connectionError = err.message;
      logger.error(`[AI] Groq connection failed: ${err.message}`);
      return { connected: false, error: err.message };
    }
  },

  async classify(englishText, imageAnalysisText = '') {
    const apiKey = groqApiKey();
    if (!apiKey) {
      logger.warn('[AI CLASSIFY] No API key configured, using mock classification');
      return this._mockClassify(englishText, imageAnalysisText);
    }

    const categoriesStr = VALID_CATEGORIES.map(c => `"${c}"`).join(', ');
    const systemPrompt = `You are a Panchayat Grievance Classification AI. Analyze the citizen complaint and return ONLY valid JSON with these fields:
{
  "category": One of ${categoriesStr},
  "department": "Appropriate department name based on category",
  "priority": "High, Medium, or Low - determine based on urgency and severity",
  "confidence": 0.0-1.0,
  "summary": "One-line summary of the complaint in English",
  "keywords": ["keyword1", "keyword2"],
  "suggestedAction": "Brief suggested action for the department"
}`;

    const userPrompt = `Complaint: ${englishText}\n${imageAnalysisText ? `Image Analysis: ${imageAnalysisText}\n` : ''}Respond with JSON only.`;

    try {
      logger.info('[AI CLASSIFY] Sending to Groq for classification');
      const result = await this._callGroqClassify(systemPrompt, userPrompt);
      logger.info(`[AI CLASSIFY] Result: ${result.category} (${result.priority}) confidence: ${result.confidence}`);
      return result;
    } catch (err) {
      logger.error(`[AI CLASSIFY] Groq call failed: ${err.message}`);
      logger.warn('[AI CLASSIFY] Falling back to mock classification');
      return this._mockClassify(englishText, imageAnalysisText);
    }
  },

  async translate(text, sourceLanguage, targetLanguage = 'en') {
    if (targetLanguage === 'en' && sourceLanguage === 'en') return text;
    if (!text || text.trim().length === 0) return text;

    logger.info(`[AI TRANSLATE] Starting ${sourceLanguage} -> ${targetLanguage}`);
    logger.info(`[AI TRANSLATE] Input: "${text.substring(0, 150)}..."`);

    const apiKey = groqApiKey();
    if (!apiKey) {
      logger.warn('[AI TRANSLATE] No API key configured, returning original text');
      return text;
    }

    const systemPrompt = 'You are a translator for an Indian Panchayat grievance system. Translate the following text accurately into English. Preserve all details and context. Return ONLY the translated text, no explanations, no prefixes.';
    const userPrompt = `Translate from ${sourceLanguage} to ${targetLanguage}: ${text}`;

    try {
      logger.info('[AI TRANSLATE] Sending to Groq for translation');
      const result = await this._callGroqText(systemPrompt, userPrompt);
      logger.info(`[AI TRANSLATE] Output: "${result.substring(0, 150)}..."`);
      return result;
    } catch (err) {
      logger.error(`[AI TRANSLATE] Groq call failed: ${err.message}`);
      logger.warn('[AI TRANSLATE] Falling back to original text');
      return text;
    }
  },

  async analyzeImage(imageBase64, mimeType) {
    logger.warn('[AI VISION] Groq does not support image analysis, returning mock analysis');
    return this._mockImageAnalysis();
  },

  async _callGroqClassify(systemPrompt, userPrompt) {
    const url = `${GROQ_ENDPOINT}/chat/completions`;
    const body = {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1024
    };
    const headers = { Authorization: `Bearer ${groqApiKey()}` };
    const res = await httpsRequest(url, 'POST', headers, body);
    if (res.status !== 200) {
      const fullError = JSON.stringify(res.data);
      logger.error(`[GROQ API ERROR] classify failed. Status: ${res.status}. Response: ${fullError}`);
      throw new Error(`Groq API error (${res.status}): ${res.data?.error?.message || fullError}`);
    }
    const text = res.data?.choices?.[0]?.message?.content || '{}';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try { return JSON.parse(cleaned); }
    catch {
      throw new Error(`Groq response parse failed: ${text.substring(0, 200)}`);
    }
  },

  async _callGroqText(systemPrompt, userPrompt) {
    const url = `${GROQ_ENDPOINT}/chat/completions`;
    const body = {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2048
    };
    const headers = { Authorization: `Bearer ${groqApiKey()}` };
    const res = await httpsRequest(url, 'POST', headers, body);
    if (res.status !== 200) {
      const fullError = JSON.stringify(res.data);
      logger.error(`[GROQ API ERROR] translate failed. Status: ${res.status}. Response: ${fullError}`);
      throw new Error(`Groq API error (${res.status}): ${res.data?.error?.message || fullError}`);
    }
    return res.data?.choices?.[0]?.message?.content?.trim() || userPrompt;
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
