import IDBDatabases from './databases';

export default defineBackground(() => {
    console.log('Hello background!', { id: browser.runtime.id });

    chrome.runtime.onInstalled.addListener(() => {
        chrome.sidePanel.setOptions({ path: '/sidepanel.html' });
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
        chrome.storage.local.set({ favicon: 'https://www.google.com/s2/favicons?domain=$domain&sz=24'});
        IDBDatabases.createDB();
    });

    chrome.action.onClicked.addListener((tab) => {
        chrome.sidePanel.open({ windowId: tab.windowId });
    });
});
