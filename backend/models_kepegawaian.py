from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from models import MongoBaseModel

class OvertimeSettings(MongoBaseModel):
    key: str = "overtime_rates"
    
    # ASN Rates (per hour)
    rate_asn_gol_1: float = 18000
    rate_asn_gol_2: float = 24000
    rate_asn_gol_3: float = 30000
    rate_asn_gol_4: float = 36000
    
    # Non ASN Rate (per hour)
    rate_non_asn: float = 13000
    
    # Meal Allowances (per day/occurrence)
    meal_asn_gol_1_2: float = 35000
    meal_asn_gol_3: float = 37000
    meal_asn_gol_4: float = 41000
    meal_non_asn: float = 30000
    
    # Tax Rates
    tax_asn_gol_3: float = 0.05
    tax_asn_gol_4: float = 0.15
    tax_non_asn: float = 0.0
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    nip: Optional[str] = None # Added NIP for Dafnom
    
    # Snapshot of employee data at time of request (for calc stability)
    employee_type: str # ASN / NON_ASN
    grade: Optional[str] = None # Golongan or Level
    
    date: str # YYYY-MM-DD
    is_holiday: bool = False
    
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
    
    # Evidence
    spl_file: Optional[str] = None
    evidence_files: Optional[List[str]] = []
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OvertimeCreate(BaseModel):
    date: str
    is_holiday: bool = False
    start_time: str
    end_time: str
    description: str
    
    # Files
    spl_file: Optional[str] = None
    evidence_files: Optional[List[str]] = []

class ClockInRequest(BaseModel):
    photo: str # Base64 string or URL if handled separately
    location: Optional[Dict[str, float]] = None

class ClockOutRequest(BaseModel):
    photo: Optional[str] = None
    location: Optional[Dict[str, float]] = None
