from datetime import datetime, UTC
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from ...schemas.schemas import ChatMessage, ChatResponse
from ...db.mongodb import get_database
from ...services.ai_service import ai_service
from ..deps import get_current_user
import os
import urllib.parse

router = APIRouter()

@router.get("/history/{user_id}")
async def get_chat_history(user_id: str, current_user: dict = Depends(get_current_user)) -> List[dict]:
    """
    Fetch the AI chat history for a specific user.
    """
    log_path = r"C:\Users\mmgol\Documents\projects\side-projects\mentoris\backend\backend_debug.log"
    
    # Explicitly decode just in case
    decoded_user_id = urllib.parse.unquote(user_id)
    
    with open(log_path, 'a') as f:
        f.write(f"DEBUG: get_chat_history - Raw: '{user_id}', Decoded: '{decoded_user_id}', Current: '{current_user.get('email')}'\n")
    
    if decoded_user_id.lower() != current_user["email"].lower():
        raise HTTPException(status_code=403, detail="Not authorized to access this history")
    
    db = get_database()
    history = await db["chats"].find({"user_id": decoded_user_id}, {"_id": 0}).sort("timestamp", 1).to_list(length=100)
    return history

@router.post("/", response_model=ChatResponse)
async def chat_with_ai(message: ChatMessage, current_user: dict = Depends(get_current_user)) -> ChatResponse:
    """
    Interact with the AI assistant.
    """
    if message.user_id.lower() != current_user["email"].lower():
        raise HTTPException(status_code=403, detail="Cannot chat as another user")
    try:
        db = get_database()
        past_chats = await db["chats"].find(
            {"user_id": message.user_id}, 
            {"_id": 0}
        ).sort("timestamp", 1).to_list(length=50)
        
        gemini_history = []
        for chat in past_chats:
            gemini_history.append({"role": "user", "parts": [chat["user_message"]]})
            gemini_history.append({"role": "model", "parts": [chat["ai_response"]]})
        
        chat = ai_service.create_chat(history=gemini_history)
        response = chat.send_message(message.message)
        ai_text = response.text or "No response received."
        
        await db["chats"].insert_one({
            "user_id": message.user_id,
            "user_message": message.message,
            "ai_response": ai_text,
            "timestamp": datetime.now(UTC)
        })
        
        return ChatResponse(response=ai_text)
    except Exception as e:
        print(f"Error in chat_with_ai: {e}")
        raise HTTPException(status_code=500, detail=str(e))
