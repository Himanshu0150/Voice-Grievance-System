const db = require('../config/database');
const aiProvider = require('./aiProvider');
const translationService = require('./translationService');
const logger = require('../utils/logger');

const SYSTEM_PROMPT = `You are "Sevak AI", the official AI assistant for the Voice-Based Grievance System (Panchayat).
You help citizens with:
- Government services and schemes (ration cards, pension, Aadhaar, scholarships, water/electricity connections, land records)
- How to file a complaint using voice, text, or phone
- Complaint status tracking (ask for the complaint reference ID like CMP-2026-000001)
- Required documents for common services
- General FAQs about panchayat services

Rules:
- Answer in simple, clear language. If the user writes in Hindi or another Indian language, reply in the same language.
- If the user provides a complaint reference number, check its status and inform them about it (use the provided complaint data in context).
- If you don't know an exact answer, suggest contacting the local panchayat office or the helpline.
- Keep answers concise (under 150 words). Be polite and professional.
- Do not invent complaint statuses. Only report the status from the provided complaint data.`;

const chatService = {
  async ask(message, user = null, targetLanguage = 'en') {
    if (!message || !message.trim()) {
      const err = new Error('Message is required');
      err.statusCode = 400;
      throw err;
    }

    let complaintContext = '';
    const refMatch = (message || '').match(/CMP-\d{4}-\d{6}/i);
    if (refMatch) {
      const ref = refMatch[0].toUpperCase();
      const complaint = db.get(
        `SELECT c.*, d.departmentName FROM complaints c
         LEFT JOIN departments d ON c.departmentId = d.id
         WHERE c.complaintId = ?`,
        [ref]
      );
      if (complaint) {
        const supporterCount = db.count(
          'SELECT COUNT(*) as count FROM complaint_supporters WHERE complaintId = ?',
          [complaint.id]
        );
        complaintContext = `\n\nComplaint found for reference ${ref}:\n` +
          `Title: ${complaint.title}\nCategory: ${complaint.category}\n` +
          `Department: ${complaint.departmentName || 'Unassigned'}\nStatus: ${complaint.status}\n` +
          `Priority: ${complaint.priority}\nSupporters: ${supporterCount}\n` +
          `Submitted: ${complaint.createdAt}\nEstimated resolution: ${complaint.estimatedResolutionDays || 'N/A'} days\n` +
          `Impact score: ${complaint.impactScore || 'N/A'}/100\n` +
          `Remarks: ${complaint.resolutionRemark || 'None'}`;
      } else {
        complaintContext = `\n\nNote: No complaint found with reference ${ref}. Tell the user the reference may be incorrect and suggest checking "My Complaints".`;
      }
    }

    let reply;
    if (aiProvider.isConfigured()) {
      try {
        reply = await aiProvider.chat(
          SYSTEM_PROMPT + complaintContext,
          message,
          { temperature: 0.4, maxTokens: 512 }
        );
      } catch (err) {
        logger.error(`[CHAT] AI call failed: ${err.message}`);
        reply = this._fallbackReply(message);
      }
    } else {
      reply = this._fallbackReply(message);
    }

    const targetCode = translationService.getLanguageCode(targetLanguage);
    if (reply && targetCode && targetCode !== 'en' && aiProvider.isConfigured()) {
      try {
        const localized = await translationService.translateText(reply, targetCode);
        if (localized && localized !== reply) reply = localized;
      } catch (err) {
        logger.warn(`[CHAT] Reply translation failed (${targetCode}): ${err.message}`);
      }
    }

    return {
      reply,
      complaintRef: refMatch ? refMatch[0].toUpperCase() : null
    };
  },

  _fallbackReply(message) {
    const lower = message.toLowerCase();
    if (lower.includes('status') || lower.includes('track') || lower.includes('कहां')) {
      return 'To track your complaint status, open the "My Complaints" page or share your complaint reference ID (format: CMP-2026-000001) and I can check it for you.';
    }
    if (lower.includes('complaint') || lower.includes('shikayat') || lower.includes('शिकायत')) {
      return 'You can file a complaint by clicking "New Complaint" in the app. You can speak your complaint in your language, attach photos, and add your location. The AI will classify and route it to the right department automatically.';
    }
    if (lower.includes('document') || lower.includes('dokument') || lower.includes('दस्तावेज')) {
      return 'Required documents usually include: Aadhaar card, residence proof, and identity proof. Specific schemes may need additional documents - tell me which service you are applying for.';
    }
    if (lower.includes('aadhaar')) {
      return 'Aadhaar-related services are handled by UIDAI. You can update or correct Aadhaar details at an Aadhaar Seva Kendra. For linking Aadhaar to schemes, the local panchayat office can assist.';
    }
    if (lower.includes('ration') || lower.includes('pds')) {
      return 'For ration card services (new card, corrections, NFSA), visit your nearest Public Distribution System (PDS) office or the e-Seva Kendra with Aadhaar and address proof.';
    }
    if (lower.includes('pension')) {
      return 'For pension schemes (old age, widow, disability), contact the Social Welfare department at the panchayat office. Required documents: Aadhaar, bank passbook, age proof, and income certificate.';
    }
    if (lower.includes('water')) {
      return 'For water connection or water supply issues, file a complaint via "New Complaint" - the Water Department resolves water-related complaints on priority. Typical resolution time is 1 day.';
    }
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('namaste') || lower.includes('नमस्ते')) {
      return 'Namaste! I am Sevak AI, the grievance assistant. I can help you with complaint filing, status tracking, government services, and required documents. How can I help you today?';
    }
    return 'I can help you with government services, complaint filing and tracking, and required documents. Please share your complaint reference ID if you want to check a status, or describe your question in detail.';
  }
};

module.exports = chatService;
