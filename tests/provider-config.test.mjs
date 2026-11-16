import test from 'node:test';
import assert from 'node:assert/strict';
import { thinkingConfigForModel, textGenerationConfig } from '../lib/provider-models.js';

test('known models use their supported thinking parameter; unknown models omit it and warn once', () => {
  for (const model of ['gemini-2.5-flash','gemini-2.5-flash-lite','gemini-2.5-pro'])
    assert.deepEqual(thinkingConfigForModel(model,'MEDIUM'),{thinkingConfig:{thinkingBudget:8192}});
  for (const model of ['gemini-3.8-flash','gemini-3.1-flash-lite','gemini-3-flash-preview'])
    assert.deepEqual(thinkingConfigForModel(model,'HIGH'),{thinkingConfig:{thinkingLevel:'HIGH'}});
  for (const model of ['gemini-2.0-flash','gemini-2.0-flash-lite','gemini-2.5-flash-preview-tts'])
    assert.deepEqual(thinkingConfigForModel(model,'LOW'),{});
  const warnings=[];
  assert.deepEqual(thinkingConfigForModel('unknown-model','HIGH',m=>warnings.push(m)),{});
  thinkingConfigForModel('unknown-model','HIGH',m=>warnings.push(m));
  assert.equal(warnings.length,1);
});

test('all generation stages reserve visible output beyond their thinking budget', () => {
  for (const stage of ['chat-generate','exam-grade','research-synthesis','source-analysis','study-summary','study-quiz','study-cards','study-map','study-plan','study-research','study-journey']) {
    for (const level of ['LOW','MEDIUM','HIGH']) {
      const config=textGenerationConfig('gemini-2.5-flash',level,stage==='source-analysis'?9000:6000);
      assert.ok(config.maxOutputTokens > config.thinkingConfig.thinkingBudget, stage);
      assert.ok(config.maxOutputTokens-config.thinkingConfig.thinkingBudget>=6000,stage);
      assert.equal(textGenerationConfig('gemini-3.8-flash',level).maxOutputTokens,65536);
    }
  }
});
