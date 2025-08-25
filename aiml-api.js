/**
 * AIML API Integration for Ziman AI Extension
 * Provides advanced AI-powered translation using multiple models
 * API Documentation: https://aimlapi.com/
 */

class AIMLAPI {
    constructor() {
        this.apiKey = '6e06e26fb9d1******263c4f8a1d3912b';
        this.baseUrl = 'https://api.aimlapi.com/v1';
        this.models = {
            // Free tier models (more likely to work)
            'gpt-4o-mini': 'openai/gpt-4o-mini',
            'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
            'claude-3-haiku': 'anthropic/claude-3-haiku-20240307',
            'llama-3': 'meta-llama/llama-3.3-8b-instruct',
            'gemini-2.0': 'google/gemini-2.0-flash-exp',
            
            // Premium models (may require higher tier)
            'deepseek-r1': 'deepseek/deepseek-r1',
            'claude-3.7': 'anthropic/claude-3-7-sonnet-20241022',
            'gpt-4o': 'openai/gpt-4o',
            'qwen-3': 'qwen/qwen-3-235b-instruct',
            'gemini-2.5': 'google/gemini-2.5-pro'
        };
        
        this.defaultModel = 'gpt-4o-mini'; // Start with free tier model
        this.errorHandler = null;
    }

    /**
     * Translate text using AI models
     */
    async translateText(text, sourceLang, targetLang, tone = 'neutral') {
        try {
            // Create system prompt for translation
            const systemPrompt = this.createTranslationPrompt(sourceLang, targetLang, tone);
            
            // Use the best model for the language combination
            const model = this.selectBestModel(sourceLang, targetLang);
            
            const response = await this.callChatCompletion(model, systemPrompt, text);
            
            if (response && response.content) {
                const cleanedTranslation = this.cleanTranslation(response.content);
                
                // Check if translation is meaningful
                if (cleanedTranslation && cleanedTranslation.length > 0 && 
                    !cleanedTranslation.includes('Translation failed') &&
                    !cleanedTranslation.includes('Error')) {
                    return cleanedTranslation;
                }
            }
            
            // Try fallback models if the first one fails (prioritize free tier)
            const fallbackModels = ['gpt-3.5-turbo', 'claude-3-haiku', 'llama-3', 'gemini-2.0'];
            
            for (const fallbackKey of fallbackModels) {
                if (fallbackKey === model) continue; // Skip the already tried model
                
                try {
                    console.log(`Trying fallback model: ${fallbackKey}`);
                    const fallbackModel = this.models[fallbackKey];
                    if (!fallbackModel) continue;
                    
                    const fallbackResponse = await this.callChatCompletion(fallbackModel, systemPrompt, text);
                    
                    if (fallbackResponse && fallbackResponse.content) {
                        const fallbackTranslation = this.cleanTranslation(fallbackResponse.content);
                        
                        if (fallbackTranslation && fallbackTranslation.length > 0 &&
                            !fallbackTranslation.includes('Translation failed') &&
                            !fallbackTranslation.includes('Error')) {
                            return fallbackTranslation;
                        }
                    }
                } catch (fallbackError) {
                    console.warn(`Fallback model ${fallbackKey} failed:`, fallbackError.message);
                    continue;
                }
            }
            
            throw new Error('All AI models failed to provide translation');
            
        } catch (error) {
            console.error('AIML API translation error:', error);
            
            // Simple error handling if ErrorHandler is not available
            if (this.errorHandler && typeof this.errorHandler.handleError === 'function') {
                return this.errorHandler.handleError(error, 'AIML_API');
            }
            
            // Fallback error message
            return `Translation failed: ${error.message}`;
        }
    }

