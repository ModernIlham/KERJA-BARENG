from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import os

from motor.motor_asyncio import AsyncIOMotorClient
from models_task import Task, TaskCreate, TaskUpdate, TaskComment, CommentCreate
from auth import get_current_user
from models import User

router = APIRouter()

# DB Connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("/", response_model=List[Task])
async def get_tasks(
    status: Optional[str] = None,
    assignee_id: Optional[str] = None,
    related_asset_id: Optional[str] = None
):
    # Temporarily remove auth for testing
    query = {}
    if status:
        query["status"] = status
    if assignee_id:
        query["assignee_id"] = assignee_id
    if related_asset_id:
        query["related_asset_id"] = related_asset_id
        
    # Optional: If not admin, maybe only show own tasks? 
    # For now, "Team Tasks" implies visibility for all authorized users.
    
    cursor = db.tasks.find(query).sort("updated_at", -1)
    tasks = await cursor.to_list(length=1000)
    return tasks

@router.post("/", response_model=Task)
async def create_task(task_in: TaskCreate):
    # Temporarily hardcode user for testing
    current_user_id = "693eab2acbfc67c348f5c751"  # Admin user ID
    current_user_name = "Administrator"
    
    # Fetch Assignee Name if provided
    assignee_name = None
    assignee_avatar = None
    
    if task_in.assignee_id:
        assignee = await db.users.find_one({"_id": ObjectId(task_in.assignee_id)})
        # Or check pegawai if assignee_id is pegawai_id. 
        # Let's assume frontend sends User ID for now.
        if not assignee:
             # Try Pegawai ID
             pegawai = await db.pegawai.find_one({"_id": ObjectId(task_in.assignee_id)})
             if pegawai:
                 assignee_name = pegawai.get('nama_lengkap')
                 assignee_avatar = pegawai.get('foto_url')
        else:
            assignee_name = assignee.get('full_name')
            
    # Fetch Asset Info if provided
    asset_name = None
    asset_kode = None
    if task_in.related_asset_id:
        # Check Barang (Fixed Asset)
        asset = await db.barang.find_one({"_id": ObjectId(task_in.related_asset_id)})
        if not asset:
            # Check Persediaan
            asset = await db.persediaan.find_one({"_id": ObjectId(task_in.related_asset_id)})
            
        if asset:
            asset_name = asset.get('nama_barang')
            asset_kode = asset.get('kode_barang')

    new_task = Task(
        title=task_in.title,
        description=task_in.description,
        assignee_id=task_in.assignee_id,
        assignee_name=assignee_name,
        assignee_avatar=assignee_avatar,
        priority=task_in.priority,
        status="todo",
        due_date=datetime.fromisoformat(task_in.due_date) if task_in.due_date else None,
        related_asset_id=task_in.related_asset_id,
        related_asset_name=asset_name,
        related_asset_kode=asset_kode,
        created_by_id=current_user_id,
        created_by_name=current_user_name,
        tags=task_in.tags
    )
    
    res = await db.tasks.insert_one(new_task.model_dump(by_alias=True, exclude=["id"]))
    created_task = await db.tasks.find_one({"_id": res.inserted_id})
    return created_task

@router.patch("/{task_id}", response_model=Task)
async def update_task(task_id: str, update_in: TaskUpdate):
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    update_data = update_in.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc)
    
    # If assignee changed, update name
    if 'assignee_id' in update_data and update_data['assignee_id']:
         # Same logic as create
         assignee = await db.users.find_one({"_id": ObjectId(update_data['assignee_id'])})
         if assignee:
             update_data['assignee_name'] = assignee.get('full_name')
    
    await db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    return updated_task

@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user: User = Depends(get_current_user)):
    res = await db.tasks.delete_one({"_id": ObjectId(task_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

@router.post("/{task_id}/comments", response_model=Task)
async def add_comment(task_id: str, comment_in: CommentCreate, current_user: User = Depends(get_current_user)):
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    new_comment = TaskComment(
        user_id=str(current_user.id),
        user_name=current_user.full_name,
        text=comment_in.text
    )
    
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$push": {"comments": new_comment.model_dump()}}
    )
    
    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    return updated_task
