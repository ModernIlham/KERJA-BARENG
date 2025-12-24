from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user
from models import User
from pydantic import BaseModel, Field
import os
import math

router = APIRouter()

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- Priority Configuration ---
PRIORITY_CONFIG = {
    "KRITIS": {"days_max": 7, "color": "#DC2626", "label": "Kritis", "weight": 100},
    "TINGGI": {"days_max": 14, "color": "#EA580C", "label": "Tinggi", "weight": 75},
    "SEDANG": {"days_max": 21, "color": "#D97706", "label": "Sedang", "weight": 50},
    "RENDAH": {"days_max": 30, "color": "#2563EB", "label": "Rendah", "weight": 25},
    "PERSIAPAN": {"days_max": 60, "color": "#6B7280", "label": "Persiapan", "weight": 10}
}

# --- Alert Types ---
ALERT_TYPES = {
    "PENSIUN": {
        "label": "Pensiun",
        "description": "Pegawai akan memasuki masa pensiun",
        "date_field": "tgl_pensiun",
        "status_field": "status",
        "status_value": "PENSIUN",
        "dokumen_required": ["BAST", "BASTO"],
        "icon": "🎖️"
    },
    "HABIS_KONTRAK": {
        "label": "Habis Kontrak",
        "description": "Kontrak kerja pegawai akan berakhir",
        "date_field": "tgl_selesai_kontrak",
        "status_field": "status_kepegawaian",
        "status_value": "Non-ASN",
        "dokumen_required": ["BAST"],
        "icon": "📄"
    },
    "HABIS_PENUGASAN": {
        "label": "Habis Masa Penugasan",
        "description": "Masa penugasan pegawai akan berakhir",
        "date_field": "masa_penugasan_end",
        "status_field": "status_penempatan",
        "status_value": "Penugasan",
        "dokumen_required": ["BAST", "SIP"],
        "icon": "🔄"
    },
    "MUTASI": {
        "label": "Mutasi",
        "description": "Pegawai akan dimutasi ke unit lain",
        "date_field": "tgl_mutasi",
        "status_field": None,
        "status_value": None,
        "dokumen_required": ["BAST", "BASTO"],
        "icon": "🚀"
    },
    "MENINGGAL": {
        "label": "Meninggal Dunia",
        "description": "Pegawai telah meninggal dunia (insidentil)",
        "date_field": "tgl_meninggal",
        "status_field": "status",
        "status_value": "MENINGGAL",
        "dokumen_required": ["BAST"],
        "icon": "🕊️",
        "is_incident": True
    },
    "KELUAR": {
        "label": "Keluar/Resign",
        "description": "Pegawai mengundurkan diri",
        "date_field": "tgl_keluar",
        "status_field": "status",
        "status_value": "KELUAR",
        "dokumen_required": ["BAST"],
        "icon": "🚪"
    },
    "PERUBAHAN_JABATAN": {
        "label": "Perubahan Jabatan",
        "description": "Jabatan pegawai berubah, perlu penyesuaian dokumen",
        "date_field": "tgl_perubahan_jabatan",
        "status_field": None,
        "status_value": None,
        "dokumen_required": ["SIP", "BASTO"],
        "icon": "📊"
    }
}

# --- Pydantic Models ---
class NotificationAlert(BaseModel):
    id: Optional[str] = None
    pegawai_id: str
    pegawai_nama: str
    pegawai_nip: Optional[str] = None
    pegawai_unit: Optional[str] = None
    pegawai_jabatan: Optional[str] = None
    
    alert_type: str  # PENSIUN, HABIS_KONTRAK, etc.
    alert_label: str
    alert_description: str
    alert_icon: str
    
    target_date: str  # ISO date string
    days_remaining: int
    is_overdue: bool = False
    is_incident: bool = False  # For sudden events like death
    
    priority: str  # KRITIS, TINGGI, SEDANG, RENDAH
    priority_label: str
    priority_color: str
    priority_weight: int
    
    asset_count: int
    total_asset_value: float
    assets: List[Dict[str, Any]] = []
    
    dokumen_required: List[str] = []
    dokumen_generated: List[str] = []
    
    status: str = "PENDING"  # PENDING, IN_PROGRESS, COMPLETED, DISMISSED
    notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def calculate_priority(days_remaining: int, is_incident: bool = False) -> Dict[str, Any]:
    """Calculate priority based on days remaining"""
    if is_incident:
        return {
            "priority": "KRITIS",
            "priority_label": "Kritis (Insidentil)",
            "priority_color": "#DC2626",
            "priority_weight": 150  # Higher than normal critical
        }
    
    if days_remaining < 0:  # Overdue
        return {
            "priority": "KRITIS",
            "priority_label": "Kritis (Terlambat)",
            "priority_color": "#991B1B",
            "priority_weight": 200
        }
    
    for priority_key, config in PRIORITY_CONFIG.items():
        if days_remaining <= config["days_max"]:
            return {
                "priority": priority_key,
                "priority_label": config["label"],
                "priority_color": config["color"],
                "priority_weight": config["weight"]
            }
    
    # Beyond 60 days
    return {
        "priority": "INFO",
        "priority_label": "Informasi",
        "priority_color": "#9CA3AF",
        "priority_weight": 5
    }


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    """Parse date string to datetime"""
    if not date_str:
        return None
    try:
        # Try different formats
        for fmt in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%d/%m/%Y", "%d-%m-%Y"]:
            try:
                return datetime.strptime(date_str.split("T")[0] if "T" in date_str else date_str, fmt.split("T")[0])
            except:
                continue
        return None
    except:
        return None


