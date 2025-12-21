from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Body, Query
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
import calendar
from bson import ObjectId
import os
import base64
import uuid
from pydantic import BaseModel

from motor.motor_asyncio import AsyncIOMotorClient
from models_kepegawaian import (
    Attendance, OvertimeRequest, OvertimeCreate, ClockInRequest, ClockOutRequest, 
    OvertimeSettings, OvertimeBatch, OvertimeRangeCreate, OvertimeRangeBatch,
    DayConfig, ParticipantDayConfig, BreakTime
)
from models_activity import ActivityLog
from auth import get_current_user
from models import User
from lib.activity_logger import log_activity

router = APIRouter()

# DB Connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- HELPERS ---

# Get holidays for a specific month (custom holidays + weekends)
async def get_holidays_for_month(year: int, month: int):
    """Get all holidays for a month: custom holidays + weekends (Sat/Sun)"""
    days_in_month = calendar.monthrange(year, month)[1]
    holidays = set()
    
    # Add weekends (Saturday=5, Sunday=6)
    for d in range(1, days_in_month + 1):
        weekday = calendar.weekday(year, month, d)
        if weekday >= 5:
            holidays.add(d)
    
    # Add custom holidays from database
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-{days_in_month:02d}"
    
    custom_holidays = await db.holidays.find({
        "date": {"$gte": start_date, "$lte": end_date}
    }).to_list(100)
    
    for h in custom_holidays:
        day = int(h['date'].split('-')[2])
        holidays.add(day)
    
    return sorted(list(holidays))

async def get_holidays_detailed_for_month(year: int, month: int):
    """
    Get detailed holidays for a month with type info.
    Returns: {
        "holidays": [day numbers that are holidays],
        "cuti_nasional": [day numbers that are cuti nasional - more faded color],
        "holiday_names": {day: name}
    }
    """
    days_in_month = calendar.monthrange(year, month)[1]
    holidays = set()
    cuti_nasional = set()
    holiday_names = {}
    
    # Add weekends (Saturday=5, Sunday=6)
    for d in range(1, days_in_month + 1):
        weekday = calendar.weekday(year, month, d)
        if weekday >= 5:
            holidays.add(d)
            holiday_names[d] = "Weekend"
    
    # Add custom holidays from database
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-{days_in_month:02d}"
    
    custom_holidays = await db.holidays.find({
        "date": {"$gte": start_date, "$lte": end_date}
    }).to_list(100)
    
    for h in custom_holidays:
        day = int(h['date'].split('-')[2])
        holidays.add(day)
        holiday_names[day] = h.get('name', 'Holiday')
        
        # Check if it's "Cuti Nasional" (faded color)
        if h.get('is_cuti_nasional', False):
            cuti_nasional.add(day)
    
    return {
        "holidays": sorted(list(holidays)),
        "cuti_nasional": sorted(list(cuti_nasional)),
        "holiday_names": holiday_names
    }

async def get_overtime_settings():
    settings = await db.overtime_settings.find_one({"key": "overtime_rates"})
    if not settings:
        # Create default
        default_settings = OvertimeSettings()
        await db.overtime_settings.insert_one(default_settings.model_dump(by_alias=True, exclude=["id"]))
        return default_settings
    return OvertimeSettings(**settings)

async def calculate_overtime_pay_v2(emp_type, grade, duration, is_holiday=False, sub_kategori=None, job_title=""):
    """
    Calculate overtime pay with simple formula:
    
    HARI KERJA (is_holiday=False):
    - Uang Lembur = Jam × Tarif per jam
    
    HARI LIBUR/WEEKEND (is_holiday=True):
    - Uang Lembur = Jam × Tarif per jam × 2
    """
    settings = await get_overtime_settings()
    
    rate = 0
    gross = 0
    meal = 0
    tax_rate = 0
    
    if emp_type == 'ASN':
        # Clean grade string (e.g., "III/a" -> "III")
        grade_key = grade.split('/')[0] if grade else "I"
        
        # Get Rate from Settings per Golongan
        if grade_key == 'I': 
            rate = settings.rate_asn_gol_1
            tax_rate = settings.tax_asn_gol_1
        elif grade_key == 'II': 
            rate = settings.rate_asn_gol_2
            tax_rate = settings.tax_asn_gol_2
        elif grade_key == 'III': 
            rate = settings.rate_asn_gol_3
            tax_rate = settings.tax_asn_gol_3
        elif grade_key == 'IV': 
            rate = settings.rate_asn_gol_4
            tax_rate = settings.tax_asn_gol_4
        else: 
            rate = settings.rate_asn_gol_1
            tax_rate = settings.tax_asn_gol_1
        
        # Gross Calculation - Simple formula
        hours = duration
        if is_holiday:
            # HARI LIBUR: Jam × Tarif × 2
            gross = hours * rate * 2
        else:
            # HARI KERJA: Jam × Tarif
            gross = hours * rate
        
        # Meal Allowance per Golongan (min 2 jam kerja)
        if duration >= 2:
            if grade_key in ['I', 'II']: 
                meal = settings.meal_asn_gol_1_2
            elif grade_key == 'III': 
                meal = settings.meal_asn_gol_3
            elif grade_key == 'IV': 
                meal = settings.meal_asn_gol_4
            else:
                meal = settings.meal_asn_gol_1_2
        
    else:
        # NON-ASN
        # Determine Rate & Tax based on sub_kategori or job_title
        category = "ppnpn" # Default
        
        # 1. Check Explicit Sub Category
        if sub_kategori:
            cat_map = {
                "Satpam": "satpam",
                "Supir": "supir",
                "Pramubakti": "pramubakti",
                "Konsultan Individu": "konsultan",
                "Tenaga Ahli": "tenaga_ahli",
                "Teknisi": "teknisi",
                "PPNPN": "ppnpn"
            }
            category = cat_map.get(sub_kategori, "ppnpn")
        
        # 2. If no explicit sub_kategori, guess from job_title (jabatan)
        elif job_title:
            jt_lower = job_title.lower()
            if "satpam" in jt_lower or "security" in jt_lower: category = "satpam"
            elif "supir" in jt_lower or "driver" in jt_lower or "pengemudi" in jt_lower: category = "supir"
            elif "pramubakti" in jt_lower or "ob" in jt_lower or "cleaning" in jt_lower: category = "pramubakti"
            elif "konsultan" in jt_lower: category = "konsultan"
            elif "ahli" in jt_lower: category = "tenaga_ahli"
            elif "teknisi" in jt_lower: category = "teknisi"
            
        # Get Rate, Meal, and Tax per Category
        if category == "satpam": 
            rate = settings.rate_non_asn_satpam
            tax_rate = settings.tax_non_asn_satpam
            if duration >= 2: meal = settings.meal_non_asn_satpam
        elif category == "supir": 
            rate = settings.rate_non_asn_supir
            tax_rate = settings.tax_non_asn_supir
            if duration >= 2: meal = settings.meal_non_asn_supir
        elif category == "pramubakti": 
            rate = settings.rate_non_asn_pramubakti
            tax_rate = settings.tax_non_asn_pramubakti
            if duration >= 2: meal = settings.meal_non_asn_pramubakti
        elif category == "konsultan": 
            rate = settings.rate_non_asn_konsultan
            tax_rate = settings.tax_non_asn_konsultan
            if duration >= 2: meal = settings.meal_non_asn_konsultan
        elif category == "tenaga_ahli": 
            rate = settings.rate_non_asn_tenaga_ahli
            tax_rate = settings.tax_non_asn_tenaga_ahli
            if duration >= 2: meal = settings.meal_non_asn_tenaga_ahli
        elif category == "teknisi": 
            rate = settings.rate_non_asn_teknisi
            tax_rate = settings.tax_non_asn_teknisi
            if duration >= 2: meal = settings.meal_non_asn_teknisi
        else: 
            rate = settings.rate_non_asn_ppnpn
            tax_rate = settings.tax_non_asn_ppnpn
            if duration >= 2: meal = settings.meal_non_asn_ppnpn
        
        # Gross Calculation - Simple formula
        hours = duration
        if is_holiday:
            # HARI LIBUR: Jam × Tarif × 2
            gross = hours * rate * 2
        else:
            # HARI KERJA: Jam × Tarif
            gross = hours * rate
    
    total_gross = gross + meal
    tax = total_gross * tax_rate
    net = total_gross - tax
    
    return rate, meal, gross, tax, net

