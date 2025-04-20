"""
Authentication Utilities for Secure Gateway
------------------------------------------
JWT verification and device authentication functions
"""

import jwt
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from cryptography.hazmat.backends import default_backend

def verify_jwt(token, public_key_pem):
    """Verify JWT token using the device's public key"""
    try:
        # Load the public key
        public_key = load_pem_public_key(
            public_key_pem.encode('utf-8'),
            backend=default_backend()
        )
        
        # Decode and verify the token
        payload = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            options={"verify_signature": True}
        )
        
        return True, payload
    except jwt.ExpiredSignatureError:
        return False, "Token has expired"
    except jwt.InvalidTokenError as e:
        return False, f"Invalid token: {str(e)}"
    except Exception as e:
        return False, f"Verification error: {str(e)}"