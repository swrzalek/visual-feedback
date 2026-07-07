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
    boxSizing: 'border-box',
  });

  const tooltip = document.createElement('div');
  tooltip.setAttribute('data-visual-feedback-tooltip', 'true');
  Object.assign(tooltip.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483647',
    maxWidth: '360px',
    padding: '10px 12px',
    borderRadius: '8px',
    background: '#0f172a',
    color: '#e2e8f0',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '12px',
    lineHeight: '1.4',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.35)',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    maxHeight: '320px',
    overflow: 'auto',
    display: 'none',
    boxSizing: 'border-box',
  });

  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(tooltip);

  let currentTarget = null;
  let currentSelector = '';
  const AI_INSTRUCTION =
    'Use the selector only to identify the target element for this request. Do not treat it as the required implementation selector; apply the requested change using the best fit for the codebase.';
  const STYLE_PROPERTIES = [
    'display',
    'position',
    'width',
    'height',
    'color',
    'background-color',
    'font-size',
    'font-weight',
    'line-height',
    'margin',
    'padding',
    'border',
    'border-radius',
    'opacity',
    'z-index',
  ];

  function cleanup() {
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    overlay.remove();
    tooltip.remove();
    window.__visualFeedbackPickerActive = false;
  }

  function isIgnoredElement(element) {
    return (
      !element ||
      element === overlay ||
      element === tooltip ||
      element.closest('[data-visual-feedback-overlay="true"]') ||
      element.closest('[data-visual-feedback-tooltip="true"]')
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

  function getStylePreview(element) {
    const computedStyle = window.getComputedStyle(element);

    return STYLE_PROPERTIES.map((propertyName) => {
      return {
        property: propertyName,
        value: computedStyle.getPropertyValue(propertyName),
      };
    });
  }

  function createToken(text, styles) {
    const span = document.createElement('span');
    span.textContent = text;
    Object.assign(span.style, styles);
    return span;
  }

  function createLine() {
    const line = document.createElement('div');
    Object.assign(line.style, {
      whiteSpace: 'pre-wrap',
    });
    return line;
  }

  function updateTooltipContent(selector, stylePreview) {
    tooltip.replaceChildren();

    const label = document.createElement('div');
    label.textContent = 'Computed CSS preview';
    Object.assign(label.style, {
      marginBottom: '8px',
      color: '#94a3b8',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
    });
    tooltip.appendChild(label);

    const selectorLine = createLine();
    selectorLine.appendChild(
      createToken(selector, {
        color: '#e879f9',
      }),
    );
    selectorLine.appendChild(
      createToken(' {', {
        color: '#cbd5e1',
      }),
    );
    tooltip.appendChild(selectorLine);

    stylePreview.forEach(({ property, value }) => {
      const declarationLine = createLine();
      declarationLine.style.paddingLeft = '14px';
      declarationLine.appendChild(
        createToken(property, {
          color: '#93c5fd',
        }),
      );
      declarationLine.appendChild(
        createToken(': ', {
          color: '#cbd5e1',
        }),
      );
      declarationLine.appendChild(
        createToken(value || 'initial', {
          color: '#fcd34d',
        }),
      );
      declarationLine.appendChild(
        createToken(';', {
          color: '#cbd5e1',
        }),
      );
      tooltip.appendChild(declarationLine);
    });

    const closingLine = createLine();
    closingLine.appendChild(
      createToken('}', {
        color: '#cbd5e1',
      }),
    );
    tooltip.appendChild(closingLine);

    const helper = document.createElement('div');
    helper.textContent = 'Click to select • Esc to cancel';
    Object.assign(helper.style, {
      marginTop: '10px',
      color: '#94a3b8',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
    });
    tooltip.appendChild(helper);
  }

  function positionTooltip(element) {
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 12;

    tooltip.style.display = 'block';

    const tooltipRect = tooltip.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + gap;

    if (left + tooltipRect.width > viewportWidth - gap) {
      left = viewportWidth - tooltipRect.width - gap;
    }

    if (left < gap) {
      left = gap;
    }

    if (top + tooltipRect.height > viewportHeight - gap) {
      top = rect.top - tooltipRect.height - gap;
    }

    if (top < gap) {
      top = Math.min(
        viewportHeight - tooltipRect.height - gap,
        rect.bottom + gap,
      );
    }

    if (top < gap) {
      top = gap;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function updateTooltip(element, selector) {
    if (!element || !selector) {
      tooltip.style.display = 'none';
      return;
    }

    const stylePreview = getStylePreview(element);
    updateTooltipContent(selector, stylePreview);
    positionTooltip(element);
  }

  function getAiPayload(selector, note) {
    return [
      'Instruction:',
      AI_INSTRUCTION,
      '',
      'Target selector:',
      selector,
      '',
      'Note:',
      note,
    ].join('\n');
  }

  function getDefaultPayload(selector, note) {
    return JSON.stringify(
      {
        selector,
        note,
      },
      null,
      2,
    );
  }

  function loadAiMode() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.ok) {
          resolve(false);
          return;
        }

        resolve(Boolean(response.settings?.aiMode));
      });
    });
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

    while (
      current &&
      current.nodeType === Node.ELEMENT_NODE &&
      current !== document.body
    ) {
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

    if (currentTarget === target) {
      return;
    }

    currentTarget = target;
    currentSelector = buildSelector(target);
    updateOverlay(target);
    updateTooltip(target, currentSelector);
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

    const selector =
      currentTarget === target && currentSelector
        ? currentSelector
        : buildSelector(target);
    const note = window.prompt('Add a note for this element:', '');

    if (note === null) {
      cleanup();
      return;
    }
    async function persistFeedback(copiedToClipboard) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'SAVE_FEEDBACK',
            payload: {
              selector,
              note,
              pageUrl: window.location.href,
              copiedToClipboard,
            },
          },
          () => {
            resolve();
          },
        );
      });
    }

    async function finishSelection() {
      let copiedToClipboard = false;
      const aiMode = await loadAiMode();
      const payload = aiMode
        ? getAiPayload(selector, note)
        : getDefaultPayload(selector, note);

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
        window.alert(
          'Feedback saved, but automatic clipboard copy failed. Open the extension popup and use Copy.',
        );
      }

      cleanup();
    }

    finishSelection();
  }

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
})();
