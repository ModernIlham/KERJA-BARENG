from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Body, Query
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
import calendar
from bson import ObjectId
import os
import base64
import uuid

from motor.motor_asyncio import AsyncIOMotorClient
from models_kepegawaian import Attendance, OvertimeRequest, OvertimeCreate, ClockInRequest, ClockOutRequest, OvertimeSettings
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

async def get_overtime_settings():
    settings = await db.overtime_settings.find_one({"key": "overtime_rates"})
    if not settings:
        # Create default
        default_settings = OvertimeSettings()
        await db.overtime_settings.insert_one(default_settings.model_dump(by_alias=True, exclude=["id"]))
        return default_settings
    return OvertimeSettings(**settings)

async def calculate_overtime_pay_v2(emp_type, grade, duration, is_holiday=False, sub_kategori=None, job_title=""):
    settings = await get_overtime_settings()
    
    rate = 0
    gross = 0
    meal = 0
    tax_rate = 0
    
    if emp_type == 'ASN':
        # Clean grade string (e.g., "III/a" -> "III")
        grade_key = grade.split('/')[0] if grade else "I"
        
        # Get Rate from Settings
        if grade_key == 'I': rate = settings.rate_asn_gol_1
        elif grade_key == 'II': rate = settings.rate_asn_gol_2
        elif grade_key == 'III': rate = settings.rate_asn_gol_3
        elif grade_key == 'IV': rate = settings.rate_asn_gol_4
        else: rate = settings.rate_asn_gol_1
        
        # Gross Calculation (ASN: Flat Rate * Hours)
        gross = rate * duration
        
        # Meal Allowance
        if duration >= 2: # Min 2 hours
            if grade_key in ['I', 'II']: meal = settings.meal_asn_gol_1_2
            elif grade_key == 'III': meal = settings.meal_asn_gol_3
            elif grade_key == 'IV': meal = settings.meal_asn_gol_4
            
        # Tax Rate
        if grade_key == 'III': tax_rate = settings.tax_asn_gol_3
        elif grade_key == 'IV': tax_rate = settings.tax_asn_gol_4
        else: tax_rate = 0.0 # Gol I & II 0%
        
    else:
        # NON-ASN
        # Determine Rate based on sub_kategori or job_title
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
            
        # Get Rate
        if category == "satpam": 
            rate = settings.rate_non_asn_satpam
            if duration >= 2: meal = settings.meal_non_asn_satpam
        elif category == "supir": 
            rate = settings.rate_non_asn_supir
            if duration >= 2: meal = settings.meal_non_asn_supir
        elif category == "pramubakti": 
            rate = settings.rate_non_asn_pramubakti
            if duration >= 2: meal = settings.meal_non_asn_pramubakti
        elif category == "konsultan": 
            rate = settings.rate_non_asn_konsultan
            if duration >= 2: meal = settings.meal_non_asn_konsultan
        elif category == "tenaga_ahli": 
            rate = settings.rate_non_asn_tenaga_ahli
            if duration >= 2: meal = settings.meal_non_asn_tenaga_ahli
        elif category == "teknisi": 
            rate = settings.rate_non_asn_teknisi
            if duration >= 2: meal = settings.meal_non_asn_teknisi
        else: 
            rate = settings.rate_non_asn_ppnpn
            if duration >= 2: meal = settings.meal_non_asn_ppnpn
        
        # Calculation Logic (Depnaker/Omnibus)
        hours = duration
        if is_holiday:
            if hours <= 7:
                gross = hours * 2 * rate
            elif hours <= 8:
                gross = (7 * 2 * rate) + (1 * 3 * rate)
            else:
                extra = hours - 8
                gross = (7 * 2 * rate) + (1 * 3 * rate) + (extra * 4 * rate)
        else:
            if hours <= 1:
                gross = hours * 1.5 * rate
            else:
                gross = (1 * 1.5 * rate) + ((hours - 1) * 2 * rate)
        
        tax_rate = settings.tax_non_asn
    
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
    pegawai_cursor = db.pegawai.find({}, {"_id": 1, "id": 1, "nama_lengkap": 1, "no_rekening": 1, "bank": 1})
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
                "bank_name": peg_info.get('bank', 'Mandiri'),
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
        
        # Calculate uang_lembur (gross - meal) correctly
        gross_pay = req.get('gross_pay', 0) or 0
        meal_allowance = req.get('meal_allowance', 0) or 0
        emp['uang_lembur'] += gross_pay - meal_allowance
        emp['uang_makan'] += meal_allowance
        emp['jumlah_kotor'] += gross_pay
        emp['potongan_pph'] += req.get('tax_amount', 0) or 0
        emp['jumlah_bersih'] += req.get('net_pay', 0) or 0
        
        if meal_allowance > 0:
            emp['jumlah_makan'] += 1
    
    # Get calendar info for the month (which days are weekends)
    holidays_in_month = []
    for d in range(1, days_in_month + 1):
        weekday = calendar.weekday(year, mon, d)
        if weekday >= 5:  # Saturday = 5, Sunday = 6
            holidays_in_month.append(d)
    
    return {
        "month": month,
        "year": year,
        "days_in_month": days_in_month,
        "holidays": holidays_in_month,
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
