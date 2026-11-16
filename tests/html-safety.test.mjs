import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../public/safe-html.js',import.meta.url),'utf8');
const textNode = text => ({textContent:text});
const element = tag => ({tag,children:[],append(...children){this.children.push(...children);}});
const document = {createElement:element,createTextNode:textNode,createDocumentFragment:()=>element('fragment')};

test('HTML helpers fail closed without DOMPurify and accept only their sanitized fragments', () => {
  const window={};
  vm.runInNewContext(script,{window,document});
  assert.equal(window.OmniHtml.sanitize('<img src=x onerror="bad()">'), '&lt;img src=x onerror=&quot;bad()&quot;&gt;');
  const fragment=window.OmniHtml.fragment('<script>bad()</script>');
  assert.equal(fragment.children[0].textContent,'<script>bad()</script>');
  assert.equal(window.OmniHtml.isSanitizedNode(fragment),true);
  assert.equal(window.OmniHtml.isSanitizedNode(element('img')),false);
});

test('section renders strings literally, makes heading text, accepts sanitized fragments and rejects arbitrary nodes', () => {
  const window={};
  vm.runInNewContext(script,{window,document});
  const source=readFileSync(new URL('../public/dashboard-shell.js',import.meta.url),'utf8');
  const start=source.indexOf('const section = '),end=source.indexOf('    const saveStatus',start);
  const host=element('main');
  const section=vm.runInNewContext(source.slice(start,end)+'\nsection;',{window,document,host});
  const node=section('<img onerror=bad()>','<b>literal</b>');
  assert.equal(node.children[0].textContent,'<img onerror=bad()>');
  assert.equal(node.children[1].textContent,'<b>literal</b>');
  const safe=window.OmniHtml.fragment('<script>bad()</script>');
  assert.equal(section('Title',safe).children[1],safe);
  assert.throws(()=>section('Title',element('script')),/sanitized fragment/);
  assert.throws(()=>section('Title',{nodeType:11}),/sanitized fragment/);
});

test('every audited innerHTML assignment is a literal, clear, sanitized template or safe Markdown', () => {
  let sites=0;
  for(const name of readdirSync(new URL('../public/',import.meta.url)).filter(name=>name.endsWith('.js'))){
    const source=readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
    for(const match of source.matchAll(/\.innerHTML\s*=(?!=)\s*/g)){
      sites++;
      const rhs=source.slice(match.index+match[0].length);
      assert.ok(/^(?:window\.OmniHtml\.sanitize\(|(?:window\.)?renderMarkdownToSafeHtml\(|'(?:[^'\\]|\\.)*'\s*;|"(?:[^"\\]|\\.)*"\s*;|`[^`$]*`\s*;)/.test(rhs),name+':'+source.slice(0,match.index).split('\n').length);
    }
  }
  assert.equal(sites,67,'Update the audit inventory when introducing or removing a sink.');
  const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  assert.ok(html.indexOf('/vendor/purify.min.js') < html.indexOf('/safe-html.js'));
  assert.ok(html.indexOf('/safe-html.js') < html.indexOf('/app.js'));
});
