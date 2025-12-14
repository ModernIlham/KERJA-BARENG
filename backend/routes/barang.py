from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from models import Barang, BarangCreate
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("/", response_model=List[Barang])
async def get_barang_list(
    skip: int = 0, 
    limit: int = 50, 
    search: Optional[str] = None,
    kategori: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    query = {}
    if search:
        query["nama_barang"] = {"$regex": search, "$options": "i"}
    if kategori:
        query["kategori"] = kategori
        
    cursor = db.barang.find(query).skip(skip).limit(limit).sort("nama_barang", 1)
    barang_list = await cursor.to_list(length=limit)
    return barang_list

@router.post("/", response_model=Barang)
async def create_barang(barang_in: BarangCreate, current_user: str = Depends(get_current_user)):
    # Check duplicate code
    existing = await db.barang.find_one({"kode_barang": barang_in.kode_barang})
    if existing:
        raise HTTPException(status_code=400, detail="Kode barang already exists")
        
    new_barang = Barang(**barang_in.dict())
    result = await db.barang.insert_one(new_barang.model_dump(by_alias=True, exclude=["id"]))
    created_barang = await db.barang.find_one({"_id": result.inserted_id})
    return created_barang

@router.put("/{id}", response_model=Barang)
async def update_barang(id: str, barang_update: BarangCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    update_data = barang_update.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc)
    
    result = await db.barang.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Barang not found")
    return result

@router.delete("/{id}")
async def delete_barang(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    result = await db.barang.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Barang not found")
    return {"message": "Barang deleted successfully"}

@router.get("/summary/stats")
async def get_barang_stats(current_user: str = Depends(get_current_user)):
    pipeline = [
        {"$group": {
            "_id": None,
            "total_items": {"$sum": 1},
            "total_value": {"$sum": {"$multiply": ["$stok", "$nilai_per_unit"]}},
            "critical_stock": {"$sum": {"$cond": [{"$lte": ["$stok", 5]}, 1, 0]}}
        }}
    ]
    result = await db.barang.aggregate(pipeline).to_list(1)
    if not result:
        return {"total_items": 0, "total_value": 0, "critical_stock": 0}
    return result[0]
