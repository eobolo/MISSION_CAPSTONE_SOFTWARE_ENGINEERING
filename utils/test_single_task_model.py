import requests
import os
import sys
from typing import Dict, Any

def load_environment():
    """Load environment variables from .env file if it exists"""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

def query(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Query the single task model endpoint with error handling"""
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        return {"error": "HF_TOKEN environment variable not set"}
    
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            "https://wffxbr2n8qp1lo11.us-east-1.aws.endpoints.huggingface.cloud",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code == 401:
            return {"error": "Unauthorized: Invalid or missing HF_TOKEN"}
        elif response.status_code == 403:
            return {"error": "Forbidden: Access denied to endpoint"}
        elif response.status_code == 429:
            return {"error": "Rate limit exceeded: Too many requests"}
        elif response.status_code == 500:
            return {"error": "Internal server error: Model endpoint issue"}
        elif response.status_code == 503:
            return {"error": "Service unavailable: Model is loading"}
        elif response.status_code != 200:
            return {"error": f"HTTP {response.status_code}: {response.text}"}
        
        return response.json()
        
    except requests.exceptions.Timeout:
        return {"error": "Request timeout: Model took too long to respond"}
    except requests.exceptions.ConnectionError:
        return {"error": "Connection error: Unable to reach endpoint"}
    except requests.exceptions.RequestException as e:
        return {"error": f"Request failed: {str(e)}"}
    except ValueError:
        return {"error": "Invalid JSON response from server"}

def main():
    load_environment()
    
    payload = {
        "inputs": "Yesterday I go to the market and I buy three apple and two banana. The seller was very nice and he give me a discount. When I come home my mother was happy because she love fresh fruits.",
        "parameters": {
            "max_new_tokens": 600
        }
    }
    
    result = query(payload)
    
    if "error" in result:
        sys.stderr.write(f"Error: {result['error']}\n")
        sys.exit(1)
    
    if isinstance(result, list) and len(result) > 0:
        print(result[0]["correction"])
        print(result[0]["feedback"])
    else:
        sys.stderr.write("Error: Invalid response format\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
