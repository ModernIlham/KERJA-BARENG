"""
Label BMN Management API
Manages sticker printing for government assets (BMN)
Features:
- Parent-Child asset relationship for accessories
- Print tracking (count, dates, user)
- Multiple sticker sizes (small, medium, large)
- Background PDF generation
"""

from fastapi import APIRouter, HTTPException, Depends, Body, BackgroundTasks
from fastapi.responses import FileResponse
from typing import List, Optional, Dict, Any
import weasyprint
from weasyprint import HTML, CSS

from pydantic import BaseModel
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone
import math
import uuid
import asyncio
import weasyprint
from weasyprint import HTML, CSS
from reportlab.lib.pagesizes import A4, A3
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.lib.utils import ImageReader
import qrcode
from io import BytesIO

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Store for background job status
pdf_jobs = {}

# PDF output directory
PDF_OUTPUT_DIR = "/app/backend/generated_pdfs"
os.makedirs(PDF_OUTPUT_DIR, exist_ok=True)


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


class StickerDesignConfig(BaseModel):
    """Konfigurasi design stiker custom"""
    id: Optional[str] = None
    name: str  # Nama template (e.g., "Template Default", "Template Kustom 1")
    size_type: str  # kecil, sedang, besar, custom
    
    # Dimensi (dalam mm)
    width: float = 69.8
    height: float = 22.1
    
    # Pengaturan Layout
    layout: str = "landscape"  # landscape, portrait
    
    # Pengaturan QR Code
    qr_position: str = "left"  # left, right, top, bottom
    qr_size: float = 80  # Persentase dari area maksimal
    qr_padding: float = 3  # mm
    
    # Pengaturan Header
    show_header: bool = True
    header_show_logo: bool = True
    header_logo_size: float = 16  # px
    header_font_size: float = 7.5  # pt
    header_sub_font_size: float = 6.5  # pt
    header_text: str = "Otorita Ibu Kota Nusantara"
    header_bg_color: str = "#ffffff"
    header_text_color: str = "#1a1a1a"
    
    # Pengaturan Info Utama (Kode Barang, Nama)
    kode_font_size: float = 7.5  # pt
    kode_font_weight: int = 700
    nama_font_size: float = 6.5  # pt
    nama_font_weight: int = 500
    
    # Pengaturan NUP/Quantity Box
    show_nup: bool = True
    nup_font_size: float = 11  # pt
    nup_min_width: float = 34  # px
    nup_bg_color: str = "#ffffff"
    nup_text_color: str = "#1a1a1a"
    
    # Pengaturan Deskripsi
    show_description: bool = True
    desc_font_size: float = 5.5  # pt
    
    # Pengaturan Warning Text
    show_warning: bool = True
    warning_text: str = "Tidak Untuk Diperjualbelikan"
    warning_font_size: float = 6  # pt
    warning_color: str = "#DC2626"
    
    # Pengaturan Kode Vertikal
    show_vertical_code: bool = True
    vertical_font_size: float = 6  # pt
    vertical_width: float = 13  # px
    vertical_show_border: bool = False
    
    # Pengaturan Gold Stripe (untuk stiker kecil)
    show_gold_stripe: bool = False
    gold_stripe_height: float = 3  # px
    gold_stripe_color: str = "#D4AF37"
    
    # Pengaturan Border
    border_width: float = 1  # px
    border_color: str = "#2c2c2c"
    border_radius: float = 0  # px
    
    # Pengaturan Font
    font_family: str = "Roboto"
    
    # Pengaturan Warna
    background_color: str = "#ffffff"
    text_color: str = "#1a1a1a"
    
    # Metadata
    is_default: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


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
    sort_field: str = "kode_barang",
    sort_order: str = "asc",
    filter_nup: str = "",
    filter_tahun: str = "",
    filter_nilai_min: float = None,
    filter_nilai_max: float = None,
    current_user: str = Depends(get_current_user)
):
    """
    Get assets list with print status for label management
    Supports advanced filtering and sorting
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
    
    # Advanced filters
    if filter_nup:
        query["nup"] = filter_nup
    
    if filter_tahun:
        # Filter by year from tgl_perolehan or tahun_anggaran
        query["$or"] = query.get("$or", [])
        year_filter = [
            {"tgl_perolehan": {"$regex": f"^{filter_tahun}", "$options": "i"}},
            {"tahun_anggaran": filter_tahun}
        ]
        if query.get("$or"):
            # Combine with existing $or
            query["$and"] = [{"$or": query.pop("$or")}, {"$or": year_filter}]
        else:
            query["$or"] = year_filter
    
    if filter_nilai_min is not None:
        query["nilai_perolehan"] = query.get("nilai_perolehan", {})
        query["nilai_perolehan"]["$gte"] = filter_nilai_min
    
    if filter_nilai_max is not None:
        query["nilai_perolehan"] = query.get("nilai_perolehan", {})
        query["nilai_perolehan"]["$lte"] = filter_nilai_max
    
    # Get assets with aggregation to include print info and child count
    pipeline = [
        {"$match": query},
        # Add string version of _id for child assets lookup
        {"$addFields": {
            "_id_str": {"$toString": "$_id"}
        }},
        {"$lookup": {
            "from": "label_print_logs",
            "localField": "_id",
            "foreignField": "barang_id",
            "as": "print_logs"
        }},
        {"$lookup": {
            "from": "child_assets",
            "localField": "_id_str",
            "foreignField": "parent_barang_id",
            "as": "child_assets"
        }},
        {"$addFields": {
            "print_count": {"$size": "$print_logs"},
            "last_printed": {"$max": "$print_logs.printed_at"},
            "child_count": {"$size": "$child_assets"}
        }},
        {"$project": {
            "print_logs": 0,  # Exclude logs array from result
            "child_assets": 0,  # Exclude child assets array from result
            "_id_str": 0  # Exclude temporary field
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
    
    # Sorting
    sort_direction = 1 if sort_order == "asc" else -1
    valid_sort_fields = ["kode_barang", "nama_barang", "nup", "tgl_perolehan", "nilai_perolehan", "nilai_buku", "print_count"]
    if sort_field not in valid_sort_fields:
        sort_field = "kode_barang"
    
    pipeline.extend([
        {"$sort": {sort_field: sort_direction, "nup": 1}},
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


@router.get("/assets/all")
async def get_all_assets_for_selection(
    search: str = "",
    status_cetak: str = "",
    filter_nup: str = "",
    filter_tahun: str = "",
    filter_nilai_min: float = None,
    filter_nilai_max: float = None,
    current_user: str = Depends(get_current_user)
):
    """
    Get all assets (without pagination) for bulk selection.
    Supports all advanced filters to match the main assets endpoint.
    """
    query = {"status_aset": {"$ne": "Dihapuskan"}}
    
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"kode_barang": {"$regex": search, "$options": "i"}},
            {"kode_register": {"$regex": search, "$options": "i"}},
            {"merk": {"$regex": search, "$options": "i"}}
        ]
    
    # Advanced filters
    if filter_nup:
        query["nup"] = filter_nup
    
    if filter_tahun:
        year_filter = [
            {"tgl_perolehan": {"$regex": f"^{filter_tahun}", "$options": "i"}},
            {"tahun_anggaran": filter_tahun}
        ]
        if query.get("$or"):
            query["$and"] = [{"$or": query.pop("$or")}, {"$or": year_filter}]
        else:
            query["$or"] = year_filter
    
    if filter_nilai_min is not None:
        query["nilai_perolehan"] = query.get("nilai_perolehan", {})
        query["nilai_perolehan"]["$gte"] = filter_nilai_min
    
    if filter_nilai_max is not None:
        query["nilai_perolehan"] = query.get("nilai_perolehan", {})
        query["nilai_perolehan"]["$lte"] = filter_nilai_max
    
    pipeline = [
        {"$match": query},
        {"$lookup": {
            "from": "label_print_logs",
            "localField": "_id",
            "foreignField": "barang_id",
            "as": "print_logs"
        }},
        {"$addFields": {
            "print_count": {"$size": "$print_logs"}
        }},
        {"$project": {
            "print_logs": 0
        }}
    ]
    
    # Filter by print status
    if status_cetak == "belum_cetak":
        pipeline.append({"$match": {"print_count": 0}})
    elif status_cetak == "sudah_cetak":
        pipeline.append({"$match": {"print_count": {"$gt": 0}}})
    
    pipeline.append({"$sort": {"kode_barang": 1, "nup": 1}})
    
    # Get all assets (no limit)
    assets = await db.barang.aggregate(pipeline).to_list(None)
    
    # Sanitize and return minimal data
    result = [sanitize_doc(asset) for asset in assets]
    
    return {
        "data": result,
        "total": len(result)
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
    
    # Ensure current_user is a string
    user_str = str(current_user) if current_user else "unknown"
    
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
                "printed_by": user_str,
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
    
    # Simple query without lookup - avoid ObjectId conversion issues
    logs = await db.label_print_logs.find({}).sort("printed_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.label_print_logs.count_documents({})
    
    result = []
    for log in logs:
        log_data = sanitize_doc(log)
        
        # Try to get asset info if barang_id exists
        if log.get("barang_id"):
            try:
                # Try as ObjectId first
                barang_oid = ObjectId(log["barang_id"])
                barang = await db.barang.find_one({"_id": barang_oid}, {"_id": 0, "nama_barang": 1, "kode_barang": 1})
                if barang:
                    log_data["barang"] = barang
            except:
                # If not ObjectId, try direct string match
                barang = await db.barang.find_one({"id": log["barang_id"]}, {"_id": 0, "nama_barang": 1, "kode_barang": 1})
                if barang:
                    log_data["barang"] = barang
        
        result.append(log_data)
    
    return {
        "data": result,
        "total": total,
        "page": page,
        "limit": limit
    }


# ==================== STICKER DESIGN CONFIGURATION ====================

DEFAULT_STICKER_DESIGNS = {
    "kecil": {
        "name": "Stiker Kecil - Default",
        "size_type": "kecil",
        "width": 23.8,
        "height": 39.8,
        "layout": "portrait",
        "qr_position": "top",
        "qr_size": 85,
        "qr_padding": 2,
        "show_header": False,
        "header_show_logo": False,
        "header_font_size": 6.5,
        "header_sub_font_size": 6,
        "header_text": "",
        "kode_font_size": 8,
        "kode_font_weight": 700,
        "nama_font_size": 6.5,
        "nama_font_weight": 600,
        "show_nup": True,
        "nup_font_size": 10,
        "nup_min_width": 28,
        "show_description": True,
        "desc_font_size": 5,
        "show_warning": False,
        "warning_text": "",
        "warning_font_size": 5,
        "show_vertical_code": True,
        "vertical_font_size": 6,
        "vertical_width": 13,
        "vertical_show_border": False,
        "show_gold_stripe": True,
        "gold_stripe_height": 3,
        "gold_stripe_color": "#D4AF37",
        "border_width": 1,
        "border_color": "#2c2c2c",
        "border_radius": 0,
        "font_family": "Roboto",
        "background_color": "#ffffff",
        "text_color": "#1a1a1a",
        "is_default": True
    },
    "sedang": {
        "name": "Stiker Sedang - Default",
        "size_type": "sedang",
        "width": 69.8,
        "height": 22.1,
        "layout": "landscape",
        "qr_position": "left",
        "qr_size": 90,
        "qr_padding": 3,
        "show_header": True,
        "header_show_logo": True,
        "header_logo_size": 16,
        "header_font_size": 7.5,
        "header_sub_font_size": 6.5,
        "header_text": "Otorita Ibu Kota Nusantara",
        "kode_font_size": 7.5,
        "kode_font_weight": 700,
        "nama_font_size": 6.5,
        "nama_font_weight": 500,
        "show_nup": True,
        "nup_font_size": 11,
        "nup_min_width": 34,
        "show_description": True,
        "desc_font_size": 5.5,
        "show_warning": True,
        "warning_text": "Tidak Untuk Diperjualbelikan",
        "warning_font_size": 6,
        "warning_color": "#DC2626",
        "show_vertical_code": True,
        "vertical_font_size": 6,
        "vertical_width": 13,
        "vertical_show_border": False,
        "show_gold_stripe": False,
        "border_width": 1,
        "border_color": "#2c2c2c",
        "border_radius": 0,
        "font_family": "Roboto",
        "background_color": "#ffffff",
        "text_color": "#1a1a1a",
        "is_default": True
    },
    "besar": {
        "name": "Stiker Besar - Default",
        "size_type": "besar",
        "width": 94.9,
        "height": 32.2,
        "layout": "landscape",
        "qr_position": "left",
        "qr_size": 95,
        "qr_padding": 5,
        "show_header": True,
        "header_show_logo": True,
        "header_logo_size": 22,
        "header_font_size": 10,
        "header_sub_font_size": 9,
        "header_text": "Otorita Ibu Kota Nusantara",
        "kode_font_size": 10,
        "kode_font_weight": 700,
        "nama_font_size": 9,
        "nama_font_weight": 500,
        "show_nup": True,
        "nup_font_size": 14,
        "nup_min_width": 45,
        "show_description": True,
        "desc_font_size": 8,
        "show_warning": True,
        "warning_text": "Tidak Untuk Diperjualbelikan",
        "warning_font_size": 9,
        "warning_color": "#DC2626",
        "show_vertical_code": True,
        "vertical_font_size": 9,
        "vertical_width": 21,
        "vertical_show_border": False,
        "show_gold_stripe": False,
        "border_width": 1,
        "border_color": "#2c2c2c",
        "border_radius": 0,
        "font_family": "Roboto",
        "background_color": "#ffffff",
        "text_color": "#1a1a1a",
        "is_default": True
    }
}


@router.get("/sticker-designs")
async def get_sticker_designs(current_user: str = Depends(get_current_user)):
    """Get all sticker design configurations"""
    designs = await db.sticker_designs.find({}).to_list(100)
    
    result = {
        "kecil": [],
        "sedang": [],
        "besar": [],
        "custom": []
    }
    
    # Add saved designs
    for design in designs:
        design_data = sanitize_doc(design)
        size_type = design_data.get("size_type", "custom")
        if size_type in result:
            result[size_type].append(design_data)
        else:
            result["custom"].append(design_data)
    
    # Add defaults if no custom designs exist
    for size_type, default_config in DEFAULT_STICKER_DESIGNS.items():
        has_default = any(d.get("is_default") for d in result[size_type])
        if not has_default:
            result[size_type].insert(0, {**default_config, "id": f"default_{size_type}"})
    
    return result


@router.get("/sticker-design/{design_id}")
async def get_sticker_design(design_id: str, current_user: str = Depends(get_current_user)):
    """Get specific sticker design"""
    # Check if it's a default design
    if design_id.startswith("default_"):
        size_type = design_id.replace("default_", "")
        if size_type in DEFAULT_STICKER_DESIGNS:
            return {**DEFAULT_STICKER_DESIGNS[size_type], "id": design_id}
        raise HTTPException(status_code=404, detail="Design not found")
    
    try:
        design = await db.sticker_designs.find_one({"_id": ObjectId(design_id)})
        if not design:
            raise HTTPException(status_code=404, detail="Design not found")
        return sanitize_doc(design)
    except:
        raise HTTPException(status_code=404, detail="Design not found")


@router.post("/sticker-design")
async def create_sticker_design(design: Dict[str, Any] = Body(...), current_user = Depends(get_current_user)):
    """Create a new sticker design configuration"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Convert user to string ID
    user_id = str(current_user.id) if hasattr(current_user, 'id') else str(current_user)
    
    design_doc = {
        **design,
        "is_default": False,
        "created_at": now,
        "updated_at": now,
        "created_by": user_id
    }
    
    result = await db.sticker_designs.insert_one(design_doc)
    design_doc["id"] = str(result.inserted_id)
    if "_id" in design_doc:
        del design_doc["_id"]
    
    return {"success": True, "design": sanitize_doc(design_doc)}


