"""Routes for transaction approval system"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional
from auth import get_current_user
from models import User
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone
import math

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Transaction types that require approval
APPROVAL_REQUIRED_TYPES = [
    'PERUBAHAN_KUANTITAS',
    'PERUBAHAN_KONDISI', 
    'KOREKSI_NILAI_BMN',
    'KOREKSI_NILAI_KDP',
    'REKLASIFIKASI_MASUK',
    'REKLASIFIKASI_KELUAR',
    'REKLASIFIKASI_KDP',
    'PERSEDIAAN_TO_ASET',
    'ASET_TO_PERSEDIAAN'
]


def sanitize_for_json(obj):
    """Sanitize MongoDB document for JSON serialization."""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    return obj


@router.get("/pending")
async def get_pending_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    jenis: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get list of transactions pending approval.
    """
    query = {"approval_status": "PENDING"}
    
    if jenis:
        query["jenis"] = jenis
    
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"kode_barang": {"$regex": search, "$options": "i"}},
            {"no_sppa": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    total = await db.transaksi.count_documents(query)
    
    cursor = db.transaksi.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    
    # Convert ObjectIds
    result = []
    for item in items:
        if "_id" in item:
            item["id"] = str(item["_id"])
            del item["_id"]
        result.append(item)
    
    # Get summary by type
    pipeline = [
        {"$match": {"approval_status": "PENDING"}},
        {"$group": {"_id": "$jenis", "count": {"$sum": 1}}}
    ]
    type_summary = {}
    async for doc in db.transaksi.aggregate(pipeline):
        type_summary[doc["_id"]] = doc["count"]
    
    return {
        "data": sanitize_for_json(result),
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0,
        "type_summary": type_summary
    }


@router.get("/stats")
async def get_approval_stats(
    current_user: User = Depends(get_current_user)
):
    """
    Get approval statistics.
    """
    # Count by status
    pending_count = await db.transaksi.count_documents({"approval_status": "PENDING"})
    approved_today = await db.transaksi.count_documents({
        "approval_status": "APPROVED",
        "approved_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)}
    })
    rejected_today = await db.transaksi.count_documents({
        "approval_status": "REJECTED",
        "rejected_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)}
    })
    
    # Pending by type
    pipeline = [
        {"$match": {"approval_status": "PENDING"}},
        {"$group": {"_id": "$jenis", "count": {"$sum": 1}}}
    ]
    pending_by_type = {}
    async for doc in db.transaksi.aggregate(pipeline):
        pending_by_type[doc["_id"]] = doc["count"]
    
    return {
        "pending": pending_count,
        "approved_today": approved_today,
        "rejected_today": rejected_today,
        "pending_by_type": pending_by_type
    }


@router.post("/{transaction_id}/approve")
async def approve_transaction(
    transaction_id: str,
    payload: Dict[str, Any] = {},
    current_user: User = Depends(get_current_user)
):
    """
    Approve a pending transaction and apply changes to master data.
    """
    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(status_code=400, detail="Invalid transaction ID")
    
    # Get transaction
    transaksi = await db.transaksi.find_one({"_id": ObjectId(transaction_id)})
    if not transaksi:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    
    if transaksi.get("approval_status") != "PENDING":
        raise HTTPException(status_code=400, detail="Transaksi ini sudah diproses")
    
    # Get pending changes
    pending_changes = transaksi.get("pending_changes", {})
    barang_id = transaksi.get("barang_id")
    jenis = transaksi.get("jenis")
    
    # Apply changes based on transaction type
    if barang_id and ObjectId.is_valid(barang_id) and pending_changes:
        # Determine target collection
        target_collection = "barang"  # Default
        if jenis in ["PERSEDIAAN_TO_ASET", "ASET_TO_PERSEDIAAN"]:
            # For cross-module, changes might need to go to different collections
            target_collection = pending_changes.get("target_collection", "barang")
        
        # Apply the pending changes to master data
        update_result = await db[target_collection].update_one(
            {"_id": ObjectId(barang_id)},
            {"$set": {**pending_changes, "updated_at": datetime.now(timezone.utc)}}
        )
        
        if update_result.modified_count == 0:
            # Try with string ID
            update_result = await db[target_collection].update_one(
                {"id": barang_id},
                {"$set": {**pending_changes, "updated_at": datetime.now(timezone.utc)}}
            )
    
    # Update transaction status
    await db.transaksi.update_one(
        {"_id": ObjectId(transaction_id)},
        {"$set": {
            "approval_status": "APPROVED",
            "status": "COMPLETED",
            "approved_by": current_user.full_name,
            "approved_by_id": str(current_user.id) if hasattr(current_user, 'id') else None,
            "approved_at": datetime.now(timezone.utc),
            "approval_note": payload.get("catatan", "")
        }}
    )
    
    return {
        "message": "Transaksi berhasil disetujui",
        "transaction_id": transaction_id,
        "approved_by": current_user.full_name
    }


@router.post("/{transaction_id}/reject")
async def reject_transaction(
    transaction_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Reject a pending transaction.
    """
    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(status_code=400, detail="Invalid transaction ID")
    
    alasan = payload.get("alasan", "")
    if not alasan:
        raise HTTPException(status_code=400, detail="Alasan penolakan wajib diisi")
    
    # Get transaction
    transaksi = await db.transaksi.find_one({"_id": ObjectId(transaction_id)})
    if not transaksi:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    
    if transaksi.get("approval_status") != "PENDING":
        raise HTTPException(status_code=400, detail="Transaksi ini sudah diproses")
    
    # Update transaction status
    await db.transaksi.update_one(
        {"_id": ObjectId(transaction_id)},
        {"$set": {
            "approval_status": "REJECTED",
            "status": "REJECTED",
            "rejected_by": current_user.full_name,
            "rejected_by_id": str(current_user.id) if hasattr(current_user, 'id') else None,
            "rejected_at": datetime.now(timezone.utc),
            "rejection_reason": alasan
        }}
    )
    
    return {
        "message": "Transaksi berhasil ditolak",
        "transaction_id": transaction_id,
        "rejected_by": current_user.full_name
    }


@router.post("/bulk-approve")
async def bulk_approve_transactions(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Approve multiple transactions at once.
    """
    transaction_ids = payload.get("transaction_ids", [])
    if not transaction_ids:
        raise HTTPException(status_code=400, detail="Tidak ada transaksi yang dipilih")
    
    success_count = 0
    error_count = 0
    
    for tx_id in transaction_ids:
        try:
            if not ObjectId.is_valid(tx_id):
                error_count += 1
                continue
            
            transaksi = await db.transaksi.find_one({"_id": ObjectId(tx_id)})
            if not transaksi or transaksi.get("approval_status") != "PENDING":
                error_count += 1
                continue
            
            # Apply pending changes
            pending_changes = transaksi.get("pending_changes", {})
            barang_id = transaksi.get("barang_id")
            
            if barang_id and ObjectId.is_valid(barang_id) and pending_changes:
                await db.barang.update_one(
                    {"_id": ObjectId(barang_id)},
                    {"$set": {**pending_changes, "updated_at": datetime.now(timezone.utc)}}
                )
            
            # Update transaction
            await db.transaksi.update_one(
                {"_id": ObjectId(tx_id)},
                {"$set": {
                    "approval_status": "APPROVED",
                    "status": "COMPLETED",
                    "approved_by": current_user.full_name,
                    "approved_at": datetime.now(timezone.utc)
                }}
            )
            success_count += 1
            
        except Exception as e:
            print(f"Error approving {tx_id}: {e}")
            error_count += 1
    
    return {
        "message": f"Berhasil menyetujui {success_count} transaksi",
        "success": success_count,
        "errors": error_count
    }


@router.get("/history")
async def get_approval_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get history of approved/rejected transactions.
    """
    query = {"approval_status": {"$in": ["APPROVED", "REJECTED"]}}
    
    if status:
        query["approval_status"] = status
    
    skip = (page - 1) * limit
    total = await db.transaksi.count_documents(query)
    
    cursor = db.transaksi.find(query).sort("approved_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    
    result = []
    for item in items:
        if "_id" in item:
            item["id"] = str(item["_id"])
            del item["_id"]
        result.append(item)
    
    return {
        "data": sanitize_for_json(result),
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0
    }


@router.get("/config")
async def get_approval_config(
    current_user: User = Depends(get_current_user)
):
    """
    Get approval configuration.
    """
    config = await db.system_settings.find_one({"key": "approval_config"})
    
    if not config:
        # Default config
        config = {
            "key": "approval_config",
            "enabled": True,
            "require_approval_for": APPROVAL_REQUIRED_TYPES,
            "approvers": ["admin", "pimpinan"],
            "auto_approve_threshold": 0,  # 0 means all need approval
            "created_at": datetime.now(timezone.utc)
        }
        await db.system_settings.insert_one(config)
    
    if "_id" in config:
        del config["_id"]
    
    return config


@router.put("/config")
async def update_approval_config(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Update approval configuration.
    """
    # Only admin can update config
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengubah konfigurasi")
    
    update_data = {
        "enabled": payload.get("enabled", True),
        "require_approval_for": payload.get("require_approval_for", APPROVAL_REQUIRED_TYPES),
        "approvers": payload.get("approvers", ["admin", "pimpinan"]),
        "auto_approve_threshold": payload.get("auto_approve_threshold", 0),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.system_settings.update_one(
        {"key": "approval_config"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Konfigurasi approval berhasil diupdate"}
