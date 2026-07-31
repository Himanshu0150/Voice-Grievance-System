const aiProvider = require('./aiProvider');
const logger = require('../utils/logger');

const VALID_CATEGORIES = [
  'Road', 'Water Supply', 'Drainage', 'Street Light', 'Electricity',
  'Garbage', 'Sanitation', 'Health', 'Education', 'Agriculture',
  'Public Property', 'Government Office', 'Traffic', 'Environment', 'Others'
];

const CATEGORY_DEPARTMENT_MAP = {
  'Road': 'Public Works Department',
  'Water Supply': 'Water Department',
  'Drainage': 'Sanitation Department',
  'Street Light': 'Electrical Department',
  'Electricity': 'Electrical Department',
  'Garbage': 'Sanitation Department',
  'Sanitation': 'Sanitation Department',
  'Health': 'Health Department',
  'Education': 'Education Department',
  'Agriculture': 'Agriculture Department',
  'Public Property': 'Municipal Department',
  'Government Office': 'Administrative Department',
  'Traffic': 'Traffic Department',
  'Environment': 'Environment Department',
  'Others': 'General Department'
};

const DEPARTMENT_CATEGORY_MAP = {
  'Public Works Department': 'Road',
  'Water Department': 'Water Supply',
  'Sanitation Department': 'Garbage',
  'Electrical Department': 'Electricity',
  'Health Department': 'Health',
  'Education Department': 'Education',
  'Agriculture Department': 'Agriculture',
  'Municipal Department': 'Public Property',
  'Administrative Department': 'Government Office',
  'Traffic Department': 'Traffic',
  'Environment Department': 'Environment',
  'General Department': 'Others'
};

function normalizeResult(raw, imageText = '') {
  const result = {
    category: 'Others',
    department: 'General Department',
    priority: 'Medium',
    confidence: 0.5,
    summary: '',
    keywords: [],
    suggestedAction: ''
  };

  if (raw.category && VALID_CATEGORIES.includes(raw.category)) {
    result.category = raw.category;
  } else {
    const match = VALID_CATEGORIES.find(c => raw.category?.toLowerCase().includes(c.toLowerCase()));
    result.category = match || 'Others';
  }

  result.department = CATEGORY_DEPARTMENT_MAP[result.category] || 'General Department';
  if (result.category === 'Others' && raw.department && raw.department !== 'General Department') {
    result.department = raw.department;
  }

  const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
  if (validPriorities.includes(raw.priority)) {
    result.priority = raw.priority;
  }

  result.confidence = typeof raw.confidence === 'number' ? Math.min(1, Math.max(0, raw.confidence)) : 0.5;
  result.summary = raw.summary || raw.suggestedAction || '';
  result.keywords = Array.isArray(raw.keywords) ? raw.keywords.slice(0, 10) : [];
  result.suggestedAction = raw.suggestedAction || `Review and assign to ${result.department}.`;

  if (imageText && imageText.length > 2) {
    const imgCategory = imageText.toLowerCase();
    const textCategory = result.category.toLowerCase();
    if (imgCategory.includes(textCategory) || textCategory.includes(imgCategory)) {
      result.confidence = Math.min(1, result.confidence + 0.15);
    } else if (result.confidence > 0.3) {
      result.confidence = Math.max(0.3, result.confidence - 0.1);
    }
  }

  return result;
}

const aiClassificationService = {
  async classify(englishText, imageAnalysisText = '') {
    if (!englishText || !englishText.trim()) {
      return {
        category: 'Others',
        department: 'General Department',
        priority: 'Low',
        confidence: 0,
        summary: 'No complaint text provided',
        keywords: [],
        suggestedAction: 'Request more details from citizen.',
        needsManualReview: true
      };
    }

    logger.info('Running AI classification...');
    let raw;
    try {
      raw = await aiProvider.classify(englishText, imageAnalysisText);
    } catch (err) {
      logger.error('AI classification error, using fallback', err);
      raw = aiProvider._mockClassify(englishText, imageAnalysisText);
    }

    if (!raw || typeof raw !== 'object') {
      raw = aiProvider._mockClassify(englishText, imageAnalysisText);
    }

    const result = normalizeResult(raw, imageAnalysisText);
    result.needsManualReview = result.confidence < 0.4;

    logger.info(`Classification result: ${result.category} (${result.priority}) confidence: ${result.confidence}`);
    return result;
  },

  getValidCategories() {
    return [...VALID_CATEGORIES];
  },

  getCategoryDepartmentMap() {
    return { ...CATEGORY_DEPARTMENT_MAP };
  },

  getDepartmentCategoryMap() {
    return { ...DEPARTMENT_CATEGORY_MAP };
  }
};

module.exports = aiClassificationService;
