// JobDesk Capture — background service worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "jobdesk-capture",
    title: "Capture job post to JobDesk",
    contexts: ["page", "image", "selection", "link"],
  });
});

chrome.contextMenus.onClicked.addListener((_info, tab) => {
  if (_info.menuItemId !== "jobdesk-capture") return;
  const tabId = tab && tab.id ? tab.id : "";
  chrome.windows.create({
    url: chrome.runtime.getURL(`popup.html?tabId=${tabId}&modal=1`),
    type: "popup",
    width: 440,
    height: 720,
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "jobdesk-token-missing") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }

  if (message && message.type === "jobdesk-area-selected") {
    (async () => {
      const { pendingAreaCapture } = await chrome.storage.local.get("pendingAreaCapture");
      const tabId = Number(message.tabId || (_sender.tab && _sender.tab.id));
      if (
        !pendingAreaCapture ||
        !tabId ||
        pendingAreaCapture.tabId !== tabId ||
        (_sender.tab && _sender.tab.id !== tabId)
      ) {
        sendResponse({ ok: false });
        return;
      }

      await chrome.storage.local.set({
        pendingAreaCapture: {
          ...pendingAreaCapture,
          selection: message.selection,
          viewport: message.viewport,
        },
      });

      const url = chrome.runtime.getURL(
        `popup.html?tabId=${tabId}&capture=area`
      );
      await chrome.windows.create({
        url,
        type: "popup",
        width: 440,
        height: 820,
      });
      sendResponse({ ok: true });
    })().catch((error) => {
      console.error("Could not reopen JobDesk after area selection", error);
      chrome.storage.local.remove("pendingAreaCapture");
      sendResponse({ ok: false });
    });
    return true;
  }

  if (message && message.type === "jobdesk-area-cancelled") {
    chrome.storage.local.remove("pendingAreaCapture").then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  return true;
});
