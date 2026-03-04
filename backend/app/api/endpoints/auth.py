from datetime import datetime, UTC
from fastapi import APIRouter, HTTPException
from ...schemas.schemas import UserAuth, ContactInfo
from ...db.mongodb import get_database
from ...services.ai_service import ai_service
from ...core.security import get_password_hash, verify_password, create_access_token

router = APIRouter()

@router.post("/signup")
async def signup(auth: UserAuth) -> dict:
    """
    Create a new user account and optional mentor profile.
    
    Args:
        auth: User authentication and profile data.
        
    Returns:
        Success message with user_id and role.
    """
    db = get_database()
    existing_user = await db["users"].find_one({"email": auth.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_doc = {
        "email": auth.email,
        "password": get_password_hash(auth.password),
        "role": auth.role,
        "created_at": datetime.now(UTC)
    }
    await db["users"].insert_one(user_doc)

    if auth.role == "mentor" and auth.mentor_data:
        # AI Enrichment on signup
        enrichment = ai_service.enrich_mentor_on_signup(
            background=auth.mentor_data.background,
            fields=auth.mentor_data.fields
        )

        # Handle structured vs string contact
        contact_data = auth.mentor_data.contact
        if isinstance(contact_data, ContactInfo):
            contact_dict = contact_data.dict()
        elif isinstance(contact_data, str):
            contact_dict = {"free_text": contact_data, "email": auth.email}
        else:
            contact_dict = {"email": auth.email}

        mentor_doc = {
            "user_id": auth.email,
            "טוויטר / שם": auth.mentor_data.name,
            "role": enrichment.get("role", "מנטור"),
            "summary": enrichment.get("summary", ""),
            "tags": enrichment.get("tags", []),
            "באיזה תחומים אתם מציעים מנטורינג?": auth.mentor_data.fields,
            "רקע רלוונטי": auth.mentor_data.background,
            "contact": contact_dict,
            "email": auth.email
        }

        await db["mentors"].insert_one(mentor_doc)

    return {"message": "User created successfully", "user_id": auth.email, "role": auth.role}

@router.post("/login")
async def login(auth: UserAuth) -> dict:
    """
    Authenticate a user and return a JWT access token.
    
    Args:
        auth: User login credentials.
        
    Returns:
        Access token and user metadata.
    """
    db = get_database()
    user = await db["users"].find_one({"email": auth.email})
    if not user or not verify_password(auth.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(subject=auth.email)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": auth.email,
        "role": user.get("role", "mentee")
    }
