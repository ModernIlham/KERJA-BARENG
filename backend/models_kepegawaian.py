from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from models import MongoBaseModel

class Attendance(MongoBaseModel):
    user_id: str
    pegawai_id: str
    nama_lengkap: str
    date: str # YYYY-MM-DD
    
    clock_in: datetime
    clock_out: Optional[datetime] = None
    
    clock_in_photo: Optional[str] = None
    clock_out_photo: Optional[str] = None
    
    location_in: Optional[Dict[str, float]] = None # {lat: 0.0, lng: 0.0}
    location_out: Optional[Dict[str, float]] = None
    
    status: str = "Hadir" # Hadir, Telat, Pulang Cepat
    keterangan: Optional[str] = None

class OvertimeRequest(MongoBaseModel):
    user_id: str
    pegawai_id: str
    nama_lengkap: str
    
    # Snapshot of employee data at time of request (for calc stability)
    employee_type: str # ASN / NON_ASN
    grade: Optional[str] = None # Golongan or Level
    
    date: str # YYYY-MM-DD
    start_time: str # HH:MM
    end_time: str # HH:MM
    duration_hours: float
    description: str
    
    status: str = "Pending" # Pending, Approved, Rejected
    
    approver_id: Optional[str] = None
    approver_name: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    # Financial Calculation Snapshot
    rate_per_hour: float = 0
    meal_allowance: float = 0
    gross_pay: float = 0
    tax_amount: float = 0
    net_pay: float = 0
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OvertimeCreate(BaseModel):
    date: str
    start_time: str
    end_time: str
    description: str

class ClockInRequest(BaseModel):
    photo: str # Base64 string or URL if handled separately
    location: Optional[Dict[str, float]] = None

class ClockOutRequest(BaseModel):
    photo: Optional[str] = None
    location: Optional[Dict[str, float]] = None
