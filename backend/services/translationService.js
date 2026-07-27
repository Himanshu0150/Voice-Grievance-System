const aiProvider = require('./aiProvider');
const logger = require('../utils/logger');

const LANG_MAP = {
  'hi-IN': { name: 'Hindi', code: 'hi' },
  'mr-IN': { name: 'Marathi', code: 'mr' },
  'gu-IN': { name: 'Gujarati', code: 'gu' },
  'ta-IN': { name: 'Tamil', code: 'ta' },
  'te-IN': { name: 'Telugu', code: 'te' },
  'kn-IN': { name: 'Kannada', code: 'kn' },
  'ml-IN': { name: 'Malayalam', code: 'ml' },
  'bn-IN': { name: 'Bengali', code: 'bn' },
  'pa-IN': { name: 'Punjabi', code: 'pa' },
  'or-IN': { name: 'Odia', code: 'or' },
  'en-IN': { name: 'English', code: 'en' },
  'en': { name: 'English', code: 'en' },
  'hi': { name: 'Hindi', code: 'hi' }
};

function getLanguageName(locale) {
  return LANG_MAP[locale]?.name || locale;
}

const translationService = {
  async translateToEnglish(text, sourceLocale) {
    if (!text || !text.trim()) {
      logger.warn('[TRANSLATE] Empty text received, skipping');
      return { originalText: '', englishTranslation: '', translationAvailable: true };
    }

    const langInfo = LANG_MAP[sourceLocale];
    const sourceLanguage = langInfo?.name || sourceLocale;
    const isEnglish = langInfo?.code === 'en';

    if (isEnglish) {
      logger.info('[TRANSLATE] Source is English, no translation needed');
      return { originalText: text, englishTranslation: text, translationAvailable: true };
    }

    logger.info(`[TRANSLATE] Starting translation from ${sourceLanguage} (${sourceLocale})`);
    logger.info(`[TRANSLATE] Original Text: "${text.substring(0, 200)}"`);

    const translated = await aiProvider.translate(text, sourceLanguage, 'en');

    const hasNonLatin = /[\u0900-\u09FF\u0A00-\u0A7F\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E00-\u0E7F]/.test(text);
    const translatedHasNonLatin = /[\u0900-\u09FF\u0A00-\u0A7F\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E00-\u0E7F]/.test(translated);
    const translationFailed = hasNonLatin && translatedHasNonLatin;

    const translationAvailable = aiProvider.isConfigured() && !translationFailed;

    if (translationFailed) {
      logger.warn(`[TRANSLATE] Translation failed - AI provider returned non-English text`);
      logger.warn(`[TRANSLATE] Using original text as fallback for ${sourceLanguage}`);
    } else if (aiProvider.isConfigured()) {
      logger.info(`[TRANSLATE] English Translation: "${translated.substring(0, 200)}"`);
    }

    return {
      originalText: text,
      englishTranslation: translationFailed ? text : (translated || text),
      translationAvailable
    };
  },

  isTranslationAvailable() {
    return aiProvider.isConfigured() && !!process.env.AI_API_KEY;
  },

  getLanguageName
};

module.exports = translationService;
