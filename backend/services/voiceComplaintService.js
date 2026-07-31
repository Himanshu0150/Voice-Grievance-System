const translationService = require('./translationService');
const aiClassificationService = require('./aiClassificationService');
const imageAnalysisService = require('./imageAnalysisService');
const aiProvider = require('./aiProvider');
const complaintService = require('./complaintService');
const Notification = require('../models/Notification');
const Department = require('../models/Department');
const estimateService = require('./estimateService');
const timelineService = require('./timelineService');
const imageHashService = require('./imageHashService');
const logger = require('../utils/logger');

function resolveDepartmentId(departmentName) {
  if (!departmentName) return null;
  const dept = Department.findByName(departmentName);
  return dept ? dept.id : null;
}

function toBool(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

const voiceComplaintService = {
  async processVoiceComplaint(data, files = {}) {
    const {
      userId,
      voiceTranscript,
      speechLanguage = 'hi-IN',
      address,
      latitude,
      longitude,
      isAnonymous,
      englishTranslation: preTranslated
    } = data;

    if (!voiceTranscript || !voiceTranscript.trim()) {
      const err = new Error('Voice transcript is required');
      err.statusCode = 400;
      throw err;
    }

    logger.info('=== VOICE COMPLAINT PIPELINE START ===');
    logger.info(`User ID: ${userId}, Language: ${speechLanguage}, Anonymous: ${!!isAnonymous}`);

    let originalText = voiceTranscript;
    let englishTranslation = preTranslated || null;
    let translationAvailable = false;

    if (englishTranslation) {
      translationAvailable = true;
      logger.info('Using pre-translated text (already translated during similarity check)');
    } else {
      const result = await translationService.translateToEnglish(voiceTranscript, speechLanguage);
      originalText = result.originalText;
      englishTranslation = result.englishTranslation;
      translationAvailable = result.translationAvailable;
    }

    const imagePaths = [];
    if (files.images) {
      files.images.forEach(f => imagePaths.push(`/uploads/images/${f.filename}`));
    }
    logger.info(`Images to analyze: ${imagePaths.length}`);

    const imageAnalysis = await imageAnalysisService.analyzeImages(imagePaths);

    const aiResult = await aiClassificationService.classify(
      englishTranslation,
      imageAnalysis.combinedText
    );

    if (imageAnalysis.imageCategory && aiResult.category === 'Others') {
      aiResult.category = imageAnalysis.imageCategory;
      aiResult.department = aiClassificationService.getValidCategories().includes(aiResult.category)
        ? (aiClassificationService.getCategoryDepartmentMap()?.[aiResult.category] || 'General Department')
        : 'General Department';
      logger.info(`Category overridden by image analysis: ${aiResult.category}`);
    }

    let officerRecommendation = null;
    let aiSummary = aiResult.summary;
    if (aiProvider.isConfigured()) {
      try {
        const rec = await aiProvider.generateRecommendation(
          englishTranslation,
          aiResult.category,
          aiResult.keywords,
          imageAnalysis.combinedText
        );
        aiSummary = rec.summary || aiResult.summary;
        officerRecommendation = rec.officerRecommendation;
        if (rec.keywords?.length) aiResult.keywords = rec.keywords;
        if (rec.suggestedAction) aiResult.suggestedAction = rec.suggestedAction;
      } catch (err) {
        logger.warn(`[AI RECOMMENDATION] Skipped: ${err.message}`);
      }
    }

    const departmentId = resolveDepartmentId(aiResult.department) || data.departmentId || null;
    const priority = aiResult.priority || 'Medium';
    const etaDays = estimateService.estimateComplaint({ category: aiResult.category }, priority);

    const complaintPayload = {
      userId,
      title: aiSummary || englishTranslation.substring(0, 100),
      category: aiResult.category,
      description: englishTranslation,
      voiceTranscript: originalText,
      speechLanguage,
      address: address || null,
      priority,
      latitude: latitude || null,
      longitude: longitude || null,
      departmentId,
      originalLanguage: speechLanguage,
      originalText: originalText,
      englishTranslation: englishTranslation,
      aiSummary,
      detectedCategory: aiResult.category,
      aiConfidence: aiResult.confidence,
      aiKeywords: JSON.stringify(aiResult.keywords),
      aiProcessed: 1,
      needsManualReview: aiResult.needsManualReview ? 1 : 0,
      suggestedAction: aiResult.suggestedAction,
      officerRecommendation,
      estimatedResolutionDays: etaDays,
      prioritySource: 'ai',
      isAnonymous: toBool(isAnonymous) ? 1 : 0,
      similarComplaintId: data.similarComplaintId || null
    };

    const complaint = complaintService.createVoiceComplaint(complaintPayload, files);

    if (imageAnalysis.results.length > 0) {
      imageAnalysis.results.forEach(r => {
        if (r.detected !== 'error') {
          logger.info(`Image analysis: ${r.image} -> ${r.detected} (${(r.confidence * 100).toFixed(0)}%)`);
        }
      });
    }

    if (imageHashService && files.images) {
      try {
        for (const file of files.images) {
          const fullPath = require('path').resolve(__dirname, '..', 'uploads', 'images', file.filename);
          const hash = await imageHashService.computePhash(fullPath);
          if (hash) {
            const db = require('../config/database');
            const imagePath = `/uploads/images/${file.filename}`;
            db.run('UPDATE complaint_images SET phash = ? WHERE complaintId = ? AND imagePath = ?', [hash, complaint.id, imagePath]);
            imageHashService.storeHash(hash, imagePath, complaint.id);
            db.saveDatabase();
          }
        }
      } catch (err) {
        logger.warn(`[IMAGE HASH] Failed to store pHash: ${err.message}`);
      }
    }

    Notification.create({
      userId,
      title: 'Complaint Submitted Successfully',
      message: `Your complaint has been registered. Reference: ${complaint.complaintId}. Category: ${aiResult.category}. Priority: ${aiResult.priority}. Estimated resolution: ${etaDays} days.`,
      type: 'info'
    });

    logger.info(`Complaint created: ${complaint.complaintId} (DB id: ${complaint.id}), dept: ${aiResult.department}, ETA: ${etaDays}d, impact pending`);
    logger.info('=== VOICE COMPLAINT PIPELINE END ===');

    return {
      ...complaint,
      aiAnalysis: {
        originalLanguage: speechLanguage,
        originalText,
        englishTranslation,
        translationAvailable,
        summary: aiSummary,
        category: aiResult.category,
        department: aiResult.department,
        priority,
        confidence: aiResult.confidence,
        keywords: aiResult.keywords,
        suggestedAction: aiResult.suggestedAction,
        officerRecommendation,
        needsManualReview: aiResult.needsManualReview,
        estimatedResolutionDays: etaDays,
        imageAnalysis: imageAnalysis.results
      }
    };
  }
};

module.exports = voiceComplaintService;
