"""
WebSocket Manager for Real-time Document Processing
Handles intelligent chunking, auto-save, and file size validation
"""

import json
import asyncio
from typing import Dict, Set, Any
from fastapi import WebSocket, WebSocketDisconnect
from app.utils.text_processor import IntelligentTextProcessor, TextChunk
from app.database.db_config import get_db_connection

class WebSocketManager:
    """Manages WebSocket connections and real-time document processing"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_documents: Dict[str, str] = {}  # user_id -> document_id
        self.text_processor = IntelligentTextProcessor()
        self.max_file_size = 1024 * 1024  # 1MB limit
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Store WebSocket connection (connection already accepted in main.py)"""
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: str):
        """Remove WebSocket connection"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.user_documents:
            del self.user_documents[user_id]
    
    async def send_personal_message(self, message: Dict[str, Any], user_id: str):
        """Send message to specific user"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except Exception:
                self.disconnect(user_id)
    
    async def process_text_chunking(self, user_id: str, text: str, document_id: str):
        """Process text with spaCy intelligent chunking"""
        try:
            # Validate file size before processing
            text_size = len(text.encode('utf-8'))
            if text_size > self.max_file_size:
                await self.send_personal_message({
                    "type": "error",
                    "message": f"Document size ({text_size} bytes) exceeds 1MB limit"
                }, user_id)
                return
            
            # Create intelligent chunks
            chunks = self.text_processor.create_intelligent_chunks(text, target_words=200)
            
            # Convert chunks to serializable format
            chunk_data = []
            for chunk in chunks:
                chunk_data.append({
                    "index": chunk.index,
                    "text": chunk.text,
                    "wordCount": chunk.word_count,
                    "start": chunk.start_position,
                    "end": chunk.end_position
                })
            
            # Send chunks to client
            await self.send_personal_message({
                "type": "chunks_updated",
                "document_id": document_id,
                "chunks": chunk_data,
                "total_chunks": len(chunks),
                "file_size": text_size
            }, user_id)
            
        except Exception:
            await self.send_personal_message({
                "type": "error",
                "message": "Error processing document chunks"
            }, user_id)
    
    async def auto_save_document(self, user_id: str, document_id: str, content: str):
        """Auto-save document via WebSocket"""
        try:
            # Validate file size
            content_size = len(content.encode('utf-8'))
            if content_size > self.max_file_size:
                await self.send_personal_message({
                    "type": "save_error",
                    "message": f"Cannot save: Document size ({content_size} bytes) exceeds 1MB limit"
                }, user_id)
                return
            
            # Save to database with last_updated timestamp
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE documents SET content = %s, last_updated = CURRENT_TIMESTAMP WHERE id = %s AND user_id = %s",
                (content, document_id, user_id)
            )
            conn.commit()
            cursor.close()
            conn.close()
            
            # Send success confirmation
            await self.send_personal_message({
                "type": "auto_saved",
                "document_id": document_id,
                "file_size": content_size,
                "timestamp": asyncio.get_event_loop().time()
            }, user_id)
            
        except Exception:
            await self.send_personal_message({
                "type": "save_error",
                "message": "Failed to auto-save document"
            }, user_id)
    
    async def handle_message(self, user_id: str, message: Dict[str, Any]):
        """Handle incoming WebSocket messages"""
        message_type = message.get("type")
        
        if message_type == "text_changed":
            # Handle text change for intelligent chunking
            text = message.get("text", "")
            document_id = message.get("document_id")
            
            if document_id:
                self.user_documents[user_id] = document_id
                await self.process_text_chunking(user_id, text, document_id)
        
        elif message_type == "auto_save":
            # Handle auto-save request
            document_id = message.get("document_id")
            content = message.get("content", "")
            
            if document_id:
                await self.auto_save_document(user_id, document_id, content)
        
        elif message_type == "manual_save":
            # Handle manual save request (same as auto-save but different response)
            document_id = message.get("document_id")
            content = message.get("content", "")
            
            if document_id:
                await self.auto_save_document(user_id, document_id, content)
                # Send manual save confirmation
                await self.send_personal_message({
                    "type": "manual_saved",
                    "document_id": document_id
                }, user_id)

# Global WebSocket manager instance
websocket_manager = WebSocketManager()

