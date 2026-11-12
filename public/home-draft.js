// Clear only the submitted draft; another view may have saved a newer message.
export function clearSubmittedDraft(storage, key, submitted) {
  try {
    if (storage.getItem(key) !== submitted) return false;
    storage.removeItem(key);
    return true;
  } catch { return false; }
}
