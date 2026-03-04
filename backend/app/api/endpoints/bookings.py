from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from ...db.mongodb import get_database
from ...schemas.schemas import BookingRequest
from bson import ObjectId

router = APIRouter()

@router.post("/request", response_model=BookingRequest)
async def create_booking_request(request: BookingRequest):
    """
    Create a new booking request from a mentee to a mentor.
    """
    db = get_database()
    request_dict = request.dict()
    request_dict["created_at"] = datetime.utcnow()
    
    res = await db["bookings"].insert_one(request_dict)
    return request

@router.get("/mentor/{mentor_id}", response_model=List[BookingRequest])
async def get_mentor_bookings(mentor_id: str):
    """
    Fetch all bookings for a mentor.
    """
    db = get_database()
    bookings = await db["bookings"].find(
        {"mentor_id": mentor_id}
    ).sort("created_at", -1).to_list(length=100)
    
    return bookings

@router.get("/mentee/{mentee_id}", response_model=List[BookingRequest])
async def get_mentee_bookings(mentee_id: str):
    """
    Fetch all bookings for a mentee.
    """
    db = get_database()
    bookings = await db["bookings"].find(
        {"mentee_id": mentee_id}
    ).sort("created_at", -1).to_list(length=100)
    
    return bookings

@router.patch("/status/{booking_id}")
async def update_booking_status(booking_id: str, status: str):
    """
    Update the status of a booking (accepted, rejected).
    """
    if status not in ["accepted", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    db = get_database()
    res = await db["bookings"].update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"status": status}}
    )
    
    if res.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    return {"status": "success"}
