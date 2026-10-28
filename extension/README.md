# JobDesk Capture — extension

Manifest V3 extension for Chrome and Edge.

## Install

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → choose this `extension` folder
3. Right-click the icon → **Options** → paste your server URL and extension token

## Files

| File | Purpose |
|---|---|
| `manifest.json` | permissions: `activeTab`, `scripting`, `storage`, `contextMenus` |
| `background.js` | right-click menu + opens the capture window |
| `popup.html/js` | capture, review, save |
| `options.html/js` | server URL + token, connection test |

## Capture pipeline

```
active tab
  ├─ scripting.executeScript  → url, title, og:*, innerText (12k chars)
  ├─ tabs.captureVisibleTab   → screenshot → WebP 1400px @ 0.72
  │
  ├─ POST /api/parse          → AI text (Gemini → OpenRouter → Groq, first that works)
  │                              → or AI vision for social/screenshot-heavy pages
  └─ POST /api/save           → job row + signed-storage screenshot
```

Keyboard: **Alt+Shift+J** opens the same capture form.
Right-click anywhere → **Capture job post to JobDesk**.

> Chrome rejects `Ctrl+Alt+<key>` in `suggested_key` (on Windows `Ctrl+Alt` is AltGr),
> so do not use it here. `Ctrl+Shift+J` is the DevTools console shortcut, so it is
> a poor default too. Any combo can be changed at `chrome://extensions/shortcuts`.

Nothing is saved until you press **Save to JobDesk** — the AI only prefills the form.

## Notes

- The token is stored in `chrome.storage.sync` and never in code.
- The extension needs host permission for the server URL; `https://*/*` is declared so a
  deployed Vercel domain works without editing the manifest.
- `captureVisibleTab` fails on `chrome://` pages and the Chrome Web Store — the popup then
  falls back to text-only parsing.
