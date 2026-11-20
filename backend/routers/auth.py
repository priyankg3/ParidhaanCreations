# Authentication Router
from fastapi import APIRouter, HTTPException, Header, Cookie, Response
from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
import uuid
import logging
import httpx
import os
import re

# Password hashing
from passlib.context import CryptContext

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# These will be injected from main server
db = None
GOOGLE_CLIENT_ID = None
ADMIN_EMAILS = []

def init_router(database, google_client_id, admin_emails):
    """Initialize router with dependencies"""
    global db, GOOGLE_CLIENT_ID, ADMIN_EMAILS
    db = database
    GOOGLE_CLIENT_ID = google_client_id
    ADMIN_EMAILS = admin_emails

# ==================== MODELS ====================

class GoogleAuthRequest(BaseModel):
    credential: str

class EmailRegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    phone: Optional[str] = None

class EmailLoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class User(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    is_admin: bool = False
    avatar_url: Optional[str] = None
    auth_provider: Optional[str] = "email"

# ==================== HELPER FUNCTIONS ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def validate_password(password: str) -> tuple:
    """Validate password strength"""
    if len(password) < 6:
        return False, "Password must be at least 6 characters"
    return True, ""

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

async def get_current_user(authorization: Optional[str] = None, session_token: Optional[str] = None):
    """Get current user from session token"""
    if not session_token:
        return None
    
    session = await db.sessions.find_one({"session_token": session_token})
    if not session:
        return None
    
    user_data = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_data:
        return None
    
    return User(**user_data)

async def create_session(user_id: str, response: Response) -> str:
    """Create a new session for user"""
    session_token = f"session_{uuid.uuid4().hex}"
    session = {
        "session_token": session_token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sessions.insert_one(session)

    # The cookie has to survive a cross-subdomain hop: the frontend lives at
    # paridhaancreations.xyz and the backend at api.paridhaancreations.xyz.
    # Setting Domain to the registrable apex (via COOKIE_DOMAIN=".paridhaancreations.xyz")
    # tells the browser to send session_token on both.
    cookie_kwargs = dict(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=60 * 60 * 24 * 30,  # 30 days
    )
    cookie_domain = os.environ.get("COOKIE_DOMAIN") or None
    if cookie_domain:
        cookie_kwargs["domain"] = cookie_domain
    response.set_cookie(**cookie_kwargs)

    return session_token

# ==================== EMAIL/PASSWORD AUTH ====================

@router.post("/register")
async def register_with_email(request: EmailRegisterRequest, response: Response):
    """Register new user with email and password"""
    # Validate email
    if not validate_email(request.email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Validate password
    is_valid, error_msg = validate_password(request.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": request.email.lower()})
    if existing_user:
        # If user registered with Google, show specific message
        if existing_user.get("auth_provider") == "google":
            raise HTTPException(
                status_code=400, 
                detail="This email is already registered with Google. Please use 'Continue with Google' to login."
            )
        raise HTTPException(status_code=400, detail="Email already registered. Please login.")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    is_admin = request.email.lower() in [e.lower() for e in ADMIN_EMAILS]
    
    new_user = {
        "user_id": user_id,
        "email": request.email.lower(),
        "password_hash": get_password_hash(request.password),
        "name": request.name or request.email.split("@")[0],
        "phone": request.phone,
        "is_admin": is_admin,
        "auth_provider": "email",
        "email_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    # Create session
    session_token = await create_session(user_id, response)
    
    # Return user data (without password_hash)
    user_data = {k: v for k, v in new_user.items() if k != "password_hash" and k != "_id"}
    
    return {
        "message": "Registration successful",
        "user": user_data,
        "session_token": session_token
    }

@router.post("/login")
async def login_with_email(request: EmailLoginRequest, response: Response):
    """Login with email and password"""
    # Find user
    user = await db.users.find_one({"email": request.email.lower()})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user registered with Google
    if user.get("auth_provider") == "google" and not user.get("password_hash"):
        raise HTTPException(
            status_code=400, 
            detail="This account was created with Google. Please use 'Continue with Google' to login."
        )
    
    # Verify password
    if not user.get("password_hash") or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create session
    session_token = await create_session(user["user_id"], response)
    
    # Update last login
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Return user data
    user_data = {k: v for k, v in user.items() if k not in ["password_hash", "_id"]}
    
    return {
        "message": "Login successful",
        "user": user_data,
        "session_token": session_token
    }

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset"""
    user = await db.users.find_one({"email": request.email.lower()})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If this email exists, you will receive password reset instructions."}
    
    # Check if Google user
    if user.get("auth_provider") == "google" and not user.get("password_hash"):
        return {"message": "This account uses Google login. Please use 'Continue with Google' instead."}
    
    # Generate reset token
    reset_token = f"reset_{uuid.uuid4().hex}"
    
    await db.password_resets.insert_one({
        "token": reset_token,
        "user_id": user["user_id"],
        "email": request.email.lower(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": datetime.now(timezone.utc).isoformat(),  # 1 hour expiry (TODO: implement proper expiry)
        "used": False
    })
    
    # TODO: Send email with reset link
    # For now, log the token (in production, send email)
    logging.info(f"Password reset requested for {request.email}. Token: {reset_token}")
    
    return {"message": "If this email exists, you will receive password reset instructions."}

@router.post("/set-password")
async def set_password_for_google_user(
    email: str,
    new_password: str,
    response: Response
):
    """
    Allow Google users to set a password so they can also login with email/password.
    This is a one-time setup for existing Google users.
    """
    # Validate password
    is_valid, error_msg = validate_password(new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Find user
    user = await db.users.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already has password
    if user.get("password_hash"):
        raise HTTPException(status_code=400, detail="Password already set. Use forgot password to reset.")
    
    # Set password
    await db.users.update_one(
        {"email": email.lower()},
        {"$set": {
            "password_hash": get_password_hash(new_password),
            "auth_provider": "both"  # Now supports both methods
        }}
    )
    
    # Create session
    session_token = await create_session(user["user_id"], response)
    
    # Get updated user
    updated_user = await db.users.find_one({"email": email.lower()}, {"_id": 0, "password_hash": 0})
    
    return {
        "message": "Password set successfully. You can now login with email/password.",
        "user": updated_user,
        "session_token": session_token
    }

@router.post("/admin/force-set-password")
async def admin_force_set_password(
    email: str,
    new_password: str,
    admin_secret: str,
    response: Response
):
    """
    Emergency endpoint to set password for admin users.
    Requires admin secret key for security.
    """
    # Admin secret check - use a simple secret for now
    ADMIN_SECRET = "paridhaan_admin_2026"
    
    if admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    
    # Validate password
    is_valid, error_msg = validate_password(new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Find user
    user = await db.users.find_one({"email": email.lower()})
    
    if not user:
        # Create new admin user if not exists
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        is_admin = email.lower() in [e.lower() for e in ADMIN_EMAILS]
        
        new_user = {
            "user_id": user_id,
            "email": email.lower(),
            "password_hash": get_password_hash(new_password),
            "name": email.split("@")[0],
            "is_admin": is_admin,
            "auth_provider": "email",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
        user = new_user
    else:
        # Update existing user's password
        await db.users.update_one(
            {"email": email.lower()},
            {"$set": {
                "password_hash": get_password_hash(new_password),
                "auth_provider": "both"
            }}
        )
    
    # Create session
    session_token = await create_session(user.get("user_id", user["user_id"]), response)
    
    return {
        "message": "Password set successfully for admin",
        "session_token": session_token
    }

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, response: Response):
    """Reset password with token"""
    # Find reset token
    reset_record = await db.password_resets.find_one({
        "token": request.token,
        "used": False
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Validate new password
    is_valid, error_msg = validate_password(request.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Update password
    await db.users.update_one(
        {"user_id": reset_record["user_id"]},
        {"$set": {
            "password_hash": get_password_hash(request.new_password),
            "auth_provider": "email"  # Ensure auth provider is set
        }}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": request.token},
        {"$set": {"used": True}}
    )
    
    # Create new session
    session_token = await create_session(reset_record["user_id"], response)
    
    # Get user data
    user = await db.users.find_one({"user_id": reset_record["user_id"]}, {"_id": 0, "password_hash": 0})
    
    return {
        "message": "Password reset successful",
        "user": user,
        "session_token": session_token
    }

# ==================== GOOGLE AUTH ====================

@router.post("/google")
async def google_auth(auth_request: GoogleAuthRequest, response: Response):
    """Authenticate with Google OAuth"""
    try:
        # Verify Google token
        async with httpx.AsyncClient() as client:
            google_response = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={auth_request.credential}"
            )
        
        if google_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        
        google_data = google_response.json()
        email = google_data.get("email")
        name = google_data.get("name")
        picture = google_data.get("picture")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email.lower()})
        
        if existing_user:
            user_id = existing_user["user_id"]
            # Update user info
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "name": name, 
                    "avatar_url": picture,
                    "auth_provider": "google",
                    "last_login": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            is_admin = email.lower() in [e.lower() for e in ADMIN_EMAILS]
            
            new_user = {
                "user_id": user_id,
                "email": email.lower(),
                "name": name,
                "avatar_url": picture,
                "is_admin": is_admin,
                "auth_provider": "google",
                "email_verified": True,  # Google emails are verified
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
        
        # Create session
        session_token = await create_session(user_id, response)
        
        # Get user data
        user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        
        return {
            "message": "Login successful",
            "user": user_data,
            "session_token": session_token
        }
        
    except httpx.RequestError as e:
        logging.error(f"Google auth error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to verify Google token")

# ==================== SESSION MANAGEMENT ====================

@router.get("/me")
async def get_me(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get current user info"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user.model_dump()

@router.post("/logout")
async def logout(
    response: Response,
    session_token: Optional[str] = Cookie(None)
):
    """Logout user"""
    if session_token:
        await db.sessions.delete_one({"session_token": session_token})
    
    # Delete with matching attributes so the browser actually clears it
    # (same path + domain combo the cookie was set with).
    cookie_domain = os.environ.get("COOKIE_DOMAIN") or None
    if cookie_domain:
        response.delete_cookie(key="session_token", path="/", domain=cookie_domain)
    else:
        response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== ADDITIONAL ENDPOINTS ====================

@router.post("/session")
async def verify_session(
    session_token: Optional[str] = Cookie(None)
):
    """Verify if session is valid"""
    if not session_token:
        return {"valid": False}
    
    session = await db.sessions.find_one({"session_token": session_token})
    if not session:
        return {"valid": False}
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        return {"valid": False}
    
    return {"valid": True, "user": user}
