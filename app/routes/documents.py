from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Request
from fastapi.responses import JSONResponse
from app.database.db_config import get_db_connection
from app.dependencies.jwt_current_user import get_current_user
from app.utils.ai_services import ai_services
from psycopg2.extensions import connection as Connection

router = APIRouter()

def get_db():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

@router.post("/upload")
async def upload_document(
    request: Request,  # Add this parameter
    file: UploadFile = File(...),
    db: Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        # Strict content type validation
        if file.content_type != 'text/plain':
            raise HTTPException(
                status_code=400, 
                detail="Only plain text (text/plain) files are allowed"
            )

        # Validate file extension
        if not file.filename.lower().endswith('.txt'):
            raise HTTPException(
                status_code=400, 
                detail="Only .txt files are allowed"
            )

        # Check if filename already exists for this user
        cursor = db.cursor()
        cursor.execute(
            "SELECT id FROM documents WHERE title = %s AND user_id = %s",
            (file.filename, current_user["user_id"])
        )
        if cursor.fetchone():
            cursor.close()
            raise HTTPException(
                status_code=400,
                detail=f"A document with the name '{file.filename}' already exists. Please choose a different name."
            )
        cursor.close()

        # Read and validate content
        content = await file.read()
        
        # Check file size (1MB)
        if len(content) > 1024 * 1024:
            raise HTTPException(
                status_code=400, 
                detail="File size exceeds 1MB limit"
            )
            
        try:
            # Verify content is valid UTF-8 text
            text_content = content.decode('utf-8')
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400, 
                detail="File must be a valid UTF-8 text file"
            )

        # Store in database
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO documents (user_id, title, content) VALUES (%s, %s, %s) RETURNING id",
            (current_user["user_id"], file.filename, text_content)
        )
        doc_id = cursor.fetchone()[0]
        db.commit()
        cursor.close()
        
        return JSONResponse(
            status_code=201,
            content={
                "message": "Document uploaded successfully",
                "document_id": doc_id,
                "filename": file.filename
            }
        )
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing upload: {str(e)}"
        )

