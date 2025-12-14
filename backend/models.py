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

# --- Referensi Kodefikasi (NEW) ---
class Kodefikasi(MongoBaseModel):
    kode: str # e.g., "3", "3.01", "3.01.01" etc. or just pure digits "30101"
    uraian: str # "Peralatan dan Mesin"
    level: int # 1=Gol, 2=Bidang, 3=Kelompok, 4=Sub, 5=Sub-Sub
    parent_kode: Optional[str] = None

# --- Stok FIFO Batch Model ---
class StokBatch(MongoBaseModel):
    barang_id: str
    kode_barang: str
    nup: str
    tgl_masuk: datetime
    jumlah_awal: int
    jumlah_sisa: int
    nilai_satuan: float
    dokumen_ref: Optional[str] = None 

# --- Barang (Asset) Models ---
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
    kondisi: Optional[str] = None 
    
    # Dates
    tgl_perolehan: Optional[str] = None 
    tgl_buku: Optional[str] = None
    tgl_penghapusan: Optional[str] = None
    tahun_anggaran: Optional[str] = None
    
    # Financials
    nilai_satuan: float = 0 
    nilai_perolehan_pertama: float = 0
    nilai_perolehan: float = 0
    nilai_buku: float = 0
    nilai_penyusutan: float = 0
    nilai_mutasi: float = 0
    
    # Classification / SIMAN
    intra_ekstra: Optional[str] = None 
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
    tipe: Optional[str] = None
    kategori: Optional[str] = None
    kondisi: Optional[str] = None
    tgl_perolehan: Optional[str] = None
    nilai_perolehan: Optional[float] = 0
    nilai_satuan: Optional[float] = 0
    lokasi_fisik: Optional[str] = None
    satuan: Optional[str] = None
    stok: int = 0
    golongan_barang: Optional[str] = None
    batas_stok_kritis: Optional[int] = 1

# --- Pegawai (Employee) Models ---
class Pegawai(MongoBaseModel):
    nip: str
    nik: Optional[str] = None
    npwp: Optional[str] = None
    nama_lengkap: str
    gelar_depan: Optional[str] = None
    gelar_belakang: Optional[str] = None
    no_telp: Optional[str] = None
    email: Optional[str] = None
    nama_bank: Optional[str] = None
    no_rekening: Optional[str] = None
    jabatan: str
    jenis_jabatan: Optional[str] = None 
    status_jabatan: Optional[str] = None 
    detail_status_kepegawaian: Optional[str] = None 
    pangkat_golongan: Optional[str] = None
    eselon1: Optional[str] = None
    eselon2: Optional[str] = None
    eselon3: Optional[str] = None
    eselon4: Optional[str] = None
    jabatan_melekat: List[str] = []
    status: str = "AKTIF"
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
    jenis: str  
    barang_id: str
    kode_barang: str
    nup: Optional[str] = None
    nama_barang: str
    jumlah: int
    nilai_satuan: float = 0
    total_nilai: float = 0
    pegawai_id: Optional[str] = None
    nama_pegawai: Optional[str] = None
    unit_penerima: Optional[str] = None 
    keterangan: Optional[str] = None
    dokumen_ref: Optional[str] = None 
    petugas: Optional[str] = None 
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransaksiCreate(BaseModel):
    jenis: str
    barang_id: str
    jumlah: int
    nilai_satuan: Optional[float] = 0 
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
    status: str = "Completed" 
