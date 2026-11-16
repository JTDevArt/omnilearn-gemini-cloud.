// Reject known incompatible families without pretending names prove live access.
export function modelCompatible(model, stage) {
  if (!model || /embedding|imagen|veo|\baqa\b/i.test(model)) return false;
  if (stage === 'speech') return /tts/i.test(model);
  return !/tts|native-audio/i.test(model);
}
const models = Object.freeze({
  'gemini-2.5-flash':'budget', 'gemini-2.5-flash-lite':'budget', 'gemini-2.5-pro':'budget',
  'gemini-3.8-flash':'level', 'gemini-3.1-flash-lite':'level', 'gemini-3-flash-preview':'level',
  'gemini-2.0-flash':'none', 'gemini-2.0-flash-lite':'none', 'gemini-2.5-flash-preview-tts':'none',
});
const budgets = {LOW:1024, MEDIUM:8192, HIGH:16384};
const warned = new Set();
export function thinkingConfigForModel(model, level, warn = console.warn) {
  const kind = Object.hasOwn(models, model) ? models[model] : undefined;
  const normalized = String(level).toUpperCase();
  const thinkingLevel = Object.hasOwn(budgets, normalized) ? normalized : 'MEDIUM';
  if (kind === 'budget') return {thinkingConfig:{thinkingBudget:budgets[thinkingLevel]}};
  if (kind === 'level') return {thinkingConfig:{thinkingLevel}};
  if (!kind && !warned.has(model)) {
    warned.add(model);
    warn('[OmniLearn] Unknown model thinking configuration; omitted.');
  }
  return {};
}
export function textGenerationConfig(model, level, visibleOutputTokens = 6000) {
  const config = thinkingConfigForModel(model, level);
  // Level models expose no numeric budget; reserve their full output ceiling.
  const maxOutputTokens = config.thinkingConfig?.thinkingLevel ? 65536
    : visibleOutputTokens + (config.thinkingConfig?.thinkingBudget || 0);
  return {...config, maxOutputTokens};
}
