from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from ...db.mongodb import get_database
from ...schemas.schemas import Conversation, Message
from bson import ObjectId

router = APIRouter()

@router.get("/conversations/{user_id}", response_model=List[Conversation])
async def get_conversations(user_id: str):
    """
    Fetch all conversations for a specific user.
    """
    db = get_database()
    # Find conversations where the user is a participant
    conversations = await db["conversations"].find(
        {"participants": user_id}
    ).sort("updated_at", -1).to_list(length=100)
    
    # Convert _id to string for the schema
    for conv in conversations:
        conv["_id"] = str(conv["_id"])
    
    return conversations

@router.post("/send", response_model=Message)
async def send_message(recipient_id: str, sender_id: str, content: str):
    """
    Send a message to another user. Creates a conversation if one doesn't exist.
    """
    db = get_database()
    
    # Check for existing conversation between these two
    participants = sorted([sender_id, recipient_id])
    conversation = await db["conversations"].find_one({"participants": participants})
    
    message = Message(sender_id=sender_id, content=content, timestamp=datetime.utcnow())
    message_dict = message.dict()
    
    if not conversation:
        # Create new conversation
        new_conv = {
            "participants": participants,
            "last_message": message_dict,
            "updated_at": datetime.utcnow()
        }
        res = await db["conversations"].insert_one(new_conv)
        conv_id = str(res.inserted_id)
    else:
        conv_id = str(conversation["_id"])
        # Update existing conversation
        await db["conversations"].update_one(
            {"_id": conversation["_id"]},
            {
                "$set": {
                    "last_message": message_dict,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    
    # Store the actual message in a separate collection for history
    await db["messages"].insert_one({
        "conversation_id": conv_id,
        "sender_id": sender_id,
        "content": content,
        "timestamp": datetime.utcnow()
    })
    
    return message

@router.get("/history/{conversation_id}", response_model=List[Message])
async def get_message_history(conversation_id: str):
    """
    Fetch message history for a specific conversation.
    """
    db = get_database()
    messages = await db["messages"].find(
        {"conversation_id": conversation_id}
    ).sort("timestamp", 1).to_list(length=100)
    
    return messages