def calculate_retirement_date(tanggal_lahir: Optional[str], status_kepegawaian: Optional[str] = None) -> Optional[str]:
    """Calculate retirement date based on birth date (BUP = Batas Usia Pensiun)"""
    if not tanggal_lahir:
        return None
    
    birth_date = parse_date(tanggal_lahir)
    if not birth_date:
        return None
    
    # Default retirement age 58 for most civil servants
    # 60 for structural officials (Eselon I-II)
    # 65 for certain positions
    retirement_age = 58
    if status_kepegawaian in ["Eselon I", "Eselon II", "Jabatan Fungsional Ahli Utama"]:
        retirement_age = 60
    
    retirement_date = birth_date.replace(year=birth_date.year + retirement_age)
    return retirement_date.strftime("%Y-%m-%d")


async def get_employee_assets(pegawai_id: str) -> List[Dict[str, Any]]:
    """Get all assets held by an employee"""
    assets = []
    
    # From aset_pegawai collection
    cursor = db.aset_pegawai.find({
        "pemegang_id": pegawai_id,
        "status": "Dipinjam"
    })
    async for asset in cursor:
        assets.append({
            "id": str(asset.get("_id", "")),
            "barang_id": asset.get("barang_id"),
            "nama_aset": asset.get("nama_aset"),
            "kode_aset": asset.get("kode_aset"),
            "kategori": asset.get("kategori"),
            "kondisi": asset.get("kondisi"),
            "nilai_perolehan": asset.get("nilai_perolehan", 0),
            "tgl_penyerahan": asset.get("tgl_penyerahan"),
            "source": "aset_pegawai"
        })
    
    # Also check barang collection for assets with pemegang_id in detail_lainnya
    cursor = db.barang.find({
        "detail_lainnya.pemegang_id": pegawai_id,
        "status_aset": "Dipinjamkan"
    })
    async for barang in cursor:
        # Check if not already in assets list
        existing_ids = [a.get("barang_id") for a in assets]
        barang_id = str(barang.get("_id", ""))
        if barang_id not in existing_ids:
            assets.append({
                "id": barang_id,
                "barang_id": barang_id,
                "nama_aset": barang.get("nama_barang"),
                "kode_aset": f"{barang.get('kode_barang', '')}/{barang.get('nup', '')}",
                "kategori": barang.get("golongan_barang"),
                "kondisi": barang.get("kondisi"),
                "nilai_perolehan": barang.get("nilai_perolehan", 0),
                "tgl_penyerahan": barang.get("detail_lainnya", {}).get("tgl_pinjam"),
                "source": "barang"
            })
    
    return assets


