/**
 * VERIDARA Guardian - Background Service Worker
 */
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "verifyWithVERIDARA",
        title: "Verify with VERIDARA",
        contexts: ["image", "video"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "verifyWithVERIDARA") {
        const mediaUrl = info.srcUrl;
        console.log('Requesting verification for:', mediaUrl);

        // In production, this would trigger a side-panel or popup with results
        chrome.action.openPopup();
    }
});