def save_base64_image(base64_str, prefix="att"):
    if not base64_str:
        return None
    try:
        if "base64," in base64_str:
            base64_str = base64_str.split("base64,")[1]
        
        img_data = base64.b64decode(base64_str)
        filename = f"{prefix}_{uuid.uuid4()}.jpg"
        file_path = f"/app/uploads/{filename}"
        
        with open(file_path, "wb") as f:
            f.write(img_data)
            
        return f"/api/uploads/{filename}"
    except Exception as e:
        print(f"Error saving image: {e}")
        return None

# --- SETTINGS ROUTES ---

@router.get("/settings", response_model=OvertimeSettings)
async def get_settings(current_user: User = Depends(get_current_user)):
    return await get_overtime_settings()

@router.put("/settings", response_model=OvertimeSettings)
async def update_settings(settings_in: OvertimeSettings, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
        
    settings_data = settings_in.model_dump(exclude={"id", "_id", "key"})
    settings_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.overtime_settings.update_one(
        {"key": "overtime_rates"},
        {"$set": settings_data},
        upsert=True
    )
    return await get_overtime_settings()

# --- HOLIDAY MANAGEMENT ROUTES ---

@router.get("/holidays")
async def get_holidays(
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Get holidays list, optionally filtered by year and/or month"""
    query = {}
    
    if year and month:
        # Filter by specific month
        start_date = f"{year}-{month:02d}-01"
        days_in_month = calendar.monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{days_in_month:02d}"
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif year:
        # Filter by year
        query["date"] = {"$regex": f"^{year}"}
    
    holidays = await db.holidays.find(query, {"_id": 0}).sort("date", 1).to_list(500)
    return holidays

@router.post("/holidays")
async def create_holiday(
    holiday: dict = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Create a new holiday"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    # Validate required fields
    if not holiday.get('date') or not holiday.get('name'):
        raise HTTPException(status_code=400, detail="Date and name are required")
    
    # Check if holiday already exists
    existing = await db.holidays.find_one({"date": holiday['date']})
    if existing:
        raise HTTPException(status_code=400, detail="Holiday for this date already exists")
    
    new_holiday = {
        "id": str(uuid.uuid4()),
        "date": holiday['date'],  # Format: YYYY-MM-DD
        "name": holiday['name'],
        "description": holiday.get('description', ''),
        "is_national": holiday.get('is_national', True),
        "is_cuti_nasional": holiday.get('is_cuti_nasional', False),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": str(current_user.id)
    }
    
    await db.holidays.insert_one(new_holiday)
    del new_holiday['_id']
    return new_holiday

@router.put("/holidays/{holiday_id}")
async def update_holiday(
    holiday_id: str,
    holiday: dict = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Update an existing holiday"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    existing = await db.holidays.find_one({"id": holiday_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    update_data = {
        "name": holiday.get('name', existing['name']),
        "description": holiday.get('description', existing.get('description', '')),
        "is_national": holiday.get('is_national', existing.get('is_national', True)),
        "is_cuti_nasional": holiday.get('is_cuti_nasional', existing.get('is_cuti_nasional', False)),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If date is being changed, check for duplicates
    if holiday.get('date') and holiday['date'] != existing['date']:
        dup = await db.holidays.find_one({"date": holiday['date'], "id": {"$ne": holiday_id}})
        if dup:
            raise HTTPException(status_code=400, detail="Another holiday exists for this date")
        update_data['date'] = holiday['date']
    
    await db.holidays.update_one({"id": holiday_id}, {"$set": update_data})
    
    updated = await db.holidays.find_one({"id": holiday_id}, {"_id": 0})
    return updated

@router.delete("/holidays/{holiday_id}")
async def delete_holiday(
    holiday_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a holiday"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    result = await db.holidays.delete_one({"id": holiday_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    return {"message": "Holiday deleted successfully"}

@router.post("/holidays/bulk")
async def bulk_create_holidays(
    holidays: List[dict] = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Bulk create holidays (useful for importing national holidays)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    created = []
    skipped = []
    
    for h in holidays:
        if not h.get('date') or not h.get('name'):
            skipped.append({"date": h.get('date'), "reason": "Missing date or name"})
            continue
            
        existing = await db.holidays.find_one({"date": h['date']})
        if existing:
            skipped.append({"date": h['date'], "reason": "Already exists"})
            continue
        
        new_holiday = {
            "id": str(uuid.uuid4()),
            "date": h['date'],
            "name": h['name'],
            "description": h.get('description', ''),
            "is_national": h.get('is_national', True),
            "is_cuti_nasional": h.get('is_cuti_nasional', False),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": str(current_user.id)
        }
        
        await db.holidays.insert_one(new_holiday)
        created.append(h['date'])
    
    return {"created": len(created), "skipped": len(skipped), "skipped_details": skipped}

# --- ATTENDANCE HISTORY ROUTES ---

@router.get("/attendance/history")
async def get_attendance_history(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    target_uid = str(current_user.id)
    if user_id and current_user.role == 'admin':
        target_uid = user_id
        
    month_str = f"{year}-{month:02d}"
    
    query = {
        "user_id": target_uid,
        "date": {"$regex": f"^{month_str}"}
    }
    
    cursor = db.attendance.find(query).sort("date", 1)
    logs = await cursor.to_list(length=31)
    
    result = []
    for log in logs:
        log['id'] = str(log['_id'])
        del log['_id']
        result.append(log)
        
    return result

# --- EXISTING ROUTES ---

@router.get("/dashboard-stats")
async def get_dashboard_stats():
    total_pegawai = await db.pegawai.count_documents({"status": "AKTIF"})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    hadir_today = await db.attendance.count_documents({"date": today})
    on_leave = 0 
    
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    pipeline = [
        {"$match": {"date": {"$regex": f"^{current_month}"}, "status": "Approved"}},
        {"$group": {"_id": None, "total": {"$sum": "$duration_hours"}}}
    ]
    cursor = db.overtime_requests.aggregate(pipeline)
    ot_result = await cursor.to_list(length=1)
    ot_hours = ot_result[0]['total'] if ot_result else 0
    
    return {
        "total_employees": total_pegawai,
        "present_today": hadir_today,
        "on_leave": on_leave,
        "overtime_hours": round(ot_hours, 1)
    }

@router.get("/attendance/today")
async def get_today_attendance(current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    att = await db.attendance.find_one({
        "user_id": str(current_user.id),
        "date": today
    })
    if att:
        att['id'] = str(att['_id'])
        del att['_id']
        return att
    return None

@router.post("/attendance/clock-in")
async def clock_in(req: ClockInRequest, current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    existing = await db.attendance.find_one({
        "user_id": str(current_user.id),
        "date": today
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already clocked in today")
        
    pegawai = await db.pegawai.find_one({"_id": ObjectId(current_user.pegawai_id)})
    if not pegawai:
        raise HTTPException(status_code=404, detail="Pegawai profile not found")
    
    photo_url = save_base64_image(req.photo, "in")
    
    new_att = Attendance(
        user_id=str(current_user.id),
        pegawai_id=str(current_user.pegawai_id),
        nama_lengkap=pegawai['nama_lengkap'],
        date=today,
        clock_in=datetime.now(timezone.utc),
        clock_in_photo=photo_url,
        location_in=req.location,
        status="Hadir" 
    )
    
    res = await db.attendance.insert_one(new_att.model_dump(by_alias=True, exclude=["id"]))
    
    await log_activity(
        db,
        user_id=str(current_user.id),
        user_name=current_user.full_name,
        action="CLOCK_IN",
        module="Kepegawaian",
        target_id=str(res.inserted_id),
        details=f"Clock In pada {format(datetime.now(), '%H:%M')}"
    )

    return {"message": "Clock In Successful", "id": str(res.inserted_id)}

@router.post("/attendance/clock-out")
async def clock_out(req: ClockOutRequest, current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    existing = await db.attendance.find_one({
        "user_id": str(current_user.id),
        "date": today
    })
    if not existing:
        raise HTTPException(status_code=400, detail="Not clocked in yet")
    if existing.get('clock_out'):
        raise HTTPException(status_code=400, detail="Already clocked out")
        
    photo_url = save_base64_image(req.photo, "out")
    
    await db.attendance.update_one(
        {"_id": existing['_id']},
        {"$set": {
            "clock_out": datetime.now(timezone.utc),
            "clock_out_photo": photo_url,
            "location_out": req.location
        }}
    )

    await log_activity(
        db,
        user_id=str(current_user.id),
        user_name=current_user.full_name,
        action="CLOCK_OUT",
        module="Kepegawaian",
        target_id=str(existing['_id']),
        details=f"Clock Out pada {format(datetime.now(), '%H:%M')}"
    )

    return {"message": "Clock Out Successful"}

# --- OVERTIME ROUTES (UPDATED) ---

@router.post("/overtime")
async def request_overtime(req: OvertimeCreate, current_user: User = Depends(get_current_user)):
    if not current_user.pegawai_id:
        raise HTTPException(status_code=400, detail="User not linked to Pegawai")
        
    pegawai = await db.pegawai.find_one({"_id": ObjectId(current_user.pegawai_id)})
    if not pegawai:
        raise HTTPException(status_code=404, detail="Pegawai data not found")
        
    # Calculate duration
    fmt = "%H:%M"
    try:
        t1 = datetime.strptime(req.start_time, fmt)
        t2 = datetime.strptime(req.end_time, fmt)
    except:
         raise HTTPException(status_code=400, detail="Invalid time format HH:MM")
         
    if t2 < t1:
        t2 += timedelta(days=1)
        
    duration = (t2 - t1).seconds / 3600
    
    emp_type = "ASN" if pegawai.get('status_kepegawaian') in ['PNS', 'PPPK', 'ASN'] else "NON_ASN"
    grade = pegawai.get('pangkat_golongan') 
    
    if emp_type == 'ASN' and grade:
        import re
        match = re.search(r'\((.*?)\)', grade)
        if match:
            grade = match.group(1) 
    
    # Get Sub Kategori if exists (NEW)
    sub_kategori = pegawai.get('sub_kategori')
    jabatan = pegawai.get('jabatan', "")
    
    # USE NEW DYNAMIC CALCULATION
    rate, meal, gross, tax, net = await calculate_overtime_pay_v2(
        emp_type, 
        grade, 
        duration, 
        req.is_holiday,
        sub_kategori,
        jabatan
    )
    
    new_ot = OvertimeRequest(
        user_id=str(current_user.id),
        pegawai_id=str(current_user.pegawai_id),
        nama_lengkap=pegawai['nama_lengkap'],
        nip=pegawai.get('nip'),
        employee_type=emp_type,
        grade=grade,
        sub_kategori=sub_kategori, # Save snapshot
        date=req.date,
        is_holiday=req.is_holiday,
        start_time=req.start_time,
        end_time=req.end_time,
        duration_hours=round(duration, 2),
        description=req.description,
        rate_per_hour=rate,
        meal_allowance=meal,
        gross_pay=gross,
        tax_amount=tax,
        net_pay=net,
        spl_file=req.spl_file,
        evidence_files=req.evidence_files
    )
    
    await db.overtime_requests.insert_one(new_ot.model_dump(by_alias=True, exclude=["id"]))
    return {"message": "Overtime requested"}

# --- NEW: BATCH OVERTIME ROUTES ---

async def generate_spl_number():
    """Generate unique SPL number for the year"""
    year = datetime.now().year
    prefix = f"SPL-{year}-"
    
    # Find the highest number for this year
    last_batch = await db.overtime_batches.find_one(
        {"nomor_spl": {"$regex": f"^{prefix}"}},
        sort=[("nomor_spl", -1)]
    )
    
    if last_batch:
        last_num = int(last_batch['nomor_spl'].split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:04d}"

@router.post("/overtime/batch")
async def create_overtime_batch(req: OvertimeCreate, current_user: User = Depends(get_current_user)):
    """Create overtime batch with multiple participants"""
    
    if not req.participant_ids or len(req.participant_ids) == 0:
        raise HTTPException(status_code=400, detail="Pilih minimal satu peserta lembur")
    
    # Calculate duration
    fmt = "%H:%M"
    try:
        t1 = datetime.strptime(req.start_time, fmt)
        t2 = datetime.strptime(req.end_time, fmt)
    except:
        raise HTTPException(status_code=400, detail="Format waktu tidak valid (HH:MM)")
    
    if t2 < t1:
        t2 += timedelta(days=1)
    
    duration = (t2 - t1).seconds / 3600
    
    # Auto-detect if the date is a holiday
    try:
        year, month, day = map(int, req.date.split('-'))
        holidays_in_month = await get_holidays_for_month(year, month)
        is_holiday = day in holidays_in_month
    except:
        is_holiday = req.is_holiday  # Fallback to form value
    
    # Generate SPL number
    nomor_spl = await generate_spl_number()
    batch_id = str(uuid.uuid4())
    
    # Get all participant data
    participant_data = []
    for pid in req.participant_ids:
        pegawai = await db.pegawai.find_one({"_id": ObjectId(pid)})
        if pegawai:
            participant_data.append(pegawai)
    
    if len(participant_data) == 0:
        raise HTTPException(status_code=400, detail="Data pegawai tidak ditemukan")
    
    # Create individual overtime records for each participant
    total_gross = 0
    total_tax = 0
    total_net = 0
    
    for pegawai in participant_data:
        emp_type = "ASN" if pegawai.get('status_kepegawaian') in ['PNS', 'PPPK', 'ASN'] else "NON_ASN"
        grade = pegawai.get('pangkat_golongan')
        
        if emp_type == 'ASN' and grade:
            import re
            match = re.search(r'\((.*?)\)', grade)
            if match:
                grade = match.group(1)
        
        sub_kategori = pegawai.get('sub_kategori')
        jabatan = pegawai.get('jabatan', "")
        
        rate, meal, gross, tax, net = await calculate_overtime_pay_v2(
            emp_type, grade, duration, is_holiday, sub_kategori, jabatan
        )
        
        total_gross += gross
        total_tax += tax
        total_net += net
        
        # Create individual overtime request linked to batch
        new_ot = OvertimeRequest(
            user_id=str(pegawai.get('user_id', '')),
            pegawai_id=str(pegawai['_id']),
            nama_lengkap=pegawai['nama_lengkap'],
            nip=pegawai.get('nip'),
            batch_id=batch_id,
            nomor_spl=nomor_spl,
            creator_id=str(current_user.id),
            creator_name=current_user.full_name,
            employee_type=emp_type,
            grade=grade,
            sub_kategori=sub_kategori,
            date=req.date,
            is_holiday=is_holiday,
            start_time=req.start_time,
            end_time=req.end_time,
            duration_hours=round(duration, 2),
            description=req.description,
            rate_per_hour=rate,
            meal_allowance=meal,
            gross_pay=gross,
            tax_amount=tax,
            net_pay=net,
            spl_file=req.spl_file,
            evidence_files=req.evidence_files
        )
        
        await db.overtime_requests.insert_one(new_ot.model_dump(by_alias=True, exclude=["id"]))
    
    # Create batch record
    new_batch = OvertimeBatch(
        batch_id=batch_id,
        nomor_spl=nomor_spl,
        tanggal_spl=datetime.now().strftime("%Y-%m-%d"),
        creator_id=str(current_user.id),
        creator_name=current_user.full_name,
        date=req.date,
        is_holiday=is_holiday,
        start_time=req.start_time,
        end_time=req.end_time,
        duration_hours=round(duration, 2),
        description=req.description,
        participant_ids=req.participant_ids,
        spl_file=req.spl_file,
        evidence_files=req.evidence_files,
        total_gross=total_gross,
        total_tax=total_tax,
        total_net=total_net
    )
    
    batch_data = new_batch.model_dump()
    batch_data['_id'] = batch_id
    await db.overtime_batches.insert_one(batch_data)
    
    return {
        "message": f"Lembur berhasil dibuat dengan nomor {nomor_spl}",
        "batch_id": batch_id,
        "nomor_spl": nomor_spl,
        "participant_count": len(participant_data)
    }

# === NEW: Multi-Day Overtime with Break Times ===

def calculate_work_hours_with_breaks(start_time: str, end_time: str, breaks: list) -> float:
    """Calculate actual work hours after subtracting break times"""
    fmt = "%H:%M"
    try:
        t1 = datetime.strptime(start_time, fmt)
        t2 = datetime.strptime(end_time, fmt)
        
        # Handle overnight
        if t2 < t1:
            t2 += timedelta(days=1)
        
        total_minutes = (t2 - t1).seconds / 60
        
        # Subtract break times
        for brk in breaks:
            b1 = datetime.strptime(brk.get('start_time', '00:00'), fmt)
            b2 = datetime.strptime(brk.get('end_time', '00:00'), fmt)
            if b2 < b1:
                b2 += timedelta(days=1)
            break_minutes = (b2 - b1).seconds / 60
            total_minutes -= break_minutes
        
        return max(0, total_minutes / 60)
    except:
        return 0

@router.post("/overtime/range")
async def create_overtime_range(req: OvertimeRangeCreate, current_user: User = Depends(get_current_user)):
    """Create multi-day overtime batch with per-day configuration"""
    
    if not req.participant_ids or len(req.participant_ids) == 0:
        raise HTTPException(status_code=400, detail="Pilih minimal satu peserta lembur")
    
    if not req.days or len(req.days) == 0:
        raise HTTPException(status_code=400, detail="Konfigurasi hari tidak boleh kosong")
    
    # Generate SPL number
    nomor_spl = await generate_spl_number()
    batch_id = str(uuid.uuid4())
    
    # Get all participant data
    all_pegawai = {}
    for pid in req.participant_ids:
        pegawai = await db.pegawai.find_one({"_id": ObjectId(pid)})
        if pegawai:
            all_pegawai[str(pegawai['_id'])] = pegawai
    
    if len(all_pegawai) == 0:
        raise HTTPException(status_code=400, detail="Data pegawai tidak ditemukan")
    
    # Process each day
    total_gross = 0
    total_tax = 0
    total_net = 0
    days_config_stored = []
    overtime_records_created = 0
    
    for day_config in req.days:
        date_str = day_config.date
        
        # Auto-detect holiday
        try:
            year, month, day = map(int, date_str.split('-'))
            holidays_in_month = await get_holidays_for_month(year, month)
            is_holiday = day in holidays_in_month
        except:
            is_holiday = day_config.is_holiday
        
        # Get breaks for this day
        breaks_list = [{"start_time": b.start_time, "end_time": b.end_time} for b in day_config.breaks]
        
        day_config_stored = {
            "date": date_str,
            "is_holiday": is_holiday,
            "breaks": breaks_list,
            "participants": []
        }
        
        # Process each participant for this day
        for participant in day_config.participants:
            if not participant.attending:
                continue
            
            pid = participant.pegawai_id
            if pid not in all_pegawai:
                continue
            
            pegawai = all_pegawai[pid]
            
            # Calculate work hours minus breaks
            duration = calculate_work_hours_with_breaks(
                participant.start_time, 
                participant.end_time, 
                breaks_list
            )
            
            if duration <= 0:
                continue
            
            emp_type = "ASN" if pegawai.get('status_kepegawaian') in ['PNS', 'PPPK', 'ASN'] else "NON_ASN"
            grade = pegawai.get('pangkat_golongan')
            
            if emp_type == 'ASN' and grade:
                import re
                match = re.search(r'\((.*?)\)', grade)
                if match:
                    grade = match.group(1)
            
            sub_kategori = pegawai.get('sub_kategori')
            jabatan = pegawai.get('jabatan', "")
            
            rate, meal, gross, tax, net = await calculate_overtime_pay_v2(
                emp_type, grade, duration, is_holiday, sub_kategori, jabatan
            )
            
            total_gross += gross + meal  # Total = uang lembur + uang makan
            total_tax += tax
            total_net += net  # Net sudah dihitung di calculate_overtime_pay_v2
            
            # Create individual overtime record
            new_ot = OvertimeRequest(
                user_id=str(pegawai.get('user_id', '')),
                pegawai_id=str(pegawai['_id']),
                nama_lengkap=pegawai['nama_lengkap'],
                nip=pegawai.get('nip'),
                batch_id=batch_id,
                nomor_spl=nomor_spl,
                creator_id=str(current_user.id),
                creator_name=current_user.full_name,
                employee_type=emp_type,
                grade=grade,
                sub_kategori=sub_kategori,
                date=date_str,
                is_holiday=is_holiday,
                start_time=participant.start_time,
                end_time=participant.end_time,
                duration_hours=round(duration, 2),
                description=req.description,
                rate_per_hour=rate,
                meal_allowance=meal,
                gross_pay=gross,  # Uang lembur saja, tanpa meal
                tax_amount=tax,
                net_pay=net,
                spl_file=req.spl_file,
                evidence_files=req.evidence_files
            )
            
            await db.overtime_requests.insert_one(new_ot.model_dump(by_alias=True, exclude=["id"]))
            overtime_records_created += 1
            
            # Store participant config
            day_config_stored["participants"].append({
                "pegawai_id": pid,
                "nama_lengkap": pegawai['nama_lengkap'],
                "start_time": participant.start_time,
                "end_time": participant.end_time,
                "duration_hours": round(duration, 2),
                "gross_pay": gross,  # Uang lembur saja
                "net_pay": net
            })
        
        days_config_stored.append(day_config_stored)
    
    # Create range batch record
    new_batch = OvertimeRangeBatch(
        batch_id=batch_id,
        nomor_spl=nomor_spl,
        tanggal_spl=datetime.now().strftime("%Y-%m-%d"),
        creator_id=str(current_user.id),
        creator_name=current_user.full_name,
        start_date=req.start_date,
        end_date=req.end_date,
        description=req.description,
        participant_ids=req.participant_ids,
        days_config=days_config_stored,
        spl_file=req.spl_file,
        evidence_files=req.evidence_files,
        total_days=len(req.days),
        total_participants=len(all_pegawai),
        total_gross=total_gross,
        total_tax=total_tax,
        total_net=total_net
    )
    
    batch_data = new_batch.model_dump()
    batch_data['_id'] = batch_id
    await db.overtime_batches.insert_one(batch_data)
    
    return {
        "message": f"Lembur berhasil dibuat dengan nomor {nomor_spl}",
        "batch_id": batch_id,
        "nomor_spl": nomor_spl,
        "total_days": len(req.days),
        "total_records": overtime_records_created,
        "total_gross": total_gross,
        "total_net": total_net
    }

@router.get("/overtime/check-holidays")
async def check_holidays_for_range(start_date: str, end_date: str):
    """Get holiday info for a date range"""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
    except:
        raise HTTPException(status_code=400, detail="Format tanggal tidak valid (YYYY-MM-DD)")
    
    if end < start:
        raise HTTPException(status_code=400, detail="Tanggal selesai harus setelah tanggal mulai")
    
    result = []
    current = start
    
    # Get all holidays for all months in range
    holidays_cache = {}
    
    while current <= end:
        year = current.year
        month = current.month
        cache_key = f"{year}-{month:02d}"
        
        if cache_key not in holidays_cache:
            holidays_cache[cache_key] = await get_holidays_for_month(year, month)
        
        day = current.day
        is_holiday = day in holidays_cache[cache_key]
        day_name = current.strftime("%A")
        
        result.append({
            "date": current.strftime("%Y-%m-%d"),
            "day_name": day_name,
            "is_holiday": is_holiday,
            "is_weekend": current.weekday() >= 5
        })
        
        current += timedelta(days=1)
    
    return result

@router.get("/overtime/batches")
async def list_overtime_batches(
    status: str = None,
    month: str = None,
    current_user: User = Depends(get_current_user)
):
    """List overtime batches"""
    query = {}
    
    # Non-admin only sees their own created batches
    if current_user.role != 'admin':
        query["creator_id"] = str(current_user.id)
    
    if status:
        query["status"] = status
    
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    cursor = db.overtime_batches.find(query).sort("created_at", -1)
    items = await cursor.to_list(length=100)
    
    result = []
    for item in items:
        item['id'] = str(item['_id'])
        del item['_id']
        
        # Get participant names
        participant_names = []
        for pid in item.get('participant_ids', []):
            peg = await db.pegawai.find_one({"_id": ObjectId(pid)}, {"nama_lengkap": 1})
            if peg:
                participant_names.append(peg['nama_lengkap'])
        item['participant_names'] = participant_names
        item['participant_count'] = len(participant_names)
        
        result.append(item)
    
    return result

@router.get("/overtime/batch/{batch_id}")
async def get_overtime_batch_detail(batch_id: str, current_user: User = Depends(get_current_user)):
    """Get detailed batch info with all participant overtime records"""
    
    batch = await db.overtime_batches.find_one({"_id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch tidak ditemukan")
    
    batch['id'] = str(batch['_id'])
    del batch['_id']
    
    # Get all overtime records for this batch (including rejected for history)
    overtime_records = await db.overtime_requests.find(
        {"batch_id": batch_id}
    ).to_list(500)
    
    # Count by status
    approved_count = 0
    rejected_count = 0
    pending_count = 0
    
    for rec in overtime_records:
        rec['id'] = str(rec['_id'])
        del rec['_id']
        status = rec.get('status', 'Pending')
        if status == 'Approved':
            approved_count += 1
        elif status == 'Rejected':
            rejected_count += 1
        else:
            pending_count += 1
    
    batch['records'] = overtime_records
    batch['approved_count'] = approved_count
    batch['rejected_count'] = rejected_count
    batch['pending_count'] = pending_count
    batch['has_rejections'] = rejected_count > 0
    
    return batch

@router.patch("/overtime/batch/{batch_id}/{action}")
async def approve_reject_batch(
    batch_id: str,
    action: str,
    current_user: User = Depends(get_current_user)
):
    """Approve or reject entire batch"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menyetujui")
    
    if action not in ['approve', 'reject']:
        raise HTTPException(status_code=400, detail="Action tidak valid")
    
    new_status = "Approved" if action == 'approve' else "Rejected"
    
    # Update batch
    await db.overtime_batches.update_one(
        {"_id": batch_id},
        {"$set": {
            "status": new_status,
            "approver_id": str(current_user.id),
            "approver_name": current_user.full_name,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Update all linked overtime records
    await db.overtime_requests.update_many(
        {"batch_id": batch_id},
        {"$set": {
            "status": new_status,
            "approver_id": str(current_user.id),
            "approver_name": current_user.full_name,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": f"Batch lembur {new_status}"}

class PartialApprovalRequest(BaseModel):
    approve_ids: List[str] = []
    reject_ids: List[str] = []

@router.post("/overtime/batch/{batch_id}/partial")
async def partial_approve_batch(
    batch_id: str,
    req: PartialApprovalRequest,
    current_user: User = Depends(get_current_user)
):
    """Approve or reject individual records in a batch"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menyetujui")
    
    # Convert string IDs to ObjectIds
    approve_oids = [ObjectId(id) for id in req.approve_ids if ObjectId.is_valid(id)]
    reject_oids = [ObjectId(id) for id in req.reject_ids if ObjectId.is_valid(id)]
    
    # Update approved records
    if approve_oids:
        await db.overtime_requests.update_many(
            {"batch_id": batch_id, "_id": {"$in": approve_oids}},
            {"$set": {
                "status": "Approved",
                "approver_id": str(current_user.id),
                "approver_name": current_user.full_name,
                "approved_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    
    # Update rejected records  
    if reject_oids:
        await db.overtime_requests.update_many(
            {"batch_id": batch_id, "_id": {"$in": reject_oids}},
            {"$set": {
                "status": "Rejected",
                "approver_id": str(current_user.id),
                "approver_name": current_user.full_name,
                "rejected_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    
    # Check if all records in batch are processed
    remaining = await db.overtime_requests.count_documents({
        "batch_id": batch_id,
        "status": "Pending"
    })
    
    # Update batch status based on records
    if remaining == 0:
        approved_count = await db.overtime_requests.count_documents({
            "batch_id": batch_id,
            "status": "Approved"
        })
        
        # Recalculate totals for approved only
        approved_records = await db.overtime_requests.find({
            "batch_id": batch_id,
            "status": "Approved"
        }).to_list(200)
        
        total_gross = sum(r.get('gross_pay', 0) for r in approved_records)
        total_tax = sum(r.get('tax_amount', 0) for r in approved_records)
        total_net = sum(r.get('net_pay', 0) for r in approved_records)
        
        batch_status = "Approved" if approved_count > 0 else "Rejected"
        
        await db.overtime_batches.update_one(
            {"_id": batch_id},
            {"$set": {
                "status": batch_status,
                "total_gross": total_gross,
                "total_tax": total_tax,
                "total_net": total_net,
                "approver_id": str(current_user.id),
                "approver_name": current_user.full_name,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    
    return {
        "message": f"Berhasil memproses {len(req.approve_ids)} disetujui, {len(req.reject_ids)} ditolak",
        "remaining_pending": remaining
    }

@router.get("/overtime/recap-by-spl")
async def recap_overtime_by_spl(month: str = None, include_pending: bool = False):
    """Rekapitulasi lembur berdasarkan nomor SPL dengan detail jam per hari"""
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    year, mon = map(int, month.split("-"))
    days_in_month = calendar.monthrange(year, mon)[1]
    
    # Get holidays for the month
    holidays_in_month = await get_holidays_for_month(year, mon)
    
    # Get approved batches for the month (or all if include_pending)
    batch_query = {"$or": [
        {"date": {"$regex": f"^{month}"}},
        {"start_date": {"$regex": f"^{month}"}},
        {"end_date": {"$regex": f"^{month}"}}
    ]}
    if not include_pending:
        batch_query["status"] = "Approved"
    
    batches = await db.overtime_batches.find(batch_query).sort("nomor_spl", 1).to_list(200)
    
    result = []
    for batch in batches:
        batch_id = str(batch['_id'])
        batch['id'] = batch_id
        del batch['_id']
        
        # Get only approved overtime records for this batch (or all if include_pending)
        record_query = {"batch_id": batch_id}
        if not include_pending:
            record_query["status"] = "Approved"
        
        records = await db.overtime_requests.find(
            record_query,
            {"_id": 0, "id": 1, "nama_lengkap": 1, "nip": 1, "employee_type": 1, "grade": 1,
             "duration_hours": 1, "gross_pay": 1, "tax_amount": 1, "net_pay": 1, 
             "meal_allowance": 1, "is_holiday": 1, "date": 1, "status": 1, "pegawai_id": 1}
        ).to_list(500)
        
        # Get bank account info for each participant
        for rec in records:
            pegawai_id = rec.get('pegawai_id')
            if pegawai_id:
                try:
                    pegawai = await db.pegawai.find_one(
                        {"_id": ObjectId(pegawai_id)},
                        {"nama_bank": 1, "no_rekening": 1}
                    )
                    if pegawai:
                        rec['nama_bank'] = pegawai.get('nama_bank', '')
                        rec['no_rekening'] = pegawai.get('no_rekening', '')
                except:
                    rec['nama_bank'] = ''
                    rec['no_rekening'] = ''
        
        # Calculate jam_hari_kerja and jam_hari_libur per participant
        for rec in records:
            hours = rec.get('duration_hours', 0) or 0
            is_holiday = rec.get('is_holiday', False)
            if is_holiday:
                rec['jam_hari_kerja'] = 0
                rec['jam_hari_libur'] = hours
            else:
                rec['jam_hari_kerja'] = hours
                rec['jam_hari_libur'] = 0
        
        # Recalculate totals based on approved records only
        batch['participants'] = records
        batch['participant_count'] = len(records)
        batch['total_gross'] = sum(r.get('gross_pay', 0) for r in records)
        batch['total_tax'] = sum(r.get('tax_amount', 0) for r in records)
        batch['total_net'] = sum(r.get('net_pay', 0) for r in records)
        
        if len(records) > 0 or include_pending:
            result.append(batch)
    
    return {
        "month": month,
        "year": year,
        "days_in_month": days_in_month,
        "holidays": holidays_in_month,
        "batches": result
    }

# --- END NEW BATCH ROUTES ---

@router.get("/overtime")
async def list_overtime(status: str = None, current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role != 'admin':
        query["user_id"] = str(current_user.id)
    
    if status:
        query["status"] = status
        
    cursor = db.overtime_requests.find(query).sort("date", -1)
    items = await cursor.to_list(length=100)
    
    for item in items:
        item['id'] = str(item['_id'])
        del item['_id']
        
    return items

@router.patch("/overtime/{oid}/{action}")
async def approve_reject_overtime(oid: str, action: str, current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
        
    if action not in ['approve', 'reject']:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    new_status = "Approved" if action == 'approve' else "Rejected"
    
    await db.overtime_requests.update_one(
        {"_id": ObjectId(oid)},
        {"$set": {
            "status": new_status,
            "approver_id": str(current_user.id),
            "approver_name": current_user.full_name,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    return {"message": f"Overtime {new_status}"}

@router.get("/overtime/recap")
async def recap_overtime(month: str = None): # YYYY-MM
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
        
    pipeline = [
        {"$match": {"date": {"$regex": f"^{month}"}, "status": "Approved"}},
        {"$group": {
            "_id": "$pegawai_id",
            "name": {"$first": "$nama_lengkap"},
            "nip": {"$first": "$nip"},
            "type": {"$first": "$employee_type"},
            "grade": {"$first": "$grade"},
            "sub_kategori": {"$first": "$sub_kategori"}, # Include in recap
            "totalHours": {"$sum": "$duration_hours"},
            "rate": {"$avg": "$rate_per_hour"},
            "mealAllowance": {"$sum": "$meal_allowance"},
            "totalGross": {"$sum": "$gross_pay"},
            "tax": {"$sum": "$tax_amount"},
            "netPay": {"$sum": "$net_pay"},
            "count": {"$sum": 1}
        }}
    ]
    
    cursor = db.overtime_requests.aggregate(pipeline)
    result = await cursor.to_list(length=1000)
    
    formatted = []
    for r in result:
        r['id'] = str(r['_id'])
        del r['_id']
        formatted.append(r)
        
    return formatted

@router.get("/overtime/dafnom")
async def get_dafnom_data(month: str = None): # YYYY-MM
    """
    Get detailed Dafnom (Daftar Nominatif) data with daily breakdown for each employee.
    Returns data suitable for official government overtime report.
    """
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    year, mon = map(int, month.split("-"))
    days_in_month = calendar.monthrange(year, mon)[1]
    
    # Get all approved overtime requests for the month
    cursor = db.overtime_requests.find({
        "date": {"$regex": f"^{month}"},
        "status": "Approved"
    })
    all_requests = await cursor.to_list(length=5000)
    
    # Get pegawai bank account info
    pegawai_cursor = db.pegawai.find({}, {"_id": 1, "id": 1, "nama_lengkap": 1, "no_rekening": 1, "nama_bank": 1})
    pegawai_list = await pegawai_cursor.to_list(length=5000)
    all_pegawai = {}
    for p in pegawai_list:
        pid = p.get('id') or str(p.get('_id', ''))
        if pid:
            all_pegawai[pid] = p
    
    # Build employee-centric data with daily breakdown
    employees = {}
    
    for req in all_requests:
        pid = req.get('pegawai_id')
        if not pid:
            continue
            
        if pid not in employees:
            peg_info = all_pegawai.get(pid, {})
            employees[pid] = {
                "pegawai_id": pid,
                "nama": req.get('nama_lengkap', '-'),
                "nip": req.get('nip', '-'),
                "golongan": req.get('grade', '-'),
                "employee_type": req.get('employee_type', 'NON_ASN'),
                "bank_account": peg_info.get('no_rekening', ''),
                "bank_name": peg_info.get('nama_bank', ''),
                "daily_hours": {str(d): {"hours": 0, "is_holiday": False} for d in range(1, days_in_month + 1)},
                "jam_hari_kerja": 0,
                "jam_hari_libur": 0,
                "jumlah_makan": 0,
                "uang_lembur": 0,
                "uang_makan": 0,
                "jumlah_kotor": 0,
                "potongan_pph": 0,
                "jumlah_bersih": 0
            }
        
        # Extract day from date string (YYYY-MM-DD)
        day_str = req.get('date', '').split('-')[-1].lstrip('0') or '1'
        
        emp = employees[pid]
        hours = req.get('duration_hours', 0)
        is_hol = req.get('is_holiday', False)
        
        # Update daily breakdown
        if day_str in emp['daily_hours']:
            emp['daily_hours'][day_str]['hours'] += hours
            if is_hol:
                emp['daily_hours'][day_str]['is_holiday'] = True
        
        # Update totals
        if is_hol:
            emp['jam_hari_libur'] += hours
        else:
            emp['jam_hari_kerja'] += hours
        
        # Calculate uang_lembur (gross_pay is already the overtime pay, NOT including meal)
        gross_pay = req.get('gross_pay', 0) or 0
        meal_allowance = req.get('meal_allowance', 0) or 0
        emp['uang_lembur'] += gross_pay  # gross_pay is overtime pay only
        emp['uang_makan'] += meal_allowance
        emp['jumlah_kotor'] += gross_pay + meal_allowance  # Total = overtime + meal
        emp['potongan_pph'] += req.get('tax_amount', 0) or 0
        emp['jumlah_bersih'] += req.get('net_pay', 0) or 0
        
        if meal_allowance > 0:
            emp['jumlah_makan'] += 1
    
    # Get holidays for the month (weekends + custom holidays from DB)
    holiday_data = await get_holidays_detailed_for_month(year, mon)
    
    return {
        "month": month,
        "year": year,
        "days_in_month": days_in_month,
        "holidays": holiday_data["holidays"],
        "cuti_nasional": holiday_data["cuti_nasional"],
        "holiday_names": holiday_data["holiday_names"],
        "employees": list(employees.values())
    }

# --- ACTIVITY LOGS ---

@router.get("/activities", response_model=List[dict])
async def get_activity_logs(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if current_user.role != 'admin':
        query["user_id"] = str(current_user.id)
        
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            try:
                sd = datetime.strptime(start_date, "%Y-%m-%d")
                query["timestamp"]["$gte"] = sd
            except: pass
        if end_date:
            try:
                ed = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
                query["timestamp"]["$lt"] = ed
            except: pass
    
    cursor = db.activity_logs.find(query).sort("timestamp", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    
    for log in logs:
        log['id'] = str(log['_id'])
        del log['_id']
        if isinstance(log.get('timestamp'), datetime):
            log['timestamp'] = log['timestamp'].isoformat()
            
    return logs

@router.post("/upload")
async def upload_kepegawaian_file(
    file: UploadFile = File(...),
    type: str = Form("evidence"), # spl or evidence
    current_user: User = Depends(get_current_user)
):
    try:
        allowed = ["image/jpeg", "image/png", "application/pdf"]
        if file.content_type not in allowed:
            raise HTTPException(status_code=400, detail="Format not allowed (JPG/PNG/PDF only)")
            
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"{type}_{uuid.uuid4()}{file_ext}"
        file_path = f"/app/uploads/{filename}"
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            
        return {"url": f"/api/uploads/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
