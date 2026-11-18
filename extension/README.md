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
  ├─ scripting.executeScript  → url, title, selected text only
  ├─ tabs.captureVisibleTab   → local screenshot; popup closes for page-level area selection
  ├─ user selects a page region, pastes post text, or combines both
  │
  ├─ POST /api/parse          → AI text (Gemini → OpenRouter → Groq, first that works)
  │                              → or AI vision for social/screenshot-heavy pages
  └─ POST /api/save           → job row + signed-storage screenshot
```

Keyboard: **Alt+Shift+J** opens the capture form. Choose **Select area on page** to
close the popup and drag over the post; the form reopens with only that region. Or
paste the complete post text, or use both inputs, then choose **Extract fields**.
The whole-page screenshot stays local and only the selected crop or pasted text is
sent for extraction (plus page URL/title). It does not submit the whole page image.
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
