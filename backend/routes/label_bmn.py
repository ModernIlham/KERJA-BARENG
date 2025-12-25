"""
Label BMN Management API
Manages sticker printing for government assets (BMN)
Features:
- Parent-Child asset relationship for accessories
- Print tracking (count, dates, user)
- Multiple sticker sizes (small, medium, large)
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone
import math

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


# --- Helper Functions ---
def sanitize_float(val):
    """Sanitize float values to be JSON compliant"""
    if val is None:
        return 0
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return 0
    return val


def sanitize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    
    if isinstance(doc, dict):
        result = {}
        for key, val in doc.items():
            if key == '_id':
                result['id'] = str(val)
            elif isinstance(val, ObjectId):
                result[key] = str(val)
            elif isinstance(val, datetime):
                result[key] = val.isoformat()
            elif isinstance(val, float):
                result[key] = sanitize_float(val)
            elif isinstance(val, dict):
                result[key] = sanitize_doc(val)
            elif isinstance(val, list):
                result[key] = [sanitize_doc(item) if isinstance(item, dict) else item for item in val]
            else:
                result[key] = val
        return result
    
    return doc
class LabelPrintLog(BaseModel):
    """Log setiap kali label dicetak"""
    id: Optional[str] = None
    barang_id: str
    ukuran: str  # kecil, sedang, besar
    printed_at: Optional[str] = None
    printed_by: Optional[str] = None
    jumlah_cetak: int = 1


class ChildAsset(BaseModel):
    """Sub-aset/aksesori yang merupakan bagian dari aset utama"""
    id: Optional[str] = None
    parent_barang_id: str  # ID aset induk
    nama_aksesori: str  # "Charger", "Tas Laptop", "Mouse", "Kabel Power"
    kode_register_anak: Optional[str] = None  # Auto-generated
    keterangan: Optional[str] = None
    created_at: Optional[str] = None
    print_count: int = 0
    last_printed: Optional[str] = None


class CreateChildAssetRequest(BaseModel):
    parent_barang_id: str
    nama_aksesori: str
    keterangan: Optional[str] = None


class PrintBatchRequest(BaseModel):
    """Request untuk mencetak batch label"""
    items: List[Dict[str, Any]]  # [{barang_id, ukuran, is_child, child_id}]
    canvas_size: str = "A4"  # A4 atau A3


async def get_instansi_info():
# --- Models ---
    """Get institution info for sticker header"""
    config = await db.system_settings.find_one({"key": "instansi"})
    if config:
        return {
            "nama_instansi": config.get("nama_instansi", "INSTANSI"),
            "logo_url": config.get("logo_url"),
            "alamat": config.get("alamat", ""),
            "kode_uakpb": config.get("kode_uakpb", "")
        }
    return {
        "nama_instansi": "INSTANSI",
        "logo_url": None,
        "alamat": "",
        "kode_uakpb": ""
    }


# --- Routes ---

@router.get("/instansi-info")
async def get_label_instansi_info(current_user: str = Depends(get_current_user)):
    """Get institution info for label header"""
    return await get_instansi_info()


@router.get("/assets")
async def get_assets_for_labeling(
    search: str = "",
    kategori: str = "",
    status_cetak: str = "",  # belum_cetak, sudah_cetak, semua
    page: int = 1,
    limit: int = 50,
    current_user: str = Depends(get_current_user)
):
    """
    Get assets list with print status for label management
    """
    skip = (page - 1) * limit
    query = {"status_aset": {"$ne": "Dihapuskan"}}
    
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"kode_barang": {"$regex": search, "$options": "i"}},
            {"kode_register": {"$regex": search, "$options": "i"}},
            {"merk": {"$regex": search, "$options": "i"}}
        ]
    
    if kategori:
        query["golongan_barang"] = {"$regex": kategori, "$options": "i"}
    
    # Get assets with aggregation to include print info
    pipeline = [
        {"$match": query},
        {"$lookup": {
            "from": "label_print_logs",
            "localField": "_id",
            "foreignField": "barang_id",
            "as": "print_logs"
        }},
        {"$addFields": {
            "print_count": {"$size": "$print_logs"},
            "last_printed": {"$max": "$print_logs.printed_at"}
        }},
        {"$project": {
            "print_logs": 0  # Exclude logs array from result
        }}
    ]
    
    # Filter by print status
    if status_cetak == "belum_cetak":
        pipeline.append({"$match": {"print_count": 0}})
    elif status_cetak == "sudah_cetak":
        pipeline.append({"$match": {"print_count": {"$gt": 0}}})
    
    # Add pagination
    count_pipeline = pipeline.copy()
    count_pipeline.append({"$count": "total"})
    
    pipeline.extend([
        {"$sort": {"kode_barang": 1, "nup": 1}},
        {"$skip": skip},
        {"$limit": limit}
    ])
    
    # Execute
    assets = await db.barang.aggregate(pipeline).to_list(limit)
    count_result = await db.barang.aggregate(count_pipeline).to_list(1)
    total = count_result[0]["total"] if count_result else 0
    
    # Sanitize results using helper function
    result = [sanitize_doc(asset) for asset in assets]
    
    return {
        "data": result,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@router.get("/asset/{barang_id}")
async def get_asset_detail_for_label(
    barang_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get single asset detail with children (accessories)"""
    try:
        oid = ObjectId(barang_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid barang_id")
    
    asset = await db.barang.find_one({"_id": oid})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset = sanitize_doc(asset)
    
    # Get print logs
    logs = await db.label_print_logs.find(
        {"barang_id": barang_id}
    ).sort("printed_at", -1).to_list(100)
    
    asset["print_logs"] = [sanitize_doc(log) for log in logs]
    asset["print_count"] = len(logs)
    
    # Get child assets (accessories)
    children = await db.child_assets.find(
        {"parent_barang_id": barang_id}
    ).to_list(100)
    
    asset["children"] = [sanitize_doc(child) for child in children]
    
    return asset


@router.post("/child-asset")
async def create_child_asset(
    request: CreateChildAssetRequest,
    current_user: str = Depends(get_current_user)
):
    """Create a child asset (accessory) linked to parent asset"""
    # Verify parent exists
    try:
        parent_oid = ObjectId(request.parent_barang_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid parent_barang_id")
    
    parent = await db.barang.find_one({"_id": parent_oid})
    if not parent:
        raise HTTPException(status_code=404, detail="Parent asset not found")
    
    # Generate child code
    parent_register = parent.get("kode_register", "") or f"{parent.get('kode_barang', '')}-{parent.get('nup', '1')}"
    
    # Count existing children
    existing_count = await db.child_assets.count_documents(
        {"parent_barang_id": request.parent_barang_id}
    )
    
    # Generate child register code
    child_suffix = request.nama_aksesori.upper().replace(" ", "")[:4]
    child_register = f"{parent_register}-{child_suffix}{existing_count + 1:02d}"
    
    new_child = {
        "parent_barang_id": request.parent_barang_id,
        "nama_aksesori": request.nama_aksesori,
        "kode_register_anak": child_register,
        "keterangan": request.keterangan,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "print_count": 0,
        "last_printed": None
    }
    
    result = await db.child_assets.insert_one(new_child)
    
    return {
        "message": "Child asset created",
        "id": str(result.inserted_id),
        "kode_register_anak": child_register
    }


@router.get("/child-assets/{parent_barang_id}")
async def get_child_assets(
    parent_barang_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get all child assets for a parent"""
    children = await db.child_assets.find(
        {"parent_barang_id": parent_barang_id}
    ).to_list(100)
    
    return [sanitize_doc(child) for child in children]


@router.delete("/child-asset/{child_id}")
async def delete_child_asset(
    child_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete a child asset"""
    try:
        oid = ObjectId(child_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid child_id")
    
    result = await db.child_assets.delete_one({"_id": oid})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Child asset not found")
    
    return {"message": "Child asset deleted"}


@router.post("/print-batch")
async def log_print_batch(
    request: PrintBatchRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Log a batch of label prints
    Updates print count and last printed date
    """
    printed_at = datetime.now(timezone.utc).isoformat()
    logs_created = 0
    
    for item in request.items:
        barang_id = item.get("barang_id")
        ukuran = item.get("ukuran", "sedang")
        is_child = item.get("is_child", False)
        child_id = item.get("child_id")
        
        if is_child and child_id:
            # Update child asset print count
            try:
                child_oid = ObjectId(child_id)
                await db.child_assets.update_one(
                    {"_id": child_oid},
                    {
                        "$inc": {"print_count": 1},
                        "$set": {"last_printed": printed_at}
                    }
                )
            except:
                pass
        else:
            # Create print log for main asset
            log = {
                "barang_id": barang_id,
                "ukuran": ukuran,
                "printed_at": printed_at,
                "printed_by": current_user,
                "jumlah_cetak": 1
            }
            await db.label_print_logs.insert_one(log)
            logs_created += 1
    
    return {
        "message": f"Print batch logged: {len(request.items)} items",
        "printed_at": printed_at,
        "logs_created": logs_created
    }


@router.get("/print-stats")
async def get_print_statistics(current_user: str = Depends(get_current_user)):
    """Get overall print statistics"""
    
    # Total assets
    total_assets = await db.barang.count_documents({"status_aset": {"$ne": "Dihapuskan"}})
    
    # Assets with prints
    pipeline = [
        {"$group": {"_id": "$barang_id"}},
        {"$count": "total"}
    ]
    printed_result = await db.label_print_logs.aggregate(pipeline).to_list(1)
    assets_printed = printed_result[0]["total"] if printed_result else 0
    
    # Total prints
    total_prints = await db.label_print_logs.count_documents({})
    
    # Prints by size
    size_pipeline = [
        {"$group": {"_id": "$ukuran", "count": {"$sum": 1}}}
    ]
    size_stats = await db.label_print_logs.aggregate(size_pipeline).to_list(10)
    
    # Child assets count
    total_children = await db.child_assets.count_documents({})
    
    return {
        "total_assets": total_assets,
        "assets_printed": assets_printed,
        "assets_not_printed": total_assets - assets_printed,
        "total_prints": total_prints,
        "total_child_assets": total_children,
        "prints_by_size": {s["_id"]: s["count"] for s in size_stats if s["_id"]}
    }


@router.get("/print-history")
async def get_print_history(
    page: int = 1,
    limit: int = 50,
    current_user: str = Depends(get_current_user)
):
    """Get recent print history with asset details"""
    skip = (page - 1) * limit
    
    pipeline = [
        {"$sort": {"printed_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$addFields": {
            "barang_oid": {"$toObjectId": "$barang_id"}
        }},
        {"$lookup": {
            "from": "barang",
            "localField": "barang_oid",
            "foreignField": "_id",
            "as": "barang"
        }},
        {"$unwind": {"path": "$barang", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "barang_oid": 0
        }}
    ]
    
    logs = await db.label_print_logs.aggregate(pipeline).to_list(limit)
    total = await db.label_print_logs.count_documents({})
    
    result = []
    for log in logs:
        log["id"] = str(log["_id"])
        del log["_id"]
        if log.get("barang"):
            log["barang"]["id"] = str(log["barang"]["_id"])
            del log["barang"]["_id"]
        result.append(log)
    
    return {
        "data": result,
        "total": total,
        "page": page,
        "limit": limit
    }
