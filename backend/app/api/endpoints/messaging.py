from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from ...db.mongodb import get_database
from ...schemas.schemas import Conversation, Message
from ..deps import get_current_user
from bson import ObjectId

router = APIRouter()

@router.get("/conversations/{user_id}", response_model=List[Conversation])
async def get_conversations(user_id: str, current_user: dict = Depends(get_current_user)) -> List[dict]:
    """
    Fetch all conversations for a specific user, ensuring the requester is authorized.
    
    Args:
        user_id: The ID of the user whose conversations to fetch.
        current_user: The currently authenticated user.
        
    Returns:
        A list of conversations the user is a participant in.
    """
    if user_id != current_user["email"]:
        raise HTTPException(status_code=403, detail="Not authorized to access these conversations")
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
async def send_message(recipient_id: str, sender_id: str, content: str, current_user: dict = Depends(get_current_user)) -> dict:
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
    if sender_id != current_user["email"]:
        raise HTTPException(status_code=403, detail="Cannot send message as another user")
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
async def get_message_history(conversation_id: str, current_user: dict = Depends(get_current_user)) -> List[dict]:
    """
    Fetch message history for a specific conversation, ensuring the user is a participant.
    
    Args:
        conversation_id: The ID of the conversation.
        current_user: The currently authenticated user.
        
    Returns:
        A list of messages in the conversation.
    """
    db = get_database()
    
    # Check if current_user is a participant in this conversation
    conv = await db["conversations"].find_one({"_id": ObjectId(conversation_id)})
    if not conv or current_user["email"] not in conv["participants"]:
         raise HTTPException(status_code=403, detail="Not authorized to access this conversation")
    messages = await db["messages"].find(
        {"conversation_id": conversation_id}
    ).sort("timestamp", 1).to_list(length=100)
    
    return messages
