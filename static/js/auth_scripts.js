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
        this.initializePrivacyModal();
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
        document.getElementById('forgotPasswordForm').addEventListener('submit', (e) => this.handleForgotPassword(e));
        document.getElementById('resetPasswordForm').addEventListener('submit', (e) => this.handleResetPassword(e));

        // Google Sign-In button
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
        }

        // Toggle to forgot password
        document.querySelectorAll('.toggle-to-forgot').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchToForm('forgot');
            });
        });

        // Toggle to login
        document.querySelectorAll('.toggle-to-login').forEach(link => {
            link.addEventListener('click', (e) => {
            e.preventDefault();
                this.switchToForm('login');
            });
        });

        // Check for reset token in URL
        this.checkResetToken();

        // Real-time form validation
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', (e) => this.validateField(e.target));
            input.addEventListener('input', (e) => this.clearFieldError(e.target));
        });

        // Handle Google OAuth callback
        this.handleGoogleCallback();
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
        if (indicator) {
            indicator.classList.remove('signup', 'forgot');
            if (targetForm === 'signup') {
                indicator.classList.add('signup');
            } else if (targetForm === 'forgot') {
                indicator.classList.add('forgot');
            }
        }

        // Switch forms
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        // Map targetForm to actual form ID (some form IDs don't follow the pattern)
        let formId;
        if (targetForm === 'login') {
            formId = 'loginForm';
        } else if (targetForm === 'signup') {
            formId = 'signupForm';
        } else if (targetForm === 'forgot') {
            formId = 'forgotPasswordForm';
        }
        
        const targetFormElement = document.getElementById(formId);
        if (targetFormElement) {
            targetFormElement.classList.add('active');
        }

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
            // For login, show connection error inline (not as notification)
            if (this.currentForm === 'login') {
                this.clearAllErrors();
                const emailField = document.querySelector('#loginEmail');
                if (emailField) {
                    this.showFieldError(emailField, 'Unable to connect to the server. Please check your internet connection and try again.');
                }
            } else {
                // For signup, show notification
            this.showFloatingNotification('error', 'Unable to connect to the server. Please check your internet connection and try again.');
            }
        } finally {
            this.setLoadingState(false);
        }
    }

    async handleSignup(e) {
        e.preventDefault();

        if (this.isLoading) return;

        // Save current step data before submission
        this.saveCurrentStepData();

        // Get privacy acceptance from checkbox
        const termsCheckbox = document.getElementById('agreeTerms');
        const privacyAccepted = termsCheckbox ? termsCheckbox.checked : false;

        // Use signupData from multi-step form
        const data = {
            email: this.signupData.email,
            password: this.signupData.password,
            first_name: this.signupData.first_name,
            last_name: this.signupData.last_name,
            privacy_accepted: privacyAccepted,
            auth_method: 'email',
            theme: 'dark'  // Default theme
        };

        // Validate form
        if (!this.validateForm(data, true)) {
            return;
        }

        this.setLoadingState(true);

        try {            
            const response = await fetch('/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (response.ok) {
                this.showFloatingNotification('success', 'Your account has been created successfully! Redirecting to login...');

                // Reset multi-step form
                this.resetMultiStepSignup();

                // Switch to login form after a short delay
                setTimeout(() => {
                    document.querySelector('[data-form="login"]').click();
                }, 2000);

            } else {
                this.handleAuthError(result);
            }

        } catch (error) {
            this.showFloatingNotification('error', 'Unable to connect to the server. Please check your internet connection and try again.');
        } finally {
            this.setLoadingState(false);
        }
    }

    handleAuthError(result) {
        const errorMessage = result.detail || result.message || 'An unexpected error occurred';
        
        // For signup errors, always show floating notification
        if (this.currentForm === 'signup') {
            this.showFloatingNotification('error', errorMessage);
            return;
        }

        // For login errors, show inline field errors (no notifications)
        if (this.currentForm === 'login') {
            // Clear any existing errors first
            this.clearAllErrors();
            
            // Show error based on message content
            if (errorMessage.toLowerCase().includes('no account found') || 
                errorMessage.toLowerCase().includes('email address')) {
                // Account doesn't exist - show on email field
                const emailField = document.querySelector('#loginEmail');
            if (emailField) {
                this.showFieldError(emailField, errorMessage);
            }
            } else if (errorMessage.toLowerCase().includes('incorrect password') || 
                       errorMessage.toLowerCase().includes('password')) {
                // Wrong password - show on password field
                const passwordField = document.querySelector('#loginPassword');
            if (passwordField) {
                this.showFieldError(passwordField, errorMessage);
            }
        } else {
                // Generic error - show on email field as fallback
                const emailField = document.querySelector('#loginEmail');
                if (emailField) {
                    this.showFieldError(emailField, errorMessage);
                }
            }
            return;
        }
        
        // Fallback for any other form
            this.showFloatingNotification('error', errorMessage);
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
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideFloatingNotification();
        }, 5000);
    }

    hideFloatingNotification() {
        const notification = document.getElementById('floatingNotification');
        if (notification) {
            // Disappear instantly instead of sliding out
                notification.remove(); // Completely remove from DOM
        }
    }

    initializeFloatingNotification() {
        // Notification elements are created dynamically in showFloatingNotification()
        // No initialization needed since elements don't exist in HTML
    }

    removeToast(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            // Remove instantly instead of sliding out
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
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

    // Google OAuth Methods
    handleGoogleLogin() {
        // Redirect to Google OAuth endpoint
        window.location.href = '/auth/google/login';
    }

    handleGoogleCallback() {
        // Check if we're returning from Google OAuth
        const urlParams = new URLSearchParams(window.location.search);
        const googleAuth = urlParams.get('google_auth');
        const token = urlParams.get('token');
        const errorMessage = urlParams.get('message');

        if (googleAuth === 'success' && token) {
            // Store the token
            localStorage.setItem('access_token', token);
            
            // Show success message
            this.showFloatingNotification('success', 'Successfully signed in with Google!');
            
            // Clean URL
            window.history.replaceState({}, document.title, '/');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else if (googleAuth === 'error') {
            // Show error message
            const message = errorMessage ? errorMessage.replace(/\+/g, ' ') : 'Google authentication failed';
            this.showFloatingNotification('error', message);
            
            // Clean URL
            window.history.replaceState({}, document.title, '/');
        }
        
        // Check for Google Auth Privacy flow
        const googleAuthPrivacy = urlParams.get('google_auth_privacy');
        const privacyToken = urlParams.get('token');
        
        if (googleAuthPrivacy === 'true' && privacyToken) {
            // Store token temporarily
            this.googleAuthToken = privacyToken;
            // Show privacy modal for Google OAuth
            this.showPrivacyModal(true);
            // Clean URL
            window.history.replaceState({}, document.title, '/');
        }
    }
    
    // Privacy Modal Methods
    initializePrivacyModal() {
        const modal = document.getElementById('privacyModal');
        const closeBtn = document.getElementById('privacyCloseBtn');
        const showPrivacyLink = document.getElementById('showPrivacyLink');
        
        // Load privacy content once
        this.loadPrivacyContent();
        
        // Show privacy link (for email signup)
        if (showPrivacyLink) {
            showPrivacyLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPrivacyModal(false);
            });
        }
        
        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closePrivacyModal();
            });
        }
        
        // Close on outside click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closePrivacyModal();
                }
            });
        }
    }
    
    loadPrivacyContent() {
        const modalBody = document.querySelector('.privacy-modal-body');
        if (!modalBody) return;
        
        modalBody.innerHTML = `
            <h2>TERMS OF SERVICE</h2>
            
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing and using CBC English Proficiency Coach, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree with any part of these terms, you may not use our services.</p>
            
            <h2>2. Description of Service</h2>
            <p>CBC English Proficiency Coach is an AI-powered educational tool designed to support Primary 3 teachers in Rwanda by providing grammar corrections and competence-based curriculum (CBC) aligned feedback. The service uses machine learning models fine-tuned on educational datasets to help improve English language proficiency.</p>
            
            <h2>3. User Responsibilities</h2>
            <ul>
                <li><strong>Accuracy Review:</strong> You understand that AI-generated grammar corrections and feedback are not guaranteed to be 100% accurate. You agree to review all corrections carefully before applying them in your teaching practice.</li>
                <li><strong>Human Oversight:</strong> You acknowledge that this tool is designed to support, not replace, human judgment and professional expertise. Final decisions regarding instructional content remain your responsibility.</li>
                <li><strong>Appropriate Use:</strong> You agree to use the service only for educational purposes aligned with Rwanda's Competence-Based Curriculum framework.</li>
                <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</li>
            </ul>
            
            <h2>4. AI Model Limitations & Disclaimers</h2>
            <ul>
                <li><strong>Translation Accuracy:</strong> If you use the translation feature (English ↔ Kinyarwanda), you understand that translations may contain errors and should be verified before use in instruction.</li>
                <li><strong>Model Refinement:</strong> This service is in a pilot phase. You acknowledge that the AI model is continuously being improved based on teacher feedback and regional educational contexts.</li>
                <li><strong>No Warranty:</strong> The service is provided "as is" without warranties of any kind, either express or implied, including but not limited to accuracy, completeness, or fitness for a particular purpose.</li>
            </ul>
            
            <h2>5. Intellectual Property</h2>
            <p>All content, features, and functionality of CBC English Proficiency Coach, including but not limited to text, graphics, logos, and software, are owned by the research team and protected by copyright and intellectual property laws.</p>
            
            <h2>6. Teacher Contributions & Data Training</h2>
            <p>If you choose to submit corrected grammar and feedback through the "Submit for Training" feature:</p>
            <ul>
                <li>Your contributions will be used to improve the AI model</li>
                <li>All submissions are fully anonymized and cannot be traced back to you</li>
                <li>You grant us a non-exclusive, royalty-free license to use your contributions for model training and research purposes</li>
                <li>Your contributions help build region-specific training data that reflects Rwanda's educational context</li>
            </ul>
            
            <h2>7. Service Availability</h2>
            <p>We strive to maintain continuous service availability but do not guarantee uninterrupted access. We reserve the right to modify, suspend, or discontinue the service at any time without prior notice.</p>
            
            <h2>8. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, CBC English Proficiency Coach and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service.</p>
            
            <h2>9. Governing Law</h2>
            <p>These Terms of Service shall be governed by and construed in accordance with the laws of the Republic of Rwanda. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of Rwandan courts.</p>
            
            <h2>10. Contact Information</h2>
            <p>For questions about these Terms of Service, please contact: support@cbccoach.rw</p>
            
            <hr style="margin: 2rem 0; border: 1px solid #e0e0e0;">
            
            <h2>PRIVACY POLICY</h2>
            
            <h2>1. Information We Collect</h2>
            <p>We collect the following information when you use CBC English Proficiency Coach:</p>
            <ul>
                <li><strong>Account Information:</strong> Your name, email address, and profile picture (if you sign in with Google)</li>
                <li><strong>Content Data:</strong> Documents you create, text you write, and grammar feedback you receive</li>
            </ul>
            
            <h2>2. How We Use Your Information</h2>
            <p>Your information is used to:</p>
            <ul>
                <li>Provide grammar checking and feedback services</li>
                <li>Store and manage your documents</li>
                <li>Improve our AI models with anonymized data</li>
                <li>Communicate important updates about the service</li>
            </ul>
            
            <h2>3. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data. Your documents and personal information are encrypted and stored securely.</p>
            
            <h2>4. Data Sharing</h2>
            <p>We do not sell your personal information. We may share anonymized, aggregated data for research purposes to improve English education in Rwanda.</p>
            
            <h2>5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
                <li>Access your personal data</li>
                <li>Request deletion of your account and data</li>
                <li>Opt-out of data usage for AI training</li>
            </ul>
            
            <h2>7. Contact</h2>
            <p>For privacy concerns, contact us at: obolo.emmanuel31052000@gmail.com</p>
            
            <h2>8. Updates</h2>
            <p>We may update this policy and will notify you of significant changes. Last updated: November 2025</p>
        `;
    }
    
    showPrivacyModal(isGoogleAuth = false) {
        const modal = document.getElementById('privacyModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent background scroll
            
            // If Google Auth, user must accept (can't close)
            if (isGoogleAuth) {
                this.isGoogleAuthPrivacy = true;
                // Add accept button to modal after a short delay to ensure content is rendered
                setTimeout(() => {
                    this.addPrivacyAcceptButton();
                }, 100);
            } else {
                this.isGoogleAuthPrivacy = false;
            }
        }
    }
    
    closePrivacyModal() {
        // For Google Auth, user must accept - can't just close
        if (this.isGoogleAuthPrivacy) {
            this.showFloatingNotification('warning', 'You must accept the privacy terms to continue with Google sign-in.');
            return;
        }
        
        const modal = document.getElementById('privacyModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scroll
        }
    }
    
    addPrivacyAcceptButton() {
        const modalBody = document.querySelector('.privacy-modal-body');
        
        if (!modalBody) {
            return;
        }
        
        // Check if button already exists
        if (document.getElementById('googleAcceptPrivacyBtn')) {
            return;
        }
        
        // Add acceptance UI
        const acceptHTML = `
            <div style="margin-top: 2rem; padding-top: 2rem; border-top: 2px solid #e0e0e0;">
                <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem;">
                    <input type="checkbox" id="googlePrivacyCheckbox" style="width: 20px; height: 20px; cursor: pointer; margin-top: 2px; accent-color: var(--primary-color);">
                    <label for="googlePrivacyCheckbox" style="cursor: pointer; font-size: 1rem; color: #000000;">
                        I have read and accept the Terms of Service & Privacy Policy
                    </label>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button id="googleAcceptPrivacyBtn" class="auth-btn" disabled style="opacity: 0.5; flex: 1;">
                        Accept & Continue to Dashboard
                    </button>
                    <button id="googleDeclinePrivacyBtn" class="auth-btn" style="background: #dc3545; flex: 1;">
                        Decline
                    </button>
                </div>
            </div>
        `;
        
        modalBody.insertAdjacentHTML('beforeend', acceptHTML);
        
        // Add event listeners
        const checkbox = document.getElementById('googlePrivacyCheckbox');
        const acceptBtn = document.getElementById('googleAcceptPrivacyBtn');
        const declineBtn = document.getElementById('googleDeclinePrivacyBtn');
        
        if (checkbox && acceptBtn) {
            checkbox.addEventListener('change', () => {
                acceptBtn.disabled = !checkbox.checked;
                acceptBtn.style.opacity = checkbox.checked ? '1' : '0.5';
            });
            
            acceptBtn.addEventListener('click', () => this.handleGooglePrivacyAccept());
        }
        
        if (declineBtn) {
            declineBtn.addEventListener('click', () => this.handleGooglePrivacyDecline());
        }
    }
    
    handleGooglePrivacyDecline() {
        // Clear token and redirect back to auth page
        this.googleAuthToken = null;
        this.isGoogleAuthPrivacy = false;
        localStorage.removeItem('access_token');
        
        this.showFloatingNotification('info', 'You must accept the privacy terms to use Google sign-in. You can use email/password instead.');
        
        const modal = document.getElementById('privacyModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
        
        // Redirect to home/auth page
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }
    
    async handleGooglePrivacyAccept() {
        if (!this.googleAuthToken) {
            this.showFloatingNotification('error', 'Session expired. Please try signing in again.');
            this.closePrivacyModal();
            return;
        }
        
        const acceptBtn = document.getElementById('googleAcceptPrivacyBtn');
        if (acceptBtn) {
            acceptBtn.disabled = true;
            acceptBtn.textContent = 'Processing...';
        }
        
        try {
            const response = await fetch('/auth/accept-privacy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.googleAuthToken}`
                },
                body: JSON.stringify({ accepted: true })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to accept privacy terms');
            }
            
            const data = await response.json();
            
            // Store token and redirect
            localStorage.setItem('access_token', this.googleAuthToken);
            this.showFloatingNotification('success', 'Welcome! Redirecting to dashboard...');
            
            setTimeout(() => {
                window.location.href = data.redirect_url || '/dashboard';
            }, 1000);
            
        } catch (error) {
            this.showFloatingNotification('error', `Failed to accept privacy terms: ${error.message}`);
            
            if (acceptBtn) {
                acceptBtn.disabled = false;
                acceptBtn.textContent = 'Accept & Continue to Dashboard';
            }
            
            // Redirect to login after 3 seconds on error
            setTimeout(() => {
                localStorage.removeItem('access_token');
                this.closePrivacyModal();
                this.isGoogleAuthPrivacy = false;
                window.location.href = '/';
            }, 3000);
        }
    }

    // Forgot Password Methods
    switchToForm(formName) {
        // For 'reset' form, activate "Forgot Password" toggle but show reset form
        if (formName === 'reset') {
            this.currentForm = 'forgot'; // Set to forgot so indicator moves correctly
            
            // Activate "Forgot Password" button
            document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
            const forgotBtn = document.querySelector('[data-form="forgot"]');
            if (forgotBtn) {
                forgotBtn.classList.add('active');
            }
            
            // Move indicator to forgot position
            const indicator = document.querySelector('.toggle-indicator');
            if (indicator) {
                indicator.classList.remove('signup');
                indicator.classList.add('forgot');
            }
            
            // Hide all forms and show reset form
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            const resetForm = document.getElementById('resetPasswordForm');
            if (resetForm) {
                resetForm.classList.add('active');
            }
            return;
        }
        
        // For other forms, click the toggle button
        const toggleBtn = document.querySelector(`[data-form="${formName}"]`);
        if (toggleBtn) {
            toggleBtn.click();
        }
    }

    checkResetToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            // Show reset password form
            this.switchToForm('reset');
            // Store token for form submission
            const resetForm = document.getElementById('resetPasswordForm');
            if (resetForm) {
                resetForm.dataset.token = token;
            }
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        if (this.isLoading) return;

        const formData = new FormData(e.target);
        const email = formData.get('email').trim();

        if (!email || !this.validationRules.email.pattern.test(email)) {
            const emailField = document.getElementById('forgotEmail');
            this.showFieldError(emailField, 'Please enter a valid email address');
            return;
        }

        this.setLoadingState(true);

        try {
            const response = await fetch('/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (response.ok) {
                this.showFloatingNotification('success', 'Password reset link sent! Check your email.');
                // Clear form
                e.target.reset();
                // Switch back to login after 3 seconds
                setTimeout(() => {
                    this.switchToForm('login');
                }, 3000);
            } else {
                this.showFloatingNotification('error', result.detail || 'Failed to send reset link');
            }
        } catch (error) {
            this.showFloatingNotification('error', 'Unable to connect. Please try again.');
        } finally {
            this.setLoadingState(false);
        }
    }

    async handleResetPassword(e) {
        e.preventDefault();
        if (this.isLoading) return;

        const token = e.target.dataset.token;
        const formData = new FormData(e.target);
        const newPassword = formData.get('new_password');
        const confirmPassword = formData.get('confirm_password');

        // Validate passwords
        if (newPassword.length < 8) {
            const passwordField = document.getElementById('resetNewPassword');
            this.showFieldError(passwordField, 'Password must be at least 8 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            const confirmField = document.getElementById('resetConfirmPassword');
            this.showFieldError(confirmField, 'Passwords do not match');
            return;
        }

        if (!token) {
            this.showFloatingNotification('error', 'Invalid reset token. Please request a new reset link.');
            this.switchToForm('forgot');
            return;
        }

        this.setLoadingState(true);

        try {
            const response = await fetch('/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: token,
                    new_password: newPassword
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.showFloatingNotification('success', 'Password reset successful! Redirecting to login...');
                // Clear URL params
                window.history.replaceState({}, document.title, window.location.pathname);
                // Switch to login after 2 seconds
                setTimeout(() => {
                    this.switchToForm('login');
                }, 2000);
            } else {
                this.showFloatingNotification('error', result.detail || 'Failed to reset password');
                // If token expired, switch to forgot form
                if (result.detail && result.detail.includes('expired')) {
                    setTimeout(() => {
                        this.switchToForm('forgot');
                    }, 2000);
                }
            }
        } catch (error) {
            this.showFloatingNotification('error', 'Unable to connect. Please try again.');
        } finally {
            this.setLoadingState(false);
        }
    }
}

/* slideOutRight animation removed - toasts now disappear instantly */

// Initialize the authentication form when DOM is loaded
let authForm;
document.addEventListener('DOMContentLoaded', () => {
    authForm = new AuthenticationForm();
    authForm.loadRememberedEmail();
});
