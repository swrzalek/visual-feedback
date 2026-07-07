# Visual Feedback Picker

Chromium extension for collecting UI feedback directly from a live page. It lets you pick an element, capture a best-effort selector, attach a note, and copy the result as either JSON or AI-friendly instructions.

## What this project does

The extension is intentionally small and has no build step.

- Injects a content script into the active tab on demand
- Highlights the hovered element and shows a selector + style preview
- Prompts for a note when the user clicks an element
- Stores the latest capture in `chrome.storage.local`
- Lets the popup re-copy the latest capture later
- Supports an optional **AI copy mode** for pasting directly into coding agents

## Quick start

### 1. Load the extension in Chrome or Chromium

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select:

```text
/Users/swrzalek/Projects/visual-feedback/chromium
```

### 2. Use it

1. Open any normal `http://` or `https://` page
2. Open the extension popup
3. Click **Pick element**
4. Hover the page to inspect elements
5. Click the target element
6. Enter a note in the browser prompt
7. Reopen the popup to copy the latest result if needed

## Example output

### Default mode

```json
{
  "selector": "#submit-button",
  "note": "Primary CTA is misaligned"
}
```

### AI copy mode

```text
Instruction:
Use the selector only to identify the target element for this request. Do not treat it as the required implementation selector; apply the requested change using the best fit for the codebase.

Target selector:
#submit-button

Note:
Primary CTA is misaligned
```

## Project structure

```text
chromium/
├── manifest.json      # Extension metadata and permissions
├── background.js      # Message router + storage for feedback/settings
├── content-script.js  # Picker overlay, selector generation, note capture
├── popup.html         # Popup markup
├── popup.css          # Popup styling
└── popup.js           # Popup actions and rendering
```

## Code quality

Run Biome from the repository root:

```bash
npm install
npm run check
```

Useful commands:

```bash
npm run lint
npm run format
```

## Known limitations

- Chromium-only right now
- No automated tests yet
- Selector generation is helpful but not guaranteed stable across DOM changes
- Note entry currently uses `window.prompt`, which is functional but basic
- Only the latest capture is stored