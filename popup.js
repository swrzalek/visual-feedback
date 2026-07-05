const outputElement = document.getElementById('result-output');
const statusElement = document.getElementById('status-message');
const pickButton = document.getElementById('pick-element');
const copyButton = document.getElementById('copy-result');

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? '#b91c1c' : '#475569';
}

function formatFeedback(feedback) {
  if (!feedback) {
    return 'No feedback captured yet.';
  }

  return JSON.stringify(
    {
      selector: feedback.selector,
      note: feedback.note
    },
    null,
    2
  );
}

function loadLatestFeedback() {
  chrome.runtime.sendMessage({ type: 'GET_LATEST_FEEDBACK' }, (response) => {
    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message, true);
      return;
    }

    if (!response || !response.ok) {
      setStatus(response?.error || 'Could not load feedback.', true);
      return;
    }

    outputElement.textContent = formatFeedback(response.feedback);
  });
}

async function startPicker() {
  setStatus('Starting picker...');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || typeof tab.id !== 'number') {
    setStatus('No active tab available.', true);
    return;
  }

  if (!tab.url || !/^https?:/i.test(tab.url)) {
    setStatus('Picker only works on regular http/https pages.', true);
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-script.js']
    });

    setStatus('Picker is active. Hover and click an element. Press Esc to cancel.');
    window.close();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Failed to start picker.', true);
  }
}

async function copyResult() {
  const text = outputElement.textContent || '';

  if (!text || text === 'No feedback captured yet.') {
    setStatus('Nothing to copy yet.', true);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus('Copied feedback to clipboard.');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Copy failed.', true);
  }
}

pickButton.addEventListener('click', () => {
  startPicker();
});

copyButton.addEventListener('click', () => {
  copyResult();
});

loadLatestFeedback();