    /**
     * Create system prompt for translation
     */
    createTranslationPrompt(sourceLang, targetLang, tone) {
        const languageNames = this.getLanguageNames(sourceLang, targetLang);
        const toneInstructions = this.getToneInstructions(tone);
        
        return `You are "Ziman AI", a professional Kurdish language translator specialized in Kurdish (Sorani and Kurmanji dialects) and 10 major world languages.

TASK: Translate the following text from ${languageNames.source} to ${languageNames.target}.

TRANSLATION REQUIREMENTS:
1. Maintain exact meaning, nuance, tone, and cultural context
2. Output must be grammatically correct, fluent, and natural in ${languageNames.target}
3. ${toneInstructions}
4. Preserve proper nouns, names, place names, and brand names
5. Translate idioms and expressions to convey equivalent meaning
6. Maintain any special formatting (line breaks, punctuation)
7. Provide ONLY the translated text, no explanations

SOURCE LANGUAGE: ${languageNames.source}
TARGET LANGUAGE: ${languageNames.target}
TONE: ${tone.toUpperCase()}

Translate the following text:`;
    }

    /**
     * Get language names for prompts
     */
    getLanguageNames(sourceLang, targetLang) {
        const languageMap = {
            'ku-sorani': 'Kurdish (Sorani)',
            'ku-kurmanji': 'Kurdish (Kurmanji)',
            'en': 'English',
            'ar': 'Arabic',
            'fa': 'Persian',
            'tr': 'Turkish',
            'fr': 'French',
            'de': 'German',
            'es': 'Spanish',
            'ru': 'Russian',
            'zh': 'Chinese',
            'ja': 'Japanese'
        };
        
        return {
            source: languageMap[sourceLang] || sourceLang,
            target: languageMap[targetLang] || targetLang
        };
    }

    /**
     * Get tone instructions
     */
    getToneInstructions(tone) {
        const toneMap = {
            'formal': 'Use formal, respectful language appropriate for business, academic, or official contexts',
            'informal': 'Use casual, friendly language appropriate for conversations with friends or family',
            'neutral': 'Use balanced, professional language that is neither too formal nor too casual'
        };
        
        return toneMap[tone] || toneMap.neutral;
    }

    /**
     * Select the best AI model for the language combination
     */
    selectBestModel(sourceLang, targetLang) {
        // For Kurdish languages, use models with strong multilingual capabilities
        if (sourceLang.startsWith('ku') || targetLang.startsWith('ku')) {
            return this.models['deepseek-r1']; // Excellent multilingual support
        }
        
        // For Asian languages, use models with strong regional knowledge
        if (['zh', 'ja', 'ko'].includes(sourceLang) || ['zh', 'ja', 'ko'].includes(targetLang)) {
            return this.models['qwen-3']; // Strong Asian language support
        }
        
        // For European languages, use Claude or GPT
        if (['fr', 'de', 'es', 'it'].includes(sourceLang) || ['fr', 'de', 'es', 'it'].includes(targetLang)) {
            return this.models['claude-3.7']; // Excellent European language support
        }
        
        // Default to DeepSeek R1 for general use
        return this.models['deepseek-r1'];
    }

