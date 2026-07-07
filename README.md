# Visual Feedback Picker

A basic Chromium extension that lets you pick an element on a page, add a note, and copy a JSON payload with the element selector and note.

## Features

- Manifest V3 extension
- Minimal permissions: `activeTab`, `scripting`, `storage`, `tabs`, `clipboardWrite`, `offscreen`
- Popup button to start picker mode
- Keyboard shortcut to activate the picker (`Ctrl+Shift+Y` / `Command+Shift+Y`)
- Page hover highlight + live selector/style tooltip + click-to-select flow
- Prompt for a note after selecting an element
- Automatic clipboard copy after capture via an MV3 offscreen extension document
- Optional AI copy mode with reusable implementation guidance
- Copy-ready output:

```json
{
  "selector": "#submit-button",
  "note": "Primary CTA is misaligned"
}
```

## Structure

- `chromium/manifest.json` — MV3 manifest
- `chromium/background.js` — message handling and persistence in `chrome.storage`
- `chromium/content-script.js` — element picker and selector generation
- `chromium/popup.html` / `chromium/popup.css` / `chromium/popup.js` — popup UI and copy action

This repo now follows a browser-target layout similar to uBOL-home, with only the Chromium target implemented for now.

## Load in Chromium

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder:

```text
/Users/swrzalek/Projects/visual-feedback/chromium
```

## Usage

1. Open any regular `http` or `https` page
2. Open the extension popup
3. Enable **AI copy mode** if you want agent-ready output
4. Start the picker from the popup or use `Ctrl+Shift+Y` / `Command+Shift+Y`
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
- Clipboard auto-copy now runs through the extension worker for better reliability, but the popup copy button remains as a fallback if the browser blocks clipboard access.
- AI copy mode prepends a reusable instruction so the result can be pasted directly into an AI coding agent.
- To customize the keyboard shortcut, use `chrome://extensions/shortcuts` and bind the shortcut to **Activate the picker** rather than the default extension action.
- If the shortcut still does not launch the picker, reopen the popup and check the shortcut status message for the last recorded failure reason.