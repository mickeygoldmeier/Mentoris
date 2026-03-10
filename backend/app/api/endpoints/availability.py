"""Mentor availability management endpoints."""

from datetime import datetime, UTC

from fastapi import APIRouter, Depends, HTTPException

from ...db.mongodb import get_database
from ...schemas.schemas import MentorAvailability
from ..deps import get_current_user

router = APIRouter()


@router.put("/{mentor_id}")
async def set_availability(
    mentor_id: str,
    availability: MentorAvailability,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Set or update a mentor's weekly availability.

    Args:
        mentor_id: The mentor's user ID.
        availability: The availability data with time slots.
        current_user: The currently authenticated user (must be the mentor).

    Returns:
        Success message.
    """
    if mentor_id != current_user["email"]:
        raise HTTPException(status_code=403, detail="Can only update your own availability")

    db = get_database()
    avail_dict = availability.model_dump()
    avail_dict["updated_at"] = datetime.now(UTC)

    await db["availability"].update_one(
        {"mentor_id": mentor_id},
        {"$set": avail_dict},
        upsert=True
    )

    return {"status": "success"}


@router.get("/{mentor_id}")
async def get_availability(mentor_id: str) -> dict:
    """
    Get a mentor's weekly availability. Public endpoint — no auth required.

    Args:
        mentor_id: The mentor's user ID.

    Returns:
        The mentor's availability data, or empty slots if none set.
    """
    db = get_database()
    availability = await db["availability"].find_one(
        {"mentor_id": mentor_id},
        {"_id": 0}
    )

    if not availability:
        return {"mentor_id": mentor_id, "slots": []}

    return availability
