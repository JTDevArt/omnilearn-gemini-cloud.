import { graphFromMap, graphEdit } from './mindmap-model.js';
const el = (tag, text) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
};
export function openMapEditor(map, onSave) {
  let graph = graphFromMap(map),
    selected = graph.rootId,
    history = [structuredClone(graph)],
    index = 0,
    zoom = 1;
  const root = el('dialog');
  root.className = 'forge-dialog map-manager';
  const heading = el('h2', 'Kelola mindmap'),
    close = el('button', 'Tutup'),
    toolbar = el('div'),
    body = el('div'),
    status = el('p');
  toolbar.className = 'panel-actions';
  body.className = 'map-manager-body';
  status.setAttribute('role', 'status');
  close.onclick = () => root.close();
  root.append(heading, close, toolbar, body, status);
  root.onclose = () => root.remove();
  document.body.append(root);
  root.showModal();
  function button(label, handler) {
    const b = el('button', label);
    b.type = 'button';
    b.onclick = handler;
    return b;
  }
  let saveSequence = 0;
  async function save() {
    const sequence = ++saveSequence;
    try {
      await onSave(structuredClone(graph));
      if (sequence !== saveSequence) return;
      status.textContent = window.OmniProduct.getCurrentSource()
        ? 'Perubahan mindmap disimpan; blueprint sumber asli tetap utuh.'
        : 'Peta tersimpan selama halaman ini terbuka. Ekspor JSON atau buat sumber untuk menyimpannya ke pustaka.';
    } catch (error) {
      status.textContent = error.message;
    }
  }
  function commit(action) {
    try {
      graph = graphEdit(graph, action);
      if (action.type === 'add') selected = graph.nodes.at(-1).id;
      history = history.slice(0, index + 1);
      history.push(structuredClone(graph));
      if (history.length > 40) history.shift();
      index = history.length - 1;
      if (!graph.nodes.some((n) => n.id === selected)) selected = graph.rootId;
      save();
      render();
    } catch (error) {
      status.textContent = error.message;
    }
  }
  const undo = button('Urungkan', () => {
      if (index) {
        graph = structuredClone(history[--index]);
        selected = graph.rootId;
        save();
        render();
      }
    }),
    redo = button('Ulangi', () => {
      if (index < history.length - 1) {
        graph = structuredClone(history[++index]);
        selected = graph.rootId;
        save();
        render();
      }
    });
  toolbar.append(
    undo,
    redo,
    button('Simpan', save),
    button('Ekspor JSON', () =>
      window.OmniSourceTools.exportJson(graph, 'omnilearn-mindmap.json')
    ),
    button('−', () => {
      zoom = Math.max(0.5, zoom - 0.1);
      render();
    }),
    button('+', () => {
      zoom = Math.min(1.8, zoom + 0.1);
      render();
    }),
    button('Pas layar', () => {
      zoom = 1;
      render();
    })
  );
  function render() {
    undo.disabled = index === 0;
    redo.disabled = index === history.length - 1;
    body.replaceChildren();
    const outline = el('div');
    outline.className = 'map-outline';
    outline.style.fontSize = `${zoom}em`;
    function branch(id, parent) {
      const n = graph.nodes.find((n) => n.id === id),
        row = el('div'),
        choose = button(`${n.collapsed ? '▸' : '▾'} ${n.title}`, () => {
          selected = id;
          render();
        });
      choose.className = n.id === selected ? 'active' : '';
      row.append(choose);
      parent.append(row);
      if (!n.collapsed) {
        const children = el('div');
        children.className = 'map-children';
        graph.nodes
          .filter((c) => c.parentId === id)
          .forEach((c) => branch(c.id, children));
        row.append(children);
      }
    }
    branch(graph.rootId, outline);
    const form = el('form'),
      node = graph.nodes.find((n) => n.id === selected),
      name = el('input'),
      detail = el('textarea');
    name.value = node.title;
    name.maxLength = 300;
    name.setAttribute('aria-label', 'Judul node');
    detail.value = node.description;
    detail.maxLength = 5000;
    detail.setAttribute('aria-label', 'Penjelasan node');
    const actions = el('div');
    actions.className = 'panel-actions';
    actions.append(
      button('Anak baru', () => commit({ type: 'add', id: selected })),
      button('Saudara baru', () =>
        commit({ type: 'add', id: selected, sibling: true })
      ),
      button('Lipat / buka', () => commit({ type: 'collapse', id: selected })),
      button('Naik', () =>
        commit({ type: 'reorder', id: selected, direction: -1 })
      ),
      button('Turun', () =>
        commit({ type: 'reorder', id: selected, direction: 1 })
      ),
      button('Hapus subtree', () => {
        if (
          confirm(
            'Hapus node ini beserta seluruh anaknya? Tindakan dapat diurungkan.'
          )
        )
          commit({ type: 'delete', id: selected });
      })
    );
    const submit = el('button', 'Simpan judul & penjelasan');
    submit.type = 'submit';
    form.onsubmit = (e) => {
      e.preventDefault();
      commit({
        type: 'edit',
        id: selected,
        title: name.value,
        description: detail.value,
      });
    };
    form.append(name, detail, submit, actions);
    function select(label) {
      const select = el('select');
      select.setAttribute('aria-label', label);
      for (const n of graph.nodes) {
        const option = el('option', n.title);
        option.value = n.id;
        select.append(option);
      }
      return select;
    }
    const parent = select('Induk baru');
    parent.value = node.parentId || graph.rootId;
    form.append(
      parent,
      button('Pindahkan ke induk', () =>
        commit({ type: 'move', id: selected, parentId: parent.value })
      )
    );
    const target = select('Node tujuan hubungan'),
      relation = el('input');
    relation.placeholder = 'Hubungan antarkonsep';
    relation.setAttribute('aria-label', 'Label hubungan');
    relation.maxLength = 300;
    form.append(
      target,
      relation,
      button('Hubungkan', () =>
        commit({
          type: 'connect',
          from: selected,
          to: target.value,
          label: relation.value,
        })
      )
    );
    for (const edge of graph.edges) {
      const row = el(
        'p',
        `${graph.nodes.find((n) => n.id === edge.from).title} → ${edge.label} → ${graph.nodes.find((n) => n.id === edge.to).title} `
      );
      row.append(
        button('Putuskan', () =>
          commit({ type: 'disconnect', from: edge.from, to: edge.to })
        )
      );
      form.append(row);
    }
    body.append(outline, form);
  }
  render();
}
window.OmniMapWorkspace = { open: openMapEditor };
window.OmniMapWorkspace.render = (host, map) => {
  const graph = graphFromMap(map),
    root = el('section'),
    toolbar = el('div'),
    tree = el('div');
  root.className = 'graph-map';
  toolbar.className = 'panel-actions';
  const manage = el('button', 'Kelola node');
  manage.onclick = () => openMapEditor(map, window.OmniProduct.saveMapGraph);
  toolbar.append(manage);
  const exportButton = el('button', 'Ekspor JSON');
  exportButton.onclick = () =>
    window.OmniSourceTools.exportJson(graph, 'omnilearn-mindmap.json');
  toolbar.append(exportButton);
  const viewport = el('div');
  viewport.className = 'map-viewport';
  let zoom = 1;
  for (const [label, delta] of [
    ['−', -0.1],
    ['+', 0.1],
    ['Pas layar', 0],
  ]) {
    const b = el('button', label);
    b.onclick = () => {
      zoom = delta ? Math.min(2, Math.max(0.5, zoom + delta)) : 1;
      tree.style.zoom = zoom;
    };
    toolbar.append(b);
  }
  viewport.onpointerdown = (e) => {
    if (e.target.closest('button,a')) return;
    const x = e.clientX,
      y = e.clientY,
      left = viewport.scrollLeft,
      top = viewport.scrollTop;
    viewport.setPointerCapture(e.pointerId);
    viewport.onpointermove = (event) => {
      viewport.scrollLeft = left + x - event.clientX;
      viewport.scrollTop = top + y - event.clientY;
    };
  };
  viewport.onpointerup = viewport.onpointercancel = () => {
    viewport.onpointermove = null;
  };
  function show(id, parent) {
    const node = graph.nodes.find((n) => n.id === id),
      card = el('article'),
      title = el('button', `${node.collapsed ? '▸' : '▾'} ${node.title}`);
    card.className = 'graph-node';
    title.onclick = async () => {
      try {
        await window.OmniProduct.saveMapGraph(
          graphEdit(graph, { type: 'collapse', id })
        );
      } catch (error) {
        window.toast?.(error.message);
      }
    };
    card.append(title);
    if (node.description) {
      const text = el('div');
      text.innerHTML = renderMarkdownToSafeHtml(node.description);
      card.append(text);
    }
    parent.append(card);
    if (!node.collapsed) {
      const children = el('div');
      children.className = 'map-children';
      graph.nodes
        .filter((n) => n.parentId === id)
        .forEach((n) => show(n.id, children));
      card.append(children);
    }
  }
  show(graph.rootId, tree);
  viewport.append(tree);
  root.append(toolbar, viewport);
  for (const edge of graph.edges)
    root.append(
      el(
        'p',
        `${graph.nodes.find((n) => n.id === edge.from).title} → ${edge.label} → ${graph.nodes.find((n) => n.id === edge.to).title}`
      )
    );
  host.replaceChildren(root);
};
