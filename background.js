const STORAGE_KEY = 'latestFeedback';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') {
    sendResponse({ ok: false, error: 'Invalid message payload.' });
    return false;
  }

  if (message.type === 'SAVE_FEEDBACK') {
    const { selector, note, pageUrl } = message.payload || {};

    if (typeof selector !== 'string' || !selector.trim()) {
      sendResponse({ ok: false, error: 'Selector is required.' });
      return false;
    }

    if (typeof note !== 'string') {
      sendResponse({ ok: false, error: 'Note must be a string.' });
      return false;
    }

    const feedback = {
      selector: selector.trim(),
      note: note.trim(),
      pageUrl: typeof pageUrl === 'string' ? pageUrl : '',
      capturedAt: new Date().toISOString()
    };

    chrome.storage.local.set({ [STORAGE_KEY]: feedback }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      sendResponse({ ok: true, feedback });
    });

    return true;
  }

  if (message.type === 'GET_LATEST_FEEDBACK') {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      sendResponse({ ok: true, feedback: result[STORAGE_KEY] || null });
    });

    return true;
  }

  sendResponse({ ok: false, error: 'Unsupported message type.' });
  return false;
});