@router.get("/alerts")
async def get_notification_alerts(
    priority: Optional[str] = None,
    alert_type: Optional[str] = None,
    status: Optional[str] = None,
    days_ahead: int = 60,
    include_overdue: bool = True,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """
    Get all notification alerts for employees with assets who have upcoming status changes.
    Scans employees for:
    - Approaching retirement (based on birth date)
    - Contract ending
    - Assignment ending
    - Status changes (deceased, resigned, etc.)
    """
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    future_date = today + timedelta(days=days_ahead)
    
    alerts = []
    
    # Get all active employees
    query = {"status": {"$in": ["AKTIF", "CUTI", "TUGAS_BELAJAR"]}}
    cursor = db.pegawai.find(query)
    
    async for pegawai in cursor:
        pegawai_id = str(pegawai.get("_id", ""))
        
        # Get employee's assets
        assets = await get_employee_assets(pegawai_id)
        if not assets:
            continue  # Skip employees without assets
        
        asset_count = len(assets)
        total_value = sum(a.get("nilai_perolehan", 0) for a in assets)
        
        # Get unit kerja
        unit_kerja = pegawai.get("eselon4") or pegawai.get("eselon3") or pegawai.get("eselon2") or pegawai.get("eselon1") or ""
        
        # Check each alert type
        alert_checks = []
        
        # 1. Check Retirement (Pensiun)
        tgl_pensiun = pegawai.get("tgl_pensiun")
        if not tgl_pensiun:
            # Calculate from birth date
            tgl_pensiun = calculate_retirement_date(
                pegawai.get("tanggal_lahir"),
                pegawai.get("pangkat_golongan")
            )
        
        if tgl_pensiun:
            alert_checks.append(("PENSIUN", tgl_pensiun))
        
        # 2. Check Contract End (Habis Kontrak)
        if pegawai.get("status_kepegawaian") in ["Non-ASN", "PPPK", "Kontrak", "Honorer"]:
            tgl_selesai_kontrak = pegawai.get("tgl_selesai_kontrak")
            if tgl_selesai_kontrak:
                alert_checks.append(("HABIS_KONTRAK", tgl_selesai_kontrak))
        
        # 3. Check Assignment End (Habis Penugasan)
        if pegawai.get("status_penempatan") == "Penugasan":
            masa_penugasan_end = pegawai.get("masa_penugasan_end")
            if masa_penugasan_end:
                alert_checks.append(("HABIS_PENUGASAN", masa_penugasan_end))
        
        # 4. Check for upcoming mutation date
        tgl_mutasi = pegawai.get("tgl_mutasi")
        if tgl_mutasi:
            alert_checks.append(("MUTASI", tgl_mutasi))
        
        # 5. Check for position change date
        tgl_perubahan_jabatan = pegawai.get("tgl_perubahan_jabatan")
        if tgl_perubahan_jabatan:
            alert_checks.append(("PERUBAHAN_JABATAN", tgl_perubahan_jabatan))
        
        # Process each alert check
        for alert_type_key, target_date_str in alert_checks:
            target_date = parse_date(target_date_str)
            if not target_date:
                continue
            
            # Make target_date timezone aware for comparison
            target_date = target_date.replace(tzinfo=timezone.utc)
            
            days_remaining = (target_date - today).days
            
            # Skip if beyond the threshold (unless overdue)
            if days_remaining > days_ahead:
                continue
            
            # Skip overdue if not requested
            if days_remaining < 0 and not include_overdue:
                continue
            
            alert_config = ALERT_TYPES.get(alert_type_key, {})
            priority_info = calculate_priority(days_remaining, alert_config.get("is_incident", False))
            
            # Apply filters
            if priority and priority_info["priority"] != priority:
                continue
            if alert_type and alert_type_key != alert_type:
                continue
            
            alert = {
                "id": f"{pegawai_id}_{alert_type_key}",
                "pegawai_id": pegawai_id,
                "pegawai_nama": pegawai.get("nama_lengkap", ""),
                "pegawai_nip": pegawai.get("nip") or pegawai.get("nik") or pegawai.get("nrp"),
                "pegawai_unit": unit_kerja,
                "pegawai_jabatan": pegawai.get("jabatan"),
                
                "alert_type": alert_type_key,
                "alert_label": alert_config.get("label", alert_type_key),
                "alert_description": alert_config.get("description", ""),
                "alert_icon": alert_config.get("icon", "⚠️"),
                
                "target_date": target_date_str,
                "days_remaining": days_remaining,
                "is_overdue": days_remaining < 0,
                "is_incident": alert_config.get("is_incident", False),
                
                **priority_info,
                
                "asset_count": asset_count,
                "total_asset_value": total_value,
                "assets": assets[:5],  # Limit to first 5 for summary
                
                "dokumen_required": alert_config.get("dokumen_required", []),
                "dokumen_generated": [],
                
                "status": "PENDING"
            }
            
            alerts.append(alert)
    
    # Also check for incident alerts (deceased, resigned)
    incident_query = {"status": {"$in": ["MENINGGAL", "KELUAR", "PENSIUN"]}}
    cursor = db.pegawai.find(incident_query)
    
    async for pegawai in cursor:
        pegawai_id = str(pegawai.get("_id", ""))
        
        # Get employee's assets - these should have been returned but check anyway
        assets = await get_employee_assets(pegawai_id)
        if not assets:
            continue
        
        # This employee has left but still has assets - critical!
        status = pegawai.get("status", "")
        if status == "MENINGGAL":
            alert_type_key = "MENINGGAL"
        elif status == "KELUAR":
            alert_type_key = "KELUAR"
        elif status == "PENSIUN":
            alert_type_key = "PENSIUN"
        else:
            continue
        
        unit_kerja = pegawai.get("eselon4") or pegawai.get("eselon3") or pegawai.get("eselon2") or pegawai.get("eselon1") or ""
        alert_config = ALERT_TYPES.get(alert_type_key, {})
        
        # These are immediate priority
        priority_info = calculate_priority(-1, alert_config.get("is_incident", False))
        
        if priority and priority_info["priority"] != priority:
            continue
        if alert_type and alert_type_key != alert_type:
            continue
        
        asset_count = len(assets)
        total_value = sum(a.get("nilai_perolehan", 0) for a in assets)
        
        alert = {
            "id": f"{pegawai_id}_{alert_type_key}_INCIDENT",
            "pegawai_id": pegawai_id,
            "pegawai_nama": pegawai.get("nama_lengkap", ""),
            "pegawai_nip": pegawai.get("nip") or pegawai.get("nik") or pegawai.get("nrp"),
            "pegawai_unit": unit_kerja,
            "pegawai_jabatan": pegawai.get("jabatan"),
            
            "alert_type": alert_type_key,
            "alert_label": f"{alert_config.get('label', alert_type_key)} (Belum Selesai)",
            "alert_description": f"Pegawai sudah {alert_config.get('label', '').lower()} tapi masih memegang aset",
            "alert_icon": "🚨",
            
            "target_date": pegawai.get(f"tgl_{alert_type_key.lower()}", datetime.now(timezone.utc).isoformat()),
            "days_remaining": -999,  # Way overdue
            "is_overdue": True,
            "is_incident": True,
            
            **priority_info,
            
            "asset_count": asset_count,
            "total_asset_value": total_value,
            "assets": assets[:5],
            
            "dokumen_required": alert_config.get("dokumen_required", []),
            "dokumen_generated": [],
            
            "status": "PENDING"
        }
        
        alerts.append(alert)
    
    # Sort by priority weight (descending) then by days remaining (ascending)
    alerts.sort(key=lambda x: (-x["priority_weight"], x["days_remaining"]))
    
    # Apply status filter if provided
    if status:
        alerts = [a for a in alerts if a.get("status") == status]
    
    # Pagination
    total = len(alerts)
    start = (page - 1) * limit
    end = start + limit
    paginated_alerts = alerts[start:end]
    
    return {
        "data": paginated_alerts,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if limit > 0 else 1
    }


@router.get("/alerts/summary")
async def get_alerts_summary(
    days_ahead: int = 60,
    current_user: User = Depends(get_current_user)
):
    """Get summary statistics of all alerts"""
    # Get all alerts
    result = await get_notification_alerts(
        days_ahead=days_ahead,
        include_overdue=True,
        page=1,
        limit=10000,
        current_user=current_user
    )
    
    alerts = result.get("data", [])
    
    # Calculate summary
    summary = {
        "total_alerts": len(alerts),
        "by_priority": {
            "kritis": 0,
            "tinggi": 0,
            "sedang": 0,
            "rendah": 0,
            "persiapan": 0,
            "info": 0
        },
        "by_type": {},
        "by_status": {
            "pending": 0,
            "in_progress": 0,
            "completed": 0
        },
        "total_assets_at_risk": 0,
        "total_value_at_risk": 0,
        "overdue_count": 0,
        "incident_count": 0,
        "urgent_actions": []  # Top 5 most urgent
    }
    
    for alert in alerts:
        # By priority
        priority_key = alert.get("priority", "INFO").lower()
        if priority_key in summary["by_priority"]:
            summary["by_priority"][priority_key] += 1
        
        # By type
        alert_type = alert.get("alert_type", "OTHER")
        if alert_type not in summary["by_type"]:
            summary["by_type"][alert_type] = {
                "count": 0,
                "label": alert.get("alert_label", alert_type),
                "icon": alert.get("alert_icon", "⚠️")
            }
        summary["by_type"][alert_type]["count"] += 1
        
        # By status
        status_key = alert.get("status", "PENDING").lower()
        if status_key in summary["by_status"]:
            summary["by_status"][status_key] += 1
        
        # Totals
        summary["total_assets_at_risk"] += alert.get("asset_count", 0)
        summary["total_value_at_risk"] += alert.get("total_asset_value", 0)
        
        if alert.get("is_overdue"):
            summary["overdue_count"] += 1
        if alert.get("is_incident"):
            summary["incident_count"] += 1
    
    # Get top 5 urgent
    summary["urgent_actions"] = alerts[:5]
    
    return summary


@router.get("/alerts/{alert_id}")
async def get_alert_detail(
    alert_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get detailed information about a specific alert"""
    # Parse alert_id to get pegawai_id and alert_type
    parts = alert_id.rsplit("_", 1)
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid alert ID format")
    
    pegawai_id = parts[0]
    if "_INCIDENT" in alert_id:
        pegawai_id = alert_id.rsplit("_", 2)[0]
    
    # Get full alert data
    result = await get_notification_alerts(
        days_ahead=365,
        include_overdue=True,
        page=1,
        limit=10000,
        current_user=current_user
    )
    
    for alert in result.get("data", []):
        if alert.get("id") == alert_id:
            # Get full asset list
            assets = await get_employee_assets(alert.get("pegawai_id"))
            alert["assets"] = assets
            return alert
    
    raise HTTPException(status_code=404, detail="Alert not found")


@router.post("/alerts/{alert_id}/action")
async def process_alert_action(
    alert_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Process an action on an alert:
    - Mark as in_progress
    - Mark as completed
    - Dismiss alert
    - Generate required documents
    """
    action = payload.get("action")  # in_progress, complete, dismiss, generate_doc
    notes = payload.get("notes")
    doc_type = payload.get("doc_type")  # BAST, SIP, BASTO
    
    if action not in ["in_progress", "complete", "dismiss", "generate_doc"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    # Store action in database
    action_record = {
        "alert_id": alert_id,
        "action": action,
        "notes": notes,
        "doc_type": doc_type,
        "performed_by": current_user.full_name,
        "performed_at": datetime.now(timezone.utc)
    }
    
    await db.notification_actions.insert_one(action_record)
    
    # If generating document, create it
    if action == "generate_doc" and doc_type:
        # This would integrate with the surat/dokumen system
        doc_record = {
            "alert_id": alert_id,
            "doc_type": doc_type,
            "status": "DRAFT",
            "created_by": current_user.full_name,
            "created_at": datetime.now(timezone.utc)
        }
        await db.notification_documents.insert_one(doc_record)
    
    return {
        "message": f"Action '{action}' processed successfully",
        "alert_id": alert_id,
        "action": action
    }


@router.get("/types")
async def get_alert_types(current_user: User = Depends(get_current_user)):
    """Get all available alert types"""
    return ALERT_TYPES


@router.get("/priorities")
async def get_priority_config(current_user: User = Depends(get_current_user)):
    """Get priority configuration"""
    return PRIORITY_CONFIG


@router.get("/dashboard-widget")
async def get_dashboard_widget_data(
    current_user: User = Depends(get_current_user)
):
    """Get compact data for dashboard widget display"""
    summary = await get_alerts_summary(days_ahead=30, current_user=current_user)
    
    # Get only critical and high priority alerts
    result = await get_notification_alerts(
        days_ahead=30,
        include_overdue=True,
        page=1,
        limit=5,
        current_user=current_user
    )
    
    critical_high = [a for a in result.get("data", []) if a.get("priority") in ["KRITIS", "TINGGI"]]
    
    return {
        "total_alerts": summary.get("total_alerts", 0),
        "kritis_count": summary.get("by_priority", {}).get("kritis", 0),
        "tinggi_count": summary.get("by_priority", {}).get("tinggi", 0),
        "overdue_count": summary.get("overdue_count", 0),
        "total_assets_at_risk": summary.get("total_assets_at_risk", 0),
        "urgent_alerts": critical_high[:3],
        "needs_attention": summary.get("by_priority", {}).get("kritis", 0) + summary.get("by_priority", {}).get("tinggi", 0) > 0
    }
