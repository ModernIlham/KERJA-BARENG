from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId

class ActivityLog(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    user_name: str
    action: str  # e.g., "CREATE", "UPDATE", "DELETE", "LOGIN", "EXPORT"
    module: str  # e.g., "Barang", "Persediaan", "Kepegawaian"
    target_id: Optional[str] = None # The ID of the object being acted upon
    details: Optional[str] = None # Human readable summary
    metadata: Optional[Dict[str, Any]] = None # Full data snapshot or diff
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
