# Visual Feedback Picker

A basic Chrome extension that lets you pick an element on a page, add a note, and copy a JSON payload with the element selector and note.

## Features

- Manifest V3 extension
- Minimal permissions: `activeTab`, `scripting`, `storage`
- Popup button to start picker mode
- Page hover highlight + live selector/style tooltip + click-to-select flow
- Prompt for a note after selecting an element
- Automatic clipboard copy after capture when the page allows it
- Optional AI copy mode with reusable implementation guidance
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
3. Enable **AI copy mode** if you want agent-ready output
4. Click **Pick element**
5. Hover elements to preview the selector and computed styles in the popout
6. Click the target element
7. Enter a note in the prompt
8. The extension attempts to copy the result automatically
9. If auto-copy is blocked, reopen the popup and click **Copy**

## Notes

- Press `Esc` while picking to cancel.
- The selector generator is intentionally simple and best-effort for v1.
- The style preview shows a curated subset of computed CSS properties for readability.
- The extension stores only the latest captured result in `chrome.storage.local`.
- Clipboard auto-copy can fail on some pages/browser states, so the popup copy button remains as a fallback.
- AI copy mode prepends a reusable instruction so the result can be pasted directly into an AI coding agent.