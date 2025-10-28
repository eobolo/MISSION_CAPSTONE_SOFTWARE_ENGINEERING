"""
Phase 1: Initial Smoke E2E Tests
Tests: Login to dashboard load, theme applies, grid and list render, modals open
Tool: Playwright
Run with: pytest tests/test_phase1_smoke_e2e.py -v --html=reports/phase1_report.html
"""

import pytest
from playwright.sync_api import Page, expect
import os
from datetime import datetime


@pytest.fixture(scope="session")
def screenshot_dir():
    """Create screenshot directory for this test run"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dir_path = f"reports/screenshots/phase1_{timestamp}"
    os.makedirs(dir_path, exist_ok=True)
    return dir_path


@pytest.fixture(scope="session")
def base_url():
    """Base URL for the application"""
    return os.getenv("BASE_URL", "http://localhost:8000")


@pytest.fixture
def logged_in_page(page: Page, base_url: str):
    """Helper fixture to login and navigate to dashboard"""
    try:
        page.goto(f"{base_url}/", wait_until="networkidle", timeout=60000)
    except Exception as e:
        page.goto(f"{base_url}/", wait_until="load", timeout=60000)
    
    page.fill("#loginEmail", "test@example.com")
    page.fill("#loginPassword", "TestPassword123")
    
    # Submit login form and wait for navigation
    with page.expect_navigation(url=f"{base_url}/dashboard", timeout=15000):
        page.click('button[type="submit"]')
    
    return page


@pytest.mark.e2e
@pytest.mark.smoke
class TestSmokeE2E:
    """
    Smoke tests for basic application functionality
    These tests verify the application loads and basic features work
    """
    
    def test_login_page_loads(self, page: Page, base_url: str, screenshot_dir: str):
        """Test that the login page loads correctly"""
        # Navigate to login page with timeout handling
        try:
            page.goto(f"{base_url}/", wait_until="networkidle", timeout=60000)
        except Exception as e:
            # If timeout, try again with just load
            page.goto(f"{base_url}/", wait_until="load", timeout=60000)
        
        # Take screenshot with reduced timeout to avoid font loading delays
        page.screenshot(path=f"{screenshot_dir}/01_login_page.png", timeout=10000)
        
        # Verify login form is visible
        login_form = page.locator("#loginForm")
        expect(login_form).to_be_visible()
        
        # Verify email and password fields exist
        email_input = page.locator("#loginEmail")
        password_input = page.locator("#loginPassword")
        
        expect(email_input).to_be_visible()
        expect(password_input).to_be_visible()
        
        # Verify login button exists
        login_button = page.locator('button[type="submit"]').filter(has_text="Login")
        expect(login_button).to_be_visible()
    
    def test_dashboard_loads_after_login(self, page: Page, base_url: str, screenshot_dir: str):
        """Test that dashboard loads successfully after login"""
        try:
            page.goto(f"{base_url}/", wait_until="networkidle", timeout=60000)
        except Exception as e:
            page.goto(f"{base_url}/", wait_until="load", timeout=60000)
        
        # Fill in login form (assuming test user exists)
        page.fill("#loginEmail", "test@example.com")
        page.fill("#loginPassword", "TestPassword123")
        
        # Submit login form and wait for navigation
        with page.expect_navigation(url=f"{base_url}/dashboard", timeout=15000):
            page.click('button[type="submit"]')
        
        # Take screenshot with reduced timeout
        page.screenshot(path=f"{screenshot_dir}/02_dashboard_loaded.png", timeout=10000)
        
        # Verify dashboard elements are visible
        navigation_bar = page.locator(".navigation-bar")
        expect(navigation_bar).to_be_visible()
        
        # Wait for documents to load
        page.wait_for_timeout(2000)
        
        # Verify document grid is present (grid view is default)
        documents_grid = page.locator("#documentsGrid")
        expect(documents_grid).to_be_visible()
        
        # Verify at least the "create new document" card exists
        create_card = page.locator("#createNewDocumentCard")
        expect(create_card).to_be_visible()
        
    
    def test_theme_applies_on_load(self, page: Page, base_url: str, screenshot_dir: str):
        """Test that user's saved theme is applied on dashboard load"""
        # Login first
        try:
            page.goto(f"{base_url}/", wait_until="networkidle", timeout=60000)
        except Exception as e:
            page.goto(f"{base_url}/", wait_until="load", timeout=60000)
        page.fill("#loginEmail", "test@example.com")
        page.fill("#loginPassword", "TestPassword123")
        
        # Submit login form and wait for navigation
        with page.expect_navigation(url=f"{base_url}/dashboard", timeout=15000):
            page.click('button[type="submit"]')
        
        # Wait a bit for JavaScript to apply theme
        page.wait_for_timeout(1000)
        
        # Check theme from localStorage
        theme = page.evaluate("localStorage.getItem('theme') || 'dark'")
        
        # Verify theme is applied to document root
        root_element = page.locator("html")
        theme_attribute = root_element.get_attribute("data-theme")
        
        
        assert theme_attribute == theme, f"Expected theme {theme}, got {theme_attribute}"
        
        # Take screenshot with reduced timeout
        page.screenshot(path=f"{screenshot_dir}/03_theme_applied_{theme}.png", timeout=10000)
        
    
    def test_grid_view_renders_documents(self, logged_in_page: Page, screenshot_dir: str):
        """Test that grid view renders documents correctly"""
        page = logged_in_page
        
        # Ensure grid view is active
        grid_view_btn = page.locator('[data-view="grid"]')
        grid_view_btn.click()
        
        # Wait for grid to be visible
        documents_grid = page.locator("#documentsGrid")
        expect(documents_grid).to_be_visible()
        
        # Wait for documents to load from API
        page.wait_for_timeout(2000)
        
        # Take screenshot without waiting for fonts to prevent timeout
        page.screenshot(path=f"{screenshot_dir}/04_grid_view.png", timeout=5000)
        
        # Verify document cards are visible (if any exist)
        # Note: Filter out the "create card" which has id="createNewDocumentCard"
        document_cards = page.locator(".document-card:not(#createNewDocumentCard)")
        card_count = document_cards.count()
        
        # Always check for create card
        create_card = page.locator("#createNewDocumentCard")
        expect(create_card).to_be_visible()
        
        if card_count > 0:
            # At least one actual document card exists
            first_card = document_cards.first
            expect(first_card).to_be_visible()
            
            # Verify card has either title or other content
            # Cards without title might have icon or other content
            card_has_content = first_card.locator(".card-title, .card-icon, .card-meta").count() > 0
            assert card_has_content, "Document card should have some content"
        
    
    def test_list_view_renders_documents(self, logged_in_page: Page, screenshot_dir: str):
        """Test that list view renders documents correctly"""
        page = logged_in_page
        
        # Switch to list view
        list_view_btn = page.locator('[data-view="list"]')
        list_view_btn.click()
        
        # Wait for list to be visible
        documents_list = page.locator("#documentsListView")
        expect(documents_list).to_be_visible()
        
        # Take screenshot with reduced timeout
        page.screenshot(path=f"{screenshot_dir}/05_list_view.png", timeout=10000)
        
        # Verify list items are visible (if any exist)
        list_items = page.locator(".list-item")
        item_count = list_items.count()
        
        if item_count > 0:
            first_item = list_items.first
            expect(first_item).to_be_visible()
            
            # Verify item title is present
            title = first_item.locator(".item-title")
            expect(title).to_be_visible()
            
            # Verify metadata is displayed
            metadata = first_item.locator(".item-meta")
            expect(metadata).to_be_visible()
        
    
    def test_upload_modal_opens(self, logged_in_page: Page, screenshot_dir: str):
        """Test that upload modal opens when triggered"""
        page = logged_in_page
        
        # Click upload button
        upload_btn = page.locator("#uploadDocumentBtn")
        expect(upload_btn).to_be_visible()
        upload_btn.click()
        
        # Wait for modal to appear
        upload_modal = page.locator("#uploadModal")
        expect(upload_modal).to_be_visible()
        
        # Take screenshot with reduced timeout
        page.screenshot(path=f"{screenshot_dir}/06_upload_modal.png", timeout=10000)
        
        # Verify form elements are present
        # Note: file input is visually hidden (opacity/visibility), so check existence instead
        file_input = page.locator("#documentFile")
        expect(file_input).to_be_attached()  # Check existence, not visibility
        
        upload_submit_btn = page.locator("#uploadBtn")
        expect(upload_submit_btn).to_be_visible()
        
    
    def test_create_document_modal_opens(self, logged_in_page: Page, screenshot_dir: str):
        """Test that create document modal opens when triggered"""
        page = logged_in_page
        
        # Click create document button
        create_btn = page.locator("#createNewDocumentBtn")
        if create_btn.is_visible():
            create_btn.click()
        else:
            # Try the create card if button not visible
            create_card = page.locator("#createNewDocumentCard")
            create_card.click()
        
        # Wait for modal to appear
        create_modal = page.locator("#createDocumentModal")
        expect(create_modal).to_be_visible()
        
        # Take screenshot with reduced timeout
        page.screenshot(path=f"{screenshot_dir}/07_create_document_modal.png", timeout=10000)
        
        # Verify input field is present
        name_input = page.locator("#createDocumentName")
        expect(name_input).to_be_visible()
        
    
    def test_settings_dropdown_opens(self, logged_in_page: Page, screenshot_dir: str):
        """Test that settings dropdown opens and displays options"""
        page = logged_in_page
        
        # Click settings button
        settings_btn = page.locator("#settingsBtn")
        expect(settings_btn).to_be_visible()
        settings_btn.click()
        
        # Wait for dropdown to appear
        settings_dropdown = page.locator("#settingsDropdown")
        expect(settings_dropdown).to_be_visible()
        
        # Take screenshot with reduced timeout
        page.screenshot(path=f"{screenshot_dir}/08_settings_dropdown.png", timeout=10000)
        
        # Verify menu items are present
        profile_option = page.locator("#profileOption")
        theme_option = page.locator("#themeOption")
        logout_option = page.locator("#logoutOption")
        
        expect(profile_option).to_be_visible()
        expect(theme_option).to_be_visible()
        expect(logout_option).to_be_visible()
        
    
    def test_theme_dropdown_opens(self, logged_in_page: Page, screenshot_dir: str):
        """Test that theme dropdown opens in settings"""
        page = logged_in_page
        
        # Open settings dropdown
        settings_btn = page.locator("#settingsBtn")
        settings_btn.click()
        
        # Click theme option
        theme_option = page.locator("#themeOption")
        theme_option.click()
        
        # Wait for theme dropdown to appear
        theme_dropdown = page.locator("#themeDropdown")
        expect(theme_dropdown).to_be_visible()
        
        # Take screenshot with reduced timeout
        page.screenshot(path=f"{screenshot_dir}/09_theme_dropdown.png", timeout=10000)
        
        # Verify theme options are present
        # Use specific selectors for dropdown items to avoid matching html tag
        light_mode = page.locator('#themeDropdown [data-theme="light"]')
        dark_mode = page.locator('#themeDropdown [data-theme="dark"]')
        
        expect(light_mode).to_be_visible()
        expect(dark_mode).to_be_visible()
        
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--html=reports/phase1_report.html"])

