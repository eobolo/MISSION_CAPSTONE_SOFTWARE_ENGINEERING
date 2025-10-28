/**
 * WebSocket Client for Real-time Document Processing
 * Handles intelligent chunking, auto-save, and file size validation
 */

class WebSocketClient {
    constructor() {
        this.websocket = null;
        this.userId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // 1 second
        this.isConnected = false;
        this.messageQueue = [];
    }

    async connect(userId) {
        this.userId = userId;
        
        // Get authentication token
        const token = localStorage.getItem('access_token');
        if (!token) {
            // Show error notification
            if (window.documentManager) {
                window.documentManager.showFloatingNotification('error', 'Authentication token not found. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            }
            return;
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${userId}?token=${encodeURIComponent(token)}`;
        
        try {
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.processMessageQueue();
                
                // Connection established silently (no notification needed)
            };
            
            this.websocket.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };
            
            this.websocket.onclose = (event) => {
                this.isConnected = false;
                
                // Handle authentication errors
                if (event.code === 1008) {
                    // Show error notification before redirecting
                    if (window.documentManager) {
                        let errorMessage = 'Authentication failed';
                        if (event.reason.includes('Token required')) {
                            errorMessage = 'Authentication token required';
                        } else if (event.reason.includes('Token mismatch')) {
                            errorMessage = 'Authentication token mismatch';
                        } else if (event.reason.includes('Invalid token')) {
                            errorMessage = 'Invalid authentication token';
                        }
                        
                        window.documentManager.showFloatingNotification('error', errorMessage);
                        
                        // Redirect to login after showing notification
                        setTimeout(() => {
                            localStorage.removeItem('access_token');
                            window.location.href = '/';
                        }, 3000); // 3 seconds delay
                        return;
                    }
                }
                
                this.attemptReconnect();
            };
            
            this.websocket.onerror = (error) => {
                // do nothing
            };
            
        } catch (error) {
            // Silent retry - no notification needed for automatic reconnection
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            // Show reconnection notification
            if (window.documentManager && this.reconnectAttempts === 1) {
                window.documentManager.showFloatingNotification('info', 'Connection lost. Attempting to reconnect...');
            }
            
            setTimeout(() => {
                // Check if token still exists before reconnecting
                const token = localStorage.getItem('access_token');
                if (token) {
                    this.connect(this.userId);
                } else {
                    if (window.documentManager) {
                        window.documentManager.showFloatingNotification('error', 'Session expired. Please log in again.');
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 3000);
                    }
                }
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            if (window.documentManager) {
                window.documentManager.showFloatingNotification('error', 'Connection failed after multiple attempts. Please refresh the page.');
            }
        }
    }

    sendMessage(message) {
        if (this.isConnected && this.websocket) {
            this.websocket.send(JSON.stringify(message));
        } else {
            // Queue message for when connection is restored
            this.messageQueue.push(message);
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            this.sendMessage(message);
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'chunks_updated':
                this.handleChunksUpdated(message);
                break;
            case 'auto_saved':
                this.handleAutoSaved(message);
                break;
            case 'manual_saved':
                this.handleManualSaved(message);
                break;
            case 'save_error':
                this.handleSaveError(message);
                break;
            case 'error':
                this.handleError(message);
                break;
            default:
        }
    }

    handleChunksUpdated(message) {
        // Update document chunks in the UI
        if (window.documentManager) {
            window.documentManager.documentChunks = message.chunks;
            window.documentManager.displayChunks();
            window.documentManager.updateChunksStatus(`Ready (${message.total_chunks} chunks)`);
        }
    }

    handleAutoSaved(message) {
        // Auto-save completed silently (no notification needed)
        // Refresh document list to update file sizes
        if (window.documentManager) {
            window.documentManager.loadDocuments();
        }
    }

    handleManualSaved(message) {
        // Show manual save success notification
        if (window.documentManager) {
            window.documentManager.showFloatingNotification('success', 'Document saved successfully!');
            // Refresh document list to update file sizes
            window.documentManager.loadDocuments();
        }
    }


    handleSaveError(message) {
        // Show save error notification
        if (window.documentManager) {
            window.documentManager.showFloatingNotification('error', message.message);
        }
    }

    handleError(message) {
        // Show general error notification
        if (window.documentManager) {
            window.documentManager.showFloatingNotification('error', message.message);
        }
    }

    // Public methods for document operations
    requestTextChunking(text, documentId) {
        this.sendMessage({
            type: 'text_changed',
            text: text,
            document_id: documentId
        });
    }

    requestAutoSave(documentId, content) {
        this.sendMessage({
            type: 'auto_save',
            document_id: documentId,
            content: content
        });
    }

    requestManualSave(documentId, content) {
        this.sendMessage({
            type: 'manual_save',
            document_id: documentId,
            content: content
        });
    }


    disconnect() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        this.isConnected = false;
    }
}

// Global WebSocket client instance
window.websocketClient = new WebSocketClient();
