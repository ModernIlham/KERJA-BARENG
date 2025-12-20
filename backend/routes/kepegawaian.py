from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Body
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import os
import base64
import uuid

from motor.motor_asyncio import AsyncIOMotorClient
from models_kepegawaian import Attendance, OvertimeRequest, OvertimeCreate, ClockInRequest, ClockOutRequest
from auth import get_current_user
from models import User

router = APIRouter()

# DB Connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- CONSTANTS ---
RATE_ASN = {"I": 10000, "II": 15000, "III": 20000, "IV": 25000}
RATE_NON_ASN = {"Junior": 15000, "Senior": 25000, "Lead": 35000}
UANG_MAKAN = 35000
TAX_RATE_ASN = 0.05
TAX_RATE_NON_ASN = 0.02

# --- HELPERS ---
def calculate_overtime_pay(emp_type, grade, duration):
    rate = 0
    if emp_type == 'ASN':
        # Grade for ASN usually formatted like "III/a", we take the roman part
        grade_key = grade.split('/')[0] if grade else "I"
        rate = RATE_ASN.get(grade_key, 10000)
    else:
        rate = RATE_NON_ASN.get(grade, 15000)
    
    gross = rate * duration
    meal = UANG_MAKAN if duration >= 4 else 0
    total_gross = gross + meal
    
    tax_rate = TAX_RATE_ASN if emp_type == 'ASN' else TAX_RATE_NON_ASN
    tax = total_gross * tax_rate
    net = total_gross - tax
    
    return rate, meal, gross, tax, net

def save_base64_image(base64_str, prefix="att"):
    if not base64_str:
        return None
    try:
        # Check if header exists "data:image/jpeg;base64,"
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

# --- ROUTES ---

@router.get("/dashboard-stats")
async def get_dashboard_stats():
    # Mock aggregation for now, replace with real DB counts later
    total_pegawai = await db.pegawai.count_documents({"status": "AKTIF"})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    hadir_today = await db.attendance.count_documents({"date": today})
    
    # Simple logic: users not present are absent/leave
    # Real logic would check Leave requests
    on_leave = 0 
    
    # Overtime hours this month
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    # Aggregation for overtime hours
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
        "on_leave": on_leave, # Placeholder
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
    
    # Check existing
    existing = await db.attendance.find_one({
        "user_id": str(current_user.id),
        "date": today
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already clocked in today")
        
    # Get Pegawai Data
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
    return {"message": "Clock Out Successful"}

# --- OVERTIME ROUTES ---

@router.post("/overtime")
async def request_overtime(req: OvertimeCreate, current_user: User = Depends(get_current_user)):
    if not current_user.pegawai_id:
        raise HTTPException(status_code=400, detail="User not linked to Pegawai")
        
    pegawai = await db.pegawai.find_one({"_id": ObjectId(current_user.pegawai_id)})
    if not pegawai:
        raise HTTPException(status_code=404, detail="Pegawai data not found")
        
    # Calculate duration
    fmt = "%H:%M"
    t1 = datetime.strptime(req.start_time, fmt)
    t2 = datetime.strptime(req.end_time, fmt)
    duration = (t2 - t1).seconds / 3600
    
    # Determine Type & Grade
    emp_type = "ASN" if pegawai.get('status_kepegawaian') in ['PNS', 'PPPK', 'ASN'] else "NON_ASN"
    grade = pegawai.get('pangkat_golongan') # e.g. "Penata Muda (III/a)" or "Senior"
    
    # Fallback/Normalize grade
    if emp_type == 'ASN' and grade:
        # Extract Roman numeral if present
        import re
        match = re.search(r'\((.*?)\)', grade)
        if match:
            grade = match.group(1) # III/a
    
    rate, meal, gross, tax, net = calculate_overtime_pay(emp_type, grade, duration)
    
    new_ot = OvertimeRequest(
        user_id=str(current_user.id),
        pegawai_id=str(current_user.pegawai_id),
        nama_lengkap=pegawai['nama_lengkap'],
        employee_type=emp_type,
        grade=grade,
        date=req.date,
        start_time=req.start_time,
        end_time=req.end_time,
        duration_hours=round(duration, 2),
        description=req.description,
        rate_per_hour=rate,
        meal_allowance=meal,
        gross_pay=gross,
        tax_amount=tax,
        net_pay=net
    )
    
    await db.overtime_requests.insert_one(new_ot.model_dump(by_alias=True, exclude=["id"]))
    return {"message": "Overtime requested"}

@router.get("/overtime")
async def list_overtime(status: str = None, current_user: User = Depends(get_current_user)):
    # If admin, show all? For now, let's say "admin" role shows all, else show own
    # Assuming role is in current_user.role
    
    query = {}
    if current_user.role != 'admin':
        query["user_id"] = str(current_user.id)
    
    if status:
        query["status"] = status
        
    cursor = db.overtime_requests.find(query).sort("date", -1)
    items = await cursor.to_list(length=100)
    
    # Fix ID
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
            "type": {"$first": "$employee_type"},
            "grade": {"$first": "$grade"},
            "totalHours": {"$sum": "$duration_hours"},
            "rate": {"$avg": "$rate_per_hour"}, # Should be same per user
            "mealAllowance": {"$sum": "$meal_allowance"},
            "totalGross": {"$sum": "$gross_pay"},
            "tax": {"$sum": "$tax_amount"},
            "netPay": {"$sum": "$net_pay"}
        }}
    ]
    
    cursor = db.overtime_requests.aggregate(pipeline)
    result = await cursor.to_list(length=1000)
    
    # Format for frontend
    # Frontend expects: { id, name, type, grade, totalHours, rate, mealAllowance, totalGross, tax, netPay }
    # Mongo aggregation _id is the pegawai_id, we can map it to 'id'
    
    formatted = []
    for r in result:
        r['id'] = str(r['_id'])
        del r['_id']
        formatted.append(r)
        
    return formatted
