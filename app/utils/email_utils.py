import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from decouple import config
import logging

logger = logging.getLogger(__name__)

# Email configuration from environment variables
SMTP_HOST = config("SMTP_HOST", default="smtp.gmail.com")
SMTP_PORT = config("SMTP_PORT", default=587)
SMTP_USER = config("SMTP_USER", default="")
SMTP_PASSWORD = config("SMTP_PASSWORD", default="")
FROM_EMAIL = config("FROM_EMAIL", default="")

def send_password_reset_email(user_email: str, user_name: str, reset_token: str):
    """
    Send password reset email to user
    
    Args:
        user_email: User's email address
        user_name: User's first name
        reset_token: Unique reset token for password reset
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Create reset link - use environment variable
        BASE_URL = config("BASE_URL")
        reset_link = f"{BASE_URL}/reset-password?token={reset_token}"
        
        # Create email message
        subject = "Reset Your CBC English Proficiency Coach Password"
        
        # HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .container {{
                    background-color: #f9f9f9;
                    border-radius: 10px;
                    padding: 30px;
                    margin: 20px 0;
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #4b7cd2;
                    margin-bottom: 10px;
                }}
                .content {{
                    background-color: white;
                    padding: 30px;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 30px;
                    background-color: #4b7cd2;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                    font-weight: bold;
                }}
                .button:hover {{
                    background-color: #3a6bb0;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    color: #666;
                    font-size: 12px;
                }}
                .warning {{
                    color: #d32f2f;
                    font-size: 14px;
                    margin-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">CBC English Proficiency Coach</div>
                </div>
                
                <div class="content">
                    <h2>Hello {user_name}!</h2>
                    
                    <p>We received a request to reset your password for your CBC English Proficiency Coach account.</p>
                    
                    <p>Click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </div>
                    
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #4b7cd2;">{reset_link}</p>
                    
                    <div class="warning">
                        <strong>Important:</strong> This link will expire in 1 hour for security reasons.
                    </div>
                    
                    <p>If you didn't request a password reset, please ignore this email.</p>
                </div>
                
                <div class="footer">
                    <p>© 2024 CBC English Proficiency Coach. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text fallback
        text_body = f"""
        Hello {user_name}!
        
        We received a request to reset your password for your CBC English Proficiency Coach account.
        
        Click this link to reset your password (expires in 1 hour):
        {reset_link}
        
        If you didn't request a password reset, please ignore this email.
        
        © 2024 CBC English Proficiency Coach. All rights reserved.
        """
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = user_email
        
        # Attach both versions
        text_part = MIMEText(text_body, 'plain')
        html_part = MIMEText(html_body, 'html')
        msg.attach(text_part)
        msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Password reset email sent to {user_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email: {str(e)}")
        return False

def send_password_reset_success_email(user_email: str, user_name: str):
    """
    Send confirmation email after successful password reset
    
    Args:
        user_email: User's email address
        user_name: User's first name
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        subject = "Your CBC English Proficiency Coach Password Has Been Reset"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
                .container {{ background-color: #f9f9f9; border-radius: 10px; padding: 30px; }}
                .content {{ background-color: white; padding: 30px; border-radius: 5px; }}
                .success {{ color: #2e7d32; font-weight: bold; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="content">
                    <h2>Hello {user_name}!</h2>
                    <p class="success">✓ Your password has been successfully reset.</p>
                    <p>You can now log in with your new password.</p>
                    <p>If you didn't make this change, please contact support immediately.</p>
                </div>
                <div class="footer">
                    <p>© 2024 CBC English Proficiency Coach. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = user_email
        
        msg.attach(MIMEText(html_body, 'html'))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Password reset confirmation email sent to {user_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset confirmation: {str(e)}")
        return False
