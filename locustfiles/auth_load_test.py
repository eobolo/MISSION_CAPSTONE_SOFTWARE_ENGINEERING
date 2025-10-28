"""
Locust load test for authentication endpoints
Tests 50 concurrent users logging in and using the app simultaneously
To run: locust -f locustfiles/auth_load_test.py --host=http://localhost:8000
"""

from locust import HttpUser, task, between


class AuthUser(HttpUser):
    """
    This class represents ONE user
    Locust will create 50 instances of this class = 50 concurrent users
    
    Each user will:
    1. View login page (most common - weight 5)
    2. Login (weight 3)
    3. Access dashboard (weight 2)
    4. List documents (weight 1)
    
    All 50 users will hit your FastAPI app AT THE SAME TIME
    """
    wait_time = between(1, 3)  # Each user waits 1-3 seconds between actions
    
    def on_start(self):
        """Called when each simulated user starts"""
        # All 50 users use the same test account credentials
        self.email = "test@example.com"
        self.password = "TestPassword123"
        self.token = None
    
    def login(self):
        """Helper: login and store the token"""
        response = self.client.post(
            "/auth/login",
            json={"email": self.email, "password": self.password}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
        return response.status_code == 200
        
    @task(5)
    def view_login_page(self):
        """Most frequent: viewing the login page"""
        self.client.get("/")
    
    @task(3)
    def attempt_login(self):
        """Frequent: login attempts"""
        self.login()
    
    @task(2)
    def access_dashboard(self):
        """Moderate: accessing dashboard (requires auth)"""
        if self.login() and self.token:
            self.client.get("/dashboard")
    
    @task(1)
    def list_documents(self):
        """Less frequent: listing documents (requires auth)"""
        if self.login() and self.token:
            self.client.get(
                "/documents/list",
                headers={"Authorization": f"Bearer {self.token}"}
            )
