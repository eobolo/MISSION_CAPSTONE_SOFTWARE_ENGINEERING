"""
Phase 4: Integration Tests for Documents REST API
Tests: List, get, create, rename, delete, last_updated on update and rename
Tool: pytest, httpx
Run with: pytest tests/test_phase4_integration_documents_rest.py -v --html=reports/phase4_report.html
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.routes.documents import router as documents_router
from app.utils.auth_utils import hash_password
from app.database.db_config import get_db_connection, create_user, get_user_by_email
from app.utils.jwt_utils import create_access_token
from io import BytesIO


@pytest.fixture
def test_app():
    """Create a minimal FastAPI app for testing without spaCy dependencies"""
    app = FastAPI()
    app.include_router(documents_router, prefix="/documents", tags=["documents"])
    return app


@pytest.fixture
def client(test_app):
    """Create a test client for testing"""
    return TestClient(test_app)


@pytest.fixture
def test_user_data():
    """Test user data for authentication tests"""
    return {
        "email": "documents_test@example.com",
        "password": "DocumentsTest123",
        "first_name": "Documents",
        "last_name": "Test"
    }


@pytest.fixture
def auth_token(client, test_user_data):
    """Create a test user and return auth token"""
    db = get_db_connection()
    try:
        # Check if user already exists
        existing_user = get_user_by_email(db, test_user_data["email"])
        if existing_user:
            # User exists, clean up
            cursor = db.cursor()
            cursor.execute("DELETE FROM users WHERE email = %s", (test_user_data["email"],))
            db.commit()
            cursor.close()
        
        # Create new test user
        password_hash = hash_password(test_user_data["password"])
        user_id = create_user(
            db=db,
            email=test_user_data["email"],
            password_hash=password_hash,
            first_name=test_user_data["first_name"],
            last_name=test_user_data["last_name"],
            privacy_accepted=True,
            auth_method="email",
            theme="dark"
        )
        
        # Create access token
        token = create_access_token({
            "user_id": user_id,
            "email": test_user_data["email"]
        })
        
        yield token
    finally:
        # Clean up test user and documents
        try:
            cursor = db.cursor()
            cursor.execute("DELETE FROM documents WHERE user_id IN (SELECT id FROM users WHERE email = %s)", (test_user_data["email"],))
            cursor.execute("DELETE FROM users WHERE email = %s", (test_user_data["email"],))
            db.commit()
            cursor.close()
        except Exception:
            pass
        db.close()


@pytest.fixture
def headers(auth_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.mark.integration
class TestDocumentsList:
    """Integration tests for listing documents"""
    
    def test_list_documents_empty(self, client, headers):
        """Test listing documents when user has no documents"""
        response = client.get("/documents/list", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_list_documents_with_data(self, client, headers):
        """Test listing documents when user has documents"""
        # Create a document first
        file_content = b"This is a test document"
        files = {"file": ("test.txt", BytesIO(file_content), "text/plain")}
        upload_response = client.post("/documents/upload", headers=headers, files=files)
        
        assert upload_response.status_code == 201
        
        # List documents
        response = client.get("/documents/list", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["title"] == "test.txt"


@pytest.mark.integration
class TestDocumentGet:
    """Integration tests for getting a document"""
    
    def test_get_document_success(self, client, headers):
        """Test getting a document by ID"""
        # Create a document first
        file_content = b"This is test content"
        files = {"file": ("get_test.txt", BytesIO(file_content), "text/plain")}
        upload_response = client.post("/documents/upload", headers=headers, files=files)
        
        assert upload_response.status_code == 201
        doc_id = upload_response.json()["document_id"]
        
        # Get the document
        response = client.get(f"/documents/{doc_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == doc_id
        assert data["title"] == "get_test.txt"
        assert data["content"] == "This is test content"
    
    def test_get_document_not_found(self, client, headers):
        """Test getting a non-existent document"""
        response = client.get("/documents/99999", headers=headers)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


@pytest.mark.integration
class TestDocumentCreate:
    """Integration tests for creating documents"""
    
    def test_upload_document_success(self, client, headers):
        """Test uploading a text document"""
        file_content = b"Upload test content"
        files = {"file": ("upload_test.txt", BytesIO(file_content), "text/plain")}
        
        response = client.post("/documents/upload", headers=headers, files=files)
        
        assert response.status_code == 201
        data = response.json()
        assert "document_id" in data
        assert data["filename"] == "upload_test.txt"
    
    def test_upload_document_duplicate_filename(self, client, headers):
        """Test uploading a document with duplicate filename"""
        file_content = b"Duplicate test"
        files = {"file": ("duplicate.txt", BytesIO(file_content), "text/plain")}
        
        # First upload
        response1 = client.post("/documents/upload", headers=headers, files=files)
        assert response1.status_code == 201
        
        # Try to upload again with same filename
        files = {"file": ("duplicate.txt", BytesIO(file_content), "text/plain")}
        response2 = client.post("/documents/upload", headers=headers, files=files)
        
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"]
    
    def test_upload_document_invalid_extension(self, client, headers):
        """Test uploading a file with invalid extension"""
        file_content = b"Invalid extension test"
        files = {"file": ("invalid.pdf", BytesIO(file_content), "application/pdf")}
        
        response = client.post("/documents/upload", headers=headers, files=files)
        
        assert response.status_code == 400
        # The backend checks content-type first, so the error message doesn't mention .txt
        assert "only plain text" in response.json()["detail"].lower()


@pytest.mark.integration
class TestDocumentRename:
    """Integration tests for renaming documents"""
    
    def test_rename_document_success(self, client, headers):
        """Test renaming a document"""
        # Create a document first
        file_content = b"Rename test content"
        files = {"file": ("old_name.txt", BytesIO(file_content), "text/plain")}
        upload_response = client.post("/documents/upload", headers=headers, files=files)
        
        doc_id = upload_response.json()["document_id"]
        
        # Rename the document
        response = client.put(
            f"/documents/{doc_id}/rename",
            headers=headers,
            json={"title": "new_name.txt"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["new_title"] == "new_name.txt"
        assert data["document_id"] == doc_id
    
    def test_rename_document_empty_title(self, client, headers):
        """Test renaming with empty title"""
        # Create a document first
        file_content = b"Empty title test"
        files = {"file": ("empty_test.txt", BytesIO(file_content), "text/plain")}
        upload_response = client.post("/documents/upload", headers=headers, files=files)
        
        doc_id = upload_response.json()["document_id"]
        
        # Try to rename with empty title
        response = client.put(
            f"/documents/{doc_id}/rename",
            headers=headers,
            json={"title": ""}
        )
        
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()


@pytest.mark.integration
class TestDocumentDelete:
    """Integration tests for deleting documents"""
    
    def test_delete_document_success(self, client, headers):
        """Test deleting a document"""
        # Create a document first
        file_content = b"Delete test content"
        files = {"file": ("delete_test.txt", BytesIO(file_content), "text/plain")}
        upload_response = client.post("/documents/upload", headers=headers, files=files)
        
        doc_id = upload_response.json()["document_id"]
        
        # Delete the document
        response = client.delete(f"/documents/{doc_id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["document_id"] == doc_id
        
        # Verify document is deleted
        get_response = client.get(f"/documents/{doc_id}", headers=headers)
        assert get_response.status_code == 404
    
    def test_delete_document_not_found(self, client, headers):
        """Test deleting a non-existent document"""
        response = client.delete("/documents/99999", headers=headers)
        
        assert response.status_code == 404


@pytest.mark.integration
class TestDocumentLastUpdated:
    """Integration tests for last_updated timestamp"""
    
    def test_update_document_updates_timestamp(self, client, headers):
        """Test that updating document content updates last_updated"""
        # Create a document
        file_content = b"Initial content"
        files = {"file": ("timestamp_test.txt", BytesIO(file_content), "text/plain")}
        upload_response = client.post("/documents/upload", headers=headers, files=files)
        doc_id = upload_response.json()["document_id"]
        
        # Get original document
        get_response1 = client.get(f"/documents/{doc_id}", headers=headers)
        original_data = get_response1.json()
        original_updated = original_data["last_updated"]
        
        # Update document
        import time
        time.sleep(1)  # Wait 1 second to ensure timestamp difference
        
        update_response = client.put(
            f"/documents/{doc_id}",
            headers=headers,
            json={"content": "Updated content"}
        )
        assert update_response.status_code == 200
        
        # Get updated document
        get_response2 = client.get(f"/documents/{doc_id}", headers=headers)
        updated_data = get_response2.json()
        
        # Verify timestamp changed
        assert updated_data["last_updated"] != original_updated
    
    def test_rename_document_updates_timestamp(self, client, headers):
        """Test that renaming a document updates last_updated"""
        # Create a document
        file_content = b"Rename timestamp test"
        files = {"file": ("rename_timestamp.txt", BytesIO(file_content), "text/plain")}
        upload_response = client.post("/documents/upload", headers=headers, files=files)
        doc_id = upload_response.json()["document_id"]
        
        # Get original document
        get_response1 = client.get(f"/documents/{doc_id}", headers=headers)
        original_data = get_response1.json()
        original_updated = original_data["last_updated"]
        
        # Rename document
        import time
        time.sleep(1)  # Wait 1 second
        
        rename_response = client.put(
            f"/documents/{doc_id}/rename",
            headers=headers,
            json={"title": "renamed_timestamp.txt"}
        )
        assert rename_response.status_code == 200
        
        # Get renamed document
        get_response2 = client.get(f"/documents/{doc_id}", headers=headers)
        updated_data = get_response2.json()
        
        # Verify timestamp changed
        assert updated_data["last_updated"] != original_updated


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--html=reports/phase4_report.html"])
