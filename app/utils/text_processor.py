"""
Simple Intelligent Text Chunker using spaCy
Splits text at sentence boundaries - no grammar analysis
"""

import spacy
import re
from typing import List
from dataclasses import dataclass

@dataclass
class TextChunk:
    """Simple data container for a text chunk"""
    index: int
    text: str
    word_count: int
    start_position: int
    end_position: int

class IntelligentTextProcessor:
    """
    Simple intelligent text chunker that respects sentence boundaries
    Uses spaCy only for sentence detection - no grammar analysis
    """
    
    def __init__(self):
        """Initialize the spaCy model"""
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            raise Exception("spaCy model 'en_core_web_sm' not found. Run: python -m spacy download en_core_web_sm")
    
    def clean_spacing(self, text: str) -> str:
        """
        Fix spacing issues so spaCy can properly detect sentences
        Only fixes spacing - no grammar correction
        """
        if not text or not text.strip():
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Fix spacing around punctuation
        text = re.sub(r'\s+([,.!?;:])', r'\1', text)
        
        return text
    
    def create_intelligent_chunks(self, text: str, target_words: int = 200) -> List[TextChunk]:
        """
        Split text into chunks that respect sentence boundaries
        Simple and clean - just smart chunking
        """
        if not text or not text.strip():
            return []
        
        # Fix spacing for proper sentence detection
        cleaned_text = self.clean_spacing(text)
        
        # Use spaCy to detect sentences
        doc = self.nlp(cleaned_text)
        sentences = list(doc.sents)
        
        chunks = []
        current_chunk_sentences = []
        current_word_count = 0
        chunk_index = 0
        current_position = 0
        
        for sentence in sentences:
            sentence_text = sentence.text.strip()
            sentence_word_count = len([token for token in sentence if not token.is_space])
            
            # Check if adding this sentence would exceed target
            if current_word_count + sentence_word_count > target_words and current_chunk_sentences:
                # Create chunk from current sentences
                chunk_text = ' '.join(current_chunk_sentences)
                chunk_end_pos = current_position + len(chunk_text)
                
                chunks.append(TextChunk(
                    index=chunk_index,
                    text=chunk_text,
                    word_count=current_word_count,
                    start_position=current_position,
                    end_position=chunk_end_pos
                ))
                
                # Start new chunk
                chunk_index += 1
                current_chunk_sentences = [sentence_text]
                current_word_count = sentence_word_count
                current_position = chunk_end_pos
            else:
                # Add sentence to current chunk
                current_chunk_sentences.append(sentence_text)
                current_word_count += sentence_word_count
        
        # Handle remaining sentences
        if current_chunk_sentences:
            chunk_text = ' '.join(current_chunk_sentences)
            chunks.append(TextChunk(
                index=chunk_index,
                text=chunk_text,
                word_count=current_word_count,
                start_position=current_position,
                end_position=current_position + len(chunk_text)
            ))
        
        return chunks

