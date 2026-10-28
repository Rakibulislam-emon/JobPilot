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
  }
  return true;
});
