const aiProvider = require('./aiProvider');
const logger = require('../utils/logger');

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्' },
  { code: 'kok', name: 'Konkani', native: 'कोंकणी' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली' },
  { code: 'doi', name: 'Dogri', native: 'डोगरी' },
  { code: 'brx', name: 'Bodo', native: 'बर' },
  { code: 'sat', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'ks', name: 'Kashmiri', native: 'कॉशुर' },
  { code: 'mni', name: 'Manipuri (Meitei)', native: 'ꯃꯤꯇꯩꯂꯣꯟ' },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي' }
];

const LANG_MAP = {};
LANGUAGES.forEach(lang => {
  LANG_MAP[lang.code] = { name: lang.name, code: lang.code };
  LANG_MAP[`${lang.code}-IN`] = { name: lang.name, code: lang.code };
});

function getLanguageName(locale) {
  return LANG_MAP[locale]?.name || locale;
}

function getLanguageCode(locale) {
  if (!locale) return 'en';
  const code = String(locale).split('-')[0].toLowerCase();
  return LANG_MAP[code]?.code || null;
}

function hasNonLatinScript(text) {
  return /[\u0900-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0600-\u06FF\u0980-\u09FF\u1C50-\u1C7F\u0E00-\u0E7F\u0F00-\u0FFF\u0A8D\u0A8F]/.test(text);
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

    const hasNonLatin = hasNonLatinScript(text);
    const translatedHasNonLatin = hasNonLatinScript(translated);
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

  async translateText(text, targetLang) {
    if (!text || !text.trim()) return text;
    const code = getLanguageCode(targetLang);
    if (!code || code === 'en' || !aiProvider.isConfigured()) return text;

    const langName = LANG_MAP[code]?.name;
    if (!langName) return text;

    const sourceIsEnglish = !hasNonLatinScript(text);
    const alreadyTargetScript = hasNonLatinScript(text);
    if (alreadyTargetScript && code !== 'en') return text;

    try {
      const translated = await aiProvider.translate(text, sourceIsEnglish ? 'English' : 'Unknown', langName);
      const result = (translated || '').trim();
      if (!result) return text;
      return result;
    } catch (err) {
      logger.warn(`[TRANSLATE] translateText failed for ${targetLang}: ${err.message}`);
      return text;
    }
  },

  isTranslationAvailable() {
    return aiProvider.isConfigured() && !!process.env.GEMINI_API_KEY;
  },

  getLanguageName,
  getLanguageCode,
  getLanguages() {
    return LANGUAGES;
  }
};

module.exports = translationService;
