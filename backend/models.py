from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any
from datetime import datetime, timezone
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, values=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string"}

class MongoBaseModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# --- Auth Models ---
class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class User(MongoBaseModel):
    email: EmailStr
    full_name: str
    role: str = "user"  # admin, user
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "user"

# --- Barang (Asset) Models ---
class Barang(MongoBaseModel):
    # Identifiers
    kode_barang: str
    nup: str
    kode_satker: Optional[str] = None
    nama_satker: Optional[str] = None
    
    # Details
    nama_barang: str
    merk: Optional[str] = None
    tipe: Optional[str] = None
    kondisi: Optional[str] = None
    tgl_perolehan: Optional[str] = None 
    tgl_buku: Optional[str] = None
    
    # Financials
    nilai_perolehan_pertama: float = 0
    nilai_perolehan: float = 0
    nilai_buku: float = 0
    nilai_penyusutan: float = 0
    
    # Location / Certs
    alamat: Optional[str] = None
    kelurahan: Optional[str] = None
    kecamatan: Optional[str] = None
    kab_kota: Optional[str] = None
    provinsi: Optional[str] = None
    no_sertifikat: Optional[str] = None
    luas_tanah: float = 0
    luas_bangunan: float = 0
    
    # Inventory
    stok: int = 1 
    satuan: str = "Unit"
    lokasi_fisik: Optional[str] = None
    ruang: Optional[str] = None
    
    # System Metadata
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class BarangCreate(BaseModel):
    kode_barang: str
    nup: str
    nama_barang: str
    merk: Optional[str] = None
    kondisi: str = "Baik"
    nilai_perolehan: float = 0
    tgl_perolehan: Optional[str] = None
    stok: int = 1
    satuan: str = "Unit"
    lokasi_fisik: Optional[str] = None

# --- Pegawai (Employee) Models ---
class Pegawai(MongoBaseModel):
    nip: str
    nama_lengkap: str
    jabatan: str
    # Hierarchy
    eselon1: Optional[str] = None
    eselon2: Optional[str] = None
    eselon3: Optional[str] = None
    eselon4: Optional[str] = None
    
    # NEW: Jabatan Melekat (List of roles)
    jabatan_melekat: List[str] = []
    
    status: str = "AKTIF"  # AKTIF, NON_AKTIF
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PegawaiCreate(BaseModel):
    nip: str
    nama_lengkap: str
    jabatan: str
    eselon1: Optional[str] = None
    eselon2: Optional[str] = None
    eselon3: Optional[str] = None
    eselon4: Optional[str] = None
    jabatan_melekat: List[str] = []

# --- Transaksi Models ---
class Transaksi(MongoBaseModel):
    jenis: str  # MASUK, KELUAR, OPNAME
    barang_id: str
    kode_barang: str
    nup: Optional[str] = None
    nama_barang: str
    jumlah: int
    
    # Parties
    pegawai_id: Optional[str] = None
    nama_pegawai: Optional[str] = None
    unit_penerima: Optional[str] = None # Stores Es1/Es2/Es3 for reporting
    
    keterangan: Optional[str] = None
    bukti_dokumen: Optional[str] = None # NEW: No Dokumen / BA
    
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransaksiCreate(BaseModel):
    jenis: str
    barang_id: str
    jumlah: int
    pegawai_id: Optional[str] = None
    keterangan: Optional[str] = None
    bukti_dokumen: Optional[str] = None
