(() => {
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
  let activeNoteDialog = null;
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
    activeNoteDialog?.close(null);
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
      element.closest('[data-visual-feedback-tooltip="true"]') ||
      element.closest('[data-visual-feedback-dialog-root="true"]')
    );
  }

  function createDialogButton(text, variant) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    Object.assign(button.style, {
      appearance: 'none',
      border: variant === 'primary' ? '0' : '1px solid #cbd5e1',
      borderRadius: '8px',
      cursor: 'pointer',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontWeight: variant === 'primary' ? '700' : '600',
      minHeight: '40px',
      padding: '10px 14px',
      background: variant === 'primary' ? '#4f46e5' : '#ffffff',
      color: variant === 'primary' ? '#ffffff' : '#0f172a',
      boxSizing: 'border-box',
    });
    return button;
  }

  function getFocusableElements(container) {
    return Array.from(
      container.querySelectorAll(
        'button, textarea, input, select, a[href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => {
      return (
        element instanceof HTMLElement &&
        !element.hasAttribute('disabled') &&
        element.getAttribute('aria-hidden') !== 'true'
      );
    });
  }

  function requestNote() {
    if (activeNoteDialog) {
      activeNoteDialog.close(null);
    }

    return new Promise((resolve) => {
      const previousActiveElement = document.activeElement;
      const dialogId = `visual-feedback-note-${Date.now()}`;
      const root = document.createElement('div');
      root.setAttribute('data-visual-feedback-dialog-root', 'true');
      Object.assign(root.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(15, 23, 42, 0.45)',
        boxSizing: 'border-box',
      });

      const dialog = document.createElement('section');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', `${dialogId}-title`);
      dialog.setAttribute('aria-describedby', `${dialogId}-description`);
      Object.assign(dialog.style, {
        width: 'min(440px, 100%)',
        padding: '18px',
        borderRadius: '14px',
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Arial, sans-serif',
        boxShadow: '0 24px 70px rgba(15, 23, 42, 0.4)',
        border: '1px solid rgba(148, 163, 184, 0.45)',
        boxSizing: 'border-box',
      });

      const title = document.createElement('h2');
      title.id = `${dialogId}-title`;
      title.textContent = 'Add feedback note';
      Object.assign(title.style, {
        margin: '0 0 8px',
        color: '#0f172a',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        lineHeight: '1.3',
      });

      const description = document.createElement('p');
      description.id = `${dialogId}-description`;
      description.textContent =
        'Describe what should change about the selected element.';
      Object.assign(description.style, {
        margin: '0 0 14px',
        color: '#475569',
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        lineHeight: '1.45',
      });

      const label = document.createElement('label');
      label.setAttribute('for', `${dialogId}-textarea`);
      label.textContent = 'Note';
      Object.assign(label.style, {
        display: 'block',
        marginBottom: '6px',
        color: '#334155',
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontWeight: '700',
      });

      const textarea = document.createElement('textarea');
      textarea.id = `${dialogId}-textarea`;
      textarea.rows = 5;
      textarea.placeholder = 'Example: Primary CTA is misaligned';
      Object.assign(textarea.style, {
        width: '100%',
        minHeight: '120px',
        resize: 'vertical',
        padding: '10px 12px',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        outline: 'none',
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        lineHeight: '1.45',
        boxSizing: 'border-box',
      });

      const helper = document.createElement('p');
      helper.textContent =
        'Press Esc to cancel. Use Tab to move between controls.';
      Object.assign(helper.style, {
        margin: '8px 0 0',
        color: '#64748b',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '1.4',
      });

      const actions = document.createElement('div');
      Object.assign(actions.style, {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '16px',
      });

      const cancelButton = createDialogButton('Cancel', 'secondary');
      const saveButton = createDialogButton('Save feedback', 'primary');

      actions.append(cancelButton, saveButton);
      dialog.append(title, description, label, textarea, helper, actions);
      root.appendChild(dialog);
      document.documentElement.appendChild(root);

      let isClosed = false;
      const close = (value) => {
        if (isClosed) {
          return;
        }

        isClosed = true;
        root.removeEventListener('click', handleBackdropClick);
        root.removeEventListener('keydown', handleDialogKeyDown, true);
        cancelButton.removeEventListener('click', handleCancel);
        saveButton.removeEventListener('click', handleSave);
        root.remove();
        activeNoteDialog = null;

        if (previousActiveElement instanceof HTMLElement) {
          previousActiveElement.focus({ preventScroll: true });
        }

        resolve(value);
      };

      function handleCancel() {
        close(null);
      }

      function handleSave() {
        close(textarea.value);
      }

      function handleBackdropClick(event) {
        event.stopPropagation();

        if (event.target === root) {
          event.preventDefault();
          close(null);
        }
      }

      function handleDialogKeyDown(event) {
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (event.key === 'Escape') {
          event.preventDefault();
          close(null);
          return;
        }

        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          close(textarea.value);
          return;
        }

        if (event.key !== 'Tab') {
          return;
        }

        const focusableElements = getFocusableElements(dialog);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!firstElement || !lastElement) {
          event.preventDefault();
          return;
        }

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
          return;
        }

        if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }

      root.addEventListener('click', handleBackdropClick);
      root.addEventListener('keydown', handleDialogKeyDown, true);
      cancelButton.addEventListener('click', handleCancel);
      saveButton.addEventListener('click', handleSave);

      activeNoteDialog = { close };

      requestAnimationFrame(() => {
        textarea.focus({ preventScroll: true });
      });
    });
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
    for (const { property, value } of stylePreview) {
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
    }

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

    while (sibling.previousElementSibling) {
      sibling = sibling.previousElementSibling;
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
    if (activeNoteDialog) {
      return;
    }

    if (event.key === 'Escape') {
      cleanup();
    }
  }

  async function handleClick(event) {
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
    const note = await requestNote();

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
        const response = await chrome.runtime.sendMessage({
          type: 'COPY_TO_CLIPBOARD',
          payload: { text: payload },
        });
        copiedToClipboard = Boolean(response?.ok);
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
