const STORAGE_KEY = 'latestFeedback';
const SETTINGS_KEY = 'settings';
const COMMAND_STATUS_KEY = 'commandStatus';
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
let creatingOffscreenDocument = null;

async function copyTextToClipboard(text) {
  if (typeof text !== 'string') {
    throw new Error('Clipboard payload must be a string.');
  }

  await ensureOffscreenDocument();

  const response = await chrome.runtime.sendMessage({
    type: 'OFFSCREEN_COPY_TO_CLIPBOARD',
    target: 'offscreen',
    text
  });

  if (!response?.ok) {
    throw new Error(response?.error || 'Clipboard copy failed.');
  }
}

async function hasOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const matchedClients = await clients.matchAll();

  return matchedClients.some((client) => client.url === offscreenUrl);
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  if (creatingOffscreenDocument) {
    await creatingOffscreenDocument;
    return;
  }

  creatingOffscreenDocument = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: 'Write captured feedback to the clipboard in MV3.'
  });

  try {
    await creatingOffscreenDocument;
  } finally {
    creatingOffscreenDocument = null;
  }
}

async function setCommandStatus(status) {
  await chrome.storage.local.set({ [COMMAND_STATUS_KEY]: status });
}

async function resolveTargetTab(commandTab) {
  if (commandTab && typeof commandTab.id === 'number') {
    return commandTab;
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function startPickerOnActiveTab(commandTab = null, source = 'unknown') {
  const tab = await resolveTargetTab(commandTab);

  if (!tab || typeof tab.id !== 'number') {
    throw new Error('No active tab available.');
  }

  if (!tab.url || !/^https?:/i.test(tab.url)) {
    throw new Error('Picker only works on regular http/https pages.');
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'PING_PICKER' });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-script.js']
    });
  }

  await setCommandStatus({
    source,
    ok: true,
    message: 'Picker activated successfully.',
    tabId: tab.id,
    tabUrl: tab.url || '',
    at: new Date().toISOString()
  });
}

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== 'activate-picker') {
    return;
  }

  startPickerOnActiveTab(tab || null, 'command').catch(async (error) => {
    await setCommandStatus({
      source: 'command',
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to activate picker.',
      tabId: typeof tab?.id === 'number' ? tab.id : null,
      tabUrl: typeof tab?.url === 'string' ? tab.url : '',
      at: new Date().toISOString()
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') {
    sendResponse({ ok: false, error: 'Invalid message payload.' });
    return false;
  }

  if (message.type === 'SAVE_FEEDBACK') {
    const { selector, note, pageUrl, clipboardText, aiMode } = message.payload || {};

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
      aiMode: Boolean(aiMode),
      clipboardText: typeof clipboardText === 'string' ? clipboardText : '',
      copiedToClipboard: false,
      copyError: '',
      capturedAt: new Date().toISOString()
    };

    const finalizeSave = () => {
      chrome.storage.local.set({ [STORAGE_KEY]: feedback }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }

        sendResponse({ ok: true, feedback });
      });
    };

    if (typeof clipboardText === 'string' && clipboardText.length > 0) {
      copyTextToClipboard(clipboardText)
        .then(() => {
          feedback.copiedToClipboard = true;
          feedback.copyError = '';
          finalizeSave();
        })
        .catch((error) => {
          feedback.copiedToClipboard = false;
          feedback.copyError = error instanceof Error ? error.message : 'Automatic clipboard copy failed.';
          finalizeSave();
        });
    } else {
      finalizeSave();
    }

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
          aiMode: Boolean(result[SETTINGS_KEY]?.aiMode)
        }
      });
    });

    return true;
  }

  if (message.type === 'GET_COMMAND_STATUS') {
    chrome.storage.local.get(COMMAND_STATUS_KEY, (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      sendResponse({ ok: true, status: result[COMMAND_STATUS_KEY] || null });
    });

    return true;
  }

  if (message.type === 'START_PICKER') {
    startPickerOnActiveTab(null, 'popup')
      .then(() => {
        sendResponse({ ok: true, commandName: 'activate-picker' });
      })
      .catch((error) => {
        setCommandStatus({
          source: 'popup',
          ok: false,
          message: error instanceof Error ? error.message : 'Failed to activate picker.',
          tabId: null,
          tabUrl: '',
          at: new Date().toISOString()
        });
        sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Failed to start picker.' });
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