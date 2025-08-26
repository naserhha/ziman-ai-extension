/**
 * Weblate API Integration for Ziman AI
 * API Documentation: https://hosted.weblate.org/api/
 */

class WeblateAPI {
    constructor() {
        this.apiKey = 'apikey';
        this.baseUrl = 'https://hosted.weblate.org/api/';
        this.headers = {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Get list of available projects
     */
    async getProjects() {
        try {
            const response = await fetch(`${this.baseUrl}projects/`, {
                headers: this.headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching projects:', error);
            throw error;
        }
    }

    /**
     * Get components for a specific project
     */
    async getComponents(projectSlug) {
        try {
            const response = await fetch(`${this.baseUrl}projects/${projectSlug}/components/`, {
                headers: this.headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching components:', error);
            throw error;
        }
    }

    /**
     * Get translations for a specific component
     */
    async getTranslations(projectSlug, componentSlug, languageCode) {
        try {
            const response = await fetch(
                `${this.baseUrl}translations/${projectSlug}/${componentSlug}/${languageCode}/`, 
                { headers: this.headers }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching translations:', error);
            throw error;
        }
    }

    /**
     * Get units (translatable strings) for a translation
     */
    async getUnits(projectSlug, componentSlug, languageCode, page = 1) {
        try {
            const response = await fetch(
                `${this.baseUrl}units/${projectSlug}/${componentSlug}/${languageCode}/?page=${page}`, 
                { headers: this.headers }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching units:', error);
            throw error;
        }
    }

    /**
     * Search for translations
     */
    async searchTranslations(query, sourceLanguage = '', targetLanguage = '', project = '') {
        try {
            let url = `${this.baseUrl}units/?q=${encodeURIComponent(query)}`;
            
            if (sourceLanguage) url += `&source_language=${sourceLanguage}`;
            if (targetLanguage) url += `&target_language=${targetLanguage}`;
            if (project) url += `&project=${project}`;
            
            const response = await fetch(url, { headers: this.headers });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error searching translations:', error);
            throw error;
        }
    }

    /**
     * Get language statistics
     */
    async getLanguageStats(projectSlug, componentSlug) {
        try {
            const response = await fetch(
                `${this.baseUrl}components/${projectSlug}/${componentSlug}/statistics/`, 
                { headers: this.headers }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching language stats:', error);
            throw error;
        }
    }

    /**
     * Get available languages
     */
    async getLanguages() {
        try {
            const response = await fetch(`${this.baseUrl}languages/`, {
                headers: this.headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching languages:', error);
            throw error;
        }
    }

    /**
     * Create a new translation suggestion
     */
    async createSuggestion(projectSlug, componentSlug, languageCode, unitId, target) {
        try {
            const response = await fetch(
                `${this.baseUrl}units/${unitId}/suggestions/`, 
                {
                    method: 'POST',
                    headers: this.headers,
                    body: JSON.stringify({
                        target: target,
                        target_language: languageCode
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error creating suggestion:', error);
            throw error;
        }
    }

    /**
     * Get machine translation suggestions
     */
    async getMachineTranslations(text, sourceLanguage, targetLanguage) {
        try {
            const response = await fetch(
                `${this.baseUrl}languages/${targetLanguage}/machine-translations/`, 
                {
                    method: 'POST',
                    headers: this.headers,
                    body: JSON.stringify({
                        text: text,
                        source_language: sourceLanguage
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error getting machine translations:', error);
            throw error;
        }
    }

    /**
     * Translate text using available translations in Weblate
     */
    async translateText(text, sourceLanguage, targetLanguage, tone = 'neutral') {
        try {
            // First, try to find existing translations
            const searchResults = await this.searchTranslations(
                text, 
                sourceLanguage, 
                targetLanguage
            );
            
            if (searchResults.results && searchResults.results.length > 0) {
                // Return the best match
                return searchResults.results[0].target;
            }
            
            // If no existing translation, try machine translation
            try {
                const machineTranslation = await this.getMachineTranslations(
                    text, 
                    sourceLanguage, 
                    targetLanguage
                );
                
                if (machineTranslation.translations && machineTranslation.translations.length > 0) {
                    return machineTranslation.translations[0].text;
                }
            } catch (machineError) {
                console.warn('Machine translation failed, falling back to mock translation');
            }
            
            // Fallback to mock translation for demonstration
            return this.getMockTranslation(text, sourceLanguage, targetLanguage, tone);
            
        } catch (error) {
            console.error('Translation failed:', error);
            throw new Error('Translation service unavailable');
        }
    }

    /**
     * Mock translation service for demonstration
     */
    getMockTranslation(text, sourceLanguage, targetLanguage, tone) {
        const translations = {
            'ku-sorani-en': {
                'سڵاو': 'Hello',
                'چۆنی': 'How are you?',
                'سڵاو، چۆنی؟': 'Hello, how are you?',
                'سوپاس': 'Thank you',
                'بەڕێز': 'Sir/Madam',
                'بەیانی باش': 'Good morning',
                'شەوی باش': 'Good night',
                'خوات لەگەڵ': 'Goodbye'
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
                'Silav, tu çawa yî?': 'Hello, how are you?',
                'Spas': 'Thank you'
            }
        };
        
        const key = `${sourceLanguage}-${targetLanguage}`;
        return translations[key]?.[text] || `[${text}] translated to ${targetLanguage}`;
    }

    /**
     * Get API usage statistics
     */
    async getAPIStats() {
        try {
            const response = await fetch(`${this.baseUrl}`, {
                headers: this.headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching API stats:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeblateAPI;
} else {
    window.WeblateAPI = WeblateAPI;
}
