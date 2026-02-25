from datetime import datetime, UTC
from fastapi import APIRouter, HTTPException
from ...schemas.schemas import UserAuth
from ...db.mongodb import get_database

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
        "created_at": datetime.now(UTC)
    }
    await db["users"].insert_one(user_doc)
    return {"message": "User created successfully", "user_id": auth.email}

@router.post("/login")
async def login(auth: UserAuth):
    db = get_database()
    user = await db["users"].find_one({"email": auth.email, "password": auth.password})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {"message": "Login successful", "user_id": auth.email}
