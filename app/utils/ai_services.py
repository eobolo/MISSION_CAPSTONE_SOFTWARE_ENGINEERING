import requests
import os
from decouple import config
from typing import Dict, Tuple, Optional

class AIServices:
    """Handles all AI model interactions for grammar and translation"""
    
    def __init__(self):
        self.hf_token = config("HF_TOKEN", default="")
        
        # Endpoint URLs
        self.mistral_endpoint = "https://sjue5qunezddjig4.us-east-1.aws.endpoints.huggingface.cloud"
        self.nllb_endpoint = "https://o2cic8aj8unax7y5.us-east-1.aws.endpoints.huggingface.cloud"
    
    def _make_request(self, endpoint: str, payload: Dict) -> Dict:
        """Make request to Hugging Face endpoint with robust error handling (like test file)"""
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.hf_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(endpoint, headers=headers, json=payload, timeout=100)
            
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
    
    def get_correction_and_feedback(self, text: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Get BOTH grammar correction AND feedback from combined task model in ONE call
        Returns: (corrected_text, feedback_text, error_message)
        """
        payload = {
            "inputs": text,
            "parameters": {
                "max_new_tokens": 600
            }
        }
        
        output = self._make_request(self.mistral_endpoint, payload)
        
        # Check for errors first
        if isinstance(output, dict) and "error" in output:
            return None, None, output["error"]
        
        # Extract BOTH correction and feedback
        if isinstance(output, list) and len(output) > 0:
            correction = output[0]["correction"]
            feedback = output[0]["feedback"]
            
            # Clean newlines from correction (handle both escaped and regular newlines)
            correction = correction.replace('\\n\\n', '').replace('\n\n', '').replace('\\n', '').replace('\n', '').strip()
            
            return correction, feedback, None
        
        return None, None, "Invalid response format"
    
    def translate_to_kinyarwanda(self, text: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Translate English text to Kinyarwanda using NLLB model
        Returns: (translated_text, error_message)
        """
        payload = {
            "inputs": text,
            "parameters": {
                "src_lang": "eng_Latn",  # English (Latin script)
                "tgt_lang": "kin_Latn",  # Kinyarwanda (Latin script)
                "clean_up_tokenization_spaces": True,
                "truncation": "longest_first"
            }
        }
        
        output = self._make_request(self.nllb_endpoint, payload)
        
        # Check for errors first
        if isinstance(output, dict) and "error" in output:
            # Return user-friendly message if available
            error_message = output.get("message", output.get("error"))
            return None, error_message
        
        # Extract translation
        if isinstance(output, list) and len(output) > 0:
            translation = output[0].get("translation_text", "")
            if translation:
                return translation, None
        elif isinstance(output, dict):
            translation = output.get("translation_text", "")
            if translation:
                return translation, None
        
        return None, "Unable to translate text. Please try again."
    
    def translate_to_english(self, text: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Translate Kinyarwanda text to English using NLLB model
        Returns: (translated_text, error_message)
        """
        payload = {
            "inputs": text,
            "parameters": {
                "src_lang": "kin_Latn",  # Kinyarwanda (Latin script)
                "tgt_lang": "eng_Latn",  # English (Latin script)
                "clean_up_tokenization_spaces": True,
                "truncation": "longest_first"
            }
        }
        
        output = self._make_request(self.nllb_endpoint, payload)
        
        # Check for errors first
        if isinstance(output, dict) and "error" in output:
            # Return user-friendly message if available
            error_message = output.get("message", output.get("error"))
            return None, error_message
        
        # Extract translation
        if isinstance(output, list) and len(output) > 0:
            translation = output[0].get("translation_text", "")
            if translation:
                return translation, None
        elif isinstance(output, dict):
            translation = output.get("translation_text", "")
            if translation:
                return translation, None
        
        return None, "Unable to translate text. Please try again."

# Global AI services instance
ai_services = AIServices()