@router.get("/get-next-untitled-number")
async def get_next_untitled_number(
    db: Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get the next available number for Untitled documents"""
    try:
        cursor = db.cursor()
        user_id = current_user["user_id"]
        
        cursor.execute(
            """
            SELECT title FROM documents 
            WHERE user_id = %s
            ORDER BY title
            """, 
            (user_id,)
        )
        
        all_docs = cursor.fetchall()
        cursor.close()
        
        # Filter for untitled documents and extract numbers
        numbers = []
        for doc in all_docs:
            title = doc[0]
            if title.startswith('Untitled ') and title.endswith('.txt'):
                try:
                    number_part = title.replace('Untitled ', '').replace('.txt', '')
                    number = int(number_part)
                    numbers.append(number)
                except ValueError:
                    continue
        
        next_number = 1 if not numbers else max(numbers) + 1
        
        return {
            "nextNumber": next_number,
            "message": f"Next available number is {next_number}"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting next untitled number: {str(e)}"
        )

@router.get("/check-filename/{filename}")
async def check_filename_exists(
    filename: str,
    db: Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Check if a filename already exists for the current user"""
    try:
        cursor = db.cursor()
        cursor.execute(
            "SELECT id FROM documents WHERE title = %s AND user_id = %s",
            (filename, current_user["user_id"])
        )
        exists = cursor.fetchone() is not None
        cursor.close()
        
        return {
            "filename": filename,
            "exists": exists,
            "message": "Filename already exists" if exists else "Filename is available"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error checking filename: {str(e)}"
        )

@router.delete("/{doc_id}")
async def delete_document(
    doc_id: int,
    db: Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a document"""
    try:
        cursor = db.cursor()
        
        # Check if document exists and belongs to user
        cursor.execute(
            """
            SELECT id, title FROM documents 
            WHERE id = %s AND user_id = %s
            """, 
            (doc_id, current_user["user_id"])
        )
        document = cursor.fetchone()
        
        if not document:
            cursor.close()
            raise HTTPException(
                status_code=404,
                detail="Document not found or access denied"
            )
        
        # Delete the document
        cursor.execute(
            """
            DELETE FROM documents 
            WHERE id = %s AND user_id = %s
            """, 
            (doc_id, current_user["user_id"])
        )
        db.commit()
        cursor.close()
        
        return {
            "message": "Document deleted successfully",
            "document_id": doc_id,
            "deleted_title": document[1]
        }
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting document: {str(e)}"
        )

@router.post("/submit-training-data")
async def submit_training_data(
    request: Request,
    db: Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Submit teacher corrections and feedback for training data collection"""
    try:
        body = await request.json()
        
        # Extract data from request
        original_text = body.get("original_text", "").strip()
        teacher_correction = body.get("teacher_correction", "").strip()
        cbc_feedback = body.get("cbc_feedback", "").strip()
        
        # Validate required fields
        if not original_text:
            raise HTTPException(
                status_code=400,
                detail="Original text is required"
            )
        if not teacher_correction:
            raise HTTPException(
                status_code=400,
                detail="Teacher correction is required"
            )
        if not cbc_feedback:
            raise HTTPException(
                status_code=400,
                detail="CBC feedback is required"
            )
        
        cursor = db.cursor()
        
        # Insert training data (anonymous - no user_id stored)
        cursor.execute(
            """
            INSERT INTO training_data (
                original_text, teacher_correction, cbc_feedback
            ) VALUES (%s, %s, %s)
            RETURNING id
            """,
            (original_text, teacher_correction, cbc_feedback)
        )
        
        training_data_id = cursor.fetchone()[0]
        db.commit()
        cursor.close()
        
        return {
            "message": "Training data submitted successfully",
            "training_data_id": training_data_id,
            "submitted_at": "now"
        }
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error submitting training data: {str(e)}"
        )

@router.get("/list")
async def get_user_documents(
    request: Request,  # Add this parameter
    db: Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:        
        cursor = db.cursor()
        cursor.execute(
            """
            SELECT id, title, content, created_at, last_updated 
            FROM documents 
            WHERE user_id = %s 
            ORDER BY created_at DESC
            """, 
            (current_user["user_id"],)
        )
        documents = cursor.fetchall()
        cursor.close() 
        return [
            {
                "id": doc[0],
                "title": doc[1],
                "size": len(doc[2].encode('utf-8')) if doc[2] else 0,  # Calculate size in bytes
                "created_at": doc[3].isoformat(),
                "last_updated": doc[4].isoformat()
            }
            for doc in documents
        ]
    except Exception as e:# Debug log
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving documents: {str(e)}"
        )

@router.get("/{doc_id}")
async def get_document(
    doc_id: int,
    db: Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:        
        cursor = db.cursor()
        cursor.execute(
            """
            SELECT id, title, content, created_at, last_updated 
            FROM documents 
            WHERE id = %s AND user_id = %s
            """, 
            (doc_id, current_user["user_id"])
        )
        document = cursor.fetchone()
        cursor.close()
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found or access denied"
            )
        return {
            "id": document[0],
            "title": document[1],
            "content": document[2],
            "created_at": document[3].isoformat(),
            "last_updated": document[4].isoformat()
        }
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving document: {str(e)}"
        )

