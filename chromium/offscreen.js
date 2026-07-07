const clipboardTextElement = document.getElementById('clipboard-text');

function copyText(text) {
  if (!(clipboardTextElement instanceof HTMLTextAreaElement)) {
    throw new Error('Clipboard textarea is missing.');
  }

  clipboardTextElement.value = text;
  clipboardTextElement.focus();
  clipboardTextElement.select();

  const copied = document.execCommand('copy');
  clipboardTextElement.value = '';

  if (!copied) {
    throw new Error('Chrome rejected the clipboard copy command.');
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== 'offscreen' || message.type !== 'WRITE_CLIPBOARD') {
    return false;
  }

  const { text } = message.payload || {};

  if (typeof text !== 'string' || !text) {
    sendResponse({ ok: false, error: 'Clipboard text is required.' });
    return false;
  }

  try {
    copyText(text);
    sendResponse({ ok: true });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Clipboard copy failed.',
    });
  }

  return false;
});
