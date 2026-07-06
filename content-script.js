(function () {
  if (window.__visualFeedbackPickerActive) {
    return;
  }

  window.__visualFeedbackPickerActive = true;

  const overlay = document.createElement('div');
  overlay.setAttribute('data-visual-feedback-overlay', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    pointerEvents: 'none',
    border: '2px solid #4f46e5',
    background: 'rgba(79, 70, 229, 0.12)',
    zIndex: '2147483647',
    top: '0',
    left: '0',
    width: '0',
    height: '0',
    display: 'none',
    boxSizing: 'border-box'
  });

  document.documentElement.appendChild(overlay);

  let currentTarget = null;

  function cleanup() {
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    overlay.remove();
    window.__visualFeedbackPickerActive = false;
  }

  function isIgnoredElement(element) {
    return (
      !element ||
      element === overlay ||
      element.closest('[data-visual-feedback-overlay="true"]')
    );
  }

  function updateOverlay(element) {
    if (!element || !(element instanceof Element)) {
      overlay.style.display = 'none';
      return;
    }

    const rect = element.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }

  function escapeCssIdentifier(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(value);
    }

    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function getElementIndex(element) {
    let index = 1;
    let sibling = element;

    while ((sibling = sibling.previousElementSibling)) {
      if (sibling.tagName === element.tagName) {
        index += 1;
      }
    }

    return index;
  }

  function isUniqueSelector(selector) {
    try {
      return document.querySelectorAll(selector).length === 1;
    } catch {
      return false;
    }
  }

  function buildSimpleSelector(element) {
    const tag = element.tagName.toLowerCase();

    if (element.id) {
      const byId = `#${escapeCssIdentifier(element.id)}`;
      if (isUniqueSelector(byId)) {
        return byId;
      }
    }

    const dataTestId = element.getAttribute('data-testid');
    if (dataTestId) {
      const byTestId = `[data-testid="${escapeCssIdentifier(dataTestId)}"]`;
      if (isUniqueSelector(byTestId)) {
        return byTestId;
      }
    }

    const classes = Array.from(element.classList).slice(0, 3);
    if (classes.length) {
      const byClass = `${tag}.${classes.map(escapeCssIdentifier).join('.')}`;
      if (isUniqueSelector(byClass)) {
        return byClass;
      }
    }

    return `${tag}:nth-of-type(${getElementIndex(element)})`;
  }

  function buildSelector(element) {
    const segments = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      const segment = buildSimpleSelector(current);
      segments.unshift(segment);

      const selector = segments.join(' > ');
      if (isUniqueSelector(selector)) {
        return selector;
      }

      current = current.parentElement;
    }

    if (current === document.body) {
      segments.unshift('body');
    }

    return segments.join(' > ');
  }

  function handleMouseMove(event) {
    const target = event.target;

    if (!(target instanceof Element) || isIgnoredElement(target)) {
      return;
    }

    currentTarget = target;
    updateOverlay(target);
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      cleanup();
    }
  }

  function handleClick(event) {
    const target = event.target;

    if (!(target instanceof Element) || isIgnoredElement(target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    currentTarget = target;
    updateOverlay(target);

    const selector = buildSelector(target);
    const note = window.prompt('Add a note for this element:', '');

    if (note === null) {
      cleanup();
      return;
    }
    const payload = JSON.stringify(
      {
        selector,
        note
      },
      null,
      2
    );

    async function persistFeedback(copiedToClipboard) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'SAVE_FEEDBACK',
            payload: {
              selector,
              note,
              pageUrl: window.location.href,
              copiedToClipboard
            }
          },
          () => {
            resolve();
          }
        );
      });
    }

    async function finishSelection() {
      let copiedToClipboard = false;

      try {
        await navigator.clipboard.writeText(payload);
        copiedToClipboard = true;
      } catch {
        copiedToClipboard = false;
      }

      await persistFeedback(copiedToClipboard);

      if (copiedToClipboard) {
        window.alert('Feedback copied to clipboard.');
      } else {
        window.alert('Feedback saved, but automatic clipboard copy failed. Open the extension popup and use Copy.');
      }

      cleanup();
    }

    finishSelection();
  }

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
})();