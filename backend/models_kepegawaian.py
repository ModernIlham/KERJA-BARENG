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
    
    # Non ASN Rates (per hour) - INDEPENDENT CATEGORIES
    rate_non_asn_ppnpn: float = 13000 # Default General
    rate_non_asn_konsultan: float = 13000
    rate_non_asn_tenaga_ahli: float = 13000
    rate_non_asn_teknisi: float = 13000
    rate_non_asn_pramubakti: float = 13000
    rate_non_asn_satpam: float = 13000
    rate_non_asn_supir: float = 13000
    
    # Legacy/Fallback (if no category matches)
    rate_non_asn: float = 13000
    
    # Meal Allowances (per day/occurrence)
    meal_asn_gol_1_2: float = 35000
    meal_asn_gol_3: float = 37000
    meal_asn_gol_4: float = 41000
    
    # Non ASN Meal Allowances - INDEPENDENT
    meal_non_asn_ppnpn: float = 30000
    meal_non_asn_konsultan: float = 30000
    meal_non_asn_tenaga_ahli: float = 30000
    meal_non_asn_teknisi: float = 30000
    meal_non_asn_pramubakti: float = 30000
    meal_non_asn_satpam: float = 30000
    meal_non_asn_supir: float = 30000
    
    # Legacy/Fallback
    meal_non_asn: float = 30000
    
    # Tax Rates ASN per Golongan
    tax_asn_gol_1: float = 0.0   # Golongan I - 0%
    tax_asn_gol_2: float = 0.0   # Golongan II - 0%
    tax_asn_gol_3: float = 0.05  # Golongan III - 5%
    tax_asn_gol_4: float = 0.15  # Golongan IV - 15%
    
    # Tax Rates NON-ASN per Kategori
    tax_non_asn_ppnpn: float = 0.0
    tax_non_asn_konsultan: float = 0.0
    tax_non_asn_tenaga_ahli: float = 0.0
    tax_non_asn_teknisi: float = 0.0
    tax_non_asn_pramubakti: float = 0.0
    tax_non_asn_satpam: float = 0.0
    tax_non_asn_supir: float = 0.0
    
    # Legacy/Fallback Tax
    tax_non_asn: float = 0.0
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LocationData(BaseModel):
    """Extended location data with address"""
    lat: float
    lng: float
    accuracy: Optional[float] = None
    address: Optional[str] = None

class Attendance(MongoBaseModel):
    user_id: str
    pegawai_id: str
    nama_lengkap: str
    date: str # YYYY-MM-DD
    
    clock_in: datetime
    clock_out: Optional[datetime] = None
    
    clock_in_photo: Optional[str] = None
    clock_out_photo: Optional[str] = None
    
    # Enhanced location with address
    location_in: Optional[Dict[str, Any]] = None # {lat, lng, accuracy, address}
    location_out: Optional[Dict[str, Any]] = None
    
    status: str = "Hadir" # Hadir, Telat, Pulang Cepat
    keterangan: Optional[str] = None

# NEW: Overtime Batch model - represents a single SPL/batch of overtime
class OvertimeBatch(BaseModel):
    batch_id: str  # Custom batch ID (UUID)
    nomor_spl: str  # SPL number (e.g., "SPL-2025-001")
    tanggal_spl: str  # Date of SPL creation (YYYY-MM-DD)
    
    # Creator info (pengurus/pembuat lembur)
    creator_id: str  # User ID who created this batch
    creator_name: str
    
    date: str  # Overtime execution date (YYYY-MM-DD)
    is_holiday: bool = False
    
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    duration_hours: float
    description: str
    
    # List of participant pegawai IDs
    participant_ids: List[str] = []
    
    status: str = "Pending"  # Pending, Approved, Rejected
    
    approver_id: Optional[str] = None
    approver_name: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    # Evidence
    spl_file: Optional[str] = None
    evidence_files: Optional[List[str]] = []
    
    # Totals (aggregated from all participants)
    total_gross: float = 0
    total_tax: float = 0
    total_net: float = 0
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OvertimeRequest(MongoBaseModel):
    user_id: str
    pegawai_id: str
    nama_lengkap: str
    nip: Optional[str] = None
    
    # Link to batch (NEW)
    batch_id: Optional[str] = None
    nomor_spl: Optional[str] = None
    
    # Creator info (NEW - who submitted this overtime, may differ from participant)
    creator_id: Optional[str] = None
    creator_name: Optional[str] = None
    
    # Snapshot of employee data at time of request (for calc stability)
    employee_type: str # ASN / NON_ASN
    grade: Optional[str] = None # Golongan or Level
    sub_kategori: Optional[str] = None # NEW: Satpam, Supir, etc.
    
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
    
    # NEW: List of pegawai IDs to include in this overtime
    participant_ids: Optional[List[str]] = []
    
    # Files
    spl_file: Optional[str] = None
    evidence_files: Optional[List[str]] = []

class ClockInRequest(BaseModel):
    photo: str # Base64 string or URL if handled separately
    location: Optional[Dict[str, float]] = None

class ClockOutRequest(BaseModel):
    photo: Optional[str] = None
    location: Optional[Dict[str, float]] = None



# === NEW: Models for Multi-Day Overtime with Break Times ===

class BreakTime(BaseModel):
    """Represents a single break period"""
    start_time: str  # HH:MM
    end_time: str    # HH:MM

class ParticipantDayConfig(BaseModel):
    """Configuration for a single participant on a single day"""
    pegawai_id: str
    nama_lengkap: str
    nip: Optional[str] = None
    attending: bool = True  # Whether participant attends this day
    start_time: str = "08:00"  # Individual start time
    end_time: str = "17:00"    # Individual end time

class DayConfig(BaseModel):
    """Configuration for a single day in the overtime range"""
    date: str  # YYYY-MM-DD
    is_holiday: bool = False  # Auto-detected
    breaks: List[BreakTime] = []  # Break periods for this day
    participants: List[ParticipantDayConfig] = []  # Per-participant config

class OvertimeRangeCreate(BaseModel):
    """Request model for creating multi-day overtime batch"""
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    description: str
    
    # Selected participant IDs (initial selection)
    participant_ids: List[str] = []
    
    # Per-day configuration
    days: List[DayConfig] = []
    
    # Template settings (for quick fill)
    default_start_time: str = "08:00"
    default_end_time: str = "17:00"
    default_breaks: List[BreakTime] = []
    
    # Files
    spl_file: Optional[str] = None
    evidence_files: Optional[List[str]] = []

class OvertimeRangeBatch(BaseModel):
    """Batch record for multi-day overtime SPL"""
    batch_id: str
    nomor_spl: str
    tanggal_spl: str  # SPL creation date
    
    creator_id: str
    creator_name: str
    
    start_date: str  # Range start
    end_date: str    # Range end
    description: str
    
    # All participant IDs involved
    participant_ids: List[str] = []
    
    # Per-day configuration (stored for reference)
    days_config: List[Dict[str, Any]] = []
    
    status: str = "Pending"
    approver_id: Optional[str] = None
    approver_name: Optional[str] = None
    
    spl_file: Optional[str] = None
    evidence_files: Optional[List[str]] = []
    
    # Totals
    total_days: int = 0
    total_participants: int = 0
    total_gross: float = 0
    total_tax: float = 0
    total_net: float = 0
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
