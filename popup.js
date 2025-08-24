class ZimanTranslator {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
    }

    initializeElements() {
        this.sourceLang = document.getElementById('sourceLang');
        this.targetLang = document.getElementById('targetLang');
        this.tone = document.getElementById('tone');
        this.sourceText = document.getElementById('sourceText');
        this.resultText = document.getElementById('resultText');
        this.translateBtn = document.getElementById('translateBtn');
        this.swapBtn = document.getElementById('swapBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.pasteBtn = document.getElementById('pasteBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.speakBtn = document.getElementById('speakBtn');
        this.pageTranslateBtn = document.getElementById('pageTranslateBtn');
        this.selectionBtn = document.getElementById('selectionBtn');
        this.phonetic = document.getElementById('phonetic');
        this.apiKeyInput = document.getElementById('apiKey');
        this.saveApiKeyBtn = document.getElementById('saveApiKey');
        this.testApiKeyBtn = document.getElementById('testApiKey');
    }

    bindEvents() {
        this.translateBtn.addEventListener('click', () => this.translate());
        this.swapBtn.addEventListener('click', () => this.swapLanguages());
        this.clearBtn.addEventListener('click', () => this.clearText());
        this.pasteBtn.addEventListener('click', () => this.pasteText());
        this.copyBtn.addEventListener('click', () => this.copyResult());
        this.speakBtn.addEventListener('click', () => this.speakText());
        this.pageTranslateBtn.addEventListener('click', () => this.translatePage());
        this.selectionBtn.addEventListener('click', () => this.translateSelection());
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.testApiKeyBtn.addEventListener('click', () => this.testApiKey());
        
        // Auto-save settings
        this.sourceLang.addEventListener('change', () => this.saveSettings());
        this.targetLang.addEventListener('change', () => this.saveSettings());
        this.tone.addEventListener('change', () => this.saveSettings());
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['sourceLang', 'targetLang', 'tone', 'apiKey']);
            if (result.sourceLang) this.sourceLang.value = result.sourceLang;
            if (result.targetLang) this.targetLang.value = result.targetLang;
            if (result.tone) this.tone.value = result.tone;
            if (result.apiKey) this.apiKeyInput.value = result.apiKey;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({
                sourceLang: this.sourceLang.value,
                targetLang: this.targetLang.value,
                tone: this.tone.value
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    async saveApiKey() {
        try {
            const apiKey = this.apiKeyInput.value.trim();
            if (apiKey) {
                await chrome.storage.sync.set({ apiKey: apiKey });
                this.showResult('✅ API Key saved successfully!');
                this.saveApiKeyBtn.textContent = '✅ Saved';
                setTimeout(() => {
                    this.saveApiKeyBtn.textContent = '💾 Save API Key';
                }, 2000);
            } else {
                this.showResult('❌ Please enter a valid API key.');
            }
        } catch (error) {
            console.error('Error saving API key:', error);
            this.showResult('❌ Error saving API key.');
        }
    }

    async testApiKey() {
        try {
            const apiKey = this.apiKeyInput.value.trim();
            if (!apiKey) {
                this.showResult('❌ Please enter an API key first.');
                return;
            }

            this.testApiKeyBtn.textContent = '🧪 Testing...';
            this.testApiKeyBtn.disabled = true;

            // Test with AIML API
            if (window.AIMLAPI) {
                const aimlAPI = new window.AIMLAPI();
                aimlAPI.apiKey = apiKey;
                
                try {
                    const testResult = await aimlAPI.testAPIKey();
                    if (testResult.valid) {
                        this.showResult('✅ API Key is valid! You can now use all AI chatbots.');
                        this.testApiKeyBtn.textContent = '✅ Connected';
                    } else {
                        this.showResult(`❌ API Key test failed: ${testResult.message}`);
                        this.testApiKeyBtn.textContent = '❌ Failed';
                    }
                } catch (error) {
                    this.showResult(`❌ API test error: ${error.message}`);
                    this.testApiKeyBtn.textContent = '❌ Error';
                }
            } else {
                this.showResult('❌ AIML API not available. Please refresh the page.');
                this.testApiKeyBtn.textContent = '❌ Unavailable';
            }

            setTimeout(() => {
                this.testApiKeyBtn.textContent = '🧪 Test Connection';
                this.testApiKeyBtn.disabled = false;
            }, 3000);

        } catch (error) {
            console.error('Error testing API key:', error);
            this.showResult('❌ Error testing API key.');
            this.testApiKeyBtn.textContent = '🧪 Test Connection';
            this.testApiKeyBtn.disabled = false;
        }
    }

    async translate() {
        const text = this.sourceText.value.trim();
        if (!text) {
            this.showResult('Please enter text to translate.');
            return;
        }

        this.translateBtn.disabled = true;
        this.translateBtn.innerHTML = '<span class="spinner"></span> Translating...';
        this.translateBtn.classList.add('pulse');
        
        try {
            const translation = await this.performTranslation(text);
            this.showResult(translation);
        } catch (error) {
            this.showResult(`Translation error: ${error.message}`);
        } finally {
            this.translateBtn.disabled = false;
            this.translateBtn.textContent = 'Translate';
            this.translateBtn.classList.remove('pulse');
        }
    }

    async performTranslation(text) {
        const sourceLang = this.sourceLang.value;
        const targetLang = this.targetLang.value;
        const tone = this.tone.value;
        const includePhonetic = this.phonetic.checked;

        // Show status to user
        this.showResult('🔄 Translating with AI...');

        try {
            // First try to use AIML API (AI-powered translation)
            if (sourceLang !== 'auto' && window.AIMLAPI) {
                const translation = await this.translateWithAIML(text, sourceLang, targetLang, tone);
                if (translation) {
                    let result = translation;
                    if (includePhonetic && sourceLang.startsWith('ku')) {
                        result += `\n\nPhonetic: ${this.getPhonetic(text)}`;
                    }
                    return result;
                } else {
                    console.log('AIML API returned no translation, trying Weblate...');
                    this.showResult('🔄 AI translation failed, trying professional translation...');
                }
            }
        } catch (error) {
            console.warn('AIML API failed, trying Weblate:', error);
            this.showResult('🔄 AI translation failed, trying professional translation...');
        }

        try {
            // Fallback to Weblate API
            if (sourceLang !== 'auto') {
                const translation = await this.translateWithWeblate(text, sourceLang, targetLang, tone);
                if (translation) {
                    let result = translation;
                    if (includePhonetic && sourceLang.startsWith('ku')) {
                        result += `\n\nPhonetic: ${this.getPhonetic(text)}`;
                    }
                    return result;
                }
            }
        } catch (error) {
            console.warn('Weblate API failed, using fallback:', error);
            this.showResult('🔄 Professional translation failed, using local translation...');
        }

        // Final fallback to enhanced mock translations
        this.showResult('🔄 Using local translation...');
        const translation = await this.translateWithFallback(text, sourceLang, targetLang, tone);
        let result = translation;
        
        if (includePhonetic && sourceLang.startsWith('ku')) {
            result += `\n\nPhonetic: ${this.getPhonetic(text)}`;
        }
        
        return result;
    }

    async translateWithAIML(text, sourceLang, targetLang, tone) {
        try {
            if (!window.AIMLAPI) {
                throw new Error('AIML API not available');
            }

            const aimlAPI = new window.AIMLAPI();
            
            // Use personal API key if available
            const apiKey = this.apiKeyInput.value.trim();
            if (apiKey) {
                aimlAPI.apiKey = apiKey;
                console.log('Using personal API key for AI translation');
            } else {
                console.log('Using default API key for AI translation');
            }
            
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

    async translateWithWeblate(text, sourceLang, targetLang, tone) {
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

    async translateWithFallback(text, sourceLang, targetLang, tone) {
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
                'Goodbye': 'خوات لەگەڵ',
                'My name is': 'من ناوی من',
                'How are you doing?': 'چۆن دەچیت؟',
                'It was very good': 'زۆر باش بوو',
                'For your help': 'بۆ یارمەتیت'
            },
            'ku-kurmanji-en': {
                'Silav': 'Hello',
                'Tu çawa yî?': 'How are you?',
                'Silav, tu çawa yî?': 'Hello, how are you?',
                'Spas': 'Thank you',
                'Ez Naser im': 'I am Naser'
            },
            'en-ku-kurmanji': {
                'Hello': 'Silav',
                'How are you?': 'Tu çawa yî?',
                'Thank you': 'Spas',
                'I am Naser': 'Ez Naser im'
            },
            'fa-en': {
                'سلام': 'Hello',
                'چطوری': 'How are you?',
                'اسم من ناصر است': 'My name is Naser',
                'ممنون': 'Thank you',
                'خداحافظ': 'Goodbye'
            },
            'en-fa': {
                'Hello': 'سلام',
                'How are you?': 'چطوری؟',
                'My name is Naser': 'اسم من ناصر است',
                'Thank you': 'ممنون',
                'Goodbye': 'خداحافظ'
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

    getPhonetic(kurdishText) {
        // Enhanced phonetic mapping for Kurdish
        const phoneticMap = {
            'سڵاو': 'slaaw',
            'چۆنی': 'choni',
            'سڵاو، چۆنی؟': 'slaaw, choni?',
            'سوپاس': 'supas',
            'بەڕێز': 'berêz',
            'بەیانی باش': 'beyanî baash',
            'شەوی باش': 'shewî baash',
            'خوات لەگەڵ': 'xwat legell',
            'من ناوی من ناسەرە': 'min nawî min naser e',
            'چۆن دەچیت': 'chon dechit',
            'زۆر باش بوو': 'zor baash bu',
            'بۆ یارمەتیت': 'bo yarmetit'
        };
        
        // If exact match not found, try to generate phonetic
        if (phoneticMap[kurdishText]) {
            return phoneticMap[kurdishText];
        }
        
        // Generate basic phonetic for unknown text
        return this.generateBasicPhonetic(kurdishText);
    }

    generateBasicPhonetic(kurdishText) {
        // Basic phonetic rules for Kurdish Sorani
        const phoneticRules = {
            'س': 's',
            'ڵ': 'll',
            'ا': 'a',
            'و': 'w',
            'چ': 'ch',
            'ۆ': 'o',
            'ن': 'n',
            'ی': 'i',
            'س': 's',
            'پ': 'p',
            'ب': 'b',
            'ە': 'e',
            'ش': 'sh',
            'و': 'w',
            'ی': 'i',
            'ت': 't',
            'ر': 'r',
            'ز': 'z',
            'م': 'm',
            'ن': 'n',
            'گ': 'g',
            'ل': 'l',
            'د': 'd',
            'ک': 'k',
            'ه': 'h',
            'ع': '3',
            'غ': 'gh',
            'ق': 'q',
            'ف': 'f',
            'ث': 'th',
            'ح': 'h',
            'خ': 'kh',
            'ذ': 'dh',
            'ض': 'dh',
            'ط': 't',
            'ظ': 'dh',
            'ص': 's',
            'ج': 'j',
            'ه': 'h'
        };
        
        let phonetic = '';
        for (let char of kurdishText) {
            if (phoneticRules[char]) {
                phonetic += phoneticRules[char];
            } else {
                phonetic += char;
            }
        }
        
        return phonetic;
    }

    showResult(text) {
        this.resultText.textContent = text;
        this.resultText.style.display = 'block';
        
        // Add animation classes
        this.resultText.classList.add('fade-in');
        
        // Add success animation if translation is successful
        if (text && !text.includes('error') && !text.includes('Error')) {
            this.resultText.classList.add('glow');
            setTimeout(() => {
                this.resultText.classList.remove('glow');
            }, 2000);
        }
        
        // Remove animation class after animation completes
        setTimeout(() => {
            this.resultText.classList.remove('fade-in');
        }, 500);
    }

    swapLanguages() {
        const temp = this.sourceLang.value;
        this.sourceLang.value = this.targetLang.value;
        this.targetLang.value = temp;
        this.saveSettings();
    }

    clearText() {
        this.sourceText.value = '';
        this.resultText.textContent = '';
    }

    async pasteText() {
        try {
            const text = await navigator.clipboard.readText();
            this.sourceText.value = text;
        } catch (error) {
            this.showResult('Unable to paste text. Please paste manually.');
        }
    }

    async copyResult() {
        const text = this.resultText.textContent;
        if (text) {
            try {
                await navigator.clipboard.writeText(text);
                this.copyBtn.textContent = 'Copied!';
                this.copyBtn.classList.add('glow');
                
                setTimeout(() => {
                    this.copyBtn.textContent = 'Copy';
                    this.copyBtn.classList.remove('glow');
                }, 2000);
            } catch (error) {
                this.showResult('Unable to copy text.');
                this.copyBtn.classList.add('shake');
                setTimeout(() => {
                    this.copyBtn.classList.remove('shake');
                }, 600);
            }
        }
    }

    speakText() {
        const text = this.resultText.textContent;
        if (text && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.getLanguageCode(this.targetLang.value);
            speechSynthesis.speak(utterance);
        }
    }

    getLanguageCode(lang) {
        const codes = {
            'en': 'en-US',
            'ku-sorani': 'ku-IQ',
            'ku-kurmanji': 'ku-TR',
            'ar': 'ar-SA',
            'fa': 'fa-IR',
            'tr': 'tr-TR',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'es': 'es-ES',
            'ru': 'ru-RU',
            'zh': 'zh-CN',
            'ja': 'ja-JP'
        };
        return codes[lang] || 'en-US';
    }

    async translatePage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.id) {
                this.showResult('No active tab found.');
                return;
            }
            
            // Check if content script is loaded
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                if (!response || response.error) {
                    throw new Error('Content script not responding');
                }
            } catch (error) {
                this.showResult('Content script not loaded. Please refresh the page and try again.');
                return;
            }
            
            // Send translation request
            try {
                await chrome.tabs.sendMessage(tab.id, { action: 'translatePage' });
                this.showResult('Page translation started. Check the page for results.');
            } catch (error) {
                this.showResult('Translation failed. Please try again.');
            }
        } catch (error) {
            console.error('Translate page error:', error);
            this.showResult('Unable to translate page. Please refresh and try again.');
        }
    }

    async translateSelection() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.id) {
                this.showResult('No active tab found.');
                return;
            }
            
            // Check if content script is loaded
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                if (!response || response.error) {
                    throw new Error('Content script not responding');
                }
            } catch (error) {
                this.showResult('Content script not loaded. Please refresh the page and try again.');
                return;
            }
            
            // Get selected text
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' });
                if (response && response.text && response.text.trim()) {
                    this.sourceText.value = response.text;
                    this.translate();
                } else {
                    this.showResult('No text selected. Please select text on the page first.');
                }
            } catch (error) {
                this.showResult('Unable to get selection. Please select text manually.');
            }
        } catch (error) {
            console.error('Translate selection error:', error);
            this.showResult('Unable to get selection. Please select text manually.');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ZimanTranslator();
});
