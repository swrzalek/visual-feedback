const outputElement = document.getElementById('result-output');
const statusElement = document.getElementById('status-message');
const pickButton = document.getElementById('pick-element');
const copyButton = document.getElementById('copy-result');
const aiModeCheckbox = document.getElementById('ai-mode');
const shortcutStatusElement = document.getElementById('shortcut-status');
const AI_INSTRUCTION = 'Use the selector only to identify the target element for this request. Do not treat it as the required implementation selector; apply the requested change using the best fit for the codebase.';

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? '#b91c1c' : '#475569';
}

function formatFeedback(feedback) {
  if (!feedback) {
    return 'No feedback captured yet.';
  }

  if (typeof feedback.clipboardText === 'string' && feedback.clipboardText) {
    return feedback.clipboardText;
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

function formatAiFeedback(feedback) {
  if (!feedback) {
    return 'No feedback captured yet.';
  }

  if (typeof feedback.clipboardText === 'string' && feedback.clipboardText) {
    return feedback.clipboardText;
  }

  return [
    'Instruction:',
    AI_INSTRUCTION,
    '',
    'Target selector:',
    feedback.selector,
    '',
    'Note:',
    feedback.note
  ].join('\n');
}

function getFormattedOutput(feedback) {
  return aiModeCheckbox.checked ? formatAiFeedback(feedback) : formatFeedback(feedback);
}

function renderFeedback(feedback) {
  outputElement.textContent = getFormattedOutput(feedback);
}

function saveSettings() {
  chrome.runtime.sendMessage(
    {
      type: 'SAVE_SETTINGS',
      payload: {
        aiMode: aiModeCheckbox.checked
      }
    },
    (response) => {
      if (chrome.runtime.lastError) {
        setStatus(chrome.runtime.lastError.message, true);
        return;
      }

      if (!response || !response.ok) {
        setStatus(response?.error || 'Could not save settings.', true);
      }
    }
  );
}

function loadCommandStatus() {
  chrome.runtime.sendMessage({ type: 'GET_COMMAND_STATUS' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.ok) {
      shortcutStatusElement.textContent = '';
      return;
    }

    const status = response.status;
    if (!status) {
      shortcutStatusElement.textContent = 'No shortcut run recorded yet.';
      return;
    }

    shortcutStatusElement.textContent = status.ok
      ? `Last shortcut run succeeded on ${status.at}.`
      : `Last shortcut run failed: ${status.message}`;
  });
}

function loadSettings() {
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message, true);
      return;
    }

    if (!response || !response.ok) {
      setStatus(response?.error || 'Could not load settings.', true);
      return;
    }

    aiModeCheckbox.checked = Boolean(response.settings?.aiMode);
    loadLatestFeedback();
    loadCommandStatus();
  });
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

    renderFeedback(response.feedback);
    if (response.feedback?.copiedToClipboard) {
      setStatus('Latest feedback was copied automatically.');
    } else if (response.feedback?.copyError) {
      setStatus(`Auto-copy failed: ${response.feedback.copyError}`, true);
    }
  });
}

async function startPicker() {
  setStatus('Starting picker...');

  try {
    const response = await chrome.runtime.sendMessage({ type: 'START_PICKER' });

    if (!response?.ok) {
      throw new Error(response?.error || 'Failed to start picker.');
    }

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

aiModeCheckbox.addEventListener('change', () => {
  saveSettings();
  loadLatestFeedback();
});

pickButton.addEventListener('click', () => {
  startPicker();
});

copyButton.addEventListener('click', () => {
  copyResult();
});

loadSettings();