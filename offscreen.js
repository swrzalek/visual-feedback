chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== 'offscreen' || message?.type !== 'OFFSCREEN_COPY_TO_CLIPBOARD') {
    return false;
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = typeof message.text === 'string' ? message.text : '';
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const copied = document.execCommand('copy');
    textarea.remove();

    if (!copied) {
      sendResponse({ ok: false, error: 'document.execCommand("copy") returned false.' });
      return false;
    }

    sendResponse({ ok: true });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Clipboard write failed.'
    });
  }

  return false;
});