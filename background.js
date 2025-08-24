// Background service worker for Ziman AI Chrome Extension
chrome.runtime.onInstalled.addListener(() => {
    // Create context menu for text selection
    chrome.contextMenus.create({
        id: 'translateSelection',
        title: 'Translate with Ziman AI',
        contexts: ['selection']
    });
    
    // Create context menu for page translation
    chrome.contextMenus.create({
        id: 'translatePage',
        title: 'Translate entire page with Ziman AI',
        contexts: ['page']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
        // Check if content script is loaded
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        
        if (!response || response.error) {
            console.error('Content script not responding');
            return;
        }
        
        if (info.menuItemId === 'translateSelection') {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'translateSelection',
                    text: info.selectionText
                });
            } catch (error) {
                console.error('Failed to send translateSelection message:', error);
            }
        } else if (info.menuItemId === 'translatePage') {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'translatePage'
                });
            } catch (error) {
                console.error('Failed to send translatePage message:', error);
            }
        }
    } catch (error) {
        console.error('Content script not loaded:', error);
        // Show notification to user
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Ziman AI',
            message: 'Please refresh the page to use translation features.'
        });
    }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'callWeblateAPI') {
        handleWeblateAPI(request, sendResponse);
        return true; // Keep message channel open for async response
    }
});

// Handle Weblate API calls
async function handleWeblateAPI(request, sendResponse) {
    try {
        const { text, sourceLang, targetLang, tone } = request;
        
        // Weblate API endpoint for translation
        const apiUrl = 'https://hosted.weblate.org/api/';
        const apiKey = 'wlu_BMlpBPsGj2LjfiqoqYz7nO8ajHJlIHVfK5w7';
        
        // Search for existing translations
        const searchUrl = `${apiUrl}units/?q=${encodeURIComponent(text)}&source_language=${sourceLang}&target_language=${targetLang}`;
        
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(searchUrl, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                sendResponse({
                    success: true,
                    translation: data.results[0].target
                });
            } else {
                sendResponse({
                    success: false,
                    translation: null
                });
            }
        } else {
            sendResponse({
                success: false,
                translation: null,
                error: `HTTP ${response.status}: ${response.statusText}`
            });
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('Weblate API request timed out');
            sendResponse({
                success: false,
                translation: null,
                error: 'Request timed out'
            });
        } else {
            console.error('Weblate API error:', error);
            sendResponse({
                success: false,
                translation: null,
                error: error.message
            });
        }
    }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCurrentTab') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            sendResponse({ tab: tabs[0] });
        });
        return true; // Keep message channel open for async response
    }
});