@router.put("/sticker-design/{design_id}")
async def update_sticker_design(design_id: str, design: Dict[str, Any] = Body(...), current_user = Depends(get_current_user)):
    """Update an existing sticker design"""
    if design_id.startswith("default_"):
        raise HTTPException(status_code=400, detail="Cannot edit default designs. Create a copy instead.")
    
    try:
        # Convert user to string ID
        user_id = str(current_user.id) if hasattr(current_user, 'id') else str(current_user)
        
        design["updated_at"] = datetime.now(timezone.utc).isoformat()
        design["updated_by"] = user_id
        
        # Remove id from update data
        update_data = {k: v for k, v in design.items() if k not in ["id", "_id"]}
        
        result = await db.sticker_designs.update_one(
            {"_id": ObjectId(design_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Design not found")
        
        updated = await db.sticker_designs.find_one({"_id": ObjectId(design_id)})
        return {"success": True, "design": sanitize_doc(updated)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/sticker-design/{design_id}")
async def delete_sticker_design(design_id: str, current_user: str = Depends(get_current_user)):
    """Delete a sticker design"""
    if design_id.startswith("default_"):
        raise HTTPException(status_code=400, detail="Cannot delete default designs")
    
    try:
        result = await db.sticker_designs.delete_one({"_id": ObjectId(design_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Design not found")
        return {"success": True}
    except:
        raise HTTPException(status_code=400, detail="Invalid design ID")


@router.delete("/sticker-designs/reset-all")
async def reset_all_sticker_designs(current_user: str = Depends(get_current_user)):
    """Delete all custom sticker designs and reset to defaults only"""
    try:
        # Delete all custom sticker designs (not defaults)
        result = await db.sticker_designs.delete_many({})
        deleted_count = result.deleted_count
        
        return {
            "success": True,
            "message": f"Berhasil menghapus {deleted_count} design kustom",
            "deleted_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal reset designs: {str(e)}")


@router.post("/sticker-design/{design_id}/duplicate")
async def duplicate_sticker_design(design_id: str, current_user: str = Depends(get_current_user)):
    """Duplicate an existing sticker design"""
    # Get source design
    if design_id.startswith("default_"):
        size_type = design_id.replace("default_", "")
        if size_type not in DEFAULT_STICKER_DESIGNS:
            raise HTTPException(status_code=404, detail="Design not found")
        source = DEFAULT_STICKER_DESIGNS[size_type].copy()
    else:
        try:
            source_doc = await db.sticker_designs.find_one({"_id": ObjectId(design_id)})
            if not source_doc:
                raise HTTPException(status_code=404, detail="Design not found")
            source = sanitize_doc(source_doc)
        except:
            raise HTTPException(status_code=404, detail="Design not found")
    
    # Create duplicate
    now = datetime.now(timezone.utc).isoformat()
    
    # Convert user to string ID
    user_id = str(current_user.id) if hasattr(current_user, 'id') else str(current_user)
    
    new_design = {
        **source,
        "name": f"{source.get('name', 'Design')} (Salinan)",
        "is_default": False,
        "created_at": now,
        "updated_at": now,
        "created_by": user_id
    }
    
    # Remove old id
    new_design.pop("id", None)
    new_design.pop("_id", None)
    
    result = await db.sticker_designs.insert_one(new_design)
    new_design["id"] = str(result.inserted_id)
    
    return {"success": True, "design": sanitize_doc(new_design)}


@router.post("/sticker-design/set-active")
async def set_active_design(data: Dict[str, str] = Body(...), current_user = Depends(get_current_user)):
    """Set the active design for a size type"""
    size_type = data.get("size_type")
    design_id = data.get("design_id")
    
    if not size_type or not design_id:
        raise HTTPException(status_code=400, detail="size_type and design_id required")
    
    # Convert user to string ID
    user_id = str(current_user.id) if hasattr(current_user, 'id') else str(current_user)
    
    # Save to user preferences or system settings
    await db.sticker_active_designs.update_one(
        {"size_type": size_type},
        {"$set": {
            "size_type": size_type,
            "design_id": design_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user_id
        }},
        upsert=True
    )
    
    return {"success": True}


@router.get("/sticker-design/active/{size_type}")
async def get_active_design(size_type: str, current_user: str = Depends(get_current_user)):
    """Get the active design for a size type"""
    active = await db.sticker_active_designs.find_one({"size_type": size_type})
    
    if active and active.get("design_id"):
        design_id = active["design_id"]
        
        if design_id.startswith("default_"):
            st = design_id.replace("default_", "")
            if st in DEFAULT_STICKER_DESIGNS:
                return {**DEFAULT_STICKER_DESIGNS[st], "id": design_id}
        else:
            try:
                design = await db.sticker_designs.find_one({"_id": ObjectId(design_id)})
                if design:
                    return sanitize_doc(design)
            except:
                pass
    
    # Return default
    if size_type in DEFAULT_STICKER_DESIGNS:
        return {**DEFAULT_STICKER_DESIGNS[size_type], "id": f"default_{size_type}"}
    
    raise HTTPException(status_code=404, detail="No design found")


# ==================== QR CODE TEMPLATE MANAGEMENT ====================

@router.get("/qr-templates")
async def get_qr_templates(current_user = Depends(get_current_user)):
    """Get all saved QR code templates"""
    templates = await db.qr_templates.find({}).to_list(50)
    return [sanitize_doc(t) for t in templates]


@router.post("/qr-template")
async def save_qr_template(template: Dict[str, Any] = Body(...), current_user = Depends(get_current_user)):
    """Save a new QR code template"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Convert user to string ID
    user_id = str(current_user.id) if hasattr(current_user, 'id') else str(current_user)
    
    template_doc = {
        **template,
        "created_at": now,
        "updated_at": now,
        "created_by": user_id
    }
    
    result = await db.qr_templates.insert_one(template_doc)
    template_doc["id"] = str(result.inserted_id)
    
    return {"success": True, "template": sanitize_doc(template_doc)}


@router.put("/qr-template/{template_id}")
async def update_qr_template(template_id: str, template: Dict[str, Any] = Body(...), current_user = Depends(get_current_user)):
    """Update an existing QR template"""
    try:
        # Convert user to string ID
        user_id = str(current_user.id) if hasattr(current_user, 'id') else str(current_user)
        
        template["updated_at"] = datetime.now(timezone.utc).isoformat()
        template["updated_by"] = user_id
        
        update_data = {k: v for k, v in template.items() if k not in ["id", "_id"]}
        
        result = await db.qr_templates.update_one(
            {"_id": ObjectId(template_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Template not found")
        
        updated = await db.qr_templates.find_one({"_id": ObjectId(template_id)})
        return {"success": True, "template": sanitize_doc(updated)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/qr-template/{template_id}")
async def delete_qr_template(template_id: str, current_user = Depends(get_current_user)):
    """Delete a QR template"""
    try:
        result = await db.qr_templates.delete_one({"_id": ObjectId(template_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Template not found")
        return {"success": True}
    except:
        raise HTTPException(status_code=400, detail="Invalid template ID")


@router.delete("/qr-templates/reset-all")
async def reset_all_qr_templates(current_user = Depends(get_current_user)):
    """Delete all QR templates"""
    try:
        result = await db.qr_templates.delete_many({})
        deleted_count = result.deleted_count
        
        return {
            "success": True,
            "message": f"Berhasil menghapus {deleted_count} template QR",
            "deleted_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal reset templates: {str(e)}")


@router.post("/qr-template/set-active")
async def set_active_qr_template(data: Dict[str, str] = Body(...), current_user = Depends(get_current_user)):
    """Set the active QR template"""
    template_id = data.get("template_id")
    
    if not template_id:
        raise HTTPException(status_code=400, detail="template_id required")
    
    # Convert user to string ID
    user_id = str(current_user.id) if hasattr(current_user, 'id') else str(current_user)
    
    await db.system_settings.update_one(
        {"key": "active_qr_template"},
        {"$set": {
            "key": "active_qr_template",
            "value": template_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user_id
        }},
        upsert=True
    )
    
    return {"success": True}


@router.get("/qr-template/active")
async def get_active_qr_template(current_user: str = Depends(get_current_user)):
    """Get the active QR template"""
    setting = await db.system_settings.find_one({"key": "active_qr_template"})
    
    if setting and setting.get("value"):
        template_id = setting["value"]
        try:
            template = await db.qr_templates.find_one({"_id": ObjectId(template_id)})
            if template:
                return sanitize_doc(template)
        except:
            pass
    
    # Return default QR settings
    return {
        "id": "default",
        "name": "Default",
        "bodyColor": "#000000",
        "bodyStyle": "square",
        "eyeColor": "#000000",
        "eyeStyle": "square",
        "cornerDotColor": "#000000",
        "cornerDotStyle": "square",
        "backgroundColor": "#ffffff",
        "logoSize": 0.3,
        "logoBgEnabled": True
    }



# ==================== PDF BACKGROUND GENERATION ====================

class PDFGenerationRequest(BaseModel):
    """Request model for PDF generation"""
    items: List[Dict[str, Any]]
    canvas_size: str = "A4"
    qr_settings: Optional[Dict[str, Any]] = None
    html_content: Optional[str] = None  # New field for direct HTML-to-PDF

class PDFJobStatus(BaseModel):
    """Status model for PDF job"""
    job_id: str
    status: str  # pending, processing, completed, failed
    progress: int = 0
    total: int = 0
    pdf_url: Optional[str] = None
    error: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None


def generate_qr_code(data: str, size: int = 100) -> BytesIO:
    """Generate QR code as image"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=0,
    )
    qr.add_data(f"#{data}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Resize to target size
    img = img.resize((size, size))
    
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


async def generate_pdf_task(job_id: str, items: List[Dict], canvas_size: str, instansi: Dict, user_id: str, html_content: Optional[str] = None):
    """Background task to generate PDF using WeasyPrint (HTML to PDF)"""
    try:
        pdf_jobs[job_id]["status"] = "processing"
        pdf_jobs[job_id]["total"] = len(items)
        
        pdf_path = os.path.join(PDF_OUTPUT_DIR, f"{job_id}.pdf")
        
        if html_content:
            # === NEW METHOD: Use HTML from Frontend ===
            # Use WeasyPrint to convert HTML to PDF
            await asyncio.to_thread(
                HTML(string=html_content).write_pdf, 
                target=pdf_path
            )
        else:
            # Fallback or Error
            raise Exception("Backend requires 'html_content' for high-quality PDF generation.")

        # Update job status
        pdf_jobs[job_id]["status"] = "completed"
        pdf_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
        pdf_jobs[job_id]["pdf_url"] = f"/api/label-bmn/pdf/{job_id}"
        
        # Record print logs
        db_client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
        db_async = db_client[os.environ.get("DB_NAME")]
        
        log_entries = []
        now = datetime.now(timezone.utc).isoformat()
        
        for item in items:
            # Handle both id and barang_id formats
            barang_id = item.get("id") or item.get("barang_id")
            
            log = {
                "barang_id": barang_id,
                "ukuran": item.get("ukuran", "sedang"),
                "printed_at": now,
                "printed_by": user_id,
                "print_type": "pdf_batch",
                "job_id": job_id
            }
            log_entries.append(log)
            
        if log_entries:
            await db_async.label_print_logs.insert_many(log_entries)
        
        db_client.close()

    except Exception as e:
        pdf_jobs[job_id]["status"] = "failed"
        pdf_jobs[job_id]["error"] = str(e)
        pdf_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()


@router.post("/generate-pdf")
async def start_pdf_generation(
    request: PDFGenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user)
):
    """Start PDF generation in background"""
    job_id = str(uuid.uuid4())
    
    # Get instansi info
    instansi = await db.instansi.find_one({})
    instansi_data = sanitize_doc(instansi) if instansi else {}
    
    # Get user ID
    user_id = str(current_user.id) if hasattr(current_user, "id") else str(current_user)
    
    # Create job record
    pdf_jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "progress": 0,
        "total": len(request.items),
        "pdf_url": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    # Start background task
    background_tasks.add_task(
        generate_pdf_task,
        job_id,
        request.items,
        request.canvas_size,
        instansi_data,
        user_id,
        request.html_content
    )
    
    return {"job_id": job_id, "message": "PDF generation started"}


@router.get("/pdf-status/{job_id}")
async def get_pdf_status(job_id: str, current_user: str = Depends(get_current_user)):
    """Get PDF generation job status"""
    if job_id not in pdf_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return pdf_jobs[job_id]


@router.get("/pdf/{job_id}")
async def download_pdf(job_id: str, current_user: str = Depends(get_current_user)):
    """Download generated PDF"""
    if job_id not in pdf_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = pdf_jobs[job_id]
    if job["status"] != "completed":
        job_status = job["status"]
        raise HTTPException(status_code=400, detail=f"PDF not ready. Status: {job_status}")
    
    pdf_path = os.path.join(PDF_OUTPUT_DIR, f"{job_id}.pdf")
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"label_bmn_{job_id[:8]}.pdf"
    )

