const copy = (value) => structuredClone(value);
const uid = () => `node-${crypto.randomUUID()}`;
export function validateGraph(graph) {
  if (
    !graph ||
    graph.schemaVersion !== 1 ||
    !Array.isArray(graph.nodes) ||
    !graph.nodes.length ||
    graph.nodes.length > 200 ||
    !Array.isArray(graph.edges) ||
    graph.edges.length > 500
  )
    throw new Error('Struktur mindmap tidak valid.');
  const nodes = new Map();
  for (const node of graph.nodes) {
    if (
      !node ||
      typeof node.id !== 'string' ||
      !/^[\w-]{1,80}$/.test(node.id) ||
      nodes.has(node.id) ||
      typeof node.title !== 'string' ||
      !node.title.trim() ||
      node.title.length > 300 ||
      typeof node.description !== 'string' ||
      node.description.length > 5000
    )
      throw new Error('Node tidak valid atau berulang.');
    nodes.set(node.id, node);
  }
  if (!nodes.has(graph.rootId) || nodes.get(graph.rootId).parentId !== null)
    throw new Error('Akar mindmap harus tersedia.');
  for (const node of graph.nodes) {
    if (node.id === graph.rootId) continue;
    const seen = new Set([node.id]);
    let current = node;
    while (current.id !== graph.rootId) {
      current = nodes.get(current.parentId);
      if (!current || seen.has(current.id) || seen.size > 12)
        throw new Error(
          'Cabang terputus, terlalu dalam, atau membentuk siklus.'
        );
      seen.add(current.id);
    }
  }
  const edges = new Set();
  for (const edge of graph.edges) {
    const key = `${edge.from}:${edge.to}`;
    if (
      !nodes.has(edge.from) ||
      !nodes.has(edge.to) ||
      edge.from === edge.to ||
      typeof edge.label !== 'string' ||
      edge.label.length > 300 ||
      edges.has(key)
    )
      throw new Error('Hubungan node tidak valid.');
    edges.add(key);
  }
  return graph;
}
export function graphFromMap(map = {}) {
  if (map.editorGraph) return validateGraph(copy(map.editorGraph));
  const nodes = [
    {
      id: 'root',
      parentId: null,
      title: String(map.centralTopic || 'Mindmap baru').slice(0, 300),
      description: String(map.summary || ''),
      collapsed: false,
    },
  ];
  for (const [i, branch] of (map.branches || []).entries()) {
    const id = `branch-${i + 1}`;
    nodes.push({
      id,
      parentId: 'root',
      title: branch.title,
      description: branch.explanation || '',
      collapsed: Boolean(branch.collapsed),
    });
    for (const [j, sub] of (branch.subconcepts || []).entries())
      nodes.push({
        id: `${id}-sub-${j + 1}`,
        parentId: id,
        title: sub.title,
        description: sub.detail || '',
        collapsed: false,
      });
  }
  const edges = (map.relationships || [])
    .map((r) => ({
      from: nodes.find((n) => n.title === r.from)?.id,
      to: nodes.find((n) => n.title === r.to)?.id,
      label: r.relation || '',
    }))
    .filter((r) => r.from && r.to && r.from !== r.to);
  return validateGraph({
    schemaVersion: 1,
    rootId: 'root',
    nodes,
    edges: [...new Map(edges.map((e) => [`${e.from}:${e.to}`, e])).values()],
  });
}
export function graphEdit(graph, action) {
  const next = copy(validateGraph(graph)),
    node = next.nodes.find((n) => n.id === action.id);
  if (!node && action.type !== 'connect' && action.type !== 'disconnect')
    throw new Error('Node tidak ditemukan.');
  if (action.type === 'add')
    next.nodes.push({
      id: action.newId || uid(),
      parentId: action.sibling ? node.parentId : node.id,
      title: String(action.title || 'Konsep baru'),
      description: '',
      collapsed: false,
    });
  else if (action.type === 'edit') {
    node.title = String(action.title || '').trim();
    node.description = String(action.description || '');
  } else if (action.type === 'collapse') node.collapsed = !node.collapsed;
  else if (action.type === 'delete') {
    if (node.id === next.rootId)
      throw new Error(
        'Akar tidak dapat dihapus. Buat peta baru untuk menggantinya.'
      );
    const removed = new Set([node.id]);
    let previous;
    do {
      previous = removed.size;
      next.nodes.forEach((n) => {
        if (removed.has(n.parentId)) removed.add(n.id);
      });
    } while (previous !== removed.size);
    next.nodes = next.nodes.filter((n) => !removed.has(n.id));
    next.edges = next.edges.filter(
      (e) => !removed.has(e.from) && !removed.has(e.to)
    );
  } else if (action.type === 'move') {
    if (node.id === next.rootId)
      throw new Error('Akar tidak dapat dipindahkan.');
    node.parentId = action.parentId;
  } else if (action.type === 'reorder') {
    const siblings = next.nodes.filter((n) => n.parentId === node.parentId),
      index = siblings.findIndex((n) => n.id === node.id),
      other = siblings[index + action.direction];
    if (other) {
      const a = next.nodes.indexOf(node),
        b = next.nodes.indexOf(other);
      [next.nodes[a], next.nodes[b]] = [next.nodes[b], next.nodes[a]];
    }
  } else if (action.type === 'connect')
    next.edges.push({
      from: action.from,
      to: action.to,
      label: String(action.label || 'terkait'),
    });
  else if (action.type === 'disconnect')
    next.edges = next.edges.filter(
      (e) => !(e.from === action.from && e.to === action.to)
    );
  else throw new Error('Operasi mindmap tidak dikenal.');
  return validateGraph(next);
}
