// Cache-busting comment - v2.0 - Professional Fortune 500 Dashboard
class DocumentManager {
    constructor() {
        // New CBC CoachLM style elements
        this.uploadModal = document.getElementById('uploadModal');
        this.uploadModalClose = document.getElementById('uploadModalClose');
        this.cancelUploadBtn = document.getElementById('cancelUploadBtn');
        this.uploadDocumentBtn = document.getElementById('uploadDocumentBtn');
        
        // Existing elements
        this.form = document.getElementById('documentUploadForm');
        this.fileInput = document.getElementById('documentFile');
        this.feedbackDiv = document.getElementById('uploadFeedback');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.quillEditor = null;
        this.currentDocument = null;
        this.autoSaveTimeout = null;
        this.lastSavedContent = '';
        this.documentChunks = [];
        
        // New view and sorting elements
        this.currentView = 'grid'; // 'grid' or 'list'
        this.currentSort = 'recent'; // 'recent', 'title', 'size', 'modified'
        this.sortBtn = document.getElementById('sortBtn');
        this.sortDropdown = document.getElementById('sortDropdown');
        this.sortText = document.getElementById('sortText');
        
        // Settings and theme elements
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsDropdown = document.getElementById('settingsDropdown');
        this.themeOption = document.getElementById('themeOption');
        this.themeDropdown = document.getElementById('themeDropdown');
        this.logoutOption = document.getElementById('logoutOption');
        this.userAvatar = document.getElementById('userAvatar');
        this.userInitials = document.getElementById('userInitials');
        this.selectedChunk = null;
        this.lastSplitContent = '';
        this.chunkingTimeout = null; // For debouncing chunking requests
        this.isProcessingFeedback = false; // Flag to prevent multiple feedback requests
        this.isTranslationInProgress = false; // Flag to prevent multiple translation requests
        this.notificationTimeout = null; // For managing notification timing
        this.notificationQueue = []; // For queuing notifications to prevent overlap
        
        // Initialize right panel state
        this.currentFeedbackChunk = null;
        this.originalOriginalText = '';
        this.originalCorrectedText = '';
        this.originalFeedbackText = '';
        this.translationState = 'english'; // 'english' or 'kinyarwanda'
        
        this.init();
    }

