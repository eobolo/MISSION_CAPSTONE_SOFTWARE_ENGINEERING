// Cache-busting comment - v2.0 - Professional Fortune 500 Dashboard
class DocumentManager {
    constructor() {
        this.form = document.getElementById('documentUploadForm');
        this.fileInput = document.getElementById('documentFile');
        this.feedbackDiv = document.getElementById('uploadFeedback');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.quillEditor = null;
        this.currentDocument = null;
        this.autoSaveTimeout = null;
        this.lastSavedContent = '';
        this.documentChunks = [];
        this.selectedChunk = null;
        this.reSplitTimeout = null;
        this.lastSplitContent = '';
        this.init();
    }

    async init() {
        // Check for authentication
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        this.bindEvents();
        this.initializeFeedbackModal();
        this.initializeTeacherCorrectionForm();
        this.initializeFileManagement();
        this.initializeModals();
        // Note: loadDocuments() will be called manually after user data is loaded
        
        // Initialize Lucide icons after DOM is ready
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
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
                     documentUpElement.style.display = 'grid';
                 }
                 if (createNewDocumentHeroElement) {
                     createNewDocumentHeroElement.style.display = 'block';
                 }
            });
        }
        
        if (saveDocumentBtn) {
            saveDocumentBtn.addEventListener('click', () => this.saveDocument());
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // File drag and drop
        this.initializeDragAndDrop();
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

    validateFile() {
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
            
            // File is valid, show preview and selection message
            this.showFilePreview(file);
            this.showFloatingNotification('success', `File "${file.name}" selected and ready for upload`);
            return true;
        }
        this.hideFilePreview();
        return false;
    }

    async showFilePreview(file) {
        try {
            // Read file content for preview
            const text = await this.readFileAsText(file);
            const preview = text.length > 300 ? text.substring(0, 300) + '...' : text;
            
            // Create or update file preview
            let previewContainer = document.getElementById('filePreviewContainer');
            if (!previewContainer) {
                previewContainer = document.createElement('div');
                previewContainer.id = 'filePreviewContainer';
                previewContainer.className = 'file-preview-container';
                
                // Insert after the upload form
                const uploadSection = document.querySelector('.upload-section');
                if (uploadSection) {
                    uploadSection.insertAdjacentElement('afterend', previewContainer);
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
                lucide.createIcons();
            }
            
        } catch (error) {
            console.error('Error reading file for preview:', error);
            this.showFloatingNotification('error', 'Could not preview file content');
        }
    }

    hideFilePreview() {
        const previewContainer = document.getElementById('filePreviewContainer');
        if (previewContainer) {
            previewContainer.remove();
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
        const listElement = document.getElementById('documentsList');
        const loadingElement = document.getElementById('documentsLoading');
        const errorElement = document.getElementById('documentsError');

        if (!listElement) {
            console.error('Critical DOM element documentsList not found');
            return;
        }

        // Show loading state
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
        if (errorElement) {
            errorElement.style.display = 'none';
        }

        try {
            console.log('Loading documents...');
            
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
            
            if (documents.length === 0) {
                listElement.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="file-text"></i>
                        <p>No documents uploaded yet.</p>
                        <small>Create your first document to get started</small>
                    </div>
                `;
            } else {
            listElement.innerHTML = documents.map(doc => `
                    <div class="document-item fade-in" data-id="${doc.id}">
                        <div class="document-info">
                    <div class="document-title">${this.escapeHtml(doc.title)}</div>
                    <div class="document-date">
                                <i data-lucide="calendar"></i>
                                ${new Date(doc.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </div>
                        </div>
                        <div class="document-actions">
                            <button class="rename-btn" onclick="window.documentManager.renameDocumentPrompt(${doc.id}, '${this.escapeHtml(doc.title)}')" title="Rename document">
                                <i data-lucide="edit-2"></i>
                            </button>
                            <button class="delete-btn" onclick="window.documentManager.deleteDocumentPrompt(${doc.id}, '${this.escapeHtml(doc.title)}')" title="Delete document">
                                <i data-lucide="trash-2"></i>
                            </button>
                    </div>
                </div>
            `).join('');
            }

            // Add click event listeners to document items
            this.addDocumentClickListeners();

            // Refresh Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

        } catch (error) {
            console.error('Error loading documents:', error);
            
            let errorMessage = 'Failed to load documents';
            if (error.name === 'AbortError') {
                errorMessage = 'Request timed out. Please check your connection and try again.';
            } else if (error.message.includes('fetch')) {
                errorMessage = 'Connection error. Please check your internet connection.';
            }
            
            if (errorElement) {
                errorElement.innerHTML = `
                    <div class="error-content">
                        <i data-lucide="alert-circle"></i>
                        <p>${errorMessage}</p>
                        <button onclick="window.documentManager.loadDocuments()" class="btn-secondary btn-sm">
                            <i data-lucide="refresh-cw"></i>
                            Try Again
                        </button>
                    </div>
                `;
            errorElement.style.display = 'block';
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
        if (!this.validateFile()) return;

        const file = this.fileInput.files[0];
        const filename = file.name;

        console.log('About to check if filename exists:', filename);
        const filenameExists = await this.checkFilenameExists(filename);
        console.log('Filename exists check result:', filenameExists);
        
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
            console.log('Upload response:', response.status, result);

            if (response.ok) {
                this.showFloatingNotification('success', 'Document uploaded successfully!');
                this.form.reset();
                this.hideFilePreview(); // Clear the preview after successful upload
                await this.loadDocuments();
            } else {
                console.log('Upload failed:', response.status, result.detail);
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
            console.error('Upload error:', error);
            this.showFloatingNotification('error', 'Connection error. Please try again.');
        } finally {
            this.uploadBtn.disabled = false;
            this.uploadBtn.innerHTML = `
                <i data-lucide="upload"></i>
                <span>Upload Document</span>
            `;
        }
    }

    showFeedback(type, message) {
        this.feedbackDiv.className = `feedback-message ${type}`;
        this.feedbackDiv.innerHTML = `
            <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}"></i>
            <span>${message}</span>
        `;
        
        // Refresh icons for the new feedback
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
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
            console.warn('Quill editor element not found');
            return;
        }

        if (this.quillEditor) {
            console.log('Quill editor already initialized, skipping...');
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
                this.scheduleReSplit();
            }
        });

        // Listen for selection changes
        this.quillEditor.on('selection-change', () => {
            const currentContent = this.quillEditor.getText();
            if (this.lastSplitContent !== currentContent) {
                this.scheduleReSplit();
                this.updateSizeIndicator();
            }
        });

        // Listen for keyboard events
        this.quillEditor.root.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
                setTimeout(() => {
                    this.scheduleReSplit();
                    this.updateSizeIndicator();
                }, 10);
            }
        });

        this.startContentPolling();
        this.startMutationObserver();

        console.log('Quill editor initialized successfully');
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
                    
                    if (this.lastPolledContent.trim() && this.documentChunks.length === 0) {
                        this.lastSplitContent = '';
                        this.performReSplit();
                    } else {
                        this.scheduleReSplit();
                    }
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
                    const currentContent = this.quillEditor.getText();
                    if (currentContent.trim() && this.documentChunks.length === 0) {
                        this.lastSplitContent = '';
                        this.performReSplit();
                    } else {
                        this.scheduleReSplit();
                    }
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
        this.feedbackModal = document.getElementById('feedbackModal');
        this.feedbackModalTitle = document.getElementById('feedbackModalTitle');
        this.originalText = document.getElementById('originalText');
        this.correctedText = document.getElementById('correctedText');
        this.feedbackContent = document.getElementById('feedbackContent');
        
        this.makeModalDraggable();
        
        // Bind modal events
        document.getElementById('closeFeedbackBtn').addEventListener('click', () => this.hideFeedbackModal());
        document.getElementById('minimizeFeedbackBtn').addEventListener('click', () => this.toggleMinimizeModal());
        document.getElementById('insertFeedbackBtn').addEventListener('click', () => this.insertCorrectedText());
        document.getElementById('dismissFeedbackBtn').addEventListener('click', () => this.hideFeedbackModal());
        
        // Bind translation events
        document.getElementById('translateOriginalBtn').addEventListener('click', () => this.translateText('original', 'kinyarwanda'));
        document.getElementById('translateCorrectedBtn').addEventListener('click', () => this.translateText('corrected', 'kinyarwanda'));
        document.getElementById('translateFeedbackBtn').addEventListener('click', () => this.translateText('feedback', 'kinyarwanda'));
        document.getElementById('translateOriginalEnBtn').addEventListener('click', () => this.translateText('original', 'english'));
        document.getElementById('translateCorrectedEnBtn').addEventListener('click', () => this.translateText('corrected', 'english'));
        document.getElementById('translateFeedbackEnBtn').addEventListener('click', () => this.translateText('feedback', 'english'));
    }

    makeModalDraggable() {
        const modal = this.feedbackModal;
        if (!modal) {
            console.warn('Feedback modal not found for dragging');
            return;
        }

        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX = 0;
        let initialY = 0;
        let xOffset = 0;
        let yOffset = 0;

        // Define draggable areas - multiple sections for better UX
        const draggableAreas = [
            modal.querySelector('.modal-header'),           // Header (original)
            modal.querySelector('.modal-title'),            // Title area
            ...modal.querySelectorAll('.section-header'),   // All section headers (spread operator)
            modal.querySelector('.translation-section .section-header') // Translation header
        ].filter(Boolean); // Remove nulls

        console.log('Draggable areas found:', draggableAreas.length, draggableAreas);

        // Add drag event listeners to all draggable areas
        draggableAreas.forEach((area, index) => {
            if (area) {
                console.log(`Adding drag listener to area ${index}:`, area);
                area.addEventListener('mousedown', dragStart);
                // Add visual feedback
                area.style.cursor = 'move';
                area.title = 'Drag to move modal';
            }
        });

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            console.log('dragStart called on:', e.target);
            
            // Check if clicked area is draggable
            const isDraggableArea = draggableAreas.some(area => 
                area && (area === e.target || area.contains(e.target))
            );

            console.log('Is draggable area:', isDraggableArea);

            if (!isDraggableArea) return;

            // Don't start drag if clicking on buttons or interactive elements
            if (e.target.tagName === 'BUTTON' || 
                e.target.closest('button') || 
                e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' ||
                e.target.tagName === 'I') {
                console.log('Clicked on interactive element, not dragging');
                return;
            }

            console.log('Starting drag...');
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            isDragging = true;
            modal.classList.add('dragging');
            
            // Prevent text selection while dragging
            e.preventDefault();
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                modal.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
            }
        }

        function dragEnd(e) {
            if (isDragging) {
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
                modal.classList.remove('dragging');
            }
        }
    }

    showFeedbackModal(title, originalText, correctedText, feedback) {
        this.feedbackModalTitle.textContent = title;
        this.originalText.textContent = originalText;
        this.correctedText.textContent = correctedText;
        this.feedbackContent.textContent = feedback;
        
        this.originalCorrectedText = correctedText;
        this.originalOriginalText = originalText;
        this.originalFeedbackText = feedback;
        
        // Reset modal position when showing
        this.feedbackModal.style.transform = 'translate3d(0px, 0px, 0)';
        this.feedbackModal.style.display = 'block';
        this.feedbackModal.classList.remove('minimized');
        this.feedbackModal.classList.add('fade-in');
        
        // Re-initialize dragging in case modal was recreated
        this.makeModalDraggable();
    }

    hideFeedbackModal() {
        this.feedbackModal.style.display = 'none';
        this.feedbackModal.classList.remove('fade-in');
    }

    toggleMinimizeModal() {
        this.feedbackModal.classList.toggle('minimized');
    }

    insertCorrectedText() {
        if (!this.selectedChunk || !this.quillEditor) {
            console.warn('No chunk selected or editor not available');
            return;
        }

        const correctedText = this.originalCorrectedText || this.correctedText.textContent;
        const chunkIndex = this.selectedChunk.index;
        
        const plainText = this.quillEditor.getText();
        const currentChunks = this.createChunks(plainText);
        
        if (chunkIndex < currentChunks.length) {
            const chunk = currentChunks[chunkIndex];
            
            const beforeChunk = plainText.substring(0, chunk.start);
            const afterChunk = plainText.substring(chunk.end);
            
            const newText = beforeChunk + correctedText + afterChunk;
            
            this.quillEditor.setText('');
            this.quillEditor.insertText(0, newText);
            
            this.autoSplitDocument();
            this.scheduleAutoSave();
            
            this.hideFeedbackModal();
            this.showEditorFeedback('success', 'Correction applied successfully');
        } else {
            console.error('Chunk index out of range');
        }
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
            this.autoSplitDocument();

        } catch (error) {
            console.error('Error loading document:', error);
            editorLoading.style.display = 'none';
            
            // Use floating notification instead of inline error
            this.showFloatingNotification('error', 'Failed to load document. Please try again.');
            
            // Hide the editor section on error
            if (editorSection) {
                editorSection.style.display = 'none';
            }
        }
    }

    closeEditor() {
        const editorSection = document.getElementById('documentEditorSection');
        const documentItems = document.querySelectorAll('.document-item');
        
        editorSection.style.display = 'none';
        this.currentDocument = null;
        this.documentChunks = [];
        this.selectedChunk = null;
        this.lastSplitContent = '';
        
        if (this.reSplitTimeout) {
            clearTimeout(this.reSplitTimeout);
            this.reSplitTimeout = null;
        }
        
        if (this.quillEditor) {
            this.quillEditor.setContents([]);
        }
        this.stopContentPolling();
        this.stopMutationObserver();
        
        documentItems.forEach(item => item.classList.remove('selected'));
    }

    async saveDocument() {
        if (!this.currentDocument || !this.quillEditor) {
            console.warn('No document loaded or editor not initialized');
            return;
        }

        const token = localStorage.getItem('access_token');
        const saveBtn = document.getElementById('saveDocumentBtn');
        const originalContent = saveBtn.innerHTML;

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `
                <i data-lucide="loader-2" class="animate-spin"></i>
                Saving...
            `;

            const htmlContent = this.quillEditor.root.innerHTML;
            
            const response = await fetch(`/documents/${this.currentDocument.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: htmlContent
                })
            });

            if (await this.handleAuthError(response)) {
                return;
            }

            if (response.ok) {
                this.showEditorFeedback('success', 'Document saved successfully!');
                this.lastSavedContent = this.quillEditor.root.innerHTML;
            } else {
                const result = await response.json();
                this.showEditorFeedback('error', result.detail || 'Failed to save document');
            }

        } catch (error) {
            console.error('Error saving document:', error);
            this.showEditorFeedback('error', 'Connection error. Please try again.');
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
            lucide.createIcons();
        }
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.remove();
            }
        }, 3000);
    }

    getPlainTextFromEditor() {
        if (!this.quillEditor) return '';
        return this.quillEditor.getText();
    }

    getRichTextFromEditor() {
        if (!this.quillEditor) return '';
        return this.quillEditor.root.innerHTML;
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

    async performAutoSave() {
        if (!this.currentDocument || !this.quillEditor) {
            return;
        }

        const currentContent = this.quillEditor.root.innerHTML;
        
        if (currentContent === this.lastSavedContent) {
            return;
        }

        const token = localStorage.getItem('access_token');
        
        try {
            const response = await fetch(`/documents/${this.currentDocument.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: currentContent
                })
            });

            if (response.ok) {
                this.lastSavedContent = currentContent;
                this.showAutoSaveIndicator();
            } else if (response.status === 400) {
                const result = await response.json();
                this.showEditorFeedback('error', `⚠️ Auto-save failed: ${result.detail}. Please reduce content size.`);
            }

        } catch (error) {
            console.log('Auto-save failed (silent):', error);
        }
    }

    showAutoSaveIndicator() {
        const editorContent = document.querySelector('.editor-content');
        const existingIndicator = editorContent.querySelector('.auto-save-indicator');
        
        if (existingIndicator) {
            existingIndicator.remove();
        }

        const indicator = document.createElement('div');
        indicator.className = 'auto-save-indicator fade-in';
        indicator.innerHTML = `
            <i data-lucide="check"></i>
            <span>Auto-saved</span>
        `;
        
        editorContent.style.position = 'relative';
        editorContent.appendChild(indicator);
        
        // Refresh icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 1000);
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

    scheduleReSplit() {
        if (!this.quillEditor || !this.currentDocument) return;

        if (this.reSplitTimeout) {
            clearTimeout(this.reSplitTimeout);
        }

        this.reSplitTimeout = setTimeout(() => {
            this.performReSplit();
        }, 3000);
    }

    performReSplit() {
        if (!this.quillEditor || !this.currentDocument) {
            return;
        }

        const currentContent = this.quillEditor.getText();
        
        if (currentContent === this.lastSplitContent) {
            return;
        }

        if (!currentContent.trim()) {
            this.updateChunksStatus('Document is empty');
            this.documentChunks = [];
            this.displayChunks();
            return;
        }

        this.updateChunksStatus('Updating chunks...');
        
        this.documentChunks = this.createChunks(currentContent);
        this.lastSplitContent = currentContent;
        this.lastPolledContent = currentContent;
        this.lastPolledHTML = this.quillEditor.root.innerHTML;
        
        this.displayChunks();
        this.updateChunksStatus(`Ready (${this.documentChunks.length} chunks)`);
    }

    autoSplitDocument() {
        if (!this.quillEditor || !this.currentDocument) {
            return;
        }

        const plainText = this.quillEditor.getText();
        
        if (!plainText.trim()) {
            this.updateChunksStatus('Document is empty');
            this.documentChunks = [];
            this.displayChunks();
            return;
        }

        this.updateChunksStatus('Splitting document...');
        
        this.documentChunks = this.createChunks(plainText);
        this.lastSplitContent = plainText;
        
        this.displayChunks();
        this.updateChunksStatus(`Ready (${this.documentChunks.length} chunks)`);
    }

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

    createChunks(text) {
        if (!text || text.trim().length === 0) {
            return [];
        }

        const words = text.trim().split(/\s+/);
        const chunks = [];
        const targetWordsPerChunk = 300;
        const minWordsPerChunk = 150;
        const maxWordsPerChunk = 400;

        let currentChunk = [];
        let currentWordCount = 0;
        let chunkIndex = 0;
        let currentCharPosition = 0;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            currentChunk.push(word);
            currentWordCount++;

            const shouldCreateChunk = 
                currentWordCount >= targetWordsPerChunk ||
                (currentWordCount >= minWordsPerChunk && this.isGoodBreakPoint(word)) ||
                i === words.length - 1;

            if (shouldCreateChunk && currentWordCount >= minWordsPerChunk) {
                const chunkText = currentChunk.join(' ');
                const chunkStart = currentCharPosition;
                const chunkEnd = currentCharPosition + chunkText.length;
                
                chunks.push({
                    index: chunkIndex,
                    text: chunkText,
                    wordCount: currentWordCount,
                    start: chunkStart,
                    end: chunkEnd
                });

                chunkIndex++;
                currentChunk = [];
                currentWordCount = 0;
                currentCharPosition = chunkEnd;
            }
        }

        // Handle remaining words
        if (currentChunk.length > 0) {
            if (chunks.length > 0) {
                const lastChunk = chunks[chunks.length - 1];
                if (lastChunk.wordCount + currentChunk.length <= maxWordsPerChunk) {
                    const additionalText = ' ' + currentChunk.join(' ');
                    lastChunk.text += additionalText;
                    lastChunk.wordCount += currentChunk.length;
                    lastChunk.end += additionalText.length;
                } else {
                    const chunkText = currentChunk.join(' ');
                    const chunkStart = currentCharPosition;
                    const chunkEnd = currentCharPosition + chunkText.length;
                    
                    chunks.push({
                        index: chunkIndex,
                        text: chunkText,
                        wordCount: currentChunk.length,
                        start: chunkStart,
                        end: chunkEnd
                    });
                }
            } else {
                const chunkText = currentChunk.join(' ');
                chunks.push({
                    index: 0,
                    text: chunkText,
                    wordCount: currentChunk.length,
                    start: 0,
                    end: chunkText.length
                });
            }
        }

        return chunks;
    }

    isGoodBreakPoint(word) {
        const sentenceEnders = /[.!?]$/;
        return sentenceEnders.test(word);
    }

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
                        <button class="chunk-action-btn btn-primary btn-sm" onclick="window.documentManager.getFeedback(${chunk.index})">
                            <i data-lucide="message-square"></i>
                            Get Feedback
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // Add click event listeners
        this.addChunkClickListeners();
        this.updateFeedbackModalIfOpen();
        
        // Refresh icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    updateFeedbackModalIfOpen() {
        if (!this.feedbackModal || !this.selectedChunk) {
            return;
        }
        
        if (this.feedbackModal.style.display === 'none') {
            return;
        }
        
        const currentChunk = this.documentChunks.find(chunk => chunk.index === this.selectedChunk.index);
        if (!currentChunk) {
            return;
        }
        
        if (this.originalText) {
            this.originalText.textContent = currentChunk.text;
        }
        
        this.originalOriginalText = currentChunk.text;
    }

    addChunkClickListeners() {
        const chunkItems = document.querySelectorAll('.chunk-item');
        chunkItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('chunk-action-btn') || e.target.closest('.chunk-action-btn')) {
                    return;
                }
                
                const chunkIndex = parseInt(item.dataset.chunkIndex);
                this.selectChunk(chunkIndex);
            });
        });
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

    getFeedback(chunkIndex) {
        const chunk = this.documentChunks[chunkIndex];
        if (!chunk) return;

        this.selectChunk(chunkIndex);
        this.showEditorFeedback('info', `Getting feedback for Chunk ${chunkIndex + 1}...`);
        
        setTimeout(() => {
            const originalText = chunk.text;
            const correctedText = this.simulateGrammarCorrection(originalText);
            const feedback = this.simulateFeedback(originalText, correctedText);
            
            this.showFeedbackModal(
                `Grammar Feedback - Chunk ${chunkIndex + 1}`,
                originalText,
                correctedText,
                feedback
            );
        }, 1000);
    }

    simulateGrammarCorrection(text) {
        return text
            .replace(/\bi\b/g, 'I')
            .replace(/\bteh\b/g, 'the')
            .replace(/\bthier\b/g, 'their')
            .replace(/\byoure\b/g, "you're")
            .replace(/\bits\b(?=\s+[a-z])/g, "it's")
            + " [CORRECTED VERSION]";
    }

    simulateFeedback(original, corrected) {
        const changes = [];
        if (original !== corrected) {
            changes.push("• Fixed capitalization issues");
            changes.push("• Corrected common spelling errors");
            changes.push("• Improved punctuation");
        }
        
        if (changes.length === 0) {
            return "No corrections needed. Your text is well-written!";
        }
        
        return "Grammar and style improvements:\n" + changes.join("\n");
    }

    translateText(type, targetLanguage) {
        let sourceElement;
        
        if (type === 'original') {
            sourceElement = this.originalText;
        } else if (type === 'corrected') {
            sourceElement = this.correctedText;
        } else if (type === 'feedback') {
            sourceElement = this.feedbackContent;
        }
        
        if (!sourceElement) return;
        
        const sourceText = sourceElement.textContent;
        let translatedText;
        
        if (targetLanguage === 'kinyarwanda') {
            translatedText = `Muri Kinyarwanda: ${sourceText}`;
        } else if (targetLanguage === 'english') {
            translatedText = `In English: ${sourceText}`;
        }
        
        sourceElement.textContent = translatedText;
    }

    // File Management Functions
    initializeFileManagement() {
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
            console.error('Error checking filename:', error);
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
            console.error('Error creating document:', error);
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
            console.error('Error generating auto-filename:', error);
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
            console.log('Checking if filename exists:', filename);
            
            const response = await fetch(`/documents/check-filename/${encodeURIComponent(filename)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (await this.handleAuthError(response)) {
                console.log('Auth error when checking filename');
                return false;
            }

            if (!response.ok) {
                console.log('Filename check endpoint not available, response status:', response.status);
                // If endpoint doesn't exist, we should still try to upload and let backend handle it
                return false;
            }

            const result = await response.json();
            console.log('Filename check result:', result);
            return result.exists;
            
        } catch (error) {
            console.error('Error checking filename:', error);
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
            console.error('Error submitting training data:', error);
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
            console.error('Error deleting document:', error);
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

    showFloatingNotification(type, message) {
        const notification = document.getElementById('floatingNotification');
        const notificationMessage = document.getElementById('notificationMessage');
        
        if (notification && notificationMessage) {
            notification.className = `floating-notification ${type}`;
            notificationMessage.textContent = message;
            notification.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.hideFloatingNotification();
            }, 5000);
        }
    }

    hideFloatingNotification() {
        const notification = document.getElementById('floatingNotification');
        if (notification) {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                notification.style.display = 'none';
                notification.style.animation = 'slideIn 0.3s ease-out';
            }, 300);
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
            console.error('Error renaming document:', error);
            this.showFloatingNotification('error', 'Connection error. Please try again.');
            return false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.documentManager = new DocumentManager();
});