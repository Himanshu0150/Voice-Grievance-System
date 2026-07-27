const translationService = require('./translationService');
const aiClassificationService = require('./aiClassificationService');
const imageAnalysisService = require('./imageAnalysisService');
const complaintService = require('./complaintService');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const voiceComplaintService = {
  async processVoiceComplaint(data, files = {}) {
    const {
      userId,
      voiceTranscript,
      speechLanguage = 'hi-IN',
      address,
      latitude,
      longitude
    } = data;

    if (!voiceTranscript || !voiceTranscript.trim()) {
      const err = new Error('Voice transcript is required');
      err.statusCode = 400;
      throw err;
    }

    logger.info('=== VOICE COMPLAINT PIPELINE START ===');
    logger.info(`User ID: ${userId}, Language: ${speechLanguage}`);
    logger.info(`Original Text: "${voiceTranscript.substring(0, 300)}"`);

    const { originalText, englishTranslation, translationAvailable } = await translationService.translateToEnglish(
      voiceTranscript, speechLanguage
    );

    logger.info(`Translation Available: ${translationAvailable}`);
    logger.info(`English Translation: "${englishTranslation.substring(0, 300)}"`);

    const imagePaths = [];
    if (files.images) {
      files.images.forEach(f => imagePaths.push(`/uploads/images/${f.filename}`));
    }
    logger.info(`Images to analyze: ${imagePaths.length}`);

    const imageAnalysis = await imageAnalysisService.analyzeImages(imagePaths);
    logger.info(`Image analysis results: ${imageAnalysis.results.length > 0 ? imageAnalysis.combinedText : 'none'}`);

    const aiResult = await aiClassificationService.classify(
      englishTranslation,
      imageAnalysis.combinedText
    );

    logger.info(`Detected Category: ${aiResult.category}`);
    logger.info(`Department: ${aiResult.department}`);
    logger.info(`Priority: ${aiResult.priority}`);
    logger.info(`Confidence: ${aiResult.confidence}`);
    logger.info(`Summary: ${aiResult.summary}`);
    logger.info(`Keywords: ${JSON.stringify(aiResult.keywords)}`);
    logger.info(`Needs Manual Review: ${aiResult.needsManualReview}`);

    if (imageAnalysis.imageCategory && aiResult.category === 'Others') {
      aiResult.category = imageAnalysis.imageCategory;
      aiResult.department = aiClassificationService.getValidCategories().includes(aiResult.category)
        ? (aiClassificationService.CATEGORY_DEPARTMENT_MAP?.[aiResult.category] || 'General Department')
        : 'General Department';
      logger.info(`Category overridden by image analysis: ${aiResult.category}`);
    }

    const complaintPayload = {
      userId,
      title: aiResult.summary || englishTranslation.substring(0, 100),
      category: aiResult.category,
      description: englishTranslation,
      voiceTranscript: originalText,
      speechLanguage,
      address: address || null,
      priority: aiResult.priority,
      latitude: latitude || null,
      longitude: longitude || null,
      departmentId: data.departmentId || null,
      originalLanguage: speechLanguage,
      originalText: originalText,
      englishTranslation: englishTranslation,
      aiSummary: aiResult.summary,
      detectedCategory: aiResult.category,
      aiConfidence: aiResult.confidence,
      aiKeywords: JSON.stringify(aiResult.keywords),
      aiProcessed: 1,
      needsManualReview: aiResult.needsManualReview ? 1 : 0,
      suggestedAction: aiResult.suggestedAction
    };

    const complaint = complaintService.createVoiceComplaint(complaintPayload, files);

    logger.info(`Complaint created: ${complaint.complaintId} (DB id: ${complaint.id})`);
    logger.info('=== VOICE COMPLAINT PIPELINE END ===');

    if (imageAnalysis.results.length > 0) {
      imageAnalysis.results.forEach(r => {
        if (r.detected !== 'error') {
          logger.info(`Image analysis: ${r.image} -> ${r.detected} (${(r.confidence * 100).toFixed(0)}%)`);
        }
      });
    }

    Notification.create({
      userId,
      title: 'Complaint Submitted Successfully',
      message: `Your complaint has been registered. Reference: ${complaint.complaintId}. Category: ${aiResult.category}. Priority: ${aiResult.priority}.`,
      type: 'info'
    });

    return {
      ...complaint,
      aiAnalysis: {
        originalLanguage: speechLanguage,
        originalText,
        englishTranslation,
        translationAvailable,
        summary: aiResult.summary,
        category: aiResult.category,
        department: aiResult.department,
        priority: aiResult.priority,
        confidence: aiResult.confidence,
        keywords: aiResult.keywords,
        suggestedAction: aiResult.suggestedAction,
        needsManualReview: aiResult.needsManualReview,
        imageAnalysis: imageAnalysis.results
      }
    };
  }
};

module.exports = voiceComplaintService;
