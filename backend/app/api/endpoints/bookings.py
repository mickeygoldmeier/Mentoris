from datetime import datetime, UTC
from typing import List

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from ...db.mongodb import get_database
from ...schemas.schemas import BookingRequest
from ..deps import get_current_user

router = APIRouter()


@router.post("/request")
async def create_booking_request(
    request: BookingRequest,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Create a new booking request from a mentee to a mentor.

    Validates that the requested slot exists in the mentor's availability
    and that no conflicting booking exists for the same date/time.
    """
    if request.mentee_id != current_user["email"]:
        raise HTTPException(status_code=403, detail="Cannot create booking for another user")

    db = get_database()

    # Validate slot exists in mentor's availability
    availability = await db["availability"].find_one({"mentor_id": request.mentor_id})
    if not availability or not availability.get("slots"):
        raise HTTPException(status_code=400, detail="Mentor has no availability set")

    slot_exists = any(
        (s.get("start_time") == request.start_time and s.get("end_time") == request.end_time)
        and (
            (s.get("slot_type", "recurring") == "one_time" and s.get("date") == request.date)
            or (s.get("slot_type", "recurring") == "recurring" and s.get("day_of_week") == request.day_of_week)
        )
        for s in availability["slots"]
    )
    if not slot_exists:
        raise HTTPException(status_code=400, detail="Selected time slot is not available")

    # Check for conflicting bookings on the same date/time
    conflict = await db["bookings"].find_one({
        "mentor_id": request.mentor_id,
        "date": request.date,
        "start_time": request.start_time,
        "end_time": request.end_time,
        "status": {"$in": ["pending", "accepted"]}
    })
    if conflict:
        raise HTTPException(status_code=409, detail="This time slot is already booked")

    request_dict = request.model_dump()
    request_dict["created_at"] = datetime.now(UTC)

    result = await db["bookings"].insert_one(request_dict)
    request_dict["_id"] = str(result.inserted_id)
    return request_dict


@router.get("/mentor/{mentor_id}")
async def get_mentor_bookings(
    mentor_id: str,
    current_user: dict = Depends(get_current_user)
) -> list:
    """
    Fetch all booking requests received by a mentor.
    Returns raw dicts so _id is included for status updates.
    """
    if mentor_id != current_user["email"]:
        raise HTTPException(status_code=403, detail="Not authorized to access these bookings")

    db = get_database()
    bookings = await db["bookings"].find(
        {"mentor_id": mentor_id}
    ).sort("created_at", -1).to_list(length=100)

    # Convert ObjectId to string for JSON serialization
    for b in bookings:
        b["_id"] = str(b["_id"])

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
    Sends an automatic message to the mentee notifying them of the decision.
    """
    db = get_database()
    booking = await db["bookings"].find_one({"_id": ObjectId(booking_id)})

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    mentor_email = current_user["email"].lower()
    if booking["mentor_id"].lower() != mentor_email:
        raise HTTPException(status_code=403, detail="Only the mentor can update booking status")

    if status not in ["accepted", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    result = await db["bookings"].update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"status": status}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Send automatic notification message to mentee
    response_data = {"status": "success"}

    if status in ["accepted", "rejected"]:
        mentee_email = booking["mentee_id"].lower()

        date_str = booking.get("date", "")
        time_str = f"{booking.get('start_time', '')}–{booking.get('end_time', '')}"
        topic = booking.get('topic', 'מפגש מנטורינג')

        # Generate links
        ics_link = ""
        if status == "accepted" and date_str and booking.get("start_time") and booking.get("end_time"):
            try:
                # API base might be hosted later, using relative path for frontend logic, but we need full URL for message if possible.
                # Since frontend runs on same domain frontend, we can pass relative backend path.
                ics_link = f"http://localhost:8000/api/v1/bookings/ics/{booking_id}"
                
                response_data["ics_link"] = ics_link

                # Save link to booking so mentor dashboard can use it later
                await db["bookings"].update_one(
                    {"_id": ObjectId(booking_id)},
                    {"$set": {"ics_link": ics_link}, "$unset": {"calendar_link": ""}}
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error generating calendar link: {e}")

        if status == "accepted":
            content = f"היי! אישרתי את הסשן שלנו בנושא '{topic}' בתאריך {date_str} בשעה {time_str}. נשתמע! 🎉"
            if ics_link:
                content += f"\n\n[CALENDAR_LINKS]ics={ics_link}"
        else:
            content = f"היי, לצערי נאלצתי לדחות את בקשת הסשן לתאריך {date_str} בשעה {time_str}. מוזמנים לנסות לקבוע מועד אחר."

        # Re-use logic similar to messaging.py to send the message
        from .messaging import manager
        from ...schemas.schemas import Message

        participants = sorted([mentor_email, mentee_email])
        conversation = await db["conversations"].find_one({"participants": participants})

        message = Message(sender_id=mentor_email, content=content, timestamp=datetime.now(UTC))
        message_dict = message.model_dump()

        if not conversation:
            new_conv = {
                "participants": participants,
                "last_message": message_dict,
                "unread_by": [mentee_email],
                "updated_at": datetime.now(UTC)
            }
            res = await db["conversations"].insert_one(new_conv)
            conv_id = str(res.inserted_id)
        else:
            conv_id = str(conversation["_id"])
            await db["conversations"].update_one(
                {"_id": conversation["_id"]},
                {
                    "$set": {
                        "last_message": message_dict,
                        "unread_by": [mentee_email],
                        "updated_at": datetime.now(UTC)
                    }
                }
            )

        msg_doc = {
            "conversation_id": conv_id,
            "sender_id": mentor_email,
            "content": content,
            "timestamp": datetime.now(UTC)
        }
        await db["messages"].insert_one(msg_doc)

        ws_notification = {
            "type": "new_message",
            "conversation_id": conv_id,
            "message": {
                "sender_id": mentor_email,
                "content": content,
                "timestamp": msg_doc["timestamp"].isoformat()
            }
        }
        await manager.broadcast_to_participants(ws_notification, participants)

    return response_data


from fastapi.responses import Response

@router.get("/ics/{booking_id}")
async def get_booking_ics(booking_id: str):
    """
    Generate and return an ICS file for a specific booking.
    """
    db = get_database()
    booking = await db["bookings"].find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    date_str = booking.get("date", "")
    start_time = booking.get("start_time", "")
    end_time = booking.get("end_time", "")
    topic = booking.get("topic", "מפגש מנטורינג")
    mentor_email = booking.get("mentor_id", "")
    mentee_email = booking.get("mentee_id", "")

    if not (date_str and start_time and end_time):
        raise HTTPException(status_code=400, detail="Booking missing date/time")

    try:
        start_dt = date_str.replace("-", "") + "T" + start_time.replace(":", "") + "00"
        end_dt = date_str.replace("-", "") + "T" + end_time.replace(":", "") + "00"
        now_dt = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")

        ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Mentoris//Calendar//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
DTSTAMP:{now_dt}
DTSTART;TZID=Asia/Jerusalem:{start_dt}
DTEND;TZID=Asia/Jerusalem:{end_dt}
SUMMARY:Mentoris: {topic}
DESCRIPTION:מפגש מנטורינג עם {mentor_email} ו-{mentee_email}
UID:mentoris-{booking_id}@mentoris.app
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR"""

        return Response(content=ics_content, media_type="text/calendar", headers={
            "Content-Disposition": f"attachment; filename=mentoris_session.ics"
        })
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error generating ICS: {e}")
        raise HTTPException(status_code=500, detail="Error generating calendar file")
