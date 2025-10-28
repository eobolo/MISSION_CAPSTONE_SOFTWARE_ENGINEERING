from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
import os
from dotenv import load_dotenv

load_dotenv()

config = Config(environ=os.environ)

oauth = OAuth(config)

oauth.register(
    name='google',
    client_id=os.getenv('CLIENT_ID'),
    client_secret=os.getenv('CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile',
        # Add clock leeway to handle time synchronization issues (WSL/Docker/VMs)
        # This allows tokens to be valid even if system clocks differ by up to 120 seconds
        'claims_options': {
            'iat': {'leeway': 120},  # Issued At
            'nbf': {'leeway': 120},  # Not Before
            'exp': {'leeway': 120}   # Expiration
        }
    }
)

