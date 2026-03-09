import json
import logging

from datetime import datetime, UTC
from typing import List

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect

from ...db.mongodb import get_database
from ...schemas.schemas import Conversation, Message
from ..deps import get_current_user
from .connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/conversations/{user_id}", response_model=List[Conversation])
async def get_conversations(
    user_id: str,
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """
    Fetch all conversations for a specific user, ensuring the requester is authorized.

    Args:
        user_id: The ID of the user whose conversations to fetch.
        current_user: The currently authenticated user.

    Returns:
        A list of conversations the user is a participant in.
    """
    if user_id.lower() != current_user["email"].lower():
        logger.warning(
            "Auth fail: requesting conversations for '%s' as '%s'",
            user_id.lower(), current_user["email"].lower()
        )
        raise HTTPException(status_code=403, detail="Not authorized to access these conversations")

    db = get_database()
    conversations = await db["conversations"].find(
        {"participants": user_id}
    ).sort("updated_at", -1).to_list(length=100)

    for conv in conversations:
        conv["_id"] = str(conv["_id"])

    return conversations


@router.post("/send", response_model=Message)
async def send_message(
    recipient_id: str,
    sender_id: str,
    content: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Send a message to another user, creating a conversation if necessary.

    Args:
        recipient_id: The recipient's user ID.
        sender_id: The sender's user ID (must match current user).
        content: The text content of the message.
        current_user: The currently authenticated user.

    Returns:
        The created message document.
    """
    sender_id = sender_id.lower()
    recipient_id = recipient_id.lower()

    if sender_id != current_user["email"].lower():
        raise HTTPException(status_code=403, detail="Cannot send message as another user")

    db = get_database()

    participants = sorted([sender_id, recipient_id])
    conversation = await db["conversations"].find_one({"participants": participants})

    message = Message(sender_id=sender_id, content=content, timestamp=datetime.now(UTC))
    message_dict = message.model_dump()

    if not conversation:
        new_conv = {
            "participants": participants,
            "last_message": message_dict,
            "unread_by": [recipient_id],
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
                    "unread_by": [recipient_id],
                    "updated_at": datetime.now(UTC)
                }
            }
        )

    msg_doc = {
        "conversation_id": conv_id,
        "sender_id": sender_id,
        "content": content,
        "timestamp": datetime.now(UTC)
    }
    await db["messages"].insert_one(msg_doc)

    ws_notification = {
        "type": "new_message",
        "conversation_id": conv_id,
        "message": {
            "sender_id": sender_id,
            "content": content,
            "timestamp": msg_doc["timestamp"].isoformat()
        }
    }
    await manager.broadcast_to_participants(ws_notification, participants)

    return message


@router.websocket("/ws/{user_id}")
async def websocket_messaging(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time messaging updates."""
    await manager.connect(user_id.lower(), websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id.lower(), websocket)
    except Exception:
        manager.disconnect(user_id.lower(), websocket)


@router.post("/read/{conversation_id}")
async def mark_as_read(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a conversation as read for the current user."""
    db = get_database()
    await db["conversations"].update_one(
        {"_id": ObjectId(conversation_id)},
        {"$pull": {"unread_by": current_user["email"].lower()}}
    )
    return {"status": "success"}


@router.get("/history/{conversation_id}", response_model=List[Message])
async def get_message_history(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """
    Fetch message history for a specific conversation.

    Args:
        conversation_id: The ID of the conversation.
        current_user: The currently authenticated user.

    Returns:
        A list of messages in the conversation.
    """
    db = get_database()

    conv = await db["conversations"].find_one({"_id": ObjectId(conversation_id)})
    if not conv or current_user["email"].lower() not in [p.lower() for p in conv["participants"]]:
        raise HTTPException(status_code=403, detail="Not authorized to access this conversation")

    messages = await db["messages"].find(
        {"conversation_id": conversation_id}
    ).sort("timestamp", 1).to_list(length=100)

    return messages