@router.put("/{doc_id}")
async def update_document(
    doc_id: int,
    request: Request,
    db: Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        # Get the request body
        body = await request.json()
        new_content = body.get("content", "")
        
        # Validate content size (same as upload limit: 1MB)
        content_size_bytes = len(new_content.encode('utf-8'))
        max_size = 1024 * 1024  # 1MB
        
        if content_size_bytes > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"Document content exceeds 1MB limit. Current size: {content_size_bytes} bytes"
            )
        cursor = db.cursor()
        
        # First check if document exists and user owns it
        cursor.execute(
            """
            SELECT id FROM documents 
            WHERE id = %s AND user_id = %s
            """, 
            (doc_id, current_user["user_id"])
        )
        
        if not cursor.fetchone():
            cursor.close()
            raise HTTPException(
                status_code=404,
                detail="Document not found or access denied"
            )
        
        # Update the document content and last_updated timestamp
        cursor.execute(
            """
            UPDATE documents 
            SET content = %s, last_updated = CURRENT_TIMESTAMP 
            WHERE id = %s AND user_id = %s
            """, 
            (new_content, doc_id, current_user["user_id"])
        )
        
        db.commit()
        cursor.close()
        
        return {
            "message": "Document updated successfully",
            "document_id": doc_id
        }
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating document: {str(e)}"
        )

@router.put("/{doc_id}/rename")
async def rename_document(
    doc_id: int,
    request: Request,
    db: Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Rename a document"""
    try:
        body = await request.json()
        new_title = body.get("title", "").strip()
        
        if not new_title:
            raise HTTPException(
                status_code=400,
                detail="Document title cannot be empty"
            )
        cursor = db.cursor()
        # Check if document exists and belongs to user
        cursor.execute(
            """
            SELECT id FROM documents 
            WHERE id = %s AND user_id = %s
            """, 
            (doc_id, current_user["user_id"])
        )
        if not cursor.fetchone():
            cursor.close()
            raise HTTPException(
                status_code=404,
                detail="Document not found or access denied"
            )
        
        # Update the document title and last_updated timestamp
        cursor.execute(
            """
            UPDATE documents 
            SET title = %s, last_updated = CURRENT_TIMESTAMP 
            WHERE id = %s AND user_id = %s
            """, 
            (new_title, doc_id, current_user["user_id"])
        )
        db.commit()
        cursor.close()
        return {
            "message": "Document renamed successfully",
            "document_id": doc_id,
            "new_title": new_title
        }
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error renaming document: {str(e)}"
        )

@router.post("/chunk/{chunk_id}/correction-and-feedback")
async def get_correction_and_feedback(
    request: Request,
    chunk_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get BOTH grammar correction AND feedback in ONE call (single-task model)"""
    try:
        body = await request.json()
        text = body.get("text", "").strip()
        
        if not text:
            raise HTTPException(
                status_code=400,
                detail="Text is required for correction and feedback"
            )
        
        # Get BOTH correction and feedback from single-task Mistral model in ONE call
        corrected_text, feedback_text, error = ai_services.get_correction_and_feedback(text)
        
        if error:
            raise HTTPException(
                status_code=500,
                detail=error
            )
        
        return {
            "original_text": text,
            "corrected_text": corrected_text,
            "feedback": feedback_text,
            "chunk_id": chunk_id
        }
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting correction and feedback: {str(e)}"
        )

@router.post("/translate")
async def translate_text(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Translate text between English and Kinyarwanda"""
    try:
        body = await request.json()
        text = body.get("text", "").strip()
        target_language = body.get("target_language", "kinyarwanda")
        
        if not text:
            raise HTTPException(
                status_code=400,
                detail="Text is required for translation"
            )
        
        if target_language not in ["kinyarwanda", "english"]:
            raise HTTPException(
                status_code=400,
                detail="Target language must be 'kinyarwanda' or 'english'"
            )
        
        # Perform translation
        if target_language == "kinyarwanda":
            translated_text, error = ai_services.translate_to_kinyarwanda(text)
        else:
            translated_text, error = ai_services.translate_to_english(text)
        
        if error:
            raise HTTPException(
                status_code=500,
                detail=f"Translation failed: {error}"
            )
        
        return {
            "original_text": text,
            "translated_text": translated_text,
            "source_language": "english" if target_language == "kinyarwanda" else "kinyarwanda",
            "target_language": target_language
        }
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error translating text: {str(e)}"
        )