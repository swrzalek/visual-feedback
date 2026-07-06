# Visual Feedback Picker

A basic Chrome extension that lets you pick an element on a page, add a note, and copy a JSON payload with the element selector and note.

## Features

- Manifest V3 extension
- Minimal permissions: `activeTab`, `scripting`, `storage`
- Popup button to start picker mode
- Page hover highlight + click-to-select flow
- Prompt for a note after selecting an element
- Automatic clipboard copy after capture when the page allows it
- Copy-ready output:

```json
{
  "selector": "#submit-button",
  "note": "Primary CTA is misaligned"
}
```

## Files

- `manifest.json` — MV3 manifest
- `background.js` — message handling and persistence in `chrome.storage`
- `content-script.js` — element picker and selector generation
- `popup.html` / `popup.css` / `popup.js` — popup UI and copy action

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder:

```text
/Users/swrzalek/Projects/visual-feedback
```

## Usage

1. Open any regular `http` or `https` page
2. Open the extension popup
3. Click **Pick element**
4. Hover and click the target element
5. Enter a note in the prompt
6. The extension attempts to copy the result automatically
7. If auto-copy is blocked, reopen the popup and click **Copy**

## Notes

- Press `Esc` while picking to cancel.
- The selector generator is intentionally simple and best-effort for v1.
- The extension stores only the latest captured result in `chrome.storage.local`.
- Clipboard auto-copy can fail on some pages/browser states, so the popup copy button remains as a fallback.