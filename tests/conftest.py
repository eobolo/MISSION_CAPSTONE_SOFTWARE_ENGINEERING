"""
Pytest configuration and fixtures for CBC English Proficiency Coach tests
"""
import pytest
import asyncio


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_user():
    """Create a test user for authentication"""
    return {
        "email": "test@example.com",
        "password": "TestPassword123",
        "first_name": "Test",
        "last_name": "User"
    }


# Playwright fixtures
@pytest.fixture(scope="session")
def browser_type_launch_args():
    """Browser launch arguments for Playwright"""
    return {
        "headless": False,
        "slow_mo": 100
    }


@pytest.fixture(scope="session")
def browser_context_args():
    """Browser context arguments for Playwright"""
    return {
        "viewport": {"width": 1280, "height": 720},
        "ignore_https_errors": True,
        "locale": "en-US"
    }


# Import Playwright fixtures
pytest_plugins = ["pytest_playwright"]

