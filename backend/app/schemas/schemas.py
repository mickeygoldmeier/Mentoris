from pydantic import BaseModel, Field
from typing import List, Optional, Union
from datetime import datetime

class ChatMessage(BaseModel):
    user_id: str
    message: str

class ChatResponse(BaseModel):
    response: str

class ContactInfo(BaseModel):
    email: Optional[str] = None
    calendar: Optional[str] = None
    phone: Optional[str] = None
    free_text: Optional[str] = None

class MentorBase(BaseModel):
    user_id: Optional[str] = None
    name: str = Field(..., alias="טוויטר / שם")
    fields: str = Field(..., alias="באיזה תחומים אתם מציעים מנטורינג?")
    background: str = Field(..., alias="רקע רלוונטי")
    contact: Optional[Union[ContactInfo, str]] = None
    summary: Optional[str] = None
    tags: List[str] = []
    role: Optional[str] = None

    class Config:
        populate_by_name = True

class Message(BaseModel):
    sender_id: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Conversation(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    participants: List[str]  # user_ids
    last_message: Optional[Message] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BookingRequest(BaseModel):
    mentor_id: str
    mentee_id: str
    suggested_time: str
    topic: str
    status: str = "pending" # pending, accepted, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserAuth(BaseModel):
    email: str
    password: str
    role: Optional[str] = "mentee"
    mentor_data: Optional[MentorBase] = None

class UserBase(BaseModel):
    email: str
    created_at: datetime

