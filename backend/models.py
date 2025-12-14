from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any, Dict
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
    role: str = "user" 
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "user"

# --- Stok FIFO Batch Model (Critical for Valuation) ---
class StokBatch(MongoBaseModel):
    barang_id: str
    kode_barang: str
    nup: str
    tgl_masuk: datetime
    jumlah_awal: int
    jumlah_sisa: int
    nilai_satuan: float
    dokumen_ref: Optional[str] = None # No Dokumen Pengadaan

# --- Barang (Asset) Models - Full SIMAN Spec ---
class Barang(MongoBaseModel):
    # Identifiers
    kode_barang: str
    nup: str
    kode_satker: Optional[str] = None
    nama_satker: Optional[str] = None
    kode_register: Optional[str] = None
    
    # Details
    nama_barang: str
    merk: Optional[str] = None
    tipe: Optional[str] = None
    kategori: Optional[str] = None
    satuan: Optional[str] = None
    kondisi: Optional[str] = None # Baik, Rusak Ringan, Rusak Berat
    
    # Dates
    tgl_perolehan: Optional[str] = None 
    tgl_buku: Optional[str] = None
    tgl_penghapusan: Optional[str] = None
    tahun_anggaran: Optional[str] = None
    
    # Financials
    nilai_satuan: float = 0 # Current avg or last purchase price
    nilai_perolehan_pertama: float = 0
    nilai_perolehan: float = 0
    nilai_buku: float = 0
    nilai_penyusutan: float = 0
    nilai_mutasi: float = 0
    
    # Classification / SIMAN
    intra_ekstra: Optional[str] = None # Intra / Ekstra Komptabel
    status_aset: str = "Aktif"
    status_penggunaan: Optional[str] = None
    kode_akun: Optional[str] = None
    uraian_akun: Optional[str] = None
    golongan_barang: Optional[str] = None
    sub_sub_kelompok: Optional[str] = None
    penggolongan_siman: Optional[str] = None
    
    # Location
    lokasi_fisik: Optional[str] = None
    ruang: Optional[str] = None
    alamat: Optional[str] = None
    kelurahan: Optional[str] = None
    kecamatan: Optional[str] = None
    tipe: Optional[str] = None
    kategori: Optional[str] = None
    kondisi: Optional[str] = None
    tgl_perolehan: Optional[str] = None
    nilai_perolehan: Optional[float] = 0
    lokasi_fisik: Optional[str] = None
    satuan: Optional[str] = None
    kab_kota: Optional[str] = None
    provinsi: Optional[str] = None
    
    # Inventory
    stok: int = 0
    batas_stok_kritis: int = 1
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BarangCreate(BaseModel):
    kode_barang: str
    nup: str
    nama_barang: str
    merk: Optional[str] = None
    stok: int = 0
    nilai_satuan: float = 0
    # ... allow other fields optional for creation

# --- Pegawai (Employee) Models - Full Spec ---
class Pegawai(MongoBaseModel):
    # IDs
    nip: str
    nik: Optional[str] = None
    npwp: Optional[str] = None
    
    # Personal
    nama_lengkap: str
    gelar_depan: Optional[str] = None
    gelar_belakang: Optional[str] = None
    no_telp: Optional[str] = None
    email: Optional[str] = None
    
    # Bank
    nama_bank: Optional[str] = None
    no_rekening: Optional[str] = None
    
    # Job / Position
    jabatan: str
    jenis_jabatan: Optional[str] = None # Fungsional/Struktural
    status_jabatan: Optional[str] = None # Definitif/Plt
    detail_status_kepegawaian: Optional[str] = None # PNS/PPPK
    pangkat_golongan: Optional[str] = None
    
    # Hierarchy
    eselon1: Optional[str] = None
    eselon2: Optional[str] = None
    eselon3: Optional[str] = None
    eselon4: Optional[str] = None
    
    # Roles
    jabatan_melekat: List[str] = []
    
    status: str = "AKTIF"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PegawaiCreate(BaseModel):
    nip: str
    nama_lengkap: str
    jabatan: str
    # ... other fields optional

# --- Transaksi Models ---
class Transaksi(MongoBaseModel):
    jenis: str  # MASUK, KELUAR, PENYESUAIAN (Opname), SALDO_AWAL
    
    # Item Link
    barang_id: str
    kode_barang: str
    nup: Optional[str] = None
    nama_barang: str
    
    # Quantities
    jumlah: int
    nilai_satuan: float = 0
    total_nilai: float = 0
    
    # Parties / Context
    pegawai_id: Optional[str] = None
    nama_pegawai: Optional[str] = None
    unit_penerima: Optional[str] = None 
    
    # Docs
    keterangan: Optional[str] = None
    dokumen_ref: Optional[str] = None # No Dokumen / BA
    
    # Audit
    petugas: Optional[str] = None # Who performed the input
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransaksiCreate(BaseModel):
    jenis: str
    barang_id: str
    jumlah: int
    nilai_satuan: Optional[float] = 0 # Required for MASUK
    pegawai_id: Optional[str] = None
    keterangan: Optional[str] = None
    dokumen_ref: Optional[str] = None

# --- Stock Opname Model ---
class StockOpname(MongoBaseModel):
    tanggal: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    barang_id: str
    nama_barang: str
    stok_sistem: int
    stok_fisik: int
    selisih: int
    keterangan: Optional[str] = None
    petugas: str
    status: str = "Completed" # Completed (Auto Adjusted)
