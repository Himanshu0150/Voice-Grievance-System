const EMOTION_LEVELS = [
  { emotion: 'Calm', severity: 0, priorityBoost: null },
  { emotion: 'Neutral', severity: 1, priorityBoost: null },
  { emotion: 'Concerned', severity: 2, priorityBoost: null },
  { emotion: 'Angry', severity: 3, priorityBoost: 'High' },
  { emotion: 'Fear', severity: 4, priorityBoost: 'High' },
  { emotion: 'Distress', severity: 5, priorityBoost: 'Critical' },
  { emotion: 'Panic', severity: 6, priorityBoost: 'Critical' }
];

const PRIORITY_ORDER = ['Low', 'Medium', 'High', 'Critical'];

function getEmotionMeta(emotion) {
  if (!emotion) return { emotion: null, severity: 1, priorityBoost: null };
  return EMOTION_LEVELS.find(e => e.emotion === emotion) || { emotion, severity: 1, priorityBoost: null };
}

function emotionScore(emotion) {
  return getEmotionMeta(emotion).severity;
}

function applyEmotionPriority(priority, emotion) {
  const meta = getEmotionMeta(emotion);
  if (!meta.priorityBoost) return priority;
  const current = PRIORITY_ORDER.indexOf(priority);
  const target = PRIORITY_ORDER.indexOf(meta.priorityBoost);
  if (current < 0) return priority;
  return current >= target ? priority : meta.priorityBoost;
}

module.exports = {
  EMOTION_LEVELS,
  PRIORITY_ORDER,
  getEmotionMeta,
  emotionScore,
  applyEmotionPriority
};
