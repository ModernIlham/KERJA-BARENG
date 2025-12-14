from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from models import Pegawai, PegawaiCreate
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
import math

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("", response_model=Dict[str, Any])
async def get_pegawai_list(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    skip = (page - 1) * limit
    query = {}
    if search:
        query["$or"] = [
            {"nama_lengkap": {"$regex": search, "$options": "i"}},
            {"nip": {"$regex": search, "$options": "i"}}
        ]
        
    total = await db.pegawai.count_documents(query)
    cursor = db.pegawai.find(query).skip(skip).limit(limit).sort("nama_lengkap", 1)
    items = await cursor.to_list(length=limit)
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit)
    }

@router.post("", response_model=Pegawai)
async def create_pegawai(pegawai_in: PegawaiCreate, current_user: str = Depends(get_current_user)):
    existing = await db.pegawai.find_one({"nip": pegawai_in.nip})
    if existing:
        raise HTTPException(status_code=400, detail="NIP already exists")
        
    new_pegawai = Pegawai(**pegawai_in.dict())
    result = await db.pegawai.insert_one(new_pegawai.model_dump(by_alias=True, exclude=["id"]))
    return await db.pegawai.find_one({"_id": result.inserted_id})
