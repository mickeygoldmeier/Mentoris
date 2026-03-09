from datetime import datetime, UTC
from typing import List

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from ...db.mongodb import get_database
from ...schemas.schemas import BookingRequest
from ..deps import get_current_user

router = APIRouter()


@router.post("/request", response_model=BookingRequest)
async def create_booking_request(
    request: BookingRequest,
    current_user: dict = Depends(get_current_user)
) -> BookingRequest:
    """
    Create a new booking request from a mentee to a mentor.

    Args:
        request: The booking request data.
        current_user: The currently authenticated user (must be the mentee).

    Returns:
        The created booking request.
    """
    if request.mentee_id != current_user["email"]:
        raise HTTPException(status_code=403, detail="Cannot create booking for another user")

    db = get_database()
    request_dict = request.model_dump()
    request_dict["created_at"] = datetime.now(UTC)

    await db["bookings"].insert_one(request_dict)
    return request


@router.get("/mentor/{mentor_id}", response_model=List[BookingRequest])
async def get_mentor_bookings(
    mentor_id: str,
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """
    Fetch all booking requests received by a mentor.

    Args:
        mentor_id: The mentor's user ID.
        current_user: The currently authenticated user.

    Returns:
        A list of bookings for the mentor.
    """
    if mentor_id != current_user["email"]:
        raise HTTPException(status_code=403, detail="Not authorized to access these bookings")

    db = get_database()
    bookings = await db["bookings"].find(
        {"mentor_id": mentor_id}
    ).sort("created_at", -1).to_list(length=100)

    return bookings


@router.get("/mentee/{mentee_id}", response_model=List[BookingRequest])
async def get_mentee_bookings(
    mentee_id: str,
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """
    Fetch all booking requests sent by a mentee.

    Args:
        mentee_id: The mentee's user ID.
        current_user: The currently authenticated user.

    Returns:
        A list of bookings sent by the mentee.
    """
    if mentee_id != current_user["email"]:
        raise HTTPException(status_code=403, detail="Not authorized to access these bookings")

    db = get_database()
    bookings = await db["bookings"].find(
        {"mentee_id": mentee_id}
    ).sort("created_at", -1).to_list(length=100)

    return bookings


@router.patch("/status/{booking_id}")
async def update_booking_status(
    booking_id: str,
    status: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Update the status of a booking (accepted, rejected).

    Args:
        booking_id: The ID of the booking.
        status: The new status.
        current_user: The currently authenticated user.

    Returns:
        Success message.
    """
    db = get_database()
    booking = await db["bookings"].find_one({"_id": ObjectId(booking_id)})

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking["mentor_id"] != current_user["email"]:
        raise HTTPException(status_code=403, detail="Only the mentor can update booking status")

    if status not in ["accepted", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    result = await db["bookings"].update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"status": status}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")

    return {"status": "success"}
