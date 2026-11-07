// Reject known incompatible families without pretending names prove live access.
export function modelCompatible(model, stage) {
  if (!model || /embedding|imagen|veo|\baqa\b/i.test(model)) return false;
  if (stage === 'speech') return /tts/i.test(model);
  return !/tts|native-audio/i.test(model);
}
export function thinkingConfigForModel(model, level) {
  if (/^gemini-2\.5-/.test(model))
    return {thinkingConfig:{thinkingBudget:({LOW:1024, MEDIUM:8192, HIGH:16384})[String(level).toUpperCase()] || 8192}};
  if (/^gemini-(?:1|2\.0)-/.test(model)) return {};
  return {thinkingConfig:{thinkingLevel:level}};
}
