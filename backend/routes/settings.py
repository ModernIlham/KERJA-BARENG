from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- Models for Settings ---
class UnitKerja(BaseModel):
    id: Optional[str] = None
    nama_unit: str
    eselon: str # Eselon 1, 2, 3, 4
    parent_id: Optional[str] = None # For hierarchy
    
class UserSettings(BaseModel):
    email: str
    full_name: str
    role: str
    is_active: bool

# --- Routes ---

@router.get("/users", response_model=List[UserSettings])
async def get_users(current_user: str = Depends(get_current_user)):
    users = await db.users.find().to_list(100)
    return [
        UserSettings(
            email=u['email'], 
            full_name=u['full_name'], 
            role=u.get('role', 'user'),
            is_active=True 
        ) for u in users
    ]

@router.get("/unit-kerja")
async def get_unit_kerja(current_user: str = Depends(get_current_user)):
    # Return flat list, frontend can build tree
    units = await db.unit_kerja.find().to_list(1000)
    # Map _id to id string
    result = []
    for u in units:
        u['id'] = str(u['_id'])
        result.append(u)
    return result

@router.post("/unit-kerja")
async def add_unit_kerja(unit: UnitKerja, current_user: str = Depends(get_current_user)):
    new_unit = unit.dict(exclude={'id'})
    res = await db.unit_kerja.insert_one(new_unit)
    return {"message": "Unit Kerja added", "id": str(res.inserted_id)}

@router.delete("/unit-kerja/{id}")
async def delete_unit_kerja(id: str, current_user: str = Depends(get_current_user)):
    # Check dependencies?
    await db.unit_kerja.delete_one({"_id": ObjectId(id)})
    return {"message": "Unit Kerja deleted"}