    /**
     * Call AI model for translation
     */
    async callChatCompletion(model, systemPrompt, userText) {
        const requestBody = {
            model: model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userText
                }
            ],
            max_tokens: 2000,
            temperature: 0.3, // Lower temperature for more consistent translations
            top_p: 0.9
        };

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 403) {
                throw new Error('API access denied - please check your API key and permissions');
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded - please wait before making another request');
            } else if (response.status === 500) {
                throw new Error('Server error - please try again later');
            } else {
                throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }
        }

        const data = await response.json();
        return data.choices?.[0]?.message;
    }

    /**
     * Clean and format translation output
     */
    cleanTranslation(translation) {
        // Remove any markdown formatting
        let cleaned = translation.replace(/```[\s\S]*?```/g, '');
        cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
        
        // Remove any explanatory text
        cleaned = cleaned.replace(/Translation:|Translated text:|Here's the translation:/i, '');
        
        // Clean up extra whitespace
        cleaned = cleaned.trim();
        
        // Remove quotes if the entire text is wrapped in them
        if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
            (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.slice(1, -1);
        }
        
        return cleaned.trim();
    }

    /**
     * Get available models
     */
    async getAvailableModels() {
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }

            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Failed to fetch available models:', error);
            return Object.values(this.models);
        }
    }

    /**
     * Test API key validity
     */
    async testAPIKey() {
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 401) {
                return { valid: false, message: 'API key is invalid or expired' };
            } else if (response.status === 403) {
                return { valid: false, message: 'API key lacks required permissions' };
            } else if (response.status === 429) {
                return { valid: false, message: 'Rate limit exceeded' };
            } else if (response.ok) {
                return { valid: true, message: 'API key is valid' };
            } else {
                return { valid: false, message: `API key test failed: ${response.status}` };
            }
        } catch (error) {
            return { valid: false, message: `Network error: ${error.message}` };
        }
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            // First test API key validity
            const keyTest = await this.testAPIKey();
            if (!keyTest.valid) {
                return {
                    success: false,
                    message: 'API key validation failed',
                    error: keyTest.message
                };
            }
            
            // Test with a simple model first
            const testText = 'Hello';
            const sourceLang = 'en';
            const targetLang = 'ku-sorani';
            const tone = 'neutral';
            
            // Try different models if the first one fails (start with free tier)
            const modelsToTest = ['gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-haiku', 'llama-3', 'gemini-2.0'];
            
            for (const modelKey of modelsToTest) {
                try {
                    console.log(`Testing with model: ${modelKey}`);
                    
                    const model = this.models[modelKey];
                    if (!model) continue;
                    
                    const systemPrompt = this.createTranslationPrompt(sourceLang, targetLang, tone);
                    const response = await this.callChatCompletion(model, systemPrompt, testText);
                    
                    if (response && response.content) {
                        const translation = this.cleanTranslation(response.content);
                        return {
                            success: true,
                            message: `API connection successful with ${modelKey}`,
                            testTranslation: translation,
                            model: modelKey
                        };
                    }
                } catch (modelError) {
                    console.warn(`Model ${modelKey} failed:`, modelError.message);
                    continue;
                }
            }
            
            throw new Error('All models failed to respond - check your API plan and permissions');
            
        } catch (error) {
            return {
                success: false,
                message: 'API connection failed',
                error: error.message
            };
        }
    }

    /**
     * Get usage statistics
     */
    async getUsage() {
        try {
            const response = await fetch(`${this.baseUrl}/usage`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch usage: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to fetch usage:', error);
            return null;
        }
    }

    /**
     * Batch translate multiple texts
     */
    async batchTranslate(texts, sourceLang, targetLang, tone = 'neutral') {
        const results = [];
        
        for (let i = 0; i < texts.length; i++) {
            try {
                const translation = await this.translateText(texts[i], sourceLang, targetLang, tone);
                results.push({
                    original: texts[i],
                    translated: translation,
                    success: true
                });
                
                // Add delay between requests to avoid rate limiting
                if (i < texts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                results.push({
                    original: texts[i],
                    translated: null,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Get model information
     */
    getModelInfo(modelKey) {
        const modelInfo = {
            'deepseek-r1': {
                name: 'DeepSeek R1',
                description: 'Advanced reasoning model with excellent multilingual support',
                maxTokens: 128000,
                languages: ['English', 'Chinese', 'Arabic', 'Persian', 'Turkish', 'Kurdish']
            },
            'claude-3.7': {
                name: 'Claude 3.7 Sonnet',
                description: 'Balanced reasoning and speed with strong European language support',
                maxTokens: 200000,
                languages: ['English', 'French', 'German', 'Spanish', 'Italian', 'Portuguese']
            },
            'gpt-4o': {
                name: 'GPT-4o',
                description: 'OpenAI\'s latest multimodal model with broad language support',
                maxTokens: 128000,
                languages: ['English', 'Multiple European and Asian languages']
            },
            'qwen-3': {
                name: 'Qwen 3 235B',
                description: 'Massive-scale model with strong Asian language capabilities',
                maxTokens: 32768,
                languages: ['Chinese', 'Japanese', 'Korean', 'English', 'Arabic']
            }
        };
        
        return modelInfo[modelKey] || {
            name: 'Unknown Model',
            description: 'Model information not available',
            maxTokens: 10000,
            languages: ['Unknown']
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIMLAPI;
} else {
    window.AIMLAPI = AIMLAPI;
}
