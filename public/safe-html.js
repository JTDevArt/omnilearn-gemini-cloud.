(() => {
  'use strict';
  const fragments = new WeakSet();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const policy = {
    ADD_TAGS:['math','semantics','mrow','mi','mo','mn','msup','msub','msubsup','mfrac','msqrt','mroot','mtable','mtr','mtd','mtext','mspace','annotation'],
    ADD_ATTR:['encoding','mathvariant','stretchy','separator','accent','accentunder','columnalign','rowalign','columnspacing','rowspacing','frame','framespacing','equalrows','equalcolumns','displaystyle','scriptlevel','target','rel'],
    FORBID_TAGS:['script','style','iframe','object','embed'],
  };
  const sanitize = value => {
    const raw = String(value ?? '');
    return typeof window.DOMPurify?.sanitize === 'function'
      ? window.DOMPurify.sanitize(raw, policy) : escape(raw);
  };
  const fragment = value => {
    let node;
    if (typeof window.DOMPurify?.sanitize === 'function') {
      node = window.DOMPurify.sanitize(String(value ?? ''), {...policy, RETURN_DOM_FRAGMENT:true});
    } else {
      node = document.createDocumentFragment();
      node.append(document.createTextNode(String(value ?? '')));
    }
    fragments.add(node);
    return node;
  };
  window.OmniHtml = Object.freeze({sanitize, fragment, isSanitizedNode:node => fragments.has(node)});
})();
