const speechService = {
  processTranscript(transcript) {
    if (!transcript || typeof transcript !== 'string') return null;
    return transcript.trim();
  },

  categorizeByKeywords(transcript) {
    if (!transcript) return 'Other';

    const lower = transcript.toLowerCase();
    const keywords = {
      'Road': ['road', 'street', 'path', 'pothole', 'footpath'],
      'Water Supply': ['water', 'pipeline', 'tap', 'drinking water', 'supply'],
      'Sanitation': ['garbage', 'waste', 'clean', 'toilet', 'dirty'],
      'Electricity': ['electric', 'power', 'light', 'voltage', 'transformer', 'wire'],
      'Street Light': ['street light', 'lamp', 'pole light'],
      'Drainage': ['drain', 'sewage', 'blocked drain', 'stagnant'],
      'Health': ['hospital', 'clinic', 'health', 'medicine', 'doctor'],
      'Education': ['school', 'teacher', 'education', 'college', 'student'],
      'Agriculture': ['farm', 'crop', 'agriculture', 'irrigation', 'field'],
      'Revenue': ['land', 'tax', 'revenue', 'property', 'document'],
      'Forest': ['forest', 'tree', 'wildlife', 'green'],
      'Public Building': ['building', 'community hall', 'library', 'park']
    };

    for (const [category, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (lower.includes(word)) return category;
      }
    }

    return 'Other';
  }
};

module.exports = speechService;
