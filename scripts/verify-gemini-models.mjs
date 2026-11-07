// Read-only model discovery; optional --generate makes one small primary text call.
// Credentials stay in the environment. No raw SDK error or response is printed.
import { GoogleGenAI } from '@google/genai';
import { ProviderManager } from '../lib/provider-manager.js';
import { classifyAiFailure } from '../lib/provider-errors.js';
import { thinkingConfigForModel } from '../lib/provider-models.js';
if (!process.env.GEMINI_API_KEY) {
  console.log(JSON.stringify({status:'blocked', reason:'GEMINI_API_KEY is not configured; no live model availability claimed.'}));
  process.exitCode = 2;
} else {
  const manager = new ProviderManager({primary:process.env.GEMINI_MODEL,
    fallback:process.env.GEMINI_FALLBACK_MODEL, multimodalFallback:process.env.GEMINI_MULTIMODAL_FALLBACK_MODEL,
    speech:process.env.GEMINI_SPEECH_MODEL});
  const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY, httpOptions:{timeout:10000,retryOptions:{attempts:1}}});
  const results = [];
  let blocked = false;
  for (const model of new Set(Object.values(manager.config).filter(Boolean))) {
    if (blocked) { results.push({model,status:'not-attempted'}); continue; }
    try {
      const metadata = await ai.models.get({model});
      const supported = metadata.supportedActions?.includes('generateContent');
      results.push({model,status:supported ? 'generateContent-advertised' : 'capabilities-unverified', supportedActions:metadata.supportedActions || []});
      if (!supported) process.exitCode = 1;
    } catch (error) {
      const failure = classifyAiFailure(error);
      results.push({model,status:failure.kind});
      process.exitCode = 1;
      blocked = ['authentication','daily-quota','rate-limit'].includes(failure.kind);
    }
  }
  if (process.argv.includes('--generate') && !blocked && results.some(r => r.model === manager.config.primary && r.status === 'generateContent-advertised')) {
    try {
      const response = await ai.models.generateContent({model:manager.config.primary, contents:'Reply with OK.',
        config:{maxOutputTokens:512, ...thinkingConfigForModel(manager.config.primary, 'LOW')}});
      const valid = Boolean(response.text?.trim()) && response.candidates?.[0]?.finishReason !== 'MAX_TOKENS';
      results.push({model:manager.config.primary, smokeTest:valid ? 'passed' : 'invalid-response'});
      if (!valid) process.exitCode = 1;
    } catch (error) { results.push({model:manager.config.primary,smokeTest:classifyAiFailure(error).kind}); process.exitCode = 1; }
  }
  console.log(JSON.stringify({checkedAt:new Date().toISOString(), results}, null, 2));
}