    async init() {
        // Check for authentication
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        // Initialize WebSocket client
        this.initializeWebSocket();

        this.bindEvents();
        this.initializeFeedbackModal();
        this.initializeTeacherCorrectionForm();
        this.initializeFileManagement();
        this.initializeModals();
        this.initializeViewToggle();
        this.initializeRightPanelState();
        // Note: loadDocuments() will be called manually after user data is loaded
        
        // Initialize Lucide icons after DOM is ready
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({
                icons: lucide.icons
            });
        }
    }

    initializeWebSocket() {
        // Get user ID from token
        try {
            const token = localStorage.getItem('access_token');
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.user_id;
            
            // Initialize WebSocket client
            if (window.websocketClient) {
                window.websocketClient.connect(userId);
            }
        } catch (error) {
            this.showFloatingNotification('error', 'Failed to establish real-time connection');
        }
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleFileUpload(e));
        this.fileInput.addEventListener('change', () => this.validateFile());
        
        // Editor button events
        const closeEditorBtn = document.getElementById('closeEditorBtn');
        const saveDocumentBtn = document.getElementById('saveDocumentBtn');
        
        if (closeEditorBtn) {
            closeEditorBtn.addEventListener('click', () =>{
                 this.closeEditor();
                 const documentUpElement = document.getElementById('DocumentUp');
                 const createNewDocumentHeroElement = document.getElementById('createNewDocumentHero');
                 if (documentUpElement) {
                     documentUpElement.style.display = 'block';
                 }
                 if (createNewDocumentHeroElement) {
                     createNewDocumentHeroElement.style.display = 'block';
                 }
            });
        }
        
        if (saveDocumentBtn) {
            saveDocumentBtn.addEventListener('click', () => this.saveDocument());
        }

        // Logout button (now in settings dropdown)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // New CBC CoachLM style events
        this.bindNewInterfaceEvents();

        // File drag and drop
        this.initializeDragAndDrop();
    }
    
    bindNewInterfaceEvents() {
        // Upload modal events
        if (this.uploadDocumentBtn) {
            this.uploadDocumentBtn.addEventListener('click', () => this.showUploadModal());
        }
        
        if (this.uploadModalClose) {
            this.uploadModalClose.addEventListener('click', () => this.hideUploadModal());
        }
        
        if (this.cancelUploadBtn) {
            this.cancelUploadBtn.addEventListener('click', () => this.hideUploadModal());
        }
        
        // View toggle events
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Get the view from the button element, not the clicked target
                const view = btn.dataset.view;
                this.toggleView(view);
            });
        });
        
        // Sort dropdown events
        if (this.sortBtn) {
            this.sortBtn.addEventListener('click', () => this.toggleSortDropdown());
        }
        
        document.querySelectorAll('#sortDropdown .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => this.selectSort(e.target.dataset.sort));
        });
        
        // Settings dropdown events
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.toggleSettingsDropdown());
        }
        
        if (this.themeOption) {
            this.themeOption.addEventListener('click', () => this.toggleThemeDropdown());
        }
        
        document.querySelectorAll('#themeDropdown .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const theme = e.currentTarget.dataset.theme;
                this.selectTheme(theme);
            });
        });
        
        if (this.logoutOption) {
            this.logoutOption.addEventListener('click', () => this.logout());
        }
        
        // Profile modal events
        const profileOption = document.getElementById('profileOption');
        if (profileOption) {
            profileOption.addEventListener('click', () => this.showProfileModal());
        }
        
        const settingsModal = document.getElementById('settingsModal');
        const settingsCloseBtn = document.getElementById('settingsCloseBtn');
        const settingsSaveBtn = document.getElementById('settingsSaveBtn');
        
        if (settingsCloseBtn) {
            settingsCloseBtn.addEventListener('click', () => this.hideProfileModal());
        }
        
        if (settingsSaveBtn) {
            settingsSaveBtn.addEventListener('click', () => this.saveProfile());
        }
        
        // Close modal when clicking outside
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    this.hideProfileModal();
                }
            });
        }
        
        // Edit icons - use event delegation since Lucide icons are dynamically created
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-icon-wrapper')) {
                const iconWrapper = e.target.closest('.edit-icon-wrapper');
                const field = iconWrapper.dataset.edit;
                if (field) {
                    this.enableFieldEdit(field);
                }
            }
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
    }

    initializeDragAndDrop() {
        const uploadArea = document.querySelector('.upload-area');
        if (!uploadArea) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.add('drag-highlight'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('drag-highlight'), false);
        });

        uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            this.fileInput.files = files;
            this.validateFile();
        }
    }

    logout() {
        localStorage.removeItem('access_token');
        window.location.href = '/';
    }

    validateFile(isUploading = false) {
        const file = this.fileInput.files[0];
        if (file) {
            // Check file size (1MB limit)
            if (file.size > 1024 * 1024) {
                this.showFloatingNotification('error', 'File size must be less than 1MB');
                this.fileInput.value = '';
                this.hideFilePreview();
                return false;
            }
            
            // Strict validation for text files
            const validTypes = ['text/plain'];
            if (!validTypes.includes(file.type) || !file.name.toLowerCase().endsWith('.txt')) {
                this.showFloatingNotification('error', 
                    'Only plain text (.txt) files are allowed. For other formats, please save as .txt first.');
                this.fileInput.value = '';
                this.hideFilePreview();
                return false;
            }
            
            // File is valid, show preview
            this.showFilePreview(file);
            
            // Only show "file selected" notification if not uploading
            if (!isUploading) {
            this.showFloatingNotification('success', `File "${file.name}" selected and ready for upload`);
            }
            
            return true;
        }
        this.hideFilePreview();
        return false;
    }

    async showFilePreview(file) {
        try {
            // Read file content for preview
            const text = await this.readFileAsText(file);
            const preview = text.length > 50 ? text.substring(0, 50) + '...' : text;
            
            // Get or create file preview container
            let previewContainer = document.getElementById('filePreviewContainer');
            if (!previewContainer) {
                previewContainer = document.createElement('div');
                previewContainer.id = 'filePreviewContainer';
                previewContainer.className = 'file-preview-container';
                
                // Insert before the modal footer in the upload form
                const uploadForm = document.getElementById('documentUploadForm');
                const modalFooter = uploadForm.querySelector('.modal-footer');
                if (modalFooter && uploadForm) {
                    uploadForm.insertBefore(previewContainer, modalFooter);
                }
            }
            
            previewContainer.innerHTML = `
                <div class="file-preview">
                    <div class="preview-header">
                        <div class="file-info">
                            <i data-lucide="file-text"></i>
                            <div class="file-details">
                                <h4>${this.escapeHtml(file.name)}</h4>
                                <p>${(file.size / 1024).toFixed(1)} KB • Ready for upload</p>
                            </div>
                        </div>
                        <button id="clearFileBtn" class="btn-clear-file" title="Remove file">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <div class="preview-content">
                        <h5>Content Preview:</h5>
                        <div class="content-preview">
                            <pre>${this.escapeHtml(preview)}</pre>
                        </div>
                    </div>
                </div>
            `;
            
            // Show the preview container
            previewContainer.style.display = 'block';
            
            // Add clear file button event
            const clearBtn = document.getElementById('clearFileBtn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.fileInput.value = '';
                    this.hideFilePreview();
                    this.showFloatingNotification('info', 'File selection cleared');
                });
            }
            
            // Refresh Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ icons: lucide.icons });
            }
            
        } catch (error) {
            this.showFloatingNotification('error', 'Could not preview file content');
        }
    }

    hideFilePreview() {
        const previewContainer = document.getElementById('filePreviewContainer');
        if (previewContainer) {
            previewContainer.style.display = 'none';
            previewContainer.innerHTML = '';
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    async handleAuthError(response) {
        if (response.status === 401) {
            localStorage.removeItem('access_token');
            this.showFloatingNotification('error', 'Session expired. Redirecting to login...');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return true;
        }
        return false;
    }

    async loadDocuments() {
        const token = localStorage.getItem('access_token');
        const loadingElement = document.getElementById('documentsLoading');
        const errorElement = document.getElementById('documentsError');

        // Show loading state
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
        if (errorElement) {
            errorElement.style.display = 'none';
        }

        try {
            // Add timeout to prevent infinite loading
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch('/documents/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (await this.handleAuthError(response)) {
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch documents');
            }

            const documents = await response.json();
            
            // Store documents for sorting and filtering
            this.documents = documents;
            
            // Hide loading state
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            if (documents.length === 0) {
                // Show empty state
                this.showEmptyState();
            } else {
                // Sort documents
                this.sortDocuments();
                
                // Render based on current view
                if (this.currentView === 'grid') {
                    this.renderDocumentsGrid();
                } else {
                    this.renderDocumentsList();
                }
            }

            // Refresh Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ icons: lucide.icons });
            }

        } catch (error) {
            let errorMessage = 'Failed to load documents';
            if (error.name === 'AbortError') {
                errorMessage = 'Request timed out. Please check your connection and try again.';
            } else if (error.message.includes('fetch')) {
                errorMessage = 'Connection error. Please check your internet connection.';
            }
            
            // Show error notification instead of body error
            this.showFloatingNotification('error', errorMessage);
            
            // Clear any existing error content from the documents list
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        } finally {
            if (loadingElement) {
            loadingElement.style.display = 'none';
            }
        }
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async handleFileUpload(e) {
        e.preventDefault();
        if (!this.validateFile(true)) return; // Pass true to indicate we're uploading

        const file = this.fileInput.files[0];
        const filename = file.name;
        const filenameExists = await this.checkFilenameExists(filename);
        
        if (filenameExists) {
            this.showFloatingNotification('error', `A document with the name "${filename}" already exists. Please rename the file or choose a different name.`);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        // Show loading state with animated spinner
        this.uploadBtn.disabled = true;
        this.uploadBtn.innerHTML = `
            <i data-lucide="loader-2" class="animate-spin"></i>
            <span>Uploading...</span>
        `;
        this.showFloatingNotification('info', 'Uploading document...');

        const token = localStorage.getItem('access_token');
        
        try {
            const response = await fetch('/documents/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (await this.handleAuthError(response)) {
                return;
            }

            const result = await response.json();

            if (response.ok) {
                this.showFloatingNotification('success', 'Document uploaded successfully!');
                this.form.reset();
                this.hideFilePreview(); // Clear the preview after successful upload
                await this.loadDocuments();
            } else {
                // Handle specific error cases
                if (response.status === 400 && result.detail) {
                    // Check if it's a filename conflict
                    if (result.detail.includes('already exists') || result.detail.includes('filename')) {
                        this.showFloatingNotification('error', `Filename conflict: ${result.detail}`);
                    } else {
                        this.showFloatingNotification('error', result.detail);
                    }
                } else {
                    this.showFloatingNotification('error', result.detail || 'Failed to upload document');
                }
            }
        } catch (error) {
            this.showFloatingNotification('error', 'Connection error. Please try again.');
        } finally {
            this.uploadBtn.disabled = false;
            this.uploadBtn.innerHTML = `
                <i data-lucide="upload"></i>
                <span>Upload Document</span>
            `;
        }
    }


    initializeQuillEditor() {
        // Hide document upload section and create document hero
        const documentUpElement = document.getElementById('DocumentUp');
        const createNewDocumentHeroElement = document.getElementById('createNewDocumentHero');
        
        if (documentUpElement) {
            documentUpElement.style.display = 'none';
        }
        if (createNewDocumentHeroElement) {
            createNewDocumentHeroElement.style.display = 'none';
        }
        
        const editorElement = document.getElementById('quillEditor');
        if (!editorElement) {
            return;
        }

        if (this.quillEditor) {
            return;
        }

        this.quillEditor = new Quill('#quillEditor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['blockquote', 'code-block'],
                    [{ 'header': [1, 2, 3, false] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link'],
                    ['clean']
                ]
            },
            placeholder: 'Select a document to start editing...'
        });

        // Handle text changes
        this.quillEditor.on('text-change', (delta, oldDelta, source) => {
            if (source !== 'silent') {
                this.scheduleAutoSave();
                this.updateSizeIndicator();
                
                // Trigger debounced WebSocket intelligent chunking
                this.scheduleTextChunking();
            }
        });

        // Listen for selection changes
        this.quillEditor.on('selection-change', () => {
            const currentContent = this.quillEditor.getText();
            if (this.lastSplitContent !== currentContent) {
                // Trigger debounced WebSocket intelligent chunking
                this.scheduleTextChunking();
                this.updateSizeIndicator();
            }
        });

        // Listen for keyboard events
        this.quillEditor.root.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
                setTimeout(() => {
                    // Trigger WebSocket intelligent chunking after undo/redo
                    this.scheduleTextChunking();
                    this.updateSizeIndicator();
                }, 10);
            }
        });

        this.startContentPolling();
        this.startMutationObserver();

        // Initialize column toggles
        this.initializeColumnToggles();
    }

    initializeColumnToggles() {
        const leftToggle = document.getElementById('leftColumnToggle');
        const rightToggle = document.getElementById('rightColumnToggle');
        const leftColumn = document.getElementById('leftColumn');
        const rightColumn = document.getElementById('rightColumn');

        if (leftToggle && leftColumn) {
            const leftHeader = leftColumn.querySelector('.column-header');
            if (leftHeader) {
                leftHeader.setAttribute('data-tooltip', 'Collapse Text Sections');
            }
            leftToggle.addEventListener('click', () => {
                this.toggleColumn('left');
            });
        }

        if (rightToggle && rightColumn) {
            const rightHeader = rightColumn.querySelector('.column-header');
            if (rightHeader) {
                rightHeader.setAttribute('data-tooltip', 'Collapse Writing Assistant');
            }
            rightToggle.addEventListener('click', () => {
                this.toggleColumn('right');
            });
        }
    }

    toggleColumn(side) {
        // Prevent rapid toggling that could cause performance issues
        if (this.isToggling) return;
        this.isToggling = true;
        
        // Set flag to prevent cross-panel interference during toggle
        this.isTogglingPanel = side;
        
        const column = document.getElementById(`${side}Column`);
        const toggle = document.getElementById(`${side}ColumnToggle`);
        
        if (!column || !toggle) {
            this.isToggling = false;
            return;
        }

        const isCollapsed = column.classList.contains('collapsed');
        
        if (isCollapsed) {
            column.classList.remove('collapsed');
            // Update icon to show collapse state
            const icon = toggle.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', side === 'left' ? 'panel-left-close' : 'panel-right-close');
            }
            // Update tooltip
            const header = column.querySelector('.column-header');
            if (header) {
                header.setAttribute('data-tooltip', side === 'left' ? 'Collapse Text Sections' : 'Collapse Writing Assistant');
            }
            
            // Remove collapsed content if it exists
            if (side === 'left') {
                this.removeCollapsedChunkIcons();
            } else if (side === 'right') {
                this.removeCollapsedActionIcons();
                // Ensure right panel content is properly restored when expanding
                this.restoreRightPanelContent();
            }
        } else {
            column.classList.add('collapsed');
            // Update icon to show expand state
            const icon = toggle.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', side === 'left' ? 'panel-left-open' : 'panel-right-open');
            }
            // Update tooltip
            const header = column.querySelector('.column-header');
            if (header) {
                header.setAttribute('data-tooltip', side === 'left' ? 'Expand Text Sections' : 'Expand Writing Assistant');
            }
            
            // Add collapsed content if it's the left panel
            if (side === 'left') {
                this.createCollapsedChunkIcons();
            }
            
            // Add collapsed action icons if it's the right panel
            if (side === 'right') {
                this.createCollapsedActionIcons();
            }
        }

        // Refresh Lucide icons (only for the panel being toggled)
        if (typeof lucide !== 'undefined') {
            // Only refresh icons for the specific panel being toggled
            const panelIcons = column.querySelectorAll('[data-lucide]');
            panelIcons.forEach(icon => {
                // Re-initialize only the icons in this specific panel
                if (icon.closest(`#${side}Column`)) {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ icons: lucide.icons });
        }
                }
            });
        }
        
        // Reset toggle lock after a short delay
        setTimeout(() => {
            this.isToggling = false;
            this.isTogglingPanel = null;
        }, 150);
    }

    createCollapsedChunkIcons() {
        const leftColumn = document.getElementById('leftColumn');
        if (!leftColumn) {
            console.log('Left column not found');
            return;
        }

        // Remove existing collapsed container if it exists
        this.removeCollapsedChunkIcons();

        // If no chunks, show empty state
        if (!this.documentChunks || this.documentChunks.length === 0) {
            const collapsedContainer = document.createElement('div');
            collapsedContainer.className = 'collapsed-chunks-container';
            collapsedContainer.innerHTML = `
                <div class="empty-chunks-state">
                    <i data-lucide="file-text"></i>
                    <span>No chunks</span>
                </div>
            `;
            leftColumn.appendChild(collapsedContainer);
            
            // Initialize Lucide icons for the empty state
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ icons: lucide.icons });
            }
            
            console.log('Added empty chunks state to left column');
        } else {
            // Create collapsed chunk icons container
            const collapsedContainer = document.createElement('div');
            collapsedContainer.className = 'collapsed-chunks-container';
            collapsedContainer.innerHTML = this.documentChunks.map(chunk => `
                <div class="collapsed-chunk-icon" data-chunk-index="${chunk.index}" title="Chunk ${chunk.index + 1}: ${chunk.wordCount} words">
                    <i data-lucide="file-text"></i>
                    <span class="chunk-number">${chunk.index + 1}</span>
                </div>
            `).join('');

            // Add click handlers for collapsed chunk icons (use event delegation)
            // Remove existing listener to prevent accumulation
            collapsedContainer.removeEventListener('click', this.collapsedChunkClickHandler);
            
            // Create bound handler with debounce to prevent rapid clicking
            this.collapsedChunkClickHandler = (e) => {
                // Prevent rapid clicking that could cause performance issues
                if (this.isProcessingChunkClick) return;
                this.isProcessingChunkClick = true;
                
                const chunkIcon = e.target.closest('.collapsed-chunk-icon');
                if (chunkIcon) {
                    const chunkIndex = parseInt(chunkIcon.dataset.chunkIndex);
                    this.getFeedback(chunkIndex);
                }
                
                // Reset the flag after a short delay
                setTimeout(() => {
                    this.isProcessingChunkClick = false;
                }, 300);
            };
            
            collapsedContainer.addEventListener('click', this.collapsedChunkClickHandler);

            leftColumn.appendChild(collapsedContainer);
            console.log('Added chunk icons to left column');
        }

        // Refresh icons only in the left panel to avoid interfering with right panel
        if (typeof lucide !== 'undefined') {
            const leftColumn = document.getElementById('leftColumn');
            if (leftColumn) {
                const leftIcons = leftColumn.querySelectorAll('[data-lucide]');
                if (leftIcons.length > 0) {
            lucide.createIcons({ icons: lucide.icons });
                }
            }
        }
    }

    removeCollapsedChunkIcons() {
        const collapsedContainer = document.querySelector('.collapsed-chunks-container');
        if (collapsedContainer) {
            collapsedContainer.remove();
        }
    }

    createCollapsedActionIcons() {
        const rightColumn = document.getElementById('rightColumn');
        if (!rightColumn || !rightColumn.classList.contains('collapsed')) return;

        // Check if collapsed action icons already exist to prevent duplicates
        const existingContainer = document.querySelector('.collapsed-actions-container');
        if (existingContainer) {
            return; // Already exists, don't create duplicates
        }

        // Remove existing collapsed action icons
        this.removeCollapsedActionIcons();

        const container = document.createElement('div');
        container.className = 'collapsed-actions-container';

        // Always show all action buttons (discrete actions)
        const actions = [
            {
                icon: 'wand-2',
                tooltip: 'Grammar Check',
                action: 'grammar',
                clickHandler: () => this.getGrammarCorrection()
            },
            {
                icon: 'check',
                tooltip: 'Apply Correction',
                action: 'apply',
                clickHandler: () => this.insertCorrection()
            },
            {
                icon: 'x',
                tooltip: 'Dismiss Feedback',
                action: 'dismiss',
                clickHandler: () => this.dismissFeedback()
            },
            {
                icon: 'languages',
                tooltip: 'Toggle Translation (Corrected Text)',
                action: 'translate',
                clickHandler: () => this.toggleTranslation()
            },
            {
                icon: 'refresh-cw',
                tooltip: 'Clear Form',
                action: 'clear',
                clickHandler: () => this.clearCorrectionForm()
            },
            {
                icon: 'send',
                tooltip: 'Submit for Training',
                action: 'submit',
                clickHandler: () => this.submitTeacherCorrection()
            }
        ];

        // Create action icons HTML (like left panel approach)
        container.innerHTML = actions.map(actionData => `
            <div class="collapsed-action-icon" data-action="${actionData.action}" data-tooltip="${actionData.tooltip}" title="${actionData.tooltip}">
                <i data-lucide="${actionData.icon}"></i>
            </div>
        `).join('');

        // Add event delegation (more efficient than individual listeners)
        container.addEventListener('click', (e) => {
            const actionIcon = e.target.closest('.collapsed-action-icon');
            if (actionIcon) {
                const action = actionIcon.dataset.action;
                const actionData = actions.find(a => a.action === action);
                if (actionData) {
                    actionData.clickHandler();
                }
            }
        });

        rightColumn.appendChild(container);
        
        // Initialize Lucide icons only in the left panel to avoid interfering with right panel
        if (typeof lucide !== 'undefined') {
            const leftColumn = document.getElementById('leftColumn');
            if (leftColumn) {
                const leftIcons = leftColumn.querySelectorAll('[data-lucide]');
                if (leftIcons.length > 0) {
            lucide.createIcons({ icons: lucide.icons });
                }
            }
        }
    }

    removeCollapsedActionIcons() {
        // Remove collapsed action container (simpler approach like left panel)
        const collapsedContainer = document.querySelector('.collapsed-actions-container');
        if (collapsedContainer) {
            collapsedContainer.remove();
        }
    }

    initializeRightPanelState() {
        // Initialize right panel to show empty state
        const emptyState = document.getElementById('emptyFeedbackState');
        const feedbackContent = document.getElementById('feedbackContent');
        
        if (emptyState) emptyState.style.display = 'flex';
        if (feedbackContent) feedbackContent.style.display = 'none';
        
        // Reset right panel title
        const rightColumnTitle = document.querySelector('#rightColumn .column-title h3');
        if (rightColumnTitle) {
            rightColumnTitle.textContent = 'Writing Assistant';
        }
    }

    restoreRightPanelContent() {
        // Ensure right panel content is properly restored when expanding
        const rightColumn = document.getElementById('rightColumn');
        if (!rightColumn) return;
        
        // Remove any inline styles that might interfere with collapse/expand
        const columnContent = rightColumn.querySelector('.column-content');
        if (columnContent) {
            columnContent.style.display = '';
        }
        
        // Check if there's actual content to show or if we should show empty state
        const emptyState = document.getElementById('emptyFeedbackState');
        const feedbackContent = document.getElementById('feedbackContent');
        
        if (this.currentFeedbackChunk && this.originalOriginalText) {
            // There's content - show feedback content
            if (emptyState) emptyState.style.display = 'none';
            if (feedbackContent) feedbackContent.style.display = 'block';
        } else {
            // No content - show empty state
        if (emptyState) emptyState.style.display = 'flex';
        if (feedbackContent) feedbackContent.style.display = 'none';
        }
        
        // Re-initialize any necessary event handlers
        this.initializeFeedbackActions();
        
        // Force a reflow to ensure the content is properly rendered
        rightColumn.offsetHeight;
    }

    // Toggle translation for corrected text (collapsed version)
    async toggleTranslation() {
        // Check if translation is already in progress
        if (this.isTranslationInProgress) {
            this.showFloatingNotification('warning', 'Translation is already in progress. Please wait...', 3000);
            return;
        }

        if (!this.originalCorrectedText) {
            this.showFloatingNotification('warning', 'No corrected text available for translation', 3000);
            return;
        }

        const correctedTextEl = document.getElementById('correctedText');
        if (!correctedTextEl) {
            this.showFloatingNotification('error', 'Corrected text element not found', 3000);
            return;
        }

        // Set translation in progress flag
        this.isTranslationInProgress = true;

        try {
            const textToTranslate = this.originalCorrectedText;
            const targetLanguage = this.translationState === 'english' ? 'kinyarwanda' : 'english';
            
            this.showFloatingNotification('info', `Translating corrected text to ${targetLanguage}...`, 3000);

            const response = await fetch('/documents/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    text: textToTranslate,
                    target_language: targetLanguage
                })
            });

            if (!response.ok) {
                throw new Error('Translation failed');
            }

            const result = await response.json();
            const translatedText = result.translated_text;

            // Update the corrected text with translated version
            correctedTextEl.innerHTML = this.formatModalText(translatedText);
            
            // Update the state
            this.translationState = this.translationState === 'english' ? 'kinyarwanda' : 'english';
            
            // Update the tooltip to show current state
            const translateIcon = document.querySelector('.collapsed-action-icon[data-action="translate"]');
            if (translateIcon) {
                const nextLanguage = this.translationState === 'english' ? 'Kinyarwanda' : 'English';
                translateIcon.setAttribute('data-tooltip', `Translate to ${nextLanguage}`);
                translateIcon.setAttribute('title', `Translate to ${nextLanguage}`);
            }

            this.showFloatingNotification('success', `Translation successful! Now in ${this.translationState === 'english' ? 'English' : 'Kinyarwanda'}`, 3000);

        } catch (error) {
            this.showFloatingNotification('error', `Translation failed: ${error.message}`, 5000);
        } finally {
            // Reset translation in progress flag
            this.isTranslationInProgress = false;
        }
    }



    clearCorrectionForm() {
        // Clear the teacher correction form
        const teacherCorrectionInput = document.getElementById('teacherCorrectionInput');
        const cbcFeedbackInput = document.getElementById('cbcFeedbackInput');
        
        if (teacherCorrectionInput) teacherCorrectionInput.value = '';
        if (cbcFeedbackInput) cbcFeedbackInput.value = '';
        
        this.showFloatingNotification('info', 'Form cleared', 2000);
    }


    insertCorrection() {
        if (!this.originalCorrectedText || !this.quillEditor) {
            this.showFloatingNotification('warning', 'No correction available to insert', 3000);
            return;
        }

        // Get the current chunk information
        if (!this.currentFeedbackChunk) {
            this.showFloatingNotification('warning', 'No chunk selected for correction', 3000);
            return;
        }

        const correctedText = this.originalCorrectedText;
        const chunkIndex = this.currentFeedbackChunk.index;
        
        const plainText = this.quillEditor.getText();
        const currentChunks = this.documentChunks;
        
        if (chunkIndex < currentChunks.length) {
            const chunk = currentChunks[chunkIndex];
            
            // Extract text before and after the chunk
            const beforeChunk = plainText.substring(0, chunk.start);
            const afterChunk = plainText.substring(chunk.end);
            
            // Create new text with corrected chunk
            const newText = beforeChunk + correctedText + afterChunk;
            
            // Update the editor with the new text
            this.quillEditor.setText('');
            this.quillEditor.insertText(0, newText);
            
            // Trigger debounced WebSocket intelligent chunking after correction
            this.scheduleTextChunking();
            this.scheduleAutoSave();
            
            this.showFloatingNotification('success', 'Correction applied to chunk successfully', 3000);
        } else {
            this.showFloatingNotification('error', 'Invalid chunk index for correction', 3000);
        }
    }

    dismissFeedback() {
        // Only clear corrected text and feedback, keep the chunk content
        const correctedTextEl = document.getElementById('correctedText');
        const feedbackTextEl = document.getElementById('feedbackText');
        
        if (correctedTextEl) {
            correctedTextEl.innerHTML = '<em style="color: var(--dark-text-secondary);">Click "Get Grammar Correction" to see corrections</em>';
        }
        if (feedbackTextEl) {
            feedbackTextEl.innerHTML = '<em style="color: var(--dark-text-secondary);">Click "Get Grammar Correction" to see feedback</em>';
        }
        
        // Clear stored values
        this.originalCorrectedText = '';
        this.originalFeedbackText = '';
        
        // Clear per-chunk state for current chunk
        if (this.currentFeedbackChunk && this.chunkStates) {
            this.chunkStates[this.currentFeedbackChunk.index] = {
                correctedText: '',
                feedbackText: ''
            };
        }
        
        this.showFloatingNotification('info', 'Feedback dismissed', 2000);
    }



    startContentPolling() {
        this.lastPolledContent = this.quillEditor ? this.quillEditor.getText() : '';
        this.lastPolledHTML = this.quillEditor ? this.quillEditor.root.innerHTML : '';
        
        this.contentPollingInterval = setInterval(() => {
            if (this.quillEditor) {
                const currentContent = this.quillEditor.getText();
                const currentHTML = this.quillEditor.root.innerHTML;
                
                if (this.lastPolledContent !== currentContent || this.lastPolledHTML !== currentHTML) {
                    this.lastPolledContent = currentContent;
                    this.lastPolledHTML = currentHTML;
                    
                    // Trigger debounced WebSocket intelligent chunking
                    this.scheduleTextChunking();
                    this.updateSizeIndicator();
                }
            }
        }, 100);
    }

    stopContentPolling() {
        if (this.contentPollingInterval) {
            clearInterval(this.contentPollingInterval);
            this.contentPollingInterval = null;
        }
    }

    startMutationObserver() {
        if (!this.quillEditor) return;
        
        this.mutationObserver = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    shouldUpdate = true;
                }
            });
            
            if (shouldUpdate) {
                setTimeout(() => {
                    // Trigger WebSocket intelligent chunking
                    this.scheduleTextChunking();
                    this.updateSizeIndicator();
                }, 10);
            }
        });
        
        this.mutationObserver.observe(this.quillEditor.root, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    stopMutationObserver() {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
    }

    initializeFeedbackModal() {
        // Initialize feedback actions in the right panel
        this.initializeFeedbackActions();
    }



    showFeedbackInRightPanel(title, originalText, correctedText, feedback) {
        // Prevent interference if left panel is being toggled
        if (this.isTogglingPanel === 'left') {
            // Delay the update until left panel toggle is complete
            setTimeout(() => {
                this.showFeedbackInRightPanel(title, originalText, correctedText, feedback);
            }, 200);
                return;
            }

        // Keep the default title - don't change it to filename
        
        // Hide empty state and show feedback content
        const emptyState = document.getElementById('emptyFeedbackState');
        const feedbackContent = document.getElementById('feedbackContent');
        
        if (emptyState) emptyState.style.display = 'none';
        if (feedbackContent) feedbackContent.style.display = 'block';
        
        // Populate the content
        const originalTextEl = document.getElementById('originalText');
        const correctedTextEl = document.getElementById('correctedText');
        const feedbackTextEl = document.getElementById('feedbackText');
        
        if (originalTextEl) originalTextEl.innerHTML = this.formatModalText(originalText);
        if (correctedTextEl) {
            if (correctedText && correctedText.trim()) {
                correctedTextEl.innerHTML = this.formatModalText(correctedText);
            } else {
                correctedTextEl.innerHTML = '<em style="color: var(--dark-text-secondary);">Click "Get Grammar Correction" to see corrections</em>';
            }
        }
        if (feedbackTextEl) {
            if (feedback && feedback.trim()) {
                feedbackTextEl.innerHTML = this.formatModalText(feedback);
            } else {
                feedbackTextEl.innerHTML = '<em style="color: var(--dark-text-secondary);">Click "Get Grammar Correction" to see feedback</em>';
            }
        }
        
        // Store original values for actions
        this.originalCorrectedText = correctedText;
        this.originalOriginalText = originalText;
        this.originalFeedbackText = feedback;
        
        // Always show apply and dismiss buttons
        const insertBtn = document.getElementById('insertFeedbackBtn');
        const dismissBtn = document.getElementById('dismissFeedbackBtn');
        const grammarBtn = document.getElementById('getGrammarCorrectionBtn');
        
        if (insertBtn) insertBtn.style.display = 'flex';
        if (dismissBtn) dismissBtn.style.display = 'flex';
        if (grammarBtn) grammarBtn.style.display = 'block';
        
        // Right panel stays in its current state (expanded or collapsed)
        // Content will be populated regardless of panel state
        
                
        // Re-initialize Lucide icons for the new content (only in right panel)
        if (typeof lucide !== 'undefined') {
                const rightColumn = document.getElementById('rightColumn');
            if (rightColumn) {
                const rightIcons = rightColumn.querySelectorAll('[data-lucide]');
                if (rightIcons.length > 0) {
                    lucide.createIcons({ icons: lucide.icons });
                }
            }
        }
        this.initializeFeedbackActions();
    }

    initializeFeedbackActions() {
        // Handle "Get Grammar Correction" button
        const getGrammarBtn = document.getElementById('getGrammarCorrectionBtn');
        if (getGrammarBtn && !getGrammarBtn.dataset.listenerAttached) {
            getGrammarBtn.onclick = () => this.getGrammarCorrection();
            getGrammarBtn.dataset.listenerAttached = 'true';
        }

        // Handle "Apply Correction" button
        const insertBtn = document.getElementById('insertFeedbackBtn');
        if (insertBtn && !insertBtn.dataset.listenerAttached) {
            insertBtn.onclick = () => this.insertCorrection();
            insertBtn.dataset.listenerAttached = 'true';
        }

        // Handle "Dismiss" button
        const dismissBtn = document.getElementById('dismissFeedbackBtn');
        if (dismissBtn && !dismissBtn.dataset.listenerAttached) {
            dismissBtn.onclick = () => this.dismissFeedback();
            dismissBtn.dataset.listenerAttached = 'true';
        }
        
        // Handle translation buttons (expanded state in right panel)
        const translateOriginalBtn = document.getElementById('translateOriginalBtn');
        if (translateOriginalBtn && !translateOriginalBtn.dataset.listenerAttached) {
            translateOriginalBtn.addEventListener('click', () => this.translateText('original', 'kinyarwanda'));
            translateOriginalBtn.dataset.listenerAttached = 'true';
        }
        
        const translateCorrectedBtn = document.getElementById('translateCorrectedBtn');
        if (translateCorrectedBtn && !translateCorrectedBtn.dataset.listenerAttached) {
            translateCorrectedBtn.addEventListener('click', () => this.translateText('corrected', 'kinyarwanda'));
            translateCorrectedBtn.dataset.listenerAttached = 'true';
        }
        
        const translateFeedbackBtn = document.getElementById('translateFeedbackBtn');
        if (translateFeedbackBtn && !translateFeedbackBtn.dataset.listenerAttached) {
            translateFeedbackBtn.addEventListener('click', () => this.translateText('feedback', 'kinyarwanda'));
            translateFeedbackBtn.dataset.listenerAttached = 'true';
        }
        
        const translateOriginalEnBtn = document.getElementById('translateOriginalEnBtn');
        if (translateOriginalEnBtn && !translateOriginalEnBtn.dataset.listenerAttached) {
            translateOriginalEnBtn.addEventListener('click', () => this.translateText('original', 'english'));
            translateOriginalEnBtn.dataset.listenerAttached = 'true';
        }
        
        const translateCorrectedEnBtn = document.getElementById('translateCorrectedEnBtn');
        if (translateCorrectedEnBtn && !translateCorrectedEnBtn.dataset.listenerAttached) {
            translateCorrectedEnBtn.addEventListener('click', () => this.translateText('corrected', 'english'));
            translateCorrectedEnBtn.dataset.listenerAttached = 'true';
        }
        
        const translateFeedbackEnBtn = document.getElementById('translateFeedbackEnBtn');
        if (translateFeedbackEnBtn && !translateFeedbackEnBtn.dataset.listenerAttached) {
            translateFeedbackEnBtn.addEventListener('click', () => this.translateText('feedback', 'english'));
            translateFeedbackEnBtn.dataset.listenerAttached = 'true';
        }
    }

    async getGrammarCorrection() {
        // Check if grammar correction is already in progress
        if (this.isGrammarCorrectionInProgress) {
            this.showFloatingNotification('warning', 'Grammar correction is already in progress. Please wait...', 3000);
            return;
        }

        // First priority: use stored chunk from getFeedback
        let textToCorrect = '';
        let chunkId = null;
        
        if (this.currentFeedbackChunk) {
            // Always get the current text from documentChunks to avoid stale data
            const currentChunk = this.documentChunks[this.currentFeedbackChunk.index];
            if (currentChunk) {
                textToCorrect = currentChunk.text.trim();
                chunkId = this.currentFeedbackChunk.index;
            } else {
                // If documentChunks is not available, we cannot proceed
                this.showFloatingNotification('error', 'Unable to access chunk data. Please try loading the chunk again.', 3000);
                return;
            }
        } else {
            // No chunk selected - user must use "Get Feedback" first
            this.showFloatingNotification('warning', 'Please select a text section first using "Get Feedback"', 3000);
            return;
        }
        
        if (!textToCorrect) {
            this.showFloatingNotification('warning', 'Please select a text section first using "Get Feedback"', 3000);
            return;
        }

        if (chunkId === null) {
            this.showFloatingNotification('warning', 'Unable to identify the text section. Please try "Get Feedback" first.', 3000);
            return;
        }

        // Set grammar correction in progress flag
        this.isGrammarCorrectionInProgress = true;

        const getGrammarBtn = document.getElementById('getGrammarCorrectionBtn');
        
        // Update button to show loading and disable all grammar correction buttons
        if (getGrammarBtn) {
            getGrammarBtn.disabled = true;
            getGrammarBtn.innerHTML = '<i data-lucide="loader-2"></i> Processing...';
            lucide.createIcons({ icons: lucide.icons });
        }

        // Also disable collapsed action icons for grammar correction
        const collapsedGrammarIcons = document.querySelectorAll('.collapsed-action-icon[data-action="grammar"]');
        collapsedGrammarIcons.forEach(icon => {
            icon.style.opacity = '0.5';
            icon.style.pointerEvents = 'none';
        });

        this.showFloatingNotification('info', 'Checking grammar... This may take 30-60 seconds.', 5000);
        
        const token = localStorage.getItem('access_token');
        
        try {
            const response = await fetch(`/documents/chunk/${chunkId}/correction-and-feedback`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: textToCorrect })
            });
            
            if (!response.ok) {
                let errorMessage = 'Failed to get grammar correction';
                
                try {
                const errorData = await response.json();
                    errorMessage = errorData.detail || errorMessage;
                } catch (e) {
                    // Handle different HTTP status codes with user-friendly messages
                    switch (response.status) {
                        case 404:
                            errorMessage = 'The grammar correction service is currently unavailable. Please try again later.';
                            break;
                        case 400:
                            errorMessage = 'Invalid text provided for correction. Please check your text and try again.';
                            break;
                        case 401:
                            errorMessage = 'Your session has expired. Please refresh the page and log in again.';
                            break;
                        case 500:
                            errorMessage = 'The grammar correction service encountered an error. Please try again in a few moments.';
                            break;
                        default:
                            errorMessage = `Service temporarily unavailable (${response.status}). Please try again later.`;
                    }
                }
                
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            // Update the content with the results
            const correctedTextEl = document.getElementById('correctedText');
            const feedbackTextEl = document.getElementById('feedbackText');
            
            if (correctedTextEl) {
                correctedTextEl.innerHTML = this.formatModalText(data.corrected_text);
            }
            if (feedbackTextEl) {
                feedbackTextEl.innerHTML = this.formatModalText(data.feedback);
            }
            
            // Store the results globally and per-chunk
            this.originalCorrectedText = data.corrected_text;
            this.originalFeedbackText = data.feedback;
            
            // Save to per-chunk state
            if (this.currentFeedbackChunk && this.chunkStates) {
                this.chunkStates[this.currentFeedbackChunk.index] = {
                    correctedText: data.corrected_text,
                    feedbackText: data.feedback
                };
            }
            
            // Keep all buttons visible - they should always be available
            const insertBtn = document.getElementById('insertFeedbackBtn');
            const dismissBtn = document.getElementById('dismissFeedbackBtn');
            if (insertBtn) insertBtn.style.display = 'flex';
            if (dismissBtn) dismissBtn.style.display = 'flex';
            if (getGrammarBtn) getGrammarBtn.style.display = 'block';
            
            this.showFloatingNotification('success', 'Grammar check completed!', 3000);
            
        } catch (error) {
            this.showFloatingNotification('error', error.message || 'Failed to check grammar. Please try again.', 5000);
        } finally {
            // Reset grammar correction in progress flag
            this.isGrammarCorrectionInProgress = false;
            
            // Reset button
            if (getGrammarBtn) {
                getGrammarBtn.disabled = false;
                getGrammarBtn.innerHTML = 'Grammar Check';
                lucide.createIcons({ icons: lucide.icons });
            }
            
            // Re-enable collapsed action icons for grammar correction
            const collapsedGrammarIcons = document.querySelectorAll('.collapsed-action-icon[data-action="grammar"]');
            collapsedGrammarIcons.forEach(icon => {
                icon.style.opacity = '1';
                icon.style.pointerEvents = 'auto';
            });
        }
    }

    formatModalText(text) {
        if (!text) return '';
        
        // Escape HTML to prevent XSS
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        
        // Convert newlines to <br> tags and preserve spacing
        return escaped
            .replace(/\n/g, '<br>')
            .replace(/  /g, '&nbsp;&nbsp;');
    }



    addDocumentClickListeners() {
        const documentItems = document.querySelectorAll('.document-item');
        documentItems.forEach(item => {
            // Remove existing click listeners to prevent duplicates
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            newItem.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.document-actions')) {
                    return;
                }
                
                const docId = newItem.dataset.id;
                const docTitle = newItem.querySelector('.document-title').textContent;
                this.loadDocument(docId, docTitle);
                
                // Update visual selection
                documentItems.forEach(i => i.classList.remove('selected'));
                newItem.classList.add('selected');
            });
        });
    }

    async loadDocument(docId, docTitle) {
        // Clear right panel when loading a new document
        this.clearRightPanel();
        
        const token = localStorage.getItem('access_token');
        const editorSection = document.getElementById('documentEditorSection');
        const editorLoading = document.getElementById('editorLoading');
        const editorError = document.getElementById('editorError');
        const editorTitle = document.getElementById('editorTitle');

        try {
            editorSection.style.display = 'block';
            editorLoading.style.display = 'flex';
            editorError.style.display = 'none';
            editorTitle.textContent = docTitle;
            
            // Keep default header title - don't change it to filename
            
            // Hide navigation bar when editor is open
            const navigationBar = document.querySelector('.navigation-bar');
            if (navigationBar) {
                navigationBar.style.display = 'none';
            }
            
            // Prevent body scrolling when editor is open
            document.body.style.overflow = 'hidden';
            
            // Add smooth transition
            setTimeout(() => {
                editorSection.classList.add('show');
            }, 10);

            const response = await fetch(`/documents/${docId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (await this.handleAuthError(response)) {
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch document');
            }

            const documentData = await response.json();
            this.currentDocument = documentData;

            editorLoading.style.display = 'none';
            
            this.initializeQuillEditor();
            
            if (this.quillEditor) {
                this.quillEditor.setContents([]);
                
                if (documentData.content && documentData.content.includes('<')) {
                    const delta = this.quillEditor.clipboard.convert(documentData.content);
                    this.quillEditor.setContents(delta);
                } else {
                    this.quillEditor.setText('');
                    this.quillEditor.insertText(0, documentData.content || '');
                }
                
                this.lastSavedContent = this.quillEditor.root.innerHTML;
                this.lastPolledContent = this.quillEditor.getText();
                this.lastPolledHTML = this.quillEditor.root.innerHTML;
                
                setTimeout(() => {
                    const editorElement = this.quillEditor.root;
                    if (editorElement) {
                        editorElement.style.color = '#333';
                        editorElement.style.backgroundColor = 'white';
                    }
                }, 100);
            }
            
            this.updateSizeIndicator();
            
            // Trigger initial WebSocket intelligent chunking
            this.scheduleTextChunking();

        } catch (error) {
            editorLoading.style.display = 'none';
            
            // Use floating notification instead of inline error
            this.showFloatingNotification('error', 'Failed to load document. Please try again.');
            
            // Hide the editor section on error
            if (editorSection) {
                editorSection.style.display = 'none';
            }
            
            // Clear right panel when editor is hidden due to error
            this.clearRightPanel();
        }
    }

    closeEditor() {
        const editorSection = document.getElementById('documentEditorSection');
        const documentItems = document.querySelectorAll('.document-item');
        
        // Remove show class for smooth transition
        editorSection.classList.remove('show');
        
        // Show navigation bar when editor is closed
        const navigationBar = document.querySelector('.navigation-bar');
        if (navigationBar) {
            navigationBar.style.display = 'block';
        }
        
        // Restore body scrolling when editor is closed
        document.body.style.overflow = 'auto';
        
        
        // Wait for transition to complete before hiding
        setTimeout(() => {
        editorSection.style.display = 'none';
        }, 300);
        
        this.currentDocument = null;
        this.documentChunks = [];
        this.selectedChunk = null;
        this.lastSplitContent = '';
        
        // Clear all state when editor is closed
        this.clearAllState();
        
        if (this.quillEditor) {
            this.quillEditor.setContents([]);
        }
        this.stopContentPolling();
        this.stopMutationObserver();
        
        documentItems.forEach(item => item.classList.remove('selected'));
        
        // Clear right panel when editor is closed
        this.clearRightPanel();
    }

    clearRightPanel() {
        // Hide feedback content and show empty state
        const emptyState = document.getElementById('emptyFeedbackState');
        const feedbackContent = document.getElementById('feedbackContent'); // This is the container in right panel
        
        if (emptyState) emptyState.style.display = 'flex';
        if (feedbackContent) feedbackContent.style.display = 'none'; // Hide the container
        
        // Reset right panel title
        const rightColumnTitle = document.querySelector('#rightColumn .column-title h3');
        if (rightColumnTitle) {
            rightColumnTitle.textContent = 'Writing Assistant';
        }
        
        // Clear all feedback content
        const originalTextEl = document.getElementById('originalText');
        const correctedTextEl = document.getElementById('correctedText');
        const feedbackTextEl = document.getElementById('feedbackText');
        
        if (originalTextEl) originalTextEl.innerHTML = '';
        if (correctedTextEl) correctedTextEl.innerHTML = '';
        if (feedbackTextEl) feedbackTextEl.innerHTML = '';
        
        // Clear teacher correction form
        const teacherCorrectionInput = document.getElementById('teacherCorrectionInput');
        const cbcFeedbackInput = document.getElementById('cbcFeedbackInput');
        
        if (teacherCorrectionInput) teacherCorrectionInput.value = '';
        if (cbcFeedbackInput) cbcFeedbackInput.value = '';
        
        // Reset stored values
        this.originalCorrectedText = '';
        this.originalOriginalText = '';
        this.originalFeedbackText = '';
        this.currentFeedbackChunk = null;
        this.isGrammarCorrectionInProgress = false;
        
        // Hide action buttons
        const insertBtn = document.getElementById('insertFeedbackBtn');
        const dismissBtn = document.getElementById('dismissFeedbackBtn');
        const grammarBtn = document.getElementById('getGrammarCorrectionBtn');
        
        if (insertBtn) insertBtn.style.display = 'none';
        if (dismissBtn) dismissBtn.style.display = 'none';
        if (grammarBtn) grammarBtn.style.display = 'block';
    }

    clearAllState() {
        // Clear all state - only called on token expiry, reload, or editor close
        this.clearRightPanel();
        this.currentDocument = null;
        this.documentChunks = [];
        this.selectedChunk = null;
        this.currentFeedbackChunk = null;
        this.isGrammarCorrectionInProgress = false;
        this.lastSplitContent = '';
    }

    saveDocument() {
        if (!this.currentDocument || !this.quillEditor) {
            return;
        }

        const saveBtn = document.getElementById('saveDocumentBtn');
        const originalContent = saveBtn.innerHTML;

        // Check WebSocket connection
        if (!window.websocketClient || !window.websocketClient.isConnected) {
            this.showFloatingNotification('error', 'Connection lost. Please refresh the page and try again.');
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `
                <i data-lucide="loader-2" class="animate-spin"></i>
                Saving...
            `;

            const htmlContent = this.quillEditor.root.innerHTML;
            
            // Use WebSocket for manual save
            window.websocketClient.requestManualSave(this.currentDocument.id, htmlContent);
            this.lastSavedContent = htmlContent;

        } catch (error) {
            this.showFloatingNotification('error', 'Connection error. Please try again.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalContent;
        }
    }

    showEditorFeedback(type, message) {
        const editorContent = document.querySelector('.editor-content');
        const existingFeedback = editorContent.querySelector('.editor-feedback');
        
        if (existingFeedback) {
            existingFeedback.remove();
        }

        const feedback = document.createElement('div');
        feedback.className = `editor-feedback feedback-message ${type} fade-in`;
        feedback.innerHTML = `
            <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}"></i>
            <span>${message}</span>
        `;
        
        editorContent.insertBefore(feedback, editorContent.firstChild);
        
        // Refresh icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ icons: lucide.icons });
        }
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.remove();
            }
        }, 3000);
    }

    scheduleAutoSave() {
        if (!this.currentDocument || !this.quillEditor) {
            return;
        }

        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        this.autoSaveTimeout = setTimeout(() => {
            this.performAutoSave();
        }, 2000);
    }

    scheduleTextChunking() {
        if (!this.currentDocument || !this.quillEditor) {
            return;
        }

        // Clear existing chunking timeout
        if (this.chunkingTimeout) {
            clearTimeout(this.chunkingTimeout);
        }
        
        // Schedule chunking for 1.5 seconds (as requested)
        this.chunkingTimeout = setTimeout(() => {
            if (window.websocketClient && window.websocketClient.isConnected && this.currentDocument) {
                const text = this.quillEditor.getText();
                window.websocketClient.requestTextChunking(text, this.currentDocument.id);
            }
        }, 1500);
    }

    performAutoSave() {
        if (!this.currentDocument || !this.quillEditor) {
            return;
        }

        const currentContent = this.quillEditor.root.innerHTML;
        
        if (currentContent === this.lastSavedContent) {
            return;
        }

        // Use WebSocket for auto-save instead of REST API
        if (window.websocketClient && window.websocketClient.isConnected) {
            window.websocketClient.requestAutoSave(this.currentDocument.id, currentContent);
                this.lastSavedContent = currentContent;
        } else {
            // do nothing
        }
    }

    updateSizeIndicator() {
        if (!this.quillEditor) return;

        const currentSizeElement = document.getElementById('currentSize');
        const sizeIndicator = document.getElementById('documentSizeIndicator');
        
        if (!currentSizeElement || !sizeIndicator) return;

        const content = this.quillEditor.root.innerHTML;
        const sizeInBytes = new Blob([content], { type: 'text/html' }).size;
        
        const sizeInKB = (sizeInBytes / 1024).toFixed(1);
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
        
        let displaySize;
        if (sizeInBytes >= 1024 * 1024) {
            displaySize = `${sizeInMB} MB`;
        } else {
            displaySize = `${sizeInKB} KB`;
        }
        
        currentSizeElement.textContent = displaySize;
        
        const maxSizeBytes = 1024 * 1024;
        const percentage = (sizeInBytes / maxSizeBytes) * 100;
        
        sizeIndicator.classList.remove('warning', 'danger');
        
        if (percentage >= 90) {
            sizeIndicator.classList.add('danger');
        } else if (percentage >= 75) {
            sizeIndicator.classList.add('warning');
        }
    }

    // Old chunking methods removed - will be replaced with WebSocket + spaCy intelligent chunking

    updateChunksStatus(message) {
        const statusElement = document.getElementById('chunksStatus');
        if (!statusElement) return;

        statusElement.textContent = message;
        
        statusElement.classList.remove('updating', 'ready');
        if (message.includes('Updating') || message.includes('Splitting')) {
            statusElement.classList.add('updating');
        } else if (message.includes('Ready')) {
            statusElement.classList.add('ready');
        }
    }

    // Old word-based chunking removed - now using WebSocket + spaCy intelligent chunking

    displayChunks() {
        const chunksList = document.getElementById('chunksList');
        if (!chunksList) {
            return;
        }

        if (this.documentChunks.length === 0) {
            chunksList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="file-text"></i>
                    <p>No chunks available</p>
                </div>
            `;
        } else {
            chunksList.innerHTML = this.documentChunks.map(chunk => `
                <div class="chunk-item fade-in" data-chunk-index="${chunk.index}">
                    <div class="chunk-header">
                        <span class="chunk-number">Chunk ${chunk.index + 1}</span>
                        <span class="chunk-word-count">
                            <i data-lucide="type"></i>
                            ${chunk.wordCount} words
                        </span>
                    </div>
                    <div class="chunk-preview">${this.escapeHtml(chunk.text.substring(0, 150))}${chunk.text.length > 150 ? '...' : ''}</div>
                    <div class="chunk-actions">
                        <button class="chunk-action-btn btn-primary btn-sm" 
                                id="feedback-btn-${chunk.index}"
                                onclick="window.documentManager.getFeedback(${chunk.index})"
                                ${this.isProcessingFeedback ? 'disabled' : ''}>
                            <i data-lucide="message-square"></i>
                            <span class="btn-text">Get Feedback</span>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // Add click event listeners
        this.addChunkClickListeners();
        
        // Refresh icons only in the left panel to avoid interfering with right panel
        if (typeof lucide !== 'undefined') {
            const leftColumn = document.getElementById('leftColumn');
            if (leftColumn) {
                const leftIcons = leftColumn.querySelectorAll('[data-lucide]');
                if (leftIcons.length > 0) {
            lucide.createIcons({ icons: lucide.icons });
                }
            }
        }

        // Update collapsed chunk icons if left panel is collapsed
        const leftColumn = document.getElementById('leftColumn');
        if (leftColumn && leftColumn.classList.contains('collapsed')) {
            // Only update if chunks actually changed to prevent unnecessary DOM manipulation
            if (this.lastChunksLength !== this.documentChunks.length) {
            this.createCollapsedChunkIcons();
                this.lastChunksLength = this.documentChunks.length;
            }
        }
    }



    addChunkClickListeners() {
        // Use event delegation instead of adding individual listeners
        // This prevents memory leaks and improves performance
        const chunksList = document.getElementById('chunksList');
        if (!chunksList) return;
        
        // Remove existing event listener to prevent duplicates
        chunksList.removeEventListener('click', this.chunkClickHandler);
        
        // Create bound handler
        this.chunkClickHandler = (e) => {
            const chunkItem = e.target.closest('.chunk-item');
            if (!chunkItem) return;
            
                if (e.target.classList.contains('chunk-action-btn') || e.target.closest('.chunk-action-btn')) {
                    return;
                }
                
            const chunkIndex = parseInt(chunkItem.dataset.chunkIndex);
                this.selectChunk(chunkIndex);
        };
        
        // Add single event listener with delegation
        chunksList.addEventListener('click', this.chunkClickHandler);
    }

    selectChunk(chunkIndex) {
        const chunk = this.documentChunks[chunkIndex];
        if (!chunk) return;

        this.selectedChunk = chunk;

        const chunkItems = document.querySelectorAll('.chunk-item');
        chunkItems.forEach(item => item.classList.remove('selected'));
        
        const selectedItem = document.querySelector(`[data-chunk-index="${chunkIndex}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        this.showEditorFeedback('info', `Selected Chunk ${chunkIndex + 1} (${chunk.wordCount} words)`);
    }

    async getFeedback(chunkIndex) {
        const chunk = this.documentChunks[chunkIndex];
        if (!chunk) return;

        // Prevent multiple simultaneous calls to getFeedback
        if (this.isProcessingFeedback) {
            this.showFloatingNotification('info', 'Please wait for current feedback to load', 2000);
            return;
        }
        this.isProcessingFeedback = true;

        // Store the current chunk reference for grammar correction
        this.currentFeedbackChunk = {
            index: chunkIndex,
            wordCount: chunk.wordCount
            // Note: Don't store text here to avoid stale data
        };

        // Initialize per-chunk state if not exists
        if (!this.chunkStates) {
            this.chunkStates = {};
        }
        
        // Get or create state for this chunk
        const chunkState = this.chunkStates[chunkIndex] || {
            correctedText: '',
            feedbackText: ''
        };
        
        // Always use current chunk text, but maintain per-chunk corrected text and feedback
        this.showFeedbackInRightPanel(
                `Grammar Feedback - Chunk ${chunkIndex + 1}`,
            chunk.text, // Always use current chunk text as original
            chunkState.correctedText, // Use per-chunk corrected text
            chunkState.feedbackText // Use per-chunk feedback text
        );
        
        // Show notification that chunk is ready for feedback
        this.showFloatingNotification('info', `Chunk ${chunkIndex + 1} loaded in Writing Assistant`, 3000);
        
        // Reset processing flag
        this.isProcessingFeedback = false;
    }

    async translateText(type, targetLanguage) {
        // Check if translation is already in progress
        if (this.isTranslationInProgress) {
            this.showFloatingNotification('warning', 'Translation is already in progress. Please wait...', 3000);
            return;
        }

        let sourceElement;
        
        // Use only right panel elements (no modal support)
        if (type === 'original') {
            sourceElement = document.getElementById('originalText');
        } else if (type === 'corrected') {
            sourceElement = document.getElementById('correctedText');
        } else if (type === 'feedback') {
            sourceElement = document.getElementById('feedbackText');
        }
        
        if (!sourceElement) {
            this.showFloatingNotification('error', 'Element not found for translation', 3000);
            return;
        }
        
        // Set translation in progress flag
        this.isTranslationInProgress = true;
        
        // Get the HTML content to preserve formatting
        const sourceHtml = sourceElement.innerHTML;
        // Extract plain text from HTML for translation
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sourceHtml;
        const sourceText = tempDiv.textContent || tempDiv.innerText || '';
        
        if (!sourceText.trim()) {
            this.showFloatingNotification('warning', 'No text to translate', 2000);
            return;
        }
        
        const token = localStorage.getItem('access_token');
        
        // Show loading state
        this.showFloatingNotification('info', `Translating to ${targetLanguage}...`, 3000);
        
        try {
            const response = await fetch('/documents/translate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    text: sourceText,
                    target_language: targetLanguage
                })
            });
            
            if (!response.ok) {
                throw new Error('Translation failed');
            }
            
            const data = await response.json();
            // Format the translated text with proper line breaks
            const formattedText = this.formatModalText(data.translated_text);
            sourceElement.innerHTML = formattedText;
            
            // Show success notification
            this.showFloatingNotification('success', `Translation to ${targetLanguage} completed!`, 3000);
            
        } catch (error) {
            this.showFloatingNotification('error', 'Failed to translate text. Please try again.', 5000);
        } finally {
            // Reset translation in progress flag
            this.isTranslationInProgress = false;
        }
    }

    // File Management Functions
    initializeFileManagement() {
        // Grid card button
        const createNewCard = document.getElementById('createNewDocumentCard');
        if (createNewCard) {
            createNewCard.addEventListener('click', () => this.showCreateDocumentModal());
        }
        
        // Navigation bar button
        const createNewBtn = document.getElementById('createNewDocumentBtn');
        if (createNewBtn) {
            createNewBtn.addEventListener('click', () => this.showCreateDocumentModal());
        }
    }

    showCreateDocumentModal() {
        // Show styled create document modal
        this.showCreateDocumentStyledModal();
    }

    async checkFilenameAndCreate(filename) {
        const token = localStorage.getItem('access_token');
        
        try {
            const response = await fetch(`/documents/check-filename/${encodeURIComponent(filename)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (await this.handleAuthError(response)) {
                return;
            }

            const result = await response.json();
            
            if (result.exists) {
                this.showFloatingNotification('error', `Filename "${filename}" already exists. Please choose a different name.`);
                return;
            }

            await this.createNewDocument(filename);
            
        } catch (error) {
            this.showFloatingNotification('error', 'Error checking filename. Please try again.');
        }
    }

    async createNewDocument(filename) {
        const token = localStorage.getItem('access_token');
        
        try {
            const response = await fetch('/documents/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: this.createEmptyFileFormData(filename)
            });

            if (await this.handleAuthError(response)) {
                return;
            }

            const result = await response.json();

            if (response.ok) {
                this.showFloatingNotification('success', `Document "${filename}" created successfully!`);
                await this.loadDocuments();
                
                const newDocId = result.document_id;
                this.loadDocument(newDocId, filename);
            } else {
                this.showFloatingNotification('error', result.detail || 'Failed to create document');
            }

        } catch (error) {
            this.showFloatingNotification('error', 'Connection error. Please try again.');
        }
    }

    async generateAndCreateAutoFilename() {
        const token = localStorage.getItem('access_token');
        
        try {
            const frontendNextNumber = this.getFrontendNextUntitledNumber();
            
            const response = await fetch('/documents/get-next-untitled-number', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (await this.handleAuthError(response)) {
                return;
            }

            const result = await response.json();
            
            if (!result.nextNumber) {
                this.showFloatingNotification('error', 'Error generating filename. Please try again.');
                return;
            }
            
            const suggestedName = `Untitled ${result.nextNumber}.txt`;
            await this.createNewDocument(suggestedName);
            
        } catch (error) {
            const fallbackName = this.generateFallbackAutoName();
            await this.createNewDocument(fallbackName);
        }
    }

    getFrontendNextUntitledNumber() {
        const documentItems = document.querySelectorAll('.document-item');
        const existingTitles = Array.from(documentItems).map(item => {
            const titleElement = item.querySelector('.document-title');
            return titleElement ? titleElement.textContent : '';
        });

        const numbers = [];
        for (const title of existingTitles) {
            if (title.startsWith('Untitled ') && title.endsWith('.txt')) {
                try {
                    const numberPart = title.replace('Untitled ', '').replace('.txt', '');
                    const number = parseInt(numberPart);
                    if (!isNaN(number)) {
                        numbers.push(number);
                    }
                } catch (e) {
                    continue;
                }
            }
        }

        if (numbers.length === 0) {
            return 1;
        } else {
            return Math.max(...numbers) + 1;
        }
    }

    generateFallbackAutoName() {
        const timestamp = Date.now();
        return `Untitled ${timestamp}.txt`;
    }

    async checkFilenameExists(filename) {
        const token = localStorage.getItem('access_token');
        
        try {
            const response = await fetch(`/documents/check-filename/${encodeURIComponent(filename)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (await this.handleAuthError(response)) {
                return false;
            }

            if (!response.ok) {
                // If endpoint doesn't exist, we should still try to upload and let backend handle it
                return false;
            }
            const result = await response.json();
            return result.exists;
            
        } catch (error) {
            // On error, allow upload to proceed and let backend handle validation
            return false;
        }
    }

    initializeTeacherCorrectionForm() {
        const submitBtn = document.getElementById('submitCorrectionBtn');
        const clearBtn = document.getElementById('clearCorrectionBtn');
        
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitTeacherCorrection());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearTeacherCorrectionForm());
        }
    }

    async submitTeacherCorrection() {
        const originalText = this.originalOriginalText || '';
        const teacherCorrection = document.getElementById('teacherCorrectionInput').value.trim();
        const cbcFeedback = document.getElementById('cbcFeedbackInput').value.trim();

        if (!originalText) {
            this.showFloatingNotification('error', 'No original text available. Please select a chunk first.');
            return;
        }

        if (!teacherCorrection) {
            this.showFloatingNotification('error', 'Please enter your correction.');
            return;
        }

        if (!cbcFeedback) {
            this.showFloatingNotification('error', 'Please provide CBC feedback.');
            return;
        }

        const submitBtn = document.getElementById('submitCorrectionBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <i data-lucide="loader-2" class="animate-spin"></i>
            Submitting...
        `;

        try {
            const token = localStorage.getItem('access_token');
            
            const response = await fetch('/documents/submit-training-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    original_text: originalText,
                    teacher_correction: teacherCorrection,
                    cbc_feedback: cbcFeedback
                })
            });

            if (await this.handleAuthError(response)) {
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to submit training data');
            }

            const result = await response.json();
            this.showFloatingNotification('success', 'Thank you! Your P3 correction has been submitted for training data.');
            this.clearTeacherCorrectionForm();
            
        } catch (error) {
            this.showFloatingNotification('error', `Failed to submit training data: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <i data-lucide="send"></i>
                Submit for Training
            `;
        }
    }

    clearTeacherCorrectionForm() {
        document.getElementById('teacherCorrectionInput').value = '';
        document.getElementById('cbcFeedbackInput').value = '';
        this.showFloatingNotification('info', 'Form cleared');
    }

    deleteDocumentPrompt(docId, docTitle) {
        // Show styled confirmation modal
        this.showConfirmationModal(
            'Delete Document',
            `Are you sure you want to delete "${docTitle}"?\n\nThis action cannot be undone.`,
            () => this.deleteDocument(docId, docTitle)
        );
    }

    async deleteDocument(docId, docTitle) {
        const token = localStorage.getItem('access_token');
        
        try {
            const response = await fetch(`/documents/${docId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (await this.handleAuthError(response)) {
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to delete document');
            }

            this.showFloatingNotification('success', `Document "${docTitle}" deleted successfully`);
            await this.loadDocuments();
            
            if (this.currentDocument && this.currentDocument.id === docId) {
                this.closeEditor();
            }
            
        } catch (error) {
            this.showFloatingNotification('error', `Failed to delete document: ${error.message}`);
        }
    }

    createEmptyFileFormData(filename) {
        const formData = new FormData();
        const emptyFile = new Blob([''], { type: 'text/plain' });
        formData.append('file', emptyFile, filename);
        return formData;
    }

    // Modal and Notification Functions
    initializeModals() {
        // Confirmation modal
        const confirmationModal = document.getElementById('confirmationModal');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const modalCancelBtn = document.getElementById('modalCancelBtn');
        const modalConfirmBtn = document.getElementById('modalConfirmBtn');

        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => this.hideConfirmationModal());
        }
        if (modalCancelBtn) {
            modalCancelBtn.addEventListener('click', () => this.hideConfirmationModal());
        }
        if (modalConfirmBtn) {
            modalConfirmBtn.addEventListener('click', () => {
                if (this.confirmationCallback) {
                    this.confirmationCallback();
                    this.hideConfirmationModal();
                }
            });
        }

        // Rename modal
        const renameModal = document.getElementById('renameModal');
        const renameCloseBtn = document.getElementById('renameCloseBtn');
        const renameCancelBtn = document.getElementById('renameCancelBtn');
        const renameConfirmBtn = document.getElementById('renameConfirmBtn');
        const newDocumentNameInput = document.getElementById('newDocumentName');

        if (renameCloseBtn) {
            renameCloseBtn.addEventListener('click', () => this.hideRenameModal());
        }
        if (renameCancelBtn) {
            renameCancelBtn.addEventListener('click', () => this.hideRenameModal());
        }
        if (renameConfirmBtn) {
            renameConfirmBtn.addEventListener('click', () => {
                const newName = newDocumentNameInput.value;
                if (this.renameCallback) {
                    this.renameCallback(newName);
                    this.hideRenameModal();
                }
            });
        }

        // Create document modal
        const createModal = document.getElementById('createDocumentModal');
        const createCloseBtn = document.getElementById('createCloseBtn');
        const createCancelBtn = document.getElementById('createCancelBtn');
        const createConfirmBtn = document.getElementById('createConfirmBtn');
        const createDocumentNameInput = document.getElementById('createDocumentName');

        if (createCloseBtn) {
            createCloseBtn.addEventListener('click', () => this.hideCreateDocumentModal());
        }
        if (createCancelBtn) {
            createCancelBtn.addEventListener('click', () => this.hideCreateDocumentModal());
        }
        if (createConfirmBtn) {
            createConfirmBtn.addEventListener('click', () => {
                const filename = createDocumentNameInput.value;
                if (!filename || filename.trim() === '') {
                    this.generateAndCreateAutoFilename();
                } else {
                    const cleanFilename = filename.trim();
                    const finalFilename = cleanFilename.endsWith('.txt') ? cleanFilename : cleanFilename + '.txt';
                    this.checkFilenameAndCreate(finalFilename);
                }
                this.hideCreateDocumentModal();
            });
        }

        // Floating notification
        const notificationCloseBtn = document.getElementById('notificationCloseBtn');
        if (notificationCloseBtn) {
            notificationCloseBtn.addEventListener('click', () => this.hideFloatingNotification());
        }

        // Close modals when clicking outside
        if (confirmationModal) {
            confirmationModal.addEventListener('click', (e) => {
                if (e.target === confirmationModal) {
                    this.hideConfirmationModal();
                }
            });
        }
        if (renameModal) {
            renameModal.addEventListener('click', (e) => {
                if (e.target === renameModal) {
                    this.hideRenameModal();
                }
            });
        }
        if (createModal) {
            createModal.addEventListener('click', (e) => {
                if (e.target === createModal) {
                    this.hideCreateDocumentModal();
                }
            });
        }
    }

    showConfirmationModal(title, message, callback) {
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        
        if (modalTitle) modalTitle.textContent = title;
        if (modalMessage) modalMessage.textContent = message;
        
        this.confirmationCallback = callback;
        document.getElementById('confirmationModal').style.display = 'flex';
    }

    hideConfirmationModal() {
        document.getElementById('confirmationModal').style.display = 'none';
        this.confirmationCallback = null;
    }

    showRenameModal(currentName, callback) {
        const newDocumentNameInput = document.getElementById('newDocumentName');
        if (newDocumentNameInput) {
            newDocumentNameInput.value = currentName.replace('.txt', '');
            newDocumentNameInput.select();
        }
        
        this.renameCallback = callback;
        document.getElementById('renameModal').style.display = 'flex';
    }

    hideRenameModal() {
        document.getElementById('renameModal').style.display = 'none';
        this.renameCallback = null;
    }

    showCreateDocumentStyledModal() {
        const createDocumentNameInput = document.getElementById('createDocumentName');
        if (createDocumentNameInput) {
            createDocumentNameInput.value = '';
            createDocumentNameInput.focus();
        }
        
        document.getElementById('createDocumentModal').style.display = 'flex';
    }

    hideCreateDocumentModal() {
        document.getElementById('createDocumentModal').style.display = 'none';
    }

    showFloatingNotification(type, message, duration = 5000) {
        // Add to queue if there's already a notification showing
        const notification = document.getElementById('floatingNotification');
        if (notification && notification.style.display === 'block') {
            this.notificationQueue.push({ type, message, duration });
            return;
        }
        
        this._displayNotification(type, message, duration);
    }
    
    _displayNotification(type, message, duration) {
        const notification = document.getElementById('floatingNotification');
        const notificationMessage = document.getElementById('notificationMessage');
        
        if (notification && notificationMessage) {
            notification.className = `floating-notification ${type}`;
            notificationMessage.textContent = message;
            notification.style.display = 'block';
            notification.style.animation = 'notificationSlideIn 0.3s ease-out';
            
            // Auto-hide after specified duration
            this.notificationTimeout = setTimeout(() => {
                this.hideFloatingNotification();
            }, duration);
        }
    }

    hideFloatingNotification() {
        // Clear any pending notification timeout
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
            this.notificationTimeout = null;
        }
        
        const notification = document.getElementById('floatingNotification');
        if (notification) {
            // Disappear instantly instead of sliding out
                notification.style.display = 'none';
            
            // Process next notification in queue if any
            if (this.notificationQueue.length > 0) {
                const nextNotification = this.notificationQueue.shift();
                setTimeout(() => {
                    this._displayNotification(nextNotification.type, nextNotification.message, nextNotification.duration);
                }, 100);
            }
        }
    }

    renameDocumentPrompt(docId, currentName) {
        // Show styled rename modal
        this.showRenameModal(currentName, (newName) => {
            if (!newName || newName.trim() === '' || newName === currentName) {
                return;
            }

            const cleanNewName = newName.trim();
            const fullNewName = cleanNewName.endsWith('.txt') ? cleanNewName : cleanNewName + '.txt';
            
            this.renameDocument(docId, currentName, fullNewName);
        });
    }

    async renameDocument(docId, currentName, newName) {
        const token = localStorage.getItem('access_token');
        
        try {
            const checkResponse = await fetch(`/documents/check-filename/${encodeURIComponent(newName)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (await this.handleAuthError(checkResponse)) {
                return false;
            }

            const checkResult = await checkResponse.json();
            
            if (checkResult.exists) {
                this.showFloatingNotification('error', `Filename "${newName}" already exists. Please choose a different name.`);
                return false;
            }

            const updateResponse = await fetch(`/documents/${docId}/rename`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: newName })
            });

            if (await this.handleAuthError(updateResponse)) {
                return false;
            }

            if (updateResponse.ok) {
                this.showFloatingNotification('success', `Document renamed to "${newName}" successfully!`);
                await this.loadDocuments();
                return true;
            } else {
                const result = await updateResponse.json();
                this.showFloatingNotification('error', result.detail || 'Failed to rename document');
                return false;
            }

        } catch (error) {
            this.showFloatingNotification('error', 'Connection error. Please try again.');
            return false;
        }
    }

    // ==================== NEW CBC COACHLM STYLE METHODS ====================
    
    // Upload Modal Methods
    showUploadModal() {
        if (this.uploadModal) {
            this.uploadModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    hideUploadModal() {
        if (this.uploadModal) {
            this.uploadModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            // Reset form
            if (this.form) {
                this.form.reset();
            }
            if (this.feedbackDiv) {
                this.feedbackDiv.textContent = '';
                this.feedbackDiv.className = 'feedback-message';
            }
        }
    }
    
    // View Toggle Methods
    initializeViewToggle() {
        // Set initial active state for grid view
        this.toggleView('grid');
    }
    
    toggleView(view) {
        // Always update the current view, even if it's the same
        this.currentView = view;
        
        // Update view buttons and checkmark icons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
            // Hide checkmark for inactive buttons
            const checkIcon = btn.querySelector('.check-icon');
            if (checkIcon) {
                checkIcon.style.display = 'none';
            }
        });
        
        const activeBtn = document.querySelector(`[data-view="${view}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            // Show checkmark for active button
            const activeCheckIcon = activeBtn.querySelector('.check-icon');
            if (activeCheckIcon) {
                activeCheckIcon.style.display = 'inline-block';
            }
        }
        
        // Toggle views
        const gridView = document.getElementById('documentsGrid');
        const listView = document.getElementById('documentsListView');
        
        if (view === 'grid') {
            if (gridView) gridView.style.display = 'grid';
            if (listView) listView.style.display = 'none';
            this.renderDocumentsGrid();
        } else {
            if (gridView) gridView.style.display = 'none';
            if (listView) listView.style.display = 'block';
            this.renderDocumentsList();
        }
    }
    
    // Sort Methods
    toggleSortDropdown() {
        if (this.sortDropdown) {
            const isVisible = this.sortDropdown.style.display !== 'none';
            this.sortDropdown.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    selectSort(sortType) {
        this.currentSort = sortType;
        
        // Update sort text
        if (this.sortText) {
            const sortLabels = {
                'recent': 'Most recent',
                'title': 'Title',
                'size': 'Size'
            };
            this.sortText.textContent = sortLabels[sortType] || 'Most recent';
        }
        
        // Hide dropdown
        if (this.sortDropdown) {
            this.sortDropdown.style.display = 'none';
        }
        
        // Sort and re-render documents
        this.sortDocuments();
        if (this.currentView === 'grid') {
            this.renderDocumentsGrid();
        } else {
            this.renderDocumentsList();
        }
    }
    
    sortDocuments() {
        if (!this.documents) return;
        
        this.documents.sort((a, b) => {
            switch (this.currentSort) {
                case 'title':
                    // Case-insensitive alphabetical sort
                    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
                case 'size':
                    // Largest to smallest
                    return (b.size || 0) - (a.size || 0);
                case 'recent':
                default:
                    // Most recently created first
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });
    }
    
    // Settings Dropdown Methods
    toggleSettingsDropdown() {
        if (this.settingsDropdown) {
            const isVisible = this.settingsDropdown.style.display !== 'none';
            this.settingsDropdown.style.display = isVisible ? 'none' : 'block';
            // Hide theme dropdown when settings is toggled
            if (this.themeDropdown) {
                this.themeDropdown.style.display = 'none';
            }
        }
    }
    
    toggleThemeDropdown() {
        if (this.themeDropdown) {
            const isVisible = this.themeDropdown.style.display !== 'none';
            this.themeDropdown.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    async selectTheme(theme) {
        try {
            // Save theme to database
            const token = localStorage.getItem('access_token');
            const response = await fetch('/auth/user-theme', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ theme: theme })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save theme preference');
            }
            
            // Apply theme locally
            this.applyTheme(theme);
            
            // Hide dropdown
            if (this.themeDropdown) {
                this.themeDropdown.style.display = 'none';
            }
            if (this.settingsDropdown) {
                this.settingsDropdown.style.display = 'none';
            }
            
            this.showFloatingNotification('success', `Theme changed to ${theme} mode`);
            
        } catch (error) {
            this.showFloatingNotification('error', 'Failed to save theme preference');
        }
    }
    
    applyTheme(theme) {
        // Apply theme using data attribute (proper way)
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update CSS custom properties for theme colors
        this.updateThemeColors(theme);
    }
    
    updateThemeColors(theme) {
        const root = document.documentElement;
        
        if (theme === 'light') {
            // Light theme colors
            root.style.setProperty('--dark-bg', '#ffffff');
            root.style.setProperty('--dark-surface', '#f8f9fa');
            root.style.setProperty('--dark-surface-high', '#e9ecef');
            root.style.setProperty('--dark-text', '#212529');
            root.style.setProperty('--dark-text-secondary', '#6c757d');
            root.style.setProperty('--dark-border', '#dee2e6');
        } else {
            // Dark theme colors (default)
            root.style.setProperty('--dark-bg', '#1f1f1f');
            root.style.setProperty('--dark-surface', '#2d2d2d');
            root.style.setProperty('--dark-surface-high', '#3a3a3a');
            root.style.setProperty('--dark-text', '#ffffff');
            root.style.setProperty('--dark-text-secondary', '#9aa0a6');
            root.style.setProperty('--dark-border', '#3c4043');
        }
    }
    
    
    // Navigation Tab Methods (simplified - only one tab now)
    selectNavTab(tab) {
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(t => {
            t.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Update section title
        const sectionTitle = document.querySelector('.section-title');
        if (sectionTitle) {
            sectionTitle.textContent = 'Documents';
        }
        
        // Load documents (no filtering needed for single tab)
        this.loadDocuments();
    }
    
    // Outside Click Handler
    handleOutsideClick(event) {
        // Close settings dropdown
        if (this.settingsDropdown && !this.settingsBtn.contains(event.target) && !this.settingsDropdown.contains(event.target)) {
            this.settingsDropdown.style.display = 'none';
        }
        
        // Close theme dropdown
        if (this.themeDropdown && !this.themeOption.contains(event.target) && !this.themeDropdown.contains(event.target)) {
            this.themeDropdown.style.display = 'none';
        }
        
        // Close sort dropdown
        if (this.sortDropdown && !this.sortBtn.contains(event.target) && !this.sortDropdown.contains(event.target)) {
            this.sortDropdown.style.display = 'none';
        }
    }
    
    // User Avatar - Show profile picture or initials
    updateUserAvatar(userData) {
        if (this.userAvatar && userData) {
            // Calculate initials first (as fallback)
            let initials = 'U';
            if (userData.first_name && userData.last_name) {
                initials = userData.first_name.charAt(0).toUpperCase() + userData.last_name.charAt(0).toUpperCase();
            } else if (userData.first_name) {
                initials = userData.first_name.charAt(0).toUpperCase();
            } else if (userData.email) {
                initials = userData.email.charAt(0).toUpperCase();
            }
            
            // Check if user has a profile picture from Google OAuth
            if (userData.profile_picture) {
                // Show profile picture with error fallback
                const img = document.createElement('img');
                img.src = userData.profile_picture;
                img.alt = 'Profile';
                img.className = 'user-profile-img';
                
                // Fallback to initials if image fails to load
                img.onerror = () => {
                    this.userAvatar.innerHTML = `<span id="userInitials">${initials}</span>`;
                };
                
                this.userAvatar.innerHTML = '';
                this.userAvatar.appendChild(img);
            } else {
                // Show initials
                this.userAvatar.innerHTML = `<span id="userInitials">${initials}</span>`;
            }
        }
    }
    
    // Render Methods for Grid and List Views
    renderDocumentsGrid() {
        const container = document.getElementById('documentsGrid');
        if (!container || !this.documents) return;
        
        // Clear existing documents (keep create card)
        const createCard = container.querySelector('.create-card');
        container.innerHTML = '';
        if (createCard) {
            container.appendChild(createCard);
        }
        
        // Render document cards
        this.documents.forEach(doc => {
            const card = this.createDocumentCard(doc);
            container.appendChild(card);
        });
        
        // Ensure all icons are initialized after rendering
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ icons: lucide.icons });
            }
        }, 50);
    }
    
    renderDocumentsList() {
        const container = document.getElementById('documentsListContent');
        if (!container || !this.documents) return;
        
        container.innerHTML = '';
        
        // Render list items
        this.documents.forEach(doc => {
            const item = this.createDocumentListItem(doc);
            container.appendChild(item);
        });
        
        // Ensure all icons are initialized after rendering
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ icons: lucide.icons });
            }
        }, 50);
    }
    
    createDocumentCard(doc) {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.dataset.id = doc.id;
        
        const sizeKB = Math.round((doc.size || 0) / 1024);
        const createdDate = new Date(doc.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        card.innerHTML = `
            <div class="card-actions">
                <button class="card-menu-btn" onclick="event.stopPropagation(); window.documentManager.toggleCardMenu(this)">
                    <i data-lucide="more-vertical"></i>
                </button>
                <div class="card-menu" style="display: none;">
                    <div class="dropdown-item" onclick="event.stopPropagation(); window.documentManager.renameDocumentPrompt(${doc.id}, '${doc.title.replace(/'/g, "\\'")}')">
                        <i data-lucide="edit"></i>
                        <span>Rename</span>
                    </div>
                    <div class="dropdown-item" onclick="event.stopPropagation(); window.documentManager.deleteDocumentPrompt(${doc.id}, '${doc.title.replace(/'/g, "\\'")}')">
                        <i data-lucide="trash-2"></i>
                        <span>Delete</span>
                    </div>
                </div>
            </div>
            <div class="card-icon" style="background-color: var(--v2-icon-primary);">
                <i data-lucide="file-text"></i>
            </div>
            <div class="card-title">${this.escapeHtml(doc.title)}</div>
            <div class="card-meta">${createdDate} · ${sizeKB} KB</div>
        `;
        
        // Add click handler
        card.addEventListener('click', () => {
            this.loadDocument(doc.id, doc.title);
        });
        
        // Initialize icons after a small delay to ensure DOM is ready
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ icons: lucide.icons });
            }
        }, 10);
        
        return card;
    }
    
    createDocumentListItem(doc) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.dataset.id = doc.id;
        
        const sizeKB = Math.round((doc.size || 0) / 1024);
        const createdDate = new Date(doc.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        item.innerHTML = `
            <div class="item-title">
                <div class="item-icon" style="background-color: var(--v2-icon-primary);">
                    <i data-lucide="file-text"></i>
                </div>
                ${this.escapeHtml(doc.title)}
            </div>
            <div class="item-meta">${sizeKB} KB</div>
            <div class="item-meta">${createdDate}</div>
            <div class="item-actions">
                <button class="card-menu-btn" onclick="event.stopPropagation(); window.documentManager.toggleCardMenu(this)">
                    <i data-lucide="more-vertical"></i>
                </button>
                <div class="card-menu" style="display: none;">
                    <div class="dropdown-item" onclick="event.stopPropagation(); window.documentManager.renameDocumentPrompt(${doc.id}, '${doc.title.replace(/'/g, "\\'")}')">
                        <i data-lucide="edit"></i>
                        <span>Rename</span>
                    </div>
                    <div class="dropdown-item" onclick="event.stopPropagation(); window.documentManager.deleteDocumentPrompt(${doc.id}, '${doc.title.replace(/'/g, "\\'")}')">
                        <i data-lucide="trash-2"></i>
                        <span>Delete</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add click handler
        item.addEventListener('click', () => {
            this.loadDocument(doc.id, doc.title);
        });
        
        // Initialize icons after a small delay to ensure DOM is ready
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ icons: lucide.icons });
            }
        }, 10);
        
        return item;
    }
    
    toggleCardMenu(button) {
        const menu = button.nextElementSibling;
        const isVisible = menu.style.display !== 'none';
        
        // Close all other menus
        document.querySelectorAll('.card-menu').forEach(m => {
            m.style.display = 'none';
        });
        
        // Toggle this menu
        menu.style.display = isVisible ? 'none' : 'block';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showEmptyState() {
        const gridView = document.getElementById('documentsGrid');
        const listView = document.getElementById('documentsListView');
        
        const emptyStateHTML = `
            <div class="empty-state">
            </div>
        `;
        
        if (this.currentView === 'grid') {
            if (gridView) {
                const createCard = gridView.querySelector('.create-card');
                gridView.innerHTML = '';
                if (createCard) {
                    gridView.appendChild(createCard);
                }
                gridView.insertAdjacentHTML('beforeend', emptyStateHTML);
            }
        } else {
            if (listView) {
                const listContent = document.getElementById('documentsListContent');
                if (listContent) {
                    listContent.innerHTML = emptyStateHTML;
                }
            }
        }
        
        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ icons: lucide.icons });
        }
    }
    
    // Profile Modal Methods
    showProfileModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        
        // Hide settings dropdown
        if (this.settingsDropdown) {
            this.settingsDropdown.style.display = 'none';
        }
        
        // Populate modal with current user data
        const userData = window.userData;
        if (userData) {
            // Update profile picture/initials
            const profileImgContainer = document.getElementById('settingsProfileImgContainer');
            const profileInitials = document.getElementById('settingsProfileInitials');
            const profileEmail = document.getElementById('settingsProfileEmail');
            
            if (userData.profile_picture) {
                profileImgContainer.innerHTML = `<img src="${userData.profile_picture}" alt="Profile" onerror="this.parentElement.innerHTML='<span class=\\'profile-initials\\'>${this.getUserInitials(userData)}</span>'">`;
            } else {
                profileInitials.textContent = this.getUserInitials(userData);
            }
            
            profileEmail.textContent = userData.email;
            
            // Update name fields
            document.getElementById('firstNameDisplay').textContent = userData.first_name || '';
            document.getElementById('lastNameDisplay').textContent = userData.last_name || '';
            document.getElementById('settingsFirstName').value = userData.first_name || '';
            document.getElementById('settingsLastName').value = userData.last_name || '';
            document.getElementById('settingsEmailField').textContent = userData.email;
        }
        
        modal.style.display = 'flex';
        
        // Initialize Lucide icons after modal is shown
        setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        }, 10);
    }
    
    hideProfileModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
            // Reset to non-editing state
            this.cancelFieldEdit();
        }
    }
    
    getUserInitials(userData) {
        if (!userData) return 'U';
        if (userData.first_name && userData.last_name) {
            return (userData.first_name.charAt(0) + userData.last_name.charAt(0)).toUpperCase();
        }
        if (userData.email) {
            return userData.email.charAt(0).toUpperCase();
        }
        return 'U';
    }
    
    enableFieldEdit(field) {
        // Show input, hide display text, show save button
        document.getElementById(`${field}Display`).style.display = 'none';
        document.getElementById(`settings${this.capitalize(field)}`).style.display = 'block';
        document.getElementById('settingsSaveBtn').style.display = 'flex';
        
        // Focus on input
        setTimeout(() => {
            document.getElementById(`settings${this.capitalize(field)}`).focus();
        }, 10);
    }
    
    cancelFieldEdit() {
        // Hide all inputs, show all display texts, hide save button
        document.querySelectorAll('.edit-input').forEach(input => input.style.display = 'none');
        document.querySelectorAll('.display-text').forEach(display => display.style.display = 'block');
        document.getElementById('settingsSaveBtn').style.display = 'none';
    }
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    async saveProfile() {
        const firstName = document.getElementById('settingsFirstName').value.trim();
        const lastName = document.getElementById('settingsLastName').value.trim();
        
        if (!firstName || !lastName) {
            this.showFloatingNotification('error', 'Both first and last name are required');
            return;
        }
        
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('/auth/user-profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to save profile');
            }
            
            // Update local user data
            window.userData.first_name = firstName;
            window.userData.last_name = lastName;
            
            // Update UI
            this.updateUserAvatar(window.userData);
            
            // Update modal displays
            document.getElementById('firstNameDisplay').textContent = firstName;
            document.getElementById('lastNameDisplay').textContent = lastName;
            
            // Hide save button
            document.getElementById('settingsSaveBtn').style.display = 'none';
            
            this.showFloatingNotification('success', 'Profile updated successfully');
            
        } catch (error) {
            this.showFloatingNotification('error', error.message || 'Failed to save profile');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.documentManager = new DocumentManager();
    
    // If userData is already loaded, update avatar immediately
    if (window.userData) {
        window.documentManager.updateUserAvatar(window.userData);
        if (window.userData.theme) {
            window.documentManager.applyTheme(window.userData.theme);
        }
    }
});