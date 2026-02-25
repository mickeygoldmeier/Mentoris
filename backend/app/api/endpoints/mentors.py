from fastapi import APIRouter
from ...db.mongodb import get_database

router = APIRouter()

@router.get("/")
async def get_mentors():
    db = get_database()
    mentors = await db["mentors"].find({}, {"_id": 0}).to_list(length=1000)
    return mentors
