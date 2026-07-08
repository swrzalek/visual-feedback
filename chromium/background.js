const STORAGE_KEY = 'latestFeedback';
const SETTINGS_KEY = 'settings';
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
let creatingOffscreenDocument;

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);

  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl],
    });

    if (contexts.length > 0) {
      return;
    }
  }

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH),
      reasons: ['CLIPBOARD'],
      justification: 'Copy captured visual feedback to the clipboard.',
    });
  }

  try {
    await creatingOffscreenDocument;
  } finally {
    creatingOffscreenDocument = undefined;
  }
}

async function copyTextToClipboard(text) {
  await ensureOffscreenDocument();

  return chrome.runtime.sendMessage({
    type: 'WRITE_CLIPBOARD',
    target: 'offscreen',
    payload: { text },
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') {
    sendResponse({ ok: false, error: 'Invalid message payload.' });
    return false;
  }

  if (message.target === 'offscreen') {
    return false;
  }

  if (message.type === 'COPY_TO_CLIPBOARD') {
    const { text } = message.payload || {};

    if (typeof text !== 'string' || !text) {
      sendResponse({ ok: false, error: 'Clipboard text is required.' });
      return false;
    }

    copyTextToClipboard(text)
      .then((response) => {
        sendResponse(
          response || { ok: false, error: 'No clipboard response received.' },
        );
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error:
            error instanceof Error ? error.message : 'Clipboard copy failed.',
        });
      });

    return true;
  }

  if (message.type === 'SAVE_FEEDBACK') {
    const { selector, note, pageUrl, copiedToClipboard } =
      message.payload || {};

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
      copiedToClipboard: Boolean(copiedToClipboard),
      capturedAt: new Date().toISOString(),
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

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(SETTINGS_KEY, (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      sendResponse({
        ok: true,
        settings: {
          aiMode: Boolean(result[SETTINGS_KEY]?.aiMode),
        },
      });
    });

    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    const { aiMode } = message.payload || {};

    if (typeof aiMode !== 'boolean') {
      sendResponse({ ok: false, error: 'aiMode must be a boolean.' });
      return false;
    }

    chrome.storage.local.set({ [SETTINGS_KEY]: { aiMode } }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      sendResponse({ ok: true, settings: { aiMode } });
    });

    return true;
  }

  sendResponse({ ok: false, error: 'Unsupported message type.' });
  return false;
});
