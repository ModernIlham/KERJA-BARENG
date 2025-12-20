from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from models import MongoBaseModel

class TaskComment(BaseModel):
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    user_id: str
    user_name: str
    text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Task(MongoBaseModel):
    title: str
    description: Optional[str] = None
    
    # Assignee
    assignee_id: Optional[str] = None # Link to User/Pegawai
    assignee_name: Optional[str] = None
    assignee_avatar: Optional[str] = None
    
    # Status & Priority
    status: str = "todo" # todo, in-progress, review, done
    priority: str = "medium" # low, medium, high, urgent
    
    # Dates
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Relations (The "Integration" part)
    related_asset_id: Optional[str] = None # Link to Barang/Persediaan
    related_asset_name: Optional[str] = None
    related_asset_kode: Optional[str] = None
    
    # Meta
    created_by_id: str
    created_by_name: str
    
    comments: List[TaskComment] = []
    tags: List[str] = []

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None # ISO Format string
    related_asset_id: Optional[str] = None
    tags: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    related_asset_id: Optional[str] = None
    tags: Optional[List[str]] = None

class CommentCreate(BaseModel):
    text: str
