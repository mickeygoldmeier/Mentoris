from datetime import datetime, UTC
from fastapi import APIRouter, HTTPException
from ...schemas.schemas import UserAuth
from ...db.mongodb import get_database
from ...services.ai_service import ai_service

router = APIRouter()

@router.post("/signup")
async def signup(auth: UserAuth):
    db = get_database()
    existing_user = await db["users"].find_one({"email": auth.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_doc = {
        "email": auth.email,
        "password": auth.password,
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

        mentor_doc = {
            "טוויטר / שם": auth.mentor_data.name,
            "role": enrichment.get("role", "מנטור"),
            "summary": enrichment.get("summary", ""),
            "tags": enrichment.get("tags", []),
            "באיזה תחומים אתם מציעים מנטורינג?": auth.mentor_data.fields,
            "רקע רלוונטי": auth.mentor_data.background,
            "contact": {
                "email": auth.email,
                "calendar": getattr(auth.mentor_data, "calendar", ""),
                "phone": getattr(auth.mentor_data, "phone", "")
            },
            "email": auth.email
        }
        await db["mentors"].insert_one(mentor_doc)

    return {"message": "User created successfully", "user_id": auth.email, "role": auth.role}

@router.post("/login")
async def login(auth: UserAuth):
    db = get_database()
    user = await db["users"].find_one({"email": auth.email, "password": auth.password})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {"message": "Login successful", "user_id": auth.email, "role": user.get("role", "mentee")}
