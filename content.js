// Content script for Ziman AI Chrome Extension
class ContentTranslator {
    constructor() {
        this.initialize();
        this.bindEvents();
    }

    initialize() {
        // Create floating translation widget
        this.createFloatingWidget();
        
            // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
            // Handle async operations properly
            if (request.action === 'ping') {
                sendResponse({ status: 'ok' });
                return false; // No async response needed
            }
            
            if (request.action === 'getSelection') {
                const selection = window.getSelection();
                sendResponse({ text: selection.toString() });
                return false; // No async response needed
            }
            
            // For other actions, handle them synchronously
            this.handleMessage(request, sender, sendResponse);
            return false; // No async response needed
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: error.message });
            return false; // No async response needed
        }
    });
    }

    createFloatingWidget() {
        this.widget = document.createElement('div');
        this.widget.id = 'ziman-translation-widget';
        this.widget.innerHTML = `
            <div class="ziman-header">
                <span>Ziman AI</span>
                <button class="ziman-close">×</button>
            </div>
            <div class="ziman-content">
                <div class="ziman-original"></div>
                <div class="ziman-translation"></div>
                <div class="ziman-loading" style="display: none;">Translating...</div>
            </div>
        `;
        
        this.widget.style.display = 'none';
        document.body.appendChild(this.widget);
        
        // Add event listeners
        this.widget.querySelector('.ziman-close').addEventListener('click', () => {
            this.hideWidget();
        });
    }

    bindEvents() {
        // Handle text selection
        document.addEventListener('mouseup', (e) => {
            const selection = window.getSelection();
            if (selection.toString().trim().length > 0) {
                this.showWidgetAtPosition(e.pageX, e.pageY);
                this.showOriginalText(selection.toString());
            }
        });

        // Hide widget when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.widget.contains(e.target)) {
                this.hideWidget();
            }
        });
    }

    showWidgetAtPosition(x, y) {
        this.widget.style.display = 'block';
        this.widget.style.left = `${x}px`;
        this.widget.style.top = `${y}px`;
        
        // Ensure widget stays within viewport
        const rect = this.widget.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.widget.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            this.widget.style.top = `${y - rect.height - 10}px`;
        }
    }

    hideWidget() {
        this.widget.style.display = 'none';
    }

    showOriginalText(text) {
        this.widget.querySelector('.ziman-original').textContent = text;
        this.widget.querySelector('.ziman-translation').textContent = '';
        this.widget.querySelector('.ziman-loading').style.display = 'block';
        this.widget.querySelector('.ziman-loading').textContent = '🔄 Translating with AI...';
        
        // Auto-translate the selected text
        this.translateText(text);
    }

    async translateText(text) {
        try {
            // Get current language settings from storage with fallback
            let sourceLang = 'auto';
            let targetLang = 'en';
            let tone = 'neutral';
            
            try {
                if (chrome && chrome.storage && chrome.storage.sync) {
                    const settings = await chrome.storage.sync.get(['sourceLang', 'targetLang', 'tone']);
                    sourceLang = settings.sourceLang || 'auto';
                    targetLang = settings.targetLang || 'en';
                    tone = settings.tone || 'neutral';
                }
            } catch (storageError) {
                console.warn('Storage access failed, using defaults:', storageError);
            }

            // Update loading message based on translation method
            const loadingElement = this.widget.querySelector('.ziman-loading');
            if (loadingElement) {
                loadingElement.textContent = '🔄 Translating with AI...';
            }

            // Call translation API
            const translation = await this.callTranslationAPI(text, sourceLang, targetLang, tone);
            
            this.showTranslation(translation);
        } catch (error) {
            console.error('Translation error:', error);
            this.showTranslation(`Translation error: ${error.message}`);
        } finally {
            if (this.widget && this.widget.querySelector('.ziman-loading')) {
                this.widget.querySelector('.ziman-loading').style.display = 'none';
            }
        }
    }

    async callTranslationAPI(text, sourceLang, targetLang, tone) {
        try {
            // First try AIML API (AI-powered translation)
            if (window.AIMLAPI) {
                const aimlTranslation = await this.translateWithAIML(text, sourceLang, targetLang, tone);
                if (aimlTranslation) {
                    return aimlTranslation;
                } else {
                    console.log('AIML API returned no translation, trying Weblate...');
                }
            }
        } catch (error) {
            console.warn('AIML API failed, trying Weblate:', error);
        }

        try {
            // Fallback to Weblate API
            const weblateTranslation = await this.callWeblateAPI(text, sourceLang, targetLang, tone);
            if (weblateTranslation) {
                return weblateTranslation;
            }
        } catch (error) {
            console.warn('Weblate API failed, using fallback:', error);
        }

        // Final fallback to enhanced translations
        return await this.getFallbackTranslation(text, sourceLang, targetLang, tone);
    }

    async translateWithAIML(text, sourceLang, targetLang, tone) {
        try {
            if (!window.AIMLAPI) {
                throw new Error('AIML API not available');
            }

            const aimlAPI = new window.AIMLAPI();
            
            // First check if API key is valid
            const keyTest = await aimlAPI.testAPIKey();
            if (!keyTest.valid) {
                console.warn('AIML API key validation failed:', keyTest.message);
                return null; // Fall back to other methods
            }
            
            const translation = await aimlAPI.translateText(text, sourceLang, targetLang, tone);
            
            if (translation && !translation.includes('Translation failed')) {
                return translation;
            }
            
            return null;
        } catch (error) {
            console.error('AIML API error:', error);
            
            // Provide user-friendly error message
            if (error.message.includes('API access denied')) {
                console.warn('AIML API access denied - falling back to Weblate');
            }
            
            return null;
        }
    }

    async callWeblateAPI(text, sourceLang, targetLang, tone) {
        try {
            // Use background script to avoid CORS issues
            if (chrome && chrome.runtime) {
                const response = await chrome.runtime.sendMessage({
                    action: 'callWeblateAPI',
                    text: text,
                    sourceLang: sourceLang,
                    targetLang: targetLang,
                    tone: tone
                });
                
                if (response && response.success) {
                    return response.translation;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Weblate API error:', error);
            return null;
        }
    }

    async getFallbackTranslation(text, sourceLang, targetLang, tone) {
        // Enhanced fallback translations
        const translations = {
            'ku-sorani-en': {
                'سڵاو': 'Hello',
                'چۆنی': 'How are you?',
                'سڵاو، چۆنی؟': 'Hello, how are you?',
                'سوپاس': 'Thank you',
                'بەڕێز': 'Sir/Madam',
                'بەیانی باش': 'Good morning',
                'شەوی باش': 'Good night',
                'خوات لەگەڵ': 'Goodbye',
                'من ناوی من ناسەرە': 'My name is Naser',
                'چۆن دەچیت': 'How are you doing?',
                'زۆر باش بوو': 'It was very good',
                'بۆ یارمەتیت': 'For your help'
            },
            'en-ku-sorani': {
                'Hello': 'سڵاو',
                'How are you?': 'چۆنی؟',
                'Thank you': 'سوپاس',
                'Good morning': 'بەیانی باش',
                'Good night': 'شەوی باش',
                'Goodbye': 'خوات لەگەڵ'
            },
            'ku-kurmanji-en': {
                'Silav': 'Hello',
                'Tu çawa yî?': 'How are you?',
                'Spas': 'Thank you'
            },
            'fa-en': {
                'سلام': 'Hello',
                'چطوری': 'How are you?',
                'اسم من ناصر است': 'My name is Naser'
            }
        };

        const key = `${sourceLang}-${targetLang}`;
        const translation = translations[key]?.[text];
        
        if (translation) {
            return translation;
        }

        // If no direct translation, try to find similar text
        for (const [key, langTranslations] of Object.entries(translations)) {
            if (key === `${sourceLang}-${targetLang}`) {
                for (const [source, target] of Object.entries(langTranslations)) {
                    if (text.toLowerCase().includes(source.toLowerCase()) || 
                        source.toLowerCase().includes(text.toLowerCase())) {
                        return target;
                    }
                }
            }
        }

        // If still no translation, return a formatted response
        return `[${text}] translated to ${targetLang}`;
    }



    showTranslation(translation) {
        this.widget.querySelector('.ziman-translation').textContent = translation;
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'translateSelection':
                if (request.text) {
                    this.showWidgetAtPosition(100, 100);
                    this.showOriginalText(request.text);
                }
                break;
                
            case 'translatePage':
                this.translateEntirePage();
                break;
        }
    }

    async translateEntirePage() {
        // Get all text nodes and translate them
        const textNodes = this.getTextNodes(document.body);
        
        for (let node of textNodes) {
            if (node.textContent.trim().length > 0) {
                try {
                    const translation = await this.translateText(node.textContent);
                    // In a real implementation, you'd replace the text content
                    // For now, just log the translation
                    console.log(`Original: ${node.textContent}`);
                    console.log(`Translation: ${translation}`);
                } catch (error) {
                    console.error('Translation error:', error);
                }
            }
        }
    }

    getTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        return textNodes;
    }
}

// Initialize content translator when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ContentTranslator();
    });
} else {
    new ContentTranslator();
}
