/**
 * Personal AI Clone - Main Application JavaScript
 * Pure vanilla JavaScript for all core functionality
 */

// Global app object
window.PersonalAI = {
    // Configuration
    config: {
        apiBaseUrl: '/api',
        toastDuration: 5000,
        autoSaveDelay: 2000
    },
    
    // State management
    state: {
        user: null,
        isLoading: false,
        currentPage: null
    },
    
    // Event handlers
    handlers: {},
    
    // Utility functions
    utils: {},
    
    // API functions
    api: {},
    
    // UI components
    ui: {}
};

// Utility Functions
PersonalAI.utils = {
    // Debounce function for performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function for scroll events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Format date for display
    formatDate(dateString, options = {}) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (options.relative !== false) {
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
        }
        
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        });
    },
    
    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Validate email format
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Local storage helpers
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.warn('Error reading from localStorage:', error);
                return defaultValue;
            }
        },
        
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.warn('Error writing to localStorage:', error);
                return false;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn('Error removing from localStorage:', error);
                return false;
            }
        }
    }
};

// API Functions
PersonalAI.api = {
    // Generic API request helper
    async request(endpoint, options = {}) {
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await fetch(`${PersonalAI.config.apiBaseUrl}${endpoint}`, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },
    
    // Get user responses
    async getResponses(options = {}) {
        const params = new URLSearchParams({
            limit: options.limit || 20,
            offset: options.offset || 0,
            ...options
        });
        
        return this.request(`/responses?${params}`);
    },
    
    // Save response
    async saveResponse(data) {
        return this.request('/responses', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    // Delete response
    async deleteResponse(responseId) {
        return this.request(`/responses?id=${responseId}`, {
            method: 'DELETE'
        });
    },
    
    // Chat with AI
    async chatWithAI(message, sessionId = null) {
        return this.request('/ai-echo/chat', {
            method: 'POST',
            body: JSON.stringify({
                message,
                sessionId,
                context: PersonalAI.utils.storage.get('chatContext', [])
            })
        });
    }
};

// UI Components
PersonalAI.ui = {
    // Toast notifications
    showToast(message, type = 'info', duration = null) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} toast-notification`;
        toast.innerHTML = `
            <div class="flex justify-between items-center">
                <span>${PersonalAI.utils.escapeHtml(message)}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-current">×</button>
            </div>
        `;
        
        // Add toast styles
        toast.style.cssText = `
            margin-bottom: 0.5rem;
            animation: slideInRight 0.3s ease-out;
            cursor: pointer;
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto-remove after duration
        const timeoutDuration = duration || PersonalAI.config.toastDuration;
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, timeoutDuration);
        
        // Click to dismiss
        toast.addEventListener('click', () => {
            toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        });
    },
    
    // Loading overlay
    showLoading(container = document.body, message = 'Loading...') {
        const loadingId = 'loading-overlay-' + PersonalAI.utils.generateId();
        const overlay = document.createElement('div');
        overlay.id = loadingId;
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading"></div>
                <span class="ml-3">${PersonalAI.utils.escapeHtml(message)}</span>
            </div>
        `;
        
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        if (container === document.body) {
            overlay.style.position = 'fixed';
        } else {
            container.style.position = 'relative';
        }
        
        container.appendChild(overlay);
        return loadingId;
    },
    
    hideLoading(loadingId) {
        const overlay = document.getElementById(loadingId);
        if (overlay) {
            overlay.remove();
        }
    },
    
    // Confirmation dialog
    showConfirmDialog(message, onConfirm, onCancel) {
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Confirm Action</h3>
                </div>
                <div class="modal-body">
                    <p>${PersonalAI.utils.escapeHtml(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-danger confirm-btn">Confirm</button>
                    <button class="btn btn-secondary cancel-btn">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Event handlers
        const confirmBtn = dialog.querySelector('.confirm-btn');
        const cancelBtn = dialog.querySelector('.cancel-btn');
        
        confirmBtn.addEventListener('click', () => {
            dialog.remove();
            if (onConfirm) onConfirm();
        });
        
        cancelBtn.addEventListener('click', () => {
            dialog.remove();
            if (onCancel) onCancel();
        });
        
        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
                if (onCancel) onCancel();
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                dialog.remove();
                document.removeEventListener('keydown', escapeHandler);
                if (onCancel) onCancel();
            }
        };
        document.addEventListener('keydown', escapeHandler);
    },
    
    // Auto-resize textarea
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    },
    
    // Form validation
    validateForm(form) {
        const errors = [];
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                errors.push(`${field.name || field.id} is required`);
                field.classList.add('error');
            } else {
                field.classList.remove('error');
            }
            
            // Email validation
            if (field.type === 'email' && field.value && !PersonalAI.utils.validateEmail(field.value)) {
                errors.push('Please enter a valid email address');
                field.classList.add('error');
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
};

// Navigation handling
PersonalAI.handlers.navigation = {
    init() {
        // Mobile navigation toggle
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('mobile-open');
                navToggle.textContent = navMenu.classList.contains('mobile-open') ? '✕' : '☰';
            });
            
            // Close mobile menu when clicking on a link
            navMenu.addEventListener('click', (e) => {
                if (e.target.classList.contains('nav-link')) {
                    navMenu.classList.remove('mobile-open');
                    navToggle.textContent = '☰';
                }
            });
        }
        
        // Update active nav link
        this.updateActiveNavLink();
    },
    
    updateActiveNavLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }
};

// Form handling
PersonalAI.handlers.forms = {
    init() {
        // Auto-save functionality for forms
        const autoSaveForms = document.querySelectorAll('[data-auto-save]');
        autoSaveForms.forEach(form => {
            this.initAutoSave(form);
        });
        
        // Auto-resize textareas
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            textarea.addEventListener('input', () => {
                PersonalAI.ui.autoResizeTextarea(textarea);
            });
            
            // Initial resize
            PersonalAI.ui.autoResizeTextarea(textarea);
        });
        
        // Character counters
        const textInputsWithCount = document.querySelectorAll('[data-char-count]');
        textInputsWithCount.forEach(input => {
            this.initCharacterCounter(input);
        });
    },
    
    initAutoSave(form) {
        const formId = form.id;
        if (!formId) return;
        
        // Load saved data
        const savedData = PersonalAI.utils.storage.get(`form_${formId}`);
        if (savedData) {
            Object.keys(savedData).forEach(key => {
                const field = form.querySelector(`[name="${key}"]`);
                if (field && field.type !== 'password') {
                    field.value = savedData[key];
                }
            });
        }
        
        // Save on input
        const debouncedSave = PersonalAI.utils.debounce(() => {
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
                if (key !== 'password') { // Don't save passwords
                    data[key] = value;
                }
            }
            PersonalAI.utils.storage.set(`form_${formId}`, data);
        }, PersonalAI.config.autoSaveDelay);
        
        form.addEventListener('input', debouncedSave);
        
        // Clear on successful submit
        form.addEventListener('submit', () => {
            PersonalAI.utils.storage.remove(`form_${formId}`);
        });
    },
    
    initCharacterCounter(input) {
        const counterId = input.getAttribute('data-char-count');
        const counter = document.getElementById(counterId);
        const maxLength = input.getAttribute('maxlength');
        
        if (!counter || !maxLength) return;
        
        const updateCounter = () => {
            const currentLength = input.value.length;
            counter.textContent = `${currentLength}/${maxLength}`;
            
            // Visual feedback for approaching limit
            if (currentLength > maxLength * 0.9) {
                counter.style.color = 'var(--warning)';
            } else if (currentLength > maxLength * 0.8) {
                counter.style.color = 'var(--info)';
            } else {
                counter.style.color = '';
            }
        };
        
        input.addEventListener('input', updateCounter);
        updateCounter(); // Initial update
    }
};

// Error handling
PersonalAI.handlers.errors = {
    init() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.logError(event.error);
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.logError(event.reason);
        });
    },
    
    logError(error) {
        // In production, you might want to send errors to a logging service
        if (process.env.NODE_ENV === 'development') {
            console.error('Error logged:', error);
        }
        
        // You could implement error reporting here
        // PersonalAI.api.reportError(error);
    },
    
    handleApiError(error, context = '') {
        console.error(`API Error ${context}:`, error);
        
        let message = 'An error occurred. Please try again.';
        
        if (error.message.includes('401')) {
            message = 'Your session has expired. Please log in again.';
            // Could redirect to login here
        } else if (error.message.includes('403')) {
            message = 'You do not have permission to perform this action.';
        } else if (error.message.includes('404')) {
            message = 'The requested resource was not found.';
        } else if (error.message.includes('500')) {
            message = 'Server error. Please contact support if this persists.';
        }
        
        PersonalAI.ui.showToast(message, 'danger');
    }
};

// Performance monitoring
PersonalAI.handlers.performance = {
    init() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            if ('performance' in window) {
                const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                console.log(`Page load time: ${loadTime}ms`);
                
                // Log slow page loads
                if (loadTime > 3000) {
                    console.warn('Slow page load detected');
                }
            }
        });
        
        // Monitor long tasks (if supported)
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) {
                            console.warn('Long task detected:', entry);
                        }
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                // PerformanceObserver not fully supported
            }
        }
    }
};

// Initialize the application
PersonalAI.init = function() {
    console.log('Personal AI Clone application initializing...');
    
    // Initialize all handlers
    PersonalAI.handlers.navigation.init();
    PersonalAI.handlers.forms.init();
    PersonalAI.handlers.errors.init();
    PersonalAI.handlers.performance.init();
    
    // Set current page
    PersonalAI.state.currentPage = window.location.pathname;
    
    // Add global CSS for animations
    this.addGlobalStyles();
    
    console.log('Personal AI Clone application ready');
};

// Add global styles for animations and interactions
PersonalAI.addGlobalStyles = function() {
    const style = document.createElement('style');
    style.textContent = `
        /* Toast animations */
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        /* Mobile navigation */
        .nav-menu.mobile-open {
            display: flex !important;
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid var(--gray-200);
            border-top: none;
            box-shadow: var(--shadow-lg);
            padding: var(--space-4);
            gap: var(--space-2);
        }
        
        /* Form error states */
        .form-input.error,
        .form-textarea.error,
        .form-select.error {
            border-color: var(--danger);
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }
        
        /* Loading overlay content */
        .loading-content {
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            padding: var(--space-6);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
        }
        
        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
            .toast-notification {
                animation: none !important;
            }
        }
        
        /* Focus improvements */
        .btn:focus-visible,
        .form-input:focus-visible,
        .form-textarea:focus-visible,
        .form-select:focus-visible {
            outline: 2px solid var(--primary);
            outline-offset: 2px;
        }
        
        /* Mobile improvements */
        @media (max-width: 768px) {
            .nav-toggle {
                display: block !important;
            }
            
            .nav-menu:not(.mobile-open) {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', PersonalAI.init);
} else {
    PersonalAI.init();
}

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PersonalAI;
}