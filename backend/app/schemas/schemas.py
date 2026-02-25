from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ChatMessage(BaseModel):
    user_id: str
    message: str

class ChatResponse(BaseModel):
    response: str

class UserAuth(BaseModel):
    email: str
    password: str

class MentorBase(BaseModel):
    name: str
    fields: str
    background: str
    contact: str

class UserBase(BaseModel):
    email: str
    created_at: datetime
