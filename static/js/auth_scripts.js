// Authentication Form Handler - All test notifications completely removed - v2.0
class AuthenticationForm {
    constructor() {
        this.currentForm = 'login';
        this.isLoading = false;
        this.currentStep = 1;
        this.totalSteps = 3;
        this.signupData = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializePasswordToggles();
        this.initializePasswordStrength();
        this.initializeFormValidation();
        this.initializeFloatingNotification();
        this.initializeMultiStepSignup();
    }

    bindEvents() {
        // Form toggle buttons
        const toggleButtons = document.querySelectorAll('.toggle-btn');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFormToggle(e));
        });

        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupForm').addEventListener('submit', (e) => this.handleSignup(e));

        // Social login buttons
        const socialButtons = document.querySelectorAll('.social-btn');
        socialButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleSocialLogin(e));
        });

        // Forgot password link
        document.querySelector('.forgot-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showFloatingNotification('info', 'Password reset functionality will be implemented soon.');
        });

        // Real-time form validation
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', (e) => this.validateField(e.target));
            input.addEventListener('input', (e) => this.clearFieldError(e.target));
        });
    }

    handleFormToggle(e) {
        e.preventDefault();
        const targetForm = e.currentTarget.dataset.form;

        if (targetForm === this.currentForm) return;

        this.currentForm = targetForm;

        // Update toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Update indicator position
        const indicator = document.querySelector('.toggle-indicator');
        indicator.classList.toggle('signup', targetForm === 'signup');

        // Switch forms
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(`${targetForm}Form`).classList.add('active');

        // Reset multi-step signup if switching to signup
        if (targetForm === 'signup') {
            this.resetMultiStepSignup();
        }

        // Clear any existing errors
        this.clearAllErrors();
    }

    initializePasswordToggles() {
        const toggleButtons = document.querySelectorAll('.password-toggle');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                const icon = btn.querySelector('i');

                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    initializePasswordStrength() {
        const signupPassword = document.getElementById('signupPassword');
        if (signupPassword) {
            signupPassword.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }
    }

    updatePasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');

        let score = 0;
        let feedback = '';

        if (password.length >= 8) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^a-zA-Z0-9]/.test(password)) score += 1;

        const percentage = (score / 5) * 100;
        strengthBar.style.width = `${percentage}%`;

        switch (score) {
            case 0:
            case 1:
                strengthBar.style.background = '#f56565';
                feedback = 'Very weak';
                break;
            case 2:
                strengthBar.style.background = '#ed8936';
                feedback = 'Weak';
                break;
            case 3:
                strengthBar.style.background = '#ecc94b';
                feedback = 'Fair';
                break;
            case 4:
                strengthBar.style.background = '#48bb78';
                feedback = 'Strong';
                break;
            case 5:
                strengthBar.style.background = '#38a169';
                feedback = 'Very strong';
                break;
        }

        strengthText.textContent = password ? `Password strength: ${feedback}` : 'Password strength';
    }

    initializeFormValidation() {
        // Add custom validation rules
        this.validationRules = {
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
            },
            password: {
                required: true,
                minLength: 8,
                message: 'Password must be at least 8 characters long'
            },
            first_name: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-Z\s]+$/,
                message: 'First name must contain only letters and spaces'
            },
            last_name: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-Z\s]+$/,
                message: 'Last name must contain only letters and spaces'
            }
        };
    }

    validateField(field) {
        const fieldName = field.name;
        const value = field.value.trim();
        const rules = this.validationRules[fieldName];

        if (!rules) return true;

        // Clear previous error
        this.clearFieldError(field);

        // Required validation
        if (rules.required && !value) {
            this.showFieldError(field, `${this.formatFieldName(fieldName)} is required`);
            return false;
        }

        if (!value) return true; // Skip other validations if field is empty and not required

        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
            this.showFieldError(field, rules.message);
            return false;
        }

        // Length validation
        if (rules.minLength && value.length < rules.minLength) {
            this.showFieldError(field, `${this.formatFieldName(fieldName)} must be at least ${rules.minLength} characters long`);
            return false;
        }

        return true;
    }

    formatFieldName(fieldName) {
        return fieldName.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    showFieldError(field, message) {
        field.classList.add('error');
        const errorElement = document.getElementById(`${field.id}Error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorElement = document.getElementById(`${field.id}Error`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }
    }

    clearAllErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.textContent = '';
            element.classList.remove('show');
        });

        const errorInputs = document.querySelectorAll('input.error');
        errorInputs.forEach(input => input.classList.remove('error'));
    }

    validateForm(formData, isSignup = false) {
        let isValid = true;
        const errors = {};

        // Email validation
        if (!formData.email || !this.validationRules.email.pattern.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
            isValid = false;
        }

        // Password validation
        if (!formData.password || formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters long';
            isValid = false;
        }

        if (isSignup) {
            // Name validations
            if (!formData.first_name || formData.first_name.length < 2) {
                errors.first_name = 'First name must be at least 2 characters long';
                isValid = false;
            }

            if (!formData.last_name || formData.last_name.length < 2) {
                errors.last_name = 'Last name must be at least 2 characters long';
                isValid = false;
            }

            // Terms acceptance
            const termsCheckbox = document.getElementById('agreeTerms');
            if (!termsCheckbox.checked) {
                this.showFloatingNotification('error', 'Please accept the Terms of Service and Privacy Policy to continue.');
                isValid = false;
            }
        }

        // Display errors
        Object.keys(errors).forEach(fieldName => {
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (field) {
                this.showFieldError(field, errors[fieldName]);
            }
        });

        return isValid;
    }

    async handleLogin(e) {
        e.preventDefault();
        if (this.isLoading) return;
        const formData = new FormData(e.target);
        const data = {
            email: formData.get('email').trim(),
            password: formData.get('password')
        };

        if (!this.validateForm(data, false)) {
            return;
        }

        this.setLoadingState(true);

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                // Store the JWT token
                localStorage.setItem('access_token', result.access_token);
                
                // Remember email if checkbox is checked
                const rememberCheckbox = document.getElementById('rememberMe');
                if (rememberCheckbox && rememberCheckbox.checked) {
                    localStorage.setItem('rememberedEmail', data.email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }

                this.showFloatingNotification('success', 'Welcome back! Redirecting to your dashboard...');
                setTimeout(() => {
                    window.location.href = result.redirect_url || '/dashboard';
                }, 1500);
            } else {
                this.handleAuthError(result);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showFloatingNotification('error', 'Unable to connect to the server. Please check your internet connection and try again.');
        } finally {
            this.setLoadingState(false);
        }
    }

    async handleSignup(e) {
        e.preventDefault();

        if (this.isLoading) return;

        // Save current step data before submission
        this.saveCurrentStepData();

        // Use signupData from multi-step form
        const data = {
            email: this.signupData.email,
            password: this.signupData.password,
            first_name: this.signupData.first_name,
            last_name: this.signupData.last_name
        };

        // Validate form
        if (!this.validateForm(data, true)) {
            return;
        }

        this.setLoadingState(true);

        try {
            console.log('Sending signup request with data:', data); // Debug log
            
            const response = await fetch('/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            console.log('Signup response status:', response.status); // Debug log
            
            const result = await response.json();
            console.log('Signup response result:', result); // Debug log

            if (response.ok) {
                console.log('Signup successful, showing success notification'); // Debug log
                this.showFloatingNotification('success', 'Your account has been created successfully! Redirecting to login...');

                // Reset multi-step form
                this.resetMultiStepSignup();

                // Switch to login form after a short delay
                setTimeout(() => {
                    document.querySelector('[data-form="login"]').click();
                }, 2000);

            } else {
                console.log('Signup failed, handling error'); // Debug log
                console.log('Error result structure:', JSON.stringify(result, null, 2)); // Debug log
                this.handleAuthError(result);
            }

        } catch (error) {
            console.error('Signup error:', error);
            this.showFloatingNotification('error', 'Unable to connect to the server. Please check your internet connection and try again.');
        } finally {
            this.setLoadingState(false);
        }
    }

    handleAuthError(result) {
        const errorMessage = result.detail || result.message || 'An unexpected error occurred';
        
        console.log('Handling auth error:', result, errorMessage); // Debug log

        // For signup errors, always show floating notification
        if (this.currentForm === 'signup') {
            this.showFloatingNotification('error', errorMessage);
            return;
        }

        // For login errors, handle specific field errors
        if (errorMessage.toLowerCase().includes('email')) {
            const emailField = document.querySelector(`#${this.currentForm}Email`);
            if (emailField) {
                this.showFieldError(emailField, errorMessage);
            }
        } else if (errorMessage.toLowerCase().includes('password')) {
            const passwordField = document.querySelector(`#${this.currentForm}Password`);
            if (passwordField) {
                this.showFieldError(passwordField, errorMessage);
            }
        } else {
            this.showFloatingNotification('error', errorMessage);
        }
    }

    handleSocialLogin(e) {
        e.preventDefault();
        const provider = e.currentTarget.classList.contains('google') ? 'google' : 'microsoft';

        this.showFloatingNotification('info', `${provider.charAt(0).toUpperCase() + provider.slice(1)} login will be available soon.`);
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        const submitButton = document.querySelector('.auth-form.active .auth-btn') || document.getElementById('createAccountBtn');
        const loadingOverlay = document.getElementById('loadingOverlay');

        if (loading) {
            if (submitButton) submitButton.classList.add('loading');
            loadingOverlay.classList.add('show');
        } else {
            if (submitButton) submitButton.classList.remove('loading');
            loadingOverlay.classList.remove('show');
        }
    }

    showFloatingNotification(type, message) {
        console.log('Showing notification:', type, message); // Debug log
        
        // Always create fresh notification elements
        let notification = document.getElementById('floatingNotification');
        if (notification) {
            notification.remove(); // Remove existing notification
        }

        // Create new notification container
        notification = document.createElement('div');
        notification.id = 'floatingNotification';
        notification.className = `floating-notification ${type}`;
        
        // Create message element
        const notificationMessage = document.createElement('span');
        notificationMessage.id = 'notificationMessage';
        notificationMessage.textContent = message;
        
        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Close button clicked'); // Debug log
            this.hideFloatingNotification();
        });
        
        // Append elements to notification
        notification.appendChild(notificationMessage);
        notification.appendChild(closeBtn);
        
        // Append to body
        document.body.appendChild(notification);
        
        // Force visibility
        notification.style.display = 'block';
        notification.style.visibility = 'visible';
        notification.style.opacity = '1';
        
        console.log('Notification created with message:', notificationMessage.textContent); // Debug log
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideFloatingNotification();
        }, 5000);
    }

    hideFloatingNotification() {
        const notification = document.getElementById('floatingNotification');
        if (notification) {
            console.log('Hiding notification'); // Debug log
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                notification.remove(); // Completely remove from DOM
            }, 300);
        }
    }

    initializeFloatingNotification() {
        // Notification elements are created dynamically in showFloatingNotification()
        // No initialization needed since elements don't exist in HTML
    }

    removeToast(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    // Initialize remembered email on page load
    loadRememberedEmail() {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            const emailInput = document.getElementById('loginEmail');
            const rememberCheckbox = document.getElementById('rememberMe');

            if (emailInput) {
                emailInput.value = rememberedEmail;
            }
            if (rememberCheckbox) {
                rememberCheckbox.checked = true;
            }
        }
    }

    // Multi-step signup methods
    initializeMultiStepSignup() {
        // Bind step navigation buttons
        const nextStepBtn = document.getElementById('nextStepBtn');
        const prevStepBtn = document.getElementById('prevStepBtn');
        const createAccountBtn = document.getElementById('createAccountBtn');

        if (nextStepBtn) {
            nextStepBtn.addEventListener('click', () => this.nextStep());
        }
        if (prevStepBtn) {
            prevStepBtn.addEventListener('click', () => this.prevStep());
        }
        if (createAccountBtn) {
            createAccountBtn.addEventListener('click', (e) => this.handleSignup(e));
        }

        // Bind step indicator clicks for navigation
        const stepItems = document.querySelectorAll('.step-item');
        stepItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                const targetStep = parseInt(item.dataset.step);
                if (targetStep <= this.currentStep || this.isStepCompleted(targetStep - 1)) {
                    this.goToStep(targetStep);
                }
            });
        });

        // Initialize first step
        this.updateStepDisplay();
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.saveCurrentStepData();
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.updateStepDisplay();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    goToStep(stepNumber) {
        if (stepNumber >= 1 && stepNumber <= this.totalSteps) {
            this.currentStep = stepNumber;
            this.updateStepDisplay();
        }
    }

    validateCurrentStep() {
        const currentStepElement = document.querySelector(`.signup-step[data-step="${this.currentStep}"]`);
        if (!currentStepElement) return false;

        let isValid = true;
        const inputs = currentStepElement.querySelectorAll('input[required]');

        // Clear previous errors for this step
        this.clearStepErrors(this.currentStep);

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        // Special validation for step 3 (terms)
        if (this.currentStep === 3) {
            const termsCheckbox = document.getElementById('agreeTerms');
            if (!termsCheckbox || !termsCheckbox.checked) {
                this.showFloatingNotification('error', 'Please accept the Terms of Service and Privacy Policy to continue.');
                isValid = false;
            }
        }

        return isValid;
    }

    saveCurrentStepData() {
        const currentStepElement = document.querySelector(`.signup-step[data-step="${this.currentStep}"]`);
        if (!currentStepElement) return;

        const inputs = currentStepElement.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                this.signupData[input.name] = input.checked;
            } else {
                this.signupData[input.name] = input.value.trim();
            }
        });
    }

    updateStepDisplay() {
        // Update step indicators
        const stepItems = document.querySelectorAll('.step-item');
        stepItems.forEach((item, index) => {
            const stepNumber = parseInt(item.dataset.step);
            item.classList.remove('active', 'completed');
            
            if (stepNumber < this.currentStep) {
                item.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                item.classList.add('active');
            }
        });

        // Show/hide steps
        const steps = document.querySelectorAll('.signup-step');
        steps.forEach(step => {
            step.classList.remove('active');
            if (parseInt(step.dataset.step) === this.currentStep) {
                step.classList.add('active');
            }
        });

        // Update navigation buttons
        const prevStepBtn = document.getElementById('prevStepBtn');
        const nextStepBtn = document.getElementById('nextStepBtn');
        const createAccountBtn = document.getElementById('createAccountBtn');

        if (prevStepBtn) {
            prevStepBtn.style.display = this.currentStep > 1 ? 'flex' : 'none';
        }

        if (nextStepBtn && createAccountBtn) {
            if (this.currentStep < this.totalSteps) {
                nextStepBtn.style.display = 'flex';
                createAccountBtn.style.display = 'none';
            } else {
                nextStepBtn.style.display = 'none';
                createAccountBtn.style.display = 'flex';
            }
        }

        // Clear any errors when changing steps
        this.clearAllErrors();
    }

    clearStepErrors(stepNumber) {
        const stepElement = document.querySelector(`.signup-step[data-step="${stepNumber}"]`);
        if (!stepElement) return;

        const errorElements = stepElement.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.textContent = '';
            element.classList.remove('show');
        });

        const errorInputs = stepElement.querySelectorAll('input.error');
        errorInputs.forEach(input => input.classList.remove('error'));
    }

    isStepCompleted(stepNumber) {
        // Check if a step has been completed by validating its data
        if (stepNumber === 1) {
            return this.signupData.first_name && this.signupData.last_name;
        } else if (stepNumber === 2) {
            return this.signupData.email && this.signupData.password;
        } else if (stepNumber === 3) {
            return this.signupData.terms === true;
        }
        return false;
    }

    resetMultiStepSignup() {
        this.currentStep = 1;
        this.signupData = {};
        
        // Reset step indicators
        const stepItems = document.querySelectorAll('.step-item');
        stepItems.forEach((item, index) => {
            item.classList.remove('active', 'completed');
            if (index === 0) {
                item.classList.add('active');
            }
        });

        // Show first step
        const steps = document.querySelectorAll('.signup-step');
        steps.forEach((step, index) => {
            step.classList.remove('active');
            if (index === 0) {
                step.classList.add('active');
            }
        });

        // Reset navigation buttons
        const prevStepBtn = document.getElementById('prevStepBtn');
        const nextStepBtn = document.getElementById('nextStepBtn');
        const createAccountBtn = document.getElementById('createAccountBtn');

        if (prevStepBtn) prevStepBtn.style.display = 'none';
        if (nextStepBtn) nextStepBtn.style.display = 'flex';
        if (createAccountBtn) createAccountBtn.style.display = 'none';

        // Clear form data
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.reset();
        }

        // Clear password strength indicator
        this.updatePasswordStrength('');
    }
}

// CSS animation for toast removal
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Initialize the authentication form when DOM is loaded
let authForm;
document.addEventListener('DOMContentLoaded', () => {
    authForm = new AuthenticationForm();
    authForm.loadRememberedEmail();
});

// Global error handler for uncaught errors
// window.addEventListener('error', (e) => {
//     console.error('Uncaught error:', e.error);
//     if (authForm) {
//         authForm.showFloatingNotification('error', 'An unexpected error occurred. Please refresh the page and try again.');
//     }
// });

// Handle network errors
// window.addEventListener('online', () => {
//     if (authForm) {
//         authForm.showFloatingNotification('success', 'Your internet connection has been restored.');
//     }
// });

// window.addEventListener('offline', () => {
//     if (authForm) {
//         authForm.showFloatingNotification('warning', 'You are currently offline. Please check your internet connection.');
//     }
// });