from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os
from pydantic import BaseModel

from motor.motor_asyncio import AsyncIOMotorClient
from models_activity import ActivityLog
from auth import get_current_user

router = APIRouter()

# DB Connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- MODELS ---

class ActivityFilter(BaseModel):
    user_id: Optional[str] = None
    module: Optional[str] = None
    action: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class FlexiTimeSettings(BaseModel):
    key: str = "flexi_time"
    enabled: bool = True
    # Jam kerja standar
    jam_masuk_normal: str = "08:00"
    jam_pulang_normal: str = "16:00"
    # Toleransi masuk (dalam menit)
    toleransi_terlambat: int = 15
    # Range flexi-time (jam masuk bisa antara ini)
    flexi_masuk_awal: str = "06:00"
    flexi_masuk_akhir: str = "09:00"
    # Durasi kerja minimum (dalam jam)
    durasi_kerja_minimum: float = 8.0
    # Hari kerja
    hari_kerja: List[str] = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
    # Keterangan
    notes: Optional[str] = None

# --- ACTIVITY LOG ENDPOINTS ---

@router.get("/logs")
async def get_activity_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user_id: Optional[str] = None,
    module: Optional[str] = None,
    action: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    """
    Get paginated activity logs with filters
    """
    query = {}
    
    if user_id:
        query["user_id"] = user_id
    
    if module:
        query["module"] = module
    
    if action:
        query["action"] = action
    
    if start_date:
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query["timestamp"] = {"$gte": start}
        except:
            pass
    
    if end_date:
        try:
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            if "timestamp" in query:
                query["timestamp"]["$lte"] = end
            else:
                query["timestamp"] = {"$lte": end}
        except:
            pass
    
    if search:
        query["$or"] = [
            {"details": {"$regex": search, "$options": "i"}},
            {"user_name": {"$regex": search, "$options": "i"}},
            {"module": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    
    total = await db.activity_logs.count_documents(query)
    logs = await db.activity_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    # Convert ObjectId to string
    result = []
    for log in logs:
        log['id'] = str(log['_id'])
        del log['_id']
        # Convert timestamp to ISO string if needed
        if isinstance(log.get('timestamp'), datetime):
            log['timestamp'] = log['timestamp'].isoformat()
        result.append(log)
    
    return {
        "data": result,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/summary")
async def get_activity_summary(
    days: int = Query(7, ge=1, le=90),
    current_user: str = Depends(get_current_user)
):
    """
    Get activity summary for dashboard
    """
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Total activities
    total = await db.activity_logs.count_documents({"timestamp": {"$gte": start_date}})
    
    # Activities by module
    pipeline_module = [
        {"$match": {"timestamp": {"$gte": start_date}}},
        {"$group": {"_id": "$module", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    by_module = await db.activity_logs.aggregate(pipeline_module).to_list(10)
    
    # Activities by action
    pipeline_action = [
        {"$match": {"timestamp": {"$gte": start_date}}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    by_action = await db.activity_logs.aggregate(pipeline_action).to_list(10)
    
    # Activities by user
    pipeline_user = [
        {"$match": {"timestamp": {"$gte": start_date}}},
        {"$group": {"_id": {"user_id": "$user_id", "user_name": "$user_name"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    by_user = await db.activity_logs.aggregate(pipeline_user).to_list(10)
    
    # Activities by day
    pipeline_daily = [
        {"$match": {"timestamp": {"$gte": start_date}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    by_day = await db.activity_logs.aggregate(pipeline_daily).to_list(days)
    
    # Recent activities
    recent = await db.activity_logs.find({"timestamp": {"$gte": start_date}}).sort("timestamp", -1).limit(5).to_list(5)
    for log in recent:
        log['id'] = str(log['_id'])
        del log['_id']
        if isinstance(log.get('timestamp'), datetime):
            log['timestamp'] = log['timestamp'].isoformat()
    
    return {
        "total_activities": total,
        "by_module": [{"module": item["_id"], "count": item["count"]} for item in by_module],
        "by_action": [{"action": item["_id"], "count": item["count"]} for item in by_action],
        "by_user": [{"user_id": item["_id"]["user_id"], "user_name": item["_id"]["user_name"], "count": item["count"]} for item in by_user],
        "by_day": [{"date": item["_id"], "count": item["count"]} for item in by_day],
        "recent_activities": recent,
        "period_days": days
    }

@router.get("/users")
async def get_active_users(
    days: int = Query(30, ge=1, le=365),
    current_user: str = Depends(get_current_user)
):
    """
    Get list of users who have activity
    """
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    pipeline = [
        {"$match": {"timestamp": {"$gte": start_date}}},
        {"$group": {
            "_id": "$user_id",
            "user_name": {"$first": "$user_name"},
            "activity_count": {"$sum": 1},
            "last_activity": {"$max": "$timestamp"},
            "modules": {"$addToSet": "$module"}
        }},
        {"$sort": {"activity_count": -1}}
    ]
    
    users = await db.activity_logs.aggregate(pipeline).to_list(100)
    
    result = []
    for u in users:
        result.append({
            "user_id": u["_id"],
            "user_name": u["user_name"],
            "activity_count": u["activity_count"],
            "last_activity": u["last_activity"].isoformat() if isinstance(u["last_activity"], datetime) else u["last_activity"],
            "modules": u["modules"]
        })
    
    return result

@router.get("/modules")
async def get_available_modules(current_user: str = Depends(get_current_user)):
    """
    Get list of all modules that have activity
    """
    modules = await db.activity_logs.distinct("module")
    return modules

@router.get("/actions")
async def get_available_actions(current_user: str = Depends(get_current_user)):
    """
    Get list of all action types
    """
    actions = await db.activity_logs.distinct("action")
    return actions

@router.get("/user/{user_id}")
async def get_user_activity_report(
    user_id: str,
    days: int = Query(30, ge=1, le=365),
    current_user: str = Depends(get_current_user)
):
    """
    Get detailed activity report for a specific user
    """
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get user info
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"_id": 0, "hashed_password": 0})
    if not user:
        user = {"full_name": "Unknown User"}
    
    # Activity by module
    pipeline_module = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": start_date}}},
        {"$group": {"_id": "$module", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_module = await db.activity_logs.aggregate(pipeline_module).to_list(20)
    
    # Activity by action
    pipeline_action = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": start_date}}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_action = await db.activity_logs.aggregate(pipeline_action).to_list(20)
    
    # Daily activity
    pipeline_daily = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": start_date}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": -1}},
        {"$limit": 30}
    ]
    daily = await db.activity_logs.aggregate(pipeline_daily).to_list(30)
    
    # Recent activities
    recent = await db.activity_logs.find(
        {"user_id": user_id, "timestamp": {"$gte": start_date}}
    ).sort("timestamp", -1).limit(20).to_list(20)
    
    for log in recent:
        log['id'] = str(log['_id'])
        del log['_id']
        if isinstance(log.get('timestamp'), datetime):
            log['timestamp'] = log['timestamp'].isoformat()
    
    # Total count
    total = await db.activity_logs.count_documents({"user_id": user_id, "timestamp": {"$gte": start_date}})
    
    return {
        "user": user,
        "user_id": user_id,
        "period_days": days,
        "total_activities": total,
        "by_module": [{"module": item["_id"], "count": item["count"]} for item in by_module],
        "by_action": [{"action": item["_id"], "count": item["count"]} for item in by_action],
        "daily_activity": [{"date": item["_id"], "count": item["count"]} for item in daily],
        "recent_activities": recent
    }

# --- FLEXI-TIME SETTINGS ENDPOINTS ---

@router.get("/flexi-time")
async def get_flexi_time_settings(current_user: str = Depends(get_current_user)):
    """
    Get flexi-time settings
    """
    settings = await db.system_settings.find_one({"key": "flexi_time"})
    
    if not settings:
        # Return default settings
        default = FlexiTimeSettings()
        return default.model_dump()
    
    if "_id" in settings:
        settings["id"] = str(settings["_id"])
        del settings["_id"]
    
    return settings

@router.put("/flexi-time")
async def update_flexi_time_settings(
    settings: FlexiTimeSettings,
    current_user: str = Depends(get_current_user)
):
    """
    Update flexi-time settings
    """
    settings_dict = settings.model_dump()
    settings_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.system_settings.update_one(
        {"key": "flexi_time"},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"message": "Pengaturan flexi-time berhasil disimpan"}

# --- HELPER TO LOG ACTIVITY FROM FRONTEND ---

class FrontendActivityLog(BaseModel):
    action: str
    module: str
    target_id: Optional[str] = None
    details: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    page_url: Optional[str] = None

@router.post("/log")
async def log_frontend_activity(
    log_data: FrontendActivityLog,
    current_user: dict = Depends(get_current_user)
):
    """
    Log activity from frontend
    """
    try:
        entry = {
            "user_id": str(current_user.get("_id", current_user.get("id", ""))),
            "user_name": current_user.get("full_name", "Unknown"),
            "action": log_data.action,
            "module": log_data.module,
            "target_id": log_data.target_id,
            "details": log_data.details,
            "metadata": log_data.metadata or {},
            "page_url": log_data.page_url,
            "timestamp": datetime.now(timezone.utc),
            "source": "frontend"
        }
        
        await db.activity_logs.insert_one(entry)
        
        return {"message": "Activity logged", "success": True}
    except Exception as e:
        print(f"Failed to log frontend activity: {e}")
        return {"message": "Failed to log activity", "success": False}
