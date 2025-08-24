/**
 * Error Handler for Ziman AI Extension
 * Provides centralized error handling and user feedback
 */

class ErrorHandler {
    constructor() {
        this.errorTypes = {
            NETWORK_ERROR: 'NETWORK_ERROR',
            API_ERROR: 'API_ERROR',
            PERMISSION_ERROR: 'PERMISSION_ERROR',
            CONTENT_SCRIPT_ERROR: 'CONTENT_SCRIPT_ERROR',
            TRANSLATION_ERROR: 'TRANSLATION_ERROR',
            UNKNOWN_ERROR: 'UNKNOWN_ERROR'
        };
    }

    /**
     * Handle different types of errors
     */
    handleError(error, context = '') {
        const errorInfo = this.analyzeError(error);
        
        console.error(`[${context}] Error:`, errorInfo);
        
        // Log error for debugging
        this.logError(errorInfo, context);
        
        // Return user-friendly error message
        return this.getUserFriendlyMessage(errorInfo);
    }

    /**
     * Analyze error and categorize it
     */
    analyzeError(error) {
        if (error.name === 'AbortError') {
            return {
                type: this.errorTypes.NETWORK_ERROR,
                message: 'Request timed out',
                code: 'TIMEOUT',
                originalError: error
            };
        }
        
        if (error.message && error.message.includes('Extension context invalidated')) {
            return {
                type: this.errorTypes.PERMISSION_ERROR,
                message: 'Extension context invalidated',
                code: 'CONTEXT_INVALID',
                originalError: error
            };
        }
        
        if (error.message && error.message.includes('Failed to fetch')) {
            return {
                type: this.errorTypes.NETWORK_ERROR,
                message: 'Network request failed',
                code: 'FETCH_FAILED',
                originalError: error
            };
        }
        
        if (error.message && error.message.includes('Content script not loaded')) {
            return {
                type: this.errorTypes.CONTENT_SCRIPT_ERROR,
                message: 'Content script not loaded',
                code: 'SCRIPT_MISSING',
                originalError: error
            };
        }
        
        if (error.message && error.message.includes('message channel closed')) {
            return {
                type: this.errorTypes.CONTENT_SCRIPT_ERROR,
                message: 'Communication channel closed',
                code: 'CHANNEL_CLOSED',
                originalError: error
            };
        }
        
        return {
            type: this.errorTypes.UNKNOWN_ERROR,
            message: error.message || 'Unknown error occurred',
            code: 'UNKNOWN',
            originalError: error
        };
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(errorInfo) {
        const messages = {
            [this.errorTypes.NETWORK_ERROR]: {
                TIMEOUT: 'Request timed out. Please check your internet connection and try again.',
                FETCH_FAILED: 'Network error. Please check your internet connection and try again.'
            },
            [this.errorTypes.API_ERROR]: {
                UNAUTHORIZED: 'API access denied. Please check your API key.',
                RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
                SERVER_ERROR: 'Translation service temporarily unavailable. Please try again later.'
            },
            [this.errorTypes.PERMISSION_ERROR]: {
                CONTEXT_INVALID: 'Extension needs to be refreshed. Please reload the page and try again.',
                PERMISSION_DENIED: 'Permission denied. Please check extension permissions.'
            },
            [this.errorTypes.CONTENT_SCRIPT_ERROR]: {
                SCRIPT_MISSING: 'Translation features not loaded. Please refresh the page and try again.',
                CHANNEL_CLOSED: 'Communication error. Please refresh the page and try again.'
            },
            [this.errorTypes.TRANSLATION_ERROR]: {
                NO_RESULT: 'Translation not available for this text. Please try different text.',
                LANGUAGE_NOT_SUPPORTED: 'This language combination is not supported.'
            },
            [this.errorTypes.UNKNOWN_ERROR]: {
                UNKNOWN: 'An unexpected error occurred. Please try again.'
            }
        };

        const typeMessages = messages[errorInfo.type];
        if (typeMessages && typeMessages[errorInfo.code]) {
            return typeMessages[errorInfo.code];
        }

        return errorInfo.message || 'An error occurred. Please try again.';
    }

    /**
     * Log error for debugging
     */
    logError(errorInfo, context) {
        const logData = {
            timestamp: new Date().toISOString(),
            context: context,
            errorType: errorInfo.type,
            errorCode: errorInfo.code,
            message: errorInfo.message,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Log to console
        console.group('Ziman AI Error Log');
        console.log('Error Details:', logData);
        console.log('Original Error:', errorInfo.originalError);
        console.groupEnd();

        // Store in local storage for debugging
        try {
            const existingLogs = JSON.parse(localStorage.getItem('ziman_error_logs') || '[]');
            existingLogs.push(logData);
            
            // Keep only last 50 errors
            if (existingLogs.length > 50) {
                existingLogs.splice(0, existingLogs.length - 50);
            }
            
            localStorage.setItem('ziman_error_logs', JSON.stringify(existingLogs));
        } catch (e) {
            console.warn('Failed to store error log:', e);
        }
    }

    /**
     * Show error notification to user
     */
    showErrorNotification(message, type = 'error') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `ziman-notification ziman-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'error' ? '❌' : '⚠️'}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">×</button>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f8d7da' : '#fff3cd'};
            color: ${type === 'error' ? '#721c24' : '#856404'};
            border: 1px solid ${type === 'error' ? '#f5c6cb' : '#ffeaa7'};
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Close button functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        return notification;
    }

    /**
     * Get error logs for debugging
     */
    getErrorLogs() {
        try {
            return JSON.parse(localStorage.getItem('ziman_error_logs') || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Clear error logs
     */
    clearErrorLogs() {
        try {
            localStorage.removeItem('ziman_error_logs');
        } catch (e) {
            console.warn('Failed to clear error logs:', e);
        }
    }

    /**
     * Check if extension is in a valid state
     */
    isExtensionValid() {
        try {
            // Check if chrome.runtime is available
            if (typeof chrome === 'undefined' || !chrome.runtime) {
                return false;
            }

            // Check if extension is still valid
            return chrome.runtime.getManifest() !== undefined;
        } catch (e) {
            return false;
        }
    }

    /**
     * Retry operation with exponential backoff
     */
    async retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }

                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
} else {
    window.ErrorHandler = ErrorHandler;
}
