import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSourceReferences } from '../lib/source-references.js';
import { selectRelevantMaterialExcerpt } from '../lib/learning-engine.js';
test('generated page references must exist in the supplied source context', () => {
  assert.equal(validateSourceReferences('Valid [Halaman 2]', '[Page 2] Actual text'), 'Valid [Halaman 2]');
  for (const output of ['Invented [Page 3]', 'Invented [Halaman 99]'])
    assert.throws(()=>validateSourceReferences(output,'[Page 2] Actual text'),e=>e.code==='INVALID_AI_OUTPUT');
  assert.throws(()=>validateSourceReferences('Invented [Page 1]',''),e=>e.status===422);
});
test('context recognizes English page markers and bounds oversized relevant pages', () => {
  const source='[Page 1]\n'+ 'Background. '.repeat(150)+'\n[Page 2]\nTarget detail. '+ 'Evidence. '.repeat(150)+'\n[Page 3]\nSmall unrelated text.';
  const excerpt=selectRelevantMaterialExcerpt(source,'Explain page 2 target',200);
  assert.ok(excerpt.startsWith('[Page 2]'));
  assert.ok(excerpt.length<=200);
  assert.ok(source.includes(excerpt));
  assert.ok(selectRelevantMaterialExcerpt('Long unbroken source '.repeat(150),'',200).length>0);
});
