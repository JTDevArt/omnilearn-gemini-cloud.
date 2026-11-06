// Select actual messages, never manufacture a summary of a learner's history.
export function selectConversationContext(history, query, maxChars = 14000) {
  const messages = Array.isArray(history) ? history.slice(-24) : [];
  const words = new Set(
    String(query)
      .toLowerCase()
      .match(/\p{L}{3,}/gu) || []
  );
  const ranked = messages.map((message, index) => ({
    message,
    index,
    text: message.parts?.map((part) => part.text || '').join('\n') || ''
  }));
  const recent = ranked.slice(-6);
  const older = ranked
    .slice(0, -6)
    .map((item) => ({
      ...item,
      score: [...words].filter((word) => item.text.toLowerCase().includes(word))
        .length
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.index - a.index)
    .slice(0, 2);
  const kept = [];
  let size = 0;
  for (const item of [...recent].reverse().concat(older)) {
    if (size + item.text.length > maxChars) continue;
    kept.push(item);
    size += item.text.length;
  }
  return kept.sort((a, b) => a.index - b.index).map((item) => item.message);
}
