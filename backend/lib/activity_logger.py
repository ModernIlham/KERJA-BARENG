from models_activity import ActivityLog
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

# We need a separate db connection or reuse the existing one if possible.
# Since this is a lib function, we might pass the db instance or init a new one.
# For simplicity, we'll accept the db instance.

async def log_activity(
    db,
    user_id: str,
    user_name: str,
    action: str,
    module: str,
    target_id: str = None,
    details: str = None,
    metadata: dict = None
):
    """
    Logs a user activity to the database.
    """
    try:
        log_entry = ActivityLog(
            user_id=str(user_id),
            user_name=user_name,
            action=action,
            module=module,
            target_id=str(target_id) if target_id else None,
            details=details,
            metadata=metadata
        )
        
        await db.activity_logs.insert_one(
            log_entry.model_dump(by_alias=True, exclude=["id"])
        )
    except Exception as e:
        # Logging should not break the application flow, so we catch errors
        print(f"FAILED TO LOG ACTIVITY: {e}")
